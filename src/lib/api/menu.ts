import apiClient from './client';

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number | null;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean;
  is_available: boolean;
  track_inventory: boolean;
  inventory_item_id: string | null;
  created_at: string;
  updated_at: string;
}

export const menuApi = {
  // Categories
  getCategories: async (): Promise<MenuCategory[]> => {
    const response = await apiClient.get<MenuCategory[]>('/menu/categories');
    return response.data;
  },

  getActiveCategories: async (): Promise<MenuCategory[]> => {
    const response = await apiClient.get<MenuCategory[]>('/menu/categories', {
      params: { active: true },
    });
    return response.data;
  },

  createCategory: async (data: Partial<MenuCategory>): Promise<MenuCategory> => {
    const response = await apiClient.post<MenuCategory>('/menu/categories', data);
    return response.data;
  },

  updateCategory: async (id: string, data: Partial<MenuCategory>): Promise<MenuCategory> => {
    const response = await apiClient.put<MenuCategory>(`/menu/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/menu/categories/${id}`);
  },

  // Menu Items
  getMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>('/menu/items', {
      params: categoryId ? { categoryId } : undefined,
    });
    return response.data;
  },

  getActiveMenuItems: async (categoryId?: string): Promise<MenuItem[]> => {
    const response = await apiClient.get<MenuItem[]>('/menu/items', {
      params: { active: true, ...(categoryId && { categoryId }) },
    });
    return response.data;
  },

  getMenuItem: async (id: string): Promise<MenuItem> => {
    const response = await apiClient.get<MenuItem>(`/menu/items/${id}`);
    return response.data;
  },

  createMenuItem: async (data: Partial<MenuItem>): Promise<MenuItem> => {
    const response = await apiClient.post<MenuItem>('/menu/items', data);
    return response.data;
  },

  updateMenuItem: async (id: string, data: Partial<MenuItem>): Promise<MenuItem> => {
    const response = await apiClient.put<MenuItem>(`/menu/items/${id}`, data);
    return response.data;
  },

  deleteMenuItem: async (id: string): Promise<void> => {
    await apiClient.delete(`/menu/items/${id}`);
  },

  uploadImage: async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post<{ url: string }>('/menu/upload-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.url;
  },
};
