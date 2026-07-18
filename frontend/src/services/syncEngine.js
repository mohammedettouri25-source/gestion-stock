import { db } from './db';
import axios from 'axios';

// Initialize backend API URL base
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const syncEngine = {
  // Status hooks
  onSyncProgress: null,
  onSyncStatusChange: null,

  async queueOperation(table, action, payload) {
    const timestamp = new Date().toISOString();
    await db.sync_queue.add({
      table,
      action,
      payload: JSON.parse(JSON.stringify(payload)),
      timestamp
    });
    this.triggerSync();
  },

  async triggerSync() {
    if (!navigator.onLine) {
      if (this.onSyncStatusChange) this.onSyncStatusChange('offline');
      return;
    }

    const queueCount = await db.sync_queue.count();
    if (queueCount === 0) {
      if (this.onSyncStatusChange) this.onSyncStatusChange('synced');
      return;
    }

    if (this.onSyncStatusChange) this.onSyncStatusChange('syncing');

    try {
      const queueItems = await db.sync_queue.toArray();
      let processedCount = 0;

      for (const item of queueItems) {
        if (this.onSyncProgress) {
          this.onSyncProgress(Math.round((processedCount / queueCount) * 100));
        }

        // Prepare token if user authenticated
        const token = localStorage.getItem('auth_token');
        const headers = token ? { Authorization: `Bearer ${token}`, 'Accept': 'application/json' } : { 'Accept': 'application/json' };

        // Send item to unified API sync endpoint
        const response = await axios.post(`${API_URL}/sync`, item, { headers });

        if (response.data && response.data.success) {
          // If creation succeeded, backend returned database ID and synced record
          const serverData = response.data.data;
          
          if (item.action === 'create' && serverData.old_id) {
            // Update local ID from temporary UUID to backend autoincrement ID
            await this.updateLocalReference(item.table, serverData.old_id, serverData.new_id, serverData.record);
          } else {
            // Simply update/overwrite local record with fresh backend state (with real timestamps)
            await db[item.table].put(serverData.record);
          }

          // Remove item from queue
          await db.sync_queue.delete(item.id);
        } else {
          // Conflict resolution or logic error from backend
          if (response.data && response.data.conflict) {
            console.warn('Sync conflict detected, applying server version:', response.data.server_record);
            await db[item.table].put(response.data.server_record);
            await db.sync_queue.delete(item.id);
          }
        }
        processedCount++;
      }

      if (this.onSyncProgress) this.onSyncProgress(100);
      if (this.onSyncStatusChange) this.onSyncStatusChange('synced');

      // Also pull latest catalog changes from server
      await this.pullLatestData();

    } catch (error) {
      // If server is unavailable (no backend running), silently downgrade to offline mode
      // instead of flooding the console with red errors
      const isNetworkError = !error.response || error.response.status >= 500;
      if (isNetworkError) {
        // Backend not running — this is expected in local-only / offline mode
        if (this.onSyncStatusChange) this.onSyncStatusChange('offline');
      } else {
        console.warn('[Sync] Server returned an error:', error.response?.status, error.response?.data?.message || error.message);
        if (this.onSyncStatusChange) this.onSyncStatusChange('error');
      }
    }
  },

  async updateLocalReference(table, oldId, newId, serverRecord) {
    // 1. Update the table record itself
    await db[table].delete(oldId);
    await db[table].put(serverRecord);

    // 2. Cascade update related foreign keys in other local tables if they reference the temp UUID
    if (table === 'customers') {
      await db.orders.where('customer_id').equals(oldId).modify({ customer_id: newId });
    } else if (table === 'products') {
      await db.stock_movements.where('product_id').equals(oldId).modify({ product_id: newId });
    }
  },

  async pullLatestData() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}`, 'Accept': 'application/json' };
    try {
      // Pull products, categories, brands, customers, suppliers
      const response = await axios.get(`${API_URL}/sync/pull`, { headers });
      if (response.data && response.data.success) {
        const { products, product_variants, categories, brands, customers, suppliers } = response.data.data;
        
        if (products.length) await db.products.clear().then(() => db.products.bulkPut(products));
        if (product_variants && product_variants.length) await db.product_variants.clear().then(() => db.product_variants.bulkPut(product_variants));
        if (categories.length) await db.categories.clear().then(() => db.categories.bulkPut(categories));
        if (brands.length) await db.brands.clear().then(() => db.brands.bulkPut(brands));
        if (customers.length) await db.customers.clear().then(() => db.customers.bulkPut(customers));
        if (suppliers.length) await db.suppliers.clear().then(() => db.suppliers.bulkPut(suppliers));
      }
    } catch (e) {
      console.error('Failed to pull latest catalogue state:', e);
    }
  },

  setupListeners() {
    window.addEventListener('online', () => this.triggerSync());
    window.addEventListener('offline', () => {
      if (this.onSyncStatusChange) this.onSyncStatusChange('offline');
    });
  }
};
