import { defineStore } from 'pinia';
import { syncEngine } from '../services/syncEngine';
import { db } from '../services/db';

export const useSyncStore = defineStore('sync', {
  state: () => ({
    status: navigator.onLine ? 'synced' : 'offline', // online, offline, syncing, synced, error
    progress: 0,
    queueLength: 0
  }),
  actions: {
    init() {
      // Bind sync engine hooks to Pinia state
      syncEngine.onSyncStatusChange = (status) => {
        this.status = status;
        this.updateQueueLength();
      };
      
      syncEngine.onSyncProgress = (progress) => {
        this.progress = progress;
      };

      syncEngine.setupListeners();
      this.updateQueueLength();

      // Periodically update queue length
      setInterval(() => {
        this.updateQueueLength();
      }, 5000);

      // Trigger initial sync if online
      if (navigator.onLine) {
        syncEngine.triggerSync();
      }
    },

    async updateQueueLength() {
      try {
        this.queueLength = await db.sync_queue.count();
      } catch (e) {
        console.error('Failed to read sync queue count:', e);
      }
    },

    async forceSync() {
      this.updateQueueLength();
      await syncEngine.triggerSync();
    }
  }
});
