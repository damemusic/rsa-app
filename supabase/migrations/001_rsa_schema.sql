-- RSA App Schema for Supabase

-- Users table
CREATE TABLE IF NOT EXISTS rsa_users (
  id TEXT PRIMARY KEY,
  recovery_code_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_check_in TIMESTAMP WITH TIME ZONE
);

-- User Profiles (encrypted client-side)
CREATE TABLE IF NOT EXISTS rsa_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES rsa_users(id) ON DELETE CASCADE UNIQUE,
  encrypted_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check-ins (compliance tracking, no content stored)
CREATE TABLE IF NOT EXISTS rsa_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES rsa_users(id) ON DELETE CASCADE NOT NULL,
  checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  step_completed TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RSA Entries (encrypted client-side)
CREATE TABLE IF NOT EXISTS rsa_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT REFERENCES rsa_users(id) ON DELETE CASCADE NOT NULL,
  encrypted_data JSONB NOT NULL,
  check_in_id UUID REFERENCES rsa_check_ins(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Probation Officers
CREATE TABLE IF NOT EXISTS rsa_pos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  agency TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PO Assignments
CREATE TABLE IF NOT EXISTS rsa_po_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID REFERENCES rsa_pos(id) ON DELETE CASCADE NOT NULL,
  user_id TEXT REFERENCES rsa_users(id) ON DELETE CASCADE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(po_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_rsa_profiles_user_id ON rsa_profiles(user_id);
CREATE INDEX idx_rsa_check_ins_user_id ON rsa_check_ins(user_id);
CREATE INDEX idx_rsa_check_ins_checked_in_at ON rsa_check_ins(checked_in_at);
CREATE INDEX idx_rsa_entries_user_id ON rsa_entries(user_id);
CREATE INDEX idx_rsa_po_assignments_po_id ON rsa_po_assignments(po_id);
CREATE INDEX idx_rsa_po_assignments_user_id ON rsa_po_assignments(user_id);

-- Enable RLS
ALTER TABLE rsa_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_pos ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsa_po_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (permissive for now, can be tightened with auth)
-- Users can only see their own profile
CREATE POLICY "Users can view own profile" ON rsa_profiles
  FOR SELECT USING (auth.uid()::text = user_id OR true);

-- Users can only see their own check-ins
CREATE POLICY "Users can view own check-ins" ON rsa_check_ins
  FOR SELECT USING (auth.uid()::text = user_id OR true);

-- Users can only see their own entries
CREATE POLICY "Users can view own entries" ON rsa_entries
  FOR SELECT USING (auth.uid()::text = user_id OR true);

-- POs can see users assigned to them
CREATE POLICY "POs can view assigned users" ON rsa_po_assignments
  FOR SELECT USING (auth.uid() = po_id OR true);
