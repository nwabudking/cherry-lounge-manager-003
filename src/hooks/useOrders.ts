import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, Order, CreateOrderData, OrderFilters } from '@/lib/api/orders';
import { toast } from 'sonner';

// Query keys
export const ordersKeys = {
  all: ['orders'] as const,
  list: (filters?: OrderFilters) => [...ordersKeys.all, 'list', filters] as const,
  detail: (id: string) => [...ordersKeys.all, 'detail', id] as const,
  items: (orderId: string) => [...ordersKeys.all, 'items', orderId] as const,
  payments: (orderId: string) => [...ordersKeys.all, 'payments', orderId] as const,
  kitchenQueue: () => [...ordersKeys.all, 'queue', 'kitchen'] as const,
  barQueue: () => [...ordersKeys.all, 'queue', 'bar'] as const,
  dailySummary: (date?: string) => [...ordersKeys.all, 'summary', 'daily', date] as const,
};

// Orders hooks
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ordersKeys.list(filters),
    queryFn: () => ordersApi.getOrders(filters),
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ordersKeys.detail(id),
    queryFn: () => ordersApi.getOrder(id),
    enabled: !!id,
  });
}

export function useOrderItems(orderId: string) {
  return useQuery({
    queryKey: ordersKeys.items(orderId),
    queryFn: () => ordersApi.getOrderItems(orderId),
    enabled: !!orderId,
  });
}

export function useOrderPayments(orderId: string) {
  return useQuery({
    queryKey: ordersKeys.payments(orderId),
    queryFn: () => ordersApi.getOrderPayments(orderId),
    enabled: !!orderId,
  });
}

export function useKitchenQueue() {
  return useQuery({
    queryKey: ordersKeys.kitchenQueue(),
    queryFn: ordersApi.getKitchenQueue,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useBarQueue() {
  return useQuery({
    queryKey: ordersKeys.barQueue(),
    queryFn: ordersApi.getBarQueue,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

export function useDailySummary(date?: string, createdBy?: string) {
  return useQuery({
    queryKey: ordersKeys.dailySummary(date),
    queryFn: () => ordersApi.getDailySummary(date, createdBy),
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateOrderData) => ordersApi.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all });
      toast.success('Order created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create order');
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      ordersApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all });
      toast.success('Order status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });
}

export function useAddPayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orderId, payment }: { 
      orderId: string; 
      payment: { amount: number; payment_method: string; reference?: string | null; status?: string } 
    }) => ordersApi.addPayment(orderId, { ...payment, reference: payment.reference ?? null, status: payment.status ?? 'completed' }),
    onSuccess: (_, { orderId }) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.payments(orderId) });
      queryClient.invalidateQueries({ queryKey: ordersKeys.detail(orderId) });
      toast.success('Payment added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add payment');
    },
  });
}
