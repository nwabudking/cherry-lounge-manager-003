// Unified Auth Module - Supabase Only
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
}

export interface AuthResponse {
  user: User;
  error: Error | null;
}

export const unifiedAuth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      return { user: null as unknown as User, error: new Error(error.message) };
    }

    if (!data.user) {
      return { user: null as unknown as User, error: new Error('Login failed') };
    }

    // Get user role from user_roles table
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', data.user.id)
      .maybeSingle();

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', data.user.id)
      .maybeSingle();

    const user: User = {
      id: data.user.id,
      email: data.user.email || email,
      full_name: profileData?.full_name || data.user.user_metadata?.full_name || null,
      avatar_url: profileData?.avatar_url || null,
      role: roleData?.role || 'cashier',
    };

    return { user, error: null };
  },

  register: async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });

    if (error) {
      return { user: null as unknown as User, error: new Error(error.message) };
    }

    if (!data.user) {
      return { user: null as unknown as User, error: new Error('Registration failed') };
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email || email,
      full_name: fullName,
      avatar_url: null,
      role: 'cashier', // Default role for new users
    };

    return { user, error: null };
  },

  logout: async (): Promise<void> => {
    await supabase.auth.signOut();
  },

  getCurrentUser: async (): Promise<User | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return null;
    }

    // Get user role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .maybeSingle();

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', session.user.id)
      .maybeSingle();

    return {
      id: session.user.id,
      email: session.user.email || '',
      full_name: profileData?.full_name || session.user.user_metadata?.full_name || null,
      avatar_url: profileData?.avatar_url || null,
      role: roleData?.role || 'cashier',
    };
  },

  hasSession: async (): Promise<boolean> => {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  changePassword: async (newPassword: string): Promise<{ error: Error | null }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { error: new Error(error.message) };
    }
    return { error: null };
  },

  isSupabaseAuth: (): boolean => true,
};

export default unifiedAuth;
