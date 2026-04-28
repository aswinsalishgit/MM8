-- Add audition_videos column to store direct Supabase storage links for high-performance playback
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS audition_videos JSONB DEFAULT '[]';

-- Create a storage bucket for high-performance video streaming
INSERT INTO storage.buckets (id, name, public)
VALUES ('auditions', 'auditions', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for auditions bucket
CREATE POLICY "Auditions Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'auditions');

CREATE POLICY "Authenticated users can upload auditions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'auditions' AND 
    auth.role() = 'authenticated'
  );
