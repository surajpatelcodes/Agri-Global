CREATE TABLE public.defaulter_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id bigint NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  global_customer_id uuid,
  shop_id uuid,
  action text NOT NULL DEFAULT 'marked',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.defaulter_events TO authenticated;
GRANT ALL ON public.defaulter_events TO service_role;
ALTER TABLE public.defaulter_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY defaulter_events_select_own_or_admin ON public.defaulter_events
  FOR SELECT TO authenticated
  USING (shop_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'::app_role));
CREATE INDEX defaulter_events_global_idx ON public.defaulter_events(global_customer_id);

CREATE OR REPLACE FUNCTION public.log_defaulter_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_action text;
  v_gid uuid;
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NEW.status = 'defaulter' THEN v_action := 'marked';
  ELSIF OLD.status = 'defaulter' THEN v_action := 'cleared';
  ELSE RETURN NEW; END IF;

  -- one event per customer per action (a single click updates all their credits)
  IF EXISTS (SELECT 1 FROM defaulter_events
             WHERE customer_id = NEW.customer_id AND action = v_action
               AND created_at > now() - interval '1 minute') THEN
    RETURN NEW;
  END IF;

  SELECT global_customer_id INTO v_gid FROM customers WHERE id = NEW.customer_id;
  INSERT INTO defaulter_events (customer_id, global_customer_id, shop_id, action)
  VALUES (NEW.customer_id, v_gid, NEW.issued_by, v_action);
  RETURN NEW;
END; $$;

CREATE TRIGGER trigger_log_defaulter_event
AFTER UPDATE OF status ON public.credits
FOR EACH ROW EXECUTE FUNCTION public.log_defaulter_event();

-- Backfill history: past "marked" status changes
INSERT INTO public.defaulter_events (customer_id, global_customer_id, shop_id, action, created_at)
SELECT DISTINCT ON (cr.customer_id, date_trunc('minute', th.created_at))
  cr.customer_id, c.global_customer_id, cr.issued_by, 'marked', th.created_at
FROM public.transaction_history th
JOIN public.credits cr ON cr.id = th.credit_id
JOIN public.customers c ON c.id = cr.customer_id
WHERE th.new_status = 'defaulter' AND th.created_at IS NOT NULL;

-- Backfill: currently-defaulter customers without any logged event (use earliest credit date)
INSERT INTO public.defaulter_events (customer_id, global_customer_id, shop_id, action, created_at)
SELECT cr.customer_id, c.global_customer_id, MIN(cr.issued_by::text)::uuid, 'marked', COALESCE(MIN(cr.created_at), now())
FROM public.credits cr
JOIN public.customers c ON c.id = cr.customer_id
WHERE cr.status = 'defaulter'
  AND NOT EXISTS (SELECT 1 FROM public.defaulter_events e WHERE e.customer_id = cr.customer_id)
GROUP BY cr.customer_id, c.global_customer_id;

CREATE OR REPLACE FUNCTION public.global_search(p_aadhar_no text)
 RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  g record;
  is_def boolean;
  incidents json;
  cnt int;
  shops int;
BEGIN
  SELECT * INTO g FROM global_customers WHERE aadhar_no = p_aadhar_no;
  IF g.id IS NULL THEN RETURN NULL; END IF;

  SELECT EXISTS (
    SELECT 1 FROM credits cr JOIN customers c ON cr.customer_id = c.id
    WHERE (c.global_customer_id = g.id OR c.id_proof = p_aadhar_no) AND cr.status = 'defaulter'
  ) INTO is_def;

  SELECT COUNT(*), COUNT(DISTINCT e.shop_id),
         COALESCE(json_agg(json_build_object('marked_at', e.created_at) ORDER BY e.created_at DESC), '[]'::json)
    INTO cnt, shops, incidents
  FROM defaulter_events e
  JOIN customers c ON c.id = e.customer_id
  WHERE e.action = 'marked' AND (c.global_customer_id = g.id OR c.id_proof = p_aadhar_no);

  RETURN json_build_object(
    'status', CASE WHEN is_def THEN 'defaulter' ELSE 'no_defaulter' END,
    'aadhar_no', p_aadhar_no,
    'global_customer', json_build_object('aadhar_no', g.aadhar_no, 'name', g.name, 'phone', g.phone, 'is_risky', g.is_risky),
    'defaulter_summary', json_build_object(
      'is_defaulter', is_def,
      'total_defaulter_count', COALESCE(cnt, 0),
      'distinct_shops_count', COALESCE(shops, 0),
      'incidents', incidents
    )
  );
END;
$function$;