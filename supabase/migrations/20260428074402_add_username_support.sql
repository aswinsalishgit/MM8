-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Enforce lowercase letters only (no spaces, no underscores)
ALTER TABLE public.profiles ADD CONSTRAINT username_format CHECK (username ~ '^[a-z]+$');

-- Function to get email from username
CREATE OR REPLACE FUNCTION public.get_email_from_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT u.email INTO v_email
    FROM auth.users u
    JOIN public.profiles p ON u.id = p.id
    WHERE p.username = p_username;
    
    RETURN v_email;
END;
$$;

-- Function to check if username is taken
CREATE OR REPLACE FUNCTION public.check_username_exists(p_username TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE username = p_username
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_email_from_username(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_username_exists(TEXT) TO anon, authenticated;
