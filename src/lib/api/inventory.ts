import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { duplicateCheck } from '@/lib/utils/duplicateCheck';

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  category_id: string | null;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  cost_per_unit: number | null;
  supplier: string | null;
  supplier_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  menu_categories?: {
    id: string;
    name: string;
  } | null;
}

export interface StockMovement {
  id: string;
  inventory_item_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

export const inventoryApi = {
  // Inventory Items
  getItems: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return ensureArray<InventoryItem>(data);
  },

  getActiveItems: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return ensureArray<InventoryItem>(data);
  },

  getLowStockItems: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true);

    if (error) return [];
    const items = ensureArray<InventoryItem>(data);
    return items.filter((i) => Number(i.current_stock) <= Number(i.min_stock_level));
  },

  getItem: async (id: string): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as InventoryItem;
  },

  createItem: async (itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    // Check for duplicates before insert
    if (itemData.name) {
      const dupCheck = await duplicateCheck.checkInventoryItem(itemData.name);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('inventory item', dupCheck.existingName));
      }
    }

    const insertData: TablesInsert<'inventory_items'> = {
      name: itemData.name || 'Unnamed Item',
      category: itemData.category,
      category_id: itemData.category_id,
      unit: itemData.unit,
      current_stock: itemData.current_stock ?? 0,
      min_stock_level: itemData.min_stock_level ?? 10,
      cost_per_unit: itemData.cost_per_unit,
      supplier: itemData.supplier,
      supplier_id: itemData.supplier_id,
      is_active: itemData.is_active ?? true,
    };

    const { data, error } = await supabase
      .from('inventory_items')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('inventory item', itemData.name));
      }
      throw new Error(error.message);
    }
    return data as InventoryItem;
  },

  updateItem: async (id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    // Check for duplicates before update (exclude current item)
    if (itemData.name) {
      const dupCheck = await duplicateCheck.checkInventoryItem(itemData.name, id);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('inventory item', dupCheck.existingName));
      }
    }

    const updateData: TablesUpdate<'inventory_items'> = {};
    if (itemData.name !== undefined) updateData.name = itemData.name;
    if (itemData.category !== undefined) updateData.category = itemData.category;
    if (itemData.category_id !== undefined) updateData.category_id = itemData.category_id;
    if (itemData.unit !== undefined) updateData.unit = itemData.unit;
    if (itemData.current_stock !== undefined) updateData.current_stock = itemData.current_stock;
    if (itemData.min_stock_level !== undefined) updateData.min_stock_level = itemData.min_stock_level;
    if (itemData.cost_per_unit !== undefined) updateData.cost_per_unit = itemData.cost_per_unit;
    if (itemData.supplier !== undefined) updateData.supplier = itemData.supplier;
    if (itemData.supplier_id !== undefined) updateData.supplier_id = itemData.supplier_id;
    if (itemData.is_active !== undefined) updateData.is_active = itemData.is_active;

    const { data, error } = await supabase
      .from('inventory_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('inventory item', itemData.name));
      }
      throw new Error(error.message);
    }
    return data as InventoryItem;
  },

  deleteItem: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  },

  // Stock Movements
  getMovements: async (itemId?: string): Promise<StockMovement[]> => {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (itemId) query = query.eq('inventory_item_id', itemId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ensureArray<StockMovement>(data);
  },

  addStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    // Get current stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', itemId)
      .single();
    
    if (itemError) throw new Error(itemError.message);
    
    const previousStock = Number(item.current_stock);
    const newStock = previousStock + quantity;

    // Update inventory
    await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', itemId);

    // Create movement record
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: itemId,
        movement_type: 'in',
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        notes,
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as StockMovement;
  },

  removeStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    // Get current stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', itemId)
      .single();
    
    if (itemError) throw new Error(itemError.message);
    
    const previousStock = Number(item.current_stock);
    const newStock = Math.max(0, previousStock - quantity);

    // Update inventory
    await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', itemId);

    // Create movement record
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: itemId,
        movement_type: 'out',
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        notes,
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as StockMovement;
  },

  adjustStock: async (itemId: string, newStockLevel: number, notes?: string): Promise<StockMovement> => {
    // Get current stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', itemId)
      .single();
    
    if (itemError) throw new Error(itemError.message);
    
    const previousStock = Number(item.current_stock);
    const quantity = Math.abs(newStockLevel - previousStock);

    // Update inventory
    await supabase
      .from('inventory_items')
      .update({ current_stock: newStockLevel })
      .eq('id', itemId);

    // Create movement record
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: itemId,
        movement_type: 'adjustment',
        quantity,
        previous_stock: previousStock,
        new_stock: newStockLevel,
        notes,
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as StockMovement;
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return ensureArray<Supplier>(data);
  },

  getActiveSuppliers: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return ensureArray<Supplier>(data);
  },

  getSupplier: async (id: string): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  createSupplier: async (supplierData: Partial<Supplier>): Promise<Supplier> => {
    // Check for duplicates before insert
    if (supplierData.name) {
      const dupCheck = await duplicateCheck.checkSupplier(supplierData.name);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('supplier', dupCheck.existingName));
      }
    }

    const insertData: TablesInsert<'suppliers'> = {
      name: supplierData.name || 'Unnamed Supplier',
      contact_person: supplierData.contact_person,
      phone: supplierData.phone,
      email: supplierData.email,
      address: supplierData.address,
      notes: supplierData.notes,
      is_active: supplierData.is_active ?? true,
    };

    const { data, error } = await supabase
      .from('suppliers')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('supplier', supplierData.name));
      }
      throw new Error(error.message);
    }
    return data as Supplier;
  },

  updateSupplier: async (id: string, supplierData: Partial<Supplier>): Promise<Supplier> => {
    // Check for duplicates before update
    if (supplierData.name) {
      const dupCheck = await duplicateCheck.checkSupplier(supplierData.name, id);
      if (dupCheck.isDuplicate) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('supplier', dupCheck.existingName));
      }
    }

    const updateData: TablesUpdate<'suppliers'> = {};
    if (supplierData.name !== undefined) updateData.name = supplierData.name;
    if (supplierData.contact_person !== undefined) updateData.contact_person = supplierData.contact_person;
    if (supplierData.phone !== undefined) updateData.phone = supplierData.phone;
    if (supplierData.email !== undefined) updateData.email = supplierData.email;
    if (supplierData.address !== undefined) updateData.address = supplierData.address;
    if (supplierData.notes !== undefined) updateData.notes = supplierData.notes;
    if (supplierData.is_active !== undefined) updateData.is_active = supplierData.is_active;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      if (duplicateCheck.isDuplicateError(error)) {
        throw new Error(duplicateCheck.getDuplicateErrorMessage('supplier', supplierData.name));
      }
      throw new Error(error.message);
    }
    return data as Supplier;
  },

  deleteSupplier: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(error.message);
  },
};
