import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ReportsHeader } from "@/components/reports/ReportsHeader";
import { SalesMetrics } from "@/components/reports/SalesMetrics";
import { RevenueChart } from "@/components/reports/RevenueChart";
import { TopItemsChart } from "@/components/reports/TopItemsChart";
import { SalesByType } from "@/components/reports/SalesByType";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { ordersApi } from "@/lib/api/orders";

export type DateRange = "today" | "7days" | "30days" | "custom";

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
    }
  };

  const { start, end } = getDateFilter();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["reports-orders", dateRange, customStart, customEnd],
    queryFn: async () => {
      const data = await ordersApi.getCompletedOrdersByDate(
        start.toISOString(),
        end.toISOString()
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
    </div>
  );
};

export default Reports;
