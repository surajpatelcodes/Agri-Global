-- Pin the SECURITY DEFINER function to an empty search_path and schema-qualify relations.
CREATE OR REPLACE FUNCTION public.mark_credit_as_paid(p_credit_id bigint, p_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_credit_amount numeric;
  v_total_paid numeric;
  v_remaining_amount numeric;
  v_payment_id bigint;
BEGIN
  SELECT amount INTO v_credit_amount
  FROM public.credits
  WHERE id = p_credit_id AND issued_by = p_user_id;

  IF v_credit_amount IS NULL THEN
    RETURN pg_catalog.json_build_object('success', false, 'message', 'Credit not found or access denied');
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.payments
  WHERE credit_id = p_credit_id;

  v_remaining_amount := v_credit_amount - v_total_paid;

  IF v_remaining_amount <= 0 THEN
    UPDATE public.credits
    SET status = 'paid'
    WHERE id = p_credit_id;

    RETURN pg_catalog.json_build_object('success', true, 'message', 'Credit was already fully paid, status updated', 'amount_paid', 0);
  END IF;

  INSERT INTO public.payments (credit_id, amount, payment_date, payment_method, created_by)
  VALUES (p_credit_id, v_remaining_amount, CURRENT_DATE, 'cash', p_user_id)
  RETURNING id INTO v_payment_id;

  UPDATE public.credits
  SET status = 'paid'
  WHERE id = p_credit_id;

  RETURN pg_catalog.json_build_object('success', true, 'message', 'Credit marked as paid successfully', 'payment_id', v_payment_id, 'amount_paid', v_remaining_amount);

EXCEPTION WHEN OTHERS THEN
  RETURN pg_catalog.json_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- Record who established each globally shared identity. Existing ownership is
-- assigned to the earliest linked shop record when there is one.
ALTER TABLE public.global_customers
  ADD COLUMN IF NOT EXISTS created_by uuid;

UPDATE public.global_customers AS gc
SET created_by = (
  SELECT c.created_by
  FROM public.customers AS c
  WHERE c.global_customer_id = gc.id
    AND c.created_by IS NOT NULL
  ORDER BY c.created_at ASC NULLS LAST, c.id ASC
  LIMIT 1
)
WHERE gc.created_by IS NULL;

ALTER TABLE public.global_customers
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Replace broad signed-in-only access on globally shared customer identities.
DROP POLICY IF EXISTS "Users can view global customers" ON public.global_customers;
DROP POLICY IF EXISTS "Users can insert global customers" ON public.global_customers;
DROP POLICY IF EXISTS "Users can update global customers" ON public.global_customers;

CREATE POLICY "Users can view linked global customers or admins"
ON public.global_customers
FOR SELECT TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.customers AS c
    WHERE c.created_by = (SELECT auth.uid())
      AND c.id_proof = global_customers.aadhar_no
  )
);

CREATE POLICY "Users can create global customers for their own records"
ON public.global_customers
FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.customers AS c
    WHERE c.created_by = (SELECT auth.uid())
      AND c.id_proof = global_customers.aadhar_no
  )
);

CREATE POLICY "Creators or admins can update global customers"
ON public.global_customers
FOR UPDATE TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.customers AS c
    WHERE c.created_by = (SELECT auth.uid())
      AND c.id_proof = global_customers.aadhar_no
  )
)
WITH CHECK (
  created_by = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.customers AS c
    WHERE c.created_by = (SELECT auth.uid())
      AND c.id_proof = global_customers.aadhar_no
  )
);

-- Linked shops may change the shared risk flag, but not identity details.
REVOKE UPDATE ON public.global_customers FROM authenticated;
GRANT UPDATE (is_risky) ON public.global_customers TO authenticated;

-- Keep customer details limited to the shop that created them and admins.
DROP POLICY IF EXISTS "customers_select_all_authenticated" ON public.customers;
CREATE POLICY "customers_select_creator_or_admin"
ON public.customers
FOR SELECT TO authenticated
USING (
  created_by = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);

-- Transaction status history is visible only to the shop it belongs to and admins.
DROP POLICY IF EXISTS "transaction_history_select_auth" ON public.transaction_history;
CREATE POLICY "transaction_history_select_shop_or_admin"
ON public.transaction_history
FOR SELECT TO authenticated
USING (
  shop_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin'::public.app_role)
);