<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { db } from '../services/db';
import { syncEngine } from '../services/syncEngine';
import { useExpenseStore } from '../stores/expenses';
import { TrendingDown, Plus, Trash2, X, Calendar, PieChart } from 'lucide-vue-next';

const expenseStore = useExpenseStore();
const { t } = useI18n();
const showModal = ref(false);
const filterCat = ref('all');

const expenseCategories = [
  { id: 1, name: 'Rent' },
  { id: 2, name: 'Salaries' },
  { id: 3, name: 'Electricity' },
  { id: 4, name: 'Internet' },
  { id: 5, name: 'Marketing' },
  { id: 6, name: 'Transport' },
  { id: 7, name: 'Other Expenses' }
];

const form = ref({
  category_id: 1,
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0]
});

onMounted(() => expenseStore.loadExpenses());

const filteredExpenses = computed(() => {
  if (filterCat.value === 'all') return [...expenseStore.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
  return expenseStore.expenses.filter(e => String(e.category_id) === String(filterCat.value))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
});

// Breakdown by category for mini pie visualization
const categoryBreakdown = computed(() => {
  const total = expenseStore.totalExpenses;
  return expenseCategories.map(cat => {
    const catTotal = expenseStore.expenses
      .filter(e => String(e.category_id) === String(cat.id))
      .reduce((acc, e) => acc + Number(e.amount), 0);
    return {
      ...cat,
      total: catTotal,
      percentage: total > 0 ? ((catTotal / total) * 100).toFixed(1) : 0
    };
  }).filter(c => c.total > 0);
});

const catColors = ['bg-accent-blue', 'bg-accent-green', 'bg-accent-orange', 'bg-accent-pink', 'bg-accent-purple', 'bg-accent-gold', 'bg-slate-400'];

async function save() {
  if (!form.value.amount || !form.value.date) { alert('Amount and Date are required'); return; }
  await expenseStore.addExpense(form.value);
  showModal.value = false;
  form.value = { category_id: 1, amount: '', description: '', date: new Date().toISOString().split('T')[0] };
}

function getCategoryName(id) {
  return expenseCategories.find(c => String(c.id) === String(id))?.name || 'Other';
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('expenses.tracker') }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('expenses.track_desc') }}</p>
      </div>
      <button @click="showModal = true" class="glass-btn-primary self-start">
        <Plus class="w-4 h-4" /> {{ t('expenses.record_new') }}
      </button>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-pink">{{ expenseStore.totalExpenses.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('common.total') }} {{ t('common.expenses') }} (MAD)</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold">{{ expenseStore.expenses.length }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('expenses.transactions') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-xl font-bold text-accent-orange">{{ categoryBreakdown[0]?.name || '—' }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('expenses.top_category') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-xl font-bold text-accent-orange">{{ categoryBreakdown[0]?.total?.toLocaleString() || '0' }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('expenses.top_amount') }}</p>
      </div>
    </div>

    <!-- Breakdown by category -->
    <div class="glass-card p-6 space-y-4">
      <h3 class="font-bold text-lg flex items-center gap-2">
        <PieChart class="w-5 h-5 text-accent-blue" /> {{ t('expenses.breakdown') }}
      </h3>
      <div class="space-y-3">
        <div v-for="(cat, i) in categoryBreakdown" :key="cat.id" class="space-y-1">
          <div class="flex justify-between items-center text-sm">
            <span class="font-medium">{{ cat.name }}</span>
            <span class="font-bold">{{ cat.total.toLocaleString() }} MAD <span class="text-xs text-slate-400">({{ cat.percentage }}%)</span></span>
          </div>
          <div class="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div class="h-full rounded-full transition-all duration-700"
              :class="catColors[i % catColors.length]"
              :style="{ width: cat.percentage + '%' }"></div>
          </div>
        </div>
        <div v-if="categoryBreakdown.length === 0" class="text-center text-slate-400 py-8">{{ t('expenses.no_expenses') }}</div>
      </div>
    </div>

    <!-- Filter Tabs -->
    <div class="flex gap-2 overflow-x-auto pb-1">
      <button @click="filterCat = 'all'"
        class="px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all"
        :class="filterCat === 'all' ? 'bg-accent-blue text-white' : 'bg-white dark:bg-slate-800 hover:bg-slate-100'">{{ t('expenses.all') }}</button>
      <button v-for="cat in expenseCategories" :key="cat.id"
        @click="filterCat = cat.id"
        class="px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all"
        :class="filterCat === cat.id ? 'bg-accent-blue text-white' : 'bg-white dark:bg-slate-800 hover:bg-slate-100'">
        {{ cat.name }}
      </button>
    </div>

    <!-- Expense List -->
    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="border-b border-slate-200/50 dark:border-slate-800">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">{{ t('common.date') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('common.categories') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('expenses.description', 'Description') }}</th>
              <th class="px-6 py-4 font-semibold text-right">{{ t('expenses.amount', 'Amount') }}</th>
              <th class="px-6 py-4 font-semibold text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="e in filteredExpenses" :key="e.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td class="px-6 py-4 text-slate-500 text-xs flex items-center gap-2">
                <Calendar class="w-3.5 h-3.5" /> {{ e.date }}
              </td>
              <td class="px-6 py-4">
                <span class="badge-info">{{ getCategoryName(e.category_id) }}</span>
              </td>
              <td class="px-6 py-4 text-slate-600 dark:text-slate-300">{{ e.description || '—' }}</td>
              <td class="px-6 py-4 text-right font-bold text-accent-pink">{{ Number(e.amount).toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-right">
                <button @click="expenseStore.deleteExpense(e.id)"
                  class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-accent-pink">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr v-if="filteredExpenses.length === 0">
              <td colspan="5" class="px-6 py-16 text-center text-slate-400">
                <TrendingDown class="w-12 h-12 mx-auto mb-3 opacity-30" /> {{ t('expenses.no_expenses') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Expense Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-md p-8 space-y-5 relative">
        <button @click="showModal = false" class="absolute right-6 top-6 text-slate-400 hover:text-slate-600"><X class="w-5 h-5" /></button>
        <h2 class="text-xl font-bold">{{ t('expenses.record_new') }}</h2>
        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('common.categories') }}</label>
            <select v-model.number="form.category_id" class="glass-input">
              <option v-for="cat in expenseCategories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('expenses.amount', 'Amount') }} (MAD) *</label>
            <input v-model.number="form.amount" type="number" min="0" step="0.01" placeholder="1500.00" class="glass-input text-xl font-bold" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('common.date') }} *</label>
            <input v-model="form.date" type="date" class="glass-input" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('expenses.description', 'Description') }}</label>
            <input v-model="form.description" type="text" placeholder="Expense details..." class="glass-input" />
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="showModal = false" class="glass-btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="save" class="glass-btn-primary flex-1">{{ t('expenses.save_expense') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
