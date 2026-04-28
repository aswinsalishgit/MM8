-- Function to check if a user exists by email (Email or Google)
CREATE OR REPLACE FUNCTION public.check_user_exists(email_to_check TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM auth.users
        WHERE email = email_to_check
    );
END;
$$;

-- Grant access to the function for the frontend
GRANT EXECUTE ON FUNCTION public.check_user_exists(TEXT) TO anon, authenticated;
