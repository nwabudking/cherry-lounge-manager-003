import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi, CreateCustomerData, UpdateCustomerData } from '@/lib/api/customers';
import { useToast } from '@/hooks/use-toast';

export const useCustomers = (search?: string) => {
  return useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.getCustomers(search),
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.getCustomer(id),
    enabled: !!id,
  });
};

export const useCustomerOrders = (customerId: string) => {
  return useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => customersApi.getCustomerOrders(customerId),
    enabled: !!customerId,
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateCustomerData) => customersApi.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer created',
        description: 'The customer has been added successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error creating customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerData }) =>
      customersApi.updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer updated',
        description: 'The customer has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => customersApi.deleteCustomer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Customer removed',
        description: 'The customer has been deactivated.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error removing customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useAddLoyaltyPoints = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, points }: { id: string; points: number }) =>
      customersApi.addLoyaltyPoints(id, points),
    onSuccess: (_, { points }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Points added',
        description: `${points} loyalty points have been added.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding points',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useRedeemLoyaltyPoints = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, points }: { id: string; points: number }) =>
      customersApi.redeemLoyaltyPoints(id, points),
    onSuccess: (_, { points }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({
        title: 'Points redeemed',
        description: `${points} loyalty points have been redeemed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error redeeming points',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useSearchCustomerByPhone = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (phone: string) => customersApi.searchByPhone(phone),
    onError: (error: Error) => {
      toast({
        title: 'Error searching customer',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
