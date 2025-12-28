import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, Edit, Trash2, Star, Phone, Mail } from "lucide-react";
import type { Customer } from "@/lib/api/customers";

interface CustomersTableProps {
  customers: Customer[];
  isLoading: boolean;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  canManage: boolean;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
  }).format(price);
};

export const CustomersTable = ({
  customers,
  isLoading,
  onView,
  onEdit,
  onDelete,
  canManage,
}: CustomersTableProps) => {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No customers found. Add your first customer to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Customer</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-center">Orders</TableHead>
            <TableHead className="text-right">Total Spent</TableHead>
            <TableHead className="text-center">
              <Star className="w-4 h-4 inline" /> Points
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow
              key={customer.id}
              className="hover:bg-muted/30 cursor-pointer"
              onClick={() => onView(customer)}
            >
              <TableCell>
                <div>
                  <p className="font-medium">{customer.name}</p>
                  {customer.address && (
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                      {customer.address}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  {customer.phone && (
                    <div className="flex items-center gap-1 text-sm">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1 text-sm">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      {customer.email}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {customer.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {customer.tags.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{customer.tags.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">{customer.total_orders}</TableCell>
              <TableCell className="text-right font-medium">
                {formatPrice(customer.total_spent)}
              </TableCell>
              <TableCell className="text-center">
                <Badge
                  variant={customer.loyalty_points > 0 ? "default" : "outline"}
                >
                  {customer.loyalty_points}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div
                  className="flex justify-end gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onView(customer)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(customer)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(customer)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
