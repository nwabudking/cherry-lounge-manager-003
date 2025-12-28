import { Router } from 'express';
import { query, getPool } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Health check - public endpoint
router.get('/', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'unknown',
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // Check database connection
    const pool = getPool();
    const [rows] = await pool.execute('SELECT 1 as test');
    health.database = rows && rows.length > 0 ? 'connected' : 'error';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'degraded';
    health.error = error.message;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Detailed health check - requires auth
router.get('/detailed', authMiddleware, async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      status: 'unknown',
      tables: {},
    },
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  try {
    // Check database connection and table counts
    const tables = ['menu_categories', 'menu_items', 'inventory_items', 'orders', 'payments', 'profiles', 'user_roles'];
    
    for (const table of tables) {
      try {
        const result = await query(`SELECT COUNT(*) as count FROM ${table}`);
        health.database.tables[table] = result[0]?.count || 0;
      } catch (err) {
        health.database.tables[table] = 'error';
      }
    }
    
    health.database.status = 'connected';
  } catch (error) {
    health.database.status = 'disconnected';
    health.database.error = error.message;
    health.status = 'degraded';
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Database connectivity check
router.get('/db', async (req, res) => {
  try {
    const pool = getPool();
    const startTime = Date.now();
    await pool.execute('SELECT 1');
    const responseTime = Date.now() - startTime;
    
    res.json({
      status: 'connected',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Sync data from Supabase (for offline deployments)
router.post('/sync-from-supabase', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  try {
    const { 
      menu_categories = [], 
      menu_items = [], 
      inventory_items = [], 
      suppliers = [],
      orders = [],
      order_items = [],
      payments = [],
      restaurant_settings = []
    } = req.body;
    
    const results = {
      menu_categories: 0,
      menu_items: 0,
      inventory_items: 0,
      suppliers: 0,
      orders: 0,
      order_items: 0,
      payments: 0,
      restaurant_settings: 0,
      errors: [],
    };

    // Sync menu categories
    for (const cat of menu_categories) {
      try {
        await query(
          `INSERT INTO menu_categories (id, name, category_type, sort_order, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), category_type=VALUES(category_type), 
           sort_order=VALUES(sort_order), is_active=VALUES(is_active)`,
          [cat.id, cat.name, cat.category_type || 'food', cat.sort_order || 0, cat.is_active !== false, cat.created_at || new Date()]
        );
        results.menu_categories++;
      } catch (err) {
        results.errors.push(`Category ${cat.id}: ${err.message}`);
      }
    }

    // Sync suppliers
    for (const sup of suppliers) {
      try {
        await query(
          `INSERT INTO suppliers (id, name, contact_person, phone, email, address, notes, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), contact_person=VALUES(contact_person), 
           phone=VALUES(phone), email=VALUES(email), address=VALUES(address), notes=VALUES(notes), is_active=VALUES(is_active)`,
          [sup.id, sup.name, sup.contact_person, sup.phone, sup.email, sup.address, sup.notes, sup.is_active !== false, sup.created_at || new Date(), sup.updated_at || new Date()]
        );
        results.suppliers++;
      } catch (err) {
        results.errors.push(`Supplier ${sup.id}: ${err.message}`);
      }
    }

    // Sync inventory items
    for (const item of inventory_items) {
      try {
        await query(
          `INSERT INTO inventory_items (id, name, category, category_id, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), category_id=VALUES(category_id),
           unit=VALUES(unit), current_stock=VALUES(current_stock), min_stock_level=VALUES(min_stock_level),
           cost_per_unit=VALUES(cost_per_unit), supplier=VALUES(supplier), supplier_id=VALUES(supplier_id), is_active=VALUES(is_active)`,
          [item.id, item.name, item.category, item.category_id, item.unit || 'pcs', item.current_stock || 0, item.min_stock_level || 0, item.cost_per_unit, item.supplier, item.supplier_id, item.is_active !== false, item.created_at || new Date(), item.updated_at || new Date()]
        );
        results.inventory_items++;
      } catch (err) {
        results.errors.push(`Inventory ${item.id}: ${err.message}`);
      }
    }

    // Sync menu items
    for (const item of menu_items) {
      try {
        await query(
          `INSERT INTO menu_items (id, name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), price=VALUES(price),
           cost_price=VALUES(cost_price), category_id=VALUES(category_id), image_url=VALUES(image_url),
           is_active=VALUES(is_active), is_available=VALUES(is_available), inventory_item_id=VALUES(inventory_item_id), track_inventory=VALUES(track_inventory)`,
          [item.id, item.name, item.description, item.price, item.cost_price, item.category_id, item.image_url, item.is_active !== false, item.is_available !== false, item.inventory_item_id, item.track_inventory || false, item.created_at || new Date(), item.updated_at || new Date()]
        );
        results.menu_items++;
      } catch (err) {
        results.errors.push(`Menu item ${item.id}: ${err.message}`);
      }
    }

    // Sync orders
    for (const order of orders) {
      try {
        await query(
          `INSERT INTO orders (id, order_number, order_type, table_number, subtotal, vat_amount, service_charge, discount_amount, total_amount, notes, status, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE order_type=VALUES(order_type), table_number=VALUES(table_number),
           subtotal=VALUES(subtotal), vat_amount=VALUES(vat_amount), service_charge=VALUES(service_charge),
           discount_amount=VALUES(discount_amount), total_amount=VALUES(total_amount), notes=VALUES(notes), status=VALUES(status)`,
          [order.id, order.order_number, order.order_type, order.table_number, order.subtotal || 0, order.vat_amount || 0, order.service_charge || 0, order.discount_amount || 0, order.total_amount || 0, order.notes, order.status || 'completed', order.created_by, order.created_at || new Date(), order.updated_at || new Date()]
        );
        results.orders++;
      } catch (err) {
        results.errors.push(`Order ${order.id}: ${err.message}`);
      }
    }

    // Sync order items
    for (const item of order_items) {
      try {
        await query(
          `INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE menu_item_id=VALUES(menu_item_id), item_name=VALUES(item_name),
           quantity=VALUES(quantity), unit_price=VALUES(unit_price), total_price=VALUES(total_price), notes=VALUES(notes)`,
          [item.id, item.order_id, item.menu_item_id, item.item_name, item.quantity, item.unit_price, item.total_price, item.notes, item.created_at || new Date()]
        );
        results.order_items++;
      } catch (err) {
        results.errors.push(`Order item ${item.id}: ${err.message}`);
      }
    }

    // Sync payments
    for (const payment of payments) {
      try {
        await query(
          `INSERT INTO payments (id, order_id, payment_method, amount, reference, status, created_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE payment_method=VALUES(payment_method), amount=VALUES(amount),
           reference=VALUES(reference), status=VALUES(status)`,
          [payment.id, payment.order_id, payment.payment_method, payment.amount, payment.reference, payment.status || 'completed', payment.created_by, payment.created_at || new Date()]
        );
        results.payments++;
      } catch (err) {
        results.errors.push(`Payment ${payment.id}: ${err.message}`);
      }
    }

    // Sync restaurant settings
    for (const setting of restaurant_settings) {
      try {
        await query(
          `INSERT INTO restaurant_settings (id, name, tagline, address, city, country, phone, email, currency, timezone, logo_url, receipt_show_logo, receipt_footer, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE name=VALUES(name), tagline=VALUES(tagline), address=VALUES(address),
           city=VALUES(city), country=VALUES(country), phone=VALUES(phone), email=VALUES(email),
           currency=VALUES(currency), timezone=VALUES(timezone), logo_url=VALUES(logo_url),
           receipt_show_logo=VALUES(receipt_show_logo), receipt_footer=VALUES(receipt_footer)`,
          [setting.id, setting.name, setting.tagline, setting.address, setting.city, setting.country, setting.phone, setting.email, setting.currency, setting.timezone, setting.logo_url, setting.receipt_show_logo || false, setting.receipt_footer, setting.created_at || new Date(), setting.updated_at || new Date()]
        );
        results.restaurant_settings++;
      } catch (err) {
        results.errors.push(`Settings ${setting.id}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      message: 'Data sync completed',
      results,
    });
  } catch (error) {
    console.error('Sync from Supabase error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

// Export all data (for backup/migration)
router.get('/export', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  try {
    const [menu_categories] = await query('SELECT * FROM menu_categories');
    const [menu_items] = await query('SELECT * FROM menu_items');
    const [inventory_items] = await query('SELECT * FROM inventory_items');
    const [suppliers] = await query('SELECT * FROM suppliers');
    const [orders] = await query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 1000');
    const [order_items] = await query('SELECT * FROM order_items');
    const [payments] = await query('SELECT * FROM payments');
    const [restaurant_settings] = await query('SELECT * FROM restaurant_settings');

    res.json({
      exported_at: new Date().toISOString(),
      data: {
        menu_categories: menu_categories || [],
        menu_items: menu_items || [],
        inventory_items: inventory_items || [],
        suppliers: suppliers || [],
        orders: orders || [],
        order_items: order_items || [],
        payments: payments || [],
        restaurant_settings: restaurant_settings || [],
      },
    });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: error.message || 'Export failed' });
  }
});

export default router;
