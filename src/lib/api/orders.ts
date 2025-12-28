import apiClient from './client';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseForReads } from '@/lib/db/environment';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: string;
  table_number: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  vat_amount: number;
  service_charge: number;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: string;
  reference: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface CreateOrderData {
  order_type: string;
  table_number?: string;
  notes?: string;
  items: Array<{
    menu_item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    notes?: string;
  }>;
  discount_amount?: number;
  service_charge?: number;
  payment: {
    payment_method: string;
    amount: number;
    reference?: string;
  };
}

export interface OrderFilters {
  status?: string;
  orderType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as any;
    const candidate = v.data ?? v.orders ?? v.items ?? v.results ?? v.rows;
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
};

export const ordersApi = {
  getOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      let query = supabase
        .from('orders')
        .select('*, order_items(*), payments(*)')
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.orderType) query = query.eq('order_type', filters.orderType);
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);
      // "search" intentionally not applied here (requires server-side search semantics)

      const { data, error } = await query;
      if (!error) {
        return ensureArray<any>(data).map((o: any) => ({
          ...o,
          items: ensureArray<OrderItem>(o.order_items),
          payments: ensureArray<Payment>(o.payments),
        })) as Order[];
      }
      // Fall through to REST if available
    }

    // Docker/MySQL REST reads
    const response = await apiClient.get<Order[]>('/orders', { params: filters });
    return ensureArray<Order>(response.data);
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (orderData: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders', orderData);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/orders/${id}/status`, { status });
    return response.data;
  },

  getOrderItems: async (orderId: string): Promise<OrderItem[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      if (!error) return ensureArray<OrderItem>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get<OrderItem[]>(`/orders/${orderId}/items`);
    return ensureArray<OrderItem>(response.data);
  },

  getOrderPayments: async (orderId: string): Promise<Payment[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      if (!error) return ensureArray<Payment>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get<Payment[]>(`/orders/${orderId}/payments`);
    return ensureArray<Payment>(response.data);
  },

  addPayment: async (orderId: string, payment: Omit<Payment, 'id' | 'order_id' | 'created_at' | 'created_by'>): Promise<Payment> => {
    const response = await apiClient.post<Payment>(`/orders/${orderId}/payments`, payment);
    return response.data;
  },

  // Kitchen/Bar queue
  getKitchenQueue: async (): Promise<Order[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .in('status', ['pending', 'preparing'])
        .in('order_type', ['dine_in', 'takeaway', 'delivery'])
        .order('created_at', { ascending: true });

      if (!error) {
        return ensureArray<any>(data).map((o: any) => ({
          ...o,
          items: ensureArray<OrderItem>(o.order_items),
        })) as Order[];
      }
      // Fall through to REST if available
    }

    const response = await apiClient.get<Order[]>('/orders/queue/kitchen');
    return ensureArray<Order>(response.data);
  },

  getBarQueue: async (): Promise<Order[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .in('status', ['pending', 'preparing'])
        .eq('order_type', 'bar_only')
        .order('created_at', { ascending: true });

      if (!error) {
        return ensureArray<any>(data).map((o: any) => ({
          ...o,
          items: ensureArray<OrderItem>(o.order_items),
        })) as Order[];
      }
      // Fall through to REST if available
    }

    const response = await apiClient.get<Order[]>('/orders/queue/bar');
    return ensureArray<Order>(response.data);
  },

  // Reports
  getDailySummary: async (date?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByType: Record<string, number>;
    paymentsByMethod: Record<string, number>;
  }> => {
    const response = await apiClient.get('/orders/reports/daily', { params: { date } });
    return response.data;
  },

  getOrdersWithDetails: async (filters?: OrderFilters): Promise<Order[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      let query = supabase
        .from('orders')
        .select('*, order_items(*), payments(*)')
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.orderType) query = query.eq('order_type', filters.orderType);
      if (filters?.startDate) query = query.gte('created_at', filters.startDate);
      if (filters?.endDate) query = query.lte('created_at', filters.endDate);

      const { data, error } = await query;
      if (!error) {
        return ensureArray<any>(data).map((o: any) => ({
          ...o,
          items: ensureArray<OrderItem>(o.order_items),
          payments: ensureArray<Payment>(o.payments),
        })) as Order[];
      }
      // Fall through to REST if available
    }

    const response = await apiClient.get<Order[]>('/orders', {
      params: { ...filters, includeItems: true, includePayments: true },
    });
    return ensureArray<Order>(response.data);
  },

  getCompletedOrdersByDate: async (startDate: string, endDate: string, cashierId?: string): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders', {
      params: { status: 'completed', startDate, endDate, cashierId, includeItems: true, includePayments: true },
    });
    return ensureArray<Order>(response.data);
  },

  getOrderHistory: async (limit?: number): Promise<Order[]> => {
    // Lovable Cloud / Supabase reads
    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*), payments(*)')
        .order('created_at', { ascending: false })
        .limit(limit || 500);

      if (!error) {
        return ensureArray<any>(data).map((o: any) => ({
          ...o,
          items: ensureArray<OrderItem>(o.order_items),
          payments: ensureArray<Payment>(o.payments),
        })) as Order[];
      }
      // Fall through to REST if available
    }

    const response = await apiClient.get<Order[]>('/orders', {
      params: { includeItems: true, includePayments: true, limit: limit || 500 },
    });
    return ensureArray<Order>(response.data);
  },
};

