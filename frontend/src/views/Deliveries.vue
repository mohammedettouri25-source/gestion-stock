<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { db } from '../services/db';
import { Truck, CheckCircle2, Clock, XCircle, Package } from 'lucide-vue-next';

const { t } = useI18n();
const deliveries = ref([]);
const filterStatus = ref('all');

onMounted(async () => {
  // Load deliveries from embedded order data in local DB
  const orders = await db.orders.toArray();
  const result = [];
  for (const o of orders) {
    if (o.delivery) {
      result.push({
        ...o.delivery,
        order_id: o.id,
        customer_name: o.customer_name,
        order_date: o.date,
        total_amount: o.total_amount
      });
    }
  }
  deliveries.value = result.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));
});

const filtered = () => {
  if (filterStatus.value === 'all') return deliveries.value;
  return deliveries.value.filter(d => d.status === filterStatus.value);
};

const summary = () => ({
  pending: deliveries.value.filter(d => d.status === 'pending').length,
  shipped: deliveries.value.filter(d => d.status === 'shipped').length,
  delivered: deliveries.value.filter(d => d.status === 'delivered').length,
  cancelled: deliveries.value.filter(d => d.status === 'cancelled').length,
  totalFees: deliveries.value.reduce((a, d) => a + Number(d.fee || 0), 0)
});

function statusBadge(status) {
  return {
    pending: 'badge-warning',
    shipped: 'badge-info',
    delivered: 'badge-success',
    cancelled: 'badge-danger'
  }[status] || 'badge-info';
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('deliveries.management') }}</h1>
      <p class="text-sm text-slate-500 mt-1">{{ t('deliveries.track_desc') }}</p>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-orange">{{ summary().pending }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('deliveries.pending') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-blue">{{ summary().shipped }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('deliveries.shipped') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-green">{{ summary().delivered }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('deliveries.delivered') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-pink">{{ summary().cancelled }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('deliveries.cancelled') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-xl font-bold">{{ summary().totalFees.toLocaleString() }} MAD</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('deliveries.total_fees') }}</p>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 overflow-x-auto pb-1">
      <button v-for="s in [{v:'all',l:'All'},{v:'pending',l:'Pending'},{v:'shipped',l:'Shipped'},{v:'delivered',l:'Delivered'},{v:'cancelled',l:'Cancelled'}]"
        :key="s.v" @click="filterStatus = s.v"
        class="px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all"
        :class="filterStatus === s.v ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-100'">
        {{ s.l }}
      </button>
    </div>

    <!-- Deliveries table -->
    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="border-b border-slate-200/50 dark:border-slate-800">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">{{ t('deliveries.order') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('deliveries.customer') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('deliveries.company') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('deliveries.tracking_num') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('deliveries.fee') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('common.status') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('deliveries.order_date') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="d in filtered()" :key="d.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td class="px-6 py-4 font-mono text-xs text-accent-blue">{{ d.order_id?.substring(4, 16) }}...</td>
              <td class="px-6 py-4 font-semibold">{{ d.customer_name }}</td>
              <td class="px-6 py-4 text-slate-600 dark:text-slate-300">{{ d.company || '—' }}</td>
              <td class="px-6 py-4 font-mono text-xs">{{ d.tracking_number || '—' }}</td>
              <td class="px-6 py-4 font-semibold text-accent-blue">{{ Number(d.fee || 0).toLocaleString() }} MAD</td>
              <td class="px-6 py-4">
                <span :class="statusBadge(d.status)">{{ d.status }}</span>
              </td>
              <td class="px-6 py-4 text-slate-500 text-xs">{{ new Date(d.order_date).toLocaleDateString() }}</td>
            </tr>
            <tr v-if="filtered().length === 0">
              <td colspan="7" class="px-6 py-16 text-center text-slate-400">
                <Truck class="w-12 h-12 mx-auto mb-3 opacity-30" /> {{ t('deliveries.no_deliveries') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
