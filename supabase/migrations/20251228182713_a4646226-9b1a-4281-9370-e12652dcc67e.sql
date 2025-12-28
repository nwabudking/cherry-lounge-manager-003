-- Add uniqueness constraints for data integrity
-- These prevent duplicate inventory items, menu items, and suppliers

-- Create a function-based unique index on normalized inventory item names
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_unique_name 
ON public.inventory_items (normalize_name(name)) 
WHERE is_active = true;

-- Create a function-based unique index on normalized menu item names  
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_unique_name 
ON public.menu_items (normalize_name(name)) 
WHERE is_active = true;

-- Create a function-based unique index on normalized supplier names
CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_unique_name 
ON public.suppliers (normalize_name(name)) 
WHERE is_active = true;

-- Create a function-based unique index on normalized category names
CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_categories_unique_name 
ON public.menu_categories (normalize_name(name)) 
WHERE is_active = true;