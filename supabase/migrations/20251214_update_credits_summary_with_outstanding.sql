-- ============================================================================
-- Update get_customer_credits_summary to include payments and outstanding
-- ============================================================================
-- This migration updates the credits summary function to include:
-- - total_payments: sum of all payments made
-- - outstanding_amount: total credits - total payments
-- 
-- Created: 2025-12-14
-- Purpose: Show outstanding amounts in Credits section
-- ============================================================================

DROP FUNCTION IF EXISTS get_customer_credits_summary(uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_customer_credits_summary(user_id uuid)
RETURNS TABLE (
  customer_id bigint,
  customer_name text,
  customer_phone text,
  total_credit_amount numeric,
  total_payments numeric,
  outstanding_amount numeric,
  credit_count bigint,
  latest_credit_date timestamp,
  status text
) AS $$
SELECT
  c.id,
  c.name,
  c.phone,
  COALESCE(SUM(cr.amount), 0)::numeric as total_credit_amount,
  COALESCE(SUM(p.total_paid), 0)::numeric as total_payments,
  (COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.total_paid), 0))::numeric as outstanding_amount,
  COUNT(DISTINCT cr.id)::bigint as credit_count,
  MAX(cr.created_at) as latest_credit_date,
  CASE
    WHEN MAX(cr.status) = 'defaulter' THEN 'defaulter'
    WHEN MAX(cr.status) = 'pending' THEN 'pending'
    WHEN MAX(cr.status) = 'partial' THEN 'partial'
    ELSE COALESCE(MAX(cr.status), 'pending')
  END::text as status
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id AND cr.issued_by = user_id
LEFT JOIN (
  SELECT credit_id, SUM(amount) as total_paid
  FROM payments
  GROUP BY credit_id
) p ON p.credit_id = cr.id
WHERE c.created_by = user_id
GROUP BY c.id, c.name, c.phone
HAVING (COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(p.total_paid), 0)) > 0
ORDER BY MAX(cr.created_at) DESC;
$$ LANGUAGE sql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_customer_credits_summary(uuid) TO authenticated;

-- Also update get_customer_credit_history to include payments for each credit
DROP FUNCTION IF EXISTS get_customer_credit_history(bigint, uuid) CASCADE;

CREATE OR REPLACE FUNCTION get_customer_credit_history(customer_id bigint, user_id uuid)
RETURNS TABLE (
  id bigint,
  amount numeric,
  total_paid numeric,
  outstanding numeric,
  description text,
  status text,
  created_at timestamp
) AS $$
SELECT
  cr.id,
  cr.amount,
  COALESCE(SUM(p.amount), 0)::numeric as total_paid,
  (cr.amount - COALESCE(SUM(p.amount), 0))::numeric as outstanding,
  cr.description,
  cr.status,
  cr.created_at
FROM credits cr
LEFT JOIN payments p ON p.credit_id = cr.id
WHERE cr.customer_id = $1 AND cr.issued_by = $2
GROUP BY cr.id, cr.amount, cr.description, cr.status, cr.created_at
ORDER BY cr.created_at DESC;
$$ LANGUAGE sql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_customer_credit_history(bigint, uuid) TO authenticated;

-- ============================================================================
-- Fix get_customer_transactions function to correctly aggregate payments
-- ============================================================================
-- The original function had an issue with duplicate payments being counted
-- when customers had multiple credits. This fix uses a subquery approach.

DROP FUNCTION IF EXISTS get_customer_transactions(uuid) CASCADE;

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
  COALESCE(credit_totals.total_credit, 0)::numeric as total_credit,
  COALESCE(credit_totals.total_payments, 0)::numeric as total_payments,
  (COALESCE(credit_totals.total_credit, 0) - COALESCE(credit_totals.total_payments, 0))::numeric as outstanding,
  CASE
    WHEN credit_totals.has_defaulter THEN 'defaulter'
    WHEN COALESCE(credit_totals.total_payments, 0) = 0 AND COALESCE(credit_totals.total_credit, 0) > 0 THEN 'pending'
    WHEN COALESCE(credit_totals.total_payments, 0) > 0 AND COALESCE(credit_totals.total_payments, 0) < COALESCE(credit_totals.total_credit, 0) THEN 'partial'
    WHEN COALESCE(credit_totals.total_payments, 0) >= COALESCE(credit_totals.total_credit, 0) THEN 'paid'
    ELSE 'paid'
  END::text as status,
  c.created_at
FROM customers c
LEFT JOIN (
  SELECT 
    cr.customer_id,
    SUM(cr.amount) as total_credit,
    SUM(COALESCE(p.payment_total, 0)) as total_payments,
    BOOL_OR(cr.status = 'defaulter') as has_defaulter
  FROM credits cr
  LEFT JOIN (
    SELECT credit_id, SUM(amount) as payment_total
    FROM payments
    GROUP BY credit_id
  ) p ON p.credit_id = cr.id
  WHERE cr.issued_by = user_id
  GROUP BY cr.customer_id
) credit_totals ON credit_totals.customer_id = c.id
WHERE c.created_by = user_id
GROUP BY c.id, c.name, c.phone, c.address, c.id_proof, c.created_at, 
         credit_totals.total_credit, credit_totals.total_payments, credit_totals.has_defaulter
ORDER BY c.created_at DESC;
$$ LANGUAGE sql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_customer_transactions(uuid) TO authenticated;
