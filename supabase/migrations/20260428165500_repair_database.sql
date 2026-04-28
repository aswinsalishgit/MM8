-- MM8 Database Repair & Sync Script
-- This script restores the profiles table schema and synchronizes it with auth.users

-- 1. Ensure the profiles table has all required columns with correct names
DO $$ 
BEGIN
    -- Rename back if user manually renamed them
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.profiles RENAME COLUMN avatar_url TO user_drive;
    END IF;
END $$;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_drive TEXT DEFAULT 'NONE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url_proxy TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audition_count INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;

-- 2. Restore the user initialization trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, user_drive)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email,
    'NONE'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
    email = COALESCE(public.profiles.email, EXCLUDED.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Repair Step: Synchronize profiles with auth.users
-- This inserts a profile for any user that exists in auth but is missing a profile record
INSERT INTO public.profiles (id, full_name, email, user_drive)
SELECT 
  id, 
  raw_user_meta_data->>'full_name', 
  email, 
  'NONE'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Cleanup duplicate triggers if any
-- (Supabase handles this usually, but good to be safe)
