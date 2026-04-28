-- Automated Google Drive Cleanup Trigger
-- This script sets up a trigger to notify the Edge Function when a profile is deleted

-- 1. Enable the required extensions
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- 2. Create the notification function
CREATE OR REPLACE FUNCTION public.handle_profile_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- We use pg_net to call the Edge Function asynchronously
  -- This ensures the database transaction isn't blocked by the external API call
  PERFORM
    net.http_post(
      url := 'https://qfevhmpomoacjqjitrrf.supabase.co/functions/v1/delete-user-drive-folder',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('vault.service_role_key', true) -- Using vault if available, else needs manual setting
      ),
      body := jsonb_build_object(
        'old_record', row_to_json(OLD)
      )
    );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach the trigger to the profiles table
DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
  AFTER DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_delete();
