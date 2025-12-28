import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffApi, StaffMember, CreateStaffData, UpdateStaffData } from '@/lib/api/staff';
import { toast } from 'sonner';

// Query keys
export const staffKeys = {
  all: ['staff'] as const,
  list: () => [...staffKeys.all, 'list'] as const,
  activeList: () => [...staffKeys.list(), 'active'] as const,
  detail: (id: string) => [...staffKeys.all, 'detail', id] as const,
};

// Staff hooks
export function useStaff() {
  return useQuery({
    queryKey: staffKeys.list(),
    queryFn: staffApi.getStaff,
  });
}

export function useActiveStaff() {
  return useQuery({
    queryKey: staffKeys.activeList(),
    queryFn: staffApi.getActiveStaff,
  });
}

export function useStaffMember(id: string) {
  return useQuery({
    queryKey: staffKeys.detail(id),
    queryFn: () => staffApi.getStaffMember(id),
    enabled: !!id,
  });
}

export function useCreateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateStaffData) => staffApi.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Staff member created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create staff member');
    },
  });
}

export function useUpdateStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateStaffData }) => 
      staffApi.updateStaff(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Staff member updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff member');
    },
  });
}

export function useDeleteStaff() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => staffApi.deleteStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Staff member deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete staff member');
    },
  });
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) => 
      staffApi.resetPassword(id, newPassword),
    onSuccess: () => {
      toast.success('Password reset successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to reset password');
    },
  });
}

export function useUpdateStaffEmail() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, newEmail }: { id: string; newEmail: string }) => 
      staffApi.updateEmail(id, newEmail),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Email updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update email');
    },
  });
}

export function useUpdateStaffRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => 
      staffApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      toast.success('Staff role updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update staff role');
    },
  });
}
