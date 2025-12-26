import mysql from 'mysql2/promise';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Get database configuration from environment variables or JSON file
const getDbConfig = () => {
  // First, check for environment variables (used in Docker)
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    console.log('Using database configuration from environment variables');
    return {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '3306', 10),
      database: process.env.DB_NAME || 'cherry_dining',
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10)
    };
  }

  // Fall back to JSON config file (used for non-Docker deployments)
  const configPath = process.env.DB_CONFIG_PATH || join(__dirname, '../config/db.json');
  
  if (!existsSync(configPath)) {
    console.error('Database config file not found:', configPath);
    console.error('Either set DB_HOST, DB_USER, DB_PASSWORD environment variables');
    console.error('or create a config file at:', configPath);
    throw new Error('No database configuration found');
  }

  try {
    console.log('Using database configuration from:', configPath);
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Failed to read database config from:', configPath);
    throw error;
  }
};

let pool = null;

export const getPool = () => {
  if (!pool) {
    const config = getDbConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionLimit: config.connectionLimit || 10,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    console.log(`MySQL pool created for ${config.host}:${config.port}/${config.database}`);
  }
  return pool;
};

export const query = async (sql, params = []) => {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const getConnection = async () => {
  const pool = getPool();
  return pool.getConnection();
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
