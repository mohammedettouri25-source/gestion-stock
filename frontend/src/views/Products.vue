<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProductStore } from '../stores/products';
import { useI18n } from 'vue-i18n';
import { Plus, Search, Edit, Trash2, Package, AlertCircle, X, ScanLine, PlusCircle } from 'lucide-vue-next';

const productStore = useProductStore();
const { t } = useI18n();

const search = ref('');
const showModal = ref(false);
const editingProduct = ref(null);
const loading = ref(false);

const form = ref({
  name: '',
  category_id: null,
  brand_id: null,
  variants: []
});

const defaultVariant = {
  id: '',
  sku: '',
  barcode: '',
  purchase_price: 0,
  selling_price: 0,
  stock_quantity: 0,
  min_stock: 5,
  attributes: { Color: '', Size: '' },
  status: 'Active'
};

onMounted(() => productStore.loadAll());

// Aggregate product data for the table
const productsWithStats = computed(() => {
  return productStore.products.map(p => {
    const pVars = productStore.variants.filter(v => v.product_id === p.id);
    const totalStock = pVars.reduce((acc, v) => acc + v.stock_quantity, 0);
    const minStock = pVars.reduce((acc, v) => acc + (v.min_stock || 0), 0);
    const isLowStock = pVars.some(v => v.stock_quantity <= (v.min_stock || 5));
    
    // Get range of prices
    const buyPrices = pVars.map(v => v.purchase_price);
    const sellPrices = pVars.map(v => v.selling_price);
    const minBuy = Math.min(...(buyPrices.length ? buyPrices : [0]));
    const maxBuy = Math.max(...(buyPrices.length ? buyPrices : [0]));
    const minSell = Math.min(...(sellPrices.length ? sellPrices : [0]));
    const maxSell = Math.max(...(sellPrices.length ? sellPrices : [0]));
    
    return {
      ...p,
      variants: pVars,
      variantsCount: pVars.length,
      totalStock,
      isLowStock,
      minBuy, maxBuy, minSell, maxSell
    };
  });
});

const filteredProducts = computed(() => {
  const q = search.value.toLowerCase();
  if (!q) return productsWithStats.value;
  return productsWithStats.value.filter(p => {
    if (p.name.toLowerCase().includes(q)) return true;
    return p.variants.some(v => 
      v.sku.toLowerCase().includes(q) || 
      v.barcode.includes(q) ||
      (v.attributes.Color && v.attributes.Color.toLowerCase().includes(q)) ||
      (v.attributes.Size && v.attributes.Size.toLowerCase().includes(q))
    );
  });
});

function openAdd() {
  editingProduct.value = null;
  form.value = {
    name: '', category_id: null, brand_id: null,
    variants: [ { ...JSON.parse(JSON.stringify(defaultVariant)), id: 'new-' + Date.now() } ]
  };
  showModal.value = true;
}

function openEdit(product) {
  editingProduct.value = product;
  form.value = {
    name: product.name,
    category_id: product.category_id,
    brand_id: product.brand_id,
    variants: product.variants.map(v => JSON.parse(JSON.stringify(v)))
  };
  if (form.value.variants.length === 0) {
    form.value.variants.push({ ...JSON.parse(JSON.stringify(defaultVariant)), id: 'new-' + Date.now() });
  }
  showModal.value = true;
}

function addVariantRow() {
  const newRow = { ...JSON.parse(JSON.stringify(defaultVariant)), id: 'new-' + Date.now() };
  if (form.value.variants.length > 0) {
    // Copy prices from last variant for convenience
    const last = form.value.variants[form.value.variants.length - 1];
    newRow.purchase_price = last.purchase_price;
    newRow.selling_price = last.selling_price;
  }
  form.value.variants.push(newRow);
}

function removeVariantRow(index) {
  if (form.value.variants.length > 1) {
    form.value.variants.splice(index, 1);
  } else {
    alert("At least one variant is required.");
  }
}

function generateSKU(variant, index) {
  if (!form.value.name) return;
  const prefix = form.value.name.substring(0, 3).toUpperCase().replace(/\s/g, '');
  const color = variant.attributes.Color ? variant.attributes.Color.substring(0,3).toUpperCase() : 'XXX';
  const size = variant.attributes.Size ? variant.attributes.Size.toUpperCase() : 'XX';
  variant.sku = `${prefix}-${color}-${size}-${Math.floor(100 + Math.random() * 900)}`;
}

function generateBarcode(variant) {
  variant.barcode = '190' + Math.floor(1000000000 + Math.random() * 9000000000).toString().substring(0, 10);
}

