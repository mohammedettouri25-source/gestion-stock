<script setup>
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useProductStore } from '../stores/products';
import { db } from '../services/db';
import { PackageOpen, TrendingUp, TrendingDown, Settings2, Plus, X, AlertCircle } from 'lucide-vue-next';

const productStore = useProductStore();
const { t } = useI18n();
const movements = ref([]);
const showAdjustModal = ref(false);
const selectedVariant = ref(null);

const adjustForm = ref({
  quantity: 1,
  type: 'in',
  reason: ''
});

onMounted(async () => {
  await productStore.loadAll();
  movements.value = await db.stock_movements.toArray();
});

const lowStockItems = computed(() => productStore.lowStockVariants);

// Variant augmented with product details for display
const variantsWithProduct = computed(() => {
  return productStore.variants.map(v => {
    const product = productStore.products.find(p => p.id === v.product_id) || {};
    return {
      ...v,
      productName: product.name || 'Unknown Product'
    };
  });
});

async function adjustStock() {
  if (!selectedVariant.value) return;
  try {
    await productStore.adjustStock(
      selectedVariant.value.id,
      adjustForm.value.quantity,
      adjustForm.value.type,
      adjustForm.value.reason || 'Manual adjustment'
    );
    // Reload movements
    movements.value = await db.stock_movements.toArray();
    showAdjustModal.value = false;
  } catch (e) {
    alert('Stock adjustment failed: ' + e.message);
  }
}

function openAdjust(variant) {
  selectedVariant.value = variant;
  adjustForm.value = { quantity: 1, type: 'in', reason: '' };
  showAdjustModal.value = true;
}

