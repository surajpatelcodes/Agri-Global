-- Fix infinite recursion in user_roles policy
-- The previous policy caused recursion because it queried user_roles to check permissions on user_roles

DROP POLICY IF EXISTS "admins_can_manage_roles" ON public.user_roles;

CREATE POLICY "admins_can_manage_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
);
