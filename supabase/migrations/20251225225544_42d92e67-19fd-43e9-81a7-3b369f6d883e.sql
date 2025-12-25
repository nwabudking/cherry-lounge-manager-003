-- Add category_type to menu_categories to distinguish food vs drink categories
ALTER TABLE public.menu_categories 
ADD COLUMN category_type text NOT NULL DEFAULT 'food' 
CHECK (category_type IN ('food', 'drink', 'other'));

-- Update drink categories based on their names
UPDATE public.menu_categories SET category_type = 'drink' WHERE 
  LOWER(name) LIKE '%drink%' OR
  LOWER(name) LIKE '%beer%' OR
  LOWER(name) LIKE '%wine%' OR
  LOWER(name) LIKE '%cocktail%' OR
  LOWER(name) LIKE '%spirit%' OR
  LOWER(name) LIKE '%whisky%' OR
  LOWER(name) LIKE '%whiskey%' OR
  LOWER(name) LIKE '%rum%' OR
  LOWER(name) LIKE '%vodka%' OR
  LOWER(name) LIKE '%gin%' OR
  LOWER(name) LIKE '%brandy%' OR
  LOWER(name) LIKE '%champagne%' OR
  LOWER(name) LIKE '%tequila%' OR
  LOWER(name) LIKE '%liquor%' OR
  LOWER(name) LIKE '%malt%' OR
  LOWER(name) LIKE '%bitters%' OR
  LOWER(name) LIKE '%juice%' OR
  LOWER(name) = 'soft' OR
  LOWER(name) = 'soft drink' OR
  LOWER(name) LIKE '%energy drink%' OR
  LOWER(name) LIKE '%non alcoholic%' OR
  LOWER(name) LIKE '%water%' OR
  LOWER(name) LIKE '%tea%' OR
  LOWER(name) LIKE '%smoothie%' OR
  LOWER(name) LIKE '%yoghurt%' OR
  LOWER(name) = 'bottle' OR
  LOWER(name) = 'breweries';