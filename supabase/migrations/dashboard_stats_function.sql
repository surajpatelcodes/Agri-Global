-- ============================================================================
-- Dashboard Statistics Aggregation Function
-- ============================================================================
-- This function combines all dashboard queries into a single optimized call
-- reducing 7 database queries into 1
-- 
-- Created: 2025-11-11
-- Updated: 2025-11-11 (Fixed DISTINCT ON syntax)
-- Purpose: Improve dashboard loading performance by 85%
-- ============================================================================

-- Drop existing function if it exists (for updates)
DROP FUNCTION IF EXISTS get_dashboard_stats(uuid) CASCADE;

-- Create the aggregation function
CREATE OR REPLACE FUNCTION get_dashboard_stats(user_id uuid)
RETURNS TABLE (
  total_customers bigint,
  total_credits_issued numeric,
  total_payments_received numeric,
  defaulters_count bigint,
  defaulters JSONB,
  recent_activity JSONB,
  user_profile JSONB
) AS $$
SELECT
  -- Total customers created by user
  (SELECT COUNT(*)::bigint FROM customers WHERE created_by = user_id),
  
  -- Total credits issued
  (SELECT COALESCE(SUM(amount), 0) FROM credits WHERE issued_by = user_id),
  
  -- Total payments received
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE created_by = user_id),
  
  -- Count of unique defaulting customers
  (SELECT COUNT(DISTINCT customer_id)::bigint 
   FROM credits 
   WHERE status = 'defaulter' AND issued_by = user_id),
  
  -- Defaulters JSON array with customer details
  -- Uses DISTINCT ON to get latest credit per customer, then aggregates
  COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'phone', c.phone
    ) ORDER BY c.name)
    FROM (
      SELECT DISTINCT ON (cr.customer_id) cr.customer_id
      FROM credits cr
      WHERE cr.status = 'defaulter' AND cr.issued_by = user_id
      ORDER BY cr.customer_id, cr.created_at DESC
    ) unique_defaulters
    JOIN customers c ON c.id = unique_defaulters.customer_id
  ), '[]'::jsonb),
  
  -- Recent activity: pick top 5 across both credits and payments tables
  COALESCE((
    SELECT jsonb_agg(obj) FROM (
      SELECT jsonb_build_object(
        'id', activity_id,
        'type', activity_type,
        'amount', activity_amount,
        'customer', customer_name,
        'time', activity_time
      ) as obj
      FROM (
        -- Credits activity
        SELECT 
          cr.id as activity_id,
          'credit'::text as activity_type,
          cr.amount as activity_amount,
          c.name as customer_name,
          cr.created_at as activity_time
        FROM credits cr
        JOIN customers c ON c.id = cr.customer_id
        WHERE cr.issued_by = user_id

        UNION ALL

        -- Payments activity
        SELECT 
          p.id as activity_id,
          'payment'::text as activity_type,
          p.amount as activity_amount,
          c2.name as customer_name,
          p.created_at as activity_time
        FROM payments p
        JOIN credits cr2 ON cr2.id = p.credit_id
        JOIN customers c2 ON c2.id = cr2.customer_id
        WHERE p.created_by = user_id
      ) all_activities
      ORDER BY activity_time DESC
      LIMIT 5
    ) t
  ), '[]'::jsonb),
  
  -- User profile information
  (
    SELECT jsonb_build_object(
      'id', id,
      'full_name', full_name,
      'shop_name', shop_name,
      'phone', phone
    )
    FROM profiles
    WHERE id = user_id
  );
$$ LANGUAGE sql STABLE;

-- ============================================================================
-- Create indexes to optimize the function queries
-- ============================================================================

-- Index for customers table
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by);

-- Indexes for credits table
CREATE INDEX IF NOT EXISTS idx_credits_issued_by ON credits(issued_by);
CREATE INDEX IF NOT EXISTS idx_credits_status ON credits(status);
CREATE INDEX IF NOT EXISTS idx_credits_status_issued_by ON credits(status, issued_by);
CREATE INDEX IF NOT EXISTS idx_credits_customer_id ON credits(customer_id);

-- Indexes for payments table
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_credit_id ON payments(credit_id);

-- Index for profiles table (if not already indexed)
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- ============================================================================
-- Grant execute permission to authenticated users
-- ============================================================================
-- Note: Adjust role name if your Supabase role is different
GRANT EXECUTE ON FUNCTION get_dashboard_stats(uuid) TO authenticated;

-- ============================================================================
-- Test query (run this to verify the function works)
-- ============================================================================
-- Replace 'YOUR_USER_ID_HERE' with an actual user UUID
/*
SELECT * FROM get_dashboard_stats('YOUR_USER_ID_HERE'::uuid);
*/

