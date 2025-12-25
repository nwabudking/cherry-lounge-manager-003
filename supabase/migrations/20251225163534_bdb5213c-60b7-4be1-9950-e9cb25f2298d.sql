
-- Add category_id column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN category_id uuid REFERENCES public.menu_categories(id) ON DELETE SET NULL;

-- Migrate existing text categories to menu_categories and link them
-- First, insert any new categories that don't exist
INSERT INTO public.menu_categories (name, is_active, sort_order)
SELECT DISTINCT category, true, 99
FROM public.inventory_items 
WHERE category IS NOT NULL 
  AND category != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_categories mc 
    WHERE LOWER(mc.name) = LOWER(inventory_items.category)
  );

-- Now update inventory_items to link to the category_id
UPDATE public.inventory_items i
SET category_id = (
  SELECT mc.id 
  FROM public.menu_categories mc 
  WHERE LOWER(mc.name) = LOWER(i.category)
  LIMIT 1
)
WHERE i.category IS NOT NULL AND i.category != '';
