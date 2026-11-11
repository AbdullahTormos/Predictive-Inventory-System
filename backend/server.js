const express = require("express");
const sql = require('mssql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');

const app = express();

app.use(cors());
app.use(express.json());

let isMaintenanceMode = false;

const checkMaintenanceMode = (req, res, next) => {
  if (!isMaintenanceMode) {
    return next();
  }

  const token = req.header("Authorization")?.replace("Bearer ", "");
  let userRole = null;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
      userRole = decoded.role?.toUpperCase();
    } catch (err) {
    }
  }

  if (userRole === 'ADMIN') {
    return next();
  }

  return res.status(503).json({
    error: "System is currently under maintenance."
  });
};

app.use('/api', (req, res, next) => {
  if (
    req.path === '/admin/system/maintenance' || 
    req.path === '/login' || 
    req.path === '/admin/config'
  ) {
    return next();
  }
  return checkMaintenanceMode(req, res, next);
});

// 1. DATABASE CONFIGURATION & CONNECTION
const db = {
  user: 'sa',             
  password: "123",              
  server: '127.0.0.1',       
  database: 'InvetoryAnalysis', 
  port: 1433,
  options: { 
    encrypt: false,
    trustServerCertificate: true
  }
};

const poolPromise = sql.connect(db)
  .then(pool => {
    if (pool.connected) {
      console.log("✅ Connected to MS SQL Server database: InventoryAnalysis");
    }
    return pool;
  })
  .catch(e => {
    console.log("❌ DB connection error:", e);
  });

app.get("/", async (req, res) => {
  try {
    res.send("Inventory & Supply Chain API is Online");
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

// 2. AUTHENTICATION MIDDLEWARE

const auth = (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return res.status(401).json({ error: "Please authenticate" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: "Please authenticate" });
  }
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('username', sql.VarChar, username)
      .query('SELECT id, username, password, role FROM users WHERE username = @username');

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.recordset[0];

    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = user.password === password;
    }

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const userRole = (user.role || '').toUpperCase();
    if (isMaintenanceMode && userRole !== 'ADMIN') {
      return res.status(503).json({
        error: "System is currently under maintenance."
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: '1d' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Database query error:', err);
    return res.status(500).json({ error: 'Database authentication failed' });
  }
});


// 3. ADMIN & USER MANAGEMENT

app.get('/api/admin/system/maintenance', async (req, res) => {
  try {
    res.json({ enabled: isMaintenanceMode });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch maintenance status' });
  }
});

app.patch('/api/admin/system/maintenance', async (req, res) => {
  const { enabled } = req.body;

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ error: 'Payload field "enabled" must be a boolean.' });
  }

  isMaintenanceMode = enabled;
  console.log(`🔧 System Maintenance Mode updated to: ${isMaintenanceMode}`);

  res.json({ 
    message: 'Maintenance mode updated successfully', 
    enabled: isMaintenanceMode 
  });
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, username, email, role, created_at 
      FROM users 
      ORDER BY id DESC
    `);
    res.json(result.recordset);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

app.post('/api/admin/users', async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required.' });
  }

  try {
    const pool = await poolPromise;
    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role || 'LOGISTICS_ADMIN';

    await pool.request()
      .input('username', sql.VarChar, username)
      .input('email', sql.VarChar, email)
      .input('password', sql.VarChar, hashedPassword)
      .input('role', sql.VarChar, assignedRole)
      .query(`
        INSERT INTO users (username, email, password, role, created_at)
        VALUES (@username, @email, @password, @role, GETDATE())
      `);

    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('Create User Error:', err);
    res.status(500).json({ error: 'Failed to create user', details: err.message });
  }
});

app.put('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;
  const { username, email, role, password } = req.body;

  if (!username || !email || !role) {
    return res.status(400).json({ error: 'Username, email, and role are required.' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    
    request.input('id', sql.Int, id);
    request.input('username', sql.VarChar, username);
    request.input('email', sql.VarChar, email);
    request.input('role', sql.VarChar, role);

    let queryStr = `UPDATE users SET username = @username, email = @email, role = @role`;

    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      request.input('password', sql.VarChar, hashedPassword);
      queryStr += `, password = @password`;
    }

    queryStr += ` WHERE id = @id`;

    const result = await request.query(queryStr);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✏️ User ID ${id} updated.`);
    return res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Update User Error:', err);
    return res.status(500).json({ error: 'Failed to update user', details: err.message });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM users WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`🗑️ User ID ${id} deleted.`);
    return res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete User Error:', err);
    return res.status(500).json({ error: 'Failed to delete user', details: err.message });
  }
});

