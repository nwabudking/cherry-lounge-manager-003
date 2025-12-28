
-- ============================================
-- DATA CLEANUP AND UNIQUENESS ENFORCEMENT
-- ============================================

-- Step 1: Create a function to normalize names for comparison
CREATE OR REPLACE FUNCTION public.normalize_name(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN LOWER(TRIM(regexp_replace(input_text, '\s+', ' ', 'g')));
END;
$$;

-- Step 2: Clean up duplicate menu_categories (keep oldest, delete newer)
-- First, update any menu_items pointing to duplicate categories
WITH category_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM menu_categories
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
),
category_duplicates AS (
  SELECT mc.id as dup_id, ck.keep_id
  FROM menu_categories mc
  JOIN category_keeper ck ON normalize_name(mc.name) = ck.norm_name
  WHERE mc.id != ck.keep_id
)
UPDATE menu_items mi
SET category_id = cd.keep_id
FROM category_duplicates cd
WHERE mi.category_id = cd.dup_id;

-- Now delete duplicate categories
WITH category_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM menu_categories
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
)
DELETE FROM menu_categories mc
WHERE NOT EXISTS (
  SELECT 1 FROM category_keeper ck WHERE ck.keep_id = mc.id
);

-- Step 3: Clean up duplicate inventory_items
-- Keep oldest record, sum stock from duplicates
WITH inventory_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM inventory_items
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
),
inventory_stock_totals AS (
  SELECT 
    ik.keep_id,
    SUM(inv.current_stock) as total_stock
  FROM inventory_items inv
  JOIN inventory_keeper ik ON normalize_name(inv.name) = ik.norm_name
  GROUP BY ik.keep_id
)
UPDATE inventory_items ii
SET current_stock = ist.total_stock
FROM inventory_stock_totals ist
WHERE ii.id = ist.keep_id;

-- Update menu_items to point to keeper inventory items
WITH inventory_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM inventory_items
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
),
inventory_duplicates AS (
  SELECT inv.id as dup_id, ik.keep_id
  FROM inventory_items inv
  JOIN inventory_keeper ik ON normalize_name(inv.name) = ik.norm_name
  WHERE inv.id != ik.keep_id
)
UPDATE menu_items mi
SET inventory_item_id = id.keep_id
FROM inventory_duplicates id
WHERE mi.inventory_item_id = id.dup_id;

-- Update stock_movements to point to keeper inventory items
WITH inventory_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM inventory_items
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
),
inventory_duplicates AS (
  SELECT inv.id as dup_id, ik.keep_id
  FROM inventory_items inv
  JOIN inventory_keeper ik ON normalize_name(inv.name) = ik.norm_name
  WHERE inv.id != ik.keep_id
)
UPDATE stock_movements sm
SET inventory_item_id = id.keep_id
FROM inventory_duplicates id
WHERE sm.inventory_item_id = id.dup_id;

-- Now delete duplicate inventory items
WITH inventory_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM inventory_items
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
)
DELETE FROM inventory_items inv
WHERE NOT EXISTS (
  SELECT 1 FROM inventory_keeper ik WHERE ik.keep_id = inv.id
);

-- Step 4: Clean up duplicate menu_items
-- Keep oldest, update order_items references
WITH menu_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM menu_items
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
),
menu_duplicates AS (
  SELECT mi.id as dup_id, mk.keep_id
  FROM menu_items mi
  JOIN menu_keeper mk ON normalize_name(mi.name) = mk.norm_name
  WHERE mi.id != mk.keep_id
)
UPDATE order_items oi
SET menu_item_id = md.keep_id
FROM menu_duplicates md
WHERE oi.menu_item_id = md.dup_id;

-- Delete duplicate menu items
WITH menu_keeper AS (
  SELECT DISTINCT ON (normalize_name(name)) 
    id as keep_id,
    normalize_name(name) as norm_name
  FROM menu_items
  ORDER BY normalize_name(name), created_at ASC NULLS LAST
)
DELETE FROM menu_items mi
WHERE NOT EXISTS (
  SELECT 1 FROM menu_keeper mk WHERE mk.keep_id = mi.id
);

-- Step 5: Add unique constraints using normalized names
-- Create unique indexes (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_items_name_unique 
ON inventory_items (normalize_name(name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_name_unique 
ON menu_items (normalize_name(name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_categories_name_unique 
ON menu_categories (normalize_name(name));

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_name_unique 
ON suppliers (normalize_name(name));

-- Step 6: Create a function to check for duplicates before insert/update
CREATE OR REPLACE FUNCTION public.check_duplicate_name()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  existing_id UUID;
  table_name TEXT;
BEGIN
  table_name := TG_TABLE_NAME;
  
  -- Check if another record with same normalized name exists
  EXECUTE format(
    'SELECT id FROM %I WHERE normalize_name(name) = normalize_name($1) AND id != $2 LIMIT 1',
    table_name
  ) INTO existing_id USING NEW.name, COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'A record with name "%" already exists', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 7: Create triggers to prevent duplicate insertions
DROP TRIGGER IF EXISTS prevent_duplicate_inventory_item ON inventory_items;
CREATE TRIGGER prevent_duplicate_inventory_item
BEFORE INSERT OR UPDATE ON inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.check_duplicate_name();

DROP TRIGGER IF EXISTS prevent_duplicate_menu_item ON menu_items;
CREATE TRIGGER prevent_duplicate_menu_item
BEFORE INSERT OR UPDATE ON menu_items
FOR EACH ROW
EXECUTE FUNCTION public.check_duplicate_name();

DROP TRIGGER IF EXISTS prevent_duplicate_category ON menu_categories;
CREATE TRIGGER prevent_duplicate_category
BEFORE INSERT OR UPDATE ON menu_categories
FOR EACH ROW
EXECUTE FUNCTION public.check_duplicate_name();

DROP TRIGGER IF EXISTS prevent_duplicate_supplier ON suppliers;
CREATE TRIGGER prevent_duplicate_supplier
BEFORE INSERT OR UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION public.check_duplicate_name();
