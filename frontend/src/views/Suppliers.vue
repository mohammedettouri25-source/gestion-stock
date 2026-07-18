<script setup>
import { ref, onMounted, computed } from 'vue';
import { useSupplierStore } from '../stores/suppliers';
import { useI18n } from 'vue-i18n';
import { Building2, Plus, Search, Edit3, Trash2, Phone, Mail, MapPin, DollarSign, X } from 'lucide-vue-next';

const supplierStore = useSupplierStore();
const searchQuery = ref('');
const showModal = ref(false);
const form = ref({ id: null, name: '', phone: '', email: '', outstanding_balance: 0 });
const { t } = useI18n();

onMounted(async () => {
  await supplierStore.loadAll();
});

const filteredSuppliers = computed(() => {
  if (!searchQuery.value) return supplierStore.suppliers;
  const q = searchQuery.value.toLowerCase();
  return supplierStore.suppliers.filter(s => 
    (s.name && s.name.toLowerCase().includes(q)) ||
    (s.phone && s.phone.toLowerCase().includes(q)) ||
    (s.email && s.email.toLowerCase().includes(q))
  );
});

const editSupplier = (supplier) => {
  form.value = { ...supplier };
  showModal.value = true;
};

const openAddModal = () => {
  form.value = { id: null, name: '', phone: '', email: '', outstanding_balance: 0 };
  showModal.value = true;
};

const saveSupplier = async () => {
  if (!form.value.name) return alert('Name is required');
  await supplierStore.saveSupplier(form.value);
  showModal.value = false;
};

const deleteSupplier = async (id) => {
  if (confirm('Are you sure you want to delete this supplier?')) {
    await supplierStore.deleteSupplier(id);
  }
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <div>
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('common.suppliers') }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('suppliers.manage_desc') }}</p>
      </div>
      <button @click="openAddModal" class="glass-btn-primary">
        <Plus class="w-5 h-5" />
        {{ t('suppliers.add_supplier') }}
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="glass-card p-5 flex items-center gap-4">
        <div class="p-3 bg-accent-blue/10 rounded-xl text-accent-blue">
          <Building2 class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">{{ t('suppliers.total_suppliers') }}</p>
          <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ supplierStore.activeSuppliersCount }}</p>
        </div>
      </div>
      <div class="glass-card p-5 flex items-center gap-4">
        <div class="p-3 bg-accent-pink/10 rounded-xl text-accent-pink">
          <DollarSign class="w-6 h-6" />
        </div>
        <div>
          <p class="text-sm text-slate-500 dark:text-slate-400 font-medium">{{ t('suppliers.total_outstanding') }}</p>
          <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ supplierStore.totalOutstandingBalance.toFixed(2) }} MAD</p>
        </div>
      </div>
    </div>

    <!-- Search & Table -->
    <div class="glass-card overflow-hidden">
      <div class="p-4 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
        <div class="relative w-64">
          <Search class="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input v-model="searchQuery" type="text" :placeholder="t('suppliers.search_placeholder')" class="glass-input pl-10 py-2 text-sm" />
        </div>
      </div>
      
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-slate-50/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
            <tr>
              <th class="px-6 py-3 font-medium">{{ t('suppliers.supplier_info') }}</th>
              <th class="px-6 py-3 font-medium">{{ t('suppliers.contact_col') }}</th>
              <th class="px-6 py-3 font-medium text-right">{{ t('suppliers.balance_mad') }}</th>
              <th class="px-6 py-3 font-medium text-center">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200/50 dark:divide-slate-800/50">
            <tr v-for="supplier in filteredSuppliers" :key="supplier.id" class="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors">
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold">
                    {{ supplier.name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-medium text-slate-800 dark:text-white">{{ supplier.name }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col gap-1 text-slate-500 dark:text-slate-400">
                  <div v-if="supplier.phone" class="flex items-center gap-2"><Phone class="w-3 h-3" /> {{ supplier.phone }}</div>
                  <div v-if="supplier.email" class="flex items-center gap-2"><Mail class="w-3 h-3" /> {{ supplier.email }}</div>
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <span :class="Number(supplier.outstanding_balance) > 0 ? 'text-accent-pink font-bold' : 'text-slate-500'">
                  {{ Number(supplier.outstanding_balance || 0).toFixed(2) }}
                </span>
              </td>
              <td class="px-6 py-4 text-center">
                <div class="flex justify-center gap-2">
                  <button @click="editSupplier(supplier)" class="p-2 text-slate-400 hover:text-accent-blue hover:bg-accent-blue/10 rounded-lg transition-colors">
                    <Edit3 class="w-4 h-4" />
                  </button>
                  <button @click="deleteSupplier(supplier.id)" class="p-2 text-slate-400 hover:text-accent-pink hover:bg-accent-pink/10 rounded-lg transition-colors">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredSuppliers.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-slate-500">{{ t('suppliers.no_suppliers') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div class="glass-panel w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div class="p-4 border-b border-slate-200/50 dark:border-slate-700/50 flex justify-between items-center">
          <h3 class="text-lg font-bold">{{ form.id ? t('suppliers.edit_supplier') : t('suppliers.new_supplier') }}</h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-white">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="p-4 overflow-y-auto space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('suppliers.company_name') }}</label>
            <input v-model="form.name" type="text" class="glass-input" required />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('common.phone', 'Phone') }}</label>
            <input v-model="form.phone" type="text" class="glass-input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('common.email', 'Email') }}</label>
            <input v-model="form.email" type="email" class="glass-input" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-500 mb-1">{{ t('suppliers.initial_balance') }}</label>
            <input v-model.number="form.outstanding_balance" type="number" step="0.01" class="glass-input" :disabled="!!form.id" />
            <p v-if="form.id" class="text-xs text-slate-400 mt-1">{{ t('suppliers.update_balance_note') }}</p>
          </div>
        </div>
        <div class="p-4 border-t border-slate-200/50 dark:border-slate-700/50 flex justify-end gap-3 bg-slate-50/50 dark:bg-slate-800/50">
          <button @click="showModal = false" class="glass-btn-secondary">{{ t('common.cancel') }}</button>
          <button @click="saveSupplier" class="glass-btn-primary">{{ t('suppliers.save_supplier') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
