import { defineStore } from 'pinia';
import { db } from '../services/db';
import { syncEngine } from '../services/syncEngine';

export const useProductStore = defineStore('products', {
  state: () => ({
    products: [],
    variants: [],
    categories: [],
    brands: [],
    loading: false,
    error: null
  }),
  getters: {
    lowStockVariants: (state) => state.variants.filter(v => v.stock_quantity <= (v.min_stock || 5)),
    totalInventoryValuation: (state) => state.variants.reduce((acc, v) => acc + (v.purchase_price * v.stock_quantity), 0),
    totalSellingValuation: (state) => state.variants.reduce((acc, v) => acc + (v.selling_price * v.stock_quantity), 0),
    totalPotentialProfit: (state) => state.variants.reduce((acc, v) => acc + ((v.selling_price - v.purchase_price) * v.stock_quantity), 0)
  },
  actions: {
    async loadAll() {
      this.loading = true;
      try {
        this.products = await db.products.toArray();
        this.variants = await db.product_variants.toArray();
        this.categories = await db.categories.toArray();
        this.brands = await db.brands.toArray();
      } catch (e) {
        this.error = e.message;
        console.error('Failed to load products from IndexedDB:', e);
      } finally {
        this.loading = false;
      }
    },

    async saveProduct(product, variants) {
      const isNew = !product.id;
      const cleanProduct = JSON.parse(JSON.stringify(product));
      
      const finalProduct = {
        ...cleanProduct,
        id: isNew ? 'local-' + crypto.randomUUID() : cleanProduct.id,
        updated_at: new Date().toISOString()
      };

      await db.products.put(finalProduct);
      await syncEngine.queueOperation('products', isNew ? 'create' : 'update', finalProduct);

      // Save variants
      for (const v of variants) {
        const isNewVariant = !v.id || v.id.startsWith('new-');
        const finalVariant = {
          ...JSON.parse(JSON.stringify(v)),
          product_id: finalProduct.id,
          id: isNewVariant ? 'var-' + crypto.randomUUID() : v.id,
          updated_at: new Date().toISOString()
        };
        await db.product_variants.put(finalVariant);
        await syncEngine.queueOperation('product_variants', isNewVariant ? 'create' : 'update', finalVariant);
      }

      await this.loadAll();
      return finalProduct;
    },

    async deleteProduct(id) {
      await db.products.delete(id);
      await syncEngine.queueOperation('products', 'delete', { id });

      // Delete associated variants
      const associatedVariants = await db.product_variants.where('product_id').equals(id).toArray();
      for (const v of associatedVariants) {
        await db.product_variants.delete(v.id);
        await syncEngine.queueOperation('product_variants', 'delete', { id: v.id });
      }

      await this.loadAll();
    },

    async deleteVariant(id) {
      await db.product_variants.delete(id);
      await syncEngine.queueOperation('product_variants', 'delete', { id });
      await this.loadAll();
    },

    async adjustStock(variantId, quantity, type, reason) {
      const variant = await db.product_variants.get(variantId);
      if (!variant) throw new Error('Variant not found');

      const qtyChange = Number(quantity);
      let newStock = variant.stock_quantity;
      if (type === 'in') newStock += qtyChange;
      else if (type === 'out') newStock -= qtyChange;
      else if (type === 'adjust') newStock = qtyChange;

      variant.stock_quantity = newStock;
      variant.updated_at = new Date().toISOString();
      // Deep-clone to strip Vue Proxy before IndexedDB storage
      const cleanVariant = JSON.parse(JSON.stringify(variant));
      await db.product_variants.put(cleanVariant);

      const movement = {
        id: 'mvmt-' + crypto.randomUUID(),
        variant_id: variantId,
        quantity: qtyChange,
        type,
        reason,
        date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.stock_movements.put(movement);

      await syncEngine.queueOperation('stock_movements', 'create', movement);
      await syncEngine.queueOperation('product_variants', 'update', cleanVariant);

      await this.loadAll();
    }
  }
});
