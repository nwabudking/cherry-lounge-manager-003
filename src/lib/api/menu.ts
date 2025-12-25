import apiClient from './client';
import { supabase } from '@/integrations/supabase/client';

export interface MenuCategory {
  id: string;
  name: string;
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
}

// Check if we're in Lovable preview (no local backend)
const isLovablePreview = (): boolean => {
  return window.location.hostname.includes('lovableproject.com') || 
         window.location.hostname.includes('lovable.app');
};

export const menuApi = {
  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .order('sort_order');
      if (error) throw new Error(error.message);
      return data || [];
    }
    const response = await apiClient.get<MenuCategory[]>('/menu/categories');
    return response.data;
  },

  getActiveCategories: async (): Promise<MenuCategory[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw new Error(error.message);
      return data || [];
    }
    const response = await apiClient.get<MenuCategory[]>('/menu/categories', {
      params: { active: true },
    });
    return response.data;
  },

  createCategory: async (categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('menu_categories')
        .insert([categoryData as any])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const response = await apiClient.post<MenuCategory>('/menu/categories', categoryData);
    return response.data;
  },

  updateCategory: async (id: string, categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('menu_categories')
        .update(categoryData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const response = await apiClient.put<MenuCategory>(`/menu/categories/${id}`, categoryData);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    if (isLovablePreview()) {
      const { error } = await supabase
        .from('menu_categories')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }
    await apiClient.delete(`/menu/categories/${id}`);
  },

  // Menu Items
  getMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    if (isLovablePreview()) {
      let query = supabase.from('menu_items').select('*').order('name');
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    }
    const response = await apiClient.get<MenuItem[]>('/menu/items', {
      params: categoryId ? { categoryId } : undefined,
    });
    return response.data;
  },

  getActiveMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    if (isLovablePreview()) {
      let query = supabase
        .from('menu_items')
        .select(`
          *,
          inventory_items (
            id,
            current_stock,
            min_stock_level
          )
        `)
        .eq('is_active', true)
        .eq('is_available', true)
        .order('name');
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data || [];
    }
    const response = await apiClient.get<MenuItem[]>('/menu/items', {
      params: { active: true, ...(categoryId && { categoryId }) },
    });
    return response.data;
  },

  getMenuItem: async (id: string): Promise<MenuItem> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const response = await apiClient.get<MenuItem>(`/menu/items/${id}`);
    return response.data;
  },

  createMenuItem: async (itemData: Partial<MenuItem>): Promise<MenuItem> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('menu_items')
        .insert([itemData as any])
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const response = await apiClient.post<MenuItem>('/menu/items', itemData);
    return response.data;
  },

  updateMenuItem: async (id: string, itemData: Partial<MenuItem>): Promise<MenuItem> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('menu_items')
        .update(itemData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    }
    const response = await apiClient.put<MenuItem>(`/menu/items/${id}`, itemData);
    return response.data;
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    if (isLovablePreview()) {
      const { error } = await supabase
        .from('menu_items')
        .update({ is_active: false })
        .eq('id', id);
      if (error) throw new Error(error.message);
      return;
    }
    await apiClient.delete(`/menu/items/${id}`);
  },

  uploadImage: async (file: File): Promise<string> => {
    if (isLovablePreview()) {
      const fileExt = file.name.split('.').pop();
      const fileName = `menu-${Date.now()}.${fileExt}`;
      const filePath = `items/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('menu-images')
        .upload(filePath, file);
      
      if (uploadError) throw new Error(uploadError.message);
      
      const { data: { publicUrl } } = supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);
      
      return publicUrl;
    }
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post<{ url: string }>('/menu/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  },
};
