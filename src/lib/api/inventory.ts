import { supabase } from '@/integrations/supabase/client';

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  unit: string;
  current_stock: number;
  min_stock_level: number;
  cost_per_unit: number | null;
  supplier: string | null;
  supplier_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export const inventoryApi = {
  // Inventory Items
  getItems: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  getActiveItems: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  getLowStockItems: async (): Promise<InventoryItem[]> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('is_active', true)
      .order('current_stock');
    if (error) throw new Error(error.message);
    return (data || []).filter(item => item.current_stock <= item.min_stock_level);
  },

  getItem: async (id: string): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  createItem: async (itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([itemData as any])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateItem: async (id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteItem: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('inventory_items')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },

  // Stock Movements
  getMovements: async (itemId?: string): Promise<StockMovement[]> => {
    let query = supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (itemId) {
      query = query.eq('inventory_item_id', itemId);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  },

  addStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get current stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', itemId)
      .single();
    
    if (itemError) throw new Error(itemError.message);
    
    const previousStock = item.current_stock;
    const newStock = previousStock + quantity;
    
    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', itemId);
    
    if (updateError) throw new Error(updateError.message);
    
    // Create movement record
    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: itemId,
        movement_type: 'in',
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        notes: notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single();
    
    if (movementError) throw new Error(movementError.message);
    return movement;
  },

  removeStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get current stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', itemId)
      .single();
    
    if (itemError) throw new Error(itemError.message);
    
    const previousStock = item.current_stock;
    const newStock = Math.max(0, previousStock - quantity);
    
    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', itemId);
    
    if (updateError) throw new Error(updateError.message);
    
    // Create movement record
    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: itemId,
        movement_type: 'out',
        quantity,
        previous_stock: previousStock,
        new_stock: newStock,
        notes: notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single();
    
    if (movementError) throw new Error(movementError.message);
    return movement;
  },

  adjustStock: async (itemId: string, newStockLevel: number, notes?: string): Promise<StockMovement> => {
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get current stock
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('current_stock')
      .eq('id', itemId)
      .single();
    
    if (itemError) throw new Error(itemError.message);
    
    const previousStock = item.current_stock;
    const quantity = Math.abs(newStockLevel - previousStock);
    
    // Update inventory
    const { error: updateError } = await supabase
      .from('inventory_items')
      .update({ current_stock: newStockLevel })
      .eq('id', itemId);
    
    if (updateError) throw new Error(updateError.message);
    
    // Create movement record
    const { data: movement, error: movementError } = await supabase
      .from('stock_movements')
      .insert({
        inventory_item_id: itemId,
        movement_type: 'adjustment',
        quantity,
        previous_stock: previousStock,
        new_stock: newStockLevel,
        notes: notes || null,
        created_by: user?.id || null,
      })
      .select()
      .single();
    
    if (movementError) throw new Error(movementError.message);
    return movement;
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  getActiveSuppliers: async (): Promise<Supplier[]> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) throw new Error(error.message);
    return data || [];
  },

  getSupplier: async (id: string): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  createSupplier: async (supplierData: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplierData as any])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  updateSupplier: async (id: string, supplierData: Partial<Supplier>): Promise<Supplier> => {
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplierData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  deleteSupplier: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('suppliers')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
  },
};
