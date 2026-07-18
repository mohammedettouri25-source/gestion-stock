<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useOrderStore } from '../stores/orders';
import { db } from '../services/db';
import { ClipboardList, DollarSign, Clock, CheckCircle2, Search } from 'lucide-vue-next';

const { t } = useI18n();
const orders = ref([]);
const search = ref('');
const filterStatus = ref('all');
const loading = ref(false);

onMounted(async () => {
  loading.value = true;
  orders.value = await db.orders.toArray();
  loading.value = false;
});

const filteredOrders = computed(() => {
  let result = [...orders.value].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (filterStatus.value !== 'all') {
    result = result.filter(o => o.payment_status === filterStatus.value);
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(o =>
      o.id.toLowerCase().includes(q) ||
      o.customer_name?.toLowerCase().includes(q)
    );
  }
  return result;
});

const totalRevenue = computed(() => orders.value.reduce((acc, o) => acc + o.total_amount, 0));
const paidOrders = computed(() => orders.value.filter(o => o.payment_status === 'paid').length);
const pendingOrders = computed(() => orders.value.filter(o => o.payment_status !== 'paid').length);
const totalOutstanding = computed(() => orders.value.reduce((acc, o) => acc + (o.remaining_amount || 0), 0));

function statusClass(status) {
  return {
    'paid': 'badge-success',
    'partially_paid': 'badge-warning',
    'unpaid': 'badge-danger'
  }[status] || 'badge-info';
}

function statusLabel(status) {
  return {
    'paid': 'Paid',
    'partially_paid': 'Partial',
    'unpaid': 'Unpaid'
  }[status] || status;
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('orders.orders_title') }}</h1>
      <p class="text-sm text-slate-500 mt-1">{{ t('orders.orders_desc') }}</p>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold">{{ orders.length }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('orders.total_orders') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-xl font-bold text-accent-blue">{{ totalRevenue.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('orders.total_revenue') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-green">{{ paidOrders }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('orders.paid_orders') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-xl font-bold text-accent-orange">{{ totalOutstanding.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('orders.outstanding_mad') }}</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-col md:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input v-model="search" type="text" :placeholder="t('orders.search_placeholder')"
          class="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-sm" />
      </div>
      <div class="flex gap-2">
        <button v-for="s in [{v:'all',l:'All'},{v:'paid',l:'Paid'},{v:'partially_paid',l:'Partial'},{v:'unpaid',l:'Unpaid'}]"
          :key="s.v" @click="filterStatus = s.v"
          class="px-4 py-2 text-xs font-semibold rounded-full transition-all"
          :class="filterStatus === s.v ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-100'">
          {{ s.l }}
        </button>
      </div>
    </div>

    <!-- Orders Table -->
    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="border-b border-slate-200/50 dark:border-slate-800">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">{{ t('orders.order_id') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('common.customers') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('common.date') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('orders.items') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('common.total') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('orders.deposit') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('orders.remaining') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('orders.payment') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('pos.method') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="o in filteredOrders" :key="o.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td class="px-6 py-4 font-mono text-xs text-accent-blue font-bold">
                {{ o.id.substring(0, 12) }}...
              </td>
              <td class="px-6 py-4 font-semibold">{{ o.customer_name }}</td>
              <td class="px-6 py-4 text-slate-500 text-xs">{{ new Date(o.date).toLocaleDateString() }}</td>
              <td class="px-6 py-4 text-center">{{ o.items?.length || '—' }}</td>
              <td class="px-6 py-4 font-bold text-accent-blue">{{ o.total_amount?.toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-accent-green">{{ o.deposit_amount?.toLocaleString() }} MAD</td>
              <td class="px-6 py-4" :class="o.remaining_amount > 0 ? 'text-accent-orange font-bold' : 'text-slate-400'">
                {{ o.remaining_amount > 0 ? o.remaining_amount?.toLocaleString() + ' MAD' : '—' }}
              </td>
              <td class="px-6 py-4">
                <span :class="statusClass(o.payment_status)">{{ statusLabel(o.payment_status) }}</span>
              </td>
              <td class="px-6 py-4 capitalize text-slate-500 text-xs">{{ o.payment_method?.replace('_', ' ') }}</td>
            </tr>
            <tr v-if="filteredOrders.length === 0">
              <td colspan="9" class="px-6 py-16 text-center text-slate-400">
                <ClipboardList class="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{{ t('orders.no_orders') }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
