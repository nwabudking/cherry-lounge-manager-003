
-- Create function to auto-create menu item when inventory item is added
CREATE OR REPLACE FUNCTION public.create_menu_item_on_inventory_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  food_category_id uuid;
BEGIN
  -- Get or create a default "Food" category
  SELECT id INTO food_category_id 
  FROM public.menu_categories 
  WHERE LOWER(name) = 'food' 
  LIMIT 1;
  
  -- If no Food category exists, create one
  IF food_category_id IS NULL THEN
    INSERT INTO public.menu_categories (name, is_active, sort_order)
    VALUES ('Food', true, 0)
    RETURNING id INTO food_category_id;
  END IF;
  
  -- Create corresponding menu item
  INSERT INTO public.menu_items (
    name,
    price,
    cost_price,
    category_id,
    inventory_item_id,
    track_inventory,
    is_active,
    is_available
  ) VALUES (
    NEW.name,
    COALESCE(NEW.cost_per_unit, 0),
    NEW.cost_per_unit,
    food_category_id,
    NEW.id,
    true,
    true,
    NEW.current_stock > 0
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on inventory_items table
CREATE TRIGGER trigger_create_menu_item_on_inventory_insert
AFTER INSERT ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.create_menu_item_on_inventory_insert();
