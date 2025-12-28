import { useState } from "react";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from "@/hooks/useCustomers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Search, Plus, Star, ShoppingBag } from "lucide-react";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { CustomerDetailsDialog } from "@/components/customers/CustomerDetailsDialog";
import { CustomersTable } from "@/components/customers/CustomersTable";
import type { Customer, CreateCustomerData } from "@/lib/api/customers";

const Customers = () => {
  const { permissions } = useUserRole();
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  const { data: rawCustomers, isLoading } = useCustomers(search);
  const customers = Array.isArray(rawCustomers) ? rawCustomers : [];

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  const canManage = permissions.isPrivileged;

  // Stats
  const totalCustomers = customers.length;
  const totalLoyaltyPoints = customers.reduce((sum, c) => sum + c.loyalty_points, 0);
  const vipCount = customers.filter((c) => c.tags.includes("VIP")).length;

  const handleAddCustomer = () => {
    setSelectedCustomer(null);
    setIsDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(false);
    setIsDialogOpen(true);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteOpen(true);
  };

  const handleSave = (data: CreateCustomerData) => {
    if (selectedCustomer) {
      updateMutation.mutate(
        { id: selectedCustomer.id, data },
        { onSuccess: () => setIsDialogOpen(false) }
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setIsDialogOpen(false) });
    }
  };

  const handleConfirmDelete = () => {
    if (customerToDelete) {
      deleteMutation.mutate(customerToDelete.id, {
        onSuccess: () => {
          setIsDeleteOpen(false);
          setCustomerToDelete(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-sm text-muted-foreground">
              Manage customer profiles and loyalty program
            </p>
          </div>
        </div>
        <Button onClick={handleAddCustomer}>
          <Plus className="w-4 h-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="w-4 h-4" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalCustomers}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="w-4 h-4" />
              Total Loyalty Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{totalLoyaltyPoints.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              VIP Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{vipCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <CustomersTable
        customers={customers}
        isLoading={isLoading}
        onView={handleViewCustomer}
        onEdit={handleEditCustomer}
        onDelete={handleDeleteClick}
        canManage={canManage}
      />

      {/* Dialogs */}
      <CustomerDialog
        customer={selectedCustomer}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <CustomerDetailsDialog
        customer={selectedCustomer}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onEdit={() => handleEditCustomer(selectedCustomer!)}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {customerToDelete?.name}? This will
              deactivate the customer but preserve their order history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Customers;
