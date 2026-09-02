-- Clean up malformed profile data that causes decryption failures
-- Delete profiles where:
-- 1. encrypted_data is NULL
-- 2. encrypted_data is less than 20 characters (too short to be valid AES-GCM)
-- 3. encrypted_data starts/ends with quotes (JSON-encoded double-wrapped)

DELETE FROM rsa_profiles
WHERE
  encrypted_data IS NULL
  OR encrypted_data = ''
  OR LENGTH(encrypted_data) < 20
  OR (encrypted_data LIKE '"%"');

-- Log what was deleted
SELECT COUNT(*) as profiles_deleted, 'Malformed profiles removed' as action;
