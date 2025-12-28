import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { User, X, Star, Phone, Plus } from "lucide-react";
import { customersApi, Customer } from "@/lib/api/customers";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { useCreateCustomer } from "@/hooks/useCustomers";

interface CustomerSelectProps {
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer | null) => void;
}

export const CustomerSelect = ({
  selectedCustomer,
  onSelectCustomer,
}: CustomerSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: rawCustomers } = useQuery({
    queryKey: ["customers-pos", search],
    queryFn: () => customersApi.getCustomers(search),
  });
  const customers = Array.isArray(rawCustomers) ? rawCustomers : [];

  const createCustomerMutation = useCreateCustomer();

  const handleSelect = (customer: Customer) => {
    onSelectCustomer(customer);
    setOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    onSelectCustomer(null);
  };

  const handleAddCustomer = (data: any) => {
    createCustomerMutation.mutate(data, {
      onSuccess: (newCustomer) => {
        onSelectCustomer(newCustomer);
        setIsAddDialogOpen(false);
      },
    });
  };

  if (selectedCustomer) {
    return (
      <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
        <User className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{selectedCustomer.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {selectedCustomer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {selectedCustomer.phone}
              </span>
            )}
            {selectedCustomer.loyalty_points > 0 && (
              <span className="flex items-center gap-1 text-primary">
                <Star className="w-3 h-3" />
                {selectedCustomer.loyalty_points} pts
              </span>
            )}
          </div>
        </div>
        {selectedCustomer.tags.includes("VIP") && (
          <Badge variant="secondary" className="text-xs">VIP</Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleClear}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-muted-foreground"
          >
            <User className="w-4 h-4 mr-2" />
            Select Customer (Optional)
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Search by name or phone..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="py-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    No customer found
                  </p>
                  <Button
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      setIsAddDialogOpen(true);
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add New Customer
                  </Button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {customers.slice(0, 10).map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.name}
                    onSelect={() => handleSelect(customer)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2 w-full">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {customer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {customer.phone || customer.email || "No contact"}
                        </p>
                      </div>
                      {customer.loyalty_points > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {customer.loyalty_points} pts
                        </Badge>
                      )}
                      {customer.tags.includes("VIP") && (
                        <Badge variant="secondary" className="text-xs">
                          VIP
                        </Badge>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  setIsAddDialogOpen(true);
                }}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add New Customer
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <CustomerDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSave={handleAddCustomer}
        isSaving={createCustomerMutation.isPending}
      />
    </>
  );
};
