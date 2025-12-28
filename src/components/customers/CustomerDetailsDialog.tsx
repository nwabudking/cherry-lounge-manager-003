import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Star,
  ShoppingBag,
  DollarSign,
  Gift,
  Plus,
  Minus,
} from "lucide-react";
import { format } from "date-fns";
import type { Customer } from "@/lib/api/customers";
import { useCustomerOrders, useAddLoyaltyPoints, useRedeemLoyaltyPoints } from "@/hooks/useCustomers";

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
};

export const CustomerDetailsDialog = ({
  customer,
  open,
  onOpenChange,
  onEdit,
}: CustomerDetailsDialogProps) => {
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState("");

  const { data: orders, isLoading: ordersLoading } = useCustomerOrders(
    customer?.id || ""
  );

  const addPointsMutation = useAddLoyaltyPoints();
  const redeemPointsMutation = useRedeemLoyaltyPoints();

  if (!customer) return null;

  const handleAddPoints = () => {
    const points = parseInt(pointsToAdd);
    if (points > 0) {
      addPointsMutation.mutate({ id: customer.id, points });
      setPointsToAdd("");
    }
  };

  const handleRedeemPoints = () => {
    const points = parseInt(pointsToRedeem);
    if (points > 0 && points <= customer.loyalty_points) {
      redeemPointsMutation.mutate({ id: customer.id, points });
      setPointsToRedeem("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {customer.name}
            {customer.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="ml-1">
                {tag}
              </Badge>
            ))}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.phone}</span>
                      </div>
                    )}
                    {customer.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.email}</span>
                      </div>
                    )}
                    {customer.address && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{customer.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <ShoppingBag className="w-4 h-4" /> Total Orders
                      </span>
                      <span className="font-semibold">{customer.total_orders}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-4 h-4" /> Total Spent
                      </span>
                      <span className="font-semibold">
                        {formatPrice(customer.total_spent)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Star className="w-4 h-4" /> Points
                      </span>
                      <span className="font-semibold text-primary">
                        {customer.loyalty_points}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {customer.notes && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{customer.notes}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={onEdit}>Edit Customer</Button>
            </div>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {ordersLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !orders || orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No orders found for this customer
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {order.order_type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "completed"
                                ? "default"
                                : "secondary"
                            }
                            className="capitalize"
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(order.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="loyalty" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-primary" />
                  Loyalty Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-primary">
                    {customer.loyalty_points}
                  </p>
                  <p className="text-sm text-muted-foreground">Available Points</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Add Points</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Points"
                        value={pointsToAdd}
                        onChange={(e) => setPointsToAdd(e.target.value)}
                      />
                      <Button
                        size="icon"
                        onClick={handleAddPoints}
                        disabled={
                          !pointsToAdd ||
                          parseInt(pointsToAdd) <= 0 ||
                          addPointsMutation.isPending
                        }
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Redeem Points</p>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        max={customer.loyalty_points}
                        placeholder="Points"
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(e.target.value)}
                      />
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={handleRedeemPoints}
                        disabled={
                          !pointsToRedeem ||
                          parseInt(pointsToRedeem) <= 0 ||
                          parseInt(pointsToRedeem) > customer.loyalty_points ||
                          redeemPointsMutation.isPending
                        }
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Tip: Award 1 point per ₦100 spent. 100 points = ₦500 discount.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
