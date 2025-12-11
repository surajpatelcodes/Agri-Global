-- Add GSTIN column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gstin text;