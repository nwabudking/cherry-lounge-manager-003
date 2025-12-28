-- Expand privileged access to include 'admin' role across existing RLS policies

-- PROFILES
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- USER_ROLES
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- RESTAURANT_SETTINGS
DROP POLICY IF EXISTS "Admins can update settings" ON public.restaurant_settings;
CREATE POLICY "Admins can update settings"
ON public.restaurant_settings
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- CUSTOMERS
DROP POLICY IF EXISTS "Managers can manage customers" ON public.customers;
CREATE POLICY "Managers can manage customers"
ON public.customers
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

DROP POLICY IF EXISTS "Staff can view customers" ON public.customers;
CREATE POLICY "Staff can view customers"
ON public.customers
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
);

DROP POLICY IF EXISTS "Cashiers can create and update customers" ON public.customers;
CREATE POLICY "Cashiers can create and update customers"
ON public.customers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
);

DROP POLICY IF EXISTS "Cashiers can update customers" ON public.customers;
CREATE POLICY "Cashiers can update customers"
ON public.customers
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
);

-- INVENTORY_ITEMS
DROP POLICY IF EXISTS "Managers and inventory officers can manage inventory" ON public.inventory_items;
CREATE POLICY "Managers and inventory officers can manage inventory"
ON public.inventory_items
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'inventory_officer'::app_role)
);

DROP POLICY IF EXISTS "Staff can view inventory" ON public.inventory_items;
CREATE POLICY "Staff can view inventory"
ON public.inventory_items
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'inventory_officer'::app_role)
  OR has_role(auth.uid(), 'bar_staff'::app_role)
  OR has_role(auth.uid(), 'kitchen_staff'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
);

-- MENU_CATEGORIES
DROP POLICY IF EXISTS "Staff can manage categories" ON public.menu_categories;
CREATE POLICY "Staff can manage categories"
ON public.menu_categories
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- MENU_ITEMS
DROP POLICY IF EXISTS "Staff can manage items" ON public.menu_items;
CREATE POLICY "Staff can manage items"
ON public.menu_items
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
);

-- ORDERS
DROP POLICY IF EXISTS "Staff can create orders" ON public.orders;
CREATE POLICY "Staff can create orders"
ON public.orders
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
  OR has_role(auth.uid(), 'bar_staff'::app_role)
);

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders"
ON public.orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
  OR has_role(auth.uid(), 'bar_staff'::app_role)
  OR has_role(auth.uid(), 'kitchen_staff'::app_role)
);

DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders"
ON public.orders
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
  OR has_role(auth.uid(), 'bar_staff'::app_role)
  OR has_role(auth.uid(), 'kitchen_staff'::app_role)
);

-- PAYMENTS
DROP POLICY IF EXISTS "Staff can create payments" ON public.payments;
CREATE POLICY "Staff can create payments"
ON public.payments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
);

DROP POLICY IF EXISTS "Staff can view payments" ON public.payments;
CREATE POLICY "Staff can view payments"
ON public.payments
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- STOCK_MOVEMENTS
DROP POLICY IF EXISTS "Managers and inventory officers can create movements" ON public.stock_movements;
CREATE POLICY "Managers and inventory officers can create movements"
ON public.stock_movements
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'inventory_officer'::app_role)
);

DROP POLICY IF EXISTS "Staff can view stock movements" ON public.stock_movements;
CREATE POLICY "Staff can view stock movements"
ON public.stock_movements
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'inventory_officer'::app_role)
);

-- SUPPLIERS
DROP POLICY IF EXISTS "Managers and inventory officers can manage suppliers" ON public.suppliers;
CREATE POLICY "Managers and inventory officers can manage suppliers"
ON public.suppliers
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'inventory_officer'::app_role)
);

DROP POLICY IF EXISTS "Staff can view suppliers" ON public.suppliers;
CREATE POLICY "Staff can view suppliers"
ON public.suppliers
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'inventory_officer'::app_role)
);

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Staff can manage order items" ON public.order_items;
CREATE POLICY "Staff can manage order items"
ON public.order_items
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
  OR has_role(auth.uid(), 'bar_staff'::app_role)
);

DROP POLICY IF EXISTS "Staff can view order items" ON public.order_items;
CREATE POLICY "Staff can view order items"
ON public.order_items
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'cashier'::app_role)
  OR has_role(auth.uid(), 'bar_staff'::app_role)
  OR has_role(auth.uid(), 'kitchen_staff'::app_role)
);
