-- Cherry Dining & Lounge POS - Complete Database Script
-- This script creates all tables and populates them with sample data
-- Run this script to set up a fresh database

-- Create database
CREATE DATABASE IF NOT EXISTS cherry_dining CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cherry_dining;

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS stock_movements;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;
DROP TABLE IF EXISTS inventory_items;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS menu_categories;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS restaurant_settings;

-- =====================================================
-- TABLE STRUCTURES
-- =====================================================

-- Users table (for authentication)
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Profiles table
CREATE TABLE profiles (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User roles
CREATE TABLE user_roles (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role ENUM('super_admin', 'manager', 'cashier', 'bar_staff', 'kitchen_staff', 'inventory_officer', 'accountant') DEFAULT 'cashier',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Restaurant settings
CREATE TABLE restaurant_settings (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) DEFAULT 'Cherry Dining Lounge',
  tagline VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  logo_url TEXT,
  currency VARCHAR(10) DEFAULT 'NGN',
  timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
  receipt_footer TEXT,
  receipt_show_logo BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Menu categories
CREATE TABLE menu_categories (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category_type ENUM('food', 'drink', 'other') DEFAULT 'food',
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers
CREATE TABLE suppliers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Inventory items
CREATE TABLE inventory_items (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'pcs',
  current_stock DECIMAL(10,2) DEFAULT 0,
  min_stock_level DECIMAL(10,2) DEFAULT 0,
  cost_per_unit DECIMAL(10,2),
  supplier VARCHAR(255),
  supplier_id VARCHAR(36),
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Menu items
CREATE TABLE menu_items (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_available BOOLEAN DEFAULT TRUE,
  category_id VARCHAR(36),
  inventory_item_id VARCHAR(36),
  track_inventory BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL
);

-- Orders
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  order_type ENUM('dine_in', 'takeaway', 'delivery', 'bar_only') DEFAULT 'dine_in',
  table_number VARCHAR(20),
  subtotal DECIMAL(10,2) DEFAULT 0,
  vat_amount DECIMAL(10,2) DEFAULT 0,
  service_charge DECIMAL(10,2) DEFAULT 0,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending', 'preparing', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
  notes TEXT,
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Order items
CREATE TABLE order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  menu_item_id VARCHAR(36),
  item_name VARCHAR(255) NOT NULL,
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL
);

-- Payments
CREATE TABLE payments (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  payment_method ENUM('cash', 'card', 'transfer', 'mobile') DEFAULT 'cash',
  amount DECIMAL(10,2) NOT NULL,
  reference VARCHAR(255),
  status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Stock movements
CREATE TABLE stock_movements (
  id VARCHAR(36) PRIMARY KEY,
  inventory_item_id VARCHAR(36) NOT NULL,
  movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  previous_stock DECIMAL(10,2) NOT NULL,
  new_stock DECIMAL(10,2) NOT NULL,
  notes TEXT,
  reference VARCHAR(36),
  created_by VARCHAR(36),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_stock_movements_item ON stock_movements(inventory_item_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Restaurant Settings
INSERT INTO restaurant_settings (id, name, tagline, address, city, country, phone, email, currency, timezone, receipt_footer, receipt_show_logo)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Cherry Dining Lounge',
  '& Lounge',
  '123 Victoria Island, Lagos',
  'Lagos',
  'Nigeria',
  '+234 800 123 4567',
  'info@cherrydining.com',
  'NGN',
  'Africa/Lagos',
  'Thank you for dining with us! Please come again.',
  TRUE
);

-- Users (password for all: Password123!)
-- Hash generated with bcrypt for 'Password123!'
INSERT INTO users (id, email, password_hash) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@cherrydining.com', '$2a$10$rQEY7oJxMxvBr3RYw7VXk.qJqD3O5qfHnZJh4ZS3qZZxWp8kQR8rS'),
('22222222-2222-2222-2222-222222222222', 'manager@cherrydining.com', '$2a$10$rQEY7oJxMxvBr3RYw7VXk.qJqD3O5qfHnZJh4ZS3qZZxWp8kQR8rS'),
('33333333-3333-3333-3333-333333333333', 'cashier@cherrydining.com', '$2a$10$rQEY7oJxMxvBr3RYw7VXk.qJqD3O5qfHnZJh4ZS3qZZxWp8kQR8rS'),
('44444444-4444-4444-4444-444444444444', 'bar@cherrydining.com', '$2a$10$rQEY7oJxMxvBr3RYw7VXk.qJqD3O5qfHnZJh4ZS3qZZxWp8kQR8rS'),
('55555555-5555-5555-5555-555555555555', 'kitchen@cherrydining.com', '$2a$10$rQEY7oJxMxvBr3RYw7VXk.qJqD3O5qfHnZJh4ZS3qZZxWp8kQR8rS'),
('66666666-6666-6666-6666-666666666666', 'inventory@cherrydining.com', '$2a$10$rQEY7oJxMxvBr3RYw7VXk.qJqD3O5qfHnZJh4ZS3qZZxWp8kQR8rS');

-- Profiles
INSERT INTO profiles (id, email, full_name) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@cherrydining.com', 'System Administrator'),
('22222222-2222-2222-2222-222222222222', 'manager@cherrydining.com', 'Restaurant Manager'),
('33333333-3333-3333-3333-333333333333', 'cashier@cherrydining.com', 'John Cashier'),
('44444444-4444-4444-4444-444444444444', 'bar@cherrydining.com', 'Mike Bartender'),
('55555555-5555-5555-5555-555555555555', 'kitchen@cherrydining.com', 'Chef Amaka'),
('66666666-6666-6666-6666-666666666666', 'inventory@cherrydining.com', 'Inventory Officer');

-- User Roles
INSERT INTO user_roles (id, user_id, role) VALUES
('r1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'super_admin'),
('r2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'manager'),
('r3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'cashier'),
('r4444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', 'bar_staff'),
('r5555555-5555-5555-5555-555555555555', '55555555-5555-5555-5555-555555555555', 'kitchen_staff'),
('r6666666-6666-6666-6666-666666666666', '66666666-6666-6666-6666-666666666666', 'inventory_officer');

-- Menu Categories
INSERT INTO menu_categories (id, name, category_type, sort_order, is_active) VALUES
('cat-food-main', 'Main Course', 'food', 1, TRUE),
('cat-food-apps', 'Appetizers', 'food', 2, TRUE),
('cat-food-soup', 'Soups', 'food', 3, TRUE),
('cat-food-rice', 'Rice Dishes', 'food', 4, TRUE),
('cat-food-grills', 'Grills & BBQ', 'food', 5, TRUE),
('cat-food-sides', 'Side Dishes', 'food', 6, TRUE),
('cat-food-dessert', 'Desserts', 'food', 7, TRUE),
('cat-drink-soft', 'Soft Drinks', 'drink', 10, TRUE),
('cat-drink-juice', 'Fresh Juices', 'drink', 11, TRUE),
('cat-drink-cocktail', 'Cocktails', 'drink', 12, TRUE),
('cat-drink-beer', 'Beers', 'drink', 13, TRUE),
('cat-drink-wine', 'Wines', 'drink', 14, TRUE),
('cat-drink-spirit', 'Spirits', 'drink', 15, TRUE),
('cat-drink-hot', 'Hot Beverages', 'drink', 16, TRUE);

-- Suppliers
INSERT INTO suppliers (id, name, contact_person, phone, email, address, is_active) VALUES
('sup-meat-001', 'Lagos Meat Suppliers', 'Mr. Adebayo', '+234 801 234 5678', 'orders@lagosmeat.com', 'Ikeja, Lagos', TRUE),
('sup-drink-001', 'Nigerian Breweries', 'Mrs. Okonkwo', '+234 802 345 6789', 'sales@nbplc.com', 'Ilupeju, Lagos', TRUE),
('sup-veg-001', 'Fresh Farm Produce', 'Mr. Ibrahim', '+234 803 456 7890', 'info@freshfarm.ng', 'Mile 12, Lagos', TRUE),
('sup-wine-001', 'Premium Wine Imports', 'Mr. Smith', '+234 804 567 8901', 'orders@premiumwine.ng', 'Victoria Island, Lagos', TRUE);

-- Inventory Items
INSERT INTO inventory_items (id, name, category, unit, current_stock, min_stock_level, cost_per_unit, supplier_id, is_active) VALUES
('inv-beef-001', 'Premium Beef', 'Proteins', 'kg', 50.00, 10.00, 5000.00, 'sup-meat-001', TRUE),
('inv-chkn-001', 'Fresh Chicken', 'Proteins', 'kg', 40.00, 10.00, 3500.00, 'sup-meat-001', TRUE),
('inv-fish-001', 'Catfish', 'Proteins', 'kg', 30.00, 8.00, 4000.00, 'sup-meat-001', TRUE),
('inv-rice-001', 'Basmati Rice', 'Grains', 'kg', 100.00, 20.00, 1500.00, 'sup-veg-001', TRUE),
('inv-oil-001', 'Vegetable Oil', 'Cooking', 'liters', 50.00, 10.00, 2000.00, 'sup-veg-001', TRUE),
('inv-tomato-001', 'Fresh Tomatoes', 'Vegetables', 'kg', 25.00, 10.00, 800.00, 'sup-veg-001', TRUE),
('inv-onion-001', 'Onions', 'Vegetables', 'kg', 30.00, 10.00, 500.00, 'sup-veg-001', TRUE),
('inv-pepper-001', 'Scotch Bonnet Pepper', 'Vegetables', 'kg', 15.00, 5.00, 1200.00, 'sup-veg-001', TRUE),
('inv-coke-001', 'Coca-Cola 50cl', 'Beverages', 'bottles', 120.00, 24.00, 200.00, 'sup-drink-001', TRUE),
('inv-fanta-001', 'Fanta 50cl', 'Beverages', 'bottles', 100.00, 24.00, 200.00, 'sup-drink-001', TRUE),
('inv-sprite-001', 'Sprite 50cl', 'Beverages', 'bottles', 100.00, 24.00, 200.00, 'sup-drink-001', TRUE),
('inv-water-001', 'Eva Water 75cl', 'Beverages', 'bottles', 200.00, 48.00, 150.00, 'sup-drink-001', TRUE),
('inv-star-001', 'Star Lager', 'Alcoholic', 'bottles', 96.00, 24.00, 400.00, 'sup-drink-001', TRUE),
('inv-gulder-001', 'Gulder Beer', 'Alcoholic', 'bottles', 72.00, 24.00, 450.00, 'sup-drink-001', TRUE),
('inv-heineken-001', 'Heineken', 'Alcoholic', 'bottles', 48.00, 24.00, 600.00, 'sup-drink-001', TRUE),
('inv-redwine-001', 'Red Wine - Merlot', 'Wines', 'bottles', 12.00, 4.00, 8000.00, 'sup-wine-001', TRUE),
('inv-whitewine-001', 'White Wine - Chardonnay', 'Wines', 'bottles', 10.00, 4.00, 7500.00, 'sup-wine-001', TRUE),
('inv-hennessy-001', 'Hennessy VS', 'Spirits', 'bottles', 6.00, 2.00, 35000.00, 'sup-wine-001', TRUE);

-- Menu Items
INSERT INTO menu_items (id, name, description, price, cost_price, category_id, is_active, is_available, track_inventory, inventory_item_id) VALUES
-- Main Course
('menu-jollof-001', 'Jollof Rice', 'Nigerian party-style jollof rice with smoky flavor', 3500.00, 1200.00, 'cat-food-rice', TRUE, TRUE, FALSE, NULL),
('menu-fried-rice-001', 'Fried Rice', 'Vegetable fried rice with mixed vegetables', 3500.00, 1100.00, 'cat-food-rice', TRUE, TRUE, FALSE, NULL),
('menu-white-rice-001', 'White Rice & Stew', 'Steamed white rice with tomato stew', 3000.00, 900.00, 'cat-food-rice', TRUE, TRUE, FALSE, NULL),
('menu-ofada-001', 'Ofada Rice & Sauce', 'Local rice with spicy ofada sauce', 4000.00, 1400.00, 'cat-food-rice', TRUE, TRUE, FALSE, NULL),
-- Proteins
('menu-grilled-chkn-001', 'Grilled Chicken', 'Half chicken grilled to perfection', 4500.00, 1800.00, 'cat-food-grills', TRUE, TRUE, TRUE, 'inv-chkn-001'),
('menu-pepper-chkn-001', 'Peppered Chicken', 'Spicy peppered chicken', 4000.00, 1600.00, 'cat-food-grills', TRUE, TRUE, TRUE, 'inv-chkn-001'),
('menu-suya-001', 'Beef Suya', 'Traditional spiced beef skewers', 3500.00, 1200.00, 'cat-food-grills', TRUE, TRUE, TRUE, 'inv-beef-001'),
('menu-asun-001', 'Asun (Peppered Goat)', 'Spicy grilled goat meat', 5000.00, 2000.00, 'cat-food-grills', TRUE, TRUE, FALSE, NULL),
('menu-catfish-001', 'Grilled Catfish', 'Whole catfish grilled with spices', 6000.00, 2500.00, 'cat-food-grills', TRUE, TRUE, TRUE, 'inv-fish-001'),
-- Soups
('menu-egusi-001', 'Egusi Soup', 'Melon seed soup with assorted meat', 4500.00, 1800.00, 'cat-food-soup', TRUE, TRUE, FALSE, NULL),
('menu-ogbono-001', 'Ogbono Soup', 'Draw soup with assorted meat', 4500.00, 1700.00, 'cat-food-soup', TRUE, TRUE, FALSE, NULL),
('menu-pepper-soup-001', 'Goat Pepper Soup', 'Spicy goat meat pepper soup', 4000.00, 1600.00, 'cat-food-soup', TRUE, TRUE, FALSE, NULL),
('menu-catfish-soup-001', 'Catfish Pepper Soup', 'Fresh catfish pepper soup', 5500.00, 2200.00, 'cat-food-soup', TRUE, TRUE, TRUE, 'inv-fish-001'),
-- Swallows/Sides
('menu-pounded-001', 'Pounded Yam', 'Traditional pounded yam', 2000.00, 600.00, 'cat-food-sides', TRUE, TRUE, FALSE, NULL),
('menu-amala-001', 'Amala', 'Yam flour swallow', 1500.00, 400.00, 'cat-food-sides', TRUE, TRUE, FALSE, NULL),
('menu-eba-001', 'Eba', 'Garri swallow', 1200.00, 300.00, 'cat-food-sides', TRUE, TRUE, FALSE, NULL),
('menu-plantain-001', 'Fried Plantain', 'Sweet fried plantain (dodo)', 1500.00, 400.00, 'cat-food-sides', TRUE, TRUE, FALSE, NULL),
('menu-coleslaw-001', 'Coleslaw', 'Fresh vegetable coleslaw', 1000.00, 300.00, 'cat-food-sides', TRUE, TRUE, FALSE, NULL),
-- Appetizers
('menu-spring-roll-001', 'Spring Rolls', 'Crispy vegetable spring rolls (4pcs)', 2500.00, 800.00, 'cat-food-apps', TRUE, TRUE, FALSE, NULL),
('menu-samosa-001', 'Samosa', 'Meat filled pastry (4pcs)', 2500.00, 850.00, 'cat-food-apps', TRUE, TRUE, FALSE, NULL),
('menu-puff-001', 'Puff Puff', 'Nigerian doughnuts (6pcs)', 1500.00, 400.00, 'cat-food-apps', TRUE, TRUE, FALSE, NULL),
-- Desserts
('menu-cake-001', 'Chocolate Cake', 'Rich chocolate cake slice', 2500.00, 800.00, 'cat-food-dessert', TRUE, TRUE, FALSE, NULL),
('menu-icecream-001', 'Ice Cream', 'Vanilla ice cream (2 scoops)', 2000.00, 600.00, 'cat-food-dessert', TRUE, TRUE, FALSE, NULL),
-- Soft Drinks
('menu-coke-001', 'Coca-Cola', 'Coca-Cola 50cl', 500.00, 200.00, 'cat-drink-soft', TRUE, TRUE, TRUE, 'inv-coke-001'),
('menu-fanta-001', 'Fanta Orange', 'Fanta 50cl', 500.00, 200.00, 'cat-drink-soft', TRUE, TRUE, TRUE, 'inv-fanta-001'),
('menu-sprite-001', 'Sprite', 'Sprite 50cl', 500.00, 200.00, 'cat-drink-soft', TRUE, TRUE, TRUE, 'inv-sprite-001'),
('menu-water-001', 'Eva Water', 'Eva Water 75cl', 300.00, 150.00, 'cat-drink-soft', TRUE, TRUE, TRUE, 'inv-water-001'),
-- Fresh Juices
('menu-chapman-001', 'Chapman', 'Nigerian cocktail mocktail', 2500.00, 800.00, 'cat-drink-juice', TRUE, TRUE, FALSE, NULL),
('menu-orange-juice-001', 'Fresh Orange Juice', 'Freshly squeezed orange juice', 2000.00, 600.00, 'cat-drink-juice', TRUE, TRUE, FALSE, NULL),
('menu-pineapple-juice-001', 'Pineapple Juice', 'Fresh pineapple juice', 2000.00, 600.00, 'cat-drink-juice', TRUE, TRUE, FALSE, NULL),
('menu-smoothie-001', 'Mixed Fruit Smoothie', 'Banana, mango & strawberry blend', 3000.00, 900.00, 'cat-drink-juice', TRUE, TRUE, FALSE, NULL),
-- Beers
('menu-star-001', 'Star Lager', 'Star Lager Beer', 800.00, 400.00, 'cat-drink-beer', TRUE, TRUE, TRUE, 'inv-star-001'),
('menu-gulder-001', 'Gulder', 'Gulder Beer', 900.00, 450.00, 'cat-drink-beer', TRUE, TRUE, TRUE, 'inv-gulder-001'),
('menu-heineken-001', 'Heineken', 'Heineken Premium Lager', 1200.00, 600.00, 'cat-drink-beer', TRUE, TRUE, TRUE, 'inv-heineken-001'),
('menu-trophy-001', 'Trophy Stout', 'Trophy Extra Stout', 800.00, 400.00, 'cat-drink-beer', TRUE, TRUE, FALSE, NULL),
('menu-legend-001', 'Legend Extra Stout', 'Legend Extra Stout', 900.00, 450.00, 'cat-drink-beer', TRUE, TRUE, FALSE, NULL),
-- Wines
('menu-redwine-glass-001', 'Red Wine (Glass)', 'House red wine by the glass', 3000.00, 1200.00, 'cat-drink-wine', TRUE, TRUE, FALSE, NULL),
('menu-whitewine-glass-001', 'White Wine (Glass)', 'House white wine by the glass', 3000.00, 1100.00, 'cat-drink-wine', TRUE, TRUE, FALSE, NULL),
('menu-redwine-bottle-001', 'Red Wine (Bottle)', 'Merlot full bottle', 18000.00, 8000.00, 'cat-drink-wine', TRUE, TRUE, TRUE, 'inv-redwine-001'),
('menu-whitewine-bottle-001', 'White Wine (Bottle)', 'Chardonnay full bottle', 16000.00, 7500.00, 'cat-drink-wine', TRUE, TRUE, TRUE, 'inv-whitewine-001'),
-- Cocktails
('menu-mojito-001', 'Mojito', 'Classic mint mojito', 4500.00, 1500.00, 'cat-drink-cocktail', TRUE, TRUE, FALSE, NULL),
('menu-margarita-001', 'Margarita', 'Classic lime margarita', 4500.00, 1500.00, 'cat-drink-cocktail', TRUE, TRUE, FALSE, NULL),
('menu-pinacolada-001', 'Piña Colada', 'Coconut pineapple cocktail', 5000.00, 1700.00, 'cat-drink-cocktail', TRUE, TRUE, FALSE, NULL),
('menu-longisland-001', 'Long Island Iced Tea', 'Multi-spirit cocktail', 6000.00, 2000.00, 'cat-drink-cocktail', TRUE, TRUE, FALSE, NULL),
-- Spirits
('menu-hennessy-shot-001', 'Hennessy (Shot)', 'Hennessy VS shot', 3500.00, 1500.00, 'cat-drink-spirit', TRUE, TRUE, FALSE, NULL),
('menu-hennessy-bottle-001', 'Hennessy VS (Bottle)', 'Hennessy VS full bottle', 55000.00, 35000.00, 'cat-drink-spirit', TRUE, TRUE, TRUE, 'inv-hennessy-001'),
('menu-johnnie-walker-001', 'Johnnie Walker (Shot)', 'Johnnie Walker Black shot', 3000.00, 1200.00, 'cat-drink-spirit', TRUE, TRUE, FALSE, NULL),
('menu-baileys-shot-001', 'Baileys (Shot)', 'Baileys Irish Cream shot', 2500.00, 1000.00, 'cat-drink-spirit', TRUE, TRUE, FALSE, NULL),
-- Hot Beverages
('menu-coffee-001', 'Coffee', 'Freshly brewed coffee', 1500.00, 400.00, 'cat-drink-hot', TRUE, TRUE, FALSE, NULL),
('menu-tea-001', 'Tea', 'Premium tea selection', 1200.00, 300.00, 'cat-drink-hot', TRUE, TRUE, FALSE, NULL),
('menu-hotchoc-001', 'Hot Chocolate', 'Rich hot chocolate', 2000.00, 600.00, 'cat-drink-hot', TRUE, TRUE, FALSE, NULL);

-- Sample Orders (for testing reports)
INSERT INTO orders (id, order_number, order_type, table_number, subtotal, vat_amount, service_charge, discount_amount, total_amount, status, created_by, created_at) VALUES
('ord-001', 'ORD-231215-0001', 'dine_in', 'T5', 15500.00, 1162.50, 1550.00, 0.00, 18212.50, 'completed', '33333333-3333-3333-3333-333333333333', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('ord-002', 'ORD-231215-0002', 'dine_in', 'T3', 8500.00, 637.50, 850.00, 0.00, 9987.50, 'completed', '33333333-3333-3333-3333-333333333333', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('ord-003', 'ORD-231216-0001', 'takeaway', NULL, 12000.00, 900.00, 0.00, 0.00, 12900.00, 'completed', '33333333-3333-3333-3333-333333333333', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('ord-004', 'ORD-231216-0002', 'bar_only', 'B2', 6500.00, 487.50, 650.00, 0.00, 7637.50, 'completed', '44444444-4444-4444-4444-444444444444', DATE_SUB(NOW(), INTERVAL 1 DAY)),
('ord-005', 'ORD-231217-0001', 'dine_in', 'T1', 25000.00, 1875.00, 2500.00, 2000.00, 27375.00, 'completed', '33333333-3333-3333-3333-333333333333', NOW());

-- Order Items
INSERT INTO order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, total_price) VALUES
-- Order 1
('oi-001-1', 'ord-001', 'menu-jollof-001', 'Jollof Rice', 2, 3500.00, 7000.00),
('oi-001-2', 'ord-001', 'menu-grilled-chkn-001', 'Grilled Chicken', 2, 4500.00, 9000.00),
('oi-001-3', 'ord-001', 'menu-coke-001', 'Coca-Cola', 3, 500.00, 1500.00),
-- Order 2
('oi-002-1', 'ord-002', 'menu-fried-rice-001', 'Fried Rice', 1, 3500.00, 3500.00),
('oi-002-2', 'ord-002', 'menu-pepper-chkn-001', 'Peppered Chicken', 1, 4000.00, 4000.00),
('oi-002-3', 'ord-002', 'menu-water-001', 'Eva Water', 2, 300.00, 600.00),
('oi-002-4', 'ord-002', 'menu-fanta-001', 'Fanta Orange', 1, 500.00, 500.00),
-- Order 3
('oi-003-1', 'ord-003', 'menu-egusi-001', 'Egusi Soup', 2, 4500.00, 9000.00),
('oi-003-2', 'ord-003', 'menu-pounded-001', 'Pounded Yam', 2, 2000.00, 4000.00),
-- Order 4 (Bar)
('oi-004-1', 'ord-004', 'menu-star-001', 'Star Lager', 4, 800.00, 3200.00),
('oi-004-2', 'ord-004', 'menu-suya-001', 'Beef Suya', 2, 3500.00, 7000.00),
-- Order 5
('oi-005-1', 'ord-005', 'menu-catfish-001', 'Grilled Catfish', 2, 6000.00, 12000.00),
('oi-005-2', 'ord-005', 'menu-jollof-001', 'Jollof Rice', 2, 3500.00, 7000.00),
('oi-005-3', 'ord-005', 'menu-heineken-001', 'Heineken', 4, 1200.00, 4800.00),
('oi-005-4', 'ord-005', 'menu-chapman-001', 'Chapman', 2, 2500.00, 5000.00);

-- Payments
INSERT INTO payments (id, order_id, payment_method, amount, status, created_by) VALUES
('pay-001', 'ord-001', 'card', 18212.50, 'completed', '33333333-3333-3333-3333-333333333333'),
('pay-002', 'ord-002', 'cash', 9987.50, 'completed', '33333333-3333-3333-3333-333333333333'),
('pay-003', 'ord-003', 'transfer', 12900.00, 'completed', '33333333-3333-3333-3333-333333333333'),
('pay-004', 'ord-004', 'cash', 7637.50, 'completed', '44444444-4444-4444-4444-444444444444'),
('pay-005', 'ord-005', 'card', 27375.00, 'completed', '33333333-3333-3333-3333-333333333333');

-- Stock Movements (sample)
INSERT INTO stock_movements (id, inventory_item_id, movement_type, quantity, previous_stock, new_stock, notes, created_by) VALUES
('sm-001', 'inv-coke-001', 'in', 48.00, 72.00, 120.00, 'Weekly restock', '66666666-6666-6666-6666-666666666666'),
('sm-002', 'inv-chkn-001', 'in', 20.00, 20.00, 40.00, 'Fresh delivery from supplier', '66666666-6666-6666-6666-666666666666'),
('sm-003', 'inv-star-001', 'out', 12.00, 108.00, 96.00, 'Sales deduction', '66666666-6666-6666-6666-666666666666'),
('sm-004', 'inv-beef-001', 'adjustment', -5.00, 55.00, 50.00, 'Stock count adjustment', '66666666-6666-6666-6666-666666666666');

-- =====================================================
-- DONE!
-- =====================================================
-- 
-- Default Login Credentials:
-- 
-- Super Admin:  admin@cherrydining.com    / Password123!
-- Manager:      manager@cherrydining.com  / Password123!
-- Cashier:      cashier@cherrydining.com  / Password123!
-- Bar Staff:    bar@cherrydining.com      / Password123!
-- Kitchen:      kitchen@cherrydining.com  / Password123!
-- Inventory:    inventory@cherrydining.com / Password123!
--
-- Note: For production, change all passwords immediately!
-- =====================================================
