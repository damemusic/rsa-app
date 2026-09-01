# Supabase Trigger Fix Guide

## Issue
The signup flow is failing with "Database error saving new user" because a trigger on the `auth.users` table is trying to create records in the `rsa_users` table, but RLS policies are blocking these inserts.

## Solution
Execute the following SQL in your Supabase SQL Editor to drop the problematic trigger:

```sql
-- Drop existing trigger that's causing signup to fail
DROP TRIGGER IF EXISTS on_auth_user_created_rsa ON auth.users;
DROP FUNCTION IF EXISTS create_rsa_user();
```

## Steps
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/wthlnrogmwodfbekghsj
2. Click on "SQL Editor" in the left sidebar
3. Click "+ New Query"
4. Paste the SQL code above
5. Click "Run" (the play button)
6. You should see a success message

## Why This Works
- The `rsa_users` table is not currently used by the application
- The trigger was causing unnecessary database errors during signup
- By dropping the trigger and the function, auth signup will work without issues
- The `rsa_users` table remains available for future use if needed

## After Applying This Fix
- Signup and signin should work correctly
- Users can now authenticate with email/password
- Recovery codes and other RSA user data can be added later

## Recovery
If you need the rsa_users functionality in the future, you can recreate the trigger and function after implementing proper RLS policies or moving the creation logic to the application layer.
