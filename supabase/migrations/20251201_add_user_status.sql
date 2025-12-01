-- Add status column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Update existing users to 'approved' so they don't get locked out
UPDATE public.profiles SET status = 'approved' WHERE status = 'pending';

-- Allow admins to update the status column
-- (The previous policy "admins_can_update_all_profiles" already covers this, 
-- but we ensure the column is accessible)
