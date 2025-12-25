import apiClient, { tokenManager, getApiErrorMessage } from './client';
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
  accessToken: string;
  refreshToken: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
}

// Check if we're in Lovable preview (no local backend)
const isLovablePreview = (): boolean => {
  // In Lovable preview, the API calls to /api will 404 because there's no Express server
  // Check if we're on lovableproject.com domain
  return window.location.hostname.includes('lovableproject.com') || 
         window.location.hostname.includes('lovable.app');
};

// Auth API functions - uses Supabase in Lovable preview, REST API for local
export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    if (isLovablePreview()) {
      // Use Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) throw new Error(error.message);
      if (!data.session || !data.user) throw new Error('Login failed');

      // Get user role from user_roles table
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .single();

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      const user: User = {
        id: data.user.id,
        email: data.user.email || '',
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        role: roleData?.role || 'cashier',
      };

      // Store tokens for API client compatibility
      tokenManager.setTokens(data.session.access_token, data.session.refresh_token);

      return {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } else {
      // Use REST API
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      const { accessToken, refreshToken } = response.data;
      tokenManager.setTokens(accessToken, refreshToken);
      return response.data;
    }
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    if (isLovablePreview()) {
      // Use Supabase auth
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: data.full_name,
          },
        },
      });

      if (error) throw new Error(error.message);
      if (!authData.session || !authData.user) throw new Error('Registration failed');

      const user: User = {
        id: authData.user.id,
        email: authData.user.email || '',
        full_name: data.full_name,
        avatar_url: null,
        role: 'cashier',
      };

      tokenManager.setTokens(authData.session.access_token, authData.session.refresh_token);

      return {
        user,
        accessToken: authData.session.access_token,
        refreshToken: authData.session.refresh_token,
      };
    } else {
      const response = await apiClient.post<AuthResponse>('/auth/register', data);
      const { accessToken, refreshToken } = response.data;
      tokenManager.setTokens(accessToken, refreshToken);
      return response.data;
    }
  },

  logout: async (): Promise<void> => {
    try {
      if (isLovablePreview()) {
        await supabase.auth.signOut();
      } else {
        await apiClient.post('/auth/logout');
      }
    } finally {
      tokenManager.clearTokens();
    }
  },

  getCurrentUser: async (): Promise<User> => {
    if (isLovablePreview()) {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session?.user) {
        throw new Error('Not authenticated');
      }

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();

      // Get profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      return {
        id: session.user.id,
        email: session.user.email || '',
        full_name: profile?.full_name || null,
        avatar_url: profile?.avatar_url || null,
        role: roleData?.role || 'cashier',
      };
    } else {
      const response = await apiClient.get<{ user: User }>('/auth/me');
      return response.data.user;
    }
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    if (isLovablePreview()) {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw new Error(error.message);
    } else {
      await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    }
  },

  refreshToken: async (): Promise<{ accessToken: string; refreshToken: string }> => {
    if (isLovablePreview()) {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        throw new Error('Failed to refresh token');
      }
      tokenManager.setTokens(data.session.access_token, data.session.refresh_token);
      return {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };
    } else {
      const refreshToken = tokenManager.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      const response = await apiClient.post('/auth/refresh', { refreshToken });
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      tokenManager.setTokens(accessToken, newRefreshToken);
      return { accessToken, refreshToken: newRefreshToken };
    }
  },

  isAuthenticated: (): boolean => {
    return tokenManager.hasTokens();
  },
};

export { getApiErrorMessage };
