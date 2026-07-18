import Dexie from 'dexie';

export const db = new Dexie('GStockLocalDB');

// Version 2: Shift to Variant-based architecture
db.version(2).stores({
  products: 'id, name, category_id, brand_id, updated_at',
  product_variants: 'id, product_id, sku, barcode, updated_at', // other attributes can be unindexed JSON
  categories: 'id, name, updated_at',
  brands: 'id, name, updated_at',
  customers: 'id, name, phone, outstanding_balance, updated_at',
  suppliers: 'id, name, outstanding_balance, updated_at',
  orders: 'id, customer_id, payment_status, delivery_status, sync_status, updated_at',
  expenses: 'id, category_id, amount, date, sync_status, updated_at',
  stock_movements: 'id, variant_id, type, date, sync_status, updated_at', // changed product_id to variant_id
  sync_queue: '++id, table, action, timestamp'
});

// Seed default data helper if database is empty
export async function seedLocalDB() {
  const productCount = await db.products.count();
  if (productCount === 0) {
    // Basic taxonomy
    await db.categories.bulkAdd([
      { id: 1, name: 'Hoodies', updated_at: new Date().toISOString() },
      { id: 2, name: 'T-Shirts', updated_at: new Date().toISOString() },
      { id: 3, name: 'Pants', updated_at: new Date().toISOString() },
      { id: 4, name: 'Sneakers', updated_at: new Date().toISOString() }
    ]);

    await db.brands.bulkAdd([
      { id: 1, name: 'Nike', updated_at: new Date().toISOString() },
      { id: 2, name: 'Adidas', updated_at: new Date().toISOString() },
      { id: 3, name: 'Puma', updated_at: new Date().toISOString() }
    ]);

    // Parent products
    await db.products.bulkAdd([
      {
        id: 'prod-1',
        name: 'Tech Fleece Hoodie',
        category_id: 1,
        brand_id: 1,
        images: [],
        updated_at: new Date().toISOString()
      },
      {
        id: 'prod-2',
        name: 'Essentials Tee',
        category_id: 2,
        brand_id: 2,
        images: [],
        updated_at: new Date().toISOString()
      },
      {
        id: 'prod-3',
        name: 'Cargo Joggers',
        category_id: 3,
        brand_id: 1,
        images: [],
        updated_at: new Date().toISOString()
      }
    ]);

    // Product Variants (Scalable attribute object)
    await db.product_variants.bulkAdd([
      // Prod 1 Variants
      {
        id: 'var-1-black-m',
        product_id: 'prod-1',
        sku: 'HOOD-TECH-BLK-M',
        barcode: '1900210011001',
        purchase_price: 450,
        selling_price: 850,
        stock_quantity: 10,
        min_stock: 5,
        attributes: { Color: 'Black', Size: 'M' },
        status: 'Active',
        updated_at: new Date().toISOString()
      },
      {
        id: 'var-1-black-l',
        product_id: 'prod-1',
        sku: 'HOOD-TECH-BLK-L',
        barcode: '1900210011002',
        purchase_price: 450,
        selling_price: 850,
        stock_quantity: 15,
        min_stock: 5,
        attributes: { Color: 'Black', Size: 'L' },
        status: 'Active',
        updated_at: new Date().toISOString()
      },
      {
        id: 'var-1-grey-m',
        product_id: 'prod-1',
        sku: 'HOOD-TECH-GRY-M',
        barcode: '1900210011003',
        purchase_price: 450,
        selling_price: 850,
        stock_quantity: 20,
        min_stock: 5,
        attributes: { Color: 'Grey', Size: 'M' },
        status: 'Active',
        updated_at: new Date().toISOString()
      },
      // Prod 2 Variants
      {
        id: 'var-2-wht-s',
        product_id: 'prod-2',
        sku: 'TEE-ESS-WHT-S',
        barcode: '1900210022001',
        purchase_price: 150,
        selling_price: 350,
        stock_quantity: 50,
        min_stock: 10,
        attributes: { Color: 'White', Size: 'S' },
        status: 'Active',
        updated_at: new Date().toISOString()
      },
      {
        id: 'var-2-blk-l',
        product_id: 'prod-2',
        sku: 'TEE-ESS-BLK-L',
        barcode: '1900210022002',
        purchase_price: 150,
        selling_price: 350,
        stock_quantity: 70,
        min_stock: 10,
        attributes: { Color: 'Black', Size: 'L' },
        status: 'Active',
        updated_at: new Date().toISOString()
      },
      // Prod 3 Variants
      {
        id: 'var-3-kha-32',
        product_id: 'prod-3',
        sku: 'PNT-CARG-KHA-32',
        barcode: '1900210033001',
        purchase_price: 250,
        selling_price: 550,
        stock_quantity: 30,
        min_stock: 8,
        attributes: { Color: 'Khaki', Size: '32' },
        status: 'Active',
        updated_at: new Date().toISOString()
      }
    ]);

    await db.customers.bulkAdd([
      { id: 'cust-walkin', name: 'Walk-in Customer', phone: '', email: '', outstanding_balance: 0, updated_at: new Date().toISOString() },
      { id: 'cust-1', name: 'Hamza El-Alami', phone: '0612345678', email: 'hamza@gmail.com', outstanding_balance: 1200, updated_at: new Date().toISOString() },
      { id: 'cust-2', name: 'Sara Bennani', phone: '0698765432', email: 'sara@bennani.ma', outstanding_balance: 0, updated_at: new Date().toISOString() }
    ]);
  }
}
