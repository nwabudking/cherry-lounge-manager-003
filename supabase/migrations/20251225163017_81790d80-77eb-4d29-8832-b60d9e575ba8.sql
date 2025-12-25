
-- Create function to delete menu item when linked inventory item is deleted
CREATE OR REPLACE FUNCTION public.delete_menu_item_on_inventory_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete any menu items linked to this inventory item
  DELETE FROM public.menu_items 
  WHERE inventory_item_id = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger on inventory_items table for DELETE
CREATE TRIGGER trigger_delete_menu_item_on_inventory_delete
BEFORE DELETE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.delete_menu_item_on_inventory_delete();
