<script setup>
import { ref, onMounted, computed } from 'vue';
import { useProductStore } from '../stores/products';
import { useOrderStore } from '../stores/orders';
import { db } from '../services/db';
import { useI18n } from 'vue-i18n';
import { 
  Search, ScanLine, ShoppingCart, User, Plus, 
  Trash2, Receipt, Phone, FileDown, CheckCircle2, X, Printer
} from 'lucide-vue-next';

const productStore = useProductStore();
const orderStore = useOrderStore();
const { t } = useI18n();

const searchQuery = ref('');
const barcodeQuery = ref('');
const selectedCategory = ref('');
const showReceiptModal = ref(false);
const receiptOrder = ref(null);

const showAddCustomerModal = ref(false);
const newCustomerName = ref('');
const newCustomerPhone = ref('');

// Variant Modal State
const showVariantModal = ref(false);
const selectedProduct = ref(null);
const selectedColor = ref('');
const selectedSize = ref('');
const qtyToAdd = ref(1);

onMounted(async () => {
  await productStore.loadAll();
  await loadCustomers();
});

const productsWithStats = computed(() => {
  return productStore.products.map(p => {
    const pVars = productStore.variants.filter(v => v.product_id === p.id);
    const totalStock = pVars.reduce((acc, v) => acc + v.stock_quantity, 0);
    const sellPrices = pVars.map(v => v.selling_price);
    const minSell = Math.min(...(sellPrices.length ? sellPrices : [0]));
    return { ...p, totalStock, minSell };
  });
});

const filteredProducts = computed(() => {
  return productsWithStats.value.filter(p => {
    const pVars = productStore.variants.filter(v => v.product_id === p.id);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                          pVars.some(v => v.sku.toLowerCase().includes(searchQuery.value.toLowerCase()) || v.barcode.includes(searchQuery.value));
    const matchesCat = !selectedCategory.value || p.category_id === Number(selectedCategory.value);
    return matchesSearch && matchesCat;
  });
});

const customersList = ref([]);
const loadCustomers = async () => {
  customersList.value = await db.customers.toArray();
};

const handleBarcodeScan = () => {
  if (!barcodeQuery.value) return;
  const variant = productStore.variants.find(v => v.barcode === barcodeQuery.value || v.sku === barcodeQuery.value);
  if (variant) {
    const product = productStore.products.find(p => p.id === variant.product_id);
    if (product) {
       try {
         orderStore.addToCart(product, variant, 1);
       } catch (e) {
         alert(e.message);
       }
    }
    barcodeQuery.value = '';
  } else {
    alert('Variant not found with this barcode.');
  }
};

const handleCheckout = async () => {
  try {
    const createdOrder = await orderStore.checkout();
    receiptOrder.value = createdOrder;
    showReceiptModal.value = true;
  } catch (e) {
    alert(e.message);
  }
};

const createCustomer = async () => {
  if (!newCustomerName.value) return;
  const newCust = {
    id: 'cust-' + crypto.randomUUID(),
    name: newCustomerName.value,
    phone: newCustomerPhone.value,
    email: '',
    outstanding_balance: 0,
    updated_at: new Date().toISOString()
  };
  await db.customers.put(newCust);
  await loadCustomers();
  orderStore.customer = newCust;
  showAddCustomerModal.value = false;
  newCustomerName.value = '';
  newCustomerPhone.value = '';
};

// Variant Selection Logic
const productVariants = computed(() => {
  if (!selectedProduct.value) return [];
  return productStore.variants.filter(v => v.product_id === selectedProduct.value.id && v.status !== 'Inactive');
});

const availableColors = computed(() => {
  const colors = productVariants.value.map(v => v.attributes.Color).filter(Boolean);
  return [...new Set(colors)];
});

const availableSizes = computed(() => {
  const vars = productVariants.value.filter(v => v.attributes.Color === selectedColor.value);
  return [...new Set(vars.map(v => v.attributes.Size).filter(Boolean))];
});

const targetVariant = computed(() => {
  return productVariants.value.find(v => v.attributes.Color === selectedColor.value && v.attributes.Size === selectedSize.value);
});

function openVariantSelection(product) {
  selectedProduct.value = product;
  selectedColor.value = '';
  selectedSize.value = '';
  qtyToAdd.value = 1;
  showVariantModal.value = true;
}

function confirmVariantSelection() {
  if (!targetVariant.value) {
    alert('Please select a valid variant.');
    return;
  }
  if (qtyToAdd.value > targetVariant.value.stock_quantity) {
    alert(`Only ${targetVariant.value.stock_quantity} available in stock.`);
    return;
  }
  try {
    orderStore.addToCart(selectedProduct.value, targetVariant.value, qtyToAdd.value);
    showVariantModal.value = false;
  } catch(e) {
    alert(e.message);
  }
}

