import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';

const router = Router();

// Sample data for initial setup
const sampleCategories = [
  { name: 'Starters', category_type: 'food', sort_order: 1 },
  { name: 'Main Course', category_type: 'food', sort_order: 2 },
  { name: 'Desserts', category_type: 'food', sort_order: 3 },
  { name: 'Grills', category_type: 'food', sort_order: 4 },
  { name: 'Soft Drinks', category_type: 'drink', sort_order: 5 },
  { name: 'Cocktails', category_type: 'drink', sort_order: 6 },
  { name: 'Wine', category_type: 'drink', sort_order: 7 },
  { name: 'Beer', category_type: 'drink', sort_order: 8 },
  { name: 'Spirits', category_type: 'drink', sort_order: 9 },
];

const sampleMenuItems = [
  { name: 'Chicken Wings', price: 3500, category: 'Starters' },
  { name: 'Spring Rolls', price: 2500, category: 'Starters' },
  { name: 'Pepper Soup', price: 4000, category: 'Starters' },
  { name: 'Jollof Rice', price: 4500, category: 'Main Course' },
  { name: 'Fried Rice', price: 4500, category: 'Main Course' },
  { name: 'Pounded Yam & Egusi', price: 5500, category: 'Main Course' },
  { name: 'Amala & Ewedu', price: 4000, category: 'Main Course' },
  { name: 'Grilled Fish', price: 8500, category: 'Grills' },
  { name: 'Suya Platter', price: 6000, category: 'Grills' },
  { name: 'Grilled Chicken', price: 7000, category: 'Grills' },
  { name: 'Ice Cream', price: 2000, category: 'Desserts' },
  { name: 'Fruit Salad', price: 2500, category: 'Desserts' },
  { name: 'Cake Slice', price: 1500, category: 'Desserts' },
  { name: 'Coca-Cola', price: 500, category: 'Soft Drinks' },
  { name: 'Fanta', price: 500, category: 'Soft Drinks' },
  { name: 'Sprite', price: 500, category: 'Soft Drinks' },
  { name: 'Chapman', price: 2500, category: 'Cocktails' },
  { name: 'Mojito', price: 4000, category: 'Cocktails' },
  { name: 'Pina Colada', price: 4500, category: 'Cocktails' },
  { name: 'Red Wine (Glass)', price: 3500, category: 'Wine' },
  { name: 'White Wine (Glass)', price: 3500, category: 'Wine' },
  { name: 'Heineken', price: 1000, category: 'Beer' },
  { name: 'Star Lager', price: 800, category: 'Beer' },
  { name: 'Guinness', price: 900, category: 'Beer' },
  { name: 'Hennessy VS (Shot)', price: 3000, category: 'Spirits' },
  { name: 'Jack Daniels (Shot)', price: 2500, category: 'Spirits' },
];

const sampleStaff = [
  { email: 'manager@cherrydining.com', full_name: 'John Manager', role: 'manager' },
  { email: 'cashier1@cherrydining.com', full_name: 'Mary Cashier', role: 'cashier' },
  { email: 'cashier2@cherrydining.com', full_name: 'Peter Cashier', role: 'cashier' },
  { email: 'bar@cherrydining.com', full_name: 'Sarah Bar', role: 'bar_staff' },
  { email: 'kitchen@cherrydining.com', full_name: 'Mike Kitchen', role: 'kitchen_staff' },
  { email: 'inventory@cherrydining.com', full_name: 'Jane Inventory', role: 'inventory_officer' },
];

