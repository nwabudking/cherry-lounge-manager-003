import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getConnection } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Helper: Generate order number
const generateOrderNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().slice(2, 10).replace(/-/g, '');
  
  const rows = await query(
    `SELECT COUNT(*) as count FROM orders WHERE DATE(created_at) = CURDATE()`
  );
  const count = (rows[0]?.count || 0) + 1;
  
  return `ORD-${dateStr}-${String(count).padStart(4, '0')}`;
};

// Get kitchen queue
router.get('/queue/kitchen', authMiddleware, async (req, res) => {
  try {
    const sql = `
      SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'notes', oi.notes,
            'menu_item_id', oi.menu_item_id
          )
        ) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status IN ('pending', 'preparing')
      AND o.order_type IN ('dine_in', 'takeaway', 'delivery')
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `;

    const orders = await query(sql);
    
    const result = orders.map(o => ({
      ...o,
      items: o.order_items ? JSON.parse(o.order_items).filter(i => i.id !== null) : [],
    }));

    res.json(result);
  } catch (error) {
    console.error('Get kitchen queue error:', error);
    res.status(500).json({ error: 'Failed to fetch kitchen queue' });
  }
});

// Get bar queue
router.get('/queue/bar', authMiddleware, async (req, res) => {
  try {
    const sql = `
      SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'notes', oi.notes,
            'menu_item_id', oi.menu_item_id
          )
        ) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status IN ('pending', 'preparing')
      AND o.order_type = 'bar_only'
      GROUP BY o.id
      ORDER BY o.created_at ASC
    `;

    const orders = await query(sql);
    
    const result = orders.map(o => ({
      ...o,
      items: o.order_items ? JSON.parse(o.order_items).filter(i => i.id !== null) : [],
    }));

    res.json(result);
  } catch (error) {
    console.error('Get bar queue error:', error);
    res.status(500).json({ error: 'Failed to fetch bar queue' });
  }
});

// Get daily summary
router.get('/reports/daily', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get completed orders
    const orders = await query(
      `SELECT * FROM orders WHERE DATE(created_at) = ? AND status = 'completed'`,
      [targetDate]
    );

    // Get payments
    const payments = await query(
      `SELECT * FROM payments WHERE DATE(created_at) = ?`,
      [targetDate]
    );

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

    const ordersByType = {};
    orders.forEach(o => {
      ordersByType[o.order_type] = (ordersByType[o.order_type] || 0) + 1;
    });

    const paymentsByMethod = {};
    payments.forEach(p => {
      paymentsByMethod[p.payment_method] = (paymentsByMethod[p.payment_method] || 0) + Number(p.amount);
    });

    res.json({ totalOrders, totalRevenue, ordersByType, paymentsByMethod });
  } catch (error) {
    console.error('Get daily summary error:', error);
    res.status(500).json({ error: 'Failed to fetch daily summary' });
  }
});

// Get all orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, orderType, search, startDate, endDate, cashierId, includeItems, includePayments, limit } = req.query;
    
    let sql = `
      SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'notes', oi.notes,
            'menu_item_id', oi.menu_item_id
          )
        ) as order_items,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', p.id,
            'payment_method', p.payment_method,
            'amount', p.amount,
            'status', p.status
          )
        ) FROM payments p WHERE p.order_id = o.id) as payments
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    if (orderType && orderType !== 'all') {
      sql += ' AND o.order_type = ?';
      params.push(orderType);
    }

    if (search) {
      sql += ' AND o.order_number LIKE ?';
      params.push(`%${search}%`);
    }

    if (startDate) {
      sql += ' AND o.created_at >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND o.created_at <= ?';
      params.push(endDate);
    }

    if (cashierId) {
      sql += ' AND o.created_by = ?';
      params.push(cashierId);
    }

    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';
    sql += ` LIMIT ${parseInt(limit) || 500}`;

    const orders = await query(sql, params);
    
    // Parse JSON fields
    const result = orders.map(o => ({
      ...o,
      items: o.order_items ? JSON.parse(o.order_items).filter(i => i.id !== null) : [],
      payments: o.payments ? JSON.parse(o.payments).filter(p => p.id !== null) : [],
    }));

    res.json(result);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const orders = await query(
      `SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'notes', oi.notes,
            'menu_item_id', oi.menu_item_id
          )
        ) as order_items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orders[0];
    order.items = order.order_items ? JSON.parse(order.order_items).filter(i => i.id !== null) : [];

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Get order items
router.get('/:id/items', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const items = await query('SELECT * FROM order_items WHERE order_id = ?', [id]);
    res.json(items);
  } catch (error) {
    console.error('Get order items error:', error);
    res.status(500).json({ error: 'Failed to fetch order items' });
  }
});

