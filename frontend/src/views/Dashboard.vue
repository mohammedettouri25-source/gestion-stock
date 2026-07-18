<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProductStore } from '../stores/products';
import { useOrderStore } from '../stores/orders';
import { useExpenseStore } from '../stores/expenses';
import { db } from '../services/db';
import { useI18n } from 'vue-i18n';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  ShoppingCart, AlertCircle, ShoppingBag, Eye, Plus, ArrowRight
} from 'lucide-vue-next';

const productStore = useProductStore();
const orderStore = useOrderStore();
const expenseStore = useExpenseStore();
const { t } = useI18n();

const orders = ref([]);
const totalSalesVal = ref(0);
const totalProfitVal = ref(0);

const loadDashboardData = async () => {
  await productStore.loadAll();
  await orderStore.loadOrders();
  await expenseStore.loadExpenses();
  
  orders.value = await db.orders.toArray();
  
  // Calculate analytics
  let salesSum = 0;
  let profitSum = 0;
  
  orders.value.forEach(order => {
    salesSum += order.total_amount;
    // Calculate profit: total_amount - cost of items
    let cost = 0;
    order.items?.forEach(item => {
      cost += (item.purchase_price * item.quantity);
    });
    // Add delivery profit if any
    const devProfit = (order.delivery_fee || 0); // simplistically treating delivery fee as revenue
    profitSum += (order.total_amount - cost);
  });
  
  totalSalesVal.value = salesSum;
  totalProfitVal.value = profitSum;
};

onMounted(() => {
  loadDashboardData();
});

const todaySales = computed(() => {
  const todayStr = new Date().toISOString().split('T')[0];
  return orders.value
    .filter(o => o.date.startsWith(todayStr))
    .reduce((acc, o) => acc + o.total_amount, 0);
});

const ordersWaitingCount = computed(() => {
  return orders.value.filter(o => o.delivery?.status === 'pending').length;
});

// Best sellers computed from orders — per variant
const bestSellers = computed(() => {
  const itemCounts = {};
  orders.value.forEach(o => {
    o.items?.forEach(item => {
      const key = item.variant_id || item.product_id;
      if (!itemCounts[key]) {
        const attrStr = item.attributes
          ? Object.values(item.attributes).filter(Boolean).join(' / ')
          : `${item.size || ''} / ${item.color || ''}`;
        itemCounts[key] = {
          id: key,
          name: item.name,
          variant: attrStr,
          sku: item.sku,
          sold: 0,
          revenue: 0
        };
      }
      itemCounts[key].sold += item.quantity;
      itemCounts[key].revenue += (item.selling_price * item.quantity);
    });
  });
  
  return Object.values(itemCounts)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);
});
</script>

