-- Function to get identity providers for a given email
CREATE OR REPLACE FUNCTION public.get_user_identities(email_to_check TEXT)
RETURNS TABLE (provider TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT id.provider::TEXT
    FROM auth.users u
    JOIN auth.identities id ON u.id = id.user_id
    WHERE u.email = email_to_check;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.get_user_identities(TEXT) TO anon, authenticated;
