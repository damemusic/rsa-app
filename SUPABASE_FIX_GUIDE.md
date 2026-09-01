# Supabase Trigger Fix Guide

## Issue
The signup flow was failing with "Database error saving new user" because multiple triggers on the `auth.users` table were trying to create records in other tables with overly restrictive RLS policies. These triggers were:
1. `on_auth_user_created_rsa` - from the rsa-app project (tried to create rsa_users records)
2. `on_auth_user_created` - from the groupchat project (tried to create records in groupchat tables)

## Solution
Execute the following SQL in your Supabase SQL Editor to drop the problematic triggers:

```sql
-- Drop triggers that were causing signup to fail
DROP TRIGGER IF EXISTS on_auth_user_created_rsa ON auth.users;
DROP FUNCTION IF EXISTS create_rsa_user();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
```

## Steps
1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/wthlnrogmwodfbekghsj
2. Click on "SQL Editor" in the left sidebar
3. Click "+ New Query"
4. Paste the SQL code above
5. Click "Run" (the play button)
6. You should see a success message

## Why This Works
- Both triggers were firing on auth.users INSERT events, but the RLS policies on their target tables didn't allow the auth system to create records
- The `rsa_users` table is not currently used by the application
- The groupchat `on_auth_user_created` trigger shouldn't be active in the rsa-app Supabase project
- By dropping both triggers, auth signup now completes without errors
- The target tables remain available if needed in the future with proper RLS policies

## After Applying This Fix
- Signup and signin should work correctly
- Users can now authenticate with email/password
- Recovery codes and other RSA user data can be added later

## Recovery
If you need the rsa_users functionality in the future, you can recreate the trigger and function after implementing proper RLS policies or moving the creation logic to the application layer.
