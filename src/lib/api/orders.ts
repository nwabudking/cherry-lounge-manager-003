import apiClient from './client';
import { supabase } from '@/integrations/supabase/client';

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

// Check if we're in Lovable preview (no local backend)
const isLovablePreview = (): boolean => {
  return window.location.hostname.includes('lovableproject.com') || 
         window.location.hostname.includes('lovable.app');
};

export const ordersApi = {
  getOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    if (isLovablePreview()) {
      let query = supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.orderType) {
        query = query.eq('order_type', filters.orderType);
      }
      if (filters?.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters?.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters?.search) {
        query = query.ilike('order_number', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      
      return (data || []).map(order => ({
        ...order,
        items: order.order_items || [],
      }));
    }
    
    const response = await apiClient.get<Order[]>('/orders', { params: filters });
    return response.data;
  },

  getOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders', data);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/orders/${id}/status`, { status });
    return response.data;
  },

  getOrderItems: async (orderId: string): Promise<OrderItem[]> => {
    const response = await apiClient.get<OrderItem[]>(`/orders/${orderId}/items`);
    return response.data;
  },

  getOrderPayments: async (orderId: string): Promise<Payment[]> => {
    const response = await apiClient.get<Payment[]>(`/orders/${orderId}/payments`);
    return response.data;
  },

  addPayment: async (orderId: string, payment: Omit<Payment, 'id' | 'order_id' | 'created_at' | 'created_by'>): Promise<Payment> => {
    const response = await apiClient.post<Payment>(`/orders/${orderId}/payments`, payment);
    return response.data;
  },

  // Kitchen/Bar queue
  getKitchenQueue: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/queue/kitchen');
    return response.data;
  },

  getBarQueue: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/queue/bar');
    return response.data;
  },

  // Reports
  getDailySummary: async (date?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByType: Record<string, number>;
    paymentsByMethod: Record<string, number>;
  }> => {
    const response = await apiClient.get('/orders/reports/daily', {
      params: { date },
    });
    return response.data;
  },

  getOrdersWithDetails: async (filters?: OrderFilters & { includeItems?: boolean; includePayments?: boolean }): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders', { 
      params: { 
        ...filters, 
        includeItems: true, 
        includePayments: true 
      } 
    });
    return response.data;
  },

  getCompletedOrdersByDate: async (startDate: string, endDate: string, cashierId?: string): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders', {
      params: {
        status: 'completed',
        startDate,
        endDate,
        cashierId,
        includeItems: true,
        includePayments: true,
      },
    });
    return response.data;
  },

  getOrderHistory: async (limit?: number): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders', {
      params: {
        includeItems: true,
        includePayments: true,
        limit: limit || 500,
      },
    });
    return response.data;
  },
};
