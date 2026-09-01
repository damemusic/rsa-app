-- Drop existing trigger that's causing signup to fail
DROP TRIGGER IF EXISTS on_auth_user_created_rsa ON auth.users;
DROP FUNCTION IF EXISTS create_rsa_user();

-- The rsa_users table is no longer required for basic auth functionality
-- It can be used for storing recovery codes in the future if needed
