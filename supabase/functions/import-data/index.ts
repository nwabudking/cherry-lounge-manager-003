import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ImportPayload {
  menu_categories?: Array<{
    id: string;
    name: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
  }>;
  inventory_items?: Array<{
    id: string;
    name: string;
    category: string | null;
    unit: string;
    current_stock: number;
    min_stock_level: number;
    cost_per_unit: number | null;
    supplier: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    supplier_id: string | null;
  }>;
  menu_items?: Array<{
    id: string;
    category_id: string | null;
    name: string;
    description: string | null;
    price: number;
    cost_price: number | null;
    image_url: string | null;
    is_available: boolean;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    inventory_item_id: string | null;
    track_inventory: boolean;
  }>;
  restaurant_settings?: Array<{
    id: string;
    name: string;
    tagline: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    currency: string | null;
    timezone: string | null;
    receipt_footer: string | null;
    receipt_show_logo: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is super_admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "super_admin") {
      throw new Error("Only super_admin can run imports");
    }

    const payload: ImportPayload = await req.json();
    const results: Record<string, { inserted: number; errors: string[] }> = {};

    // Import menu categories
    if (payload.menu_categories && payload.menu_categories.length > 0) {
      console.log(`Importing ${payload.menu_categories.length} menu categories...`);
      results.menu_categories = { inserted: 0, errors: [] };
      
      for (const cat of payload.menu_categories) {
        const { error } = await supabase
          .from("menu_categories")
          .upsert({
            id: cat.id,
            name: cat.name,
            sort_order: cat.sort_order,
            is_active: cat.is_active,
            created_at: cat.created_at
          }, { onConflict: 'id' });
        
        if (error) {
          results.menu_categories.errors.push(`${cat.name}: ${error.message}`);
        } else {
          results.menu_categories.inserted++;
        }
      }
    }

    // Import inventory items
    if (payload.inventory_items && payload.inventory_items.length > 0) {
      console.log(`Importing ${payload.inventory_items.length} inventory items...`);
      results.inventory_items = { inserted: 0, errors: [] };
      
      // Batch insert for performance
      const batchSize = 50;
      for (let i = 0; i < payload.inventory_items.length; i += batchSize) {
        const batch = payload.inventory_items.slice(i, i + batchSize);
        const { error } = await supabase
          .from("inventory_items")
          .upsert(batch.map(item => ({
            id: item.id,
            name: item.name,
            category: item.category || null,
            unit: item.unit || 'pcs',
            current_stock: item.current_stock || 0,
            min_stock_level: item.min_stock_level || 5,
            cost_per_unit: item.cost_per_unit || null,
            supplier: item.supplier || null,
            is_active: item.is_active ?? true,
            created_at: item.created_at,
            updated_at: item.updated_at,
            supplier_id: item.supplier_id || null
          })), { onConflict: 'id' });
        
        if (error) {
          results.inventory_items.errors.push(`Batch ${i/batchSize + 1}: ${error.message}`);
        } else {
          results.inventory_items.inserted += batch.length;
        }
      }
    }

    // Import menu items
    if (payload.menu_items && payload.menu_items.length > 0) {
      console.log(`Importing ${payload.menu_items.length} menu items...`);
      results.menu_items = { inserted: 0, errors: [] };
      
      const batchSize = 50;
      for (let i = 0; i < payload.menu_items.length; i += batchSize) {
        const batch = payload.menu_items.slice(i, i + batchSize);
        const { error } = await supabase
          .from("menu_items")
          .upsert(batch.map(item => ({
            id: item.id,
            name: item.name,
            description: item.description || null,
            price: item.price || 0,
            cost_price: item.cost_price || null,
            category_id: item.category_id || null,
            image_url: item.image_url || null,
            is_available: item.is_available ?? true,
            is_active: item.is_active ?? true,
            track_inventory: item.track_inventory ?? false,
            inventory_item_id: item.inventory_item_id || null,
            created_at: item.created_at,
            updated_at: item.updated_at
          })), { onConflict: 'id' });
        
        if (error) {
          results.menu_items.errors.push(`Batch ${i/batchSize + 1}: ${error.message}`);
        } else {
          results.menu_items.inserted += batch.length;
        }
      }
    }

    // Import restaurant settings
    if (payload.restaurant_settings && payload.restaurant_settings.length > 0) {
      console.log(`Importing restaurant settings...`);
      results.restaurant_settings = { inserted: 0, errors: [] };
      
      for (const setting of payload.restaurant_settings) {
        const { error } = await supabase
          .from("restaurant_settings")
          .upsert({
            id: setting.id,
            name: setting.name,
            tagline: setting.tagline,
            address: setting.address,
            city: setting.city,
            country: setting.country,
            phone: setting.phone,
            email: setting.email,
            logo_url: setting.logo_url,
            currency: setting.currency,
            timezone: setting.timezone,
            receipt_footer: setting.receipt_footer,
            receipt_show_logo: setting.receipt_show_logo,
            created_at: setting.created_at,
            updated_at: setting.updated_at
          }, { onConflict: 'id' });
        
        if (error) {
          results.restaurant_settings.errors.push(error.message);
        } else {
          results.restaurant_settings.inserted++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Import error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
