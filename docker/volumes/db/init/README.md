# Database Initialization Files

This folder contains SQL files that are automatically executed when the PostgreSQL container starts for the first time.

## File Execution Order

Files are executed in alphabetical order:

1. `00-initial-schema.sql` - Creates all tables, functions, triggers, and RLS policies
2. `01-seed-data.sql` - Creates the default super admin user
3. `02-data-dump.sql` - Contains production data exported from the live system

## How to Get Complete Data Dump from Live System

1. **Login as Super Admin** in the live Cherry POS application
2. **Navigate to Settings → Data Import**
3. **Click "Download SQL Dump"** - This exports ALL data from ALL tables:
   - restaurant_settings
   - suppliers
   - menu_categories
   - inventory_items
   - menu_items
   - customers
   - orders
   - order_items
   - payments
   - stock_movements
   - profiles
   - user_roles

4. **Replace `02-data-dump.sql`** with the downloaded file content

## What the Export Contains

The SQL dump generates **UPSERT statements** for each record:
```sql
INSERT INTO public.table_name (...) VALUES (...)
ON CONFLICT (id) DO UPDATE SET ...;
```

This means:
- ✅ **New records** are inserted
- ✅ **Existing records** are updated with new values
- ✅ **No duplicates** are created

## Importing to Offline System

### Option 1: Fresh Start (Recommended)
1. Stop all containers: `docker compose down -v`
2. Replace `02-data-dump.sql` with your exported file
3. Start containers: `docker compose up -d`
4. The data loads automatically on first boot

### Option 2: Update Running System
If the database is already running, you can run the SQL directly:
```bash
# Connect to the database container
docker exec -i cherry-db psql -U postgres -d postgres < docker/volumes/db/init/02-data-dump.sql
```

## Important Notes

- **User profiles and roles** require users to exist in `auth.users` first
- The seed file creates the default super admin user
- For additional users, either:
  1. Create them via the app's staff management
  2. Add them to `01-seed-data.sql` before first boot

## Verify Data After Import

Connect to the database to verify:
```bash
docker exec -it cherry-db psql -U postgres -d postgres -c "
SELECT 
  (SELECT COUNT(*) FROM menu_categories) as categories,
  (SELECT COUNT(*) FROM menu_items) as menu_items,
  (SELECT COUNT(*) FROM inventory_items) as inventory,
  (SELECT COUNT(*) FROM orders) as orders;
"
```
