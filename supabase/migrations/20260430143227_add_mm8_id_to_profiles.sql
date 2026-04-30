-- ============================================================
-- MM8 ID System + VIP Architecture + Notifications
-- ============================================================

-- 1. Add mm8_id column as auto-incrementing serial, ordered by creation time
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS mm8_id SERIAL UNIQUE;

-- 2. Add is_vip column (derived from mm8_id <= 1000)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- 3. Create the VIP table (users will be migrated here when profiles hits 1000)
CREATE TABLE IF NOT EXISTS public.vips (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  mm8_id INTEGER NOT NULL UNIQUE,
  full_name TEXT,
  email TEXT,
  role TEXT,
  objective_preference TEXT,
  languages TEXT[] DEFAULT '{}',
  archetypes TEXT[] DEFAULT '{}',
  avatar_url TEXT DEFAULT 'NONE',
  avatar_url_proxy TEXT,
  experience TEXT,
  opportunity_readiness TEXT,
  location TEXT,
  acquisition_source TEXT,
  username TEXT,
  status TEXT DEFAULT 'VIP',
  visibility_score INTEGER DEFAULT 0,
  drive_folder_id TEXT,
  user_drive TEXT,
  password_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  migrated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('NORMAL', 'IMPORTANT', 'VERY IMPORTANT')),
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.vips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- VIP policies
CREATE POLICY "Users can view own VIP record" ON public.vips
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Service role can manage VIPs" ON public.vips
  FOR ALL USING (true) WITH CHECK (true);

-- Notification policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage notifications" ON public.notifications
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Function: Mark user as VIP if mm8_id <= 1000 and send welcome notification
CREATE OR REPLACE FUNCTION public.on_profile_check_vip()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-set is_vip based on mm8_id
  IF NEW.mm8_id IS NOT NULL AND NEW.mm8_id <= 1000 THEN
    NEW.is_vip := true;
    NEW.status := 'VIP';
    
    -- Insert VIP welcome notification (only on first insert)
    IF TG_OP = 'INSERT' THEN
      INSERT INTO public.notifications (user_id, title, body, priority)
      VALUES (
        NEW.id,
        'VIP STATUS GRANTED',
        'Congratulations. You have been officially verified as one of the first talents on MM8. You have been granted VIP status in recognition of your early participation. This status provides full access to all premium features, priority access to new functionalities and casting opportunities, and a lifetime waiver on all paid memberships.',
        'VERY IMPORTANT'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_check_vip ON public.profiles;
CREATE TRIGGER trigger_check_vip
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_profile_check_vip();

-- 6. Function: Migrate VIPs when profiles table hits 1000 users
CREATE OR REPLACE FUNCTION public.migrate_vips_at_threshold()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  
  IF user_count >= 1000 THEN
    -- Move all VIP users to vips table
    INSERT INTO public.vips (
      id, mm8_id, full_name, email, role, objective_preference,
      languages, archetypes, avatar_url, avatar_url_proxy, experience,
      opportunity_readiness, location, acquisition_source, username,
      status, visibility_score, drive_folder_id, user_drive, password_encrypted
    )
    SELECT 
      id, mm8_id, full_name, email, role, objective_preference,
      languages, archetypes, avatar_url, avatar_url_proxy, experience,
      opportunity_readiness, location, acquisition_source, username,
      'VIP', visibility_score, drive_folder_id, user_drive, password_encrypted
    FROM public.profiles
    WHERE is_vip = true AND mm8_id <= 1000
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_migrate_vips ON public.profiles;
CREATE TRIGGER trigger_migrate_vips
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.migrate_vips_at_threshold();

-- 7. Mark any existing users as VIP if they qualify
UPDATE public.profiles SET is_vip = true, status = 'VIP' WHERE mm8_id <= 1000;
