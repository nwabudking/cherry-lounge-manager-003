import { useAuth, AppRole } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export type PrivilegedRole = 'super_admin' | 'manager';
export type RestrictedRole = 'cashier' | 'bar_staff' | 'kitchen_staff' | 'inventory_officer' | 'accountant';

interface RolePermissions {
  canViewAllOrders: boolean;
  canViewAllSales: boolean;
  canViewAllInventory: boolean;
  canViewAllStaff: boolean;
  canManageStaff: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canManageInventory: boolean;
  isPrivileged: boolean;
}

const PRIVILEGED_ROLES: AppRole[] = ['super_admin', 'manager'];
const INVENTORY_ROLES: AppRole[] = ['super_admin', 'manager', 'inventory_officer'];
const SALES_VIEW_ROLES: AppRole[] = ['super_admin', 'manager', 'accountant'];

export const useUserRole = () => {
  const { user, role, isAuthenticated } = useAuth();

  const permissions = useMemo((): RolePermissions => {
    if (!role) {
      return {
        canViewAllOrders: false,
        canViewAllSales: false,
        canViewAllInventory: false,
        canViewAllStaff: false,
        canManageStaff: false,
        canManageSettings: false,
        canViewReports: false,
        canManageInventory: false,
        isPrivileged: false,
      };
    }

    const isPrivileged = PRIVILEGED_ROLES.includes(role);
    const canManageInventory = INVENTORY_ROLES.includes(role);
    const canViewAllSales = SALES_VIEW_ROLES.includes(role) || isPrivileged;

    return {
      canViewAllOrders: isPrivileged,
      canViewAllSales: canViewAllSales,
      canViewAllInventory: canManageInventory,
      canViewAllStaff: isPrivileged,
      canManageStaff: role === 'super_admin',
      canManageSettings: isPrivileged,
      canViewReports: isPrivileged || role === 'accountant',
      canManageInventory,
      isPrivileged,
    };
  }, [role]);

  const isRole = (checkRole: AppRole): boolean => role === checkRole;
  
  const hasAnyRole = (roles: AppRole[]): boolean => {
    if (!role) return false;
    return roles.includes(role);
  };

  const isPrivilegedUser = (): boolean => {
    return hasAnyRole(PRIVILEGED_ROLES);
  };

  // Get the user ID for filtering queries (only applies to non-privileged users)
  const getFilterUserId = (): string | null => {
    if (!user?.id || permissions.isPrivileged) return null;
    return user.id;
  };

  return {
    user,
    role,
    isAuthenticated,
    permissions,
    isRole,
    hasAnyRole,
    isPrivilegedUser,
    getFilterUserId,
    userId: user?.id || null,
  };
};

export default useUserRole;
