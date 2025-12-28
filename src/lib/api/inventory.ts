import { supabase } from '@/integrations/supabase/client';

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
    const { data, error } = await supabase
      .from('inventory_items')
      .insert(itemData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as InventoryItem;
  },

  updateItem: async (id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
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
    const { data, error } = await supabase
      .from('suppliers')
      .insert(supplierData)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Supplier;
  },

  updateSupplier: async (id: string, supplierData: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplierData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
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
