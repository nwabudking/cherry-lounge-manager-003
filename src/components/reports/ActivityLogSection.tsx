import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  User,
  Truck,
  Plus,
  Minus,
  Trash2,
  Edit,
  TrendingUp,
  TrendingDown,
  Activity,
} from "lucide-react";
import { format } from "date-fns";
import { activityLogApi, ActivityLog, ActionType, EntityType } from "@/lib/api/activityLog";

interface ActivityLogSectionProps {
  startDate: Date;
  endDate: Date;
}

const getActionIcon = (actionType: string) => {
  switch (actionType) {
    case 'inventory_add':
    case 'supplier_add':
    case 'user_add':
      return <Plus className="w-4 h-4 text-green-600" />;
    case 'inventory_remove':
    case 'stock_out':
      return <Minus className="w-4 h-4 text-orange-600" />;
    case 'inventory_delete':
    case 'supplier_delete':
    case 'user_delete':
      return <Trash2 className="w-4 h-4 text-destructive" />;
    case 'inventory_update':
    case 'supplier_update':
    case 'user_update':
      return <Edit className="w-4 h-4 text-blue-600" />;
    case 'stock_in':
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'stock_adjust':
      return <Activity className="w-4 h-4 text-purple-600" />;
    default:
      return <Activity className="w-4 h-4 text-muted-foreground" />;
  }
};

const getEntityIcon = (entityType: string) => {
  switch (entityType) {
    case 'inventory_item':
    case 'stock_movement':
      return <Package className="w-4 h-4" />;
    case 'user':
      return <User className="w-4 h-4" />;
    case 'supplier':
      return <Truck className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
};

const getActionLabel = (actionType: string) => {
  const labels: Record<string, string> = {
    inventory_add: 'Added Item',
    inventory_remove: 'Removed Item',
    inventory_update: 'Updated Item',
    inventory_delete: 'Deleted Item',
    stock_in: 'Stock In',
    stock_out: 'Stock Out',
    stock_adjust: 'Stock Adjusted',
    user_add: 'Added User',
    user_delete: 'Deleted User',
    user_update: 'Updated User',
    supplier_add: 'Added Supplier',
    supplier_update: 'Updated Supplier',
    supplier_delete: 'Deleted Supplier',
  };
  return labels[actionType] || actionType;
};

const getActionBadgeVariant = (actionType: string): "default" | "secondary" | "destructive" | "outline" => {
  if (actionType.includes('delete')) return 'destructive';
  if (actionType.includes('add') || actionType === 'stock_in') return 'default';
  if (actionType.includes('update') || actionType === 'stock_adjust') return 'secondary';
  return 'outline';
};

export const ActivityLogSection = ({ startDate, endDate }: ActivityLogSectionProps) => {
  const [filterType, setFilterType] = useState<string>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["activity-logs", startDate.toISOString(), endDate.toISOString(), filterType],
    queryFn: async () => {
      const params: {
        startDate: string;
        endDate: string;
        entityTypes?: EntityType[];
        limit: number;
      } = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 100,
      };

      if (filterType !== "all") {
        params.entityTypes = [filterType as EntityType];
      }

      return activityLogApi.getActivityLogs(params);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Log
        </CardTitle>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="inventory_item">Inventory</SelectItem>
            <SelectItem value="user">Users</SelectItem>
            <SelectItem value="supplier">Suppliers</SelectItem>
            <SelectItem value="stock_movement">Stock Movements</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No activity logs found for this period</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {getEntityIcon(log.entity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getActionBadgeVariant(log.action_type)}>
                        <span className="flex items-center gap-1">
                          {getActionIcon(log.action_type)}
                          {getActionLabel(log.action_type)}
                        </span>
                      </Badge>
                      {log.entity_name && (
                        <span className="font-medium text-sm truncate">
                          {log.entity_name}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {typeof log.details === 'object' && log.details !== null
                          ? Object.entries(log.details)
                              .filter(([_, v]) => v !== null && v !== undefined)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' • ')
                          : String(log.details)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}</span>
                      {log.performed_by_name && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.performed_by_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
