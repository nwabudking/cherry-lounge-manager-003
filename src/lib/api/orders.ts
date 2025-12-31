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
  customer_id?: string;
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
  createdBy?: string; // For role-based filtering - cashiers only see their own orders
}

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

export const ordersApi = {
  getOrders: async (filters?: OrderFilters): Promise<Order[]> => {
    let query = supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.orderType) query = query.eq('order_type', filters.orderType);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);
    if (filters?.createdBy) query = query.eq('created_by', filters.createdBy);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    
    return ensureArray<any>(data).map((o: any) => ({
      ...o,
      items: ensureArray<OrderItem>(o.order_items),
      payments: ensureArray<Payment>(o.payments),
    })) as Order[];
  },

  getOrder: async (id: string): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return {
      ...data,
      items: ensureArray<OrderItem>(data.order_items),
      payments: ensureArray<Payment>(data.payments),
    } as Order;
  },

  createOrder: async (orderData: CreateOrderData): Promise<Order> => {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    // ==============================================
    // STOCK VALIDATION BEFORE ORDER COMMIT
    // ==============================================
    const stockValidationErrors: string[] = [];
    const itemsToDeduct: Array<{
      menuItemId: string;
      inventoryItemId: string;
      itemName: string;
      quantity: number;
      currentStock: number;
    }> = [];

    // Check stock availability for all items that track inventory
    for (const item of orderData.items) {
      const { data: menuItem } = await supabase
        .from('menu_items')
        .select('name, inventory_item_id, track_inventory')
        .eq('id', item.menu_item_id)
        .maybeSingle();

      if (menuItem?.track_inventory && menuItem?.inventory_item_id) {
        const { data: invItem } = await supabase
          .from('inventory_items')
          .select('current_stock, name')
          .eq('id', menuItem.inventory_item_id)
          .single();

        if (invItem) {
          const currentStock = Number(invItem.current_stock);
          const requestedQty = Number(item.quantity);

          // Prevent negative stock
          if (currentStock < requestedQty) {
            stockValidationErrors.push(
              `Insufficient stock for "${menuItem.name}": ${currentStock} available, ${requestedQty} requested`
            );
          } else {
            // Queue for deduction after order is created
            itemsToDeduct.push({
              menuItemId: item.menu_item_id,
              inventoryItemId: menuItem.inventory_item_id,
              itemName: menuItem.name,
              quantity: requestedQty,
              currentStock,
            });
          }
        }
      }
    }

    // Abort if any stock validation errors
    if (stockValidationErrors.length > 0) {
      throw new Error(`Stock validation failed:\n${stockValidationErrors.join('\n')}`);
    }

    // ==============================================
    // ORDER CREATION (Atomic Transaction)
    // ==============================================
    
    // Generate order number
    const today = new Date();
    const dateStr = `${today.getFullYear().toString().slice(-2)}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    
    // Get today's order count for numbering
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfDay);
    
    const orderNumber = `ORD-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`;
    
    // Calculate totals (supports decimal quantities)
    const subtotal = orderData.items.reduce((sum, item) => {
      const qty = Number(item.quantity);
      const price = Number(item.unit_price);
      return sum + (price * qty);
    }, 0);
    const discountAmount = Number(orderData.discount_amount || 0);
    const serviceCharge = Number(orderData.service_charge || 0);
    const vatAmount = 0;
    const totalAmount = subtotal - discountAmount + serviceCharge + vatAmount;

    // 1. Create order with created_by set to current user
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        order_type: orderData.order_type,
        table_number: orderData.table_number || null,
        customer_id: orderData.customer_id || null,
        status: 'pending',
        subtotal,
        discount_amount: discountAmount,
        vat_amount: vatAmount,
        service_charge: serviceCharge,
        total_amount: totalAmount,
        notes: orderData.notes || null,
        created_by: userId,
      })
      .select()
      .single();

    if (orderError) throw new Error(orderError.message);

    // 2. Create order items (supports decimal quantities)
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      menu_item_id: item.menu_item_id,
      item_name: item.item_name,
      quantity: Number(item.quantity),
      unit_price: Number(item.unit_price),
      total_price: Number(item.unit_price) * Number(item.quantity),
      notes: item.notes || null,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw new Error(itemsError.message);

    // 3. Create payment with created_by
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: order.id,
        amount: Number(orderData.payment.amount),
        payment_method: orderData.payment.payment_method,
        reference: orderData.payment.reference || null,
        status: 'completed',
        created_by: userId,
      });

    if (paymentError) throw new Error(paymentError.message);

    // ==============================================
    // INVENTORY DEDUCTION (After successful order creation)
    // ==============================================
    for (const item of itemsToDeduct) {
      const newStock = Math.max(0, item.currentStock - item.quantity);

      // Update inventory
      await supabase
        .from('inventory_items')
        .update({ current_stock: newStock })
        .eq('id', item.inventoryItemId);

      // Record stock movement
      await supabase
        .from('stock_movements')
        .insert({
          inventory_item_id: item.inventoryItemId,
          movement_type: 'out',
          quantity: item.quantity,
          previous_stock: item.currentStock,
          new_stock: newStock,
          reference: orderNumber,
          notes: `Sale: Order ${orderNumber}`,
          created_by: userId,
        });
    }

    // Return order with pending status (kitchen/bar will update to preparing -> ready -> completed)
    return { ...order, order_number: orderNumber } as Order;
  },

  updateOrderStatus: async (id: string, status: string): Promise<Order> => {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Order;
  },

  getOrderItems: async (orderId: string): Promise<OrderItem[]> => {
    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    
    if (error) throw new Error(error.message);
    return ensureArray<OrderItem>(data);
  },

  getOrderPayments: async (orderId: string): Promise<Payment[]> => {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return ensureArray<Payment>(data);
  },

  addPayment: async (orderId: string, payment: Omit<Payment, 'id' | 'order_id' | 'created_at' | 'created_by'>): Promise<Payment> => {
    const { data, error } = await supabase
      .from('payments')
      .insert({ ...payment, order_id: orderId })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    return data as Payment;
  },

  // Kitchen/Bar queue
  getKitchenQueue: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['pending', 'preparing'])
      .in('order_type', ['dine_in', 'takeaway', 'delivery'])
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return ensureArray<any>(data).map((o: any) => ({
      ...o,
      items: ensureArray<OrderItem>(o.order_items),
    })) as Order[];
  },

  getBarQueue: async (): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('status', ['pending', 'preparing'])
      .eq('order_type', 'bar_only')
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return ensureArray<any>(data).map((o: any) => ({
      ...o,
      items: ensureArray<OrderItem>(o.order_items),
    })) as Order[];
  },

  // Reports
  getDailySummary: async (date?: string, createdBy?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    ordersByType: Record<string, number>;
    paymentsByMethod: Record<string, number>;
  }> => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    let query = supabase
      .from('orders')
      .select('*, payments(*)')
      .eq('status', 'completed')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    // Apply role-based filter for cashiers
    if (createdBy) {
      query = query.eq('created_by', createdBy);
    }

    const { data: orders, error } = await query;

    if (error) throw new Error(error.message);

    const ordersArr = ensureArray<any>(orders);
    const totalOrders = ordersArr.length;
    const totalRevenue = ordersArr.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    
    const ordersByType: Record<string, number> = {};
    const paymentsByMethod: Record<string, number> = {};

    ordersArr.forEach((o: any) => {
      ordersByType[o.order_type] = (ordersByType[o.order_type] || 0) + 1;
      const payments = ensureArray<any>(o.payments);
      payments.forEach((p: any) => {
        paymentsByMethod[p.payment_method] = (paymentsByMethod[p.payment_method] || 0) + Number(p.amount || 0);
      });
    });

    return { totalOrders, totalRevenue, ordersByType, paymentsByMethod };
  },

  getOrdersWithDetails: async (filters?: OrderFilters): Promise<Order[]> => {
    let query = supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.orderType) query = query.eq('order_type', filters.orderType);
    if (filters?.startDate) query = query.gte('created_at', filters.startDate);
    if (filters?.endDate) query = query.lte('created_at', filters.endDate);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    
    return ensureArray<any>(data).map((o: any) => ({
      ...o,
      items: ensureArray<OrderItem>(o.order_items),
      payments: ensureArray<Payment>(o.payments),
    })) as Order[];
  },

  getCompletedOrdersByDate: async (startDate: string, endDate: string, cashierId?: string): Promise<Order[]> => {
    let query = supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('status', 'completed')
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (cashierId) {
      query = query.eq('created_by', cashierId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    
    return ensureArray<any>(data).map((o: any) => ({
      ...o,
      items: ensureArray<OrderItem>(o.order_items),
      payments: ensureArray<Payment>(o.payments),
    })) as Order[];
  },

  getOrderHistory: async (limit?: number): Promise<Order[]> => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .order('created_at', { ascending: false })
      .limit(limit || 500);

    if (error) throw new Error(error.message);
    
    return ensureArray<any>(data).map((o: any) => ({
      ...o,
      items: ensureArray<OrderItem>(o.order_items),
      payments: ensureArray<Payment>(o.payments),
    })) as Order[];
  },
};
