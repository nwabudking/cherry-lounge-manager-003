/**
 * Database abstraction layer exports
 */

export { db } from './client';
export { 
  getEnvironmentConfig, 
  isDatabaseMode, 
  useSupabaseForReads, 
  useMySQLForReads, 
  useHybridWrites,
  type DatabaseMode 
} from './environment';
