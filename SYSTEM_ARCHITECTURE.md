# Cherry POS System - Complete Architecture Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Database Schema](#database-schema)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Layer](#api-layer)
7. [Edge Functions](#edge-functions)
8. [Frontend Components](#frontend-components)
9. [Design System](#design-system)
10. [Self-Hosting with Docker](#self-hosting-with-docker)
11. [Deployment Options](#deployment-options)
12. [Environment Variables](#environment-variables)

---

## System Overview

**Cherry POS** is a full-featured Point of Sale system designed for restaurants, bars, and dining lounges. It provides:

- **POS Terminal**: Order creation, cart management, multiple payment methods
- **Order Management**: Kitchen/bar queues, order status tracking
- **Inventory Management**: Stock tracking, low stock alerts, stock movements
- **Menu Management**: Categories, items, pricing, availability
- **Staff Management**: User roles, permissions, authentication
- **Customer Management**: Loyalty points, order history
- **Reporting**: Daily summaries, sales analytics, EOD reports
- **Multi-Role Access Control**: 8 distinct user roles with granular permissions

---

## Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI Framework |
| TypeScript | Latest | Type Safety |
| Vite | Latest | Build Tool |
| Tailwind CSS | Latest | Styling |
| Shadcn/UI | Latest | UI Components |
| React Router | 6.30.1 | Routing |
| TanStack Query | 5.83.0 | Server State Management |
| React Hook Form | 7.61.1 | Form Handling |
| Zod | 3.25.76 | Schema Validation |
| Recharts | 2.15.4 | Charts & Reporting |
| Lucide React | 0.462.0 | Icons |
| date-fns | 3.6.0 | Date Utilities |
| Sonner | 1.7.4 | Toast Notifications |

### Backend
| Technology | Purpose |
|------------|---------|
| Supabase | Backend-as-a-Service |
| PostgreSQL | Database |
| Supabase Auth | Authentication |
| Supabase Edge Functions | Serverless Functions (Deno) |
| Supabase Storage | File Storage |
| Supabase Realtime | Real-time Subscriptions |

### DevOps
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container Orchestration |
| Kong | API Gateway (self-hosted) |
| Nginx | Reverse Proxy |

---

## Project Structure

```
cherry-pos/
├── src/
│   ├── App.tsx                    # Main app with routing
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles & design tokens
│   │
│   ├── components/
│   │   ├── ui/                    # Shadcn UI components (40+ components)
│   │   ├── layout/
│   │   │   ├── AppSidebar.tsx     # Navigation sidebar
│   │   │   ├── DashboardLayout.tsx # Protected layout wrapper
│   │   │   ├── UserMenu.tsx       # User dropdown menu
│   │   │   └── ChangePasswordDialog.tsx
│   │   ├── pos/                   # POS-specific components
│   │   │   ├── CartPanel.tsx      # Shopping cart
│   │   │   ├── MenuGrid.tsx       # Menu item grid
│   │   │   ├── CategoryTabs.tsx   # Category navigation
│   │   │   ├── CheckoutDialog.tsx # Payment processing
│   │   │   ├── Receipt.tsx        # Receipt generation
│   │   │   └── CustomerSelect.tsx # Customer selection
│   │   ├── orders/                # Order management components
│   │   ├── inventory/             # Inventory components
│   │   ├── menu/                  # Menu management
│   │   ├── staff/                 # Staff management
│   │   ├── customers/             # Customer management
│   │   ├── reports/               # Reporting components
│   │   └── dashboard/             # Dashboard widgets
│   │
│   ├── pages/
│   │   ├── Auth.tsx               # Login/Signup page
│   │   ├── Dashboard.tsx          # Main dashboard
│   │   ├── POS.tsx                # Point of Sale terminal
│   │   ├── Orders.tsx             # Active orders
│   │   ├── OrderHistory.tsx       # Order history
│   │   ├── Kitchen.tsx            # Kitchen display
│   │   ├── Bar.tsx                # Bar display
│   │   ├── Inventory.tsx          # Inventory management
│   │   ├── MenuManagement.tsx     # Menu editor
│   │   ├── Staff.tsx              # Staff management
│   │   ├── Customers.tsx          # Customer CRM
│   │   ├── Reports.tsx            # Analytics & reports
│   │   ├── EODReport.tsx          # End of day report
│   │   ├── Settings.tsx           # Restaurant settings
│   │   ├── DataImport.tsx         # Data import tool
│   │   └── Profile.tsx            # User profile
│   │
│   ├── hooks/
│   │   ├── useOrders.ts           # Order data hooks
│   │   ├── useMenu.ts             # Menu data hooks
│   │   ├── useInventory.ts        # Inventory data hooks
│   │   ├── useStaff.ts            # Staff data hooks
│   │   ├── useCustomers.ts        # Customer data hooks
│   │   ├── useSettings.ts         # Settings hooks
│   │   ├── useUserRole.ts         # Role-based permissions
│   │   └── use-toast.ts           # Toast notifications
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── orders.ts          # Orders API
│   │   │   ├── menu.ts            # Menu API
│   │   │   ├── inventory.ts       # Inventory API
│   │   │   ├── customers.ts       # Customers API
│   │   │   ├── staff.ts           # Staff API
│   │   │   └── settings.ts        # Settings API
│   │   ├── auth/
│   │   │   └── index.ts           # Auth utilities
│   │   └── utils/
│   │       ├── index.ts           # Common utilities
│   │       ├── uuid.ts            # UUID generation
│   │       └── duplicateCheck.ts  # Duplicate validation
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx        # Authentication context
│   │
│   └── integrations/
│       └── supabase/
│           ├── client.ts          # Supabase client (auto-generated)
│           └── types.ts           # Database types (auto-generated)
│
├── supabase/
│   ├── config.toml                # Supabase configuration
│   └── functions/
│       ├── manage-staff/          # Staff CRUD operations
│       ├── import-data/           # Bulk data import
│       ├── import-staff/          # Staff import
│       ├── reset-staff-password/  # Password reset
│       ├── migrate-openpos/       # Legacy migration
│       └── sync-menu-inventory/   # Menu-inventory sync
│
├── docker/
│   ├── Dockerfile.app             # App container
│   ├── docker-compose.supabase.yml # Self-hosted Supabase
│   ├── nginx.conf                 # Nginx configuration
│   ├── .env.example               # Environment template
│   ├── README.md                  # Docker setup guide
│   └── volumes/
│       ├── db/init/               # Database initialization
│       └── kong/                  # Kong API gateway config
│
├── docker-compose.yml             # Main compose file
├── tailwind.config.ts             # Tailwind configuration
├── vite.config.ts                 # Vite configuration
└── package.json                   # Dependencies
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    auth.users   │     │    profiles     │     │   user_roles    │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │────▶│ id (PK, FK)     │     │ id (PK)         │
│ email           │     │ email           │     │ user_id (FK)    │────┐
│ ...             │     │ full_name       │     │ role (enum)     │    │
└─────────────────┘     │ avatar_url      │     │ created_at      │    │
                        │ created_at      │     └─────────────────┘    │
                        │ updated_at      │                            │
                        └─────────────────┘                            │
                                                                       │
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐   │
│   suppliers     │     │ menu_categories │     │ inventory_items │   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤   │
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │   │
│ name            │     │ name            │     │ name            │   │
│ contact_person  │     │ category_type   │     │ category_id(FK) │───┤
│ phone           │     │ sort_order      │     │ supplier_id(FK) │───┤
│ email           │     │ is_active       │     │ unit            │   │
│ address         │     │ created_at      │     │ current_stock   │   │
│ is_active       │     └─────────────────┘     │ min_stock_level │   │
│ created_at      │              │              │ cost_per_unit   │   │
│ updated_at      │              │              │ is_active       │   │
└─────────────────┘              │              │ created_at      │   │
        │                        │              │ updated_at      │   │
        │                        │              └─────────────────┘   │
        │                        │                      │             │
        │                        ▼                      │             │
        │              ┌─────────────────┐              │             │
        │              │   menu_items    │              │             │
        │              ├─────────────────┤              │             │
        │              │ id (PK)         │              │             │
        │              │ name            │              │             │
        │              │ description     │              │             │
        │              │ price           │              │             │
        │              │ cost_price      │              │             │
        │              │ category_id(FK) │◀─────────────┤             │
        │              │ inventory_id(FK)│◀─────────────┘             │
        │              │ image_url       │                            │
        │              │ track_inventory │                            │
        │              │ is_active       │                            │
        │              │ is_available    │                            │
        │              │ created_at      │                            │
        │              │ updated_at      │                            │
        │              └─────────────────┘                            │
        │                        │                                    │
        │                        │                                    │
        │                        ▼                                    │
        │              ┌─────────────────┐     ┌─────────────────┐   │
        │              │     orders      │     │  order_items    │   │
        │              ├─────────────────┤     ├─────────────────┤   │
        │              │ id (PK)         │────▶│ id (PK)         │   │
        │              │ order_number    │     │ order_id (FK)   │   │
        │              │ order_type      │     │ menu_item_id(FK)│   │
        │              │ table_number    │     │ item_name       │   │
        │              │ status          │     │ quantity        │   │
        │              │ customer_id(FK) │     │ unit_price      │   │
        │              │ subtotal        │     │ total_price     │   │
        │              │ discount_amount │     │ notes           │   │
        │              │ vat_amount      │     │ created_at      │   │
        │              │ service_charge  │     └─────────────────┘   │
        │              │ total_amount    │                            │
        │              │ notes           │                            │
        │              │ created_by (FK) │◀───────────────────────────┘
        │              │ created_at      │
        │              │ updated_at      │
        │              └─────────────────┘
        │                        │
        │                        ▼
        │              ┌─────────────────┐     ┌─────────────────┐
        │              │    payments     │     │ stock_movements │
        │              ├─────────────────┤     ├─────────────────┤
        │              │ id (PK)         │     │ id (PK)         │
        │              │ order_id (FK)   │     │ inventory_id(FK)│
        │              │ amount          │     │ movement_type   │
        │              │ payment_method  │     │ quantity        │
        │              │ reference       │     │ previous_stock  │
        │              │ status          │     │ new_stock       │
        │              │ created_by(FK)  │     │ reference       │
        │              │ created_at      │     │ notes           │
        │              └─────────────────┘     │ created_by(FK)  │
        │                                      │ created_at      │
        │                                      └─────────────────┘
        │
        │              ┌─────────────────┐     ┌─────────────────┐
        │              │   customers     │     │restaurant_settings│
        │              ├─────────────────┤     ├─────────────────┤
        │              │ id (PK)         │     │ id (PK)         │
        └─────────────▶│ name            │     │ name            │
                       │ email           │     │ tagline         │
                       │ phone           │     │ address         │
                       │ address         │     │ city            │
                       │ loyalty_points  │     │ country         │
                       │ total_orders    │     │ phone           │
                       │ total_spent     │     │ email           │
                       │ tags            │     │ logo_url        │
                       │ notes           │     │ currency        │
                       │ is_active       │     │ timezone        │
                       │ created_at      │     │ receipt_footer  │
                       │ updated_at      │     │ receipt_show_logo│
                       └─────────────────┘     │ created_at      │
                                               │ updated_at      │
                                               └─────────────────┘
```

### Tables Detail

#### 1. `profiles`
Stores user profile information (linked to `auth.users`).
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. `user_roles`
Maps users to their application roles.
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role DEFAULT 'cashier',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Role enum
CREATE TYPE app_role AS ENUM (
  'super_admin',
  'admin',
  'manager',
  'cashier',
  'bar_staff',
  'kitchen_staff',
  'inventory_officer',
  'accountant'
);
```

#### 3. `menu_categories`
Organizes menu items into categories.
```sql
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category_type TEXT DEFAULT 'food', -- 'food' or 'drink'
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. `menu_items`
Defines available menu items.
```sql
CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC,
  category_id UUID REFERENCES menu_categories(id),
  image_url TEXT,
  inventory_item_id UUID REFERENCES inventory_items(id),
  track_inventory BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. `inventory_items`
Tracks stock levels of ingredients/products.
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  category_id UUID REFERENCES menu_categories(id),
  unit TEXT DEFAULT 'pcs',
  current_stock NUMERIC DEFAULT 0,
  min_stock_level NUMERIC DEFAULT 10,
  cost_per_unit NUMERIC,
  supplier TEXT,
  supplier_id UUID REFERENCES suppliers(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6. `orders`
Records customer orders.
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  order_type TEXT NOT NULL DEFAULT 'dine_in', -- dine_in, takeaway, delivery, bar_only
  table_number TEXT,
  status TEXT DEFAULT 'pending', -- pending, preparing, ready, completed, cancelled
  customer_id UUID REFERENCES customers(id),
  subtotal NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  vat_amount NUMERIC DEFAULT 0,
  service_charge NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID, -- FK to auth.users
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 7. `order_items`
Details items within each order.
```sql
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id),
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 8. `payments`
Tracks payment transactions.
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cash', -- cash, card, transfer, pos
  reference TEXT,
  status TEXT DEFAULT 'completed',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 9. `stock_movements`
Logs changes in inventory stock.
```sql
CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL, -- in, out, adjustment, waste
  quantity NUMERIC NOT NULL,
  previous_stock NUMERIC NOT NULL,
  new_stock NUMERIC NOT NULL,
  reference TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 10. `suppliers`
Manages supplier information.
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 11. `customers`
Customer CRM data.
```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  loyalty_points INTEGER DEFAULT 0,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  tags TEXT[],
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 12. `restaurant_settings`
Global restaurant configuration.
```sql
CREATE TABLE restaurant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Cherry Dining',
  tagline TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  currency TEXT DEFAULT 'NGN',
  timezone TEXT DEFAULT 'Africa/Lagos',
  receipt_show_logo BOOLEAN DEFAULT true,
  receipt_footer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Database Functions

| Function | Purpose |
|----------|---------|
| `generate_order_number()` | Creates unique order numbers (ORD-YYMMDD-0001) |
| `get_user_role(user_id)` | Retrieves user's role |
| `has_role(user_id, role)` | Checks if user has specific role |
| `handle_new_user()` | Trigger: Creates profile & assigns default role on signup |
| `update_updated_at_column()` | Trigger: Auto-updates `updated_at` timestamps |
| `update_menu_availability_on_stock_change()` | Trigger: Updates menu availability based on stock |
| `normalize_name(text)` | Normalizes names for duplicate checking |
| `check_duplicate_name()` | Trigger: Prevents duplicate names |

### Database Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `on_inventory_stock_change` | `inventory_items` | AFTER UPDATE (current_stock) | `update_menu_availability_on_stock_change()` |
| `update_*_updated_at` | All tables with updated_at | BEFORE UPDATE | `update_updated_at_column()` |

---

## Authentication & Authorization

### Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ROLE HIERARCHY                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────────┐                                                          │
│   │ super_admin  │  Full system access, can manage all roles                │
│   └──────┬───────┘                                                          │
│          │                                                                   │
│   ┌──────▼───────┐                                                          │
│   │    admin     │  Full access except Settings, Data Import, Data Sync     │
│   └──────┬───────┘                                                          │
│          │                                                                   │
│   ┌──────▼───────┐                                                          │
│   │   manager    │  Can manage staff (below), inventory, orders, reports    │
│   └──────┬───────┘                                                          │
│          │                                                                   │
│   ┌──────┴──────────────┬──────────────┬──────────────┬──────────────┐     │
│   │                     │              │              │              │     │
│   ▼                     ▼              ▼              ▼              ▼     │
│ ┌────────┐   ┌──────────────┐  ┌─────────────┐  ┌───────────┐  ┌────────┐ │
│ │cashier │   │inventory_    │  │kitchen_staff│  │ bar_staff │  │accountant│
│ │        │   │officer       │  │             │  │           │  │        │ │
│ └────────┘   └──────────────┘  └─────────────┘  └───────────┘  └────────┘ │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Role Permissions Matrix

| Feature | super_admin | admin | manager | cashier | bar_staff | kitchen_staff | inventory_officer | accountant |
|---------|-------------|-------|---------|---------|-----------|---------------|-------------------|------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| POS | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Orders | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Kitchen Queue | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Bar Queue | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Inventory | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Menu | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Staff | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Customers | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| EOD Report | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Data Import | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Row Level Security (RLS) Policies

All tables have RLS enabled with role-based policies:

```sql
-- Example: Inventory management policy
CREATE POLICY "Managers and inventory officers can manage inventory"
ON public.inventory_items
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  has_role(auth.uid(), 'inventory_officer')
);
```

### Authentication Flow

```
┌─────────────┐     ┌─────────────────┐     ┌───────────────┐
│   Login     │────▶│ Supabase Auth   │────▶│ JWT Token     │
│   Page      │     │ signInWithPassword    │ Generated     │
└─────────────┘     └─────────────────┘     └───────┬───────┘
                                                     │
                    ┌─────────────────┐              │
                    │ Auth State      │◀─────────────┘
                    │ Listener        │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Fetch User Role │
                    │ from user_roles │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Set Permissions │
                    │ in Context      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ Render App with │
                    │ Role-Based UI   │
                    └─────────────────┘
```

---

## API Layer

### API Structure

All API calls use the Supabase client located at `src/integrations/supabase/client.ts`.

### Orders API (`src/lib/api/orders.ts`)

```typescript
interface OrdersAPI {
  getOrders(filters?: OrderFilters): Promise<Order[]>
  getOrder(id: string): Promise<Order>
  createOrder(data: CreateOrderData): Promise<Order>
  updateOrderStatus(id: string, status: string): Promise<Order>
  getOrderItems(orderId: string): Promise<OrderItem[]>
  getOrderPayments(orderId: string): Promise<Payment[]>
  addPayment(orderId: string, payment: Payment): Promise<Payment>
  getKitchenQueue(): Promise<Order[]>
  getBarQueue(): Promise<Order[]>
  getDailySummary(date?: string, createdBy?: string): Promise<DailySummary>
  getOrderHistory(limit?: number): Promise<Order[]>
  getCompletedOrdersByDate(startDate: string, endDate: string, cashierId?: string): Promise<Order[]>
}
```

### Menu API (`src/lib/api/menu.ts`)

```typescript
interface MenuAPI {
  // Categories
  getCategories(): Promise<MenuCategory[]>
  getActiveCategories(): Promise<MenuCategory[]>
  createCategory(data): Promise<MenuCategory>
  updateCategory(id, data): Promise<MenuCategory>
  deleteCategory(id): Promise<void>
  toggleCategoryActive(id): Promise<MenuCategory>
  
  // Menu Items
  getMenuItems(categoryId?: string): Promise<MenuItem[]>
  getActiveMenuItems(categoryId?: string): Promise<MenuItem[]>
  getMenuItem(id: string): Promise<MenuItem>
  createMenuItem(data): Promise<MenuItem>
  updateMenuItem(id, data): Promise<MenuItem>
  deleteMenuItem(id): Promise<void>
  toggleMenuItemAvailability(id, currentStatus): Promise<MenuItem>
}
```

### Inventory API (`src/lib/api/inventory.ts`)

```typescript
interface InventoryAPI {
  // Items
  getInventoryItems(): Promise<InventoryItem[]>
  getActiveInventoryItems(): Promise<InventoryItem[]>
  getLowStockItems(): Promise<InventoryItem[]>
  getInventoryItem(id: string): Promise<InventoryItem>
  createInventoryItem(data): Promise<InventoryItem>
  updateInventoryItem(id, data): Promise<InventoryItem>
  deleteInventoryItem(id): Promise<void>
  
  // Stock Movements
  getStockMovements(itemId?: string): Promise<StockMovement[]>
  addStock(itemId, quantity, notes?): Promise<InventoryItem>
  removeStock(itemId, quantity, notes?): Promise<InventoryItem>
  adjustStock(itemId, newQuantity, notes?): Promise<InventoryItem>
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>
  getActiveSuppliers(): Promise<Supplier[]>
  createSupplier(data): Promise<Supplier>
  updateSupplier(id, data): Promise<Supplier>
  deleteSupplier(id): Promise<void>
}
```

### Staff API (`src/lib/api/staff.ts`)

```typescript
interface StaffAPI {
  getStaff(): Promise<StaffMember[]>
  getActiveStaff(): Promise<StaffMember[]>
  getStaffMember(id: string): Promise<StaffMember>
  createStaff(data: CreateStaffData): Promise<StaffMember>  // Uses Edge Function
  updateStaff(id, data): Promise<StaffMember>
  deleteStaff(id): Promise<void>  // Uses Edge Function
  resetPassword(id, newPassword): Promise<void>  // Uses Edge Function
  updateEmail(id, newEmail): Promise<void>  // Uses Edge Function
  updateRole(id, role): Promise<StaffMember>
}
```

### Customers API (`src/lib/api/customers.ts`)

```typescript
interface CustomersAPI {
  getCustomers(): Promise<Customer[]>
  getActiveCustomers(): Promise<Customer[]>
  getCustomer(id: string): Promise<Customer>
  createCustomer(data): Promise<Customer>
  updateCustomer(id, data): Promise<Customer>
  deleteCustomer(id): Promise<void>
  updateCustomerStats(id, amount): Promise<void>
  addLoyaltyPoints(id, points): Promise<void>
  redeemLoyaltyPoints(id, points): Promise<void>
}
```

---

## Edge Functions

### Overview

Edge Functions are serverless Deno functions that handle operations requiring service role access.

### Function List

| Function | Path | Auth Required | Purpose |
|----------|------|---------------|---------|
| `manage-staff` | `/functions/v1/manage-staff` | Yes | Create, update, delete staff (uses admin API) |
| `import-data` | `/functions/v1/import-data` | Yes (super_admin) | Bulk import menu, inventory, settings |
| `import-staff` | `/functions/v1/import-staff` | Yes | Bulk import staff members |
| `reset-staff-password` | `/functions/v1/reset-staff-password` | Yes | Reset staff passwords |
| `migrate-openpos` | `/functions/v1/migrate-openpos` | Yes | Migrate from legacy OpenPOS system |
| `sync-menu-inventory` | `/functions/v1/sync-menu-inventory` | Yes | Synchronize menu and inventory |

### manage-staff Function

```typescript
// Actions supported
interface CreateUserRequest {
  action: "create" | "delete" | "update" | "update-email";
  email?: string;
  password?: string;
  fullName?: string;
  role?: string;
  userId?: string;
  newEmail?: string;
}

// Role hierarchy for assignments
const getAssignableRoles = (userRole: string): string[] => {
  switch (userRole) {
    case "super_admin":
      return ["super_admin", "admin", "manager", "cashier", "bar_staff", "kitchen_staff", "inventory_officer", "accountant"];
    case "admin":
      return ["manager", "cashier", "bar_staff", "kitchen_staff", "inventory_officer", "accountant"];
    case "manager":
      return ["cashier", "bar_staff", "kitchen_staff", "inventory_officer", "accountant"];
    default:
      return [];
  }
};
```

### Calling Edge Functions

```typescript
// From frontend
const { data, error } = await supabase.functions.invoke('manage-staff', {
  body: {
    action: 'create',
    email: 'staff@example.com',
    password: 'securepassword',
    fullName: 'John Doe',
    role: 'cashier'
  }
});
```

---

## Frontend Components

### UI Component Library (Shadcn/UI)

40+ pre-built components in `src/components/ui/`:

- **Layout**: Card, Separator, Aspect Ratio, Scroll Area
- **Forms**: Input, Textarea, Select, Checkbox, Radio, Switch, Slider
- **Buttons**: Button, Toggle, Toggle Group
- **Navigation**: Tabs, Navigation Menu, Breadcrumb, Pagination
- **Feedback**: Alert, Toast, Progress, Skeleton
- **Overlays**: Dialog, Sheet, Drawer, Popover, Tooltip, Hover Card
- **Data Display**: Table, Badge, Avatar, Calendar
- **Advanced**: Command, Accordion, Collapsible, Context Menu, Dropdown Menu

### Key Custom Components

#### POS Components
- `POSHeader.tsx` - Order type selection, table number input
- `CategoryTabs.tsx` - Menu category navigation with search
- `MenuGrid.tsx` - Menu item display with stock badges
- `CartPanel.tsx` - Shopping cart with customer selection
- `CheckoutDialog.tsx` - Payment processing dialog
- `Receipt.tsx` - Printable receipt generation
- `CustomerSelect.tsx` - Customer search and selection

#### Layout Components
- `DashboardLayout.tsx` - Protected route wrapper with sidebar
- `AppSidebar.tsx` - Role-based navigation menu
- `UserMenu.tsx` - User profile dropdown

#### Staff Components
- `StaffTable.tsx` - Staff list with actions
- `AddEditStaffDialog.tsx` - Staff form with role assignment
- `ResetPasswordDialog.tsx` - Password reset form

---

## Design System

### Color Palette (HSL)

```css
/* Dark Theme - Primary Colors */
--background: 220 20% 7%;        /* Deep dark background */
--foreground: 0 0% 95%;          /* Near white text */
--card: 220 18% 10%;             /* Card backgrounds */
--primary: 348 83% 47%;          /* Cherry red - main accent */
--secondary: 220 15% 15%;        /* Subtle backgrounds */
--muted: 220 15% 18%;            /* Muted elements */
--accent: 348 75% 40%;           /* Secondary cherry accent */
--destructive: 0 62.8% 45%;      /* Error/danger red */

/* Custom Tokens */
--cherry: 348 83% 47%;
--cherry-dark: 348 75% 35%;
--cherry-light: 348 85% 60%;
--gold: 45 80% 55%;
--success: 142 70% 45%;
--warning: 38 92% 50%;
```

### Utility Classes

```css
.gradient-cherry    /* Cherry gradient background */
.gradient-dark      /* Dark gradient background */
.glow-cherry        /* Cherry glow effect */
.glow-cherry-sm     /* Small cherry glow */
.text-gradient-cherry /* Gradient text */
.glass-dark         /* Glassmorphism effect */
.animate-fade-in    /* Fade in animation */
.animate-slide-up   /* Slide up animation */
.animate-scale-in   /* Scale in animation */
```

### Typography

- **Display Font**: System default (customizable)
- **Body Font**: System default (customizable)
- **Font Features**: Ligatures enabled

---

## Self-Hosting with Docker

### Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         Docker Network                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐  │
│  │   Nginx     │────▶│    Kong     │────▶│   Supabase Services  │  │
│  │  (Reverse   │     │ (API Gateway)│    │                      │  │
│  │   Proxy)    │     │             │     │  ┌───────────────┐   │  │
│  └─────────────┘     └─────────────┘     │  │  Auth (GoTrue) │   │  │
│         │                    │            │  └───────────────┘   │  │
│         │                    │            │  ┌───────────────┐   │  │
│         │                    │            │  │   REST API     │   │  │
│         │                    │            │  │   (PostgREST)  │   │  │
│         ▼                    │            │  └───────────────┘   │  │
│  ┌─────────────┐             │            │  ┌───────────────┐   │  │
│  │ Cherry POS  │             │            │  │   Realtime     │   │  │
│  │   (React)   │             │            │  └───────────────┘   │  │
│  └─────────────┘             │            │  ┌───────────────┐   │  │
│                              │            │  │   Storage      │   │  │
│                              │            │  └───────────────┘   │  │
│                              │            │  ┌───────────────┐   │  │
│                              └───────────▶│  │  PostgreSQL    │   │  │
│                                           │  └───────────────┘   │  │
│                                           └─────────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Docker Compose Services

```yaml
services:
  # Database
  db:
    image: supabase/postgres:15.1.0.117
    volumes:
      - ./volumes/db/data:/var/lib/postgresql/data
      - ./volumes/db/init:/docker-entrypoint-initdb.d
    
  # API Gateway
  kong:
    image: kong:2.8.1
    volumes:
      - ./volumes/kong/kong.yml:/var/lib/kong/kong.yml
    
  # Authentication
  auth:
    image: supabase/gotrue:v2.132.3
    depends_on:
      - db
    
  # REST API
  rest:
    image: postgrest/postgrest:v11.2.0
    depends_on:
      - db
    
  # Realtime
  realtime:
    image: supabase/realtime:v2.25.35
    depends_on:
      - db
    
  # Storage
  storage:
    image: supabase/storage-api:v0.43.11
    depends_on:
      - db
    
  # Edge Functions
  functions:
    image: supabase/edge-runtime:v1.29.1
    volumes:
      - ../supabase/functions:/home/deno/functions
    
  # Studio (Optional - Admin UI)
  studio:
    image: supabase/studio:20240101-8e4a094
    
  # Cherry POS App
  app:
    build:
      context: ..
      dockerfile: docker/Dockerfile.app
    depends_on:
      - kong
```

### Quick Start Commands

```bash
# Clone and setup
git clone <repository>
cd cherry-pos/docker

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Generate JWT keys (required)
npx supabase gen keys

# Start all services
docker-compose -f docker-compose.supabase.yml up -d

# View logs
docker-compose -f docker-compose.supabase.yml logs -f

# Stop services
docker-compose -f docker-compose.supabase.yml down
```

---

## Deployment Options

### Option 1: Lovable Cloud (Recommended for Development)

- **Backend**: Managed Supabase instance
- **Frontend**: Lovable hosting
- **URL**: `*.lovable.app`
- **SSL**: Automatic
- **Scaling**: Automatic

### Option 2: Self-Hosted Supabase + Custom Frontend

```bash
# Deploy Supabase
docker-compose -f docker/docker-compose.supabase.yml up -d

# Build and serve frontend
npm run build
# Serve dist/ folder with nginx or any static host
```

### Option 3: Supabase Cloud + Vercel/Netlify

1. Create Supabase project at supabase.com
2. Run migrations manually
3. Deploy frontend to Vercel/Netlify
4. Configure environment variables

---

## Environment Variables

### Frontend (.env)

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=your-project-id
```

### Backend (Supabase/Docker)

```bash
# PostgreSQL
POSTGRES_PASSWORD=your-db-password
POSTGRES_DB=postgres

# JWT (generate with: npx supabase gen keys)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ANON_KEY=eyJhbGc...
SERVICE_ROLE_KEY=eyJhbGc...

# Auth
GOTRUE_SITE_URL=https://your-domain.com
GOTRUE_URI_ALLOW_LIST=https://your-domain.com/*

# SMTP (optional)
GOTRUE_SMTP_HOST=smtp.example.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=your-smtp-user
GOTRUE_SMTP_PASS=your-smtp-password
GOTRUE_SMTP_SENDER_NAME=Cherry POS

# Storage
STORAGE_BACKEND=file
FILE_SIZE_LIMIT=52428800
```

### Edge Function Secrets

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

---

## Additional Notes

### Realtime Subscriptions

The following tables have realtime enabled:
- `orders`
- `order_items`
- `inventory_items`

### Storage Buckets

| Bucket | Public | Purpose |
|--------|--------|---------|
| `menu-images` | Yes | Menu item images |
| `avatars` | Yes | User profile pictures |

### Currency

Default currency is NGN (Nigerian Naira). Configure in `restaurant_settings` table.

### Timezone

Default timezone is `Africa/Lagos`. Configure in `restaurant_settings` table.

---

## Contact & Support

For deployment assistance or custom development, refer to the project documentation or contact the development team.

---

*Last Updated: December 2024*
*Version: 1.0.0*
