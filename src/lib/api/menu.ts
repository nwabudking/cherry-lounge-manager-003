import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { duplicateCheck } from '@/lib/utils/duplicateCheck';

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
    // Check for duplicates before insert
    if (categoryData.name) {
      const dupCheck = await duplicateCheck.checkCategory(categoryData.name);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('category', dupCheck.existingName));
      }
    }

    const insertData: TablesInsert<'menu_categories'> = {
      name: categoryData.name || 'Unnamed Category',
      category_type: categoryData.category_type,
      sort_order: categoryData.sort_order,
      is_active: categoryData.is_active ?? true,
    };

    const { data, error } = await supabase
      .from('menu_categories')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('category', categoryData.name));
      }
      throw new Error(error.message);
    }
    return data as MenuCategory;
  },

  updateCategory: async (id: string, categoryData: Partial<MenuCategory>): Promise<MenuCategory> => {
    // Check for duplicates before update
    if (categoryData.name) {
      const dupCheck = await duplicateCheck.checkCategory(categoryData.name, id);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('category', dupCheck.existingName));
      }
    }

    const updateData: TablesUpdate<'menu_categories'> = {};
    if (categoryData.name !== undefined) updateData.name = categoryData.name;
    if (categoryData.category_type !== undefined) updateData.category_type = categoryData.category_type;
    if (categoryData.sort_order !== undefined) updateData.sort_order = categoryData.sort_order;
    if (categoryData.is_active !== undefined) updateData.is_active = categoryData.is_active;

    const { data, error } = await supabase
      .from('menu_categories')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('category', categoryData.name));
      }
      throw new Error(error.message);
    }
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
      .select(`
        *,
        menu_categories(name),
        inventory_items(id, current_stock, min_stock_level)
      `)
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
    // Check for duplicates before insert
    if (itemData.name) {
      const dupCheck = await duplicateCheck.checkMenuItem(itemData.name);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('menu item', dupCheck.existingName));
      }
    }

    const insertData: TablesInsert<'menu_items'> = {
      name: itemData.name || 'Unnamed Item',
      price: itemData.price ?? 0,
      description: itemData.description,
      cost_price: itemData.cost_price,
      category_id: itemData.category_id,
      image_url: itemData.image_url,
      is_active: itemData.is_active ?? true,
      is_available: itemData.is_available ?? true,
      track_inventory: itemData.track_inventory ?? false,
      inventory_item_id: itemData.inventory_item_id,
    };

    const { data, error } = await supabase
      .from('menu_items')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('menu item', itemData.name));
      }
      throw new Error(error.message);
    }
    return data as MenuItem;
  },

  updateMenuItem: async (id: string, itemData: Partial<MenuItem>): Promise<MenuItem> => {
    // Check for duplicates before update
    if (itemData.name) {
      const dupCheck = await duplicateCheck.checkMenuItem(itemData.name, id);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('menu item', dupCheck.existingName));
      }
    }

    const updateData: TablesUpdate<'menu_items'> = {};
    if (itemData.name !== undefined) updateData.name = itemData.name;
    if (itemData.price !== undefined) updateData.price = itemData.price;
    if (itemData.description !== undefined) updateData.description = itemData.description;
    if (itemData.cost_price !== undefined) updateData.cost_price = itemData.cost_price;
    if (itemData.category_id !== undefined) updateData.category_id = itemData.category_id;
    if (itemData.image_url !== undefined) updateData.image_url = itemData.image_url;
    if (itemData.is_active !== undefined) updateData.is_active = itemData.is_active;
    if (itemData.is_available !== undefined) updateData.is_available = itemData.is_available;
    if (itemData.track_inventory !== undefined) updateData.track_inventory = itemData.track_inventory;
    if (itemData.inventory_item_id !== undefined) updateData.inventory_item_id = itemData.inventory_item_id;

    const { data, error } = await supabase
      .from('menu_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('menu item', itemData.name));
      }
      throw new Error(error.message);
    }
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
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
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
