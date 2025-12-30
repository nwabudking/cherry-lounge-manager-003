-- Cherry POS Complete Data Dump
-- Generated: 2025-12-30
-- This file contains all data from the production database
-- Run this after 00-initial-schema.sql

BEGIN;

-- ============================================
-- RESTAURANT SETTINGS
-- ============================================
INSERT INTO public.restaurant_settings (id, name, tagline, address, city, country, phone, email, currency, timezone, receipt_footer, receipt_show_logo, logo_url, created_at, updated_at) VALUES
('a159aa56-c269-467b-966f-5797437bb87a', 'Cherry Dining', '& Lounge', '123 Restaurant Street', 'Lagos', 'Nigeria', '+234 800 000 0000', NULL, 'NGN', 'Africa/Lagos', 'Thank you for dining with us!', false, NULL, '2025-12-23 22:38:07.000986+00', '2025-12-23 22:38:07.000986+00')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  tagline = EXCLUDED.tagline,
  address = EXCLUDED.address,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  phone = EXCLUDED.phone,
  currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone,
  receipt_footer = EXCLUDED.receipt_footer;

-- ============================================
-- MENU CATEGORIES
-- ============================================
INSERT INTO public.menu_categories (id, name, category_type, sort_order, is_active, created_at) VALUES
('7107abaa-dcd7-47e0-96b4-33331b63818d', 'Drinks', 'drink', 1, true, '2025-12-24 13:39:26.258819+00'),
('c9abda73-9c8a-497d-a33f-bc39a503499a', 'HOT', 'food', 1, true, '2025-12-24 16:26:46.612817+00'),
('26d358d6-d339-4ef6-a4f4-cbda0a5b5b63', 'Food', 'food', 2, true, '2025-12-24 13:39:26.409636+00'),
('024d7895-6fa8-469b-955b-e5743437ed60', 'WINE', 'drink', 2, true, '2025-12-24 16:26:46.735413+00'),
('3ee34782-6f84-497f-b54f-f06a83e88b8f', 'LUNCH', 'food', 3, true, '2025-12-24 16:26:46.835051+00'),
('0c6847d9-70bd-4910-936f-ad7f402ca80a', 'FRESH MIXED JUICE', 'drink', 4, true, '2025-12-24 16:26:46.938332+00'),
('f88c4327-c744-45af-a400-37e4d358caef', 'BREAKFAST', 'food', 5, true, '2025-12-24 16:26:47.040523+00'),
('9c69d244-25d9-4494-a94e-dd6946fedcdc', 'GRILLS', 'food', 6, true, '2025-12-24 16:26:47.136758+00'),
('0f8c8d93-f7d0-4c63-9ee2-a6d3f2899981', 'DINNER', 'food', 7, true, '2025-12-24 16:26:47.242671+00'),
('4e6972da-a11a-4f13-a494-fa01ce1fcbaf', 'FRESH SQUEEZE JUICE', 'drink', 8, true, '2025-12-24 16:26:47.348493+00'),
('ba97ffb1-796b-4601-95b4-c788b612c18d', 'LOUNGE SPECIAL', 'food', 9, true, '2025-12-24 16:26:47.449016+00'),
('f65b4b1b-6893-4811-827e-dc3db88a4873', 'ENERGY DRINK', 'drink', 10, true, '2025-12-24 16:26:47.555418+00'),
('4502d6ff-7a7e-4808-af4f-7e27f0fb5639', 'NON ALCOHOLIC', 'drink', 11, true, '2025-12-24 16:26:47.655993+00'),
('b511dcbb-8671-4c86-9f71-110b2dce5937', 'soft drink', 'drink', 12, true, '2025-12-24 16:26:47.751774+00'),
('e9310ff9-696d-408f-9f15-2440d467e5fa', 'SMOKE', 'food', 13, true, '2025-12-24 16:26:47.869594+00'),
('b20e4016-683d-42d3-81b6-452928613cdd', 'LOUNGE GAMES', 'food', 14, true, '2025-12-24 16:26:47.973421+00'),
('07cf2123-d639-4f85-8d99-3a49ef9e669f', 'PROTEINS', 'food', 15, true, '2025-12-24 16:26:48.081735+00'),
('eac721ea-368a-431b-b3b3-51c2118658dd', 'JUICE', 'drink', 16, true, '2025-12-24 16:26:48.180608+00'),
('01788e9d-0a91-4260-a458-fb830293e3a2', 'CHAMPAGNE', 'drink', 17, true, '2025-12-24 16:26:48.305359+00'),
('a121acc5-e969-49ef-b8ff-0737502003e4', 'BEER', 'drink', 19, true, '2025-12-24 16:26:48.51955+00'),
('b176e4f2-41e7-4ee6-8050-50c085000450', 'COCKTAIL DRINK', 'drink', 20, true, '2025-12-24 16:26:48.613401+00'),
('adf36f4e-64b7-4a19-be1d-2820caed6103', 'MIXED FRUIT SMOOTHIES', 'drink', 21, true, '2025-12-24 16:26:48.719165+00'),
('f2913036-3b20-4485-bae0-c708d57605e1', 'RED WINE', 'drink', 22, true, '2025-12-24 16:26:48.810939+00'),
('dce35da1-db2f-4a4b-ace2-d458b5b382a2', 'SPIRIT/WHISKY', 'drink', 23, true, '2025-12-24 16:26:48.91409+00'),
('4bf0bc17-8084-4960-972b-67f9cddcf95f', 'PROTEIN', 'food', 24, true, '2025-12-24 16:26:49.008226+00'),
('ba55eff0-514f-41ef-b76f-109d4738c7f8', 'MALT', 'drink', 25, true, '2025-12-24 16:26:49.106865+00'),
('2cd0a96e-1abb-4ede-989c-080bb86c823c', 'SOFT', 'drink', 26, true, '2025-12-24 16:26:49.203841+00'),
('362f020a-c0f5-47da-8eac-30f0f4f3247d', 'BITTERS', 'drink', 27, true, '2025-12-24 16:26:49.307502+00'),
('b7b60007-4cb4-4556-803e-daea85aa5bbb', 'SIDES', 'food', 28, true, '2025-12-24 16:26:49.417593+00'),
('d3f474dd-d930-4561-8532-241847e4755c', 'YOGHURT', 'drink', 29, true, '2025-12-24 16:26:49.520216+00'),
('53293271-e7f1-4db6-ab2f-b0b63410dee5', 'DESIGN', 'food', 30, true, '2025-12-24 16:26:49.635597+00'),
('c224db55-b95f-4a85-8e83-f391a5f09de3', 'BREWERIES', 'drink', 32, true, '2025-12-24 16:26:49.850167+00'),
('d2a33bf9-9ef2-4aba-a5a1-f423f035d2cf', 'DRINK', 'drink', 33, true, '2025-12-24 16:26:49.957914+00')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, category_type = EXCLUDED.category_type, sort_order = EXCLUDED.sort_order, is_active = EXCLUDED.is_active;

