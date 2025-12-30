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

// Fetch all rows from a table with pagination (Supabase has 1000 row limit)
async function fetchAllRows(supabase: any, tableName: string): Promise<Record<string, unknown>[]> {
  const allRows: Record<string, unknown>[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .range(offset, offset + pageSize - 1)
      .order('id', { ascending: true });

    if (error) {
      console.error(`Error fetching ${tableName} at offset ${offset}:`, error.message);
      throw error;
    }

    if (data && data.length > 0) {
      allRows.push(...data);
      offset += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRows;
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

    let totalRows = 0;

    // Export main tables with pagination
    for (const tableName of tables) {
      console.log(`Exporting table: ${tableName}`);
      try {
        const data = await fetchAllRows(supabase, tableName);
        totalRows += data.length;
        console.log(`  - ${tableName}: ${data.length} rows`);
        
        const config = tableConfigs[tableName] || { primaryKey: 'id' };
        sqlOutput += generateUpsertStatements(tableName, data, config);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error exporting ${tableName}:`, errorMessage);
        sqlOutput += `-- Error exporting ${tableName}: ${errorMessage}\n\n`;
      }
    }

    // Export auth.users using admin API
    sqlOutput += `-- ============================================
-- AUTH.USERS (User Accounts)
-- ============================================
-- These are the actual user accounts from auth.users
-- For offline deployment, you need to insert these into auth.users
-- BEFORE inserting profiles and user_roles
-- 
-- NOTE: Passwords are hashed with bcrypt. Default password for all
-- imported users is: TempPass123! (they should change on first login)

`;

    console.log('Exporting auth.users...');
    try {
      // Use admin API to list all users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      });

      if (authError) {
        console.error('Error fetching auth.users:', authError.message);
        sqlOutput += `-- Error exporting auth.users: ${authError.message}\n\n`;
      } else if (authUsers?.users && authUsers.users.length > 0) {
        const users = authUsers.users;
        totalRows += users.length;
        console.log(`  - auth.users: ${users.length} rows`);

        sqlOutput += `-- ============================================\n`;
        sqlOutput += `-- AUTH.USERS (${users.length} users)\n`;
        sqlOutput += `-- ============================================\n`;

        for (const authUser of users) {
          // Cast to any to access encrypted_password which is returned but not in type
          const userAny = authUser as any;
          const id = escapeSqlValue(authUser.id);
          const email = escapeSqlValue(authUser.email);
          // Use encrypted_password if available, otherwise use a default hash for TempPass123!
          const encryptedPassword = escapeSqlValue(userAny.encrypted_password || '$2a$10$PwQn7aGVGEDPGQa.2JwAWuPF9TZxAVGxkRz8IYUA8KxLcQ8xPpqHy');
          const emailConfirmedAt = authUser.email_confirmed_at ? escapeSqlValue(authUser.email_confirmed_at) : 'NOW()';
          const rawUserMetaData = escapeSqlValue(authUser.user_metadata || {});
          const createdAt = escapeSqlValue(authUser.created_at);
          const updatedAt = escapeSqlValue(authUser.updated_at || authUser.created_at);

          sqlOutput += `INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES (${id}, '00000000-0000-0000-0000-000000000000', ${email}, ${encryptedPassword}, ${emailConfirmedAt}, '{"provider": "email", "providers": ["email"]}'::jsonb, ${rawUserMetaData}, ${createdAt}, ${updatedAt}, 'authenticated', 'authenticated', '', '', '', '')
ON CONFLICT (id) DO UPDATE SET 
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = EXCLUDED.updated_at;\n`;
        }
        sqlOutput += '\n';
      } else {
        sqlOutput += `-- No users found in auth.users\n\n`;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error exporting auth.users:', errorMessage);
      sqlOutput += `-- Error exporting auth.users: ${errorMessage}\n\n`;
    }

    // Export user tables (profiles and user_roles)
    sqlOutput += `-- ============================================
-- USER DATA (profiles and user_roles)
-- ============================================
-- These link to auth.users via user_id/id

`;

    for (const tableName of userTables) {
      console.log(`Exporting user table: ${tableName}`);
      try {
        const data = await fetchAllRows(supabase, tableName);
        totalRows += data.length;
        console.log(`  - ${tableName}: ${data.length} rows`);
        
        const config = tableConfigs[tableName] || { primaryKey: 'id' };
        sqlOutput += generateUpsertStatements(tableName, data, config);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error exporting ${tableName}:`, errorMessage);
        sqlOutput += `-- Error exporting ${tableName}: ${errorMessage}\n\n`;
      }
    }

    sqlOutput += `-- Re-enable triggers
SET session_replication_role = 'origin';

COMMIT;

-- ============================================================
-- Export complete!
-- Total tables exported: ${tables.length + userTables.length + 1} (including auth.users)
-- Total rows exported: ${totalRows}
-- ============================================================
`;

    console.log(`Export completed successfully. Total rows: ${totalRows}`);

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
