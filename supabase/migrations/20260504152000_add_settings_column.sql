-- Add settings column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "appearance": "system",
  "accentColor": "default",
  "contrast": "system",
  "notifications": {
    "push": true,
    "email": true,
    "sms": false
  },
  "categories": {
    "casting": true,
    "activity": true,
    "ai": true,
    "progress": true,
    "communication": true,
    "account": true,
    "platform": true
  },
  "privacy": {
    "visibility": "public",
    "openToWork": true,
    "showAge": true,
    "showLocation": true,
    "showContact": true
  },
  "permissions": {
    "message": "everyone",
    "viewTapes": "directors",
    "sendInvites": "directors",
    "appearInSearches": true
  }
}'::jsonb;
