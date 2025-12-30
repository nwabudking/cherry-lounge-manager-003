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
    return `ARRAY[${value.map(v => escapeSqlValue(v)).join(', ')}]`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

// Generate INSERT statement for a table
function generateInsertStatements(tableName: string, rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return `-- No data in ${tableName}\n`;
  
  const columns = Object.keys(rows[0]);
  const statements: string[] = [];
  
  statements.push(`-- ${tableName} data (${rows.length} rows)`);
  
  for (const row of rows) {
    const values = columns.map(col => escapeSqlValue(row[col]));
    statements.push(
      `INSERT INTO public.${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;`
    );
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

    let sqlOutput = `-- Cherry POS Database Export
-- Generated: ${new Date().toISOString()}
-- This file contains INSERT statements for all data
-- Run this after the schema has been created

BEGIN;

`;

    for (const tableName of tables) {
      console.log(`Exporting table: ${tableName}`);
      const { data, error } = await supabase.from(tableName).select('*');
      
      if (error) {
        console.error(`Error fetching ${tableName}:`, error.message);
        sqlOutput += `-- Error exporting ${tableName}: ${error.message}\n\n`;
        continue;
      }
      
      sqlOutput += generateInsertStatements(tableName, data || []);
    }

    sqlOutput += `COMMIT;

-- Export complete
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
