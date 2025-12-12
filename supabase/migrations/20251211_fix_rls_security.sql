-- Security Fix: Balanced RLS Policies
-- Users can see their own data + defaulters from other shops for global search
-- Created: 2025-12-11

-- ============================================================================
-- CREDITS TABLE
-- ============================================================================

-- Drop ALL existing policies (old and potentially conflicting ones)
DROP POLICY IF EXISTS "credits_select_cross_shop" ON public.credits;
DROP POLICY IF EXISTS "credits_select_all_shops" ON public.credits;
DROP POLICY IF EXISTS "credits_balanced_select" ON public.credits;
DROP POLICY IF EXISTS "credits_update_own" ON public.credits;
DROP POLICY IF EXISTS "credits_insert_own" ON public.credits;
DROP POLICY IF EXISTS "credits_delete_own" ON public.credits;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.credits;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.credits;

-- SELECT: Users can view their own credits OR defaulters from any shop
CREATE POLICY "credits_balanced_select" ON public.credits
FOR SELECT TO authenticated
USING (
  issued_by = auth.uid()  -- Own credits (all statuses)
  OR status = 'defaulter'  -- Defaulters from any shop (for global search)
);

-- UPDATE: Users can only update their own credits
CREATE POLICY "credits_update_own" ON public.credits
FOR UPDATE TO authenticated
USING (issued_by = auth.uid())
WITH CHECK (issued_by = auth.uid());

-- INSERT: Users can only insert their own credits
CREATE POLICY "credits_insert_own" ON public.credits
FOR INSERT TO authenticated
WITH CHECK (issued_by = auth.uid());

-- DELETE: Users can only delete their own credits
CREATE POLICY "credits_delete_own" ON public.credits
FOR DELETE TO authenticated
USING (issued_by = auth.uid());

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================

-- Drop ALL existing policies (old and potentially conflicting ones)
DROP POLICY IF EXISTS "customers_select_cross_shop" ON public.customers;
DROP POLICY IF EXISTS "customers_select_all_shops" ON public.customers;
DROP POLICY IF EXISTS "customers_balanced_select" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.customers;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.customers;

-- SELECT: Users can view their own customers OR customers who are defaulters
CREATE POLICY "customers_balanced_select" ON public.customers
FOR SELECT TO authenticated
USING (
  created_by = auth.uid()  -- Own customers
  OR EXISTS (  -- OR customers with defaulter credits (from any shop)
    SELECT 1 FROM public.credits
    WHERE credits.customer_id = customers.id
    AND credits.status = 'defaulter'
  )
);

-- UPDATE: Users can only update their own customers
CREATE POLICY "customers_update_own" ON public.customers
FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- INSERT: Users can only insert their own customers
CREATE POLICY "customers_insert_own" ON public.customers
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- DELETE: Users can only delete their own customers
CREATE POLICY "customers_delete_own" ON public.customers
FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================

-- Drop ALL existing policies on payments table (including any custom ones)
DROP POLICY IF EXISTS "payments_select_cross_shop" ON public.payments;
DROP POLICY IF EXISTS "payments_select_auth" ON public.payments;
DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "payments_update_own" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_own" ON public.payments;

-- SELECT: Users can only view their own payments (no cross-shop access needed)
CREATE POLICY "payments_select_own" ON public.payments
FOR SELECT TO authenticated
USING (created_by = auth.uid());

-- UPDATE: Users can only update their own payments
CREATE POLICY "payments_update_own" ON public.payments
FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- INSERT: Users can only insert their own payments
CREATE POLICY "payments_insert_own" ON public.payments
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- DELETE: Users can only delete their own payments
CREATE POLICY "payments_delete_own" ON public.payments
FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- ============================================================================
-- GLOBAL_CUSTOMERS TABLE
-- ============================================================================

-- Allow users to view global customers if they have defaulter credits
CREATE POLICY "global_customers_view_defaulters" ON public.global_customers
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.credits c
    JOIN public.customers cust ON c.customer_id = cust.id
    WHERE cust.global_customer_id = global_customers.id
    AND c.status = 'defaulter'
  )
  OR EXISTS (
    SELECT 1 FROM public.customers cust
    WHERE cust.global_customer_id = global_customers.id
    AND cust.created_by = auth.uid()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test queries to verify policies work correctly:
-- 
-- 1. See own data:
--    SELECT * FROM credits WHERE issued_by = auth.uid();
-- 
-- 2. See defaulters from all shops:
--    SELECT * FROM credits WHERE status = 'defaulter';
-- 
-- 3. Try to update another shop's credit (should fail):
--    UPDATE credits SET amount = 1000 WHERE issued_by != auth.uid();
--    Expected: No rows updated (RLS blocks it)
-- 
-- 4. Global search for defaulters:
--    SELECT c.*, cust.name, p.shop_name 
--    FROM credits c
--    JOIN customers cust ON c.customer_id = cust.id
--    JOIN profiles p ON cust.created_by = p.id
--    WHERE c.status = 'defaulter';