app.get('/api/admin/health', async (req, res) => {
  try {
    const pool = await poolPromise;
    const userCountRes = await pool.request().query('SELECT COUNT(*) as total FROM users');
    const totalUsers = userCountRes.recordset[0]?.total || 0;

    res.json({
      activeUsers: totalUsers,
      totalUsers: totalUsers,
      dbStatus: 'Connected',
      dbLatency: '2ms',
      cpuUsage: '14%',
      ramUsage: '1.2 GB'
    });
  } catch (err) {
    console.error('Health Check Error:', err);
    res.status(500).json({ error: 'Health check failed' });
  }
});

app.get('/api/admin/logs', async (req, res) => {
  try {
    res.json({
      logs: [
        { id: 1, user: 'admin', action: 'User login authenticated via JWT', level: 'INFO', time: '10 mins ago' },
        { id: 2, user: 'System', action: 'MS SQL Server pool connection stable', level: 'INFO', time: '1 hour ago' },
        { id: 3, user: 'ML Worker', action: 'RandomForest model initialized', level: 'INFO', time: '2 hours ago' }
      ]
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

app.get('/api/admin/config', async (req, res) => {
  res.json({
    maintenanceMode: isMaintenanceMode,
    allowRegistration: true
  });
});

app.post('/api/admin/config', async (req, res) => {
  res.json({ message: 'Configuration updated successfully' });
});

// Live ML Retrain Route connected to Python engine (POST)
app.post('/api/admin/ml/retrain', async (req, res) => {
  const { 
    learningRate = 0.041, 
    epochs = 50, 
    batchSize = 32, 
    sku = 'SKU-001' 
  } = req.body;

  console.log(`🤖 Executing Backend ML Retrain Batch:`);
  console.log(`   -> SKU: ${sku} | LR: ${learningRate} | Epochs: ${epochs} | Batch Size: ${batchSize}`);

  const command = `python ml_engine.py "${sku}" ${learningRate} ${epochs} ${batchSize}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Python ML Execution Error: ${error.message}`);
      console.error(`❌ Stderr: ${stderr}`);
      return res.status(500).json({ 
        error: 'Failed to retrain ML model on backend.', 
        details: stderr 
      });
    }

    try {
      const mlOutput = JSON.parse(stdout.trim());
      console.log('✅ ML Model Retrain execution completed successfully!');

      return res.json({
        message: 'ML Model retraining initiated and completed successfully.',
        hyperparamsUsed: { learningRate, epochs, batchSize },
        results: mlOutput
      });
    } catch (parseErr) {
      console.error('❌ Failed to parse JSON stdout from Python ML engine:', stdout);
      return res.status(500).json({ 
        error: 'Invalid JSON payload returned from ML engine.',
        rawOutput: stdout 
      });
    }
  });
});

app.put('/api/admin/products/:id/safety-stock', auth, async (req, res) => {
  const { id } = req.params;
  const { safety_stock, current_stock } = req.body;
  const adminUser = req.user?.username || 'Admin';

  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ADMIN' && userRole !== 'LOGISTICS_ADMIN') {
    return res.status(403).json({ error: 'Access denied. Only Admins can modify safety stock policy.' });
  }

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, parseInt(id, 10));

    let updates = [];

    if (safety_stock !== undefined) {
      const parsedValue = parseInt(safety_stock, 10);
      if (isNaN(parsedValue) || parsedValue < 0) {
        return res.status(400).json({ error: 'Safety stock must be a non-negative integer.' });
      }
      request.input('safety_stock', sql.Int, parsedValue);
      updates.push('safety_stock = @safety_stock');
    }

    if (current_stock !== undefined) {
      const parsedValue = parseInt(current_stock, 10);
      if (isNaN(parsedValue) || parsedValue < 0) {
        return res.status(400).json({ error: 'Current stock must be a non-negative integer.' });
      }
      request.input('current_stock', sql.Int, parsedValue);
      updates.push('current_stock = @current_stock');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid parameters provided.' });
    }

    const queryStr = `UPDATE products SET ${updates.join(', ')} WHERE id = @id`;
    const result = await request.query(queryStr);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: `Product ID ${id} not found.` });
    }

    console.log(`🛡️ Safety Stock adjusted for Product ID ${id} by ${adminUser}`);

    return res.json({ 
      message: 'Safety stock parameters successfully updated.',
      updatedById: req.user.id,
      productId: Number(id)
    });

  } catch (err) {
    console.error('❌ Error updating safety stock:', err.message);
    return res.status(500).json({ error: 'Failed to adjust safety stock parameters.', details: err.message });
  }
});

