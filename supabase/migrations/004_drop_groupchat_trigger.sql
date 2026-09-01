-- Remove groupchat trigger that was interfering with signup
-- The on_auth_user_created trigger from the groupchat project was causing signup to fail
-- with "Database error saving new user" because it tried to create records in a table
-- with RLS policies that were too restrictive for the auth context.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
