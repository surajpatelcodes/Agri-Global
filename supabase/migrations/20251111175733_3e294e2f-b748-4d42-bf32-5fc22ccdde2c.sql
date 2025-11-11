-- Enable global customer management across shops
-- Add unique constraint on Aadhaar number to prevent duplicate customers
ALTER TABLE public.customers 
ADD CONSTRAINT customers_id_proof_unique UNIQUE (id_proof);

-- Drop existing restrictive RLS policies on customers
DROP POLICY IF EXISTS "customers_select_own_or_masked" ON public.customers;
DROP POLICY IF EXISTS "customers_insert_auth" ON public.customers;
DROP POLICY IF EXISTS "customers_manage_owner_or_admin" ON public.customers;
DROP POLICY IF EXISTS "customers_delete_owner_or_admin" ON public.customers;

-- Create new global RLS policies for customers
-- Allow all authenticated users to view all customers
CREATE POLICY "customers_select_all_authenticated" 
ON public.customers 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert customers (with unique Aadhaar check)
CREATE POLICY "customers_insert_authenticated" 
ON public.customers 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Allow only the creator or admin to update customer details
CREATE POLICY "customers_update_creator_or_admin" 
ON public.customers 
FOR UPDATE 
USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow only the creator or admin to delete customers
CREATE POLICY "customers_delete_creator_or_admin" 
ON public.customers 
FOR DELETE 
USING ((created_by = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Update get_all_customers to return all customers for authenticated users
CREATE OR REPLACE FUNCTION public.get_all_customers(user_id uuid)
RETURNS TABLE(id bigint, name text, phone text, id_proof text)
LANGUAGE sql
STABLE
AS $function$
SELECT
  c.id,
  c.name,
  c.phone,
  c.id_proof
FROM customers c
WHERE auth.uid() IS NOT NULL
ORDER BY c.name;
$function$;

-- Drop and recreate get_customer_transactions to include created_by_current_user
DROP FUNCTION IF EXISTS public.get_customer_transactions(uuid);

CREATE FUNCTION public.get_customer_transactions(user_id uuid)
RETURNS TABLE(
  id bigint, 
  name text, 
  phone text, 
  address text, 
  id_proof text, 
  total_credit numeric, 
  total_payments numeric, 
  outstanding numeric, 
  status text, 
  created_at timestamp without time zone,
  created_by_current_user boolean
)
LANGUAGE sql
STABLE
AS $function$
SELECT
  c.id,
  c.name,
  c.phone,
  c.address,
  c.id_proof,
  COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN cr.amount ELSE 0 END), 0)::numeric as total_credit,
  COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN p.amount ELSE 0 END), 0)::numeric as total_payments,
  (COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN cr.amount ELSE 0 END), 0) - 
   COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN p.amount ELSE 0 END), 0))::numeric as outstanding,
  CASE
    WHEN MAX(CASE WHEN cr.issued_by = user_id THEN cr.status ELSE NULL END) = 'defaulter' THEN 'defaulter'
    WHEN COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN p.amount ELSE 0 END), 0) = 0 
         AND COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN cr.amount ELSE 0 END), 0) > 0 THEN 'pending'
    WHEN COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN p.amount ELSE 0 END), 0) > 0 
         AND COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN p.amount ELSE 0 END), 0) < 
         COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN cr.amount ELSE 0 END), 0) THEN 'partial'
    WHEN COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN p.amount ELSE 0 END), 0) >= 
         COALESCE(SUM(CASE WHEN cr.issued_by = user_id THEN cr.amount ELSE 0 END), 0) THEN 'paid'
    ELSE 'paid'
  END::text as status,
  c.created_at,
  (c.created_by = user_id)::boolean as created_by_current_user
FROM customers c
LEFT JOIN credits cr ON cr.customer_id = c.id
LEFT JOIN payments p ON p.credit_id = cr.id
WHERE auth.uid() IS NOT NULL
GROUP BY c.id, c.name, c.phone, c.address, c.id_proof, c.created_at, c.created_by
ORDER BY c.created_at DESC;
$function$;