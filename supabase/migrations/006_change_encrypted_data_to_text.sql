-- Change encrypted_data column from JSONB to TEXT to properly handle base64-encoded encrypted data
-- First, back up any existing data by casting
ALTER TABLE rsa_profiles
ALTER COLUMN encrypted_data SET DATA TYPE TEXT USING encrypted_data::TEXT;