function getVariantName(variantId) {
  const v = productStore.variants.find(v => v.id === variantId);
  if (!v) return variantId;
  const p = productStore.products.find(p => p.id === v.product_id);
  return `${p?.name || 'Unknown'} (${v.attributes?.Color || ''} - ${v.attributes?.Size || ''})`;
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">{{ t('inventory.stock_inventory') }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('inventory.stock_desc') }}</p>
      </div>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="glass-card p-6 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('common.products') }} (Variants)</p>
          <p class="text-3xl font-bold mt-1">{{ productStore.variants.length }}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-accent-blue/10 flex items-center justify-center text-accent-blue">
          <PackageOpen class="w-6 h-6" />
        </div>
      </div>
      <div class="glass-card p-6 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('dashboard.low_stock_alerts') }}</p>
          <p class="text-3xl font-bold mt-1 text-accent-pink">{{ lowStockItems.length }}</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-accent-pink/10 flex items-center justify-center text-accent-pink">
          <AlertCircle class="w-6 h-6" />
        </div>
      </div>
      <div class="glass-card p-6 flex items-center justify-between">
        <div>
          <p class="text-xs font-semibold text-slate-400 uppercase">{{ t('inventory.inventory_value') }}</p>
          <p class="text-2xl font-bold mt-1">{{ productStore.totalInventoryValuation.toLocaleString() }} MAD</p>
        </div>
        <div class="w-12 h-12 rounded-2xl bg-accent-green/10 flex items-center justify-center text-accent-green">
          <TrendingUp class="w-6 h-6" />
        </div>
      </div>
    </div>

    <!-- Low stock alerts panel -->
    <div v-if="lowStockItems.length > 0" class="glass-card p-6 space-y-3">
      <h3 class="font-bold text-lg flex items-center gap-2 text-accent-pink">
        <AlertCircle class="w-5 h-5" /> {{ t('dashboard.low_stock_alerts') }}
      </h3>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div v-for="v in lowStockItems" :key="v.id"
          class="flex items-center justify-between p-3 rounded-xl bg-accent-pink/5 border border-accent-pink/15">
          <div>
            <p class="text-sm font-semibold">{{ getVariantName(v.id) }}</p>
            <p class="text-xs text-slate-400 font-mono">{{ v.sku }}</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-bold text-accent-pink">{{ v.stock_quantity }} / {{ v.min_stock }}</p>
            <button @click="openAdjust(v)" class="text-xs font-bold text-accent-blue hover:underline">{{ t('inventory.restock') }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- All Variants Stock Table -->
    <div class="glass-card overflow-hidden">
      <div class="p-6 border-b border-slate-200/50 dark:border-slate-800">
        <h3 class="font-bold text-lg">{{ t('inventory.all_levels') }} (Variants)</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-800">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-3 font-semibold">Variant (Product/Color/Size)</th>
              <th class="px-6 py-3 font-semibold">{{ t('dashboard.sku') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('products.current_stock') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('inventory.min_alert') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('inventory.cost_value') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('inventory.sell_value') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('common.status') }}</th>
              <th class="px-6 py-3 font-semibold text-right">{{ t('inventory.adjust') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="v in variantsWithProduct" :key="v.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td class="px-6 py-4 font-semibold">
                {{ v.productName }}
                <span class="block text-[10px] text-slate-400 uppercase mt-0.5">{{ v.attributes.Color }} · {{ v.attributes.Size }}</span>
              </td>
              <td class="px-6 py-4 font-mono text-xs text-accent-blue">{{ v.sku }}</td>
              <td class="px-6 py-4 font-bold text-lg" :class="v.stock_quantity <= (v.min_stock || 5) ? 'text-accent-pink' : 'text-accent-green'">
                {{ v.stock_quantity }}
              </td>
              <td class="px-6 py-4 text-slate-500">{{ v.min_stock || 5 }}</td>
              <td class="px-6 py-4">{{ (v.purchase_price * v.stock_quantity).toLocaleString() }} MAD</td>
              <td class="px-6 py-4 text-accent-blue font-semibold">{{ (v.selling_price * v.stock_quantity).toLocaleString() }} MAD</td>
              <td class="px-6 py-4">
                <span :class="v.stock_quantity <= (v.min_stock || 5) ? 'badge-danger' : 'badge-success'">
                  {{ v.stock_quantity <= (v.min_stock || 5) ? t('inventory.low_stock') : t('inventory.ok') }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <button @click="openAdjust(v)" class="glass-btn-secondary py-1.5 px-3 text-xs">
                  <Settings2 class="w-3.5 h-3.5" /> Adjust
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Stock Movement History -->
    <div class="glass-card overflow-hidden">
      <div class="p-6 border-b border-slate-200/50 dark:border-slate-800">
        <h3 class="font-bold text-lg">{{ t('inventory.movement_history') }}</h3>
        <p class="text-xs text-slate-400 mt-1">{{ t('inventory.movement_desc') }}</p>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200/50 dark:border-slate-800">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-3 font-semibold">{{ t('common.date') }}</th>
              <th class="px-6 py-3 font-semibold">Variant</th>
              <th class="px-6 py-3 font-semibold">{{ t('inventory.type') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('inventory.quantity') }}</th>
              <th class="px-6 py-3 font-semibold">{{ t('inventory.reason') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="mv in [...movements].reverse().slice(0, 50)" :key="mv.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td class="px-6 py-3 text-slate-500 text-xs">{{ new Date(mv.date).toLocaleDateString() }}</td>
              <td class="px-6 py-3 font-medium text-xs">{{ getVariantName(mv.variant_id) }}</td>
              <td class="px-6 py-3">
                <span class="flex items-center gap-1.5 w-fit text-xs font-bold px-2.5 py-1 rounded-full"
                  :class="{
                    'bg-accent-green/10 text-accent-green': mv.type === 'in',
                    'bg-accent-pink/10 text-accent-pink': mv.type === 'out',
                    'bg-accent-orange/10 text-accent-orange': mv.type === 'adjust'
                  }">
                  <TrendingUp v-if="mv.type === 'in'" class="w-3 h-3" />
                  <TrendingDown v-else-if="mv.type === 'out'" class="w-3 h-3" />
                  {{ mv.type === 'in' ? t('inventory.stock_in') : mv.type === 'out' ? t('inventory.stock_out') : t('inventory.adjustment') }}
                </span>
              </td>
              <td class="px-6 py-3 font-bold">{{ mv.quantity }}</td>
              <td class="px-6 py-3 text-slate-500 text-xs">{{ mv.reason || '—' }}</td>
            </tr>
            <tr v-if="movements.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-slate-400">{{ t('inventory.no_movements') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Stock Adjustment Modal -->
    <div v-if="showAdjustModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-md p-8 space-y-6 relative">
        <button @click="showAdjustModal = false" class="absolute right-6 top-6 text-slate-400 hover:text-slate-600">
          <X class="w-5 h-5" />
        </button>
        <div>
          <h2 class="text-xl font-bold">{{ t('inventory.adjust_stock') }}</h2>
          <p class="text-sm text-slate-500 mt-1">{{ getVariantName(selectedVariant?.id) }}</p>
          <p class="text-sm font-bold text-accent-blue mt-1">{{ t('inventory.current') }}: {{ selectedVariant?.stock_quantity }} pcs</p>
        </div>

        <div class="space-y-4">
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('inventory.adjustment_type') }}</label>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="type in [{v:'in',l:'Stock In'},{v:'out',l:'Stock Out'},{v:'adjust',l:'Set Qty'}]" :key="type.v"
                @click="adjustForm.type = type.v"
                class="py-2.5 text-xs font-bold rounded-xl border transition-all"
                :class="adjustForm.type === type.v
                  ? 'bg-accent-blue text-white border-accent-blue'
                  : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-accent-blue'">
                {{ type.l }}
              </button>
            </div>
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">
              {{ adjustForm.type === 'adjust' ? t('inventory.new_qty') : t('inventory.quantity') }}
            </label>
            <input v-model.number="adjustForm.quantity" type="number" min="0" class="glass-input text-xl font-bold text-center" />
          </div>
          <div class="space-y-1">
            <label class="text-xs font-bold text-slate-500 uppercase">{{ t('inventory.reason_note') }}</label>
            <input v-model="adjustForm.reason" type="text" placeholder="e.g. Supplier delivery, damaged goods..." class="glass-input" />
          </div>
        </div>

        <div class="flex gap-3">
          <button @click="showAdjustModal = false" class="glass-btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="adjustStock" class="glass-btn-primary flex-1">{{ t('inventory.apply_adjustment') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>
