import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Download, Upload, Database, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import apiClient from "@/lib/api/client";
import { supabase } from "@/integrations/supabase/client";
import { getEnvironmentConfig } from "@/lib/db/environment";

interface SyncResult {
  menu_categories: number;
  menu_items: number;
  inventory_items: number;
  suppliers: number;
  orders: number;
  order_items: number;
  payments: number;
  restaurant_settings: number;
  errors: string[];
}

export default function DataSync() {
  const { role } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [exportData, setExportData] = useState<string>("");
  const config = getEnvironmentConfig();

  // Only super_admin can access this page
  if (role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  // Fetch all data from Supabase
  const fetchSupabaseData = async () => {
    const tables = [
      'menu_categories',
      'menu_items', 
      'inventory_items',
      'suppliers',
      'orders',
      'order_items',
      'payments',
      'restaurant_settings',
    ];

    const data: Record<string, unknown[]> = {};

    for (const table of tables) {
      try {
        const { data: tableData, error } = await supabase
          .from(table as 'menu_categories')
          .select('*');
        
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          data[table] = [];
        } else {
          data[table] = tableData || [];
        }
      } catch (err) {
        console.error(`Error fetching ${table}:`, err);
        data[table] = [];
      }
    }

    return data;
  };

  // Sync from Supabase to MySQL
  const syncFromSupabase = async () => {
    if (!config.supabaseAvailable) {
      toast.error("Supabase is not configured in this environment");
      return;
    }

    setIsSyncing(true);
    setResult(null);

    try {
      toast.info("Fetching data from Supabase...");
      const data = await fetchSupabaseData();
      
      const totalRecords = Object.values(data).reduce((sum, arr) => sum + (arr as unknown[]).length, 0);
      toast.info(`Found ${totalRecords} records. Syncing to MySQL...`);

      const response = await apiClient.post("/health/sync-from-supabase", data);

      if (response.data.success) {
        setResult(response.data.results);
        toast.success("Data sync completed successfully!");
      } else {
        throw new Error(response.data.error || "Sync failed");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      toast.error(message);
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Export MySQL data
  const exportMySQLData = async () => {
    setIsExporting(true);

    try {
      const response = await apiClient.get("/health/export");
      const dataStr = JSON.stringify(response.data, null, 2);
      setExportData(dataStr);
      toast.success("Data exported successfully!");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  // Download export as JSON file
  const downloadExport = () => {
    if (!exportData) return;
    
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cherry-pos-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Backup downloaded!");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Data Sync & Backup</h1>
          <p className="text-muted-foreground mt-2">
            Sync data between Supabase (online) and MySQL (offline) databases.
          </p>
        </div>

        {/* Environment Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Environment Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <div className={`w-3 h-3 rounded-full ${config.mode === 'supabase' ? 'bg-green-500' : config.mode === 'hybrid' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                <div>
                  <p className="text-sm font-medium">Mode</p>
                  <p className="text-xs text-muted-foreground capitalize">{config.mode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                {config.supabaseAvailable ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">Supabase</p>
                  <p className="text-xs text-muted-foreground">
                    {config.supabaseAvailable ? 'Connected' : 'Not configured'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                {config.mysqlAvailable ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <div>
                  <p className="text-sm font-medium">MySQL (REST API)</p>
                  <p className="text-xs text-muted-foreground">
                    {config.mysqlAvailable ? 'Available' : 'Not available'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="sync">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sync">
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Data
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Download className="mr-2 h-4 w-4" />
              Backup / Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Sync from Supabase to MySQL</CardTitle>
                <CardDescription>
                  Pull all data from your online Supabase database and sync it to the local MySQL database.
                  This is useful for setting up offline mode with existing data.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-medium mb-2">What gets synced:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>Menu categories and items</li>
                    <li>Inventory items and suppliers</li>
                    <li>Orders, order items, and payments</li>
                    <li>Restaurant settings</li>
                  </ul>
                </div>

                <Button
                  onClick={syncFromSupabase}
                  disabled={isSyncing || !config.supabaseAvailable}
                  className="w-full"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Sync from Supabase
                    </>
                  )}
                </Button>

                {!config.supabaseAvailable && (
                  <p className="text-sm text-yellow-600 text-center">
                    Supabase is not configured. This feature is only available when running in online/hybrid mode.
                  </p>
                )}

                {result && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
                    <p className="font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      Sync Results
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Categories: {result.menu_categories}</div>
                      <div>Menu Items: {result.menu_items}</div>
                      <div>Inventory: {result.inventory_items}</div>
                      <div>Suppliers: {result.suppliers}</div>
                      <div>Orders: {result.orders}</div>
                      <div>Order Items: {result.order_items}</div>
                      <div>Payments: {result.payments}</div>
                      <div>Settings: {result.restaurant_settings}</div>
                    </div>
                    {result.errors.length > 0 && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                        <p className="font-medium text-destructive">Errors ({result.errors.length}):</p>
                        <ul className="list-disc list-inside text-xs">
                          {result.errors.slice(0, 5).map((err, i) => (
                            <li key={i}>{err}</li>
                          ))}
                          {result.errors.length > 5 && (
                            <li>...and {result.errors.length - 5} more</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Export MySQL Data</CardTitle>
                <CardDescription>
                  Export all data from the MySQL database as a JSON backup file.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={exportMySQLData}
                    disabled={isExporting}
                    variant="outline"
                    className="flex-1"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Exporting...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Export Data
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={downloadExport}
                    disabled={!exportData}
                    className="flex-1"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download JSON
                  </Button>
                </div>

                {exportData && (
                  <Textarea
                    value={exportData}
                    readOnly
                    className="min-h-[300px] font-mono text-xs"
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
