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

export const menuApi = {
  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .order('sort_order');
    if (error) throw new Error(error.message);
    return data || [];
  },

  getActiveCategories: async (): Promise<MenuCategory[]> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw new Error(error.message);
    return data || [];
  },

  createCategory: async (categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .insert([categoryData as any])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateCategory: async (id: string, categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    const { data, error } = await supabase
      .from('menu_categories')
      .update(categoryData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('menu_categories')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Menu Items
  getMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    let query = supabase.from('menu_items').select('*').order('name');
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  getActiveMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
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
  },

  getMenuItem: async (id: string): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  createMenuItem: async (itemData: Partial<MenuItem>): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([itemData as any])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateMenuItem: async (id: string, itemData: Partial<MenuItem>): Promise<MenuItem> => {
    const { data, error } = await supabase
      .from('menu_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('menu_items')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  uploadImage: async (file: File): Promise<string> => {
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
  },
};
