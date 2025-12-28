import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/menu');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `menu-${Date.now()}${ext}`);
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload menu image
router.post('/upload-image', authMiddleware, roleMiddleware('super_admin', 'manager'), upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/menu/${req.file.filename}`;
    res.json({ url });
  } catch (error) {
    console.error('Upload image error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get all categories
router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const { active } = req.query;
    let sql = 'SELECT * FROM menu_categories';
    if (active === 'true') {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY sort_order, name';
    
    const categories = await query(sql);
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Create category
router.post('/categories', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { name, category_type, sort_order, is_active } = req.body;
    const id = uuidv4();

    await query(
      'INSERT INTO menu_categories (id, name, category_type, sort_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
      [id, name, category_type || 'food', sort_order || 0, is_active !== false]
    );

    const categories = await query('SELECT * FROM menu_categories WHERE id = ?', [id]);
    res.json(categories[0]);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category
router.patch('/categories/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_type, sort_order, is_active } = req.body;

    await query(
      'UPDATE menu_categories SET name = ?, category_type = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [name, category_type, sort_order, is_active, id]
    );

    const categories = await query('SELECT * FROM menu_categories WHERE id = ?', [id]);
    res.json(categories[0]);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category - hard delete by default
router.delete('/categories/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { soft } = req.query;
    
    if (soft === 'true') {
      await query('UPDATE menu_categories SET is_active = 0 WHERE id = ?', [id]);
    } else {
      // First unlink any menu items
      await query('UPDATE menu_items SET category_id = NULL WHERE category_id = ?', [id]);
      // Then delete the category
      await query('DELETE FROM menu_categories WHERE id = ?', [id]);
    }
    
    res.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// Get menu item count
router.get('/items/count', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) as count FROM menu_items WHERE is_active = 1');
    res.json({ count: result[0].count });
  } catch (error) {
    console.error('Get menu count error:', error);
    res.status(500).json({ error: 'Failed to get count' });
  }
});

// Get all menu items
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const { categoryId, active } = req.query;
    
    let sql = `
      SELECT mi.*, mc.name as category_name,
        ii.id as inv_id, ii.current_stock, ii.min_stock_level, ii.unit
      FROM menu_items mi
      LEFT JOIN menu_categories mc ON mi.category_id = mc.id
      LEFT JOIN inventory_items ii ON mi.inventory_item_id = ii.id
      WHERE 1=1
    `;
    const params = [];

    if (active === 'true') {
      sql += ' AND mi.is_active = 1 AND mi.is_available = 1';
    }

    if (categoryId) {
      sql += ' AND mi.category_id = ?';
      params.push(categoryId);
    }

    sql += ' ORDER BY mi.name';

    const items = await query(sql, params);
    
    // Format response
    const result = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: parseFloat(item.price),
      cost_price: item.cost_price ? parseFloat(item.cost_price) : null,
      image_url: item.image_url,
      is_active: !!item.is_active,
      is_available: !!item.is_available,
      category_id: item.category_id,
      inventory_item_id: item.inventory_item_id,
      track_inventory: !!item.track_inventory,
      created_at: item.created_at,
      updated_at: item.updated_at,
      category_name: item.category_name,
      inventory_items: item.inv_id ? {
        id: item.inv_id,
        current_stock: parseFloat(item.current_stock),
        min_stock_level: parseFloat(item.min_stock_level),
      } : null,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// Get single menu item
router.get('/items/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const items = await query('SELECT * FROM menu_items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(items[0]);
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

// Create menu item
router.post('/items', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory } = req.body;
    const id = uuidv4();

    await query(
      `INSERT INTO menu_items (id, name, description, price, cost_price, category_id, image_url, is_active, is_available, inventory_item_id, track_inventory, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [id, name, description || null, price, cost_price || null, category_id || null, image_url || null, is_active !== false, is_available !== false, inventory_item_id || null, track_inventory || false]
    );

    const items = await query('SELECT * FROM menu_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// Update menu item
router.patch('/items/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    
    const allowedFields = ['name', 'description', 'price', 'cost_price', 'category_id', 'image_url', 'is_active', 'is_available', 'inventory_item_id', 'track_inventory'];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(updates[field]);
      }
    }
    
    if (fields.length > 0) {
      fields.push('updated_at = NOW()');
      values.push(id);
      
      await query(
        `UPDATE menu_items SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const items = await query('SELECT * FROM menu_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// Delete menu item - hard delete by default
router.delete('/items/:id', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { id } = req.params;
    const { soft } = req.query;
    
    if (soft === 'true') {
      await query('UPDATE menu_items SET is_active = 0, updated_at = NOW() WHERE id = ?', [id]);
    } else {
      // Hard delete - completely remove
      await query('DELETE FROM menu_items WHERE id = ?', [id]);
    }
    
    res.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

export default router;
