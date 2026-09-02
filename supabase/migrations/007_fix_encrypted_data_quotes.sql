-- Fix encrypted_data column by stripping JSON quotes from text values
-- JSONB values like "base64string" become just base64string in TEXT
UPDATE rsa_profiles
SET encrypted_data = TRIM(BOTH '"' FROM encrypted_data)
WHERE encrypted_data IS NOT NULL AND encrypted_data LIKE '"%"';