// 4. INVENTORY, SALES & MACHINE LEARNING API ENDPOINTS

app.get('/api/products', async (req, res) => {
  try {
    const pool = await poolPromise;
    const products = await pool.request().query('SELECT * FROM products');
    res.json(products.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { safety_stock, reorder_point, current_stock } = req.body;

  try {
    const pool = await poolPromise;
    const request = pool.request();
    request.input('id', sql.Int, id);

    let updates = [];
    if (safety_stock !== undefined) {
      request.input('safety_stock', sql.Int, parseInt(safety_stock, 10));
      updates.push('safety_stock = @safety_stock');
    }
    if (reorder_point !== undefined) {
      request.input('reorder_point', sql.Int, parseInt(reorder_point, 10));
      updates.push('reorder_point = @reorder_point');
    }
    if (current_stock !== undefined) {
      request.input('current_stock', sql.Int, parseInt(current_stock, 10));
      updates.push('current_stock = @current_stock');
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid update fields provided.' });
    }

    const queryStr = `UPDATE products SET ${updates.join(', ')} WHERE id = @id`;
    await request.query(queryStr);

    console.log(`✏️ Product ID ${id} parameters updated.`);
    return res.json({ message: 'Product parameters updated successfully.' });

  } catch (err) {
    console.error('❌ Update Product Error:', err.message);
    return res.status(500).json({ error: 'Failed to update product parameters.', details: err.message });
  }
});

app.get('/api/sales', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        s.id AS sale_id,
        s.product_id,
        s.quantity_sold,
        s.sale_date,
        p.sku,
        p.category
      FROM sales_log s
      LEFT JOIN products p ON s.product_id = p.id
      ORDER BY s.sale_date DESC
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error('❌ GET Sales Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch sales log history', details: err.message });
  }
});

