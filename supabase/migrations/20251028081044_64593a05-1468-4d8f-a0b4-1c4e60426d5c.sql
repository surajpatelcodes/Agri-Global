-- ============================================
-- Fix 1: Implement Proper Role-Based Access Control
-- ============================================

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'shop_owner', 'user');

-- Create dedicated user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_at timestamp with time zone DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "users_can_view_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Only admins can manage roles
CREATE POLICY "admins_can_manage_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Create security definer function to check roles safely
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Migrate existing admin users from profiles to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM public.profiles
WHERE is_admin = true
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- Fix 2: Implement Privacy-Preserving Credit Checking
-- ============================================

-- Create audit log table for credit checks
CREATE TABLE public.credit_check_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_by uuid REFERENCES auth.users(id) NOT NULL,
  checked_aadhar text NOT NULL,
  checked_at timestamp with time zone DEFAULT now(),
  shop_id uuid REFERENCES public.profiles(id)
);

-- Enable RLS on credit check logs
ALTER TABLE public.credit_check_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own check history
CREATE POLICY "users_view_own_checks"
ON public.credit_check_logs
FOR SELECT
TO authenticated
USING (checked_by = auth.uid());

-- Policy: Only authenticated users can log checks
CREATE POLICY "authenticated_log_checks"
ON public.credit_check_logs
FOR INSERT
TO authenticated
WITH CHECK (checked_by = auth.uid());

-- Create privacy-preserving credit check function
CREATE OR REPLACE FUNCTION public.check_customer_credit_status(
  _aadhar_number text
)
RETURNS TABLE(
  customer_name text,
  has_credit boolean,
  is_defaulter boolean,
  outstanding_range text,
  total_shops integer,
  risk_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_id bigint;
  _customer_name text;
  _total_outstanding numeric;
  _total_shops integer;
BEGIN
  -- Log this credit check for audit trail
  INSERT INTO public.credit_check_logs (checked_by, checked_aadhar, shop_id)
  VALUES (
    auth.uid(),
    _aadhar_number,
    (SELECT id FROM public.profiles WHERE id = auth.uid())
  );

  -- Find customer by Aadhar
  SELECT id, name INTO _customer_id, _customer_name
  FROM public.customers
  WHERE id_proof = _aadhar_number
  LIMIT 1;

  -- If customer not found, return safe defaults
  IF _customer_id IS NULL THEN
    RETURN QUERY SELECT
      'Unknown'::text,
      false::boolean,
      false::boolean,
      'No Credit History'::text,
      0::integer,
      'Unknown'::text;
    RETURN;
  END IF;

  -- Calculate total outstanding across all shops
  SELECT 
    COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.amount), 0),
    COUNT(DISTINCT cr.issued_by)
  INTO _total_outstanding, _total_shops
  FROM public.credits cr
  LEFT JOIN public.payments p ON p.credit_id = cr.id
  WHERE cr.customer_id = _customer_id;

  -- Return privacy-preserving summary
  RETURN QUERY SELECT
    _customer_name::text as customer_name,
    (_total_outstanding > 0)::boolean as has_credit,
    (_total_outstanding > 10000)::boolean as is_defaulter,
    CASE
      WHEN _total_outstanding = 0 THEN 'No Outstanding'
      WHEN _total_outstanding <= 5000 THEN 'Low (< ₹5,000)'
      WHEN _total_outstanding <= 25000 THEN 'Medium (₹5,000 - ₹25,000)'
      WHEN _total_outstanding <= 100000 THEN 'High (₹25,000 - ₹1,00,000)'
      ELSE 'Very High (> ₹1,00,000)'
    END::text as outstanding_range,
    _total_shops::integer as total_shops,
    CASE
      WHEN _total_outstanding = 0 THEN 'No Risk'
      WHEN _total_outstanding <= 5000 THEN 'Low Risk'
      WHEN _total_outstanding <= 25000 THEN 'Medium Risk'
      WHEN _total_outstanding <= 100000 THEN 'High Risk'
      ELSE 'Very High Risk'
    END::text as risk_level;
END;
$$;

-- Update RLS policies to use has_role function instead of profiles.is_admin

-- Update customers policies
DROP POLICY IF EXISTS "customers_delete_owner_or_admin" ON public.customers;
CREATE POLICY "customers_delete_owner_or_admin"
ON public.customers
FOR DELETE
TO authenticated
USING (
  (created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "customers_manage_owner_or_admin" ON public.customers;
CREATE POLICY "customers_manage_owner_or_admin"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

-- Restrict cross-shop SELECT to only return masked data for other shops
DROP POLICY IF EXISTS "customers_select_cross_shop" ON public.customers;
CREATE POLICY "customers_select_own_or_masked"
ON public.customers
FOR SELECT
TO authenticated
USING (
  -- Users can see full details of their own customers
  created_by = auth.uid() 
  -- OR they're an admin who can see everything
  OR public.has_role(auth.uid(), 'admin')
  -- Note: Cross-shop queries should now use check_customer_credit_status() function
);

-- Update credits policies
DROP POLICY IF EXISTS "credits_delete_issuer_or_admin" ON public.credits;
CREATE POLICY "credits_delete_issuer_or_admin"
ON public.credits
FOR DELETE
TO authenticated
USING (
  (issued_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "credits_insert_issuer_or_admin" ON public.credits;
CREATE POLICY "credits_insert_issuer_or_admin"
ON public.credits
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL) AND (
    (issued_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
  )
);

DROP POLICY IF EXISTS "credits_manage_issuer_or_admin" ON public.credits;
CREATE POLICY "credits_manage_issuer_or_admin"
ON public.credits
FOR UPDATE
TO authenticated
USING (
  (issued_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (issued_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

-- Restrict cross-shop SELECT on credits
DROP POLICY IF EXISTS "credits_select_cross_shop" ON public.credits;
CREATE POLICY "credits_select_own"
ON public.credits
FOR SELECT
TO authenticated
USING (
  -- Users can only see credits they issued
  issued_by = auth.uid()
  -- OR they're an admin
  OR public.has_role(auth.uid(), 'admin')
);

-- Update payments policies
DROP POLICY IF EXISTS "payments_delete_owner_or_admin" ON public.payments;
CREATE POLICY "payments_delete_owner_or_admin"
ON public.payments
FOR DELETE
TO authenticated
USING (
  (created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "payments_manage_owner_or_admin" ON public.payments;
CREATE POLICY "payments_manage_owner_or_admin"
ON public.payments
FOR UPDATE
TO authenticated
USING (
  (created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (created_by = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);

-- Restrict cross-shop SELECT on payments
DROP POLICY IF EXISTS "payments_select_cross_shop" ON public.payments;
CREATE POLICY "payments_select_own"
ON public.payments
FOR SELECT
TO authenticated
USING (
  -- Users can only see payments they created
  created_by = auth.uid()
  -- OR payments for credits they issued (to track their credits)
  OR EXISTS (
    SELECT 1 FROM public.credits c
    WHERE c.id = payments.credit_id AND c.issued_by = auth.uid()
  )
  -- OR they're an admin
  OR public.has_role(auth.uid(), 'admin')
);

-- Grant execute permission on the credit check function
GRANT EXECUTE ON FUNCTION public.check_customer_credit_status TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role TO authenticated;