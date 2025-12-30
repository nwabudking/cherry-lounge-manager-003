-- Create a security definer function to check if super_admin exists
-- This allows unauthenticated users to check setup status without RLS restrictions
CREATE OR REPLACE FUNCTION public.check_super_admin_exists()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE role = 'super_admin'
  )
$$;

-- Grant execute to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.check_super_admin_exists() TO anon;
GRANT EXECUTE ON FUNCTION public.check_super_admin_exists() TO authenticated;