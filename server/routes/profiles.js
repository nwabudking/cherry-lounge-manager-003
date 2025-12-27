import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool.js';
import { authMiddleware, roleMiddleware } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 2 * 1024 * 1024 } });

// Get all profiles
router.get('/', authMiddleware, roleMiddleware('super_admin', 'manager'), async (req, res) => {
  try {
    const profiles = await query('SELECT id, full_name, email FROM profiles ORDER BY full_name');
    res.json(profiles);
  } catch (error) {
    console.error('Get profiles error:', error);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Get profile
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const profiles = await query('SELECT * FROM profiles WHERE id = ?', [id]);
    res.json(profiles[0] || null);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Cannot update other users profile' });
    }
    const { full_name, avatar_url } = req.body;
    await query(
      'UPDATE profiles SET full_name = ?, avatar_url = COALESCE(?, avatar_url), updated_at = NOW() WHERE id = ?',
      [full_name, avatar_url, id]
    );
    const profiles = await query('SELECT * FROM profiles WHERE id = ?', [id]);
    res.json(profiles[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload avatar
router.post('/:id/avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user.id !== id) {
      return res.status(403).json({ error: 'Cannot update other users avatar' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/avatars/${req.file.filename}`;
    await query('UPDATE profiles SET avatar_url = ?, updated_at = NOW() WHERE id = ?', [url, id]);
    res.json({ url });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

export default router;
