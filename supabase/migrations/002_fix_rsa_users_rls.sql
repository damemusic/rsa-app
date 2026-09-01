-- Disable RLS on rsa_users table to allow trigger-based inserts
ALTER TABLE public.rsa_users DISABLE ROW LEVEL SECURITY;

-- Alternatively, if we want to keep RLS but fix it:
-- Drop existing restrictive policies
-- DROP POLICY IF EXISTS "Users can insert own record" ON public.rsa_users;
-- DROP POLICY IF EXISTS "Users can read own record" ON public.rsa_users;
-- DROP POLICY IF EXISTS "Users can update own record" ON public.rsa_users;
-- DROP POLICY IF EXISTS "Enable insert for trigger" ON public.rsa_users;

-- Create a new permissive policy that allows the trigger/SECURITY DEFINER function to work
-- CREATE POLICY "Allow trigger inserts" ON public.rsa_users
--   FOR INSERT WITH CHECK (true);

-- Create policies for regular authenticated users
-- CREATE POLICY "Users can insert own record" ON public.rsa_users
--   FOR INSERT WITH CHECK (id::text = auth.uid()::text);

-- CREATE POLICY "Users can read own record" ON public.rsa_users
--   FOR SELECT USING (id::text = auth.uid()::text);

-- CREATE POLICY "Users can update own record" ON public.rsa_users
--   FOR UPDATE USING (id::text = auth.uid()::text);
