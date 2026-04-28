-- Migrate from Supabase Storage to Google Drive links
ALTER TABLE public.profiles RENAME COLUMN avatar_url TO user_drive;
ALTER TABLE public.profiles ALTER COLUMN user_drive SET DEFAULT 'NONE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url_proxy TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audition_count INTEGER DEFAULT 0;

-- Update the handle_new_user trigger to initialize user_drive
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
