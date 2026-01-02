import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { unifiedAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Settings as SettingsIcon, Building2, Receipt, User, Save, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Navigate } from "react-router-dom";
import { ThemeSelector } from "@/components/settings/ThemeSelector";

const Settings = () => {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("restaurant");
  const [restaurantForm, setRestaurantForm] = useState<Record<string, any>>({});
  const [formInitialized, setFormInitialized] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (role !== "super_admin") {
    return <Navigate to="/dashboard" replace />;
  }

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  useEffect(() => {
    if (settings && !formInitialized) {
      setRestaurantForm(settings);
      setFormInitialized(true);
    }
  }, [settings, formInitialized]);

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await unifiedAuth.changePassword(newPassword);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => toast.error("Failed: " + error.message),
  });

  if (settingsLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your restaurant settings</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="restaurant"><Building2 className="h-4 w-4 mr-2 hidden sm:block" />Restaurant</TabsTrigger>
          <TabsTrigger value="receipt"><Receipt className="h-4 w-4 mr-2 hidden sm:block" />Receipt</TabsTrigger>
          <TabsTrigger value="themes"><Palette className="h-4 w-4 mr-2 hidden sm:block" />Themes</TabsTrigger>
          <TabsTrigger value="account"><User className="h-4 w-4 mr-2 hidden sm:block" />Account</TabsTrigger>
        </TabsList>

        <TabsContent value="restaurant">
          <Card>
            <CardHeader>
              <CardTitle>Restaurant Information</CardTitle>
              <CardDescription>This information appears on receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Restaurant Name</Label>
                  <Input value={restaurantForm.name || ""} onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tagline</Label>
                  <Input value={restaurantForm.tagline || ""} onChange={(e) => setRestaurantForm({ ...restaurantForm, tagline: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={restaurantForm.address || ""} onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })} />
              </div>
              <Button onClick={() => updateSettingsMutation.mutate(restaurantForm)} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="receipt">
          <Card>
            <CardHeader><CardTitle>Receipt Customization</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Show Logo on Receipt</Label>
                <Switch checked={restaurantForm.receipt_show_logo || false} onCheckedChange={(checked) => setRestaurantForm({ ...restaurantForm, receipt_show_logo: checked })} />
              </div>
              <div className="space-y-2">
                <Label>Receipt Footer</Label>
                <Textarea value={restaurantForm.receipt_footer || ""} onChange={(e) => setRestaurantForm({ ...restaurantForm, receipt_footer: e.target.value })} rows={3} />
              </div>
              <Button onClick={() => updateSettingsMutation.mutate(restaurantForm)} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="themes">
          <ThemeSelector />
        </TabsContent>

        <TabsContent value="account">
          <Card>
            <CardHeader><CardTitle>Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending || !newPassword}>
                {changePasswordMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
