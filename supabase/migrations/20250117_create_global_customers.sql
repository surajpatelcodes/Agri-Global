-- ============================================================================
-- Phase 1: Create Global Customer Identity Layer (Non-Breaking Changes)
-- ============================================================================

-- Create the global_customers table for unique Aadhar-based global identity
CREATE TABLE public.global_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aadhar_no TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Add a nullable column to customers table to link to global customers
ALTER TABLE public.customers
ADD COLUMN global_customer_id uuid REFERENCES public.global_customers(id);

-- Grant necessary permissions
GRANT ALL ON public.global_customers TO authenticated;
GRANT ALL ON public.global_customers TO service_role;

-- Add RLS policies for global_customers
ALTER TABLE public.global_customers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read global customers
CREATE POLICY "Users can view global customers" ON public.global_customers
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert global customers
CREATE POLICY "Users can insert global customers" ON public.global_customers
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update global customers
CREATE POLICY "Users can update global customers" ON public.global_customers
  FOR UPDATE USING (auth.role() = 'authenticated');
