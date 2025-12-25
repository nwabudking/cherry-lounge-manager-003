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
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .eq('id', id)
        .single();
      
      if (error) throw new Error(error.message);
      return { ...data, items: data.order_items || [] };
    }
    
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  createOrder: async (orderData: CreateOrderData): Promise<Order> => {
    if (isLovablePreview()) {
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Generate order number
      const { data: orderNumber, error: orderNumError } = await supabase.rpc('generate_order_number');
      if (orderNumError) throw new Error(orderNumError.message);

      // Calculate totals
      const subtotal = orderData.items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const discountAmount = orderData.discount_amount || 0;
      const serviceCharge = orderData.service_charge || 0;
      const vatAmount = 0;
      const totalAmount = subtotal - discountAmount + serviceCharge + vatAmount;

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([{
          order_number: orderNumber,
          order_type: orderData.order_type,
          table_number: orderData.table_number || null,
          notes: orderData.notes || null,
          subtotal,
          discount_amount: discountAmount,
          service_charge: serviceCharge,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          status: 'pending',
          created_by: user?.id || null,
        }])
        .select()
        .single();

      if (orderError) throw new Error(orderError.message);

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        item_name: item.item_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw new Error(itemsError.message);

      // Create payment
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          order_id: order.id,
          amount: orderData.payment.amount,
          payment_method: orderData.payment.payment_method,
          reference: orderData.payment.reference || null,
          status: 'completed',
          created_by: user?.id || null,
        }]);

      if (paymentError) throw new Error(paymentError.message);

      // Deduct inventory for items with tracking
      for (const item of orderData.items) {
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select('inventory_item_id, track_inventory')
          .eq('id', item.menu_item_id)
          .single();

        if (menuItem?.track_inventory && menuItem.inventory_item_id) {
          const { data: invItem } = await supabase
            .from('inventory_items')
            .select('current_stock')
            .eq('id', menuItem.inventory_item_id)
            .single();

          if (invItem) {
            const previousStock = invItem.current_stock;
            const newStock = Math.max(0, previousStock - item.quantity);

            await supabase
              .from('inventory_items')
              .update({ current_stock: newStock })
              .eq('id', menuItem.inventory_item_id);

            await supabase
              .from('stock_movements')
              .insert([{
                inventory_item_id: menuItem.inventory_item_id,
                movement_type: 'out',
                quantity: item.quantity,
                previous_stock: previousStock,
                new_stock: newStock,
                reference: order.order_number,
                notes: `Sold via POS - ${item.item_name}`,
                created_by: user?.id || null,
              }]);
          }
        }
      }

      return order;
    }
    
    const response = await apiClient.post<Order>('/orders', orderData);
    return response.data;
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    }
    
    const response = await apiClient.patch<Order>(`/orders/${id}/status`, { status });
    return response.data;
  },

  getOrderItems: async (orderId: string): Promise<OrderItem[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      
      if (error) throw new Error(error.message);
      return data || [];
    }
    
    const response = await apiClient.get<OrderItem[]>(`/orders/${orderId}/items`);
    return response.data;
  },

  getOrderPayments: async (orderId: string): Promise<Payment[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('order_id', orderId);
      
      if (error) throw new Error(error.message);
      return data || [];
    }
    
    const response = await apiClient.get<Payment[]>(`/orders/${orderId}/payments`);
    return response.data;
  },

  addPayment: async (orderId: string, payment: Omit<Payment, 'id' | 'order_id' | 'created_at' | 'created_by'>): Promise<Payment> => {
    if (isLovablePreview()) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payments')
        .insert([{
          order_id: orderId,
          ...payment,
          created_by: user?.id || null,
        }])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    }
    
    const response = await apiClient.post<Payment>(`/orders/${orderId}/payments`, payment);
    return response.data;
  },

  // Kitchen/Bar queue
  getKitchenQueue: async (): Promise<Order[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .in('status', ['pending', 'preparing'])
        .in('order_type', ['dine_in', 'takeaway', 'delivery'])
        .order('created_at', { ascending: true });
      
      if (error) throw new Error(error.message);
      return (data || []).map(order => ({ ...order, items: order.order_items || [] }));
    }
    
    const response = await apiClient.get<Order[]>('/orders/queue/kitchen');
    return response.data;
  },

  getBarQueue: async (): Promise<Order[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .in('status', ['pending', 'preparing'])
        .eq('order_type', 'bar_only')
        .order('created_at', { ascending: true });
      
      if (error) throw new Error(error.message);
      return (data || []).map(order => ({ ...order, items: order.order_items || [] }));
    }
    
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
    if (isLovablePreview()) {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const startOfDay = `${targetDate}T00:00:00`;
      const endOfDay = `${targetDate}T23:59:59`;

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay)
        .eq('status', 'completed');

      if (ordersError) throw new Error(ordersError.message);

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (paymentsError) throw new Error(paymentsError.message);

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;

      const ordersByType: Record<string, number> = {};
      orders?.forEach(o => {
        ordersByType[o.order_type] = (ordersByType[o.order_type] || 0) + 1;
      });

      const paymentsByMethod: Record<string, number> = {};
      payments?.forEach(p => {
        paymentsByMethod[p.payment_method] = (paymentsByMethod[p.payment_method] || 0) + Number(p.amount);
      });

      return { totalOrders, totalRevenue, ordersByType, paymentsByMethod };
    }
    
    const response = await apiClient.get('/orders/reports/daily', { params: { date } });
    return response.data;
  },

  getOrdersWithDetails: async (filters?: OrderFilters): Promise<Order[]> => {
    if (isLovablePreview()) {
      return ordersApi.getOrders(filters);
    }
    
    const response = await apiClient.get<Order[]>('/orders', { 
      params: { ...filters, includeItems: true, includePayments: true } 
    });
    return response.data;
  },

  getCompletedOrdersByDate: async (startDate: string, endDate: string, cashierId?: string): Promise<Order[]> => {
    if (isLovablePreview()) {
      let query = supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .eq('status', 'completed')
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: false });

      if (cashierId) {
        query = query.eq('created_by', cashierId);
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data || []).map(order => ({ ...order, items: order.order_items || [] }));
    }
    
    const response = await apiClient.get<Order[]>('/orders', {
      params: { status: 'completed', startDate, endDate, cashierId, includeItems: true, includePayments: true },
    });
    return response.data;
  },

  getOrderHistory: async (limit?: number): Promise<Order[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items:order_items(*)')
        .order('created_at', { ascending: false })
        .limit(limit || 500);
      
      if (error) throw new Error(error.message);
      return (data || []).map(order => ({ ...order, items: order.order_items || [] }));
    }
    
    const response = await apiClient.get<Order[]>('/orders', {
      params: { includeItems: true, includePayments: true, limit: limit || 500 },
    });
    return response.data;
  },
};
