import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActiveMenuCategories, useActiveMenuItems } from "@/hooks/useMenu";
import { useCreateOrder } from "@/hooks/useOrders";
import { ordersApi, CreateOrderData } from "@/lib/api/orders";
import { customersApi, Customer } from "@/lib/api/customers";
import { POSHeader } from "@/components/pos/POSHeader";
import { CategoryTabs } from "@/components/pos/CategoryTabs";
import { MenuGrid } from "@/components/pos/MenuGrid";
import { CartPanel } from "@/components/pos/CartPanel";
import { CheckoutDialog } from "@/components/pos/CheckoutDialog";
import { SuspendedOrdersPanel, SuspendedOrder } from "@/components/pos/SuspendedOrdersPanel";
import { generateUUID } from "@/lib/utils/uuid";

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

type OrderType = "dine_in" | "takeaway" | "delivery" | "bar_only";

interface CompletedOrder {
  id: string;
  order_number: string;
  total_amount: number;
  created_at: string;
}

const SUSPENDED_ORDERS_KEY = "pos_suspended_orders";

const POS = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutCart, setCheckoutCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CompletedOrder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [suspendedOrders, setSuspendedOrders] = useState<SuspendedOrder[]>([]);

  // Load suspended orders from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(SUSPENDED_ORDERS_KEY);
    if (saved) {
      try {
        setSuspendedOrders(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load suspended orders:", e);
      }
    }
  }, []);

  // Save suspended orders to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SUSPENDED_ORDERS_KEY, JSON.stringify(suspendedOrders));
  }, [suspendedOrders]);

  const { data: rawCategories } = useActiveMenuCategories();
  const { data: rawMenuItems } = useActiveMenuItems(selectedCategory || undefined);
  const categories = Array.isArray(rawCategories) ? rawCategories : [];
  const menuItems = Array.isArray(rawMenuItems) ? rawMenuItems : [];

  const createOrderMutation = useMutation({
    mutationFn: async (paymentMethod: string) => {
      const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
      
      const orderData: CreateOrderData = {
        order_type: orderType,
        table_number: orderType === "dine_in" ? tableNumber : undefined,
        customer_id: selectedCustomer?.id,
        items: cart.map((item) => ({
          menu_item_id: item.menuItemId,
          item_name: item.name,
          quantity: item.quantity,
          unit_price: item.price,
          notes: item.notes,
        })),
        payment: {
          payment_method: paymentMethod,
          amount: subtotal,
        },
      };

      const order = await ordersApi.createOrder(orderData);

      // Update customer stats and loyalty points if customer is linked
      if (selectedCustomer?.id) {
        await customersApi.updateCustomerStats(selectedCustomer.id, subtotal);
        // Award 1 loyalty point per ₦100 spent
        const pointsToAward = Math.floor(subtotal / 100);
        if (pointsToAward > 0) {
          await customersApi.addLoyaltyPoints(selectedCustomer.id, pointsToAward);
        }
      }

      return order;
    },
    onSuccess: (order) => {
      toast({
        title: "Order Created!",
        description: `Order ${order.order_number} has been placed successfully.`,
      });
      setCheckoutCart([...cart]);
      setCompletedOrder(order);
      setCart([]);
      setTableNumber("");
      setSelectedCustomer(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["menu"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    },
  });

  const addToCart = (item: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: generateUUID(),
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => setCart([]);

  // Suspend current order
  const handleSuspendOrder = () => {
    if (cart.length === 0) return;

    const suspendedOrder: SuspendedOrder = {
      id: generateUUID(),
      cart: [...cart],
      orderType,
      tableNumber,
      suspendedAt: new Date().toISOString(),
      customerName: selectedCustomer?.name,
    };

    setSuspendedOrders((prev) => [...prev, suspendedOrder]);
    setCart([]);
    setTableNumber("");
    setSelectedCustomer(null);
    setOrderType("dine_in");

    toast({
      title: "Order Suspended",
      description: "Order has been put on hold. Resume it anytime.",
    });
  };

  // Resume suspended order
  const handleResumeOrder = (order: SuspendedOrder) => {
    // If current cart has items, suspend it first
    if (cart.length > 0) {
      handleSuspendOrder();
    }

    setCart(order.cart);
    setOrderType(order.orderType);
    setTableNumber(order.tableNumber);
    setSuspendedOrders((prev) => prev.filter((o) => o.id !== order.id));

    toast({
      title: "Order Resumed",
      description: "Suspended order has been loaded.",
    });
  };

  // Delete suspended order
  const handleDeleteSuspendedOrder = (orderId: string) => {
    setSuspendedOrders((prev) => prev.filter((o) => o.id !== orderId));
    toast({
      title: "Order Deleted",
      description: "Suspended order has been removed.",
    });
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const total = subtotal;

  // For receipt display after order completion
  const receiptSubtotal = checkoutCart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const receiptTotal = receiptSubtotal;

  // Filter menu items by search query
  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
    setCompletedOrder(null);
    setCheckoutCart([]);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel - Menu */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <POSHeader
          orderType={orderType}
          setOrderType={setOrderType}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
        />

        {/* Suspended Orders Panel */}
        <div className="px-4">
          <SuspendedOrdersPanel
            suspendedOrders={suspendedOrders}
            onResume={handleResumeOrder}
            onDelete={handleDeleteSuspendedOrder}
          />
        </div>

        <CategoryTabs
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <MenuGrid items={filteredMenuItems} onAddToCart={addToCart} />
      </div>

      {/* Right Panel - Cart */}
      <CartPanel
        cart={cart}
        subtotal={subtotal}
        total={total}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckout={() => setIsCheckoutOpen(true)}
        onSuspend={cart.length > 0 ? handleSuspendOrder : undefined}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={setSelectedCustomer}
      />

      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        total={completedOrder ? receiptTotal : total}
        subtotal={completedOrder ? receiptSubtotal : subtotal}
        cart={completedOrder ? checkoutCart : cart}
        orderType={orderType}
        tableNumber={tableNumber}
        onConfirmPayment={(method) => createOrderMutation.mutate(method)}
        isProcessing={createOrderMutation.isPending}
        completedOrder={completedOrder}
        onClose={handleCloseCheckout}
      />
    </div>
  );
};

export default POS;
