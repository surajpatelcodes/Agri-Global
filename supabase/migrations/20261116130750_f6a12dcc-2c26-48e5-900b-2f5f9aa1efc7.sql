REVOKE EXECUTE ON FUNCTION public.log_defaulter_event() FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS defaulter_events_customer_idx ON public.defaulter_events(customer_id);