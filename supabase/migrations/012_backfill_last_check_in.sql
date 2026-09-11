-- Repair last_check_in values destroyed by POST /api/user/setup.
--
-- That endpoint runs on every sign-in and, until the auth hardening change,
-- upserted last_check_in: null each time, so a user's check-in timestamp was
-- wiped on every login. rsa_check_ins still holds the real history, so the
-- correct value is simply the most recent row there.
--
-- Only NULL values are filled: a user whose last_check_in survived (they had
-- not signed in again since their last check-in) already holds the right
-- timestamp and is left alone. That also makes this safe to re-run.

UPDATE rsa_users u
SET last_check_in = c.latest
FROM (
  SELECT user_id, MAX(checked_in_at) AS latest
  FROM rsa_check_ins
  GROUP BY user_id
) c
WHERE c.user_id = u.id
  AND u.last_check_in IS NULL;
