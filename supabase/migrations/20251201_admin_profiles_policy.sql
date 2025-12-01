-- Allow admins to view all profiles
-- This ensures the admin dashboard can count all users correctly

DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON public.profiles;

CREATE POLICY "admins_can_view_all_profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update profiles (useful for user management)
DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON public.profiles;

CREATE POLICY "admins_can_update_all_profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);
