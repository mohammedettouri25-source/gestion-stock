const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'gstock-super-secret-key-999';

// Middleware
app.use(cors());
app.use(express.json());

// Helper to generate UUIDs
function generateUuid(prefix = '') {
  const hex = '0123456789abcdef';
  let uuid = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += '-';
    } else if (i === 14) {
      uuid += '4';
    } else {
      uuid += hex[Math.floor(Math.random() * 16)];
    }
  }
  return prefix ? `${prefix}-${uuid}` : uuid;
}

// Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Unauthenticated.' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }
    
    // Find user in DB
    const user = db.queryOne('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    
    // Remove password hash from req.user
    const { password, ...cleanUser } = user;
    req.user = cleanUser;
    next();
  });
}

// ==========================================
// 1. AUTHENTICATION ROUTES
// ==========================================

// POST /api/v1/auth/login
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const user = db.queryOne('SELECT * FROM users WHERE email = ?', [email]);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ success: false, message: 'The provided credentials are incorrect.' });
  }

  // Create JWT token
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

  // Remove password from response
  const { password: _, ...cleanUser } = user;

  return res.json({
    success: true,
    message: 'Logged in successfully',
    data: {
      user: cleanUser,
      token: token
    }
  });
});

// POST /api/v1/auth/logout
app.post('/api/v1/auth/logout', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// GET /api/v1/auth/profile
app.get('/api/v1/auth/profile', authenticateToken, (req, res) => {
  return res.json({
    success: true,
    data: req.user
  });
});

// ==========================================
// 2. PRODUCT ROUTES
// ==========================================

// GET /api/v1/products
app.get('/api/v1/products', authenticateToken, (req, res) => {
  const products = db.query('SELECT * FROM products');
  // Parse JSON strings for sizes and colors
  const parsedProducts = products.map(p => ({
    ...p,
    sizes: p.sizes ? JSON.parse(p.sizes) : [],
    colors: p.colors ? JSON.parse(p.colors) : []
  }));
  return res.json({ success: true, data: parsedProducts });
});

// POST /api/v1/products
app.post('/api/v1/products', authenticateToken, (req, res) => {
  const { id, name, sku, barcode, purchase_price, selling_price, current_stock, min_stock, category_id, brand_id, sizes, colors } = req.body;
  
  if (!id || !name || !sku || !barcode || purchase_price === undefined || selling_price === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required product fields.' });
  }

  try {
    db.run(
      `INSERT INTO products (id, name, sku, barcode, purchase_price, selling_price, current_stock, min_stock, category_id, brand_id, sizes, colors, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        id, name, sku, barcode, purchase_price, selling_price, 
        current_stock || 0, min_stock || 5, category_id || null, brand_id || null,
        sizes ? JSON.stringify(sizes) : null,
        colors ? JSON.stringify(colors) : null
      ]
    );

    const product = db.queryOne('SELECT * FROM products WHERE id = ?', [id]);
    return res.status(211).json({
      success: true,
      message: 'Product created successfully',
      data: {
        ...product,
        sizes: product.sizes ? JSON.parse(product.sizes) : [],
        colors: product.colors ? JSON.parse(product.colors) : []
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/products/:id
app.get('/api/v1/products/:id', authenticateToken, (req, res) => {
  const product = db.queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }
  return res.json({
    success: true,
    data: {
      ...product,
      sizes: product.sizes ? JSON.parse(product.sizes) : [],
      colors: product.colors ? JSON.parse(product.colors) : []
    }
  });
});

// PUT /api/v1/products/:id
app.put('/api/v1/products/:id', authenticateToken, (req, res) => {
  const { name, sku, barcode, purchase_price, selling_price, current_stock, min_stock, category_id, brand_id, sizes, colors } = req.body;
  
  const product = db.queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  try {
    db.run(
      `UPDATE products SET 
        name = COALESCE(?, name),
        sku = COALESCE(?, sku),
        barcode = COALESCE(?, barcode),
        purchase_price = COALESCE(?, purchase_price),
        selling_price = COALESCE(?, selling_price),
        current_stock = COALESCE(?, current_stock),
        min_stock = COALESCE(?, min_stock),
        category_id = ?,
        brand_id = ?,
        sizes = ?,
        colors = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        name, sku, barcode, purchase_price, selling_price, current_stock, min_stock,
        category_id || null, brand_id || null,
        sizes ? JSON.stringify(sizes) : null,
        colors ? JSON.stringify(colors) : null,
        req.params.id
      ]
    );

    const updated = db.queryOne('SELECT * FROM products WHERE id = ?', [req.params.id]);
    return res.json({
      success: true,
      message: 'Product updated successfully',
      data: {
        ...updated,
        sizes: updated.sizes ? JSON.parse(updated.sizes) : [],
        colors: updated.colors ? JSON.parse(updated.colors) : []
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/products/:id
app.get('/api/v1/products/delete/:id', authenticateToken, (req, res) => { // Support fallback / direct deletion
  try {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});
app.delete('/api/v1/products/:id', authenticateToken, (req, res) => {
  try {
    db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Product deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 3. ORDER ROUTES
// ==========================================

// GET /api/v1/orders
app.get('/api/v1/orders', authenticateToken, (req, res) => {
  const { payment_status, from, to, per_page = 50, page = 1 } = req.query;
  
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  
  if (payment_status) {
    sql += ' AND payment_status = ?';
    params.push(payment_status);
  }
  if (from) {
    sql += ' AND date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND date <= ?';
    params.push(to);
  }
  
  sql += ' ORDER BY date DESC';
  
  // Custom Pagination implementation
  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;
  
  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = db.queryOne(countSql, params).count;
  
  sql += ' LIMIT ? OFFSET ?';
  const queryParams = [...params, limit, offset];
  
  const orders = db.query(sql, queryParams);
  
  // Attach items and delivery to each order
  const fullOrders = orders.map(order => {
    const items = db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    const delivery = db.queryOne('SELECT * FROM deliveries WHERE order_id = ?', [order.id]);
    return {
      ...order,
      items,
      delivery
    };
  });
  
  return res.json({
    success: true,
    data: {
      data: fullOrders,
      current_page: parseInt(page),
      per_page: limit,
      total: total,
      last_page: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/orders
app.post('/api/v1/orders', authenticateToken, (req, res) => {
  const { id, customer_id, customer_name, subtotal, total_amount, payment_status, payment_method, date, items } = req.body;

  if (!id || !customer_id || !customer_name || !subtotal || !total_amount || !payment_status || !payment_method || !date || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Missing required order fields.' });
  }

  try {
    db.transaction(() => {
      // 1. Insert order
      db.run(
        `INSERT INTO orders (id, customer_id, customer_name, subtotal, discount, delivery_fee, total_amount, deposit_amount, remaining_amount, payment_status, payment_method, date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          id, customer_id, customer_name, subtotal, req.body.discount || 0, req.body.delivery_fee || 0,
          total_amount, req.body.deposit_amount || 0, req.body.remaining_amount || 0,
          payment_status, payment_method, date
        ]
      );

      // 2. Insert items and decrement stock
      for (const item of items) {
        db.run(
          `INSERT INTO order_items (id, order_id, product_id, name, sku, quantity, selling_price, purchase_price, size, color, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            item.id || generateUuid('item'),
            id,
            item.product_id,
            item.name,
            item.sku || '',
            item.quantity,
            item.selling_price,
            item.purchase_price || 0,
            item.size || null,
            item.color || null
          ]
        );

        db.run(
          'UPDATE products SET current_stock = current_stock - ? WHERE id = ?',
          [item.quantity, item.product_id]
        );
      }
      
      // 3. Handle optional delivery payload (if included in request)
      if (req.body.delivery) {
        db.run(
          `INSERT INTO deliveries (id, order_id, company, fee, status, tracking_number, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            req.body.delivery.id || generateUuid('del'),
            id,
            req.body.delivery.company,
            req.body.delivery.fee || 0,
            req.body.delivery.status || 'pending',
            req.body.delivery.tracking_number || null
          ]
        );
      }
    })();

    const order = db.queryOne('SELECT * FROM orders WHERE id = ?', [id]);
    const orderItems = db.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    const delivery = db.queryOne('SELECT * FROM deliveries WHERE order_id = ?', [id]);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        ...order,
        items: orderItems,
        delivery
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/orders/:id
app.get('/api/v1/orders/:id', authenticateToken, (req, res) => {
  const order = db.queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }
  const items = db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  const delivery = db.queryOne('SELECT * FROM deliveries WHERE order_id = ?', [order.id]);
  
  return res.json({
    success: true,
    data: {
      ...order,
      items,
      delivery
    }
  });
});

// PATCH /api/v1/orders/:id/status
app.patch('/api/v1/orders/:id/status', authenticateToken, (req, res) => {
  const { payment_status } = req.body;
  if (!payment_status) {
    return res.status(400).json({ success: false, message: 'Payment status is required.' });
  }

  const order = db.queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) {
    return res.status(404).json({ success: false, message: 'Order not found.' });
  }

  try {
    db.run("UPDATE orders SET payment_status = ?, updated_at = datetime('now') WHERE id = ?", [payment_status, req.params.id]);
    const updated = db.queryOne('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    return res.json({
      success: true,
      message: 'Order status updated',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 4. CUSTOMER ROUTES
// ==========================================

// GET /api/v1/customers
app.get('/api/v1/customers', authenticateToken, (req, res) => {
  const { search, per_page = 50, page = 1 } = req.query;
  let sql = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    sql += ' AND (name LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  sql += ' ORDER BY name';

  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = db.queryOne(countSql, params).count;

  sql += ' LIMIT ? OFFSET ?';
  const customers = db.query(sql, [...params, limit, offset]);

  return res.json({
    success: true,
    data: {
      data: customers,
      current_page: parseInt(page),
      per_page: limit,
      total: total,
      last_page: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/customers
app.post('/api/v1/customers', authenticateToken, (req, res) => {
  const { id, name, phone, email, notes } = req.body;
  if (!id || !name) {
    return res.status(400).json({ success: false, message: 'ID and Name are required.' });
  }

  try {
    db.run(
      `INSERT INTO customers (id, name, phone, email, outstanding_balance, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`,
      [id, name, phone || null, email || null, notes || null]
    );

    const customer = db.queryOne('SELECT * FROM customers WHERE id = ?', [id]);
    return res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/customers/:id
app.get('/api/v1/customers/:id', authenticateToken, (req, res) => {
  const customer = db.queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  // Get customer orders and items
  const orders = db.query('SELECT * FROM orders WHERE customer_id = ?', [req.params.id]);
  const ordersWithItems = orders.map(order => {
    const items = db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    return { ...order, items };
  });

  return res.json({
    success: true,
    data: {
      ...customer,
      orders: ordersWithItems
    }
  });
});

// PUT /api/v1/customers/:id
app.put('/api/v1/customers/:id', authenticateToken, (req, res) => {
  const { name, phone, email, outstanding_balance, notes } = req.body;
  
  const customer = db.queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) {
    return res.status(404).json({ success: false, message: 'Customer not found.' });
  }

  try {
    db.run(
      `UPDATE customers SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        outstanding_balance = COALESCE(?, outstanding_balance),
        notes = COALESCE(?, notes),
        updated_at = datetime('now')
       WHERE id = ?`,
      [name, phone, email, outstanding_balance, notes, req.params.id]
    );

    const updated = db.queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    return res.json({
      success: true,
      message: 'Customer updated',
      data: updated
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/customers/:id
app.delete('/api/v1/customers/:id', authenticateToken, (req, res) => {
  try {
    db.run('DELETE FROM customers WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Customer deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 5. SUPPLIER ROUTES
// ==========================================

// GET /api/v1/suppliers
app.get('/api/v1/suppliers', authenticateToken, (req, res) => {
  const suppliers = db.query('SELECT * FROM suppliers ORDER BY name');
  return res.json({ success: true, data: suppliers });
});

// POST /api/v1/suppliers
app.post('/api/v1/suppliers', authenticateToken, (req, res) => {
  const { id, name, phone, email } = req.body;
  if (!id || !name) {
    return res.status(400).json({ success: false, message: 'ID and Name are required.' });
  }

  try {
    db.run(
      `INSERT INTO suppliers (id, name, phone, email, outstanding_balance, created_at, updated_at) 
       VALUES (?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
      [id, name, phone || null, email || null]
    );

    const supplier = db.queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);
    return res.status(201).json({
      success: true,
      message: 'Supplier created',
      data: supplier
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/suppliers/:id
app.get('/api/v1/suppliers/:id', authenticateToken, (req, res) => {
  const supplier = db.queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found.' });
  }
  return res.json({ success: true, data: supplier });
});

// PUT /api/v1/suppliers/:id
app.put('/api/v1/suppliers/:id', authenticateToken, (req, res) => {
  const { name, phone, email, outstanding_balance } = req.body;

  const supplier = db.queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
  if (!supplier) {
    return res.status(404).json({ success: false, message: 'Supplier not found.' });
  }

  try {
    db.run(
      `UPDATE suppliers SET 
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        outstanding_balance = COALESCE(?, outstanding_balance),
        updated_at = datetime('now')
       WHERE id = ?`,
      [name, phone, email, outstanding_balance, req.params.id]
    );

    const updated = db.queryOne('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/v1/suppliers/:id
app.delete('/api/v1/suppliers/:id', authenticateToken, (req, res) => {
  try {
    db.run('DELETE FROM suppliers WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Supplier deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 6. EXPENSE ROUTES
// ==========================================

// GET /api/v1/expense-categories
app.get('/api/v1/expense-categories', authenticateToken, (req, res) => {
  const categories = db.query('SELECT * FROM expense_categories');
  return res.json({ success: true, data: categories });
});

// GET /api/v1/expenses
app.get('/api/v1/expenses', authenticateToken, (req, res) => {
  const { category_id, from, to, per_page = 50, page = 1 } = req.query;
  
  let sql = `
    SELECT e.*, c.name as category_name 
    FROM expenses e
    JOIN expense_categories c ON e.category_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (category_id) {
    sql += ' AND e.category_id = ?';
    params.push(category_id);
  }
  if (from) {
    sql += ' AND e.date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND e.date <= ?';
    params.push(to);
  }

  sql += ' ORDER BY e.date DESC';

  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;

  const countSql = `SELECT COUNT(*) as count FROM expenses WHERE 1=1 ${category_id ? 'AND category_id = ?' : ''} ${from ? 'AND date >= ?' : ''} ${to ? 'AND date <= ?' : ''}`;
  const total = db.queryOne(countSql, params).count;

  sql += ' LIMIT ? OFFSET ?';
  const expenses = db.query(sql, [...params, limit, offset]);

  // Transform data to match Laravel's load('category') format
  const formattedExpenses = expenses.map(e => ({
    id: e.id,
    category_id: e.category_id,
    amount: e.amount,
    description: e.description,
    date: e.date,
    created_at: e.created_at,
    updated_at: e.updated_at,
    category: {
      id: e.category_id,
      name: e.category_name
    }
  }));

  return res.json({
    success: true,
    data: {
      data: formattedExpenses,
      current_page: parseInt(page),
      per_page: limit,
      total: total,
      last_page: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/expenses
app.post('/api/v1/expenses', authenticateToken, (req, res) => {
  const { id, category_id, amount, description, date } = req.body;
  if (!id || !category_id || amount === undefined || !date) {
    return res.status(400).json({ success: false, message: 'ID, Category ID, Amount, and Date are required.' });
  }

  // Check if category exists
  const category = db.queryOne('SELECT * FROM expense_categories WHERE id = ?', [category_id]);
  if (!category) {
    return res.status(400).json({ success: false, message: 'Category not found.' });
  }

  try {
    db.run(
      `INSERT INTO expenses (id, category_id, amount, description, date, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [id, category_id, amount, description || null, date]
    );

    const expense = db.queryOne('SELECT * FROM expenses WHERE id = ?', [id]);
    return res.status(201).json({
      success: true,
      message: 'Expense recorded',
      data: {
        ...expense,
        category: category
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/expenses/:id
app.get('/api/v1/expenses/:id', authenticateToken, (req, res) => {
  const expense = db.queryOne('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!expense) {
    return res.status(404).json({ success: false, message: 'Expense not found.' });
  }
  const category = db.queryOne('SELECT * FROM expense_categories WHERE id = ?', [expense.category_id]);
  return res.json({
    success: true,
    data: {
      ...expense,
      category
    }
  });
});

// DELETE /api/v1/expenses/:id
app.delete('/api/v1/expenses/:id', authenticateToken, (req, res) => {
  try {
    db.run('DELETE FROM expenses WHERE id = ?', [req.params.id]);
    return res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 7. STOCK MANAGEMENT ROUTES
// ==========================================

// GET /api/v1/stock
app.get('/api/v1/stock', authenticateToken, (req, res) => {
  const { low_stock_only } = req.query;
  let sql = 'SELECT * FROM products';
  if (low_stock_only === 'true' || low_stock_only === '1') {
    sql += ' WHERE current_stock <= min_stock';
  }
  sql += ' ORDER BY current_stock';
  
  const products = db.query(sql);
  
  // Attach category and brand details
  const fullProducts = products.map(p => {
    const category = p.category_id ? db.queryOne('SELECT * FROM categories WHERE id = ?', [p.category_id]) : null;
    const brand = p.brand_id ? db.queryOne('SELECT * FROM brands WHERE id = ?', [p.brand_id]) : null;
    return {
      ...p,
      sizes: p.sizes ? JSON.parse(p.sizes) : [],
      colors: p.colors ? JSON.parse(p.colors) : [],
      category,
      brand
    };
  });

  return res.json({ success: true, data: fullProducts });
});

// GET /api/v1/stock/movements
app.get('/api/v1/stock/movements', authenticateToken, (req, res) => {
  const { product_id, type, per_page = 50, page = 1 } = req.query;
  let sql = 'SELECT * FROM stock_movements WHERE 1=1';
  const params = [];

  if (product_id) {
    sql += ' AND product_id = ?';
    params.push(product_id);
  }
  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY date DESC';

  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = db.queryOne(countSql, params).count;

  sql += ' LIMIT ? OFFSET ?';
  const movements = db.query(sql, [...params, limit, offset]);

  // Attach product to movements
  const fullMovements = movements.map(m => {
    const product = db.queryOne('SELECT id, name, sku FROM products WHERE id = ?', [m.product_id]);
    return { ...m, product };
  });

  return res.json({
    success: true,
    data: {
      data: fullMovements,
      current_page: parseInt(page),
      per_page: limit,
      total: total,
      last_page: Math.ceil(total / limit)
    }
  });
});

// POST /api/v1/stock/adjust
app.post('/api/v1/stock/adjust', authenticateToken, (req, res) => {
  const { product_id, quantity, type, reason } = req.body;
  if (!product_id || quantity === undefined || !type) {
    return res.status(400).json({ success: false, message: 'Product ID, Quantity, and Type are required.' });
  }

  const product = db.queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
  if (!product) {
    return res.status(404).json({ success: false, message: 'Product not found.' });
  }

  try {
    const qty = parseInt(quantity);
    db.transaction(() => {
      if (type === 'in') {
        db.run('UPDATE products SET current_stock = current_stock + ?, updated_at = datetime(\'now\') WHERE id = ?', [qty, product_id]);
      } else if (type === 'out') {
        db.run('UPDATE products SET current_stock = current_stock - ?, updated_at = datetime(\'now\') WHERE id = ?', [qty, product_id]);
      } else if (type === 'adjust') {
        db.run('UPDATE products SET current_stock = ?, updated_at = datetime(\'now\') WHERE id = ?', [qty, product_id]);
      }

      db.run(
        `INSERT INTO stock_movements (id, product_id, quantity, type, reason, date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [generateUuid('mvmt'), product_id, qty, type, reason || 'Manual Adjustment']
      );
    })();

    const updatedProduct = db.queryOne('SELECT * FROM products WHERE id = ?', [product_id]);
    return res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: {
        ...updatedProduct,
        sizes: updatedProduct.sizes ? JSON.parse(updatedProduct.sizes) : [],
        colors: updatedProduct.colors ? JSON.parse(updatedProduct.colors) : []
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 8. DELIVERY ROUTES
// ==========================================

// GET /api/v1/deliveries
app.get('/api/v1/deliveries', authenticateToken, (req, res) => {
  const { status, per_page = 50, page = 1 } = req.query;
  let sql = 'SELECT * FROM deliveries WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }

  sql += ' ORDER BY created_at DESC';

  const limit = parseInt(per_page);
  const offset = (parseInt(page) - 1) * limit;

  const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as count');
  const total = db.queryOne(countSql, params).count;

  sql += ' LIMIT ? OFFSET ?';
  const deliveries = db.query(sql, [...params, limit, offset]);

  // Load orders for deliveries
  const fullDeliveries = deliveries.map(d => {
    const order = db.queryOne('SELECT * FROM orders WHERE id = ?', [d.order_id]);
    return { ...d, order };
  });

  // Calculate summaries
  const pending = db.queryOne('SELECT COUNT(*) as count FROM deliveries WHERE status = \'pending\'').count;
  const shipped = db.queryOne('SELECT COUNT(*) as count FROM deliveries WHERE status = \'shipped\'').count;
  const delivered = db.queryOne('SELECT COUNT(*) as count FROM deliveries WHERE status = \'delivered\'').count;
  const cancelled = db.queryOne('SELECT COUNT(*) as count FROM deliveries WHERE status = \'cancelled\'').count;
  
  const feeIncome = db.queryOne('SELECT SUM(fee) as sum FROM deliveries WHERE status = \'delivered\'').sum || 0;
  const feeExpense = db.queryOne('SELECT SUM(fee) as sum FROM deliveries').sum || 0;

  return res.json({
    success: true,
    data: {
      data: fullDeliveries,
      current_page: parseInt(page),
      per_page: limit,
      total: total,
      last_page: Math.ceil(total / limit)
    },
    summary: {
      total_pending: pending,
      total_shipped: shipped,
      total_delivered: delivered,
      total_cancelled: cancelled,
      total_fee_income: parseFloat(feeIncome),
      total_fee_expense: parseFloat(feeExpense)
    }
  });
});

// PATCH /api/v1/deliveries/:id/status
app.patch('/api/v1/deliveries/:id/status', authenticateToken, (req, res) => {
  const { status, tracking_number } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  const delivery = db.queryOne('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
  if (!delivery) {
    return res.status(404).json({ success: false, message: 'Delivery not found.' });
  }

  try {
    db.run(
      'UPDATE deliveries SET status = ?, tracking_number = COALESCE(?, tracking_number), updated_at = datetime(\'now\') WHERE id = ?',
      [status, tracking_number || null, req.params.id]
    );

    const updated = db.queryOne('SELECT * FROM deliveries WHERE id = ?', [req.params.id]);
    const order = db.queryOne('SELECT * FROM orders WHERE id = ?', [updated.order_id]);

    return res.json({
      success: true,
      message: 'Delivery status updated',
      data: {
        ...updated,
        order
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 9. ANALYTICS ROUTES
// ==========================================

// GET /api/v1/analytics/dashboard
app.get('/api/v1/analytics/dashboard', authenticateToken, (req, res) => {
  try {
    // Dates helper: SQLite datetime functions can group by date
    const todaySales = db.queryOne('SELECT SUM(total_amount) as sum FROM orders WHERE date(date) = date(\'now\')').sum || 0;
    const weeklySales = db.queryOne('SELECT SUM(total_amount) as sum FROM orders WHERE date(date) >= date(\'now\', \'-6 days\')').sum || 0;
    const monthlySales = db.queryOne('SELECT SUM(total_amount) as sum FROM orders WHERE date(date) >= date(\'now\', \'start of month\')').sum || 0;

    // Profit calculation: SUM((selling_price - purchase_price) * quantity)
    const monthlyProfit = db.queryOne(`
      SELECT SUM((oi.selling_price - oi.purchase_price) * oi.quantity) as profit 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.date) >= date('now', 'start of month')
    `).profit || 0;

    const monthlyExpenses = db.queryOne('SELECT SUM(amount) as sum FROM expenses WHERE date(date) >= date(\'now\', \'start of month\')').sum || 0;
    
    const pendingOrders = db.queryOne('SELECT COUNT(*) as count FROM deliveries WHERE status = \'pending\'').count;
    const lowStockCount = db.queryOne('SELECT COUNT(*) as count FROM products WHERE current_stock <= min_stock').count;

    // Best sellers
    const bestSellers = db.query(`
      SELECT oi.product_id, oi.name, oi.sku,
             SUM(oi.quantity) as total_sold,
             SUM(oi.selling_price * oi.quantity) as total_revenue,
             SUM((oi.selling_price - oi.purchase_price) * oi.quantity) as total_profit
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.date) >= date('now', 'start of month')
      GROUP BY oi.product_id, oi.name, oi.sku
      ORDER BY total_sold DESC
      LIMIT 10
    `);

    // Last 7 days performance chart
    const weeklyChart = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let i = 6; i >= 0; i--) {
      // Calculate date offset
      const dateStr = db.queryOne(`SELECT date('now', '-${i} days') as d`).d;
      const dateObj = new Date(dateStr);
      const dayName = days[dateObj.getDay()];

      const sales = db.queryOne('SELECT SUM(total_amount) as sum FROM orders WHERE date(date) = ?', [dateStr]).sum || 0;
      const profit = db.queryOne(`
        SELECT SUM((oi.selling_price - oi.purchase_price) * oi.quantity) as profit 
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE date(o.date) = ?
      `, [dateStr]).profit || 0;

      weeklyChart.push({
        date: dayName,
        sales: parseFloat(sales.toFixed(2)),
        profit: parseFloat(profit.toFixed(2))
      });
    }

    const inventoryValuation = db.queryOne('SELECT SUM(purchase_price * current_stock) as cost_value, SUM(selling_price * current_stock) as sell_value FROM products');

    return res.json({
      success: true,
      data: {
        today_sales: parseFloat(todaySales.toFixed(2)),
        weekly_sales: parseFloat(weeklySales.toFixed(2)),
        monthly_sales: parseFloat(monthlySales.toFixed(2)),
        monthly_profit: parseFloat(monthlyProfit.toFixed(2)),
        monthly_expenses: parseFloat(monthlyExpenses.toFixed(2)),
        net_profit: parseFloat((monthlyProfit - monthlyExpenses).toFixed(2)),
        pending_orders: pendingOrders,
        low_stock_count: lowStockCount,
        best_sellers: bestSellers,
        weekly_chart: weeklyChart,
        inventory_cost_value: parseFloat((inventoryValuation.cost_value || 0).toFixed(2)),
        inventory_sell_value: parseFloat((inventoryValuation.sell_value || 0).toFixed(2))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/analytics/profit-loss
app.get('/api/v1/analytics/profit-loss', authenticateToken, (req, res) => {
  const { from, to } = req.query;
  
  if (!from || !to) {
    return res.status(400).json({ success: false, message: 'Parameters from and to are required.' });
  }

  try {
    const totalRevenue = db.queryOne('SELECT SUM(total_amount) as sum FROM orders WHERE date(date) >= ? AND date(date) <= ?', [from, to]).sum || 0;
    
    const totalCogs = db.queryOne(`
      SELECT SUM(oi.purchase_price * oi.quantity) as cogs 
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE date(o.date) >= ? AND date(o.date) <= ?
    `, [from, to]).cogs || 0;

    const grossProfit = totalRevenue - totalCogs;
    const totalExpenses = db.queryOne('SELECT SUM(amount) as sum FROM expenses WHERE date >= ? AND date <= ?', [from, to]).sum || 0;
    const netProfit = grossProfit - totalExpenses;

    const expenseBreakdown = db.query(`
      SELECT e.category_id, SUM(e.amount) as total, ec.name as category_name
      FROM expenses e
      JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.date >= ? AND e.date <= ?
      GROUP BY e.category_id, ec.name
    `, [from, to]);

    const formattedBreakdown = expenseBreakdown.map(eb => ({
      category_id: eb.category_id,
      total: eb.total,
      category: {
        id: eb.category_id,
        name: eb.category_name
      }
    }));

    return res.json({
      success: true,
      data: {
        period: { from, to },
        total_revenue: parseFloat(totalRevenue.toFixed(2)),
        total_cogs: parseFloat(totalCogs.toFixed(2)),
        gross_profit: parseFloat(grossProfit.toFixed(2)),
        total_expenses: parseFloat(totalExpenses.toFixed(2)),
        net_profit: parseFloat(netProfit.toFixed(2)),
        expense_breakdown: formattedBreakdown
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/v1/analytics/inventory
app.get('/api/v1/analytics/inventory', authenticateToken, (req, res) => {
  try {
    const products = db.query(`
      SELECT p.id, p.name, p.sku, p.purchase_price, p.selling_price, p.current_stock, p.min_stock, p.category_id, p.brand_id,
             (p.purchase_price * p.current_stock) as cost_value,
             (p.selling_price * p.current_stock) as sell_value,
             ((p.selling_price - p.purchase_price) * p.current_stock) as potential_profit
      FROM products p
      ORDER BY p.current_stock
    `);

    const fullProducts = products.map(p => {
      const category = p.category_id ? db.queryOne('SELECT * FROM categories WHERE id = ?', [p.category_id]) : null;
      const brand = p.brand_id ? db.queryOne('SELECT * FROM brands WHERE id = ?', [p.brand_id]) : null;
      return {
        ...p,
        category,
        brand,
        cost_value: parseFloat((p.cost_value || 0).toFixed(2)),
        sell_value: parseFloat((p.sell_value || 0).toFixed(2)),
        potential_profit: parseFloat((p.potential_profit || 0).toFixed(2))
      };
    });

    const lowStockCount = fullProducts.filter(p => p.current_stock <= p.min_stock).length;
    const totalCost = fullProducts.reduce((acc, p) => acc + p.cost_value, 0);
    const totalSell = fullProducts.reduce((acc, p) => acc + p.sell_value, 0);

    return res.json({
      success: true,
      data: fullProducts,
      summary: {
        total_products: fullProducts.length,
        low_stock_count: lowStockCount,
        total_cost_value: parseFloat(totalCost.toFixed(2)),
        total_sell_value: parseFloat(totalSell.toFixed(2))
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ==========================================
// 10. OFFLINE SYNCHRONIZATION ROUTES
// ==========================================

// GET /api/v1/sync/pull
app.get('/api/v1/sync/pull', authenticateToken, (req, res) => {
  const { since } = req.query;

  const pullTable = (tableName) => {
    let sql = `SELECT * FROM ${tableName}`;
    const params = [];
    if (since) {
      sql += ' WHERE updated_at > ?';
      params.push(since);
    }
    return db.query(sql, params);
  };

  try {
    const products = pullTable('products').map(p => ({
      ...p,
      sizes: p.sizes ? JSON.parse(p.sizes) : [],
      colors: p.colors ? JSON.parse(p.colors) : []
    }));

    // Other tables don't need sizes/colors JSON parsing
    return res.json({
      success: true,
      data: {
        products,
        product_variants: [], // Empty fallback or table if it exists
        categories: db.query('SELECT * FROM categories'),
        brands: db.query('SELECT * FROM brands'),
        customers: pullTable('customers'),
        suppliers: pullTable('suppliers')
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/v1/sync
app.post('/api/v1/sync', authenticateToken, (req, res) => {
  const { table, action, payload } = req.body;
  if (!table || !action || !payload) {
    return res.status(400).json({ success: false, message: 'Missing table, action or payload.' });
  }

  const clientId = payload.id;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    const result = db.transaction(() => {
      // 1. Conflict resolution
      if (action === 'update' && clientId) {
        const serverRecord = db.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [clientId]);
        if (serverRecord) {
          const clientUpdatedAt = payload.updated_at;
          const serverUpdatedAt = serverRecord.updated_at;

          if (clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
            return {
              success: false,
              conflict: true,
              server_record: serverRecord,
              message: 'Conflict: Server record is newer than local edit.'
            };
          }
        }
      }

      // 2. Perform DB operation
      let record = null;
      let oldId = null;
      let newId = null;

      if (action === 'create' || action === 'update') {
        const existing = clientId ? db.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [clientId]) : null;

        if (table === 'orders' && action === 'create') {
          // Sync Order Custom Logic
          db.run(
            `INSERT INTO orders (id, customer_id, customer_name, subtotal, discount, delivery_fee, total_amount, deposit_amount, remaining_amount, payment_status, payment_method, date, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [
              payload.id, payload.customer_id, payload.customer_name, payload.subtotal, payload.discount || 0, payload.delivery_fee || 0,
              payload.total_amount, payload.deposit_amount || 0, payload.remaining_amount || 0,
              payload.payment_status, payload.payment_method, payload.date
            ]
          );

          if (payload.items && payload.items.length > 0) {
            for (const item of payload.items) {
              db.run(
                `INSERT INTO order_items (id, order_id, product_id, name, sku, quantity, selling_price, purchase_price, size, color, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [
                  item.id || generateUuid('item'),
                  payload.id,
                  item.product_id,
                  item.name,
                  item.sku || '',
                  item.quantity,
                  item.selling_price,
                  item.purchase_price || 0,
                  item.size || null,
                  item.color || null
                ]
              );
            }
          }

          if (payload.delivery) {
            db.run(
              `INSERT INTO deliveries (id, order_id, company, fee, status, tracking_number, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
              [
                payload.delivery.id || generateUuid('del'),
                payload.id,
                payload.delivery.company,
                payload.delivery.fee || 0,
                payload.delivery.status || 'pending',
                payload.delivery.tracking_number || null
              ]
            );
          }

          record = db.queryOne('SELECT * FROM orders WHERE id = ?', [payload.id]);
        } else if (table === 'stock_movements' && action === 'create') {
          // Sync Stock Movement Logic
          db.run(
            `INSERT INTO stock_movements (id, product_id, quantity, type, reason, date, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
            [payload.id, payload.product_id, payload.quantity, payload.type, payload.reason || null, payload.date]
          );

          const qty = parseInt(payload.quantity);
          if (payload.type === 'in') {
            db.run('UPDATE products SET current_stock = current_stock + ? WHERE id = ?', [qty, payload.product_id]);
          } else if (payload.type === 'out') {
            db.run('UPDATE products SET current_stock = current_stock - ? WHERE id = ?', [qty, payload.product_id]);
          } else if (payload.type === 'adjust') {
            db.run('UPDATE products SET current_stock = ? WHERE id = ?', [qty, payload.product_id]);
          }

          record = db.queryOne('SELECT * FROM stock_movements WHERE id = ?', [payload.id]);
        } else {
          // Generic Sync Table Logic
          if (existing) {
            // Update
            const fields = Object.keys(payload).filter(k => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
            const sets = fields.map(f => `${f} = ?`).join(', ');
            const values = fields.map(f => typeof payload[f] === 'object' ? JSON.stringify(payload[f]) : payload[f]);
            
            db.run(`UPDATE ${table} SET ${sets}, updated_at = datetime('now') WHERE id = ?`, [...values, clientId]);
            record = db.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [clientId]);
          } else {
            // Create
            let cleanId = clientId;
            if (clientId && (clientId.startsWith('local-') || clientId.startsWith('cust-') || clientId.startsWith('supp-') || clientId.startsWith('exp-'))) {
              oldId = clientId;
              cleanId = generateUuid();
              newId = cleanId;
            }

            const cleanPayload = { ...payload, id: cleanId };
            const fields = Object.keys(cleanPayload).filter(k => k !== 'created_at' && k !== 'updated_at');
            const cols = fields.join(', ');
            const placeholders = fields.map(() => '?').join(', ');
            const values = fields.map(f => typeof cleanPayload[f] === 'object' ? JSON.stringify(cleanPayload[f]) : cleanPayload[f]);

            db.run(`INSERT INTO ${table} (${cols}, created_at, updated_at) VALUES (${placeholders}, datetime('now'), datetime('now'))`, values);
            record = db.queryOne(`SELECT * FROM ${table} WHERE id = ?`, [cleanId]);
          }
        }
      } else if (action === 'delete' && clientId) {
        db.run(`DELETE FROM ${table} WHERE id = ?`, [clientId]);
      }

      // Record sync log
      db.run(
        `INSERT INTO offline_sync_logs (client_ip, table_name, records_synced, status, created_at, updated_at)
         VALUES (?, ?, ?, 'success', datetime('now'), datetime('now'))`,
        [ip, table, 1]
      );

      return {
        success: true,
        data: {
          old_id: oldId,
          new_id: newId,
          record: record
        }
      };
    });

    return res.json(result);
  } catch (err) {
    db.run(
      `INSERT INTO offline_sync_logs (client_ip, table_name, records_synced, status, created_at, updated_at)
       VALUES (?, ?, 0, 'failed', datetime('now'), datetime('now'))`,
      [ip, table]
    );
    return res.status(500).json({ success: false, message: 'Sync failed: ' + err.message });
  }
});

// Start express server locally
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  const PORT = process.env.PORT || 8000;
  app.listen(PORT, () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
