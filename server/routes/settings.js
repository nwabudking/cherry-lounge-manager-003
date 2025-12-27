import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Configure multer for logo uploads
const uploadsDir = join(__dirname, '../uploads/logos');
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.split('.').pop();
    cb(null, `logo-${uniqueSuffix}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'));
    }
  }
});

// Get restaurant settings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const settings = await query('SELECT * FROM restaurant_settings LIMIT 1');
    res.json(settings[0] || null);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Update restaurant settings
router.patch('/', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const { name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo } = req.body;

    // Check if settings exist
    const existing = await query('SELECT id FROM restaurant_settings LIMIT 1');
    
    if (existing.length === 0) {
      // Create new settings
      const { v4: uuidv4 } = await import('uuid');
      await query(
        `INSERT INTO restaurant_settings (id, name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [uuidv4(), name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo]
      );
    } else {
      // Update existing
      await query(
        `UPDATE restaurant_settings SET name = ?, tagline = ?, address = ?, city = ?, country = ?, phone = ?, email = ?, logo_url = ?, currency = ?, timezone = ?, receipt_footer = ?, receipt_show_logo = ?, updated_at = NOW()
         WHERE id = ?`,
        [name, tagline, address, city, country, phone, email, logo_url, currency, timezone, receipt_footer, receipt_show_logo, existing[0].id]
      );
    }

    const settings = await query('SELECT * FROM restaurant_settings LIMIT 1');
    res.json(settings[0]);
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Upload logo
router.post('/logo', authMiddleware, roleMiddleware('super_admin', 'manager'), upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const logoUrl = `/uploads/logos/${req.file.filename}`;

    // Update settings with new logo URL
    const existing = await query('SELECT id FROM restaurant_settings LIMIT 1');
    
    if (existing.length === 0) {
      const { v4: uuidv4 } = await import('uuid');
      await query(
        `INSERT INTO restaurant_settings (id, logo_url, created_at, updated_at)
         VALUES (?, ?, NOW(), NOW())`,
        [uuidv4(), logoUrl]
      );
    } else {
      await query(
        'UPDATE restaurant_settings SET logo_url = ?, updated_at = NOW() WHERE id = ?',
        [logoUrl, existing[0].id]
      );
    }

    res.json({ logo_url: logoUrl });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

export default router;
