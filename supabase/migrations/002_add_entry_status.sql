-- Add status column to rsa_entries table to track in_progress vs completed entries
ALTER TABLE rsa_entries
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'completed' CHECK (status IN ('in_progress', 'completed'));

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_rsa_entries_status ON rsa_entries(user_id, status);

-- Add updated_at column for tracking last modification
ALTER TABLE rsa_entries
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
