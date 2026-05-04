-- Add categories column to settings table
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '{
  "casting": true,
  "activity": true,
  "ai": true,
  "progress": true,
  "communication": true,
  "account": true,
  "platform": true
}'::jsonb;
