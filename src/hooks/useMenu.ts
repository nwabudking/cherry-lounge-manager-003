import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuApi, MenuCategory, MenuItem } from '@/lib/api/menu';
import { toast } from 'sonner';

// Query keys
export const menuKeys = {
  all: ['menu'] as const,
  categories: () => [...menuKeys.all, 'categories'] as const,
  activeCategories: () => [...menuKeys.categories(), 'active'] as const,
  items: () => [...menuKeys.all, 'items'] as const,
  activeItems: () => [...menuKeys.items(), 'active'] as const,
  itemsByCategory: (categoryId: string) => [...menuKeys.items(), 'category', categoryId] as const,
  item: (id: string) => [...menuKeys.items(), id] as const,
};

// Categories hooks
export function useMenuCategories() {
  return useQuery({
    queryKey: menuKeys.categories(),
    queryFn: menuApi.getCategories,
  });
}

export function useActiveMenuCategories() {
  return useQuery({
    queryKey: menuKeys.activeCategories(),
    queryFn: menuApi.getActiveCategories,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<MenuCategory>) => menuApi.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create category');
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuCategory> }) => 
      menuApi.updateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => menuApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
      toast.success('Category deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete category');
    },
  });
}

// Menu items hooks
export function useMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: categoryId ? menuKeys.itemsByCategory(categoryId) : menuKeys.items(),
    queryFn: () => menuApi.getMenuItems(categoryId),
  });
}

export function useActiveMenuItems(categoryId?: string) {
  return useQuery({
    queryKey: categoryId 
      ? [...menuKeys.activeItems(), 'category', categoryId] 
      : menuKeys.activeItems(),
    queryFn: () => menuApi.getActiveMenuItems(categoryId),
  });
}

export function useMenuItem(id: string) {
  return useQuery({
    queryKey: menuKeys.item(id),
    queryFn: () => menuApi.getMenuItem(id),
    enabled: !!id,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<MenuItem>) => menuApi.createMenuItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items() });
      toast.success('Menu item created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create menu item');
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<MenuItem> }) => 
      menuApi.updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items() });
      toast.success('Menu item updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update menu item');
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => menuApi.deleteMenuItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items() });
      toast.success('Menu item deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete menu item');
    },
  });
}

export function useToggleMenuItemAvailability() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, is_available }: { id: string; is_available: boolean }) => 
      menuApi.updateMenuItem(id, { is_available }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.items() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update availability');
    },
  });
}

export function useToggleCategoryActive() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      menuApi.updateCategory(id, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: menuKeys.categories() });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update category');
    },
  });
}
