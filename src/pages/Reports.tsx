import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportsHeader } from "@/components/reports/ReportsHeader";
import { SalesMetrics } from "@/components/reports/SalesMetrics";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { TopItemsChart } from "@/components/reports/TopItemsChart";
import { SalesByType } from "@/components/reports/SalesByType";
import { ActivityLogSection } from "@/components/reports/ActivityLogSection";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { ordersApi } from "@/lib/api/orders";
import { useUserRole } from "@/hooks/useUserRole";
import { Badge } from "@/components/ui/badge";
import { User, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export type DateRange = "today" | "7days" | "30days" | "custom" | "multiday";

interface OrderWithDetails {
  id: string;
  order_number: string;
  order_type: string;
  total_amount: number;
  created_at: string;
  items?: { item_name: string; quantity: number; total_price: number }[];
  payments?: { payment_method: string; amount: number }[];
}

const Reports = () => {
  const [dateRange, setDateRange] = useState<DateRange>("7days");
  const [customStart, setCustomStart] = useState<Date | undefined>();
  const [customEnd, setCustomEnd] = useState<Date | undefined>();
  const [selectedDays, setSelectedDays] = useState<Date[]>([]);
  const { permissions, getFilterUserId, role, isPrivilegedUser } = useUserRole();

  // Get the filter user ID for non-privileged users
  const filterUserId = getFilterUserId();
  const isPersonalView = !!filterUserId;

  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "7days":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "30days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "custom":
        return {
          start: customStart ? startOfDay(customStart) : startOfDay(subDays(now, 7)),
          end: customEnd ? endOfDay(customEnd) : endOfDay(now),
        };
      case "multiday":
        if (selectedDays.length === 0) {
          return { start: startOfDay(now), end: endOfDay(now) };
        }
        const sortedDays = [...selectedDays].sort((a, b) => a.getTime() - b.getTime());
        return { start: startOfDay(sortedDays[0]), end: endOfDay(sortedDays[sortedDays.length - 1]) };
    }
  };

  const { start, end } = getDateFilter();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ["reports-orders", dateRange, customStart, customEnd, selectedDays, filterUserId],
    queryFn: async () => {
      const data = await ordersApi.getCompletedOrdersByDate(
        start.toISOString(),
        end.toISOString(),
        filterUserId || undefined
      );
      return data as OrderWithDetails[];
    },
  });

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItems = orders.reduce(
    (sum, o) => sum + ((o.items || []).reduce((s, i) => s + i.quantity, 0) || 0),
    0
  );

  // Revenue by day
  const revenueByDay = orders.reduce((acc, order) => {
    const day = format(new Date(order.created_at!), "MMM dd");
    acc[day] = (acc[day] || 0) + Number(order.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const revenueChartData = Object.entries(revenueByDay).map(([date, revenue]) => ({
    date,
    revenue,
  }));

  // Top items
  const itemCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      if (!itemCounts[item.item_name]) {
        itemCounts[item.item_name] = { name: item.item_name, quantity: 0, revenue: 0 };
      }
      itemCounts[item.item_name].quantity += item.quantity;
      itemCounts[item.item_name].revenue += Number(item.total_price);
    });
  });

  const topItems = Object.values(itemCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Sales by order type
  const salesByType = orders.reduce((acc, order) => {
    acc[order.order_type] = (acc[order.order_type] || 0) + Number(order.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const salesByTypeData = Object.entries(salesByType).map(([type, value]) => ({
    type,
    value,
  }));

  // Sales by payment method
  const salesByPayment = orders.reduce((acc, order) => {
    const method = (order.payments || [])[0]?.payment_method || "unknown";
    acc[method] = (acc[method] || 0) + Number(order.total_amount);
    return acc;
  }, {} as Record<string, number>);

  const getRoleDisplayName = (role: string | null) => {
    if (!role) return "";
    return role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Show error state
  if (error) {
    return (
      <div className="space-y-6">
        <ReportsHeader
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
        />
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-destructive mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Unable to Load Reports</h3>
            <p className="text-muted-foreground text-center max-w-md">
              There was a problem loading your reports data. Please try again or contact support if the issue persists.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <ReportsHeader
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          selectedDays={selectedDays}
          setSelectedDays={setSelectedDays}
        />
        <div className="flex items-center gap-2">
          {isPersonalView && (
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="w-3 h-3" />
              Personal Report
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
            You are viewing your personal sales report. Only orders you created are included in these metrics.
          </p>
        </div>
      )}

      <SalesMetrics
        totalRevenue={totalRevenue}
        totalOrders={totalOrders}
        averageOrderValue={averageOrderValue}
        totalItems={totalItems}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={revenueChartData} isLoading={isLoading} />
        <TopItemsChart data={topItems} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SalesByType data={salesByTypeData} title="Sales by Order Type" isLoading={isLoading} />
        <SalesByType
          data={Object.entries(salesByPayment).map(([type, value]) => ({ type, value }))}
          title="Sales by Payment Method"
          isLoading={isLoading}
        />
      </div>

      {/* Activity Log Section */}
      <ActivityLogSection startDate={start} endDate={end} />
    </div>
  );
};

export default Reports;
