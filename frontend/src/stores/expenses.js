import { defineStore } from 'pinia';
import { db } from '../services/db';
import { syncEngine } from '../services/syncEngine';

export const useExpenseStore = defineStore('expenses', {
  state: () => ({
    expenses: [],
    loading: false,
    error: null
  }),
  getters: {
    totalExpenses: (state) => state.expenses.reduce((acc, exp) => acc + Number(exp.amount), 0),
    expensesByCategory: (state) => {
      const summary = {};
      state.expenses.forEach(exp => {
        const cat = exp.category_id || 'Other';
        summary[cat] = (summary[cat] || 0) + Number(exp.amount);
      });
      return summary;
    }
  },
  actions: {
    async loadExpenses() {
      this.loading = true;
      try {
        this.expenses = await db.expenses.toArray();
      } catch (e) {
        console.error('Failed to load expenses from local DB:', e);
        this.error = e.message;
      } finally {
        this.loading = false;
      }
    },

    async addExpense(expense) {
      const expenseId = 'exp-' + crypto.randomUUID();
      const timestamp = new Date().toISOString();
      
      const newExpense = {
        ...expense,
        id: expenseId,
        amount: Number(expense.amount),
        date: expense.date || timestamp.split('T')[0],
        updated_at: timestamp
      };

      // 1. Save locally
      await db.expenses.put(newExpense);

      // 2. Queue for server sync
      await syncEngine.queueOperation('expenses', 'create', newExpense);

      await this.loadExpenses();
      return newExpense;
    },

    async deleteExpense(id) {
      await db.expenses.delete(id);
      await syncEngine.queueOperation('expenses', 'delete', { id });
      await this.loadExpenses();
    }
  }
});
