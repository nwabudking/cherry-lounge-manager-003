import { supabase } from '@/integrations/supabase/client';

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
  category_name?: string;
  inventory_items?: {
    id: string;
    current_stock: number;
    min_stock_level: number;
  } | null;
}

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

export const menuApi = {
  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return ensureArray<MenuCategory>(data);
  },

  getActiveCategories: async (): Promise<MenuCategory[]> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return ensureArray<MenuCategory>(data);
  },

  createCategory: async (categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert(categoryData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as MenuCategory;
  },

  updateCategory: async (id: string, categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as MenuCategory;
  },

  deleteCategory: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('menu_categories')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  },

  // Menu Items
  getMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    let query = supabase
      .from('menu_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (categoryId) query = query.eq('category_id', categoryId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ensureArray<MenuItem>(data);
  },

  getActiveMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
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
  },

  getMenuItem: async (id: string): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as MenuItem;
  },

  createMenuItem: async (itemData: Partial<MenuItem>): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(itemData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as MenuItem;
  },

  updateMenuItem: async (id: string, itemData: Partial<MenuItem>): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as MenuItem;
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  },

  uploadImage: async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID?.() || Date.now()}.${fileExt}`;
    const filePath = `menu/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    const { data } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  getMenuItemCount: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (error) throw new Error(error.message);
    return count || 0;
  },
};
