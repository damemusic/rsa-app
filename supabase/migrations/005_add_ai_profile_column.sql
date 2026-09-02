-- Add ai_profile column to rsa_profiles table for storing AI profile data
ALTER TABLE rsa_profiles ADD COLUMN IF NOT EXISTS ai_profile JSONB;
