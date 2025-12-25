import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle2, Upload } from "lucide-react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// CSV data imports
import menuCategoriesCSV from "@/data/menu_categories.csv?raw";
import menuItemsCSV from "@/data/menu_items.csv?raw";
import inventoryItemsCSV from "@/data/inventory_items.csv?raw";
import restaurantSettingsCSV from "@/data/restaurant_settings.csv?raw";

interface ImportResults {
  menu_categories?: { inserted: number; errors: string[] };
  inventory_items?: { inserted: number; errors: string[] };
  menu_items?: { inserted: number; errors: string[] };
  restaurant_settings?: { inserted: number; errors: string[] };
}

// Parse CSV with semicolon delimiter
function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(';').map(h => h.trim());
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Parse value with type conversion
function parseValue(value: string, type: 'string' | 'number' | 'boolean' | 'uuid'): any {
  if (!value || value === '' || value === 'null' || value === 'NULL') return null;
  
  switch (type) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    case 'boolean':
      return value.toLowerCase() === 'true';
    case 'uuid':
      return value || null;
    default:
      return value;
  }
}

export default function DataImport() {
  const { role } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);

  if (role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const handleImport = async () => {
    setIsImporting(true);
    setResults(null);

    try {
      // Parse all CSVs
      const categoriesData = parseCSV(menuCategoriesCSV).map(row => ({
        id: parseValue(row.id, 'uuid'),
        name: parseValue(row.name, 'string'),
        sort_order: parseValue(row.sort_order, 'number') || 0,
        is_active: parseValue(row.is_active, 'boolean') ?? true,
        created_at: parseValue(row.created_at, 'string') || new Date().toISOString()
      }));

      const inventoryData = parseCSV(inventoryItemsCSV).map(row => ({
        id: parseValue(row.id, 'uuid'),
        name: parseValue(row.name, 'string'),
        category: parseValue(row.category, 'string'),
        unit: parseValue(row.unit, 'string') || 'pcs',
        current_stock: parseValue(row.current_stock, 'number') || 0,
        min_stock_level: parseValue(row.min_stock_level, 'number') || 5,
        cost_per_unit: parseValue(row.cost_per_unit, 'number'),
        supplier: parseValue(row.supplier, 'string'),
        is_active: parseValue(row.is_active, 'boolean') ?? true,
        created_at: parseValue(row.created_at, 'string') || new Date().toISOString(),
        updated_at: parseValue(row.updated_at, 'string') || new Date().toISOString(),
        supplier_id: parseValue(row.supplier_id, 'uuid')
      }));

      const menuData = parseCSV(menuItemsCSV).map(row => ({
        id: parseValue(row.id, 'uuid'),
        category_id: parseValue(row.category_id, 'uuid'),
        name: parseValue(row.name, 'string'),
        description: parseValue(row.description, 'string'),
        price: parseValue(row.price, 'number') || 0,
        cost_price: parseValue(row.cost_price, 'number'),
        image_url: parseValue(row.image_url, 'string'),
        is_available: parseValue(row.is_available, 'boolean') ?? true,
        is_active: parseValue(row.is_active, 'boolean') ?? true,
        created_at: parseValue(row.created_at, 'string') || new Date().toISOString(),
        updated_at: parseValue(row.updated_at, 'string') || new Date().toISOString(),
        inventory_item_id: parseValue(row.inventory_item_id, 'uuid'),
        track_inventory: parseValue(row.track_inventory, 'boolean') ?? false
      }));

      const settingsData = parseCSV(restaurantSettingsCSV).map(row => ({
        id: parseValue(row.id, 'uuid'),
        name: parseValue(row.name, 'string') || 'Cherry Dining',
        tagline: parseValue(row.tagline, 'string'),
        address: parseValue(row.address, 'string'),
        city: parseValue(row.city, 'string'),
        country: parseValue(row.country, 'string'),
        phone: parseValue(row.phone, 'string'),
        email: parseValue(row.email, 'string'),
        logo_url: parseValue(row.logo_url, 'string'),
        currency: parseValue(row.currency, 'string'),
        timezone: parseValue(row.timezone, 'string'),
        receipt_footer: parseValue(row.receipt_footer, 'string'),
        receipt_show_logo: parseValue(row.receipt_show_logo, 'boolean') ?? false,
        created_at: parseValue(row.created_at, 'string') || new Date().toISOString(),
        updated_at: parseValue(row.updated_at, 'string') || new Date().toISOString()
      }));

      console.log('Parsed data:', {
        categories: categoriesData.length,
        inventory: inventoryData.length,
        menu: menuData.length,
        settings: settingsData.length
      });

      // Get session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Call the edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-data`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            menu_categories: categoriesData,
            inventory_items: inventoryData,
            menu_items: menuData,
            restaurant_settings: settingsData
          })
        }
      );

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResults(data.results);
      toast.success("Data import completed!");
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Import</h1>
          <p className="text-muted-foreground mt-2">
            Import your previous restaurant data including menu items, inventory, and categories.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Import Previous Data
            </CardTitle>
            <CardDescription>
              This will import your exported data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>60 Menu Categories</li>
                <li>336 Menu Items</li>
                <li>422 Inventory Items</li>
                <li>Restaurant Settings</li>
              </ul>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleImport}
              disabled={isImporting}
              className="w-full"
              size="lg"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing Data...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import All Data
                </>
              )}
            </Button>

            {results && (
              <div className="space-y-4 mt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  Import Results
                </h3>
                
                <div className="grid gap-3">
                  {results.menu_categories && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">Menu Categories</p>
                      <p className="text-sm text-muted-foreground">
                        {results.menu_categories.inserted} inserted
                        {results.menu_categories.errors.length > 0 && (
                          <span className="text-destructive"> ({results.menu_categories.errors.length} errors)</span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {results.inventory_items && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">Inventory Items</p>
                      <p className="text-sm text-muted-foreground">
                        {results.inventory_items.inserted} inserted
                        {results.inventory_items.errors.length > 0 && (
                          <span className="text-destructive"> ({results.inventory_items.errors.length} errors)</span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {results.menu_items && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">Menu Items</p>
                      <p className="text-sm text-muted-foreground">
                        {results.menu_items.inserted} inserted
                        {results.menu_items.errors.length > 0 && (
                          <span className="text-destructive"> ({results.menu_items.errors.length} errors)</span>
                        )}
                      </p>
                    </div>
                  )}
                  
                  {results.restaurant_settings && (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="font-medium">Restaurant Settings</p>
                      <p className="text-sm text-muted-foreground">
                        {results.restaurant_settings.inserted} inserted
                        {results.restaurant_settings.errors.length > 0 && (
                          <span className="text-destructive"> ({results.restaurant_settings.errors.length} errors)</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
