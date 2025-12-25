import { Router } from 'express';
import { query } from '../db/pool.js';
import { authMiddleware } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = Router();

// Migrate data from OpenPOS format
router.post('/openpos', authMiddleware, async (req, res) => {
  try {
    const { categories, items, employees, orders } = req.body;
    const results = {
      categories: { success: 0, failed: 0, errors: [] },
      items: { success: 0, failed: 0, errors: [] },
      employees: { success: 0, failed: 0, errors: [] },
      orders: { success: 0, failed: 0, errors: [] },
    };

    // Migrate categories
    if (categories && Array.isArray(categories)) {
      for (const category of categories) {
        try {
          const id = uuidv4();
          await query(
            'INSERT INTO menu_categories (id, name, sort_order, is_active) VALUES (?, ?, ?, ?)',
            [id, category.name, category.sort_order || 0, true]
          );
          results.categories.success++;
        } catch (error) {
          results.categories.failed++;
          results.categories.errors.push(`Category "${category.name}": ${error.message}`);
        }
      }
    }

    // Get category mapping for items
    const existingCategories = await query('SELECT id, name FROM menu_categories');
    const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));

    // Migrate menu items
    if (items && Array.isArray(items)) {
      for (const item of items) {
        try {
          const id = uuidv4();
          const categoryId = item.category ? categoryMap.get(item.category.toLowerCase()) : null;
          
          await query(
            `INSERT INTO menu_items (id, name, description, price, cost_price, category_id, is_active, is_available) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              item.name,
              item.description || null,
              item.price || 0,
              item.cost_price || null,
              categoryId,
              item.is_active !== false,
              item.is_available !== false,
            ]
          );
          results.items.success++;
        } catch (error) {
          results.items.failed++;
          results.items.errors.push(`Item "${item.name}": ${error.message}`);
        }
      }
    }

    // Migrate employees
    if (employees && Array.isArray(employees)) {
      for (const employee of employees) {
        try {
          const userId = uuidv4();
          const defaultPassword = await bcrypt.hash('password123', 10);
          
          // Create user
          await query(
            'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
            [userId, employee.email, defaultPassword]
          );

          // Create profile
          await query(
            'INSERT INTO profiles (id, email, full_name) VALUES (?, ?, ?)',
            [userId, employee.email, employee.full_name || employee.name]
          );

          // Assign role
          const role = employee.role || 'cashier';
          await query(
            'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
            [uuidv4(), userId, role]
          );

          results.employees.success++;
        } catch (error) {
          results.employees.failed++;
          results.employees.errors.push(`Employee "${employee.email || employee.name}": ${error.message}`);
        }
      }
    }

    // Migrate orders (optional historical data)
    if (orders && Array.isArray(orders)) {
      for (const order of orders) {
        try {
          const orderId = uuidv4();
          
          await query(
            `INSERT INTO orders (id, order_number, order_type, table_number, subtotal, vat_amount, 
             service_charge, discount_amount, total_amount, status, notes, created_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              orderId,
              order.order_number || `MIG-${Date.now()}`,
              order.order_type || 'dine-in',
              order.table_number || null,
              order.subtotal || 0,
              order.vat_amount || 0,
              order.service_charge || 0,
              order.discount_amount || 0,
              order.total_amount || 0,
              order.status || 'completed',
              order.notes || null,
              order.created_at || new Date().toISOString(),
            ]
          );

          // Migrate order items
          if (order.items && Array.isArray(order.items)) {
            for (const item of order.items) {
              await query(
                `INSERT INTO order_items (id, order_id, item_name, quantity, unit_price, total_price, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  uuidv4(),
                  orderId,
                  item.item_name || item.name,
                  item.quantity || 1,
                  item.unit_price || item.price || 0,
                  item.total_price || (item.quantity || 1) * (item.unit_price || item.price || 0),
                  item.notes || null,
                ]
              );
            }
          }

          results.orders.success++;
        } catch (error) {
          results.orders.failed++;
          results.orders.errors.push(`Order "${order.order_number}": ${error.message}`);
        }
      }
    }

    res.json({
      success: true,
      results,
      summary: {
        categories: `${results.categories.success} imported, ${results.categories.failed} failed`,
        items: `${results.items.success} imported, ${results.items.failed} failed`,
        employees: `${results.employees.success} imported, ${results.employees.failed} failed`,
        orders: `${results.orders.success} imported, ${results.orders.failed} failed`,
      },
    });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ error: 'Migration failed: ' + error.message });
  }
});

// Get migration status/preview
router.post('/openpos/preview', authMiddleware, async (req, res) => {
  try {
    const { categories, items, employees, orders } = req.body;
    
    res.json({
      preview: {
        categories: categories?.length || 0,
        items: items?.length || 0,
        employees: employees?.length || 0,
        orders: orders?.length || 0,
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: 'Preview failed: ' + error.message });
  }
});

export default router;
