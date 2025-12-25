import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, User, tokenManager, getApiErrorMessage } from '@/lib/api';

export type AppRole = 'super_admin' | 'manager' | 'cashier' | 'bar_staff' | 'kitchen_staff' | 'inventory_officer' | 'accountant';

interface AuthContextType {
  user: User | null;
  role: AppRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Preserve context instance across Vite HMR updates to avoid "useAuth must be used within an AuthProvider"
// when the consumer gets a new context instance but the provider is still using the old one.
const AuthContext: React.Context<AuthContextType | undefined> =
  ((globalThis as unknown as { __APP_AUTH_CONTEXT__?: React.Context<AuthContextType | undefined> }).__APP_AUTH_CONTEXT__ ??
    createContext<AuthContextType | undefined>(undefined));

(globalThis as unknown as { __APP_AUTH_CONTEXT__?: React.Context<AuthContextType | undefined> }).__APP_AUTH_CONTEXT__ = AuthContext;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = useCallback(async () => {
    if (!tokenManager.hasTokens()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error fetching current user:', error);
      // Token might be invalid, clear it
      tokenManager.clearTokens();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      setUser(response.user);
      return { error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { error: new Error(getApiErrorMessage(error)) };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const response = await authApi.register({ email, password, full_name: fullName });
      setUser(response.user);
      return { error: null };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: new Error(getApiErrorMessage(error)) };
    }
  };

  const signOut = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const role = user?.role as AppRole | null;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      role,
      loading,
      isAuthenticated,
      signIn,
      signUp,
      signOut,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
