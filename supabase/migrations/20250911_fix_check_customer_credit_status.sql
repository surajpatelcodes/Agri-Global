-- ============================================================================
-- Fix: Update check_customer_credit_status function to include customer name
-- ============================================================================

-- Drop the old function first
DROP FUNCTION IF EXISTS public.check_customer_credit_status(text) CASCADE;

-- Create the updated function with customer_name in return
CREATE OR REPLACE FUNCTION public.check_customer_credit_status(
  _aadhar_number text
)
RETURNS TABLE(
  customer_name text,
  has_credit boolean,
  is_defaulter boolean,
  outstanding_range text,
  total_shops integer,
  risk_level text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _customer_id bigint;
  _customer_name text;
  _total_outstanding numeric;
  _total_shops integer;
BEGIN
  -- Log this credit check for audit trail
  INSERT INTO public.credit_check_logs (checked_by, checked_aadhar, shop_id)
  VALUES (
    auth.uid(),
    _aadhar_number,
    (SELECT id FROM public.profiles WHERE id = auth.uid())
  );

  -- Find customer by Aadhar
  SELECT id, name INTO _customer_id, _customer_name
  FROM public.customers
  WHERE id_proof = _aadhar_number
  LIMIT 1;

  -- If customer not found, return safe defaults
  IF _customer_id IS NULL THEN
    RETURN QUERY SELECT
      'Unknown'::text,
      false::boolean,
      false::boolean,
      'No Credit History'::text,
      0::integer,
      'Unknown'::text;
    RETURN;
  END IF;

  -- Calculate total outstanding across all shops (properly grouping by credit)
  SELECT 
    COALESCE(SUM(total_credit), 0) - COALESCE(SUM(total_paid), 0),
    COUNT(DISTINCT shop_id)
  INTO _total_outstanding, _total_shops
  FROM (
    SELECT
      cr.id as credit_id,
      cr.issued_by as shop_id,
      cr.amount as total_credit,
      COALESCE(SUM(p.amount), 0) as total_paid
    FROM public.credits cr
    LEFT JOIN public.payments p ON p.credit_id = cr.id
    WHERE cr.customer_id = _customer_id
    GROUP BY cr.id, cr.issued_by, cr.amount
  ) credit_summary;

  -- Return privacy-preserving summary
  RETURN QUERY SELECT
    _customer_name::text as customer_name,
    (_total_outstanding > 0)::boolean as has_credit,
    (_total_outstanding > 10000)::boolean as is_defaulter,
    CASE
      WHEN _total_outstanding = 0 THEN 'No Outstanding'
      WHEN _total_outstanding <= 5000 THEN 'Low (< ₹5,000)'
      WHEN _total_outstanding <= 25000 THEN 'Medium (₹5,000 - ₹25,000)'
      WHEN _total_outstanding <= 100000 THEN 'High (₹25,000 - ₹1,00,000)'
      ELSE 'Very High (> ₹1,00,000)'
    END::text as outstanding_range,
    _total_shops::integer as total_shops,
    CASE
      WHEN _total_outstanding = 0 THEN 'No Risk'
      WHEN _total_outstanding <= 5000 THEN 'Low Risk'
      WHEN _total_outstanding <= 25000 THEN 'Medium Risk'
      WHEN _total_outstanding <= 100000 THEN 'High Risk'
      ELSE 'Very High Risk'
    END::text as risk_level;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_customer_credit_status(text) TO authenticated;
