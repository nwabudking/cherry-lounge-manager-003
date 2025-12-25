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

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => {
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
  },

  getActiveStaff: async (): Promise<StaffMember[]> => {
    return staffApi.getStaff();
  },

  getStaffMember: async (id: string): Promise<StaffMember> => {
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
      .single();
    
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
  },

  createStaff: async (data: CreateStaffData): Promise<StaffMember> => {
    // Note: Creating new users requires admin privileges
    // This would typically be done through an edge function
    // For now, we'll create the profile and role if user already exists
    throw new Error('Staff creation requires admin privileges. Please use the authentication system to create new users.');
  },

  updateStaff: async (id: string, data: UpdateStaffData): Promise<StaffMember> => {
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
  },

  deleteStaff: async (id: string): Promise<void> => {
    // We don't actually delete staff, just mark as inactive
    // Note: This requires appropriate RLS policies
    throw new Error('Staff deletion requires admin privileges.');
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    throw new Error('Password reset requires admin privileges.');
  },

  updateRole: async (id: string, role: string): Promise<StaffMember> => {
    const { error } = await supabase
      .from('user_roles')
      .update({ role: role as any })
      .eq('user_id', id);
    
    if (error) throw new Error(error.message);
    return staffApi.getStaffMember(id);
  },

  getProfiles: async (): Promise<{ id: string; full_name: string | null; email: string | null }[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .order('full_name');
    
    if (error) throw new Error(error.message);
    return data || [];
  },
};
