-- ============================================================================
-- Fix Customer Fetching Issue
-- ============================================================================
-- This migration fixes the issue where newly added customers are not showing
-- in the customers tab due to RLS policy conflicts with the get_customer_transactions function
--
-- Created: 2025-01-17
-- Issue: Customers created by authenticated user not appearing in list
-- Root Cause: RLS policies interfering with function execution
-- ============================================================================

-- Drop the existing function to recreate it with proper security
DROP FUNCTION IF EXISTS get_customer_transactions(uuid) CASCADE;

-- ============================================================================
-- Updated Function: Get customer transactions with proper RLS handling
-- ============================================================================
-- This function now uses SECURITY DEFINER to bypass RLS and ensure
-- authenticated users can see their own customers
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
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_customer_transactions(uuid) TO authenticated;

-- ============================================================================
-- Test the function (replace with actual user ID)
-- ============================================================================
-- Run this query in Supabase SQL editor to test:
/*
SELECT * FROM get_customer_transactions('YOUR_USER_ID_HERE'::uuid);
*/

-- ============================================================================
-- Verify RLS policies are not interfering
-- ============================================================================
-- Check if customers table has proper RLS policies
-- This should show the policies for the customers table:
/*
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'customers';
*/

-- ============================================================================
-- Additional debugging queries
-- ============================================================================
-- Check if customers exist for the user:
/*
SELECT id, name, phone, created_by, created_at
FROM customers
WHERE created_by = 'YOUR_USER_ID_HERE'::uuid;
*/

-- Check RLS status:
/*
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'customers';
*/
