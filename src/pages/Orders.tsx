import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useOrders, useUpdateOrderStatus } from "@/hooks/useOrders";
import { useUserRole } from "@/hooks/useUserRole";
import { OrdersHeader } from "@/components/orders/OrdersHeader";
import { OrdersFilters } from "@/components/orders/OrdersFilters";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import type { Order, OrderItem } from "@/lib/api/orders";

export type OrderWithItems = Order & {
  order_items?: OrderItem[];
  payments?: Array<{
    id: string;
    amount: number;
    payment_method: string;
    status: string;
  }>;
};

export type OrderStatus = "pending" | "preparing" | "ready" | "completed" | "cancelled";

const Orders = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { permissions, getFilterUserId, role, isPrivilegedUser } = useUserRole();

  // Get the filter user ID for non-privileged users
  const filterUserId = getFilterUserId();
  const isPersonalView = !!filterUserId;

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);

  const { data: rawOrders, isLoading } = useOrders({
    status: statusFilter !== "all" ? statusFilter : undefined,
    orderType: orderTypeFilter !== "all" ? orderTypeFilter : undefined,
    search: searchQuery || undefined,
    startDate: dateFilter
      ? new Date(dateFilter.setHours(0, 0, 0, 0)).toISOString()
      : undefined,
    endDate: dateFilter
      ? new Date(dateFilter.setHours(23, 59, 59, 999)).toISOString()
      : undefined,
    createdBy: filterUserId || undefined,
  });
  const orders = Array.isArray(rawOrders) ? rawOrders : [];

  const updateStatusMutation = useUpdateOrderStatus();

  const handleUpdateStatus = (orderId: string, status: OrderStatus) => {
    updateStatusMutation.mutate(
      { id: orderId, status },
      {
        onSuccess: () => {
          setSelectedOrder(null);
        },
      }
    );
  };

  const activeOrders = orders.filter((o) =>
    ["pending", "preparing", "ready"].includes(o.status)
  );

  const completedOrders = orders.filter((o) =>
    ["completed", "cancelled"].includes(o.status)
  );

  const getRoleDisplayName = (role: string | null) => {
    if (!role) return "";
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <OrdersHeader
          activeCount={activeOrders.length}
          completedCount={completedOrders.length}
        />
        <div className="flex items-center gap-2">
          {isPersonalView && (
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              My Orders
            </Badge>
          )}
          {role && (
            <Badge variant="secondary">
              {getRoleDisplayName(role)}
            </Badge>
          )}
        </div>
      </div>

      {isPersonalView && (
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            You are viewing your own orders only. Contact a manager to view all orders.
          </p>
        </div>
      )}

      <OrdersFilters
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        orderTypeFilter={orderTypeFilter}
        setOrderTypeFilter={setOrderTypeFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
      />

      <OrdersTable
        orders={orders as OrderWithItems[]}
        isLoading={isLoading}
        onViewOrder={setSelectedOrder}
        onUpdateStatus={(orderId, status) => handleUpdateStatus(orderId, status)}
      />

      <OrderDetailsDialog
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
        onUpdateStatus={(status) =>
          selectedOrder && handleUpdateStatus(selectedOrder.id, status)
        }
        isUpdating={updateStatusMutation.isPending}
      />
    </div>
  );
};

export default Orders;
