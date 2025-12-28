import apiClient from './client';
import { supabase } from '@/integrations/supabase/client';
import { assertDatabaseConfigured, getEnvironmentConfig, useMySQLForReads, useSupabaseForReads } from '@/lib/db/environment';

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

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as any;
    const candidate = v.data ?? v.staff ?? v.results ?? v.rows;
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
};

async function getStaffFromCloud(): Promise<StaffMember[]> {
  // Profiles (admins see all, others see own due to policies)
  const profilesRes = await supabase
    .from('profiles')
    .select('id,email,full_name,avatar_url,created_at,updated_at');

  if (profilesRes.error) throw profilesRes.error;
  const profiles = ensureArray<any>(profilesRes.data);

  // Roles (admins see all, others see own due to policies)
  const rolesRes = await supabase.from('user_roles').select('user_id,role');
  if (rolesRes.error) throw rolesRes.error;
  const roles = ensureArray<any>(rolesRes.data);

  const roleByUserId = roles.reduce((acc: Record<string, string>, r: any) => {
    if (r?.user_id) acc[r.user_id] = r.role;
    return acc;
  }, {});

  return profiles.map((p: any) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    role: roleByUserId[p.id] || 'cashier',
    is_active: true,
    created_at: p.created_at,
    updated_at: p.updated_at,
  }));
}

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => {
    assertDatabaseConfigured();

    if (useSupabaseForReads()) {
      try {
        return await getStaffFromCloud();
      } catch {
        // fall through to REST if available
      }
    }

    if (useMySQLForReads()) {
      const response = await apiClient.get<StaffMember[]>('/staff');
      return ensureArray<StaffMember>(response.data);
    }

    return [];
  },

  getActiveStaff: async (): Promise<StaffMember[]> => {
    assertDatabaseConfigured();

    if (useSupabaseForReads()) {
      try {
        // Cloud currently has no inactive staff concept; return the list.
        return await getStaffFromCloud();
      } catch {
        // fall through to REST if available
      }
    }

    if (useMySQLForReads()) {
      const response = await apiClient.get<StaffMember[]>('/staff', {
        params: { active: true },
      });
      return ensureArray<StaffMember>(response.data);
    }

    return [];
  },

  getStaffMember: async (id: string): Promise<StaffMember> => {
    assertDatabaseConfigured();

    if (useSupabaseForReads()) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,created_at,updated_at')
        .eq('id', id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('Staff member not found');

      const { data: roleRow } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', id)
        .maybeSingle();

      return {
        id: profile.id,
        email: profile.email || '',
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        role: (roleRow as any)?.role || 'cashier',
        is_active: true,
        created_at: profile.created_at || new Date().toISOString(),
        updated_at: profile.updated_at || new Date().toISOString(),
      };
    }

    const response = await apiClient.get<StaffMember>(`/staff/${id}`);
    return response.data;
  },

  createStaff: async (data: CreateStaffData): Promise<StaffMember> => {
    assertDatabaseConfigured();

    const cfg = getEnvironmentConfig();
    if (cfg.supabaseAvailable && cfg.mode !== 'mysql') {
      const { data: result, error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'create',
          email: data.email,
          password: data.password,
          fullName: data.full_name,
          role: data.role,
        },
      });
      if (error) throw new Error(error.message);
      if (!result?.success || !result?.user?.id) throw new Error(result?.error || 'Failed to create staff');

      return {
        id: result.user.id,
        email: data.email,
        full_name: data.full_name,
        avatar_url: null,
        role: data.role,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const response = await apiClient.post<StaffMember>('/staff', data);
    return response.data;
  },

  updateStaff: async (id: string, data: UpdateStaffData): Promise<StaffMember> => {
    assertDatabaseConfigured();

    const cfg = getEnvironmentConfig();
    if (cfg.supabaseAvailable && cfg.mode !== 'mysql') {
      const { error } = await supabase.functions.invoke('manage-staff', {
        body: {
          action: 'update',
          userId: id,
          fullName: data.full_name,
          role: data.role,
        },
      });
      if (error) throw new Error(error.message);

      // Return the updated row by refetching
      return await staffApi.getStaffMember(id);
    }

    const response = await apiClient.patch<StaffMember>(`/staff/${id}`, data);
    return response.data;
  },

  deleteStaff: async (id: string): Promise<void> => {
    assertDatabaseConfigured();

    const cfg = getEnvironmentConfig();
    if (cfg.supabaseAvailable && cfg.mode !== 'mysql') {
      const { error } = await supabase.functions.invoke('manage-staff', {
        body: { action: 'delete', userId: id },
      });
      if (error) throw new Error(error.message);
      return;
    }

    await apiClient.delete(`/staff/${id}`);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    assertDatabaseConfigured();

    const cfg = getEnvironmentConfig();
    if (cfg.supabaseAvailable && cfg.mode !== 'mysql') {
      const { error } = await supabase.functions.invoke('reset-staff-password', {
        body: { userId: id, newPassword },
      });
      if (error) throw new Error(error.message);
      return;
    }

    await apiClient.post(`/staff/${id}/reset-password`, { newPassword });
  },

  updateRole: async (id: string, role: string): Promise<StaffMember> => {
    return staffApi.updateStaff(id, { role });
  },

  getProfiles: async (): Promise<{ id: string; full_name: string | null; email: string | null }[]> => {
    assertDatabaseConfigured();

    if (useSupabaseForReads()) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id,full_name,email')
        .order('full_name', { ascending: true });

      if (!error) return ensureArray<any>(data);
      // Fall through to REST if available
    }

    const response = await apiClient.get('/profiles');
    return ensureArray<any>(response.data);
  },
};
