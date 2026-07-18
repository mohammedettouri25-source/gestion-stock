<script setup>
import { onMounted, watch } from 'vue';
import { useSyncStore } from './stores/sync';

const syncStore = useSyncStore();

onMounted(() => {
  // Initialize offline sync listeners and database synchronization
  syncStore.init();
});

// Watch sync status changes to display premium micro-notifications
watch(() => syncStore.status, (newStatus) => {
  console.log(`System connection status updated: ${newStatus}`);
});
</script>

<template>
  <router-view></router-view>
</template>

<style>
/* Global resets and responsive fixes */
body {
  margin: 0;
  padding: 0;
}
</style>
