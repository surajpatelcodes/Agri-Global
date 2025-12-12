-- ROLLBACK SCRIPT - Reverts to old permissive RLS policies
-- Use this if you need to undo the security migration
-- Created: 2025-12-11

-- ============================================================================
-- ROLLBACK: Restore Old Permissive Policies
-- ============================================================================

-- Drop new secure policies
DROP POLICY IF EXISTS "credits_balanced_select" ON public.credits;
DROP POLICY IF EXISTS "credits_update_own" ON public.credits;
DROP POLICY IF EXISTS "credits_insert_own" ON public.credits;
DROP POLICY IF EXISTS "credits_delete_own" ON public.credits;

DROP POLICY IF EXISTS "customers_balanced_select" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;

DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
DROP POLICY IF EXISTS "payments_update_own" ON public.payments;
DROP POLICY IF EXISTS "payments_insert_own" ON public.payments;
DROP POLICY IF EXISTS "payments_delete_own" ON public.payments;

DROP POLICY IF EXISTS "global_customers_view_defaulters" ON public.global_customers;

-- Restore old permissive cross-shop policies (WARNING: Less secure!)
CREATE POLICY "credits_select_cross_shop" ON public.credits
FOR SELECT USING (true);

CREATE POLICY "customers_select_cross_shop" ON public.customers
FOR SELECT USING (true);

CREATE POLICY "payments_select_cross_shop" ON public.payments
FOR SELECT USING (true);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- After rollback, test:
-- SELECT * FROM credits;  -- Should show ALL credits from ALL shops
-- SELECT * FROM customers;  -- Should show ALL customers from ALL shops

-- Note: This rollback restores the INSECURE state
-- Only use temporarily for testing if needed
