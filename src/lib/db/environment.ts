/**
 * Environment detection and database mode configuration
 * Determines whether to use Supabase (online), MySQL via REST (offline), or both (hybrid)
 */

export type DatabaseMode = 'supabase' | 'mysql' | 'hybrid';

interface EnvironmentConfig {
  mode: DatabaseMode;
  supabaseAvailable: boolean;
  mysqlAvailable: boolean;
  apiBaseUrl: string;
}

// Check if we're running in a Docker/offline environment
function isOfflineEnvironment(): boolean {
  // Check for REST API URL (indicates Docker deployment)
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && apiUrl !== '/api') {
    return true;
  }
  
  // Check for explicit offline mode flag
  if (import.meta.env.VITE_OFFLINE_MODE === 'true') {
    return true;
  }
  
  // Check if Supabase is NOT configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (!supabaseUrl || supabaseUrl === 'undefined') {
    return true;
  }
  
  return false;
}

// Check if Supabase is configured
function hasSupabaseConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return !!(url && key && url !== 'undefined' && key !== 'undefined');
}

// Check if MySQL/REST API is configured
function hasMySQLConfig(): boolean {
  // Only treat MySQL REST as "configured" if we're explicitly in offline/Docker mode
  // or the project has a real API URL provided.
  return isOfflineEnvironment() || !!import.meta.env.VITE_API_URL;
}

// Determine the database mode
function detectDatabaseMode(): DatabaseMode {
  const supabase = hasSupabaseConfig();
  const mysql = hasMySQLConfig();
  
  // Explicit mode override
  const explicitMode = import.meta.env.VITE_DB_MODE as DatabaseMode | undefined;
  if (explicitMode && ['supabase', 'mysql', 'hybrid'].includes(explicitMode)) {
    return explicitMode;
  }
  
  // If both are available, use hybrid (write to both, read from primary)
  if (supabase && mysql && !isOfflineEnvironment()) {
    return 'hybrid';
  }
  
  // Offline environment = MySQL only
  if (isOfflineEnvironment()) {
    return 'mysql';
  }
  
  // Online environment = Supabase
  if (supabase) {
    return 'supabase';
  }
  
  // Fallback to MySQL (Docker default)
  return 'mysql';
}

// Cached environment config
let cachedConfig: EnvironmentConfig | null = null;

export function getEnvironmentConfig(): EnvironmentConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  cachedConfig = {
    mode: detectDatabaseMode(),
    supabaseAvailable: hasSupabaseConfig(),
    mysqlAvailable: hasMySQLConfig(),
    apiBaseUrl: import.meta.env.VITE_API_URL || '/api',
  };
  
  console.log('[Environment] Database mode:', cachedConfig.mode, {
    supabase: cachedConfig.supabaseAvailable,
    mysql: cachedConfig.mysqlAvailable,
  });
  
  return cachedConfig;
}

// Helper to check current mode
export function isDatabaseMode(mode: DatabaseMode): boolean {
  return getEnvironmentConfig().mode === mode;
}

export function hasAnyDatabaseConfigured(): boolean {
  const config = getEnvironmentConfig();
  return config.supabaseAvailable || config.mysqlAvailable;
}

export function assertDatabaseConfigured(): void {
  if (!hasAnyDatabaseConfigured()) {
    throw new Error(
      'No database configured. Configure Lovable Cloud or set VITE_API_URL for MySQL REST.'
    );
  }
}

// Helper to check if Supabase should be used for reads
export function useSupabaseForReads(): boolean {
  const config = getEnvironmentConfig();
  return config.mode === 'supabase' || (config.mode === 'hybrid' && config.supabaseAvailable);
}

// Helper to check if MySQL should be used for reads
export function useMySQLForReads(): boolean {
  const config = getEnvironmentConfig();
  return config.mode === 'mysql' || (config.mode === 'hybrid' && config.mysqlAvailable);
}

// Helper to check if writes should go to both databases
export function useHybridWrites(): boolean {
  return getEnvironmentConfig().mode === 'hybrid';
}

// Reset cached config (useful for testing)
export function resetEnvironmentConfig(): void {
  cachedConfig = null;
}
