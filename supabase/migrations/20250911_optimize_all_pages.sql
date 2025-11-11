-- ============================================================================
-- Credits, Payments, Outstanding Pages Optimization Functions
-- ============================================================================
-- This migration optimizes the Credits, Payments, and Outstanding pages
-- by creating optimized aggregation functions
-- 
-- Created: 2025-11-11
-- Purpose: Reduce multiple queries into single optimized calls
-- ============================================================================

-- ============================================================================
-- Function 1: Get customer credits summary (Credits page)
-- ============================================================================
DROP FUNCTION IF EXISTS get_customer_credits_summary(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_customer_credits_summary(user_id uuid)
RETURNS TABLE (
  customer_id bigint,
  customer_name text,
  customer_phone text,
  total_credit_amount numeric,
  credit_count bigint,
  latest_credit_date timestamp,
  status text
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  COALESCE(SUM(cr.amount), 0)::numeric,
  COUNT(DISTINCT cr.id)::bigint,
  MAX(cr.created_at),
  CASE
    WHEN MAX(cr.status) = 'defaulter' THEN 'defaulter'
    WHEN MAX(cr.status) = 'pending' THEN 'pending'
    WHEN MAX(cr.status) = 'partial' THEN 'partial'
    ELSE COALESCE(MAX(cr.status), 'pending')
  END::text
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id
WHERE c.created_by = user_id AND cr.issued_by = user_id
GROUP BY c.id, c.name, c.phone
ORDER BY MAX(cr.created_at) DESC;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Function 2: Get all customers (for dropdown in Credits/Payments)
-- ============================================================================
DROP FUNCTION IF EXISTS get_all_customers(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_all_customers(user_id uuid)
RETURNS TABLE (
  id bigint,
  name text,
  phone text,
  id_proof text
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  c.id_proof
FROM customers c
WHERE c.created_by = user_id
ORDER BY c.name;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Function 2b: Get customers with credit (kept for backward compatibility)
-- ============================================================================
DROP FUNCTION IF EXISTS get_customers_with_credit(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_customers_with_credit(user_id uuid)
RETURNS TABLE (
  id bigint,
  name text,
  phone text,
  id_proof text
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  c.id_proof
FROM customers c
WHERE c.created_by = user_id
ORDER BY c.name;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Function 2c: Get customer credit history (for credit history dialog)
-- ============================================================================
DROP FUNCTION IF EXISTS get_customer_credit_history(bigint, uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_customer_credit_history(customer_id bigint, user_id uuid)
RETURNS TABLE (
  id bigint,
  amount numeric,
  description text,
  status text,
  created_at timestamp
) AS $$
SELECT
  cr.id,
  cr.amount,
  cr.description,
  cr.status,
  cr.created_at
FROM credits cr
WHERE cr.customer_id = $1 AND cr.issued_by = $2
ORDER BY cr.created_at DESC;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Function 2d: Get customers with pending/partial credits (for Payments form)
-- ============================================================================
DROP FUNCTION IF EXISTS get_customers_with_pending_credits(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_customers_with_pending_credits(user_id uuid)
RETURNS TABLE (
  id bigint,
  name text,
  phone text,
  id_proof text
) AS $$
SELECT DISTINCT
  c.id,
  c.name,
  c.phone,
  c.id_proof
FROM customers c
INNER JOIN credits cr ON cr.customer_id = c.id
WHERE c.created_by = user_id 
  AND cr.issued_by = user_id
  AND cr.status IN ('pending', 'partial')
ORDER BY c.name;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Function 3: Get outstanding summary (Outstanding page)
-- ============================================================================
DROP FUNCTION IF EXISTS get_outstanding_summary(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_outstanding_summary(user_id uuid)
RETURNS TABLE (
  customer_id bigint,
  name text,
  phone text,
  total_credit numeric,
  total_payments numeric,
  outstanding numeric
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  COALESCE(SUM(cr.amount), 0)::numeric,
  COALESCE(SUM(p.amount), 0)::numeric,
  (COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.amount), 0))::numeric as outstanding
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id AND cr.issued_by = user_id
LEFT JOIN payments p ON p.credit_id = cr.id
WHERE c.created_by = user_id
GROUP BY c.id, c.name, c.phone
HAVING (COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.amount), 0)) > 0
ORDER BY outstanding DESC;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Function 4: Get all payments with customer info (Payments page)
-- ============================================================================
DROP FUNCTION IF EXISTS get_all_payments_with_details(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_all_payments_with_details(user_id uuid)
RETURNS TABLE (
  id bigint,
  credit_id bigint,
  amount numeric,
  payment_date date,
  payment_method text,
  created_at timestamp,
  created_by uuid,
  customer_name text,
  customer_phone text,
  customer_id_proof text,
  credit_amount numeric,
  credit_description text
) AS $$
SELECT
  p.id,
  p.credit_id,
  p.amount,
  p.payment_date,
  p.payment_method,
  p.created_at,
  p.created_by,
  c.name,
  c.phone,
  c.id_proof,
  cr.amount,
  cr.description
FROM payments p
INNER JOIN credits cr ON cr.id = p.credit_id
INNER JOIN customers c ON c.id = cr.customer_id
WHERE p.created_by = user_id AND c.created_by = user_id
ORDER BY p.created_at DESC;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Create or update Performance Indexes
-- ============================================================================

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_id_proof ON customers(id_proof);

-- Credits indexes
CREATE INDEX IF NOT EXISTS idx_credits_customer_id ON credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_credits_issued_by ON credits(issued_by);
CREATE INDEX IF NOT EXISTS idx_credits_customer_issued_by ON credits(customer_id, issued_by);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_created_at ON credits(created_at DESC);

-- Payments indexes
CREATE INDEX IF NOT EXISTS idx_payments_credit_id ON payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ============================================================================
-- Grant execute permissions to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_customer_credits_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_with_credit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_customers(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customers_with_pending_credits(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_credit_history(bigint, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_outstanding_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_payments_with_details(uuid) TO authenticated;

-- ============================================================================
-- Test queries (run these to verify the functions work)
-- ============================================================================
/*
-- Test customer credits summary
SELECT * FROM get_customer_credits_summary('YOUR_USER_ID_HERE'::uuid);

-- Test customers with credit
SELECT * FROM get_customers_with_credit('YOUR_USER_ID_HERE'::uuid);

-- Test outstanding summary
SELECT * FROM get_outstanding_summary('YOUR_USER_ID_HERE'::uuid);

-- Test all payments
SELECT * FROM get_all_payments_with_details('YOUR_USER_ID_HERE'::uuid);
*/