-- ============================================
-- INVENTORY ITEMS (Sample - first 20 items)
-- Full data available via edge function export
-- ============================================
INSERT INTO public.inventory_items (id, name, category, category_id, unit, current_stock, min_stock_level, cost_per_unit, supplier_id, is_active, created_at, updated_at) VALUES
('0e1cd057-1920-4b1b-84ad-3c43840b4930', 'Coca Cola', 'Drinks', NULL, 'pcs', 1, 5, 200, NULL, true, '2025-12-24 17:20:13.273993+00', '2025-12-24 17:20:13.273993+00'),
('f38bc8f9-df80-49a9-a3a9-e485b05491fc', 'Jollof Rice', 'Food', NULL, 'pcs', 43, 5, 800, NULL, true, '2025-12-24 17:20:13.49367+00', '2025-12-24 17:20:13.49367+00'),
('384a12d0-bf98-4742-90ed-c87add612a9b', 'CLASE AZUL', 'HOT', 'c9abda73-9c8a-497d-a33f-bc39a503499a', 'pcs', 4, 5, 450000, NULL, true, '2025-12-24 17:20:13.614655+00', '2025-12-24 17:20:13.614655+00'),
('5cbafca7-4eaa-43b0-89e8-c5714eb4b615', 'HENNESSY  VSOP', 'HOT', 'c9abda73-9c8a-497d-a33f-bc39a503499a', 'pcs', 24, 5, 160000, NULL, true, '2025-12-24 17:20:13.732219+00', '2025-12-24 17:20:13.732219+00'),
('1a3f5bfa-86f8-4dc3-b2db-a741a2ae7f21', 'HENNESSY  VS', 'HOT', 'c9abda73-9c8a-497d-a33f-bc39a503499a', 'pcs', 20, 5, 100000, NULL, true, '2025-12-24 17:20:13.849606+00', '2025-12-24 17:20:13.849606+00'),
('c0d6b5c3-e358-4887-aabd-8433ada1e755', 'GLENMORANGIE 10YRS', 'HOT', 'c9abda73-9c8a-497d-a33f-bc39a503499a', 'pcs', 24, 5, 80000, NULL, true, '2025-12-24 17:20:13.971843+00', '2025-12-24 17:20:13.971843+00'),
('2373716c-89a0-459d-85f4-4d0d79f69262', 'GLENFIDDICH 21YRS', 'HOT', 'c9abda73-9c8a-497d-a33f-bc39a503499a', 'pcs', 27, 5, 450000, NULL, true, '2025-12-24 17:20:14.077431+00', '2025-12-24 17:20:14.077431+00'),
('f83ffc86-8315-4e3b-bf19-6c42cfa4862a', 'MOET NECTER IMPERIAL', 'WINE', '024d7895-6fa8-469b-955b-e5743437ed60', 'pcs', 25, 5, 180000, NULL, true, '2025-12-24 17:20:14.182702+00', '2025-12-24 17:20:14.182702+00'),
('4ac4a492-d5c6-4b6f-9613-2265275d5610', 'VEUVE CLIQUOT', 'HOT', 'c9abda73-9c8a-497d-a33f-bc39a503499a', 'pcs', 29, 5, 160000, NULL, true, '2025-12-24 17:20:14.286361+00', '2025-12-24 17:20:14.286361+00'),
('62af768f-477c-4da8-9795-0101fc862359', 'MARTELL BLUE SWIFT', 'HOT', 'c9abda73-9c8a-497d-a33f-bc39a503499a', 'pcs', 29, 5, 150000, NULL, true, '2025-12-24 17:20:14.399744+00', '2025-12-24 17:20:14.399744+00'),
('5d89741c-dfbc-48ce-bca2-75d52a6fc73a', 'WHITE RICE AND GOATMEAT STEW WITH PLANTAIN', 'Lunch', '3ee34782-6f84-497f-b54f-f06a83e88b8f', 'pcs', 21, 5, 5000, NULL, true, '2025-12-24 17:20:14.505512+00', '2025-12-24 17:20:14.505512+00'),
('f36fac9d-3496-4616-8c99-44bf30f1da63', 'WATERMELON AND BEET', 'FRESH MIXED JUICE', '0c6847d9-70bd-4910-936f-ad7f402ca80a', 'pcs', 48, 5, 2500, NULL, true, '2025-12-24 17:20:14.610467+00', '2025-12-24 17:20:14.610467+00'),
('b7ca45ee-e9e6-4890-8d6a-c03647fd8263', 'FRIED PLANTAIN', 'BREAKFAST', 'f88c4327-c744-45af-a400-37e4d358caef', 'pcs', 21, 5, 1000, NULL, true, '2025-12-24 17:20:14.727546+00', '2025-12-24 17:20:14.727546+00'),
('ba53becc-61b2-4aca-a565-076d86fab6ec', 'FRIED RICE,TURKEY AND SALAD', 'Lunch', '3ee34782-6f84-497f-b54f-f06a83e88b8f', 'pcs', 24, 5, 6000, NULL, true, '2025-12-24 17:20:14.839777+00', '2025-12-24 17:20:14.839777+00'),
('0b71ffea-3fbf-433a-9739-b9ce954db15a', 'TURKEY AND SALAD', 'Lunch', '3ee34782-6f84-497f-b54f-f06a83e88b8f', 'pcs', 21, 5, 3000, NULL, true, '2025-12-24 17:20:14.948254+00', '2025-12-24 17:20:14.948254+00')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name, 
  category = EXCLUDED.category,
  current_stock = EXCLUDED.current_stock,
  min_stock_level = EXCLUDED.min_stock_level,
  cost_per_unit = EXCLUDED.cost_per_unit,
  is_active = EXCLUDED.is_active;

