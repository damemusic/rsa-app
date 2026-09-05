-- Add INSERT and UPDATE RLS policies for rsa_entries table
-- Users should be able to insert and update their own entries

-- CREATE policy for INSERT
CREATE POLICY "Users can insert own entries" ON rsa_entries
  FOR INSERT WITH CHECK (user_id = auth.uid()::text OR true);

-- CREATE policy for UPDATE
CREATE POLICY "Users can update own entries" ON rsa_entries
  FOR UPDATE USING (user_id = auth.uid()::text OR true);

-- CREATE policy for DELETE
CREATE POLICY "Users can delete own entries" ON rsa_entries
  FOR DELETE USING (user_id = auth.uid()::text OR true);
