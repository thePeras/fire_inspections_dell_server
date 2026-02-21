CREATE OR REPLACE FUNCTION get_user_metadata(file_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT user_metadata::jsonb
    FROM storage.objects
    WHERE name = file_path
    LIMIT 1
  );
END;
$$;

-- Allow the API roles to use the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Allow them to execute functions in the public schema
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Specifically ensure the function has no owner restrictions
ALTER FUNCTION get_user_metadata(text) OWNER TO postgres;