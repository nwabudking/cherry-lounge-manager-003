import apiClient from './client';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseForReads } from '@/lib/db/environment';

export interface MenuCategory {
  id: string;
  name: string;
  category_type?: string;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  is_available: boolean;
  track_inventory: boolean;
  inventory_item_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  category_name?: string;
  inventory_items?: {
    id: string;
    current_stock: number;
    min_stock_level: number;
  } | null;
}

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as any;
    const candidate = v.data ?? v.categories ?? v.items ?? v.results ?? v.rows;
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
};

export const menuApi = {
  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error) return ensureArray<MenuCategory>(data);
      // Fall through to REST if available
    }

    // Docker/MySQL REST reads
    const response = await apiClient.get<MenuCategory[]>('/menu/categories');
    return ensureArray<MenuCategory>(response.data);
  },

  getActiveCategories: async (): Promise<MenuCategory[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error) return ensureArray<MenuCategory>(data);
      // Fall through to REST if available
    }

    // Docker/MySQL REST reads
    const response = await apiClient.get<MenuCategory[]>('/menu/categories', {
      params: { active: true },
    });
    return ensureArray<MenuCategory>(response.data);
  },

  createCategory: async (categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    const response = await apiClient.post<MenuCategory>('/menu/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id: string, categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    const response = await apiClient.patch<MenuCategory>(`/menu/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/menu/categories/${id}`);
  },

  // Menu Items
  getMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      let query = supabase
        .from('menu_items')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoryId) query = query.eq('category_id', categoryId);

      const { data, error } = await query;
      if (!error) return ensureArray<MenuItem>(data);
      // Fall through to REST if available
    }

    // Docker/MySQL REST reads
    const response = await apiClient.get<MenuItem[]>('/menu/items', {
      params: categoryId ? { categoryId } : undefined,
    });
    return ensureArray<MenuItem>(response.data);
  },

  getActiveMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      let query = supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (categoryId) query = query.eq('category_id', categoryId);

      const { data, error } = await query;
      if (error) return [];
      return ensureArray<MenuItem>(data);
    }

    // Docker/MySQL REST reads
    const response = await apiClient.get<MenuItem[]>('/menu/items', {
      params: { active: true, ...(categoryId && { categoryId }) },
    });
    return ensureArray<MenuItem>(response.data);
  },

  getMenuItem: async (id: string): Promise<MenuItem> => {
    const response = await apiClient.get<MenuItem>(`/menu/items/${id}`);
    return response.data;
  },

  createMenuItem: async (itemData: Partial<MenuItem>): Promise<MenuItem> => {
    const response = await apiClient.post<MenuItem>('/menu/items', itemData);
    return response.data;
  },

  updateMenuItem: async (id: string, itemData: Partial<MenuItem>): Promise<MenuItem> => {
    const response = await apiClient.patch<MenuItem>(`/menu/items/${id}`, itemData);
    return response.data;
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/menu/items/${id}`);
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post<{ url: string }>('/menu/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  },

  getMenuItemCount: async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/menu/items/count');
    return response.data.count;
  },
};

