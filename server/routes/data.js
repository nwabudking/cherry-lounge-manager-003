import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getConnection } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Import data route
router.post('/import', authMiddleware, roleMiddleware('super_admin'), async (req, res) => {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    const { menu_categories, inventory_items, menu_items, restaurant_settings } = req.body;
    const results = {};

    // Import categories
    if (menu_categories?.length) {
      let inserted = 0;
      const errors = [];
      for (const cat of menu_categories) {
        try {
          const id = cat.id || uuidv4();
          await conn.execute(
            'INSERT INTO menu_categories (id, name, category_type, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), category_type=VALUES(category_type), sort_order=VALUES(sort_order), is_active=VALUES(is_active)',
            [id, cat.name, cat.category_type || 'food', cat.sort_order || 0, cat.is_active !== false]
          );
          inserted++;
        } catch (e) { errors.push(e.message); }
      }
      results.menu_categories = { inserted, errors };
    }

    // Import inventory
    if (inventory_items?.length) {
      let inserted = 0;
      const errors = [];
      for (const item of inventory_items) {
        try {
          const id = item.id || uuidv4();
          await conn.execute(
            'INSERT INTO inventory_items (id, name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), category=VALUES(category), unit=VALUES(unit), current_stock=VALUES(current_stock), min_stock_level=VALUES(min_stock_level), cost_per_unit=VALUES(cost_per_unit), supplier=VALUES(supplier)',
            [id, item.name, item.category, item.unit || 'pcs', item.current_stock || 0, item.min_stock_level || 5, item.cost_per_unit, item.supplier, item.supplier_id, item.is_active !== false]
          );
          inserted++;
        } catch (e) { errors.push(e.message); }
      }
      results.inventory_items = { inserted, errors };
    }

    // Import menu items
    if (menu_items?.length) {
      let inserted = 0;
      const errors = [];
      for (const item of menu_items) {
        try {
          const id = item.id || uuidv4();
          await conn.execute(
            'INSERT INTO menu_items (id, name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), price=VALUES(price), cost_price=VALUES(cost_price), category_id=VALUES(category_id), image_url=VALUES(image_url), is_active=VALUES(is_active), is_available=VALUES(is_available)',
            [id, item.name, item.description, item.price || 0, item.cost_price, item.category_id, item.image_url, item.is_active !== false, item.is_available !== false, item.inventory_item_id, item.track_inventory || false]
          );
          inserted++;
        } catch (e) { errors.push(e.message); }
      }
      results.menu_items = { inserted, errors };
    }

    // Import settings
    if (restaurant_settings?.length) {
      const settings = restaurant_settings[0];
      try {
        const id = settings.id || uuidv4();
        await conn.execute(
          'INSERT INTO restaurant_settings (id, name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW()) ON DUPLICATE KEY UPDATE name=VALUES(name), tagline=VALUES(tagline), address=VALUES(address), city=VALUES(city), country=VALUES(country), phone=VALUES(phone), email=VALUES(email), currency=VALUES(currency), timezone=VALUES(timezone), receipt_footer=VALUES(receipt_footer), receipt_show_logo=VALUES(receipt_show_logo)',
          [id, settings.name, settings.tagline, settings.address, settings.city, settings.country, settings.phone, settings.email, settings.logo_url, settings.currency, settings.timezone, settings.receipt_footer, settings.receipt_show_logo || false]
        );
        results.restaurant_settings = { inserted: 1, errors: [] };
      } catch (e) { results.restaurant_settings = { inserted: 0, errors: [e.message] }; }
    }

    await conn.commit();
    res.json({ success: true, results });
  } catch (error) {
    await conn.rollback();
    console.error('Data import error:', error);
    res.status(500).json({ error: error.message || 'Import failed' });
  } finally {
    conn.release();
  }
});

export default router;
