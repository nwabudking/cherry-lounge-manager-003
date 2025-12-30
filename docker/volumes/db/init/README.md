# Database Initialization Files

These SQL files are executed in alphabetical order when the Docker container starts for the first time.

## Files

1. **00-initial-schema.sql** - Creates all tables, functions, triggers, and RLS policies
2. **01-seed-data.sql** - Sample/demo data for testing
3. **02-data-dump.sql** - Production data export (partial sample)

## Getting Complete Data

The `02-data-dump.sql` file contains only a sample of the production data. To get the complete current data:

### Option 1: Use the App Export Feature
1. Log in to the app as super_admin
2. Navigate to Data Management (/data-import)
3. Click "Download SQL Dump"
4. Save the file as `02-data-dump.sql` in this folder

### Option 2: Replace with your own data
After running the schema, you can manually import your data using psql or any PostgreSQL client.

## Creating the First Super Admin

After importing the schema, you need to create a super_admin user:

```sql
-- 1. First, create a user in auth.users (this is done via Supabase Auth)
-- If you're using local Supabase, you can use the Supabase Studio UI

-- 2. After the user is created, update their role to super_admin:
UPDATE public.user_roles 
SET role = 'super_admin' 
WHERE user_id = 'your-user-uuid-here';
```

Or use the app's initial setup flow - if no super_admin exists, the auth page will show the setup form.

## File Execution Order

Files are executed alphabetically:
- `00-*` runs first (schema)
- `01-*` runs second (seed data)
- `02-*` runs third (production data)

Make sure file names maintain this order!
