import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export interface ActivityLog {
  id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  entity_name: string | null;
  details: Json | null;
  performed_by: string | null;
  performed_by_name: string | null;
  created_at: string;
}

export type ActionType = 
  | 'inventory_add' 
  | 'inventory_remove' 
  | 'inventory_update' 
  | 'inventory_delete'
  | 'stock_in'
  | 'stock_out'
  | 'stock_adjust'
  | 'user_add' 
  | 'user_delete' 
  | 'user_update'
  | 'supplier_add'
  | 'supplier_update'
  | 'supplier_delete';

export type EntityType = 'inventory_item' | 'user' | 'supplier' | 'stock_movement';

interface LogActivityParams {
  action_type: ActionType;
  entity_type: EntityType;
  entity_id?: string;
  entity_name?: string;
  details?: Record<string, unknown>;
}

export const activityLogApi = {
  async logActivity(params: LogActivityParams): Promise<void> {
    try {
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      
      let performerName: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .maybeSingle();
        
        performerName = profile?.full_name || profile?.email || null;
      }

      const { error } = await supabase
        .from('activity_logs')
        .insert([{
          action_type: params.action_type,
          entity_type: params.entity_type,
          entity_id: params.entity_id || null,
          entity_name: params.entity_name || null,
          details: (params.details || null) as Json,
          performed_by: user?.id || null,
          performed_by_name: performerName,
        }]);

      if (error) {
        console.error('Failed to log activity:', error);
      }
    } catch (err) {
      console.error('Error logging activity:', err);
    }
  },

  async getActivityLogs(params?: {
    startDate?: string;
    endDate?: string;
    actionTypes?: ActionType[];
    entityTypes?: EntityType[];
    limit?: number;
  }): Promise<ActivityLog[]> {
    let query = supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params?.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    if (params?.actionTypes && params.actionTypes.length > 0) {
      query = query.in('action_type', params.actionTypes);
    }

    if (params?.entityTypes && params.entityTypes.length > 0) {
      query = query.in('entity_type', params.entityTypes);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    } else {
      query = query.limit(100);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return (data || []) as ActivityLog[];
  },
};
