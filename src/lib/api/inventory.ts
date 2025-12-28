import apiClient from './client';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseForReads } from '@/lib/db/environment';

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
  // Joined data
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
  if (value && typeof value === 'object') {
    const v = value as any;
    const candidate = v.data ?? v.items ?? v.results ?? v.rows;
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
};

export const inventoryApi = {
  // Inventory Items
  getItems: async (): Promise<InventoryItem[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) return ensureArray<InventoryItem>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get<InventoryItem[]>('/inventory/items');
    return ensureArray<InventoryItem>(response.data);
  },

  getActiveItems: async (): Promise<InventoryItem[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (!error) return ensureArray<InventoryItem>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get<InventoryItem[]>('/inventory/items', {
      params: { active: true },
    });
    return ensureArray<InventoryItem>(response.data);
  },

  getLowStockItems: async (): Promise<InventoryItem[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      // "Low stock" = current_stock <= min_stock_level
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true);

      // The rpc call above is never executed; it only satisfies TS narrowing in some builds.
      // We compute low-stock client-side to keep this query simple and portable.
      if (error) return [];
      const items = ensureArray<InventoryItem>(data);
      return items.filter((i) => Number(i.current_stock) <= Number(i.min_stock_level));
    }

    // Docker/MySQL REST reads
    const response = await apiClient.get<InventoryItem[]>('/inventory/items/low-stock');
    return ensureArray<InventoryItem>(response.data);
  },

  getItem: async (id: string): Promise<InventoryItem> => {
    const response = await apiClient.get<InventoryItem>(`/inventory/items/${id}`);
    return response.data;
  },

  createItem: async (itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await apiClient.post<InventoryItem>('/inventory/items', itemData);
    return response.data;
  },

  updateItem: async (id: string, itemData: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await apiClient.patch<InventoryItem>(`/inventory/items/${id}`, itemData);
    return response.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/items/${id}`);
  },

  // Stock Movements
  getMovements: async (itemId?: string): Promise<StockMovement[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      let query = supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (itemId) query = query.eq('inventory_item_id', itemId);

      const { data, error } = await query;
      if (!error) return ensureArray<StockMovement>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get<StockMovement[]>('/inventory/movements', {
      params: itemId ? { itemId } : undefined,
    });
    return ensureArray<StockMovement>(response.data);
  },

  addStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    const response = await apiClient.post<StockMovement>('/inventory/movements', {
      inventory_item_id: itemId,
      movement_type: 'in',
      quantity,
      notes,
    });
    return response.data;
  },

  removeStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    const response = await apiClient.post<StockMovement>('/inventory/movements', {
      inventory_item_id: itemId,
      movement_type: 'out',
      quantity,
      notes,
    });
    return response.data;
  },

  adjustStock: async (itemId: string, newStockLevel: number, notes?: string): Promise<StockMovement> => {
    const response = await apiClient.post<StockMovement>('/inventory/movements', {
      inventory_item_id: itemId,
      movement_type: 'adjustment',
      new_stock: newStockLevel,
      notes,
    });
    return response.data;
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) return ensureArray<Supplier>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get<Supplier[]>('/suppliers');
    return ensureArray<Supplier>(response.data);
  },

  getActiveSuppliers: async (): Promise<Supplier[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (!error) return ensureArray<Supplier>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get<Supplier[]>('/suppliers', {
      params: { active: true },
    });
    return ensureArray<Supplier>(response.data);
  },

  getSupplier: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(`/suppliers/${id}`);
    return response.data;
  },

  createSupplier: async (supplierData: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', supplierData);
    return response.data;
  },

  updateSupplier: async (id: string, supplierData: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.patch<Supplier>(`/suppliers/${id}`, supplierData);
    return response.data;
  },

  deleteSupplier: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};

