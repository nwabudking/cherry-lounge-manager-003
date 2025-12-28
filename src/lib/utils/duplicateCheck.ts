import { supabase } from '@/integrations/supabase/client';

/**
 * Utility functions for checking duplicate records before insert/update
 */

const normalizeString = (str: string): string => {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
};

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  existingId?: string;
  existingName?: string;
}

export const duplicateCheck = {
  /**
   * Check if an inventory item with the same name already exists
   */
  checkInventoryItem: async (name: string, excludeId?: string): Promise<DuplicateCheckResult> => {
    const normalizedName = normalizeString(name);
    
    let query = supabase
      .from('inventory_items')
      .select('id, name')
      .limit(1);

    const { data, error } = await query;
    
    if (error) {
      console.error('Error checking inventory duplicate:', error);
      return { isDuplicate: false };
    }

    // Check for case-insensitive match
    const existing = (data || []).find(item => 
      normalizeString(item.name) === normalizedName && 
      (!excludeId || item.id !== excludeId)
    );

    // If we got results but couldn't find match with normalization, query all and filter
    if (!existing && data?.length) {
      const { data: allItems } = await supabase
        .from('inventory_items')
        .select('id, name');
      
      const match = (allItems || []).find(item => 
        normalizeString(item.name) === normalizedName && 
        (!excludeId || item.id !== excludeId)
      );

      if (match) {
        return { isDuplicate: true, existingId: match.id, existingName: match.name };
      }
    }

    if (existing) {
      return { isDuplicate: true, existingId: existing.id, existingName: existing.name };
    }

    return { isDuplicate: false };
  },

  /**
   * Check if a menu item with the same name already exists
   */
  checkMenuItem: async (name: string, excludeId?: string): Promise<DuplicateCheckResult> => {
    const normalizedName = normalizeString(name);
    
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name');
    
    if (error) {
      console.error('Error checking menu item duplicate:', error);
      return { isDuplicate: false };
    }

    const existing = (data || []).find(item => 
      normalizeString(item.name) === normalizedName && 
      (!excludeId || item.id !== excludeId)
    );

    if (existing) {
      return { isDuplicate: true, existingId: existing.id, existingName: existing.name };
    }

    return { isDuplicate: false };
  },

  /**
   * Check if a menu category with the same name already exists
   */
  checkCategory: async (name: string, excludeId?: string): Promise<DuplicateCheckResult> => {
    const normalizedName = normalizeString(name);
    
    const { data, error } = await supabase
      .from('menu_categories')
      .select('id, name');
    
    if (error) {
      console.error('Error checking category duplicate:', error);
      return { isDuplicate: false };
    }

    const existing = (data || []).find(item => 
      normalizeString(item.name) === normalizedName && 
      (!excludeId || item.id !== excludeId)
    );

    if (existing) {
      return { isDuplicate: true, existingId: existing.id, existingName: existing.name };
    }

    return { isDuplicate: false };
  },

  /**
   * Check if a supplier with the same name already exists
   */
  checkSupplier: async (name: string, excludeId?: string): Promise<DuplicateCheckResult> => {
    const normalizedName = normalizeString(name);
    
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name');
    
    if (error) {
      console.error('Error checking supplier duplicate:', error);
      return { isDuplicate: false };
    }

    const existing = (data || []).find(item => 
      normalizeString(item.name) === normalizedName && 
      (!excludeId || item.id !== excludeId)
    );

    if (existing) {
      return { isDuplicate: true, existingId: existing.id, existingName: existing.name };
    }

    return { isDuplicate: false };
  },

  /**
   * Parse database error for duplicate constraint violations
   */
  isDuplicateError: (error: Error | unknown): boolean => {
    if (!error) return false;
    const message = error instanceof Error ? error.message : String(error);
    return message.includes('already exists') || 
           message.includes('duplicate') || 
           message.includes('unique constraint');
  },

  /**
   * Get user-friendly error message for duplicate errors
   */
  getDuplicateErrorMessage: (entityType: string, name?: string): string => {
    if (name) {
      return `A ${entityType} with the name "${name}" already exists. Please use a different name.`;
    }
    return `A ${entityType} with this name already exists. Please use a different name.`;
  },
};
