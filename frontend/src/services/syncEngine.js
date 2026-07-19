import { db } from './db';
import { isSupabaseConfigured } from './supabaseClient';
import { supabaseRepository } from './supabaseRepository';

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
      if (!isSupabaseConfigured()) {
        if (this.onSyncStatusChange) this.onSyncStatusChange('offline');
        return;
      }

      const queueItems = await db.sync_queue.toArray();
      let processedCount = 0;

      for (const item of queueItems) {
        if (this.onSyncProgress) {
          this.onSyncProgress(Math.round((processedCount / queueCount) * 100));
        }

        const payload = item.payload || {};
        if (item.action === 'delete') {
          await supabaseRepository.remove(item.table, payload.id);
        } else {
          await supabaseRepository.upsert(item.table, { ...payload, id: payload.id || item.id });
        }

        await db.sync_queue.delete(item.id);
        processedCount++;
      }

      if (this.onSyncProgress) this.onSyncProgress(100);
      if (this.onSyncStatusChange) this.onSyncStatusChange('synced');
      await this.pullLatestData();
    } catch (error) {
      console.warn('[Sync] Supabase sync failed:', error.message || error);
      if (this.onSyncStatusChange) this.onSyncStatusChange('error');
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
    if (!isSupabaseConfigured()) return;
    try {
      await supabaseRepository.hydrateLocalFromSupabase();
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
