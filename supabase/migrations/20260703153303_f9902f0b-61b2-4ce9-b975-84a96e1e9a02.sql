
CREATE OR REPLACE FUNCTION public.global_search(p_aadhar_no text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  global_customer_record record;
  shop_profiles_json json;
  defaulter_transactions_json json;
  result json;
  has_defaulter_status boolean;
  total_outstanding numeric;
BEGIN
  SELECT * INTO global_customer_record
  FROM global_customers
  WHERE global_customers.aadhar_no = p_aadhar_no;

  IF global_customer_record.id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM credits cr
    JOIN customers c ON cr.customer_id = c.id
    WHERE c.global_customer_id = global_customer_record.id
      AND cr.status = 'defaulter'
  ) INTO has_defaulter_status;

  -- Total outstanding across all shops (credits minus payments)
  SELECT COALESCE(SUM(cr.amount),0) - COALESCE(SUM(pt.total_paid),0)
    INTO total_outstanding
  FROM customers c
  LEFT JOIN credits cr ON cr.customer_id = c.id
  LEFT JOIN (
    SELECT credit_id, SUM(amount) as total_paid FROM payments GROUP BY credit_id
  ) pt ON pt.credit_id = cr.id
  WHERE c.global_customer_id = global_customer_record.id;

  IF NOT has_defaulter_status THEN
    RETURN json_build_object(
      'status', 'no_defaulter',
      'aadhar_no', p_aadhar_no,
      'total_outstanding', COALESCE(total_outstanding, 0),
      'global_customer', row_to_json(global_customer_record)
    );
  END IF;

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
            'id', p.id,
            'amount', p.amount,
            'created_at', p.created_at
          ) ORDER BY p.created_at DESC
        ) as payments
      FROM payments p
      GROUP BY p.credit_id
    ) payment_summary ON payment_summary.credit_id = cr.id
    WHERE c.global_customer_id = global_customer_record.id
      AND cr.status = 'defaulter'
  ) dt;

  RETURN json_build_object(
    'status', 'defaulter',
    'global_customer', row_to_json(global_customer_record),
    'shop_profiles', COALESCE(shop_profiles_json, '[]'::json),
    'defaulter_transactions', defaulter_transactions_json,
    'total_outstanding', COALESCE(total_outstanding, 0)
  );
END;
$function$;