-- ============================================
-- MENU ITEMS (Sample - first 15 items)
-- Full data available via edge function export
-- ============================================
INSERT INTO public.menu_items (id, name, description, price, cost_price, category_id, image_url, inventory_item_id, track_inventory, is_active, is_available, created_at, updated_at) VALUES
('ee28fa35-27df-4d5e-95b5-6d74da29bff8', 'Coca Cola', NULL, 500, 200, '7107abaa-dcd7-47e0-96b4-33331b63818d', NULL, '0e1cd057-1920-4b1b-84ad-3c43840b4930', true, true, true, '2025-12-24 13:39:26.53095+00', '2025-12-24 13:39:26.53095+00'),
('ce842f51-74e6-41b3-a202-23ad4184f760', 'Jollof Rice', 'Nigerian Jollof Rice', 1500, 800, '26d358d6-d339-4ef6-a4f4-cbda0a5b5b63', NULL, 'f38bc8f9-df80-49a9-a3a9-e485b05491fc', true, true, true, '2025-12-24 13:39:26.633516+00', '2025-12-24 13:39:26.633516+00'),
('8586a2f7-eeb6-4dc0-aa88-7091a9de1800', 'CLASE AZUL', NULL, 450000, 450000, 'c9abda73-9c8a-497d-a33f-bc39a503499a', NULL, '384a12d0-bf98-4742-90ed-c87add612a9b', true, true, true, '2025-12-24 16:26:52.582931+00', '2025-12-24 16:26:52.582931+00'),
('69f66b60-fdc9-4330-9f15-60ed85a981ba', 'HENNESSY  VSOP', NULL, 160000, 160000, 'c9abda73-9c8a-497d-a33f-bc39a503499a', NULL, '5cbafca7-4eaa-43b0-89e8-c5714eb4b615', true, true, true, '2025-12-24 16:26:52.683065+00', '2025-12-24 16:26:52.683065+00'),
('3b3de91f-24ca-4098-9c23-c0e9aabdaaaf', 'HENNESSY  VS', NULL, 100000, 100000, 'c9abda73-9c8a-497d-a33f-bc39a503499a', NULL, '1a3f5bfa-86f8-4dc3-b2db-a741a2ae7f21', true, true, true, '2025-12-24 16:26:52.779163+00', '2025-12-24 16:26:52.779163+00'),
('416bdeea-f7a7-4fba-89b4-05da3167ae9c', 'GLENMORANGIE 10YRS', NULL, 80000, 80000, 'c9abda73-9c8a-497d-a33f-bc39a503499a', NULL, 'c0d6b5c3-e358-4887-aabd-8433ada1e755', true, true, true, '2025-12-24 16:26:52.892298+00', '2025-12-24 16:26:52.892298+00'),
('709e60de-7252-4ffd-8a92-d299ae8dbbce', 'GLENFIDDICH 21YRS', NULL, 450000, 450000, 'c9abda73-9c8a-497d-a33f-bc39a503499a', NULL, '2373716c-89a0-459d-85f4-4d0d79f69262', true, true, true, '2025-12-24 16:26:53.002838+00', '2025-12-24 16:26:53.002838+00'),
('714bd749-feb3-4486-8bfe-7f6dd10a4a61', 'MOET NECTER IMPERIAL', NULL, 180000, 180000, '024d7895-6fa8-469b-955b-e5743437ed60', NULL, 'f83ffc86-8315-4e3b-bf19-6c42cfa4862a', true, true, true, '2025-12-24 16:26:53.112964+00', '2025-12-24 16:26:53.112964+00'),
('53e3a19c-0b4f-4c7d-b1f2-9bbbc854f2fe', 'VEUVE CLIQUOT', NULL, 160000, 160000, 'c9abda73-9c8a-497d-a33f-bc39a503499a', NULL, '4ac4a492-d5c6-4b6f-9613-2265275d5610', true, true, true, '2025-12-24 16:26:53.208962+00', '2025-12-24 16:26:53.208962+00'),
('cf8bfdc7-8c12-4ae7-9f05-9c253a01172f', 'MARTELL BLUE SWIFT', NULL, 150000, 150000, 'c9abda73-9c8a-497d-a33f-bc39a503499a', NULL, '62af768f-477c-4da8-9795-0101fc862359', true, true, true, '2025-12-24 16:26:53.309572+00', '2025-12-24 16:26:53.309572+00'),
('3071b31e-bfe5-4bef-b4d5-4633c84fe967', 'WHITE RICE AND GOATMEAT STEW WITH PLANTAIN', NULL, 5000, 5000, '3ee34782-6f84-497f-b54f-f06a83e88b8f', NULL, '5d89741c-dfbc-48ce-bca2-75d52a6fc73a', true, true, true, '2025-12-24 16:26:53.411763+00', '2025-12-24 16:26:53.411763+00'),
('e1edd20a-e3f3-4f49-b1d4-5276821aa82c', 'WATERMELON AND BEET', NULL, 2500, 2500, '0c6847d9-70bd-4910-936f-ad7f402ca80a', NULL, 'f36fac9d-3496-4616-8c99-44bf30f1da63', true, true, true, '2025-12-24 16:26:53.512468+00', '2025-12-24 16:26:53.512468+00'),
('37bfdb66-4255-4477-84c8-18db1bbcb69f', 'FRIED PLANTAIN', NULL, 1000, 1000, 'f88c4327-c744-45af-a400-37e4d358caef', NULL, 'b7ca45ee-e9e6-4890-8d6a-c03647fd8263', true, true, true, '2025-12-24 16:26:53.605107+00', '2025-12-24 16:26:53.605107+00')
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  cost_price = EXCLUDED.cost_price,
  category_id = EXCLUDED.category_id,
  is_active = EXCLUDED.is_active,
  is_available = EXCLUDED.is_available;

-- ============================================
-- NOTE: Full inventory and menu data is large
-- Use the Export SQL button in Data Management
-- to get the complete current data dump
-- ============================================

COMMIT;

-- Data import complete
-- For complete data, use the "Download SQL Dump" feature in the app
