/**
 * Unified Database Client - Simplified version
 * Routes operations to REST API (MySQL) in offline mode, Supabase in online mode
 */

import apiClient from '@/lib/api/client';
import { getEnvironmentConfig, useMySQLForReads } from './environment';

export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

export interface MutationResult<T> {
  data: T | null;
  error: Error | null;
}

// Helper to handle API errors
function handleApiError(error: unknown): Error {
  if (error && typeof error === 'object') {
    const err = error as { response?: { data?: { error?: string } }; message?: string };
    if (err.response?.data?.error) return new Error(err.response.data.error);
    if (err.message) return new Error(err.message);
  }
  return new Error('Unknown API error');
}

/**
 * Map table names to API endpoints
 */
function getApiEndpoint(table: string): string {
  const mapping: Record<string, string> = {
    menu_categories: '/menu/categories',
    menu_items: '/menu/items',
    inventory_items: '/inventory/items',
    stock_movements: '/inventory/movements',
    suppliers: '/suppliers',
    orders: '/orders',
    order_items: '/orders/items',
    payments: '/payments',
    profiles: '/profiles',
    user_roles: '/staff/roles',
    restaurant_settings: '/settings',
  };
  
  return mapping[table] || `/${table}`;
}

/**
 * Database client - uses REST API for all operations
 * This ensures consistency between Supabase and MySQL modes
 */
export const db = {
  /**
   * Select query via REST API
   */
  async select<T>(
    table: string,
    options?: {
      filter?: Record<string, unknown>;
      limit?: number;
      single?: boolean;
    }
  ): Promise<QueryResult<T>> {
    try {
      const endpoint = getApiEndpoint(table);
      const params: Record<string, unknown> = {};
      
      if (options?.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params[key] = value;
          }
        });
      }
      
      if (options?.limit) {
        params.limit = options.limit;
      }
      
      const response = await apiClient.get(endpoint, { params });
      
      if (options?.single) {
        const data = Array.isArray(response.data) ? response.data[0] : response.data;
        return { data: data as T, error: null };
      }
      
      return { data: response.data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  },
  
  /**
   * Insert operation via REST API
   */
  async insert<T>(
    table: string,
    data: Partial<T>
  ): Promise<MutationResult<T>> {
    try {
      const endpoint = getApiEndpoint(table);
      const response = await apiClient.post(endpoint, data);
      return { data: response.data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  },
  
  /**
   * Update operation via REST API
   */
  async update<T>(
    table: string,
    id: string,
    data: Partial<T>
  ): Promise<MutationResult<T>> {
    try {
      const endpoint = `${getApiEndpoint(table)}/${id}`;
      const response = await apiClient.patch(endpoint, data);
      return { data: response.data as T, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  },
  
  /**
   * Delete operation via REST API
   */
  async delete(
    table: string,
    id: string,
    options?: { hardDelete?: boolean }
  ): Promise<MutationResult<void>> {
    try {
      const endpoint = `${getApiEndpoint(table)}/${id}`;
      
      if (options?.hardDelete) {
        await apiClient.delete(endpoint, { params: { hard: true } });
      } else {
        await apiClient.delete(endpoint);
      }
      
      return { data: null, error: null };
    } catch (error) {
      return { data: null, error: handleApiError(error) };
    }
  },
  
  /**
   * Check if using MySQL/offline mode
   */
  isOfflineMode(): boolean {
    return useMySQLForReads();
  },
  
  /**
   * Get current environment config
   */
  getConfig() {
    return getEnvironmentConfig();
  },
};

export default db;
