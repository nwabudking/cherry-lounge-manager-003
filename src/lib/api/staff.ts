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

const ensureArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>;
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
  const profiles = ensureArray<Record<string, unknown>>(profilesRes.data);

  // Roles (admins see all, others see own due to policies)
  const rolesRes = await supabase.from('user_roles').select('user_id,role');
  if (rolesRes.error) throw rolesRes.error;
  const roles = ensureArray<Record<string, unknown>>(rolesRes.data);

  const roleByUserId = roles.reduce((acc: Record<string, string>, r) => {
    if (r?.user_id) acc[r.user_id as string] = String(r.role || 'cashier');
    return acc;
  }, {});

  return profiles.map((p): StaffMember => ({
    id: p.id as string,
    email: p.email as string,
    full_name: p.full_name as string | null,
    avatar_url: p.avatar_url as string | null,
    role: String(roleByUserId[p.id as string] || 'cashier'),
    is_active: true,
    created_at: (p.created_at as string) || new Date().toISOString(),
    updated_at: (p.updated_at as string) || new Date().toISOString(),
  }));
}

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => {
    return await getStaffFromCloud();
  },

  getActiveStaff: async (): Promise<StaffMember[]> => {
    return await getStaffFromCloud();
  },

  getStaffMember: async (id: string): Promise<StaffMember> => {
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
      role: (roleRow as { role: string } | null)?.role || 'cashier',
      is_active: true,
      created_at: profile.created_at || new Date().toISOString(),
      updated_at: profile.updated_at || new Date().toISOString(),
    };
  },

  createStaff: async (data: CreateStaffData): Promise<StaffMember> => {
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
  },

  updateStaff: async (id: string, data: UpdateStaffData): Promise<StaffMember> => {
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
  },

  deleteStaff: async (id: string): Promise<void> => {
    const { error } = await supabase.functions.invoke('manage-staff', {
      body: { action: 'delete', userId: id },
    });
    if (error) throw new Error(error.message);
  },

  resetPassword: async (id: string, newPassword: string): Promise<void> => {
    const { error } = await supabase.functions.invoke('reset-staff-password', {
      body: { userId: id, newPassword },
    });
    if (error) throw new Error(error.message);
  },

  updateRole: async (id: string, role: string): Promise<StaffMember> => {
    return staffApi.updateStaff(id, { role });
  },

  getProfiles: async (): Promise<{ id: string; full_name: string | null; email: string | null }[]> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id,full_name,email')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return ensureArray<{ id: string; full_name: string | null; email: string | null }>(data);
  },
};
