import { supabase } from '@/integrations/supabase/client';

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
    const { data, error } = await supabase
      .from('restaurant_settings')
      .select('*')
      .single();
    
    if (error) {
      // If no settings exist, return default
      if (error.code === 'PGRST116') {
        return {
          id: '',
          name: 'Cherry Dining',
          tagline: '& Lounge',
          address: '123 Restaurant Street',
          city: 'Lagos',
          country: 'Nigeria',
          phone: '+234 800 000 0000',
          email: null,
          currency: 'NGN',
          timezone: 'Africa/Lagos',
          logo_url: null,
          receipt_show_logo: false,
          receipt_footer: 'Thank you for dining with us!',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
      throw new Error(error.message);
    }
    
    return {
      ...data,
      currency: data.currency || 'NGN',
      timezone: data.timezone || 'Africa/Lagos',
      receipt_show_logo: data.receipt_show_logo || false,
    };
  },

  updateSettings: async (settingsData: Partial<RestaurantSettings>): Promise<RestaurantSettings> => {
    // First check if settings exist
    const { data: existing } = await supabase
      .from('restaurant_settings')
      .select('id')
      .single();
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('restaurant_settings')
        .update(settingsData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('restaurant_settings')
        .insert(settingsData)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    }
  },

  uploadLogo: async (file: File): Promise<{ url: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `logo-${Date.now()}.${fileExt}`;
    const filePath = `logos/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(filePath, file);
    
    if (uploadError) throw new Error(uploadError.message);
    
    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(filePath);
    
    return { url: publicUrl };
  },
};
