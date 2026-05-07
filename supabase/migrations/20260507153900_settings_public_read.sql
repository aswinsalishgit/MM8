-- Allow public read access to specific privacy-related settings
CREATE POLICY "Public profiles are semi-visible" ON public.settings
  FOR SELECT USING (true);
