-- ============================================================================
-- Function: Mark Credit as Paid
-- ============================================================================
-- This function handles the logic to mark a specific credit as fully paid.
-- It calculates the remaining outstanding amount, inserts a payment record
-- for that amount, and updates the credit status to 'paid'.

DROP FUNCTION IF EXISTS mark_credit_as_paid(bigint, uuid);

CREATE OR REPLACE FUNCTION mark_credit_as_paid(p_credit_id bigint, p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_credit_amount numeric;
  v_total_paid numeric;
  v_remaining_amount numeric;
  v_payment_id bigint;
BEGIN
  -- Get credit details and verify ownership
  SELECT amount INTO v_credit_amount
  FROM credits
  WHERE id = p_credit_id AND issued_by = p_user_id;

  IF v_credit_amount IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Credit not found or access denied');
  END IF;

  -- Calculate total paid so far
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM payments
  WHERE credit_id = p_credit_id;

  -- Calculate remaining amount
  v_remaining_amount := v_credit_amount - v_total_paid;

  -- If already fully paid, just update status (edge case)
  IF v_remaining_amount <= 0 THEN
    UPDATE credits
    SET status = 'paid'
    WHERE id = p_credit_id;
    
    RETURN json_build_object('success', true, 'message', 'Credit was already fully paid, status updated');
  END IF;

  -- Insert payment for the remaining amount
  INSERT INTO payments (credit_id, amount, payment_date, payment_method, created_by)
  VALUES (p_credit_id, v_remaining_amount, CURRENT_DATE, 'cash', p_user_id)
  RETURNING id INTO v_payment_id;

  -- Update credit status to paid
  UPDATE credits
  SET status = 'paid'
  WHERE id = p_credit_id;

  RETURN json_build_object('success', true, 'message', 'Credit marked as paid successfully', 'payment_id', v_payment_id, 'amount_paid', v_remaining_amount);

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_credit_as_paid(bigint, uuid) TO authenticated;
