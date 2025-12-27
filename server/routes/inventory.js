import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const router = Router();

// Get low stock items
router.get('/items/low-stock', authMiddleware, async (req, res) => {
  try {
    const items = await query(
      'SELECT * FROM inventory_items WHERE is_active = 1 AND current_stock <= min_stock_level ORDER BY current_stock ASC'
    );
    res.json(items);
  } catch (error) {
    console.error('Get low stock items error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// Get all inventory items
router.get('/items', authMiddleware, async (req, res) => {
  try {
    const { active } = req.query;
    
    let sql = 'SELECT * FROM inventory_items WHERE 1=1';
    const params = [];

    if (active === 'true') {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY name';

    const items = await query(sql, params);
    res.json(items);
  } catch (error) {
    console.error('Get inventory items error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory items' });
  }
});

// Get single inventory item
router.get('/items/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    res.json(items[0]);
  } catch (error) {
    console.error('Get inventory item error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory item' });
  }
});

// Create inventory item
router.post('/items', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id } = req.body;
    const id = uuidv4();

    await query(
      `INSERT INTO inventory_items (id, name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier, supplier_id, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [id, name, category || null, unit || 'pcs', current_stock || 0, min_stock_level || 0, cost_per_unit || null, supplier || null, supplier_id || null]
    );

    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Create inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// Update inventory item
router.patch('/items/:id', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const fields = [];
    const values = [];
    
    const allowedFields = ['name', 'category', 'unit', 'current_stock', 'min_stock_level', 'cost_per_unit', 'supplier', 'supplier_id', 'is_active'];
    
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
        `UPDATE inventory_items SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
    }

    const items = await query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    res.json(items[0]);
  } catch (error) {
    console.error('Update inventory item error:', error);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// Delete (soft) inventory item
router.delete('/items/:id', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { id } = req.params;
    await query('UPDATE inventory_items SET is_active = 0 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete inventory item error:', error);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

// Stock movement
router.post('/movements', authMiddleware, roleMiddleware('super_admin', 'manager', 'inventory_officer'), async (req, res) => {
  try {
    const { inventory_item_id, movement_type, quantity, new_stock, notes } = req.body;

    // Get current stock
    const items = await query('SELECT current_stock FROM inventory_items WHERE id = ?', [inventory_item_id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }

    const previousStock = parseFloat(items[0].current_stock);
    let finalNewStock;

    if (movement_type === 'in') {
      finalNewStock = previousStock + quantity;
    } else if (movement_type === 'out') {
      finalNewStock = Math.max(0, previousStock - quantity);
    } else if (movement_type === 'adjustment') {
      finalNewStock = new_stock !== undefined ? new_stock : quantity;
    } else {
      return res.status(400).json({ error: 'Invalid movement type' });
    }

    // Create movement record
    const movementId = uuidv4();
    const movementQuantity = movement_type === 'adjustment' ? Math.abs(finalNewStock - previousStock) : quantity;
    
    await query(
      `INSERT INTO stock_movements (id, inventory_item_id, movement_type, quantity, previous_stock, new_stock, notes, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [movementId, inventory_item_id, movement_type, movementQuantity, previousStock, finalNewStock, notes || null, req.user.id]
    );

    // Update stock
    await query(
      'UPDATE inventory_items SET current_stock = ?, updated_at = NOW() WHERE id = ?',
      [finalNewStock, inventory_item_id]
    );

    const movement = await query('SELECT * FROM stock_movements WHERE id = ?', [movementId]);
    res.json(movement[0]);
  } catch (error) {
    console.error('Stock movement error:', error);
    res.status(500).json({ error: 'Failed to record stock movement' });
  }
});

// Get stock movements
router.get('/movements', authMiddleware, async (req, res) => {
  try {
    const { itemId } = req.query;
    
    let sql = 'SELECT * FROM stock_movements WHERE 1=1';
    const params = [];

    if (itemId) {
      sql += ' AND inventory_item_id = ?';
      params.push(itemId);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const movements = await query(sql, params);
    res.json(movements);
  } catch (error) {
    console.error('Get movements error:', error);
    res.status(500).json({ error: 'Failed to fetch movements' });
  }
});

export default router;
