import { supabase } from '@/integrations/supabase/client';

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  loyalty_points: number;
  total_orders: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[];
}

export interface UpdateCustomerData extends Partial<CreateCustomerData> {
  loyalty_points?: number;
  is_active?: boolean;
}

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  return [];
};

export const customersApi = {
  getCustomers: async (search?: string): Promise<Customer[]> => {
    let query = supabase
      .from('customers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return ensureArray<Customer>(data);
  },

  getCustomer: async (id: string): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  createCustomer: async (customerData: CreateCustomerData): Promise<Customer> => {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customerData.name.trim(),
        phone: customerData.phone?.trim() || null,
        email: customerData.email?.trim() || null,
        address: customerData.address?.trim() || null,
        notes: customerData.notes?.trim() || null,
        tags: customerData.tags || [],
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  updateCustomer: async (id: string, customerData: UpdateCustomerData): Promise<Customer> => {
    const updateData: Record<string, unknown> = {};
    
    if (customerData.name !== undefined) updateData.name = customerData.name.trim();
    if (customerData.phone !== undefined) updateData.phone = customerData.phone?.trim() || null;
    if (customerData.email !== undefined) updateData.email = customerData.email?.trim() || null;
    if (customerData.address !== undefined) updateData.address = customerData.address?.trim() || null;
    if (customerData.notes !== undefined) updateData.notes = customerData.notes?.trim() || null;
    if (customerData.tags !== undefined) updateData.tags = customerData.tags;
    if (customerData.loyalty_points !== undefined) updateData.loyalty_points = customerData.loyalty_points;
    if (customerData.is_active !== undefined) updateData.is_active = customerData.is_active;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  deleteCustomer: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('customers')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  addLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const { data: customer } = await supabase
      .from('customers')
      .select('loyalty_points')
      .eq('id', id)
      .single();

    const currentPoints = customer?.loyalty_points || 0;
    
    const { data, error } = await supabase
      .from('customers')
      .update({ loyalty_points: currentPoints + points })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  redeemLoyaltyPoints: async (id: string, points: number): Promise<Customer> => {
    const { data: customer } = await supabase
      .from('customers')
      .select('loyalty_points')
      .eq('id', id)
      .single();

    const currentPoints = customer?.loyalty_points || 0;
    if (currentPoints < points) {
      throw new Error('Insufficient loyalty points');
    }
    
    const { data, error } = await supabase
      .from('customers')
      .update({ loyalty_points: currentPoints - points })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as Customer;
  },

  getCustomerOrders: async (customerId: string) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return ensureArray(data);
  },

  updateCustomerStats: async (customerId: string, orderTotal: number): Promise<void> => {
    const { data: customer } = await supabase
      .from('customers')
      .select('total_orders, total_spent')
      .eq('id', customerId)
      .single();

    if (customer) {
      await supabase
        .from('customers')
        .update({
          total_orders: (customer.total_orders || 0) + 1,
          total_spent: (customer.total_spent || 0) + orderTotal,
        })
        .eq('id', customerId);
    }
  },

  searchByPhone: async (phone: string): Promise<Customer | null> => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', phone)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as Customer | null;
  },
};
