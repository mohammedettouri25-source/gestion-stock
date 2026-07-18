<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { db } from '../services/db';
import { useProductStore } from '../stores/products';
import { useExpenseStore } from '../stores/expenses';
import { Download, TrendingUp, Package } from 'lucide-vue-next';

const productStore = useProductStore();
const { t } = useI18n();
const expenseStore = useExpenseStore();

const orders = ref([]);
const activeTab = ref('summary');
const fromDate = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
const toDate = ref(new Date().toISOString().split('T')[0]);

onMounted(async () => {
  orders.value = await db.orders.toArray();
  await productStore.loadAll();
  await expenseStore.loadExpenses();
});

const filteredOrders = computed(() => {
  return orders.value.filter(o => {
    const d = o.date.split('T')[0];
    return d >= fromDate.value && d <= toDate.value;
  });
});

const filteredExpenses = computed(() => {
  return expenseStore.expenses.filter(e => e.date >= fromDate.value && e.date <= toDate.value);
});

const totalRevenue = computed(() => filteredOrders.value.reduce((a, o) => a + o.total_amount, 0));
const totalCOGS = computed(() => {
  return filteredOrders.value.reduce((a, o) => {
    return a + (o.items || []).reduce((ia, item) => ia + (item.purchase_price * item.quantity), 0);
  }, 0);
});
const grossProfit = computed(() => totalRevenue.value - totalCOGS.value);
const totalExpenses = computed(() => filteredExpenses.value.reduce((a, e) => a + Number(e.amount), 0));
const netProfit = computed(() => grossProfit.value - totalExpenses.value);
const profitMargin = computed(() => totalRevenue.value > 0 ? ((netProfit.value / totalRevenue.value) * 100).toFixed(1) : 0);

// -------------------------
// Best Sellers — per VARIANT
// -------------------------
const bestSellers = computed(() => {
  const itemMap = {};
  filteredOrders.value.forEach(o => {
    (o.items || []).forEach(item => {
      const key = item.variant_id || item.product_id;
      if (!itemMap[key]) {
        // Determine display name from attributes
        const attrStr = item.attributes 
          ? Object.values(item.attributes).filter(Boolean).join(' / ') 
          : `${item.size || ''} / ${item.color || ''}`;
        itemMap[key] = {
          name: item.name,
          variant: attrStr,
          sku: item.sku,
          qty_sold: 0,
          revenue: 0,
          profit: 0,
          variant_id: key
        };
      }
      itemMap[key].qty_sold += item.quantity;
      itemMap[key].revenue += item.selling_price * item.quantity;
      itemMap[key].profit += (item.selling_price - item.purchase_price) * item.quantity;
    });
  });
  return Object.values(itemMap).sort((a, b) => b.qty_sold - a.qty_sold).slice(0, 15);
});

// -------------------------
// Inventory Report — per VARIANT
// -------------------------
const inventoryReport = computed(() => {
  return productStore.variants.map(v => {
    const product = productStore.products.find(p => p.id === v.product_id) || {};
    
    // Calculate total sold for this variant from order history
    let qtySold = 0;
    orders.value.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.variant_id === v.id) qtySold += item.quantity;
      });
    });

    return {
      id: v.id,
      productName: product.name || 'Unknown',
      color: v.attributes?.Color || '—',
      size: v.attributes?.Size || '—',
      sku: v.sku,
      purchase_price: v.purchase_price,
      selling_price: v.selling_price,
      stock_quantity: v.stock_quantity,
      min_stock: v.min_stock || 5,
      qty_sold: qtySold,
      cost_value: v.purchase_price * v.stock_quantity,
      sell_value: v.selling_price * v.stock_quantity,
      potential_profit: (v.selling_price - v.purchase_price) * v.stock_quantity
    };
  });
});

const totalInventoryCostValue = computed(() => inventoryReport.value.reduce((a, v) => a + v.cost_value, 0));
const totalInventorySellValue = computed(() => inventoryReport.value.reduce((a, v) => a + v.sell_value, 0));

