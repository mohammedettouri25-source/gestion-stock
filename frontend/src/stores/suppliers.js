import { defineStore } from 'pinia';
import { db } from '../services/db';
import { syncEngine } from '../services/syncEngine';

export const useSupplierStore = defineStore('suppliers', {
  state: () => ({
    suppliers: [],
    loading: false,
    error: null
  }),
  getters: {
    totalOutstandingBalance: (state) => state.suppliers.reduce((acc, s) => acc + Number(s.outstanding_balance || 0), 0),
    activeSuppliersCount: (state) => state.suppliers.length
  },
  actions: {
    async loadAll() {
      this.loading = true;
      try {
        this.suppliers = await db.suppliers.toArray();
      } catch (e) {
        this.error = e.message;
        console.error('Failed to load suppliers:', e);
      } finally {
        this.loading = false;
      }
    },

    async saveSupplier(supplier) {
      const isNew = !supplier.id;
      const finalSupplier = {
        ...supplier,
        id: isNew ? 'sup-local-' + crypto.randomUUID() : supplier.id,
        outstanding_balance: supplier.outstanding_balance || 0,
        updated_at: new Date().toISOString()
      };

      await db.suppliers.put(finalSupplier);
      
      await syncEngine.queueOperation(
        'suppliers',
        isNew ? 'create' : 'update',
        finalSupplier
      );

      await this.loadAll();
      return finalSupplier;
    },

    async deleteSupplier(id) {
      await db.suppliers.delete(id);
      await syncEngine.queueOperation('suppliers', 'delete', { id });
      await this.loadAll();
    },

    async updateBalance(id, amount) {
      const supplier = await db.suppliers.get(id);
      if (!supplier) throw new Error('Supplier not found');

      supplier.outstanding_balance = (supplier.outstanding_balance || 0) + amount;
      supplier.updated_at = new Date().toISOString();

      await db.suppliers.put(supplier);
      await syncEngine.queueOperation('suppliers', 'update', supplier);
      await this.loadAll();
    }
  }
});
