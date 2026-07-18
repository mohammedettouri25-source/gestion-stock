<script setup>
import { ref, onMounted, computed } from 'vue';
import { db } from '../services/db';
import { syncEngine } from '../services/syncEngine';
import { useI18n } from 'vue-i18n';
import { Users, Plus, Search, Edit, Trash2, X, DollarSign } from 'lucide-vue-next';

const customers = ref([]);
const search = ref('');
const showModal = ref(false);
const editingCustomer = ref(null);
const selectedCustomer = ref(null);
const showHistoryModal = ref(false);
const customerOrders = ref([]);
const { t } = useI18n();

const form = ref({ name: '', phone: '', email: '', notes: '' });

onMounted(async () => {
  customers.value = await db.customers.toArray();
});

const filteredCustomers = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return customers.value;
  return customers.value.filter(c =>
    c.name.toLowerCase().includes(q) || c.phone?.includes(q)
  );
});

const totalOutstanding = computed(() =>
  customers.value.reduce((acc, c) => acc + (c.outstanding_balance || 0), 0)
);

function openAdd() {
  editingCustomer.value = null;
  form.value = { name: '', phone: '', email: '', notes: '' };
  showModal.value = true;
}

function openEdit(c) {
  editingCustomer.value = c;
  form.value = { ...c };
  showModal.value = true;
}

async function viewHistory(c) {
  selectedCustomer.value = c;
  customerOrders.value = await db.orders.where('customer_id').equals(c.id).toArray();
  showHistoryModal.value = true;
}

async function save() {
  if (!form.value.name) { alert('Name is required'); return; }

  const isNew = !editingCustomer.value;
  const payload = {
    ...form.value,
    id: isNew ? 'cust-' + crypto.randomUUID() : editingCustomer.value.id,
    outstanding_balance: editingCustomer.value?.outstanding_balance || 0,
    updated_at: new Date().toISOString()
  };

  await db.customers.put(payload);
  await syncEngine.queueOperation('customers', isNew ? 'create' : 'update', payload);
  customers.value = await db.customers.toArray();
  showModal.value = false;
}

async function deleteCustomer(id) {
  if (!confirm('Delete this customer?')) return;
  await db.customers.delete(id);
  await syncEngine.queueOperation('customers', 'delete', { id });
  customers.value = await db.customers.toArray();
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('common.customers') }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('customers.manage_desc') }}</p>
      </div>
      <button @click="openAdd" class="glass-btn-primary self-start">
        <Plus class="w-4 h-4" /> {{ t('customers.add_customer') }}
      </button>
    </div>

    <!-- Summary -->
    <div class="grid grid-cols-3 gap-4">
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold">{{ customers.length }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('customers.total_customers') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-pink">{{ customers.filter(c => c.outstanding_balance > 0).length }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('customers.with_balance') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-xl font-bold text-accent-orange">{{ totalOutstanding.toLocaleString() }} MAD</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('customers.total_outstanding') }}</p>
      </div>
    </div>

    <!-- Search -->
    <div class="relative">
      <Search class="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
      <input v-model="search" type="text" :placeholder="t('customers.search_placeholder')"
        class="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-sm" />
    </div>

    <!-- Table -->
    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="border-b border-slate-200/50 dark:border-slate-800">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">{{ t('customers.name') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('customers.phone') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('customers.email') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('customers.outstanding_balance') }}</th>
              <th class="px-6 py-4 font-semibold text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="c in filteredCustomers" :key="c.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td class="px-6 py-4 font-semibold">{{ c.name }}</td>
              <td class="px-6 py-4 text-slate-500">{{ c.phone || '—' }}</td>
              <td class="px-6 py-4 text-slate-500 text-xs">{{ c.email || '—' }}</td>
              <td class="px-6 py-4">
                <span v-if="c.outstanding_balance > 0" class="font-bold text-accent-orange">
                  {{ Number(c.outstanding_balance).toLocaleString() }} MAD
                </span>
                <span v-else class="text-slate-400">—</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button @click="viewHistory(c)" class="px-3 py-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 font-semibold text-slate-600 dark:text-slate-300 hover:text-accent-blue">
                    {{ t('customers.history') }}
                  </button>
                  <button @click="openEdit(c)" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent-blue">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button @click="deleteCustomer(c.id)" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-accent-pink">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredCustomers.length === 0">
              <td colspan="5" class="px-6 py-16 text-center text-slate-400">
                <Users class="w-12 h-12 mx-auto mb-3 opacity-30" /> {{ t('customers.no_customers') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-md p-8 space-y-5 relative">
        <button @click="showModal = false" class="absolute right-6 top-6 text-slate-400 hover:text-slate-600"><X class="w-5 h-5" /></button>
        <h2 class="text-xl font-bold">{{ editingCustomer ? t('customers.edit_customer') : t('customers.add_customer') }}</h2>
        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('customers.name') }} *</label>
            <input v-model="form.name" type="text" placeholder="Ahmed El-Fassi" class="glass-input" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('customers.phone') }}</label>
            <input v-model="form.phone" type="text" placeholder="0612345678" class="glass-input" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('customers.email') }}</label>
            <input v-model="form.email" type="email" placeholder="email@example.com" class="glass-input" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('customers.notes') }}</label>
            <textarea v-model="form.notes" rows="2" :placeholder="t('customers.notes_placeholder')" class="glass-input resize-none"></textarea>
          </div>
        </div>
        <div class="flex gap-3">
          <button @click="showModal = false" class="glass-btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="save" class="glass-btn-primary flex-1">{{ editingCustomer ? t('customers.update') : t('customers.add_customer') }}</button>
        </div>
      </div>
    </div>

    <!-- Purchase History Modal -->
    <div v-if="showHistoryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-lg p-8 space-y-5 relative max-h-[80vh] overflow-y-auto">
        <button @click="showHistoryModal = false" class="absolute right-6 top-6 text-slate-400 hover:text-slate-600"><X class="w-5 h-5" /></button>
        <div>
          <h2 class="text-xl font-bold">{{ selectedCustomer?.name }}</h2>
          <p class="text-sm text-slate-500 mt-1">{{ t('customers.purchase_history') }}</p>
          <p v-if="selectedCustomer?.outstanding_balance > 0" class="mt-2 text-sm font-bold text-accent-orange">
            {{ t('customers.outstanding_balance') }}: {{ Number(selectedCustomer.outstanding_balance).toLocaleString() }} MAD
          </p>
        </div>
        <div v-if="customerOrders.length === 0" class="py-8 text-center text-slate-400">
          {{ t('customers.no_purchases') }}
        </div>
        <div v-else class="space-y-3">
          <div v-for="o in customerOrders" :key="o.id"
            class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-xs font-mono text-accent-blue">{{ o.id.substring(0, 16) }}...</p>
                <p class="text-xs text-slate-400">{{ new Date(o.date).toLocaleDateString() }}</p>
              </div>
              <div class="text-right">
                <p class="font-bold text-accent-blue">{{ o.total_amount?.toLocaleString() }} MAD</p>
                <span class="text-xs px-2 py-0.5 rounded-full font-bold"
                  :class="o.payment_status === 'paid' ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-orange/10 text-accent-orange'">
                  {{ o.payment_status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