async function save() {
  if (!form.value.name) {
    alert('Product Name is required');
    return;
  }
  
  // Validate variants
  for (const v of form.value.variants) {
    if (!v.sku) generateSKU(v);
    if (!v.barcode) generateBarcode(v);
  }

  loading.value = true;
  try {
    const productPayload = {
      id: editingProduct.value?.id || null,
      name: form.value.name,
      category_id: form.value.category_id,
      brand_id: form.value.brand_id
    };
    await productStore.saveProduct(productPayload, form.value.variants);
    showModal.value = false;
  } catch (e) {
    alert('Failed to save: ' + e.message);
  } finally {
    loading.value = false;
  }
}

async function deleteProduct(id) {
  if (!confirm('Delete this product and ALL its variants?')) return;
  await productStore.deleteProduct(id);
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          {{ t('products.title') }}
        </h1>
        <p class="text-sm text-slate-500 mt-1">{{ t('products.management_desc') }}</p>
      </div>
      <button @click="openAdd" class="glass-btn-primary self-start">
        <Plus class="w-4 h-4" /> {{ t('products.add_product') }}
      </button>
    </div>

    <!-- Stats Cards Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-blue">{{ productStore.products.length }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('products.total_products') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-blue">{{ productStore.variants.length }}</p>
        <p class="text-xs text-slate-500 mt-1">Total Variants</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-2xl font-bold text-accent-pink">{{ productStore.lowStockVariants.length }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('dashboard.low_stock_alerts') }}</p>
      </div>
      <div class="glass-card p-4 text-center">
        <p class="text-xl font-bold text-slate-700 dark:text-slate-200">{{ productStore.totalInventoryValuation.toLocaleString() }}</p>
        <p class="text-xs text-slate-500 mt-1">{{ t('products.cost_value') }} (MAD)</p>
      </div>
    </div>

    <!-- Search -->
    <div class="glass-card p-4">
      <div class="relative">
        <Search class="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
        <input v-model="search" type="text" :placeholder="t('products.search_products')"
          class="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-accent-blue/40 text-sm" />
      </div>
    </div>

    <!-- Products Table -->
    <div class="glass-card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="border-b border-slate-200/50 dark:border-slate-800">
            <tr class="text-slate-500 text-xs uppercase tracking-wider">
              <th class="px-6 py-4 font-semibold">{{ t('products.product') }}</th>
              <th class="px-6 py-4 font-semibold">Variants</th>
              <th class="px-6 py-4 font-semibold">{{ t('products.buy_price') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('products.sell_price') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('products.stock') }}</th>
              <th class="px-6 py-4 font-semibold">{{ t('products.status') }}</th>
              <th class="px-6 py-4 font-semibold text-right">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
            <tr v-for="p in filteredProducts" :key="p.id"
              class="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
              <td class="px-6 py-4">
                <p class="font-semibold text-slate-800 dark:text-slate-100">{{ p.name }}</p>
              </td>
              <td class="px-6 py-4 font-bold text-accent-blue">{{ p.variantsCount }}</td>
              <td class="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">
                <span v-if="p.minBuy === p.maxBuy">{{ p.minBuy }} MAD</span>
                <span v-else>{{ p.minBuy }} - {{ p.maxBuy }} MAD</span>
              </td>
              <td class="px-6 py-4 font-semibold text-accent-blue">
                <span v-if="p.minSell === p.maxSell">{{ p.minSell }} MAD</span>
                <span v-else>{{ p.minSell }} - {{ p.maxSell }} MAD</span>
              </td>
              <td class="px-6 py-4">
                <p class="font-bold" :class="p.isLowStock ? 'text-accent-pink' : 'text-accent-green'">
                  {{ p.totalStock }} pcs
                </p>
              </td>
              <td class="px-6 py-4">
                <span v-if="p.isLowStock" class="badge-danger flex items-center gap-1 w-fit">
                  <AlertCircle class="w-3 h-3" /> {{ t('products.low_stock') }}
                </span>
                <span v-else class="badge-success w-fit">{{ t('products.in_stock') }}</span>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center justify-end gap-2">
                  <button @click="openEdit(p)" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-accent-blue transition-colors">
                    <Edit class="w-4 h-4" />
                  </button>
                  <button @click="deleteProduct(p.id)" class="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-accent-pink transition-colors">
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredProducts.length === 0">
              <td colspan="7" class="px-6 py-16 text-center text-slate-400">
                <Package class="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>{{ t('products.no_products_found') }}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Product Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div class="glass-panel w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
        <!-- Header -->
        <div class="p-6 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold">{{ editingProduct ? t('products.edit_product') : t('products.add_new_product') }}</h2>
            <p class="text-sm text-slate-500 mt-1">Manage product details and its color/size variants.</p>
          </div>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X class="w-6 h-6" />
          </button>
        </div>

        <!-- Body (Scrollable) -->
        <div class="p-6 overflow-y-auto flex-1 space-y-6">
          
          <!-- Basic Product Info -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-500 uppercase">{{ t('products.product_name_req') }}</label>
              <input v-model="form.name" type="text" placeholder="e.g. Tech Fleece Hoodie" class="glass-input" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-500 uppercase">{{ t('common.categories') }}</label>
              <select v-model="form.category_id" class="glass-input">
                <option :value="null">{{ t('products.select_category') }}</option>
                <option v-for="c in productStore.categories" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-xs font-bold text-slate-500 uppercase">{{ t('common.brands') }}</label>
              <select v-model="form.brand_id" class="glass-input">
                <option :value="null">{{ t('products.select_brand') }}</option>
                <option v-for="b in productStore.brands" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
          </div>

          <hr class="border-slate-200/50 dark:border-slate-800/50" />

          <!-- Dynamic Variants Table -->
          <div>
            <div class="flex justify-between items-center mb-3">
              <h3 class="font-bold text-lg">Product Variants</h3>
              <button @click="addVariantRow" class="text-xs font-bold text-accent-blue bg-accent-blue/10 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-accent-blue/20">
                <PlusCircle class="w-4 h-4" /> Add Variant
              </button>
            </div>
            <div class="overflow-x-auto rounded-xl border border-slate-200/50 dark:border-slate-800/50">
              <table class="w-full text-sm text-left">
                <thead class="bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-500 uppercase">
                  <tr>
                    <th class="px-3 py-3 font-semibold">Color</th>
                    <th class="px-3 py-3 font-semibold">Size</th>
                    <th class="px-3 py-3 font-semibold">Buy (MAD)</th>
                    <th class="px-3 py-3 font-semibold">Sell (MAD)</th>
                    <th class="px-3 py-3 font-semibold">Qty</th>
                    <th class="px-3 py-3 font-semibold">SKU</th>
                    <th class="px-3 py-3 font-semibold">Barcode</th>
                    <th class="px-3 py-3 font-semibold text-center">Status</th>
                    <th class="px-3 py-3 text-center"><Trash2 class="w-4 h-4 mx-auto" /></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr v-for="(v, idx) in form.variants" :key="v.id">
                    <td class="p-2"><input v-model="v.attributes.Color" type="text" placeholder="Black" class="w-full p-2 rounded bg-transparent border border-slate-200 dark:border-slate-700 focus:border-accent-blue outline-none text-xs" /></td>
                    <td class="p-2"><input v-model="v.attributes.Size" type="text" placeholder="M" class="w-full p-2 rounded bg-transparent border border-slate-200 dark:border-slate-700 focus:border-accent-blue outline-none text-xs" /></td>
                    <td class="p-2"><input v-model.number="v.purchase_price" type="number" class="w-20 p-2 rounded bg-transparent border border-slate-200 dark:border-slate-700 focus:border-accent-blue outline-none text-xs" /></td>
                    <td class="p-2"><input v-model.number="v.selling_price" type="number" class="w-20 p-2 rounded bg-transparent border border-slate-200 dark:border-slate-700 focus:border-accent-blue outline-none text-xs font-bold text-accent-blue" /></td>
                    <td class="p-2"><input v-model.number="v.stock_quantity" type="number" class="w-16 p-2 rounded bg-transparent border border-slate-200 dark:border-slate-700 focus:border-accent-blue outline-none text-xs font-bold" /></td>
                    <td class="p-2">
                      <div class="flex gap-1 items-center">
                        <input v-model="v.sku" type="text" placeholder="AUTO" class="w-24 p-2 rounded bg-transparent border border-slate-200 dark:border-slate-700 focus:border-accent-blue outline-none text-xs font-mono" />
                        <button @click="generateSKU(v, idx)" class="text-accent-blue p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ScanLine class="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td class="p-2">
                      <div class="flex gap-1 items-center">
                        <input v-model="v.barcode" type="text" placeholder="AUTO" class="w-28 p-2 rounded bg-transparent border border-slate-200 dark:border-slate-700 focus:border-accent-blue outline-none text-xs font-mono" />
                        <button @click="generateBarcode(v)" class="text-accent-blue p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"><ScanLine class="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td class="p-2 text-center">
                      <select v-model="v.status" class="bg-transparent border border-slate-200 dark:border-slate-700 rounded text-xs p-1 outline-none">
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </td>
                    <td class="p-2 text-center">
                      <button @click="removeVariantRow(idx)" class="text-slate-400 hover:text-accent-pink p-1"><Trash2 class="w-4 h-4 mx-auto" /></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Footer / Actions -->
        <div class="p-6 border-t border-slate-200/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50 flex gap-3">
          <button @click="showModal = false" class="glass-btn-secondary flex-1">{{ t('common.cancel') }}</button>
          <button @click="save" :disabled="loading" class="glass-btn-primary flex-1">
            {{ loading ? t('products.saving') : (editingProduct ? t('products.update_product') : t('products.add_new_product')) }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
