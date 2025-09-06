-- Enable cross-shop functionality by updating RLS policies
-- This allows users to view data from all shops while maintaining security

-- Update credits policies for cross-shop viewing
DROP POLICY IF EXISTS "credits_select_all_shops" ON public.credits;
CREATE POLICY "credits_select_cross_shop" ON public.credits
FOR SELECT USING (true);

-- Update customers policies for cross-shop viewing
DROP POLICY IF EXISTS "customers_select_all_shops" ON public.customers;
CREATE POLICY "customers_select_cross_shop" ON public.customers
FOR SELECT USING (true);

-- Update payments policies for cross-shop viewing
DROP POLICY IF EXISTS "payments_select_auth" ON public.payments;
CREATE POLICY "payments_select_cross_shop" ON public.payments
FOR SELECT USING (true);

-- Update profiles to show shop information
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_location text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS shop_owner text;

-- Update the handle_auth_user_insert function to properly set profile data
CREATE OR REPLACE FUNCTION public.handle_auth_user_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
begin
  -- Insert a profile row for the newly created auth user
  INSERT INTO public.profiles (
    id, 
    full_name, 
    shop_name, 
    phone, 
    created_at
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email), 
    COALESCE(new.raw_user_meta_data ->> 'shop_name', 'My Shop'),
    COALESCE(new.raw_user_meta_data ->> 'phone', ''),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    shop_name = COALESCE(EXCLUDED.shop_name, profiles.shop_name),
    phone = COALESCE(EXCLUDED.phone, profiles.phone);
  
  RETURN new;
END;
$function$;