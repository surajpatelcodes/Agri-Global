-- ============================================================================
-- Phase 3: Enable Multi-Shop Customers (Main Fix Without Breaking UI)
-- ============================================================================

-- Remove Aadhar uniqueness constraints from customers table
-- This allows multiple shops to add customers with the same Aadhar number
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_aadhaar_unique;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_id_proof_unique;
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_id_proof_key;

-- Note: Customer creation logic will be updated in the application code
-- to lookup/create global_customers and link via global_customer_id

-- Verification: Check that constraints were removed
SELECT
  'Constraints Check' as info,
  conname as constraint_name,
  contype as constraint_type
FROM pg_constraint
WHERE conrelid = 'public.customers'::regclass
  AND conname LIKE '%aadhar%'
  OR conname LIKE '%id_proof%'
ORDER BY conname;
