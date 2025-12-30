-- Cherry POS Seed Data
-- This file contains sample/initial data for the database
-- Run this after 00-initial-schema.sql

BEGIN;

-- Insert default restaurant settings (if not already present)
INSERT INTO public.restaurant_settings (
    id,
    name,
    tagline,
    address,
    city,
    country,
    phone,
    email,
    currency,
    timezone,
    receipt_footer,
    receipt_show_logo
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Cherry Dining',
    '& Lounge',
    '123 Restaurant Street',
    'Lagos',
    'Nigeria',
    '+234 800 000 0000',
    'info@cherrydining.com',
    'NGN',
    'Africa/Lagos',
    'Thank you for dining with us!',
    true
) ON CONFLICT (id) DO NOTHING;

-- Sample Menu Categories
INSERT INTO public.menu_categories (id, name, category_type, sort_order, is_active) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Appetizers', 'food', 1, true),
    ('c0000000-0000-0000-0000-000000000002', 'Main Course', 'food', 2, true),
    ('c0000000-0000-0000-0000-000000000003', 'Desserts', 'food', 3, true),
    ('c0000000-0000-0000-0000-000000000004', 'Drinks', 'drink', 4, true),
    ('c0000000-0000-0000-0000-000000000005', 'Cocktails', 'drink', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Sample Suppliers
INSERT INTO public.suppliers (id, name, contact_person, phone, email, address, is_active) VALUES
    ('s0000000-0000-0000-0000-000000000001', 'Farm Fresh Produce', 'John Doe', '+234 800 111 1111', 'john@farmfresh.com', '456 Farm Road, Lagos', true),
    ('s0000000-0000-0000-0000-000000000002', 'Beverage World', 'Jane Smith', '+234 800 222 2222', 'jane@beverageworld.com', '789 Drink Avenue, Lagos', true)
ON CONFLICT (id) DO NOTHING;

-- Sample Inventory Items
INSERT INTO public.inventory_items (id, name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier_id, is_active) VALUES
    ('i0000000-0000-0000-0000-000000000001', 'Rice', 'Grains', 'kg', 50, 10, 500, 's0000000-0000-0000-0000-000000000001', true),
    ('i0000000-0000-0000-0000-000000000002', 'Chicken', 'Meat', 'kg', 30, 5, 2000, 's0000000-0000-0000-0000-000000000001', true),
    ('i0000000-0000-0000-0000-000000000003', 'Coca-Cola', 'Beverages', 'bottles', 100, 20, 200, 's0000000-0000-0000-0000-000000000002', true),
    ('i0000000-0000-0000-0000-000000000004', 'Water', 'Beverages', 'bottles', 200, 50, 100, 's0000000-0000-0000-0000-000000000002', true)
ON CONFLICT (id) DO NOTHING;

-- Sample Menu Items
INSERT INTO public.menu_items (id, name, description, price, cost_price, category_id, is_active, is_available) VALUES
    ('m0000000-0000-0000-0000-000000000001', 'Spring Rolls', 'Crispy vegetable spring rolls', 1500, 500, 'c0000000-0000-0000-0000-000000000001', true, true),
    ('m0000000-0000-0000-0000-000000000002', 'Jollof Rice with Chicken', 'Nigerian classic jollof rice with grilled chicken', 3500, 1200, 'c0000000-0000-0000-0000-000000000002', true, true),
    ('m0000000-0000-0000-0000-000000000003', 'Fried Rice with Beef', 'Chinese-style fried rice with beef strips', 3200, 1100, 'c0000000-0000-0000-0000-000000000002', true, true),
    ('m0000000-0000-0000-0000-000000000004', 'Ice Cream Sundae', 'Vanilla ice cream with chocolate sauce', 1800, 400, 'c0000000-0000-0000-0000-000000000003', true, true),
    ('m0000000-0000-0000-0000-000000000005', 'Coca-Cola', 'Chilled soft drink', 500, 200, 'c0000000-0000-0000-0000-000000000004', true, true),
    ('m0000000-0000-0000-0000-000000000006', 'Chapman', 'Nigerian cocktail mocktail', 2000, 600, 'c0000000-0000-0000-0000-000000000005', true, true)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Seed data complete