app.post('/api/sales', async (req, res) => {
  const { sku, quantity_sold } = req.body;
  const qty = parseInt(quantity_sold, 10);

  if (!sku || isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Valid SKU and quantity_sold are required.' });
  }

  const cleanSku = sku.split(' ')[0].trim();
  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const prodRes = await new sql.Request(transaction)
      .input('skuParam', sql.NVarChar, cleanSku)
      .query('SELECT id, current_stock FROM products WHERE sku = @skuParam');

    if (!prodRes.recordset || prodRes.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: `Product SKU '${cleanSku}' not found.` });
    }

    const product = prodRes.recordset[0];
    const currentStock = product.current_stock || 0;

    if (currentStock < qty) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Insufficient stock! Current stock: ${currentStock}, requested: ${qty}.` 
      });
    }

    await new sql.Request(transaction)
      .input('product_id', sql.Int, product.id)
      .input('qty', sql.Int, qty)
      .query('UPDATE products SET current_stock = current_stock - @qty WHERE id = @product_id');

    await new sql.Request(transaction)
      .input('product_id', sql.Int, product.id)
      .input('quantity_sold', sql.Int, qty)
      .query(`
        INSERT INTO sales_log (product_id, quantity_sold, sale_date)
        VALUES (@product_id, @quantity_sold, GETDATE())
      `);

    await transaction.commit();
    console.log(`📉 Sale logged for ${cleanSku}: -${qty} units. New stock: ${currentStock - qty}`);

    return res.status(201).json({ 
      message: 'Sale logged successfully and stock updated.',
      sku: cleanSku,
      deductedUnits: qty,
      remainingStock: currentStock - qty
    });

  } catch (err) {
    try { await transaction.rollback(); } catch (rb) {}
    console.error('❌ Sales Transaction Error:', err.message);
    return res.status(500).json({ error: 'Failed to log sale.', details: err.message });
  }
});

app.get('/api/forecast/:sku', (req, res) => {
  const { sku } = req.params;
  

  const learningRate = req.query.learningRate || 0.041;
  const epochs = req.query.epochs || 50;
  const batchSize = req.query.batchSize || 32;

  console.log(`🤖 Invoking ML demand model for SKU: ${sku} | LR: ${learningRate} | Epochs: ${epochs} | Batch: ${batchSize}`);

  const command = `python ml_engine.py "${sku}" ${learningRate} ${epochs} ${batchSize}`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Python Exec Error: ${error.message}`);
      console.error(`❌ Stderr: ${stderr}`);
      return res.status(500).json({ error: 'Failed to execute Python ML script.', details: stderr });
    }

    try {
      const mlData = JSON.parse(stdout.trim());
      res.json(mlData);
    } catch (parseErr) {
      console.error('❌ Failed to parse JSON stdout from Python:', stdout);
      res.status(500).json({ error: 'Invalid JSON payload returned from ML engine.' });
    }
  });
});

app.post('/api/simulate', (req, res) => {
  const { sku, leadTimeDelay, demandSurge } = req.body;

  if (!sku) {
    return res.status(400).json({ error: 'SKU parameter is required' });
  }

  const cleanSku = sku.split(' ')[0].trim();
  const delay = leadTimeDelay !== undefined ? leadTimeDelay : 0;
  const surge = demandSurge !== undefined ? demandSurge : 0;

  console.log(`🧪 Running Logistics Stress Test for SKU: ${cleanSku} | LeadTime: +${delay} days | Surge: +${surge}%`);

  exec(`python simulate_engine.py ${cleanSku} ${delay} ${surge}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Simulation Script Exec Error: ${error.message}`);
      console.error(`❌ Stderr: ${stderr}`);
      return res.status(500).json({ error: 'Failed to execute Python simulation script.', details: stderr });
    }

    try {
      const simulationData = JSON.parse(stdout.trim());
      res.json(simulationData);
    } catch (parseErr) {
      console.error('❌ Failed to parse JSON stdout from Python:', stdout);
      res.status(500).json({ error: 'Invalid JSON payload returned from simulation engine.' });
    }
  });
});


// 5. PURCHASE & REPLENISHMENT ORDERS ENDPOINTS

