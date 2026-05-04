-- 1. Create a dedicated SETTINGS table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  appearance TEXT DEFAULT 'system',
  accent_color TEXT DEFAULT 'default',
  contrast TEXT DEFAULT 'system',
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  privacy_visibility TEXT DEFAULT 'public',
  open_to_work BOOLEAN DEFAULT true,
  show_age BOOLEAN DEFAULT true,
  show_location BOOLEAN DEFAULT true,
  show_contact BOOLEAN DEFAULT true,
  message_permissions TEXT DEFAULT 'everyone',
  view_tapes_permissions TEXT DEFAULT 'directors',
  appear_in_searches BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on the new table
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies
CREATE POLICY "Users can manage own settings" ON public.settings
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Initialization: Create settings record for existing users
INSERT INTO public.settings (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 5. Update the user creation trigger to also initialize settings
CREATE OR REPLACE FUNCTION public.handle_new_user_with_settings()
RETURNS TRIGGER AS $$
BEGIN
  -- Create Profile
  INSERT INTO public.profiles (id, full_name, email, user_drive)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email, 'NONE')
  ON CONFLICT (id) DO NOTHING;

  -- Create Settings
  INSERT INTO public.settings (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_with_settings();

-- 6. FIX THE UNRESTRICTED WARNING ON THE LEADERBOARD VIEW
-- For Views, we set security_invoker = true to force it to respect RLS of underlying tables
ALTER VIEW public.lumen_leaderboard SET (security_invoker = true);
