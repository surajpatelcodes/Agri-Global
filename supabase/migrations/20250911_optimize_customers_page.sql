-- ============================================================================
-- Customers Page Optimization Functions
-- ============================================================================
-- This migration optimizes the Customers page by combining multiple queries
-- into a single aggregated database function
-- 
-- Created: 2025-11-11
-- Purpose: Reduce 2+ queries into 1, enable caching, improve performance
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_customer_transactions(uuid) CASCADE;

-- ============================================================================
-- Main Function: Get all customer transactions with summary
-- ============================================================================
-- Returns all customers created by user with their transaction summaries
-- in a single optimized query
CREATE OR REPLACE FUNCTION get_customer_transactions(user_id uuid)
RETURNS TABLE (
  id bigint,
  name text,
  phone text,
  address text,
  id_proof text,
  total_credit numeric,
  total_payments numeric,
  outstanding numeric,
  status text,
  created_at timestamp
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  c.address,
  c.id_proof,
  COALESCE(SUM(cr.amount), 0)::numeric as total_credit,
  COALESCE(SUM(p.amount), 0)::numeric as total_payments,
  (COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.amount), 0))::numeric as outstanding,
  CASE
    WHEN MAX(cr.status) = 'defaulter' THEN 'defaulter'
    WHEN COALESCE(SUM(p.amount), 0) = 0 AND COALESCE(SUM(cr.amount), 0) > 0 THEN 'pending'
    WHEN COALESCE(SUM(p.amount), 0) > 0 AND COALESCE(SUM(p.amount), 0) < COALESCE(SUM(cr.amount), 0) THEN 'partial'
    WHEN COALESCE(SUM(p.amount), 0) >= COALESCE(SUM(cr.amount), 0) THEN 'paid'
    ELSE 'paid'
  END::text as status,
  c.created_at
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id
LEFT JOIN payments p ON p.credit_id = cr.id
WHERE c.created_by = user_id
GROUP BY c.id, c.name, c.phone, c.address, c.id_proof, c.created_at
ORDER BY c.created_at DESC;
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Create Performance Indexes
-- ============================================================================

-- Index for customers table (created_by is most frequently filtered)
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

-- Indexes for credits table (customer_id and issued_by are frequently used)
CREATE INDEX IF NOT EXISTS idx_credits_customer_id ON credits(customer_id);
CREATE INDEX IF NOT EXISTS idx_credits_issued_by ON credits(issued_by);
CREATE INDEX IF NOT EXISTS idx_credits_customer_issued_by ON credits(customer_id, issued_by);

-- Indexes for payments table (credit_id is frequently joined)
CREATE INDEX IF NOT EXISTS idx_payments_credit_id ON payments(credit_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_customer_transactions(uuid) TO authenticated;

-- ============================================================================
-- Test query (run this to verify the function works)
-- ============================================================================
-- Replace 'YOUR_USER_ID_HERE' with an actual user UUID
/*
SELECT * FROM get_customer_transactions('YOUR_USER_ID_HERE'::uuid);
*/
