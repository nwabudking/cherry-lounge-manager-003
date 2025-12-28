import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle2, Upload, Download, Save } from "lucide-react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import apiClient from "@/lib/api/client";
import { useSupabaseForReads } from "@/lib/db/environment";

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

interface BackupData {
  menu_categories: any[];
  inventory_items: any[];
  menu_items: any[];
  restaurant_settings: any[];
  orders: any[];
  order_items: any[];
  payments: any[];
  stock_movements: any[];
  suppliers: any[];
  exported_at: string;
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

// Convert array to CSV
function arrayToCSV(data: any[], headers: string[]): string {
  const csvRows = [headers.join(';')];
  for (const row of data) {
    const values = headers.map(h => {
      const val = row[h];
      if (val === null || val === undefined) return '';
      if (typeof val === 'boolean') return val.toString();
      return String(val);
    });
    csvRows.push(values.join(';'));
  }
  return csvRows.join('\n');
}

export default function DataImport() {
  const { role } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<ImportResults | null>(null);
  const [backupInfo, setBackupInfo] = useState<{ date: string; counts: Record<string, number> } | null>(null);

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
        category_type: parseValue(row.category_type, 'string') || 'food',
        sort_order: parseValue(row.sort_order, 'number') || 0,
        is_active: parseValue(row.is_active, 'boolean') ?? true,
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
      }));

      console.log('Parsed data:', {
        categories: categoriesData.length,
        inventory: inventoryData.length,
        menu: menuData.length,
        settings: settingsData.length
      });

      // Import to Supabase if available
      if (useSupabaseForReads()) {
        const importResults: ImportResults = {};

        // Import categories
        const { error: catError } = await supabase
          .from('menu_categories')
          .upsert(categoriesData, { onConflict: 'id' });
        importResults.menu_categories = {
          inserted: categoriesData.length,
          errors: catError ? [catError.message] : []
        };

        // Import inventory
        const { error: invError } = await supabase
          .from('inventory_items')
          .upsert(inventoryData, { onConflict: 'id' });
        importResults.inventory_items = {
          inserted: inventoryData.length,
          errors: invError ? [invError.message] : []
        };

        // Import menu items
        const { error: menuError } = await supabase
          .from('menu_items')
          .upsert(menuData, { onConflict: 'id' });
        importResults.menu_items = {
          inserted: menuData.length,
          errors: menuError ? [menuError.message] : []
        };

        // Import settings
        const { error: settingsError } = await supabase
          .from('restaurant_settings')
          .upsert(settingsData, { onConflict: 'id' });
        importResults.restaurant_settings = {
          inserted: settingsData.length,
          errors: settingsError ? [settingsError.message] : []
        };

        setResults(importResults);
        toast.success("Data import completed!");
      } else {
        // Call the REST API for Docker/MySQL
        const response = await apiClient.post<{ results: ImportResults }>('/data/import', {
          menu_categories: categoriesData,
          inventory_items: inventoryData,
          menu_items: menuData,
          restaurant_settings: settingsData
        });
        setResults(response.data.results);
        toast.success("Data import completed!");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportBackup = async () => {
    setIsExporting(true);
    setBackupInfo(null);

    try {
      let backupData: BackupData;

      if (useSupabaseForReads()) {
        // Export from Supabase
        const [
          { data: categories },
          { data: inventory },
          { data: menu },
          { data: settings },
          { data: orders },
          { data: orderItems },
          { data: payments },
          { data: movements },
          { data: suppliers }
        ] = await Promise.all([
          supabase.from('menu_categories').select('*'),
          supabase.from('inventory_items').select('*'),
          supabase.from('menu_items').select('*'),
          supabase.from('restaurant_settings').select('*'),
          supabase.from('orders').select('*'),
          supabase.from('order_items').select('*'),
          supabase.from('payments').select('*'),
          supabase.from('stock_movements').select('*'),
          supabase.from('suppliers').select('*'),
        ]);

        backupData = {
          menu_categories: categories || [],
          inventory_items: inventory || [],
          menu_items: menu || [],
          restaurant_settings: settings || [],
          orders: orders || [],
          order_items: orderItems || [],
          payments: payments || [],
          stock_movements: movements || [],
          suppliers: suppliers || [],
          exported_at: new Date().toISOString(),
        };
      } else {
        // Export from REST API
        const [categories, inventory, menu, orders] = await Promise.all([
          apiClient.get('/menu/categories').then(r => r.data || []),
          apiClient.get('/inventory/items').then(r => r.data || []),
          apiClient.get('/menu/items').then(r => r.data || []),
          apiClient.get('/orders').then(r => r.data || []),
        ]);

        backupData = {
          menu_categories: Array.isArray(categories) ? categories : [],
          inventory_items: Array.isArray(inventory) ? inventory : [],
          menu_items: Array.isArray(menu) ? menu : [],
          restaurant_settings: [],
          orders: Array.isArray(orders) ? orders : [],
          order_items: [],
          payments: [],
          stock_movements: [],
          suppliers: [],
          exported_at: new Date().toISOString(),
        };
      }

      // Download as JSON backup
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `restaurant-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setBackupInfo({
        date: new Date().toLocaleString(),
        counts: {
          menu_categories: backupData.menu_categories.length,
          inventory_items: backupData.inventory_items.length,
          menu_items: backupData.menu_items.length,
          orders: backupData.orders.length,
          suppliers: backupData.suppliers.length,
        }
      });

      toast.success("Backup exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Management</h1>
          <p className="text-muted-foreground mt-2">
            Import and export your restaurant data for backup and migration.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Import Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Import data from CSV files stored in the project folder.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Menu Categories</p>
                <p>• Inventory Items</p>
                <p>• Menu Items</p>
                <p>• Restaurant Settings</p>
              </div>
              <Button
                onClick={handleImport}
                disabled={isImporting}
                className="w-full"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Import All Data
                  </>
                )}
              </Button>

              {results && (
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Import Results
                  </h4>
                  <div className="text-sm space-y-1">
                    {results.menu_categories && (
                      <p>Categories: {results.menu_categories.inserted} imported</p>
                    )}
                    {results.inventory_items && (
                      <p>Inventory: {results.inventory_items.inserted} imported</p>
                    )}
                    {results.menu_items && (
                      <p>Menu Items: {results.menu_items.inserted} imported</p>
                    )}
                    {results.restaurant_settings && (
                      <p>Settings: {results.restaurant_settings.inserted} imported</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export/Backup Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Backup
              </CardTitle>
              <CardDescription>
                Download a complete backup of all your data as JSON.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• All menu data</p>
                <p>• Inventory & suppliers</p>
                <p>• Orders & payments</p>
                <p>• Stock movements</p>
              </div>
              <Button
                onClick={handleExportBackup}
                disabled={isExporting}
                variant="outline"
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Download Backup
                  </>
                )}
              </Button>

              {backupInfo && (
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-medium flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Backup Complete
                  </h4>
                  <p className="text-xs text-muted-foreground">{backupInfo.date}</p>
                  <div className="text-sm space-y-1">
                    {Object.entries(backupInfo.counts).map(([key, count]) => (
                      <p key={key}>{key.replace('_', ' ')}: {count} records</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
