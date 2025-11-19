-- ============================================================================
-- Exclude Defaulter Customers from Issue Credit Form
-- ============================================================================
-- This migration updates the get_all_customers function to exclude customers
-- who have any credits with status = 'defaulter'. This prevents shops from
-- issuing new credits to defaulter customers until they are removed from
-- defaulter status.

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
  -- Exclude customers who have any credit with status 'defaulter'
  AND NOT EXISTS (
    SELECT 1
    FROM credits cr
    WHERE cr.customer_id = c.id
      AND cr.issued_by = user_id
      AND cr.status = 'defaulter'
  )
ORDER BY c.name;
$$ LANGUAGE sql STABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_customers(uuid) TO authenticated;
