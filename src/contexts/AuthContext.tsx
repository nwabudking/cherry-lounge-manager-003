import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { unifiedAuth, User, tokenManager } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

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

// Preserve context instance across Vite HMR updates
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
    try {
      const currentUser = await unifiedAuth.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error fetching current user:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up auth state listener for Supabase
  useEffect(() => {
    // Check if using Supabase auth
    if (unifiedAuth.isSupabaseAuth()) {
      // Set up Supabase auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        } else if (session?.user) {
          // Defer the user fetch to avoid deadlock
          setTimeout(() => {
            fetchCurrentUser();
          }, 0);
        } else {
          setLoading(false);
        }
      });

      // Initial session check
      fetchCurrentUser();

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // For REST API auth, just check tokens
      fetchCurrentUser();
    }
  }, [fetchCurrentUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const { user: authUser, error } = await unifiedAuth.login(email, password);
      if (error) {
        return { error };
      }
      setUser(authUser);
      return { error: null };
    } catch (error) {
      console.error('Login error:', error);
      return { error: error instanceof Error ? error : new Error('Login failed') };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { user: authUser, error } = await unifiedAuth.register(email, password, fullName);
      if (error) {
        return { error };
      }
      setUser(authUser);
      return { error: null };
    } catch (error) {
      console.error('Registration error:', error);
      return { error: error instanceof Error ? error : new Error('Registration failed') };
    }
  };

  const signOut = async () => {
    try {
      await unifiedAuth.logout();
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
