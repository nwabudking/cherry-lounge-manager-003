// Unified Auth Module - Works with both Supabase (online) and MySQL REST API (Docker)
import { supabase } from '@/integrations/supabase/client';
import { getEnvironmentConfig } from '@/lib/db/environment';
import { tokenManager } from './tokenManager';
import axios from 'axios';

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

// Re-export tokenManager
export { tokenManager } from './tokenManager';

// API base URL for REST API auth
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Determine which auth system to use
const shouldUseSupabaseAuth = (): boolean => {
  const config = getEnvironmentConfig();
  // Use Supabase auth in online/supabase mode, REST API in mysql/offline mode
  return config.mode === 'supabase' || (config.mode === 'hybrid' && config.supabaseAvailable);
};

// Supabase Auth Functions
const supabaseAuth = {
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
      .single();

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', data.user.id)
      .single();

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
      .single();

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', session.user.id)
      .single();

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
};

// REST API Auth Functions (for Docker/MySQL)
const restApiAuth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { accessToken, refreshToken, user } = response.data;
      tokenManager.setTokens(accessToken, refreshToken);
      return { user, error: null };
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Login failed';
      return { user: null as unknown as User, error: new Error(message) };
    }
  },

  register: async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, { email, password, full_name: fullName });
      const { accessToken, refreshToken, user } = response.data;
      tokenManager.setTokens(accessToken, refreshToken);
      return { user, error: null };
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Registration failed';
      return { user: null as unknown as User, error: new Error(message) };
    }
  },

  logout: async (): Promise<void> => {
    try {
      const token = tokenManager.getAccessToken();
      if (token) {
        await axios.post(`${API_BASE_URL}/auth/logout`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      tokenManager.clearTokens();
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    if (!tokenManager.hasTokens()) {
      return null;
    }

    try {
      const token = tokenManager.getAccessToken();
      const response = await axios.get(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.user;
    } catch (error) {
      tokenManager.clearTokens();
      return null;
    }
  },

  hasSession: (): boolean => {
    return tokenManager.hasTokens();
  },
};

// Unified Auth API
export const unifiedAuth = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    if (shouldUseSupabaseAuth()) {
      return supabaseAuth.login(email, password);
    }
    return restApiAuth.login(email, password);
  },

  register: async (email: string, password: string, fullName: string): Promise<AuthResponse> => {
    if (shouldUseSupabaseAuth()) {
      return supabaseAuth.register(email, password, fullName);
    }
    return restApiAuth.register(email, password, fullName);
  },

  logout: async (): Promise<void> => {
    if (shouldUseSupabaseAuth()) {
      await supabaseAuth.logout();
    } else {
      await restApiAuth.logout();
    }
    tokenManager.clearTokens(); // Clear tokens in both cases
  },

  getCurrentUser: async (): Promise<User | null> => {
    if (shouldUseSupabaseAuth()) {
      return supabaseAuth.getCurrentUser();
    }
    return restApiAuth.getCurrentUser();
  },

  hasSession: async (): Promise<boolean> => {
    if (shouldUseSupabaseAuth()) {
      return supabaseAuth.hasSession();
    }
    return restApiAuth.hasSession();
  },

  // Check which auth system is active
  isSupabaseAuth: (): boolean => shouldUseSupabaseAuth(),
};

export default unifiedAuth;
