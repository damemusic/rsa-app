-- Drop existing trigger that's causing issues
DROP TRIGGER IF EXISTS on_auth_user_created_rsa ON auth.users;
DROP FUNCTION IF EXISTS create_rsa_user();

-- Create a new RPC function that can be called from the frontend
-- This function will be called explicitly after signup/signin
CREATE OR REPLACE FUNCTION public.create_rsa_user_if_not_exists(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO public.rsa_users (id, recovery_code_hash)
  VALUES (user_id::text, '')
  ON CONFLICT (id) DO NOTHING;

  SELECT true;
$$;

-- Allow anyone to call this function
GRANT EXECUTE ON FUNCTION public.create_rsa_user_if_not_exists(uuid) TO anon, authenticated;
