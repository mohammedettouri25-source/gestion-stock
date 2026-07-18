import { defineStore } from 'pinia';
import { db } from '../services/db';
import { syncEngine } from '../services/syncEngine';
import { useProductStore } from './products';

export const useOrderStore = defineStore('orders', {
  state: () => ({
    cart: [], // now stores variants with product info embedded
    discount: 0,
    deliveryFee: 0,
    deposit: 0,
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    customer: null,
    deliveryCompany: '',
    deliveryStatus: 'pending',
    ordersList: [],
    loading: false
  }),
  getters: {
    cartSubtotal: (state) => state.cart.reduce((acc, item) => acc + (item.selling_price * item.quantity), 0),
    cartTotal: (state) => {
      const subtotal = state.cartSubtotal;
      return Math.max(0, subtotal - state.discount + state.deliveryFee);
    },
    remainingBalance: (state) => {
      return Math.max(0, state.cartTotal - state.deposit);
    }
  },
  actions: {
    addToCart(product, variant, qty = 1) {
      const existingItem = this.cart.find(item => item.variant_id === variant.id);

      if (existingItem) {
        if (existingItem.quantity + qty > variant.stock_quantity) {
           throw new Error('Cannot add more than available stock.');
        }
        existingItem.quantity += qty;
      } else {
        if (qty > variant.stock_quantity) {
           throw new Error('Cannot add more than available stock.');
        }
        this.cart.push({
          product_id: product.id,
          variant_id: variant.id,
          name: product.name,
          sku: variant.sku,
          attributes: variant.attributes, // { Color: 'x', Size: 'y' }
          selling_price: variant.selling_price,
          purchase_price: variant.purchase_price,
          quantity: qty,
          max_stock: variant.stock_quantity
        });
      }
    },

    removeFromCart(index) {
      this.cart.splice(index, 1);
    },

    updateQuantity(index, quantity) {
      if (quantity <= 0) {
        this.removeFromCart(index);
      } else {
        const item = this.cart[index];
        if (quantity > item.max_stock) {
           throw new Error('Cannot exceed available stock.');
        }
        this.cart[index].quantity = quantity;
      }
    },

    clearCart() {
      this.cart = [];
      this.discount = 0;
      this.deliveryFee = 0;
      this.deposit = 0;
      this.paymentMethod = 'cash';
      this.paymentStatus = 'paid';
      this.customer = null;
      this.deliveryCompany = '';
      this.deliveryStatus = 'pending';
    },

    async checkout() {
      if (this.cart.length === 0) throw new Error('Cart is empty');

      const productStore = useProductStore();
      const orderId = 'ord-' + crypto.randomUUID();
      const timestamp = new Date().toISOString();

      const orderData = {
        id: orderId,
        customer_id: this.customer?.id || 'cust-walkin',
        customer_name: this.customer?.name || 'Walk-in Customer',
        subtotal: this.cartSubtotal,
        discount: this.discount,
        delivery_fee: this.deliveryFee,
        total_amount: this.cartTotal,
        deposit_amount: this.deposit,
        remaining_amount: this.remainingBalance,
        payment_status: this.paymentStatus,
        payment_method: this.paymentMethod,
        date: timestamp,
        updated_at: timestamp,
        items: this.cart.map(item => ({
          product_id: item.product_id,
          variant_id: item.variant_id,
          name: item.name,
          sku: item.sku,
          attributes: item.attributes,
          quantity: item.quantity,
          selling_price: item.selling_price,
          purchase_price: item.purchase_price
        }))
      };

      if (this.deliveryFee > 0 || this.deliveryCompany) {
        orderData.delivery = {
          id: 'del-' + crypto.randomUUID(),
          company: this.deliveryCompany || 'Standard Delivery',
          fee: this.deliveryFee,
          status: this.deliveryStatus,
          tracking_number: 'TRK-' + Math.floor(100000 + Math.random() * 900000),
          updated_at: timestamp
        };
      }

      // Deep-clone to strip Vue Proxy objects before IndexedDB storage
      // (structured clone algorithm cannot handle Proxy wrappers)
      const cleanOrderData = JSON.parse(JSON.stringify(orderData));
      await db.orders.put(cleanOrderData);

      // Decrement stock for variants
      for (const item of this.cart) {
        await productStore.adjustStock(
          item.variant_id,
          item.quantity,
          'out',
          `Order Checkout ${orderId}`
        );
      }

      if (this.customer && this.customer.id !== 'cust-walkin' && this.remainingBalance > 0) {
        const custRecord = await db.customers.get(this.customer.id);
        if (custRecord) {
          custRecord.outstanding_balance += this.remainingBalance;
          custRecord.updated_at = timestamp;
          await db.customers.put(custRecord);
          await syncEngine.queueOperation('customers', 'update', custRecord);
        }
      }

      await syncEngine.queueOperation('orders', 'create', cleanOrderData);

      this.clearCart();
      return cleanOrderData;
    },

    async loadOrders() {
      this.loading = true;
      try {
        this.ordersList = await db.orders.toArray();
      } catch (e) {
        console.error('Failed to load orders:', e);
      } finally {
        this.loading = false;
      }
    }
  }
});
