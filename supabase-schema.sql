begin;

create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'cashier',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.brands (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  sku text,
  barcode text,
  category_id uuid references public.categories(id),
  brand_id uuid references public.brands(id),
  purchase_price numeric default 0,
  selling_price numeric default 0,
  image_url text,
  description text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references public.products(id) on delete cascade,
  sku text,
  barcode text,
  color text,
  size text,
  purchase_price numeric default 0,
  selling_price numeric default 0,
  stock_quantity integer default 0,
  min_stock integer default 5,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  address text,
  outstanding_balance numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  address text,
  outstanding_balance numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.purchases (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid references public.suppliers(id),
  total_amount numeric default 0,
  payment_status text default 'pending',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.purchase_items (
  id uuid primary key default uuid_generate_v4(),
  purchase_id uuid references public.purchases(id) on delete cascade,
  variant_id uuid references public.product_variants(id),
  quantity integer default 0,
  unit_cost numeric default 0,
  subtotal numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid references public.customers(id),
  total_amount numeric default 0,
  discount numeric default 0,
  payment_status text default 'pending',
  payment_method text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid references public.sales(id) on delete cascade,
  variant_id uuid references public.product_variants(id),
  quantity integer default 0,
  unit_price numeric default 0,
  subtotal numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  description text not null,
  amount numeric default 0,
  expense_date date default current_date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  variant_id uuid references public.product_variants(id),
  movement_type text not null,
  quantity integer default 0,
  reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  value jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_categories_name on public.categories (name);
create index if not exists idx_brands_name on public.brands (name);
create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_products_brand_id on public.products (brand_id);
create index if not exists idx_products_sku on public.products (sku);
create index if not exists idx_variants_product_id on public.product_variants (product_id);
create index if not exists idx_variants_sku on public.product_variants (sku);
create index if not exists idx_purchases_supplier_id on public.purchases (supplier_id);
create index if not exists idx_purchase_items_purchase_id on public.purchase_items (purchase_id);
create index if not exists idx_purchase_items_variant_id on public.purchase_items (variant_id);
create index if not exists idx_sales_customer_id on public.sales (customer_id);
create index if not exists idx_sale_items_sale_id on public.sale_items (sale_id);
create index if not exists idx_sale_items_variant_id on public.sale_items (variant_id);
create index if not exists idx_stock_movements_variant_id on public.stock_movements (variant_id);
create index if not exists idx_expenses_expense_date on public.expenses (expense_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (auth_user_id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'cashier')
  on conflict (email) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_set_updated_at_categories on public.categories;
create trigger trg_set_updated_at_categories
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_brands on public.brands;
create trigger trg_set_updated_at_brands
before update on public.brands
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_products on public.products;
create trigger trg_set_updated_at_products
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_product_variants on public.product_variants;
create trigger trg_set_updated_at_product_variants
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_customers on public.customers;
create trigger trg_set_updated_at_customers
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_suppliers on public.suppliers;
create trigger trg_set_updated_at_suppliers
before update on public.suppliers
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_purchases on public.purchases;
create trigger trg_set_updated_at_purchases
before update on public.purchases
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_purchase_items on public.purchase_items;
create trigger trg_set_updated_at_purchase_items
before update on public.purchase_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_sales on public.sales;
create trigger trg_set_updated_at_sales
before update on public.sales
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_sale_items on public.sale_items;
create trigger trg_set_updated_at_sale_items
before update on public.sale_items
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_expenses on public.expenses;
create trigger trg_set_updated_at_expenses
before update on public.expenses
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_stock_movements on public.stock_movements;
create trigger trg_set_updated_at_stock_movements
before update on public.stock_movements
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_settings on public.settings;
create trigger trg_set_updated_at_settings
before update on public.settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_set_updated_at_users on public.users;
create trigger trg_set_updated_at_users
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists trg_handle_new_user on auth.users;
create trigger trg_handle_new_user
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.expenses enable row level security;
alter table public.stock_movements enable row level security;
alter table public.settings enable row level security;

-- RLS policies for public tables

drop policy if exists "authenticated_read_products" on public.products;
create policy "authenticated_read_products" on public.products
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_products" on public.products;
create policy "authenticated_insert_products" on public.products
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_products" on public.products;
create policy "authenticated_update_products" on public.products
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_products" on public.products;
create policy "authenticated_delete_products" on public.products
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_categories" on public.categories;
create policy "authenticated_read_categories" on public.categories
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_categories" on public.categories;
create policy "authenticated_insert_categories" on public.categories
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_categories" on public.categories;
create policy "authenticated_update_categories" on public.categories
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_categories" on public.categories;
create policy "authenticated_delete_categories" on public.categories
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_brands" on public.brands;
create policy "authenticated_read_brands" on public.brands
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_brands" on public.brands;
create policy "authenticated_insert_brands" on public.brands
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_brands" on public.brands;
create policy "authenticated_update_brands" on public.brands
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_brands" on public.brands;
create policy "authenticated_delete_brands" on public.brands
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_product_variants" on public.product_variants;
create policy "authenticated_read_product_variants" on public.product_variants
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_product_variants" on public.product_variants;
create policy "authenticated_insert_product_variants" on public.product_variants
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_product_variants" on public.product_variants;
create policy "authenticated_update_product_variants" on public.product_variants
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_product_variants" on public.product_variants;
create policy "authenticated_delete_product_variants" on public.product_variants
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_customers" on public.customers;
create policy "authenticated_read_customers" on public.customers
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_customers" on public.customers;
create policy "authenticated_insert_customers" on public.customers
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_customers" on public.customers;
create policy "authenticated_update_customers" on public.customers
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_customers" on public.customers;
create policy "authenticated_delete_customers" on public.customers
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_suppliers" on public.suppliers;
create policy "authenticated_read_suppliers" on public.suppliers
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_suppliers" on public.suppliers;
create policy "authenticated_insert_suppliers" on public.suppliers
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_suppliers" on public.suppliers;
create policy "authenticated_update_suppliers" on public.suppliers
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_suppliers" on public.suppliers;
create policy "authenticated_delete_suppliers" on public.suppliers
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_purchases" on public.purchases;
create policy "authenticated_read_purchases" on public.purchases
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_purchases" on public.purchases;
create policy "authenticated_insert_purchases" on public.purchases
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_purchases" on public.purchases;
create policy "authenticated_update_purchases" on public.purchases
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_purchases" on public.purchases;
create policy "authenticated_delete_purchases" on public.purchases
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_purchase_items" on public.purchase_items;
create policy "authenticated_read_purchase_items" on public.purchase_items
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_purchase_items" on public.purchase_items;
create policy "authenticated_insert_purchase_items" on public.purchase_items
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_purchase_items" on public.purchase_items;
create policy "authenticated_update_purchase_items" on public.purchase_items
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_purchase_items" on public.purchase_items;
create policy "authenticated_delete_purchase_items" on public.purchase_items
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_sales" on public.sales;
create policy "authenticated_read_sales" on public.sales
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_sales" on public.sales;
create policy "authenticated_insert_sales" on public.sales
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_sales" on public.sales;
create policy "authenticated_update_sales" on public.sales
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_sales" on public.sales;
create policy "authenticated_delete_sales" on public.sales
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_sale_items" on public.sale_items;
create policy "authenticated_read_sale_items" on public.sale_items
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_sale_items" on public.sale_items;
create policy "authenticated_insert_sale_items" on public.sale_items
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_sale_items" on public.sale_items;
create policy "authenticated_update_sale_items" on public.sale_items
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_sale_items" on public.sale_items;
create policy "authenticated_delete_sale_items" on public.sale_items
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_expenses" on public.expenses;
create policy "authenticated_read_expenses" on public.expenses
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_expenses" on public.expenses;
create policy "authenticated_insert_expenses" on public.expenses
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_expenses" on public.expenses;
create policy "authenticated_update_expenses" on public.expenses
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_expenses" on public.expenses;
create policy "authenticated_delete_expenses" on public.expenses
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_stock_movements" on public.stock_movements;
create policy "authenticated_read_stock_movements" on public.stock_movements
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_stock_movements" on public.stock_movements;
create policy "authenticated_insert_stock_movements" on public.stock_movements
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_stock_movements" on public.stock_movements;
create policy "authenticated_update_stock_movements" on public.stock_movements
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_stock_movements" on public.stock_movements;
create policy "authenticated_delete_stock_movements" on public.stock_movements
for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated_read_settings" on public.settings;
create policy "authenticated_read_settings" on public.settings
for select using (auth.role() = 'authenticated');

drop policy if exists "authenticated_insert_settings" on public.settings;
create policy "authenticated_insert_settings" on public.settings
for insert with check (auth.role() = 'authenticated');

drop policy if exists "authenticated_update_settings" on public.settings;
create policy "authenticated_update_settings" on public.settings
for update using (auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_settings" on public.settings;
create policy "authenticated_delete_settings" on public.settings
for delete using (auth.role() = 'authenticated');

-- Storage policies for product image uploads

drop policy if exists "authenticated_read_product_images" on storage.objects;
create policy "authenticated_read_product_images" on storage.objects
for select using (bucket_id = 'product-images');

drop policy if exists "authenticated_insert_product_images" on storage.objects;
create policy "authenticated_insert_product_images" on storage.objects
for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "authenticated_update_product_images" on storage.objects;
create policy "authenticated_update_product_images" on storage.objects
for update using (bucket_id = 'product-images' and auth.role() = 'authenticated');

drop policy if exists "authenticated_delete_product_images" on storage.objects;
create policy "authenticated_delete_product_images" on storage.objects
for delete using (bucket_id = 'product-images' and auth.role() = 'authenticated');

commit;
