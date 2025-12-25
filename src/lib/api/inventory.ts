import apiClient from './client';
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

// Check if we're in Lovable preview (no local backend)
const isLovablePreview = (): boolean => {
  return window.location.hostname.includes('lovableproject.com') || 
         window.location.hostname.includes('lovable.app');
};

export const inventoryApi = {
  // Inventory Items
  getItems: async (): Promise<InventoryItem[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    }
    const response = await apiClient.get<InventoryItem[]>('/inventory/items');
    return response.data;
  },

  getActiveItems: async (): Promise<InventoryItem[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw new Error(error.message);
      return data || [];
    }
    const response = await apiClient.get<InventoryItem[]>('/inventory/items', {
      params: { active: true },
    });
    return response.data;
  },

  getLowStockItems: async (): Promise<InventoryItem[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('is_active', true)
        .or('current_stock.lte.min_stock_level,current_stock.eq.0')
        .order('current_stock');
      if (error) throw new Error(error.message);
      // Filter in JS since the OR with column reference is tricky
      return (data || []).filter(item => item.current_stock <= item.min_stock_level);
    }
    const response = await apiClient.get<InventoryItem[]>('/inventory/items/low-stock');
    return response.data;
  },

  getItem: async (id: string): Promise<InventoryItem> => {
    const response = await apiClient.get<InventoryItem>(`/inventory/items/${id}`);
    return response.data;
  },

  createItem: async (data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await apiClient.post<InventoryItem>('/inventory/items', data);
    return response.data;
  },

  updateItem: async (id: string, data: Partial<InventoryItem>): Promise<InventoryItem> => {
    const response = await apiClient.put<InventoryItem>(`/inventory/items/${id}`, data);
    return response.data;
  },

  deleteItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/inventory/items/${id}`);
  },

  // Stock Movements
  getMovements: async (itemId?: string): Promise<StockMovement[]> => {
    const response = await apiClient.get<StockMovement[]>('/inventory/movements', {
      params: itemId ? { itemId } : undefined,
    });
    return response.data;
  },

  addStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    const response = await apiClient.post<StockMovement>(`/inventory/items/${itemId}/add-stock`, {
      quantity,
      notes,
    });
    return response.data;
  },

  removeStock: async (itemId: string, quantity: number, notes?: string): Promise<StockMovement> => {
    const response = await apiClient.post<StockMovement>(`/inventory/items/${itemId}/remove-stock`, {
      quantity,
      notes,
    });
    return response.data;
  },

  adjustStock: async (itemId: string, newStock: number, notes?: string): Promise<StockMovement> => {
    const response = await apiClient.post<StockMovement>(`/inventory/items/${itemId}/adjust-stock`, {
      newStock,
      notes,
    });
    return response.data;
  },

  // Suppliers
  getSuppliers: async (): Promise<Supplier[]> => {
    const response = await apiClient.get<Supplier[]>('/suppliers');
    return response.data;
  },

  getActiveSuppliers: async (): Promise<Supplier[]> => {
    const response = await apiClient.get<Supplier[]>('/suppliers', {
      params: { active: true },
    });
    return response.data;
  },

  getSupplier: async (id: string): Promise<Supplier> => {
    const response = await apiClient.get<Supplier>(`/suppliers/${id}`);
    return response.data;
  },

  createSupplier: async (data: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.post<Supplier>('/suppliers', data);
    return response.data;
  },

  updateSupplier: async (id: string, data: Partial<Supplier>): Promise<Supplier> => {
    const response = await apiClient.put<Supplier>(`/suppliers/${id}`, data);
    return response.data;
  },

  deleteSupplier: async (id: string): Promise<void> => {
    await apiClient.delete(`/suppliers/${id}`);
  },
};
