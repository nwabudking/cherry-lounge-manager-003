import apiClient from './client';

export interface RestaurantSettings {
  id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  timezone: string;
  logo_url: string | null;
  receipt_show_logo: boolean;
  receipt_footer: string | null;
  created_at: string;
  updated_at: string;
}

export const settingsApi = {
  getSettings: async (): Promise<RestaurantSettings> => {
    const response = await apiClient.get<RestaurantSettings>('/settings');
    return response.data;
  },

  updateSettings: async (settingsData: Partial<RestaurantSettings>): Promise<RestaurantSettings> => {
    const response = await apiClient.patch<RestaurantSettings>('/settings', settingsData);
    return response.data;
  },

  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.post<{ url: string }>('/settings/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