// Bootstrap endpoint - imports all sample data
router.post('/data', async (req, res) => {
  try {
    const results = {
      categories: 0,
      menuItems: 0,
      staff: 0,
      settings: false,
      adminCreated: false,
    };

    // Check if admin exists, if not create one
    const existingAdmin = await query('SELECT id FROM users WHERE email = ?', ['admin@cherrydining.com']);
    if (existingAdmin.length === 0) {
      const adminId = uuidv4();
      const passwordHash = await bcrypt.hash('admin123', 10);
      
      await query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', 
        [adminId, 'admin@cherrydining.com', passwordHash]);
      
      await query('INSERT INTO profiles (id, email, full_name) VALUES (?, ?, ?)', 
        [adminId, 'admin@cherrydining.com', 'System Administrator']);
      
      await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', 
        [uuidv4(), adminId, 'super_admin']);
      
      results.adminCreated = true;
    }

    // Check if settings exist, if not create
    const existingSettings = await query('SELECT id FROM restaurant_settings LIMIT 1');
    if (existingSettings.length === 0) {
      await query(`
        INSERT INTO restaurant_settings (id, name, tagline, address, city, country, phone, email, currency, timezone, receipt_footer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        'Cherry Dining & Lounge',
        '& Lounge',
        '123 Victoria Island',
        'Lagos',
        'Nigeria',
        '+234 800 000 0000',
        'info@cherrydining.com',
        'NGN',
        'Africa/Lagos',
        'Thank you for dining with us!'
      ]);
      results.settings = true;
    }

    // Insert categories if none exist
    const existingCategories = await query('SELECT COUNT(*) as count FROM menu_categories');
    if (existingCategories[0].count === 0) {
      for (const cat of sampleCategories) {
        await query(
          'INSERT INTO menu_categories (id, name, category_type, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), cat.name, cat.category_type, cat.sort_order, true]
        );
        results.categories++;
      }
    }

    // Get category IDs for menu items
    const categories = await query('SELECT id, name FROM menu_categories');
    const categoryMap = new Map(categories.map(c => [c.name, c.id]));

    // Insert menu items if none exist
    const existingItems = await query('SELECT COUNT(*) as count FROM menu_items');
    if (existingItems[0].count === 0) {
      for (const item of sampleMenuItems) {
        const categoryId = categoryMap.get(item.category);
        await query(
          'INSERT INTO menu_items (id, name, price, category_id, is_active, is_available) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), item.name, item.price, categoryId, true, true]
        );
        results.menuItems++;
      }
    }

    // Insert sample staff if none exist (besides admin)
    const existingStaff = await query('SELECT COUNT(*) as count FROM users');
    if (existingStaff[0].count <= 1) {
      const defaultPassword = await bcrypt.hash('staff123', 10);
      
      for (const staff of sampleStaff) {
        const existingUser = await query('SELECT id FROM users WHERE email = ?', [staff.email]);
        if (existingUser.length === 0) {
          const userId = uuidv4();
          
          await query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', 
            [userId, staff.email, defaultPassword]);
          
          await query('INSERT INTO profiles (id, email, full_name) VALUES (?, ?, ?)', 
            [userId, staff.email, staff.full_name]);
          
          await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', 
            [uuidv4(), userId, staff.role]);
          
          results.staff++;
        }
      }
    }

    res.json({
      success: true,
      message: 'System data initialized successfully',
      results,
      credentials: {
        admin: { email: 'admin@cherrydining.com', password: 'admin123' },
        staff: { email: 'staff emails', password: 'staff123' },
      },
    });
  } catch (error) {
    console.error('Bootstrap error:', error);
    res.status(500).json({ error: 'Failed to initialize system data', details: error.message });
  }
});

// Check if system is initialized (has super_admin)
router.get('/status', async (req, res) => {
  try {
    // Check specifically for super_admin user
    const superAdmins = await query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role = ?',
      ['super_admin']
    );
    const users = await query('SELECT COUNT(*) as count FROM users');
    const categories = await query('SELECT COUNT(*) as count FROM menu_categories');
    const menuItems = await query('SELECT COUNT(*) as count FROM menu_items');
    const settings = await query('SELECT COUNT(*) as count FROM restaurant_settings');

    const hasSuperAdmin = superAdmins[0].count > 0;

    res.json({
      initialized: hasSuperAdmin,
      hasSuperAdmin,
      needsSetup: !hasSuperAdmin,
      users: users[0].count,
      categories: categories[0].count,
      menuItems: menuItems[0].count,
      hasSettings: settings[0].count > 0,
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Initial super-admin setup (only works if no super_admin exists)
router.post('/setup-admin', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if super_admin already exists
    const existingSuperAdmin = await query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role = ?',
      ['super_admin']
    );

    if (existingSuperAdmin[0].count > 0) {
      return res.status(403).json({ 
        error: 'System already initialized. Super admin account already exists.',
        code: 'ALREADY_INITIALIZED'
      });
    }

    // Check if email is already used
    const existingUser = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create super_admin user
    const userId = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);

    await query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)', 
      [userId, email, passwordHash]);

    await query('INSERT INTO profiles (id, email, full_name) VALUES (?, ?, ?)', 
      [userId, email, full_name || 'System Administrator']);

    await query('INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)', 
      [uuidv4(), userId, 'super_admin']);

    // Create default restaurant settings if not exist
    const existingSettings = await query('SELECT id FROM restaurant_settings LIMIT 1');
    if (existingSettings.length === 0) {
      await query(`
        INSERT INTO restaurant_settings (id, name, tagline, address, city, country, phone, email, currency, timezone, receipt_footer)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        uuidv4(),
        'Cherry Dining & Lounge',
        '& Lounge',
        '123 Victoria Island',
        'Lagos',
        'Nigeria',
        '+234 800 000 0000',
        email,
        'NGN',
        'Africa/Lagos',
        'Thank you for dining with us!'
      ]);
    }

    // Log the setup action
    console.log(`[AUDIT] Initial super-admin setup completed: ${email} at ${new Date().toISOString()}`);

    res.status(201).json({
      success: true,
      message: 'Super admin account created successfully',
      user: { id: userId, email, full_name: full_name || 'System Administrator', role: 'super_admin' }
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    res.status(500).json({ error: 'Failed to create super admin account' });
  }
});

export default router;
