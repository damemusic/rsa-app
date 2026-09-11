-- Remove the probation-officer feature.
--
-- rsa_pos and rsa_po_assignments were created in 001 and never used: no rows
-- were ever written, no frontend referenced them, and the backend endpoints
-- that read them (/api/po/auth, /api/po/dashboard, /api/po/compliance) have
-- been deleted. They also sat with RLS enabled and no policies, which the
-- Supabase security advisor flagged on every run.

DROP TABLE IF EXISTS rsa_po_assignments;
DROP TABLE IF EXISTS rsa_pos;
