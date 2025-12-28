import { supabase } from '@/integrations/supabase/client';

export interface SetupStatus {
  isFirstTimeSetup: boolean;
  hasUsers: boolean;
  hasSuperAdmin: boolean;
}

export const setupApi = {
  /**
   * Check if the system needs initial setup (no users exist)
   * This determines whether to show signup or login on the auth page
   */
  getSetupStatus: async (): Promise<SetupStatus> => {
    try {
      // Check if any users exist by checking profiles table
      // This is accessible without authentication
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error checking setup status:', error);
        // If we can't check, assume system is set up (safe default)
        return { isFirstTimeSetup: false, hasUsers: true, hasSuperAdmin: true };
      }

      const hasUsers = (count || 0) > 0;

      // If no users, this is first-time setup
      if (!hasUsers) {
        return { isFirstTimeSetup: true, hasUsers: false, hasSuperAdmin: false };
      }

      // Check if a super_admin exists
      const { count: superAdminCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin');

      const hasSuperAdmin = (superAdminCount || 0) > 0;

      return { 
        isFirstTimeSetup: !hasSuperAdmin, 
        hasUsers, 
        hasSuperAdmin 
      };
    } catch (error) {
      console.error('Setup status check failed:', error);
      return { isFirstTimeSetup: false, hasUsers: true, hasSuperAdmin: true };
    }
  },

  /**
   * Create the initial super_admin user during first-time setup
   * This bypasses normal signup restrictions
   */
  createInitialSuperAdmin: async (
    email: string, 
    password: string, 
    fullName: string
  ): Promise<{ success: boolean; error: string | null }> => {
    try {
      // Double-check that no super_admin exists
      const status = await setupApi.getSetupStatus();
      if (status.hasSuperAdmin) {
        return { success: false, error: 'A super admin already exists. Please use login.' };
      }

      // Create user via Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (!data.user) {
        return { success: false, error: 'Failed to create user account' };
      }

      // The trigger will create a profile with default 'cashier' role
      // We need to upgrade this to super_admin
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the role to super_admin
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert(
          { user_id: data.user.id, role: 'super_admin' },
          { onConflict: 'user_id' }
        );

      if (roleError) {
        console.error('Failed to set super_admin role:', roleError);
        // User was created but role wasn't set - they'll need manual fix
        return { success: false, error: 'Account created but role assignment failed. Contact support.' };
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Initial setup error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Setup failed' 
      };
    }
  },
};