// Get order payments
router.get('/:id/payments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const payments = await query('SELECT * FROM payments WHERE order_id = ?', [id]);
    res.json(payments);
  } catch (error) {
    console.error('Get order payments error:', error);
    res.status(500).json({ error: 'Failed to fetch order payments' });
  }
});

// Add payment to order
router.post('/:id/payments', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_method, amount, reference, status } = req.body;
    
    const paymentId = uuidv4();
    await query(
      `INSERT INTO payments (id, order_id, payment_method, amount, reference, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [paymentId, id, payment_method, amount, reference || null, status || 'completed', req.user.id]
    );

    const payments = await query('SELECT * FROM payments WHERE id = ?', [paymentId]);
    res.json(payments[0]);
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ error: 'Failed to add payment' });
  }
});

// Get orders by date range (for dashboard/reports)
router.get('/range', authMiddleware, async (req, res) => {
  try {
    const { start, end, status } = req.query;
    
    let sql = `
      SELECT o.*, 
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', oi.id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'total_price', oi.total_price,
            'notes', oi.notes,
            'menu_item_id', oi.menu_item_id
          )
        ) as order_items,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', p.id,
            'payment_method', p.payment_method,
            'amount', p.amount,
            'status', p.status
          )
        ) FROM payments p WHERE p.order_id = o.id) as payments
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.created_at >= ? AND o.created_at <= ?
    `;
    const params = [start, end];

    if (status && status !== 'all') {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const orders = await query(sql, params);
    
    const result = orders.map(o => ({
      ...o,
      items: o.order_items ? JSON.parse(o.order_items).filter(i => i.id !== null) : [],
      payments: o.payments ? JSON.parse(o.payments).filter(p => p.id !== null) : [],
    }));

    res.json(result);
  } catch (error) {
    console.error('Get orders range error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Create order with improved inventory handling
router.post('/', authMiddleware, async (req, res) => {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();

    const { order_type, table_number, notes, items, discount_amount, service_charge, payment } = req.body;

    // Validate items array
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Order must contain at least one item');
    }

    // Calculate totals with proper decimal handling
    const subtotal = items.reduce((sum, item) => {
      const price = parseFloat(item.unit_price) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return sum + (price * qty);
    }, 0);
    
    const discountAmt = parseFloat(discount_amount) || 0;
    const serviceAmt = parseFloat(service_charge) || 0;
    const vatAmount = 0;
    const totalAmount = Math.max(0, subtotal - discountAmt + serviceAmt + vatAmount);

    // Generate order number
    const orderNumber = await generateOrderNumber();
    const orderId = uuidv4();

    // Pre-validate stock for ALL tracked items before making any changes
    const stockChecks = [];
    for (const item of items) {
      if (!item.menu_item_id) continue;
      
      const [menuItems] = await conn.execute(
        'SELECT inventory_item_id, track_inventory, name FROM menu_items WHERE id = ?',
        [item.menu_item_id]
      );
      
      if (menuItems[0]?.track_inventory && menuItems[0]?.inventory_item_id) {
        const [inv] = await conn.execute(
          'SELECT id, current_stock, name FROM inventory_items WHERE id = ?',
          [menuItems[0].inventory_item_id]
        );
        
        if (inv[0]) {
          const currentStock = parseFloat(inv[0].current_stock) || 0;
          const requiredQty = parseFloat(item.quantity) || 0;
          
          // Find existing check for same inventory item (for aggregating quantities)
          const existingCheck = stockChecks.find(c => c.inventoryId === inv[0].id);
          
          if (existingCheck) {
            existingCheck.requiredQty += requiredQty;
          } else {
            stockChecks.push({
              inventoryId: inv[0].id,
              inventoryName: inv[0].name,
              currentStock,
              requiredQty,
              itemName: item.item_name || menuItems[0].name,
            });
          }
        }
      }
    }
    
    // Check all stock requirements
    for (const check of stockChecks) {
      if (check.currentStock < check.requiredQty) {
        throw new Error(
          `Insufficient stock for "${check.itemName}". ` +
          `Required: ${check.requiredQty.toFixed(2)}, Available: ${check.currentStock.toFixed(2)}`
        );
      }
    }

    // Create order
    await conn.execute(
      `INSERT INTO orders (id, order_number, order_type, table_number, subtotal, vat_amount, service_charge, discount_amount, total_amount, notes, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW(), NOW())`,
      [orderId, orderNumber, order_type, table_number || null, subtotal, vatAmount, serviceAmt, discountAmt, totalAmount, notes || null, req.user.id]
    );

    // Create order items and deduct stock
    for (const item of items) {
      const itemQty = parseFloat(item.quantity) || 0;
      const itemPrice = parseFloat(item.unit_price) || 0;
      const itemTotal = itemQty * itemPrice;
      
      await conn.execute(
        `INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [uuidv4(), orderId, item.menu_item_id || null, item.item_name, itemQty, itemPrice, itemTotal, item.notes || null]
      );

      // Deduct stock for tracked items
      if (!item.menu_item_id) continue;
      
      const [menuItems] = await conn.execute(
        'SELECT inventory_item_id, track_inventory FROM menu_items WHERE id = ?',
        [item.menu_item_id]
      );
      
      if (menuItems[0]?.track_inventory && menuItems[0]?.inventory_item_id) {
        const [inv] = await conn.execute(
          'SELECT current_stock FROM inventory_items WHERE id = ?',
          [menuItems[0].inventory_item_id]
        );
        
        if (inv[0]) {
          const previousStock = parseFloat(inv[0].current_stock) || 0;
          const newStock = Math.max(0, previousStock - itemQty);

          await conn.execute(
            'UPDATE inventory_items SET current_stock = ?, updated_at = NOW() WHERE id = ?',
            [newStock, menuItems[0].inventory_item_id]
          );

          // Log stock movement with decimal support
          await conn.execute(
            `INSERT INTO stock_movements (id, inventory_item_id, movement_type, quantity, previous_stock, new_stock, notes, reference, created_by, created_at)
             VALUES (?, ?, 'out', ?, ?, ?, ?, ?, ?, NOW())`,
            [uuidv4(), menuItems[0].inventory_item_id, itemQty, previousStock, newStock, `Sold via POS - ${item.item_name}`, orderNumber, req.user.id]
          );
        }
      }
    }

    // Create payment
    const paymentAmount = parseFloat(payment.amount) || totalAmount;
    await conn.execute(
      `INSERT INTO payments (id, order_id, payment_method, amount, reference, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, 'completed', ?, NOW())`,
      [uuidv4(), orderId, payment.payment_method, paymentAmount, payment.reference || null, req.user.id]
    );

    await conn.commit();

    // Fetch created order with items
    const [order] = await query('SELECT * FROM orders WHERE id = ?', [orderId]);

    res.json(order);
  } catch (error) {
    await conn.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message || 'Failed to create order' });
  } finally {
    conn.release();
  }
});

// Update order status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await query(
      'UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    const orders = await query('SELECT * FROM orders WHERE id = ?', [id]);
    res.json(orders[0]);
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