app.get('/api/purchase-orders', async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT 
        po.po_id,
        po.product_id,
        po.supplier_id,
        po.order_quantity,
        po.status,
        po.order_date,
        p.sku,
        p.category
      FROM purchase_orders po
      LEFT JOIN products p ON po.product_id = p.id
      ORDER BY po.po_id DESC
    `);

    res.json(result.recordset);

  } catch (err) {
    console.error('❌ GET Purchase Orders Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch purchase orders', details: err.message });
  }
});

app.post('/api/purchase-orders', async (req, res) => {
  console.log('----------------------------------------');
  console.log('📦 Incoming PO Payload:', req.body);

  const { sku, order_quantity, quantity, status } = req.body;

  try {
    const pool = await poolPromise;
    const cleanSku = sku ? sku.split(' ')[0].trim() : '';

    const productRes = await pool.request()
      .input('skuParam', sql.NVarChar, cleanSku)
      .query('SELECT id FROM products WHERE sku = @skuParam');

    if (!productRes.recordset || productRes.recordset.length === 0) {
      console.error(`❌ Product lookup failed for SKU: '${cleanSku}'`);
      return res.status(400).json({ error: `SKU '${cleanSku}' not found in products table.` });
    }

    const productId = productRes.recordset[0].id;
    const qty = parseInt(order_quantity || quantity || 50, 10);

    let validSupplierId = 1;
    try {
      const supplierRes = await pool.request().query('SELECT TOP 1 supplier_id FROM suppliers');
      if (supplierRes.recordset && supplierRes.recordset.length > 0) {
        validSupplierId = supplierRes.recordset[0].supplier_id || 1;
      }
    } catch (suppErr) {
      validSupplierId = 1;
    }

    console.log(`🔎 Resolved -> Product ID: ${productId}, Supplier ID: ${validSupplierId}, Qty: ${qty}`);

    await pool.request()
      .input('product_id', sql.Int, productId)
      .input('supplier_id', sql.Int, validSupplierId)
      .input('order_quantity', sql.Int, qty)
      .input('status', sql.NVarChar, status || 'PENDING')
      .query(`
        INSERT INTO purchase_orders (product_id, supplier_id, order_quantity, status, order_date)
        VALUES (@product_id, @supplier_id, @order_quantity, @status, GETDATE())
      `);

    console.log('✅ Purchase Order successfully created!');
    return res.status(201).json({ message: 'Purchase Order created successfully' });

  } catch (err) {
    console.error('❌ SQL INSERT ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

app.put('/api/purchase-orders/:id/fulfill', async (req, res) => {
  const { id } = req.params;
  console.log(`📦 Receiving stock fulfillment request for PO ID: ${id}`);

  const pool = await poolPromise;
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const poResult = await new sql.Request(transaction)
      .input('po_id', sql.Int, id)
      .query('SELECT product_id, order_quantity, status FROM purchase_orders WHERE po_id = @po_id');

    if (!poResult.recordset || poResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: `Purchase Order #PO-${id} not found.` });
    }

    const order = poResult.recordset[0];

    if (order.status === 'FULFILLED') {
      await transaction.rollback();
      return res.status(400).json({ error: 'This purchase order has already been fulfilled.' });
    }

    await new sql.Request(transaction)
      .input('po_id', sql.Int, id)
      .query("UPDATE purchase_orders SET status = 'FULFILLED' WHERE po_id = @po_id");

    await new sql.Request(transaction)
      .input('product_id', sql.Int, order.product_id)
      .input('qty', sql.Int, order.order_quantity)
      .query(`
        UPDATE products 
        SET current_stock = ISNULL(current_stock, 0) + @qty 
        WHERE id = @product_id
      `);

    await transaction.commit();
    console.log(`✅ Order #PO-${id} marked FULFILLED. Added ${order.order_quantity} units to Product ID ${order.product_id}.`);

    return res.json({ 
      message: 'Order fulfilled successfully and stock quantity updated.',
      po_id: Number(id),
      unitsAdded: order.order_quantity 
    });

  } catch (err) {
    try { await transaction.rollback(); } catch (rbErr) {}
    console.error('❌ Order Fulfillment Transaction Error:', err.message);
    return res.status(500).json({ error: 'Failed to complete order fulfillment', details: err.message });
  }
});


const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`🚀 Service is running on port: [${port}]`);
});