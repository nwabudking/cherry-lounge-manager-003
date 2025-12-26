import jwt from 'jsonwebtoken';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const getJwtConfig = () => {
  // First, check for environment variables (used in Docker)
  if (process.env.JWT_SECRET) {
    console.log('Using JWT configuration from environment variables');
    return {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    };
  }

  // Fall back to JSON config file (used for non-Docker deployments)
  const configPath = process.env.JWT_CONFIG_PATH || join(__dirname, '../config/jwt.json');
  
  if (existsSync(configPath)) {
    try {
      console.log('Using JWT configuration from:', configPath);
      const configContent = readFileSync(configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      console.error('Failed to read JWT config from:', configPath);
    }
  }

  // Final fallback
  console.warn('WARNING: Using fallback JWT secret - change this in production!');
  return { secret: 'fallback-secret-change-in-production', expiresIn: '24h' };
};

export const generateToken = (payload, expiresIn = null) => {
  const config = getJwtConfig();
  return jwt.sign(payload, config.secret, { expiresIn: expiresIn || config.expiresIn });
};

export const verifyToken = (token) => {
  const config = getJwtConfig();
  return jwt.verify(token, config.secret);
};

export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};
