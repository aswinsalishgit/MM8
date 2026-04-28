-- Migrate from Supabase Storage to Google Drive links
ALTER TABLE public.profiles RENAME COLUMN avatar_url TO user_drive;
ALTER TABLE public.profiles ALTER COLUMN user_drive SET DEFAULT 'NONE';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS archive_folder_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS playback_folder_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url_proxy TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audition_count INTEGER DEFAULT 0;

-- Update the handle_new_user trigger to initialize user_drive
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    full_name = COALESCE(new.raw_user_meta_data->>'full_name', full_name),
    email = COALESCE(new.email, email),
    user_drive = 'NONE'
  WHERE id = new.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