function exportCSV() {
  const rows = [
    ['Report: P&L + Inventory Variants'],
    [''],
    ['--- ORDERS ---'],
    ['Type', 'Date', 'Customer', 'Amount (MAD)'],
    ...filteredOrders.value.map(o => ['Revenue', o.date.split('T')[0], o.customer_name, o.total_amount]),
    [''],
    ['--- EXPENSES ---'],
    ['Type', 'Date', 'Description', 'Amount (MAD)'],
    ...filteredExpenses.value.map(e => ['Expense', e.date, e.description || '—', `-${e.amount}`]),
    [''],
    ['--- INVENTORY BY VARIANT ---'],
    ['Product', 'Color', 'Size', 'SKU', 'Buy Price', 'Sell Price', 'In Stock', 'Qty Sold', 'Cost Value', 'Sell Value'],
    ...inventoryReport.value.map(v => [
      v.productName, v.color, v.size, v.sku,
      v.purchase_price, v.selling_price,
      v.stock_quantity, v.qty_sold,
      v.cost_value, v.sell_value
    ])
  ];
  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gstock-report-${fromDate.value}-to-${toDate.value}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('reports.reports_analytics') }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('reports.reports_desc') }}</p>
      </div>
      <button @click="exportCSV" class="glass-btn-secondary self-start">
        <Download class="w-4 h-4" /> {{ t('reports.export_csv') }}
      </button>
    </div>

    <!-- Date range filter -->
    <div class="glass-card p-4 flex flex-col md:flex-row items-center gap-4">
      <div class="flex items-center gap-3 flex-1">
        <label class="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{{ t('reports.from') }}</label>
        <input v-model="fromDate" type="date" class="glass-input py-2" />
      </div>
      <div class="flex items-center gap-3 flex-1">
        <label class="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{{ t('reports.to') }}</label>
        <input v-model="toDate" type="date" class="glass-input py-2" />
      </div>
    </div>

    <!-- Report Tabs -->
    <div class="flex gap-2 border-b border-slate-200/50 dark:border-slate-800 pb-0">
      <button v-for="tab in [{v:'summary', l: t('reports.pl_summary')},{v:'bestsellers', l: t('reports.best_sellers')},{v:'inventory', l: t('reports.inventory_val_report')}]"
        :key="tab.v" @click="activeTab = tab.v"
        class="px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-all"
        :class="activeTab === tab.v ? 'border-accent-blue text-accent-blue' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'">
        {{ tab.l }}
      </button>
    </div>

    <!-- P&L Summary Tab -->
    <div v-if="activeTab === 'summary'" class="space-y-6">
      <!-- KPI cards -->
      <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div class="glass-card p-6">
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('reports.total_revenue') }}</p>
          <p class="text-2xl font-bold text-accent-blue mt-2">{{ totalRevenue.toLocaleString() }} MAD</p>
          <p class="text-xs text-slate-400 mt-1">{{ filteredOrders.length }} {{ t('reports.orders_count') }}</p>
        </div>
        <div class="glass-card p-6">
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('reports.cost_of_goods') }}</p>
          <p class="text-2xl font-bold text-accent-orange mt-2">{{ totalCOGS.toLocaleString() }} MAD</p>
        </div>
        <div class="glass-card p-6">
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('reports.gross_profit') }}</p>
          <p class="text-2xl font-bold mt-2" :class="grossProfit >= 0 ? 'text-accent-green' : 'text-accent-pink'">{{ grossProfit.toLocaleString() }} MAD</p>
        </div>
        <div class="glass-card p-6">
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('reports.operating_expenses') }}</p>
          <p class="text-2xl font-bold text-accent-pink mt-2">{{ totalExpenses.toLocaleString() }} MAD</p>
        </div>
        <div class="glass-card p-6 md:col-span-2">
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('reports.net_profit') }}</p>
          <p class="text-3xl font-bold mt-2" :class="netProfit >= 0 ? 'text-accent-green' : 'text-accent-pink'">{{ netProfit.toLocaleString() }} MAD</p>
          <p class="text-sm mt-1" :class="netProfit >= 0 ? 'text-accent-green' : 'text-accent-pink'">{{ profitMargin }}% {{ t('reports.net_margin') }}</p>
        </div>
      </div>

      <!-- P&L Statement -->
      <div class="glass-card p-6 space-y-4">
        <h3 class="font-bold text-lg">{{ t('reports.pl_statement') }}</h3>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span class="font-semibold text-slate-500 uppercase text-xs tracking-wide">{{ t('reports.income') }}</span>
          </div>
          <div class="flex justify-between py-1 pl-4">
            <span>{{ t('reports.sales_revenue') }}</span>
            <span class="font-bold text-accent-blue">+ {{ totalRevenue.toLocaleString() }} MAD</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800 mt-2">
            <span class="font-semibold text-slate-500 uppercase text-xs tracking-wide">{{ t('reports.cogs_title') }}</span>
          </div>
          <div class="flex justify-between py-1 pl-4">
            <span>{{ t('reports.purchase_cost') }}</span>
            <span class="font-bold text-accent-orange">- {{ totalCOGS.toLocaleString() }} MAD</span>
          </div>
          <div class="flex justify-between py-2 border-y border-slate-200 dark:border-slate-700">
            <span class="font-bold">{{ t('reports.gross_profit') }}</span>
            <span class="font-bold" :class="grossProfit >= 0 ? 'text-accent-green' : 'text-accent-pink'">{{ grossProfit.toLocaleString() }} MAD</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
            <span class="font-semibold text-slate-500 uppercase text-xs tracking-wide">{{ t('reports.op_expenses_title') }}</span>
          </div>
          <div class="flex justify-between py-1 pl-4">
            <span>{{ t('reports.total_expenses') }}</span>
            <span class="font-bold text-accent-pink">- {{ totalExpenses.toLocaleString() }} MAD</span>
          </div>
          <div class="flex justify-between py-3 border-t-2 border-slate-300 dark:border-slate-600 mt-2">
            <span class="font-extrabold text-base">{{ t('reports.net_profit_title') }}</span>
            <span class="font-extrabold text-lg" :class="netProfit >= 0 ? 'text-accent-green' : 'text-accent-pink'">{{ netProfit.toLocaleString() }} MAD</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Best Sellers Tab — Per Variant -->
    <div v-if="activeTab === 'bestsellers'" class="glass-card overflow-hidden">
      <div class="p-6 border-b border-slate-200/50 dark:border-slate-800">
        <h3 class="font-bold text-lg">{{ t('reports.top_selling') }}</h3>
        <p class="text-xs text-slate-400 mt-1">Ranked by units sold per variant (Color / Size)</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-3 font-semibold">#</th>
              <th class="px-6 py-3 font-semibold">{{ t('dashboard.product') }}</th>
              <th class="px-6 py-3 font-semibold">Color / Size</th>
              <th class="px-6 py-3 font-semibold">SKU</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('reports.units_sold') }}</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('reports.revenue') }}</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('reports.profit') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="(item, i) in bestSellers" :key="item.variant_id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td class="px-6 py-4 font-bold text-slate-400">{{ i + 1 }}</td>
              <td class="px-6 py-4 font-semibold">{{ item.name }}</td>
              <td class="px-6 py-4">
                <span class="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-md font-bold text-slate-600 dark:text-slate-300">{{ item.variant }}</span>
              </td>
              <td class="px-6 py-4 font-mono text-xs text-accent-blue">{{ item.sku }}</td>
              <td class="px-6 py-4 text-right font-bold text-lg">{{ item.qty_sold }}</td>
              <td class="px-6 py-4 text-right font-semibold text-accent-blue">{{ item.revenue.toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-right font-bold" :class="item.profit >= 0 ? 'text-accent-green' : 'text-accent-pink'">{{ item.profit.toLocaleString() }} MAD</td>
            </tr>
            <tr v-if="bestSellers.length === 0">
              <td colspan="7" class="px-6 py-12 text-center text-slate-400">{{ t('reports.no_sales') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Inventory Valuation Tab — Per Variant -->
    <div v-if="activeTab === 'inventory'" class="glass-card overflow-hidden">
      <div class="p-6 border-b border-slate-200/50 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 class="font-bold text-lg">{{ t('reports.inventory_val_report') }}</h3>
          <p class="text-xs text-slate-400 mt-1">Per-variant breakdown of stock, purchases, sales, and value.</p>
        </div>
        <div class="flex gap-6">
          <div class="text-right">
            <p class="text-xs text-slate-400">{{ t('reports.total_cost_value') }}</p>
            <p class="font-bold text-accent-orange">{{ totalInventoryCostValue.toLocaleString() }} MAD</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-400">Total Sell Value</p>
            <p class="font-bold text-accent-blue">{{ totalInventorySellValue.toLocaleString() }} MAD</p>
          </div>
        </div>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-3 font-semibold">Product</th>
              <th class="px-6 py-3 font-semibold">Color</th>
              <th class="px-6 py-3 font-semibold">Size</th>
              <th class="px-6 py-3 font-semibold">SKU</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('reports.buy_price') }}</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('reports.sell_price') }}</th>
              <th class="px-6 py-3 font-semibold text-right">In Stock</th>
              <th class="px-6 py-3 font-semibold text-right">Qty Sold</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('reports.cost_value') }}</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('reports.sell_value') }}</th>
              <th class="px-6 py-3 font-semibold text-center">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="v in inventoryReport" :key="v.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
              <td class="px-6 py-4 font-semibold">{{ v.productName }}</td>
              <td class="px-6 py-4">{{ v.color }}</td>
              <td class="px-6 py-4 font-bold">{{ v.size }}</td>
              <td class="px-6 py-4 font-mono text-xs text-accent-blue">{{ v.sku }}</td>
              <td class="px-6 py-4 text-right">{{ v.purchase_price.toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-right font-semibold text-accent-blue">{{ v.selling_price.toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-right font-bold" :class="v.stock_quantity <= v.min_stock ? 'text-accent-pink' : 'text-accent-green'">
                {{ v.stock_quantity }}
              </td>
              <td class="px-6 py-4 text-right text-slate-600 dark:text-slate-300">{{ v.qty_sold }}</td>
              <td class="px-6 py-4 text-right text-accent-orange">{{ v.cost_value.toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-right font-semibold text-accent-blue">{{ v.sell_value.toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-center">
                <span :class="v.stock_quantity <= v.min_stock ? 'badge-danger' : 'badge-success'">
                  {{ v.stock_quantity <= v.min_stock ? 'Low Stock' : 'OK' }}
                </span>
              </td>
            </tr>
            <tr v-if="inventoryReport.length === 0">
              <td colspan="11" class="px-6 py-16 text-center text-slate-400">
                <Package class="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No variant data available.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