const whatsappLink = computed(() => {
  if (!receiptOrder.value || !receiptOrder.value.customer_id) return '#';
  const phoneNum = receiptOrder.value.customer_id !== 'cust-walkin' ? orderStore.customer?.phone : '';
  if (!phoneNum) return '#';
  const text = encodeURIComponent(
    `Hello ${receiptOrder.value.customer_name},\n` +
    `Thank you for your purchase at G-Stock. Here are your order details:\n` +
    `Order ID: ${receiptOrder.value.id}\n` +
    `Total Amount: ${receiptOrder.value.total_amount} MAD\n` +
    `We appreciate your business!`
  );
  return `https://wa.me/${phoneNum.replace(/[^0-9]/g, '')}?text=${text}`;
});

const printInvoice = () => {
  if (!receiptOrder.value) return;
  const order = receiptOrder.value;
  
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  
  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong><br>
        <small style="color: #666;">${item.attributes?.Color || ''} ${item.attributes?.Size || ''}</small>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${Number(item.selling_price).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${(item.quantity * item.selling_price).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice - ${order.id}</title>
        <style>
          body { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #f1f5f9; }
          .header h1 { margin: 0 0 5px 0; font-size: 28px; color: #0f172a; }
          .header p { margin: 0; color: #64748b; }
          .info-table { width: 100%; margin-bottom: 30px; }
          .info-table td { padding: 5px 0; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .items-table th { background: #f8fafc; padding: 12px 10px; text-align: left; border-bottom: 2px solid #e2e8f0; color: #475569; font-size: 13px; text-transform: uppercase; }
          .totals { width: 350px; float: right; }
          .totals table { width: 100%; border-collapse: collapse; }
          .totals td { padding: 10px; border-bottom: 1px solid #f1f5f9; color: #475569; }
          .totals .val { text-align: right; font-weight: 600; color: #0f172a; }
          .totals .grand-total { font-weight: bold; font-size: 1.2em; border-bottom: none; border-top: 2px solid #cbd5e1; }
          .totals .grand-total td { color: #0f172a; padding-top: 15px; }
          @media print {
            body { -webkit-print-color-adjust: exact; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>INVOICE</h1>
          <p>G-Stock Premium</p>
        </div>
        
        <table class="info-table">
          <tr>
            <td><strong style="color:#64748b; font-size:12px; text-transform:uppercase;">Invoice No</strong><br>${order.id.substring(0,8).toUpperCase()}</td>
            <td style="text-align: right;"><strong style="color:#64748b; font-size:12px; text-transform:uppercase;">Date</strong><br>${new Date(order.date).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding-top:15px;"><strong style="color:#64748b; font-size:12px; text-transform:uppercase;">Billed To</strong><br>${order.customer_name}</td>
            <td style="text-align: right; padding-top:15px;"><strong style="color:#64748b; font-size:12px; text-transform:uppercase;">Payment Method</strong><br><span style="text-transform:capitalize">${order.payment_method.replace('_',' ')}</span></td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr>
              <th>Item Description</th>
              <th>Qty</th>
              <th>Price</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <table>
            <tr>
              <td>Subtotal</td>
              <td class="val">${Number(order.subtotal).toFixed(2)} MAD</td>
            </tr>
            <tr>
              <td>Discount</td>
              <td class="val">${Number(order.discount).toFixed(2)} MAD</td>
            </tr>
            <tr>
              <td>Delivery Fee</td>
              <td class="val">${Number(order.delivery_fee).toFixed(2)} MAD</td>
            </tr>
            <tr class="grand-total">
              <td>Total</td>
              <td class="val">${Number(order.total_amount).toFixed(2)} MAD</td>
            </tr>
          </table>
        </div>
        <div style="clear: both;"></div>
        
        <div style="text-align: center; margin-top: 80px; color: #94a3b8; font-size: 0.9em; border-top: 1px dashed #e2e8f0; padding-top: 20px;">
          Thank you for your business!
        </div>
      </body>
    </html>
  `;
  
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  
  setTimeout(() => {
    printWindow.print();
  }, 300);
};
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[calc(100vh-8rem)]">
    
    <div class="lg:col-span-7 flex flex-col space-y-6">
      
      <div class="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div class="md:col-span-7 relative">
          <Search class="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            v-model="searchQuery"
            :placeholder="t('pos.search_placeholder')"
            class="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue text-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>

        <div class="md:col-span-5 relative">
          <ScanLine class="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            v-model="barcodeQuery"
            @keyup.enter="handleBarcodeScan"
            placeholder="Scan Barcode/SKU & Enter"
            class="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue text-sm transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
          />
        </div>
      </div>

      <div class="flex gap-2 overflow-x-auto pb-2">
        <button 
          @click="selectedCategory = ''"
          class="px-4 py-2 text-xs font-semibold rounded-full transition-all"
          :class="!selectedCategory ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'"
        >
          {{ t('pos.all_clothes') }}
        </button>
        <button 
          v-for="cat in productStore.categories"
          :key="cat.id"
          @click="selectedCategory = cat.id"
          class="px-4 py-2 text-xs font-semibold rounded-full transition-all whitespace-nowrap"
          :class="selectedCategory === cat.id ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'"
        >
          {{ cat.name }}
        </button>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[calc(100vh-22rem)] pr-1">
        <div 
          v-for="p in filteredProducts" 
          :key="p.id"
          @click="openVariantSelection(p)"
          class="glass-card p-4 hover:shadow-lg hover:border-accent-blue/30 active:scale-[0.98] transition-all cursor-pointer flex flex-col justify-between"
        >
          <div class="space-y-2">
            <div class="w-full h-24 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-450 border border-slate-200/50 dark:border-slate-700/50 font-bold uppercase">
              👕
            </div>
            <div>
              <h4 class="text-xs font-bold truncate">{{ p.name }}</h4>
            </div>
          </div>

          <div class="mt-4 flex items-center justify-between">
            <span class="text-xs font-bold text-accent-blue">{{ p.minSell }} MAD+</span>
            <span 
              class="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
            >
              {{ p.totalStock }} pcs
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Right column Cart -->
    <div class="lg:col-span-5 flex flex-col">
      <div class="glass-panel p-6 flex flex-col h-full justify-between space-y-6">
        
        <div class="space-y-4">
          <div class="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 pb-3">
            <h3 class="font-bold text-lg flex items-center gap-2">
              <ShoppingCart class="w-5 h-5 text-accent-blue" />
              <span>{{ t('pos.checkout_cart') }}</span>
            </h3>
            <button @click="orderStore.clearCart" class="text-xs text-slate-400 hover:text-accent-pink font-semibold">{{ t('pos.clear') }}</button>
          </div>

          <div class="overflow-y-auto max-h-[250px] space-y-3 pr-1">
            <div 
              v-for="(item, index) in orderStore.cart" 
              :key="index"
              class="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-850"
            >
              <div class="space-y-0.5 overflow-hidden flex-1">
                <h4 class="text-xs font-semibold truncate">{{ item.name }}</h4>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                  <span v-if="item.attributes?.Color" class="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold uppercase">{{ item.attributes.Color }}</span>
                  <span v-if="item.attributes?.Size" class="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold uppercase">{{ item.attributes.Size }}</span>
                </div>
              </div>

              <div class="flex items-center gap-4">
                <div class="flex items-center gap-1.5 bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                  <button @click="orderStore.updateQuantity(index, item.quantity - 1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded">-</button>
                  <span class="text-xs font-bold px-1">{{ item.quantity }}</span>
                  <button @click="orderStore.updateQuantity(index, item.quantity + 1)" class="w-6 h-6 flex items-center justify-center text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded">+</button>
                </div>
                <div class="text-right w-16">
                  <span class="text-xs font-bold">{{ (item.selling_price * item.quantity).toLocaleString() }}</span>
                </div>
                <button @click="orderStore.removeFromCart(index)" class="text-slate-400 hover:text-accent-pink">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>

            <div v-if="orderStore.cart.length === 0" class="py-12 text-center text-slate-400 text-xs">
              {{ t('pos.add_products_prompt') }}
            </div>
          </div>
        </div>

        <div class="space-y-4 border-t border-slate-200/50 dark:border-slate-800/50 pt-4">
          <div class="grid grid-cols-12 gap-2 items-center">
            <div class="col-span-10 relative">
              <User class="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <select v-model="orderStore.customer" class="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-1 focus:ring-accent-blue">
                <option :value="null">{{ t('pos.walk_in_guest') }}</option>
                <option v-for="c in customersList" :key="c.id" :value="c">{{ c.name }}</option>
              </select>
            </div>
            <button @click="showAddCustomerModal = true" class="col-span-2 h-[38px] rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center text-accent-blue hover:bg-slate-50 dark:hover:bg-slate-900/50">
              <Plus class="w-4 h-4" />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase">{{ t('pos.discount_mad') }}</label>
              <input type="number" v-model.number="orderStore.discount" min="0" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-1 focus:ring-accent-blue" />
            </div>
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase">{{ t('pos.delivery_fee_mad') }}</label>
              <input type="number" v-model.number="orderStore.deliveryFee" min="0" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-1 focus:ring-accent-blue" />
            </div>
          </div>
        </div>

        <div class="space-y-4 border-t border-slate-200/50 dark:border-slate-800/50 pt-4">
          <div class="space-y-2">
            <div class="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>{{ t('pos.subtotal') }}</span>
              <span>{{ orderStore.cartSubtotal.toLocaleString() }} MAD</span>
            </div>
            <div class="flex items-center justify-between text-base font-bold">
              <span>{{ t('pos.grand_total') }}</span>
              <span class="text-accent-blue">{{ orderStore.cartTotal.toLocaleString() }} MAD</span>
            </div>
          </div>

          <button @click="handleCheckout" :disabled="orderStore.cart.length === 0" class="w-full py-4 rounded-2xl bg-accent-blue text-white font-bold transition-all flex items-center justify-center gap-2 hover:bg-opacity-95 disabled:opacity-50 shadow-lg shadow-accent-blue/20">
            <span>{{ t('pos.proceed_to_purchase') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Variant Selection Modal -->
    <div v-if="showVariantModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-md p-6 relative flex flex-col max-h-[90vh]">
        <button @click="showVariantModal = false" class="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X class="w-5 h-5" />
        </button>
        <h3 class="font-bold text-xl mb-1">{{ selectedProduct?.name }}</h3>
        <p class="text-xs text-slate-500 mb-6">Select a variant to add to cart</p>

        <div class="space-y-5 overflow-y-auto">
          <!-- Colors -->
          <div class="space-y-2">
            <label class="text-[10px] font-bold text-slate-400 uppercase">Select Color</label>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="c in availableColors" :key="c" 
                @click="selectedColor = c; selectedSize = ''"
                class="px-4 py-2 text-xs font-bold rounded-xl border transition-all"
                :class="selectedColor === c ? 'bg-accent-blue text-white border-accent-blue' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent-blue'"
              >
                {{ c }}
              </button>
            </div>
          </div>

          <!-- Sizes -->
          <div class="space-y-2" v-if="selectedColor">
            <label class="text-[10px] font-bold text-slate-400 uppercase">Select Size</label>
            <div class="flex flex-wrap gap-2">
              <button 
                v-for="s in availableSizes" :key="s" 
                @click="selectedSize = s"
                class="px-4 py-2 text-xs font-bold rounded-xl border transition-all"
                :class="selectedSize === s ? 'bg-accent-blue text-white border-accent-blue' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-accent-blue'"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <!-- Quantity & Stock Info -->
          <div v-if="targetVariant" class="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-4">
            <div class="flex justify-between items-center">
              <span class="text-sm font-bold text-accent-blue">{{ targetVariant.selling_price }} MAD</span>
              <span class="text-xs font-bold" :class="targetVariant.stock_quantity > 0 ? 'text-accent-green' : 'text-accent-pink'">
                {{ targetVariant.stock_quantity }} Available
              </span>
            </div>
            
            <div class="space-y-1">
              <label class="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>
              <input type="number" v-model.number="qtyToAdd" min="1" :max="targetVariant.stock_quantity" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50" />
            </div>
          </div>
        </div>

        <div class="mt-6">
          <button 
            @click="confirmVariantSelection" 
            :disabled="!targetVariant || targetVariant.stock_quantity === 0"
            class="w-full py-3 rounded-xl bg-accent-blue text-white font-bold disabled:opacity-50 disabled:pointer-events-none"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Add Customer Modal -->
    <div v-if="showAddCustomerModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="glass-panel w-full max-w-sm p-6 space-y-4 relative">
        <button @click="showAddCustomerModal = false" class="absolute right-4 top-4 text-slate-400 hover:text-slate-600"><X class="w-5 h-5" /></button>
        <h3 class="font-bold text-lg">{{ t('pos.add_new_customer') }}</h3>
        <div class="space-y-3">
          <input type="text" v-model="newCustomerName" placeholder="Name" class="glass-input text-xs" />
          <input type="text" v-model="newCustomerPhone" placeholder="Phone" class="glass-input text-xs" />
          <button @click="createCustomer" class="w-full glass-btn-primary text-xs py-2.5">Add Customer</button>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <div v-if="showReceiptModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div class="bg-white text-slate-900 rounded-3xl p-6 shadow-2xl w-full max-w-md space-y-6">
        <div class="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-100">
          <CheckCircle2 class="w-12 h-12 text-accent-green animate-bounce" />
          <h3 class="text-xl font-bold">{{ t('pos.checkout_successful') }}</h3>
          <p class="text-xs text-slate-400">ID: {{ receiptOrder?.id }}</p>
        </div>
        
        <div class="grid grid-cols-2 gap-3">
          <button @click="printInvoice" class="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-2 transition-colors">
            <Printer class="w-4 h-4" /> Print Invoice
          </button>
          <button @click="showReceiptModal = false" class="w-full py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors">
            {{ t('pos.close_new_order') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
