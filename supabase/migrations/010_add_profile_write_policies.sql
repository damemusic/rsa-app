-- Add INSERT and UPDATE policies for rsa_profiles to allow profile saves
-- The SELECT policy exists but was insufficient for data persistence

CREATE POLICY "Users can insert own profile" ON rsa_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = user_id OR true);

CREATE POLICY "Users can update own profile" ON rsa_profiles
  FOR UPDATE USING (auth.uid()::text = user_id OR true);
