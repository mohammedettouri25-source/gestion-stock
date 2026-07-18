import { defineStore } from 'pinia';
import { db } from '../services/db';
import { syncEngine } from '../services/syncEngine';

export const useCustomerStore = defineStore('customers', {
  state: () => ({
    customers: [],
    loading: false,
    error: null
  }),
  getters: {
    totalOutstandingBalance: (state) => state.customers.reduce((acc, c) => acc + Number(c.outstanding_balance || 0), 0),
    totalCustomers: (state) => state.customers.length
  },
  actions: {
    async loadAll() {
      this.loading = true;
      try {
        this.customers = await db.customers.toArray();
      } catch (e) {
        this.error = e.message;
        console.error('Failed to load customers:', e);
      } finally {
        this.loading = false;
      }
    },

    async saveCustomer(customer) {
      const isNew = !customer.id;
      const finalCustomer = {
        ...customer,
        id: isNew ? 'cust-local-' + crypto.randomUUID() : customer.id,
        outstanding_balance: customer.outstanding_balance || 0,
        updated_at: new Date().toISOString()
      };

      await db.customers.put(finalCustomer);
      
      await syncEngine.queueOperation(
        'customers',
        isNew ? 'create' : 'update',
        finalCustomer
      );

      await this.loadAll();
      return finalCustomer;
    },

    async deleteCustomer(id) {
      await db.customers.delete(id);
      await syncEngine.queueOperation('customers', 'delete', { id });
      await this.loadAll();
    },

    async updateBalance(id, amount) {
      const customer = await db.customers.get(id);
      if (!customer) throw new Error('Customer not found');

      customer.outstanding_balance = (customer.outstanding_balance || 0) + amount;
      customer.updated_at = new Date().toISOString();

      await db.customers.put(customer);
      await syncEngine.queueOperation('customers', 'update', customer);
      await this.loadAll();
    }
  }
});
