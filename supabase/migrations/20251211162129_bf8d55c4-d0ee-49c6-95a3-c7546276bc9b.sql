-- Update the handle_new_user function to include gstin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, shop_name, phone, gstin)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'shop_name',
    new.raw_user_meta_data ->> 'phone',
    new.raw_user_meta_data ->> 'gstin'
  );
  RETURN new;
END;
$$;