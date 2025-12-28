import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Database, CheckCircle2, Upload, Download, Save } from "lucide-react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

import menuCategoriesCSV from "@/data/menu_categories.csv?raw";
import menuItemsCSV from "@/data/menu_items.csv?raw";
import inventoryItemsCSV from "@/data/inventory_items.csv?raw";
import restaurantSettingsCSV from "@/data/restaurant_settings.csv?raw";

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(';').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(';');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => row[h] = values[i]?.trim() || '');
    return row;
  });
}

function parseValue(value: string, type: 'string' | 'number' | 'boolean'): any {
  if (!value || value === 'null') return null;
  if (type === 'number') return parseFloat(value) || null;
  if (type === 'boolean') return value.toLowerCase() === 'true';
  return value;
}

export default function DataImport() {
  const { role } = useAuth();
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [results, setResults] = useState<Record<string, { inserted: number }> | null>(null);

  if (role !== "super_admin") return <Navigate to="/dashboard" replace />;

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const categories = parseCSV(menuCategoriesCSV).map(r => ({
        id: r.id || undefined, name: r.name, category_type: r.category_type || 'food',
        sort_order: parseValue(r.sort_order, 'number') || 0, is_active: parseValue(r.is_active, 'boolean') ?? true,
      }));
      const inventory = parseCSV(inventoryItemsCSV).map(r => ({
        id: r.id || undefined, name: r.name, category: r.category, unit: r.unit || 'pcs',
        current_stock: parseValue(r.current_stock, 'number') || 0, min_stock_level: parseValue(r.min_stock_level, 'number') || 5,
        cost_per_unit: parseValue(r.cost_per_unit, 'number'), is_active: parseValue(r.is_active, 'boolean') ?? true,
      }));
      const menu = parseCSV(menuItemsCSV).map(r => ({
        id: r.id || undefined, name: r.name, category_id: r.category_id || null,
        price: parseValue(r.price, 'number') || 0, is_active: parseValue(r.is_active, 'boolean') ?? true,
      }));

      await supabase.from('menu_categories').upsert(categories, { onConflict: 'id' });
      await supabase.from('inventory_items').upsert(inventory, { onConflict: 'id' });
      await supabase.from('menu_items').upsert(menu, { onConflict: 'id' });

      setResults({ menu_categories: { inserted: categories.length }, inventory_items: { inserted: inventory.length }, menu_items: { inserted: menu.length } });
      toast.success("Data imported!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const [{ data: cat }, { data: inv }, { data: menu }, { data: orders }] = await Promise.all([
        supabase.from('menu_categories').select('*'),
        supabase.from('inventory_items').select('*'),
        supabase.from('menu_items').select('*'),
        supabase.from('orders').select('*'),
      ]);
      const backup = { menu_categories: cat || [], inventory_items: inv || [], menu_items: menu || [], orders: orders || [], exported_at: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      toast.success("Backup exported!");
    } catch (e) {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Data Management</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle><Upload className="h-5 w-5 inline mr-2" />Import</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleImport} disabled={isImporting} className="w-full">
              {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
              Import Data
            </Button>
            {results && <div className="mt-4 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500 inline mr-2" />Imported: {Object.entries(results).map(([k, v]) => `${k}: ${v.inserted}`).join(', ')}</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle><Download className="h-5 w-5 inline mr-2" />Export</CardTitle></CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isExporting} variant="outline" className="w-full">
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Download Backup
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
