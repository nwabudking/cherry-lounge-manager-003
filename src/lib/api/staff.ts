import apiClient from './client';
import { supabase } from '@/integrations/supabase/client';

export interface StaffMember {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateStaffData {
  email: string;
  password: string;
  full_name: string;
  role: string;
}

export interface UpdateStaffData {
  email?: string;
  full_name?: string;
  role?: string;
  is_active?: boolean;
}

// Check if we're in Lovable preview (no local backend)
const isLovablePreview = (): boolean => {
  return window.location.hostname.includes('lovableproject.com') || 
         window.location.hostname.includes('lovable.app');
};

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => {
    if (isLovablePreview()) {
      // Get profiles with their roles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (profilesError) throw new Error(profilesError.message);
      
      // Get all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw new Error(rolesError.message);
      
      // Combine profiles with roles
      return (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          role: userRole?.role || 'cashier',
          is_active: true,
          created_at: profile.created_at || '',
          updated_at: profile.updated_at || '',
        };
      });
    }
    const response = await apiClient.get<StaffMember[]>('/staff');
    return response.data;
  },

  getActiveStaff: async (): Promise<StaffMember[]> => {
    if (isLovablePreview()) {
      return staffApi.getStaff();
    }
    const response = await apiClient.get<StaffMember[]>('/staff', {
      params: { active: true },
    });
    return response.data;
  },

  getStaffMember: async (id: string): Promise<StaffMember> => {
    if (isLovablePreview()) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (profileError) throw new Error(profileError.message);
      
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id)
        .maybeSingle();
      
      return {
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: roleData?.role || 'cashier',
        is_active: true,
        created_at: profile.created_at || '',
        updated_at: profile.updated_at || '',
      };
    }
    const response = await apiClient.get<StaffMember>(`/staff/${id}`);
    return response.data;
  },

  createStaff: async (data: CreateStaffData): Promise<StaffMember> => {
    // Always use REST API for staff creation as it requires admin privileges
    const response = await apiClient.post<StaffMember>('/staff', data);
    return response.data;
  },

  updateStaff: async (id: string, data: UpdateStaffData): Promise<StaffMember> => {
    if (isLovablePreview()) {
      // Update profile
      if (data.full_name !== undefined || data.email !== undefined) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            ...(data.full_name !== undefined && { full_name: data.full_name }),
            ...(data.email !== undefined && { email: data.email }),
          })
          .eq('id', id);
        
        if (profileError) throw new Error(profileError.message);
      }
      
      // Update role
      if (data.role !== undefined) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: data.role as any })
          .eq('user_id', id);
        
        if (roleError) throw new Error(roleError.message);
      }
      
      return staffApi.getStaffMember(id);
    }
    const response = await apiClient.put<StaffMember>(`/staff/${id}`, data);
    return response.data;
  },

  deleteStaff: async (id: string): Promise<void> => {
    // Always use REST API for staff deletion as it requires admin privileges
    await apiClient.delete(`/staff/${id}`);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    if (isLovablePreview()) {
      // Use edge function for password reset in preview
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-staff-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: id, newPassword }),
        }
      );
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      return;
    }
    // Use REST API for local deployment
    await apiClient.post(`/staff/${id}/reset-password`, { newPassword });
  },

  updateRole: async (id: string, role: string): Promise<StaffMember> => {
    if (isLovablePreview()) {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: role as any })
        .eq('user_id', id);
      
      if (error) throw new Error(error.message);
      return staffApi.getStaffMember(id);
    }
    const response = await apiClient.patch<StaffMember>(`/staff/${id}/role`, { role });
    return response.data;
  },

  getProfiles: async (): Promise<{ id: string; full_name: string | null; email: string | null }[]> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      
      if (error) throw new Error(error.message);
      return data || [];
    }
    const response = await apiClient.get('/profiles');
    return response.data;
  },
};
