-- Fix settings foreign key to point to profiles for easier joining
ALTER TABLE public.settings DROP CONSTRAINT IF EXISTS settings_id_fkey;
ALTER TABLE public.settings ADD CONSTRAINT settings_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE;
