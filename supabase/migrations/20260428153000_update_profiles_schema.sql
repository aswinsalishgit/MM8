-- Migration to add all user details to profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Actor',
  ADD COLUMN IF NOT EXISTS objective_preference TEXT,
  ADD COLUMN IF NOT EXISTS languages TEXT[],
  ADD COLUMN IF NOT EXISTS archetypes TEXT[],
  ADD COLUMN IF NOT EXISTS profile_pic_url TEXT DEFAULT 'NONE',
  ADD COLUMN IF NOT EXISTS experience TEXT,
  ADD COLUMN IF NOT EXISTS readiness TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS acquisition_source TEXT;

-- Password is NOT added here as it is securely managed by Supabase Auth (auth.users)
-- and should not be stored in a public profiles table.

-- Ensure RLS is enabled and policies are set (assuming they were already set up)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile.'
    ) THEN
        CREATE POLICY "Users can update their own profile." ON public.profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;
