import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active menu items without inventory links
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, cost_price")
      .eq("is_active", true)
      .is("inventory_item_id", null);

    if (menuError) throw menuError;

    console.log(`Found ${menuItems?.length || 0} menu items without inventory`);

    let created = 0;
    let linked = 0;

    for (const menuItem of menuItems || []) {
      // Create inventory item
      const { data: invItem, error: invError } = await supabase
        .from("inventory_items")
        .insert({
          name: menuItem.name,
          current_stock: 0,
          min_stock_level: 10,
          unit: "pcs",
          cost_per_unit: menuItem.cost_price || null,
        })
        .select("id")
        .single();

      if (invError) {
        console.error(`Failed to create inventory for ${menuItem.name}:`, invError);
        continue;
      }

      created++;

      // Link menu item to inventory
      const { error: linkError } = await supabase
        .from("menu_items")
        .update({
          inventory_item_id: invItem.id,
          track_inventory: true,
          is_available: false, // Start unavailable until stock is added
        })
        .eq("id", menuItem.id);

      if (linkError) {
        console.error(`Failed to link ${menuItem.name}:`, linkError);
        continue;
      }

      linked++;
    }

    console.log(`Created ${created} inventory items, linked ${linked} menu items`);

    return new Response(
      JSON.stringify({
        success: true,
        created,
        linked,
        message: `Created ${created} inventory records and linked ${linked} menu items`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
