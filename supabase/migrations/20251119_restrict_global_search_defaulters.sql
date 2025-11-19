-- ============================================================================
-- Fix: Restrict Global Search to Defaulters Only
-- ============================================================================

-- Drop the function to ensure clean recreation
DROP FUNCTION IF EXISTS public.global_search(text);

-- Create the enhanced global search RPC function
CREATE OR REPLACE FUNCTION public.global_search(p_aadhar_no text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  global_customer_record record;
  shop_profiles_json json;
  defaulter_transactions_json json;
  defaulter_insights_json json;
  result json;
  has_defaulter_status boolean;
BEGIN
  -- Fetch global customer identity
  SELECT * INTO global_customer_record
  FROM global_customers
  WHERE global_customers.aadhar_no = p_aadhar_no;

  -- If no global customer found, return null (Frontend will show "No customer found")
  IF global_customer_record.id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Check if this global customer has ANY defaulter credits across any shop
  SELECT EXISTS (
    SELECT 1
    FROM credits cr
    JOIN customers c ON cr.customer_id = c.id
    WHERE c.global_customer_id = global_customer_record.id
      AND cr.status = 'defaulter'
  ) INTO has_defaulter_status;

  -- If customer exists but is NOT a defaulter, return specific status
  IF NOT has_defaulter_status THEN
    RETURN json_build_object(
      'status', 'no_defaulter',
      'aadhar_no', p_aadhar_no
    );
  END IF;

  -- If defaulter, proceed to fetch full details

  -- Fetch all shop-specific customer profiles (Only for shops where they are defaulter?)
  -- User said: "Only those types of customer should be showed there who is currently marked as defaulter"
  -- This implies we should probably only show the shop profiles where they are defaulters too, 
  -- OR show all profiles if they are a defaulter somewhere?
  -- Let's assume if they are a defaulter, we show the context (all profiles) or just the defaulter ones.
  -- Given the strictness, let's filter shop profiles to only those with defaulter credits or just show all if they are a defaulter generally.
  -- Let's keep showing all shop profiles if they are a defaulter anywhere, to give full context.
  
  SELECT json_agg(row_to_json(t))
  INTO shop_profiles_json
  FROM (
      SELECT
          c.id AS customer_id,
          c.created_by AS shop_id,
          COALESCE(p.shop_name, 'Unknown Shop') AS shop_name,
          c.name AS customer_name,
          c.phone AS customer_phone,
          c.address AS customer_address,
          EXISTS (
              SELECT 1
              FROM credits cr2
              WHERE cr2.customer_id = c.id
              AND cr2.status = 'defaulter'
          ) AS has_defaulter_credit,
          COALESCE(SUM(cr.amount), 0) AS total_credits,
          COALESCE(SUM(payment_totals.total_paid), 0) AS total_payments,
          COALESCE(SUM(cr.amount), 0) - COALESCE(SUM(payment_totals.total_paid), 0) AS outstanding
      FROM customers c
      LEFT JOIN profiles p ON p.id = c.created_by
      LEFT JOIN credits cr ON cr.customer_id = c.id
      LEFT JOIN (
          SELECT credit_id, SUM(amount) as total_paid
          FROM payments
          GROUP BY credit_id
      ) payment_totals ON payment_totals.credit_id = cr.id
      WHERE c.global_customer_id = global_customer_record.id
      GROUP BY c.id, c.created_by, p.shop_name, c.name, c.phone, c.address
  ) t;

  -- Fetch detailed defaulter transactions
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'credit_id', dt.credit_id,
        'shop_id', dt.shop_id,
        'shop_name', dt.shop_name,
        'customer_name', dt.customer_name,
        'amount', dt.amount,
        'issued_date', dt.created_at,
        'status', dt.status,
        'total_paid', dt.total_paid,
        'outstanding', dt.outstanding,
        'payments', dt.payments
      )
    ),
    '[]'::json
  )
  INTO defaulter_transactions_json
  FROM (
    SELECT 
      cr.id as credit_id,
      c.created_by as shop_id,
      COALESCE(p.shop_name, 'Unknown Shop') as shop_name,
      c.name as customer_name,
      cr.amount,
      cr.created_at,
      cr.status,
      COALESCE(payment_summary.total_paid, 0) as total_paid,
      cr.amount - COALESCE(payment_summary.total_paid, 0) as outstanding,
      payment_summary.payments
    FROM credits cr
    JOIN customers c ON cr.customer_id = c.id
    LEFT JOIN profiles p ON p.id = c.created_by
    LEFT JOIN (
      SELECT 
        p.credit_id,
        SUM(p.amount) as total_paid,
        json_agg(
          json_build_object(
            'payment_id', p.id,
            'amount', p.amount,
            'payment_date', p.created_at,
            'payment_method', p.payment_method
          )
          ORDER BY p.created_at DESC
        ) as payments
      FROM payments p
      GROUP BY p.credit_id
    ) payment_summary ON payment_summary.credit_id = cr.id
    WHERE c.global_customer_id = global_customer_record.id
      AND cr.status = 'defaulter'
  ) dt;

  -- Compute defaulter insights
  SELECT COALESCE(
    (
      SELECT json_build_object(
        'total_shops_marking_defaulter', COUNT(DISTINCT c.created_by),
        'total_overdue_credits', COUNT(DISTINCT cr.id),
        'total_outstanding_all_shops', COALESCE(SUM(cr.amount - COALESCE(payments.total_paid, 0)), 0),
        'days_since_last_repayment', (
          SELECT EXTRACT(EPOCH FROM (NOW() - MAX(p.created_at))) / 86400
          FROM payments p
          JOIN credits cr2 ON p.credit_id = cr2.id
          JOIN customers c2 ON cr2.customer_id = c2.id
          WHERE c2.global_customer_id = global_customer_record.id
        ),
        'number_of_default_events', COUNT(DISTINCT cr.id),
        'risk_level', CASE
          WHEN COUNT(DISTINCT c.created_by) >= 3 THEN 'high'
          WHEN COUNT(DISTINCT c.created_by) >= 2 THEN 'medium'
          WHEN COUNT(DISTINCT c.created_by) >= 1 THEN 'low'
          ELSE 'none'
        END,
        'last_default_date', MAX(cr.created_at)
      )
      FROM credits cr
      JOIN customers c ON cr.customer_id = c.id
      LEFT JOIN (
        SELECT credit_id, SUM(amount) as total_paid
        FROM payments
        GROUP BY credit_id
      ) payments ON payments.credit_id = cr.id
      WHERE c.global_customer_id = global_customer_record.id
        AND cr.status = 'defaulter'
    ),
    json_build_object(
      'total_shops_marking_defaulter', 0,
      'total_overdue_credits', 0,
      'total_outstanding_all_shops', 0,
      'days_since_last_repayment', NULL,
      'number_of_default_events', 0,
      'risk_level', 'none',
      'last_default_date', NULL
    )
  )
  INTO defaulter_insights_json;

  -- Build comprehensive result
  result := json_build_object(
    'status', 'found',
    'global_customer', json_build_object(
      'id', global_customer_record.id,
      'aadhar_no', global_customer_record.aadhar_no,
      'name', global_customer_record.name,
      'phone', global_customer_record.phone,
      'created_at', global_customer_record.created_at
    ),
    'shop_profiles', shop_profiles_json,
    'defaulter_transactions', defaulter_transactions_json,
    'defaulter_insights', defaulter_insights_json
  );

  RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.global_search(p_aadhar_no text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.global_search(p_aadhar_no text) TO anon;
