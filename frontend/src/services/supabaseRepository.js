import { supabase } from './supabaseClient';
import { db } from './db';

const TABLES = {
  categories: 'categories',
  brands: 'brands',
  products: 'products',
  product_variants: 'product_variants',
  customers: 'customers',
  suppliers: 'suppliers',
  purchases: 'purchases',
  purchase_items: 'purchase_items',
  sales: 'sales',
  sale_items: 'sale_items',
  expenses: 'expenses',
  stock_movements: 'stock_movements',
  settings: 'settings'
};

function mapRecord(record) {
  if (!record) return null;
  return { ...record, updated_at: record.updated_at || new Date().toISOString() };
}

async function getAll(tableName) {
  if (!supabase) return [];
  const { data, error } = await supabase.from(TABLES[tableName]).select('*');
  if (error) throw error;
  return (data || []).map(mapRecord);
}

async function upsert(tableName, payload) {
  if (!supabase) throw new Error('Supabase is not configured');
  const record = { ...payload, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from(TABLES[tableName]).upsert(record, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return mapRecord(data);
}

async function remove(tableName, id) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.from(TABLES[tableName]).delete().eq('id', id);
  if (error) throw error;
}

async function hydrateLocalFromSupabase() {
  const tables = ['categories', 'brands', 'products', 'product_variants', 'customers', 'suppliers', 'expenses', 'stock_movements'];
  for (const table of tables) {
    const records = await getAll(table);
    if (records.length) {
      await db[table].clear();
      await db[table].bulkPut(records);
    }
  }
}

export const supabaseRepository = {
  getAll,
  upsert,
  remove,
  hydrateLocalFromSupabase
};
