-- Consent record and the de-identified analytics store.
--
-- The product goal is to sell aggregate insight to probation offices — where
-- people need help — without shipping anything traceable to a person. Two
-- properties carry that, and they are enforced here in the schema rather than
-- left to application discipline:
--
--   1. Nothing reaches analytics_checkin_facts without a current consent row.
--      That is enforced in the backend, which is the only writer.
--   2. A fact row physically cannot hold narrative text. Every descriptive
--      column is a CHECK-constrained enum, so a free-text value is rejected by
--      the database, not merely by the code that happens to call it today.
--
-- Both tables are RLS-enabled with no policies: the backend service role is the
-- only reader and writer. Clients never touch them directly.

-- ---------------------------------------------------------------------------
-- Consent
-- ---------------------------------------------------------------------------

-- Two separate decisions, deliberately not one checkbox.
--
-- Accepting the terms and privacy policy gates the app: no acceptance, no
-- access. That is ordinary and enforceable.
--
-- Contributing to the dataset sold to agencies is a second, separable choice.
-- It is kept separable on purpose. Consent that is a condition of receiving
-- the service is not freely given, and the right to opt out of a sale of
-- personal data is not waivable under several state acts — and the users here
-- may be directed to this app by the same agencies that buy the output, so a
-- forced grant would be consent in name only. Withholding it costs the user
-- nothing but their rows.
CREATE TABLE IF NOT EXISTS rsa_data_consents (
  user_id TEXT PRIMARY KEY REFERENCES rsa_users(id) ON DELETE CASCADE,

  -- Blocking gate. The app refuses to operate until this matches the current
  -- terms version.
  terms_version TEXT,
  terms_accepted_at TIMESTAMPTZ,

  -- Separable. Opt-in: a user with no row has not granted, and the absence of
  -- a row is the same answer as analytics_granted = false.
  analytics_granted BOOLEAN NOT NULL DEFAULT FALSE,
  -- Which version of the disclosure they agreed to. When the disclosure
  -- changes materially, consent to the old text is not consent to the new one,
  -- so contributions stop until they agree again.
  analytics_policy_version TEXT,
  analytics_granted_at TIMESTAMPTZ,
  analytics_revoked_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE rsa_data_consents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Analytics facts
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS analytics_checkin_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- HMAC(user_id, ANALYTICS_CONTRIBUTOR_SECRET). Deliberately NOT the user id:
  -- it exists only so a revoked consent can delete that person's rows and so
  -- the k-anonymity threshold can count distinct people rather than distinct
  -- rows. It is pseudonymous, not anonymous — whoever holds the secret can
  -- recompute it from a user id. It is never exported.
  contributor_key TEXT NOT NULL,

  -- Coarse on purpose: the first day of the month. A precise timestamp plus a
  -- narrow cohort is itself identifying.
  period_month DATE NOT NULL,

  -- Coarse geography, NULL until a deliberate decision is made to collect it.
  -- Region is what makes the data useful to a probation office and also what
  -- shrinks cohorts fastest, so it stays out until the k threshold is proven
  -- to hold against real volume.
  region TEXT,

  need_category TEXT NOT NULL CHECK (need_category IN (
    'housing', 'employment', 'transportation', 'family_conflict',
    'substance_use', 'mental_health', 'finances', 'legal', 'healthcare',
    'childcare', 'education', 'food_security', 'social_isolation', 'other'
  )),

  support_accessed TEXT NOT NULL CHECK (support_accessed IN (
    'none', 'family', 'friend', 'counselor', 'faith_community',
    'program_staff', 'probation_officer', 'peer_support', 'hotline', 'other'
  )),

  outcome_signal TEXT NOT NULL CHECK (outcome_signal IN (
    'resolved', 'plan_made', 'still_stuck', 'escalated'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE analytics_checkin_facts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_facts_period
  ON analytics_checkin_facts (period_month);
CREATE INDEX IF NOT EXISTS idx_analytics_facts_need
  ON analytics_checkin_facts (need_category);
-- Revoking consent deletes by contributor_key, and the k threshold counts
-- distinct contributors, so this one carries the writes as well as the reads.
CREATE INDEX IF NOT EXISTS idx_analytics_facts_contributor
  ON analytics_checkin_facts (contributor_key);
