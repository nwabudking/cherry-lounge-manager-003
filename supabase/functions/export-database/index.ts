import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to escape SQL values
function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return "'{}'";
    // Check if it's an array of strings
    const escapedItems = value.map(v => {
      if (typeof v === 'string') return `"${v.replace(/"/g, '\\"')}"`;
      return String(v);
    });
    return `'{${escapedItems.join(',')}}'`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // Escape single quotes and handle special characters
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Table configurations with primary key and columns to update
const tableConfigs: Record<string, { primaryKey: string; excludeFromUpdate?: string[] }> = {
  'restaurant_settings': { primaryKey: 'id' },
  'suppliers': { primaryKey: 'id' },
  'menu_categories': { primaryKey: 'id' },
  'inventory_items': { primaryKey: 'id' },
  'menu_items': { primaryKey: 'id' },
  'customers': { primaryKey: 'id' },
  'orders': { primaryKey: 'id' },
  'order_items': { primaryKey: 'id' },
  'payments': { primaryKey: 'id' },
  'stock_movements': { primaryKey: 'id' },
  'profiles': { primaryKey: 'id', excludeFromUpdate: ['id'] },
  'user_roles': { primaryKey: 'id', excludeFromUpdate: ['id'] },
};

// Generate UPSERT statement for a table (INSERT ... ON CONFLICT DO UPDATE)
function generateUpsertStatements(tableName: string, rows: Record<string, unknown>[], config: { primaryKey: string; excludeFromUpdate?: string[] }): string {
  if (!rows || rows.length === 0) return `-- No data in ${tableName}\n\n`;
  
  const columns = Object.keys(rows[0]);
  const statements: string[] = [];
  const excludeFromUpdate = config.excludeFromUpdate || [];
  
  statements.push(`-- ============================================`);
  statements.push(`-- ${tableName.toUpperCase()} (${rows.length} rows)`);
  statements.push(`-- ============================================`);
  
  for (const row of rows) {
    const values = columns.map(col => escapeSqlValue(row[col]));
    
    // Build the UPDATE SET clause (exclude primary key and specified columns)
    const updateColumns = columns.filter(col => 
      col !== config.primaryKey && !excludeFromUpdate.includes(col)
    );
    
    const updateClause = updateColumns
      .map(col => `${col} = EXCLUDED.${col}`)
      .join(', ');
    
    if (updateClause) {
      statements.push(
        `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (${config.primaryKey}) DO UPDATE SET ${updateClause};`
      );
    } else {
      statements.push(
        `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (${config.primaryKey}) DO NOTHING;`
      );
    }
  }
  
  return statements.join('\n') + '\n\n';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with service role for full access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is super_admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized - super_admin required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting database export for user:', user.email);

    // Define tables to export in correct order (respecting foreign keys)
    // profiles and user_roles are exported but commented out (users must be created via auth first)
    const tables = [
      'restaurant_settings',
      'suppliers',
      'menu_categories',
      'inventory_items',
      'menu_items',
      'customers',
      'orders',
      'order_items',
      'payments',
      'stock_movements',
    ];

    const userTables = ['profiles', 'user_roles'];

    let sqlOutput = `-- ============================================================
-- Cherry POS Complete Database Export
-- Generated: ${new Date().toISOString()}
-- ============================================================
-- This file contains UPSERT statements (INSERT ... ON CONFLICT DO UPDATE)
-- for all data. Run this after the schema has been created.
-- 
-- IMPORTANT: This will UPDATE existing records if they exist,
-- or INSERT new ones if they don't.
-- ============================================================

BEGIN;

-- Temporarily disable triggers for faster import
SET session_replication_role = 'replica';

`;

    // Export main tables
    for (const tableName of tables) {
      console.log(`Exporting table: ${tableName}`);
      const { data, error } = await supabase.from(tableName).select('*');
      
      if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        sqlOutput += `-- Error exporting ${tableName}: ${error.message}\n\n`;
        continue;
      }
      
      const config = tableConfigs[tableName] || { primaryKey: 'id' };
      sqlOutput += generateUpsertStatements(tableName, data || [], config);
    }

    // Export user tables (profiles and user_roles) - these are special
    sqlOutput += `-- ============================================
-- USER DATA (profiles and user_roles)
-- ============================================
-- NOTE: Users must first exist in auth.users before profiles/roles can be inserted.
-- For offline deployment, create users via Supabase Auth first, then run these.
-- These statements use UPSERT to update existing records.

`;

    for (const tableName of userTables) {
      console.log(`Exporting user table: ${tableName}`);
      const { data, error } = await supabase.from(tableName).select('*');
      
      if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        sqlOutput += `-- Error exporting ${tableName}: ${error.message}\n\n`;
        continue;
      }
      
      const config = tableConfigs[tableName] || { primaryKey: 'id' };
      sqlOutput += generateUpsertStatements(tableName, data || [], config);
    }

    sqlOutput += `-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- ============================================================
-- Export complete!
-- Total tables exported: ${tables.length + userTables.length}
-- ============================================================
`;

    console.log('Export completed successfully');

    return new Response(sqlOutput, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/sql',
        'Content-Disposition': `attachment; filename="cherry-pos-data-${new Date().toISOString().split('T')[0]}.sql"`,
      },
    });

  } catch (error) {
    console.error('Export error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