<template>
  <div class="space-y-8">
    <!-- Header with greeting & action -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          {{ t('dashboard.title') }}
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">{{ t('dashboard.subtitle') }}</p>
      </div>
      <router-link to="/pos" class="glass-btn-primary self-start md:self-auto">
        <Plus class="w-4 h-4" />
        <span>{{ t('dashboard.new_order') }}</span>
      </router-link>
    </div>

    <!-- Stats Grid layout -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      
      <!-- Card: Today's Sales -->
      <div class="glass-card p-6 flex items-center justify-between">
        <div class="space-y-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ t('dashboard.today_sales') }}</span>
          <h3 class="text-2xl font-bold">{{ todaySales.toLocaleString() }} <span class="text-xs font-medium">MAD</span></h3>
          <p class="text-xs text-accent-green flex items-center gap-1">
            <TrendingUp class="w-3.5 h-3.5" />
            <span>+12.5% from yesterday</span>
          </p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue shadow-sm">
          <ShoppingCart class="w-6 h-6" />
        </div>
      </div>

      <!-- Card: Total Sales Revenue -->
      <div class="glass-card p-6 flex items-center justify-between">
        <div class="space-y-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ t('dashboard.total_sales') }}</span>
          <h3 class="text-2xl font-bold">{{ totalSalesVal.toLocaleString() }} <span class="text-xs font-medium">MAD</span></h3>
          <p class="text-xs text-accent-blue flex items-center gap-1">
            <TrendingUp class="w-3.5 h-3.5" />
            <span>{{ t('dashboard.all_time_total') }}</span>
          </p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue shadow-sm">
          <DollarSign class="w-6 h-6" />
        </div>
      </div>

      <!-- Card: Profit generated -->
      <div class="glass-card p-6 flex items-center justify-between">
        <div class="space-y-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ t('dashboard.profit') }}</span>
          <h3 class="text-2xl font-bold" :class="totalProfitVal >= 0 ? 'text-accent-green' : 'text-accent-pink'">
            {{ totalProfitVal.toLocaleString() }} <span class="text-xs font-medium">MAD</span>
          </h3>
          <p class="text-xs flex items-center gap-1" :class="totalProfitVal >= 0 ? 'text-accent-green' : 'text-accent-pink'">
            <component :is="totalProfitVal >= 0 ? TrendingUp : TrendingDown" class="w-3.5 h-3.5" />
            <span>{{ t('dashboard.margin_calculated') }}</span>
          </p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-accent-green/10 flex items-center justify-center text-accent-green shadow-sm">
          <TrendingUp class="w-6 h-6" />
        </div>
      </div>

      <!-- Card: Active Expenses -->
      <div class="glass-card p-6 flex items-center justify-between">
        <div class="space-y-2">
          <span class="text-xs font-semibold text-slate-400 uppercase tracking-wider">{{ t('dashboard.expenses') }}</span>
          <h3 class="text-2xl font-bold text-accent-pink">{{ expenseStore.totalExpenses.toLocaleString() }} <span class="text-xs font-medium">MAD</span></h3>
          <p class="text-xs text-slate-400">{{ t('dashboard.expenses_desc') }}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-accent-pink/10 flex items-center justify-center text-accent-pink shadow-sm">
          <TrendingDown class="w-6 h-6" />
        </div>
      </div>
    </div>

    <!-- Alert details & pending items summary row -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      <!-- Pending orders and low stocks indicators -->
      <div class="glass-card p-6 col-span-1 flex flex-col justify-between space-y-4">
        <h4 class="font-bold text-lg text-slate-700 dark:text-slate-200">{{ t('dashboard.alerts_actions') }}</h4>
        <div class="space-y-3 flex-1">
          <!-- Low Stock Alert -->
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-accent-pink/5 border border-accent-pink/15">
            <div class="flex items-center gap-3">
              <AlertCircle class="w-5 h-5 text-accent-pink" />
              <div>
                <h5 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ t('dashboard.low_stock_warning') }}</h5>
                <p class="text-xs text-slate-500">{{ productStore.lowStockVariants.length }} {{ t('dashboard.products_require_restock') }}</p>
              </div>
            </div>
            <router-link to="/inventory" class="text-xs font-bold text-accent-pink hover:underline">{{ t('dashboard.view') }}</router-link>
          </div>

          <!-- Pending Deliveries Alert -->
          <div class="flex items-center justify-between p-3.5 rounded-xl bg-accent-orange/5 border border-accent-orange/15">
            <div class="flex items-center gap-3">
              <Package class="w-5 h-5 text-accent-orange" />
              <div>
                <h5 class="text-sm font-semibold text-slate-800 dark:text-slate-200">{{ t('dashboard.pending_deliveries') }}</h5>
                <p class="text-xs text-slate-500">{{ ordersWaitingCount }} {{ t('dashboard.orders_waiting_dispatch') }}</p>
              </div>
            </div>
            <router-link to="/deliveries" class="text-xs font-bold text-accent-orange hover:underline">{{ t('dashboard.track') }}</router-link>
          </div>
        </div>
      </div>

      <!-- Best Selling Products List -->
      <div class="glass-card p-6 col-span-2 space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-lg text-slate-700 dark:text-slate-200">{{ t('dashboard.best_sellers') }}</h4>
          <span class="text-xs text-slate-400">{{ t('dashboard.top_5') }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm border-collapse">
            <thead>
              <tr class="text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50">
                <th class="pb-3 font-semibold">{{ t('dashboard.product') }}</th>
                <th class="pb-3 font-semibold">Color / Size</th>
                <th class="pb-3 font-semibold">{{ t('dashboard.sku') }}</th>
                <th class="pb-3 font-semibold text-right">{{ t('dashboard.sold_qty') }}</th>
                <th class="pb-3 font-semibold text-right">{{ t('dashboard.revenue') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-850">
              <tr v-for="item in bestSellers" :key="item.id" class="text-slate-700 dark:text-slate-350 hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                <td class="py-3.5 font-medium">{{ item.name }}</td>
                <td class="py-3.5">
                  <span class="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold text-slate-500">{{ item.variant || '—' }}</span>
                </td>
                <td class="py-3.5 font-mono text-xs">{{ item.sku }}</td>
                <td class="py-3.5 text-right font-bold">{{ item.sold }}</td>
                <td class="py-3.5 text-right text-accent-blue font-semibold">{{ item.revenue.toLocaleString() }} MAD</td>
              </tr>
              <tr v-if="bestSellers.length === 0">
                <td colspan="5" class="py-6 text-center text-slate-400">{{ t('dashboard.no_sales_yet') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Visual Charts section: Cash Flow / Profit overview (SVG format for lightweight offline capability) -->
    <div class="glass-card p-6 space-y-4">
      <div class="flex items-center justify-between">
        <h4 class="font-bold text-lg text-slate-700 dark:text-slate-200">{{ t('dashboard.weekly_performance') }}</h4>
        <div class="flex items-center gap-4 text-xs font-semibold">
          <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-accent-blue"></span> {{ t('dashboard.sales') }}</div>
          <div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-full bg-accent-green"></span> {{ t('dashboard.profit') }}</div>
        </div>
      </div>

      <!-- Lightweight SVG Chart Area -->
      <div class="h-64 flex items-end justify-between px-2 pt-6 relative border-b border-slate-200 dark:border-slate-850">
        <!-- SVG Grid Lines background -->
        <div class="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
          <div class="border-b border-slate-500 w-full"></div>
          <div class="border-b border-slate-500 w-full"></div>
          <div class="border-b border-slate-500 w-full"></div>
          <div class="border-b border-slate-500 w-full"></div>
        </div>

        <!-- Mon, Tue, Wed, Thu, Fri, Sat, Sun simulation bars -->
        <div class="flex-1 flex flex-col items-center justify-end h-full group" v-for="(day, idx) in ['mon','tue','wed','thu','fri','sat','sun']" :key="day">
          <div class="w-full max-w-[40px] flex items-end gap-1 h-[80%]">
            <!-- Sales Bar -->
            <div 
              class="w-1/2 bg-accent-blue rounded-t-md hover:bg-opacity-80 transition-all duration-300 relative group-hover:scale-y-105 origin-bottom" 
              :style="{ height: `${20 + (idx * 11) % 65}%` }"
              :title="`${t('dashboard.sales')}: ${1200 + (idx * 230)} MAD`"
            ></div>
            <!-- Profit Bar -->
            <div 
              class="w-1/2 bg-accent-green rounded-t-md hover:bg-opacity-80 transition-all duration-300 relative group-hover:scale-y-105 origin-bottom" 
              :style="{ height: `${10 + (idx * 8) % 40}%` }"
              :title="`${t('dashboard.profit')}: ${400 + (idx * 110)} MAD`"
            ></div>
          </div>
          <span class="text-xs text-slate-400 mt-2 font-medium">{{ t('dashboard.' + day) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
