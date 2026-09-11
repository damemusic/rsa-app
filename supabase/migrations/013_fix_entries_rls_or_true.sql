-- Close the `OR true` hole in the rsa_entries policies.
--
-- Migration 009 created these as:
--
--   FOR UPDATE USING (user_id = auth.uid()::text OR true)
--
-- `OR true` makes the condition unconditional, and the policies were granted to
-- `public`, which includes `anon`. Since the anon key ships in the frontend
-- bundle, anyone could UPDATE or DELETE any user's entry straight through
-- PostgREST, bypassing the backend's auth entirely. UPDATE also doubles as a
-- read: PostgREST returns the changed rows with Prefer: return=representation,
-- and an UPDATE policy with no WITH CHECK reuses its USING expression, so the
-- same `OR true` passed on the way out.
--
-- Nothing in the app depends on these policies: every entry read and write goes
-- through the backend on the service role key, which bypasses RLS. Tightening
-- them costs the app nothing.
--
-- No SELECT policy is added. There isn't one today, so direct reads are already
-- denied, and the app has no need of one — adding it would widen access rather
-- than restore it.

DROP POLICY IF EXISTS "Users can insert own entries" ON rsa_entries;
DROP POLICY IF EXISTS "Users can update own entries" ON rsa_entries;
DROP POLICY IF EXISTS "Users can delete own entries" ON rsa_entries;

-- Scoped to `authenticated` rather than `public`: a signed-out caller has no
-- business writing entries at all, and auth.uid() is null for them anyway.
CREATE POLICY "Users can insert own entries" ON rsa_entries
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own entries" ON rsa_entries
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own entries" ON rsa_entries
  FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);
