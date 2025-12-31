import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, Trash2, Clock } from "lucide-react";
import { CartItem } from "@/pages/POS";
import { formatDistanceToNow } from "date-fns";

export interface SuspendedOrder {
  id: string;
  cart: CartItem[];
  orderType: "dine_in" | "takeaway" | "delivery" | "bar_only";
  tableNumber: string;
  suspendedAt: string;
  customerName?: string;
}

interface SuspendedOrdersPanelProps {
  suspendedOrders: SuspendedOrder[];
  onResume: (order: SuspendedOrder) => void;
  onDelete: (orderId: string) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
};

const orderTypeLabels: Record<string, string> = {
  dine_in: "Dine In",
  takeaway: "Takeaway",
  delivery: "Delivery",
  bar_only: "Bar Only",
};

export const SuspendedOrdersPanel = ({
  suspendedOrders,
  onResume,
  onDelete,
}: SuspendedOrdersPanelProps) => {
  if (suspendedOrders.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Pause className="h-4 w-4 text-amber-500" />
          Suspended Orders ({suspendedOrders.length})
        </CardTitle>
      </CardHeader>
      <ScrollArea className="max-h-48">
        <CardContent className="pt-0 space-y-2">
          {suspendedOrders.map((order) => {
            const total = order.cart.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0
            );
            const itemCount = order.cart.reduce(
              (sum, item) => sum + item.quantity,
              0
            );

            return (
              <div
                key={order.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {orderTypeLabels[order.orderType]}
                    </Badge>
                    {order.tableNumber && (
                      <Badge variant="secondary" className="text-xs">
                        Table {order.tableNumber}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-sm">
                    <span className="font-medium">
                      {itemCount} item{itemCount > 1 ? "s" : ""} •{" "}
                      {formatPrice(total)}
                    </span>
                    {order.customerName && (
                      <span className="text-muted-foreground truncate">
                        • {order.customerName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(order.suspendedAt), {
                      addSuffix: true,
                    })}
                  </div>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => onResume(order)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDelete(order.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};
