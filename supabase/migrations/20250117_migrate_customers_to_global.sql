-- ============================================================================
-- Phase 2: Migrate Existing Customers into Global Model (Safe Transition)
-- ============================================================================

-- Insert distinct customers into global_customers table
-- This creates one global entry per unique Aadhar number
INSERT INTO global_customers (aadhar_no, name, phone)
SELECT DISTINCT id_proof, name, phone
FROM customers
WHERE id_proof IS NOT NULL AND id_proof != ''
ON CONFLICT (aadhar_no) DO NOTHING;

-- Update existing customers to attach global_customer_id
-- Links each customer to their corresponding global customer record
UPDATE customers c
SET global_customer_id = (
  SELECT id FROM global_customers
  WHERE aadhar_no = c.id_proof
)
WHERE global_customer_id IS NULL
  AND id_proof IS NOT NULL
  AND id_proof != '';

-- Verification: Check that all customers now have a valid global_customer_id
-- This query should return 0 rows if migration was successful
SELECT COUNT(*) as customers_without_global_id
FROM customers
WHERE global_customer_id IS NULL
   OR id_proof IS NULL
   OR id_proof = '';

-- Optional: Show migration summary
SELECT
  'Migration Summary' as info,
  COUNT(*) as total_customers,
  COUNT(global_customer_id) as customers_with_global_id,
  COUNT(DISTINCT global_customer_id) as unique_global_customers
FROM customers;

-- Show global_customers table summary
SELECT
  'Global Customers Summary' as info,
  COUNT(*) as total_global_customers,
  COUNT(DISTINCT aadhar_no) as unique_aadhars
FROM global_customers;
