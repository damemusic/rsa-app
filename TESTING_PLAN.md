# Phase 4 Data Persistence - Testing Plan

## Overview

This plan verifies that the questionnaire responses persist across logout/login cycles in the RSA app. Execute this plan AFTER the Netlify frontend build deploys the latest code.

## Prerequisites

- Netlify build deployed (hash should NOT be `index-C2z9pQrd.js`)
- Railway backend deployed with debug endpoints
- Supabase database accessible
- Test Supabase account credentials available

## Test Scenarios

### Scenario 1: Fresh User Signup to Profile Persistence

**Goal**: Verify that a new user can sign up, complete questionnaire, save profile, logout, and restore profile on login.

**Setup**:
- Use a unique test email (e.g., `test-phase4-{timestamp}@example.com`)
- Unique passwords for each test

**Steps**:

1. **Signup**
   - [ ] Navigate to app (https://rsa-app.netlify.app)
   - [ ] Click "Sign Up"
   - [ ] Enter unique email and password
   - [ ] Check browser console for: `[Auth] Signup successful for user: {UUID}`
   - [ ] Expect: See "Sign up successful" message
   - [ ] Expect: Redirected to "Sign In" tab after 3 seconds

2. **Verify Email** (if required)
   - [ ] Check email for verification link
   - [ ] Click verification link
   - [ ] Confirm email verified

3. **Sign In**
   - [ ] Enter test email and password
   - [ ] Check browser console for: `[Auth] Signin successful for user: {UUID}`
   - [ ] Expect: Redirected to questionnaire page
   - [ ] Expect: No "bad nonce size" errors in console

4. **Complete Questionnaire**
   - [ ] Fill all 5 questions with test responses (e.g., "Test answer Q1")
   - [ ] Click "Save & Continue" on final question
   - [ ] Check browser console for:
     - `[ProfileOnboarding] Profile saved`
     - No decryption errors
   - [ ] Expect: Profile saved successfully

5. **Verify Profile Saved**
   - [ ] Use debug endpoint: `GET /api/debug/profile?userId={UUID}`
   - [ ] Expect: Profile found with encrypted_data
   - [ ] Expect: encrypted_data length > 500 bytes
   - [ ] Expect: encrypted_data is valid base64 (no quotes)

6. **Sign Out**
   - [ ] Click "Sign Out" button
   - [ ] Check browser console for: `[Auth] Signout successful`
   - [ ] Expect: Redirected to Sign In page

7. **Sign Back In**
   - [ ] Enter same test email and password
   - [ ] Check browser console for:
     - `[Auth] Signin successful for user: {UUID}`
     - `[App] Profile found: true`
     - No decryption errors
   - [ ] Expect: Profile loads without "bad nonce size" error

8. **Verify Profile Restored**
   - [ ] Expect: Redirected to "Check In" page (not questionnaire page)
   - [ ] Verify profile data is displayed correctly
   - [ ] Check browser console for: `[App] Profile loaded and decrypted`

**Expected Outcome**: ✓ Profile persists across logout/login

---

### Scenario 2: Recovery Code Consistency

**Goal**: Verify that recovery code derivation is consistent across sessions.

**Prerequisites**: Complete Scenario 1 first

**Steps**:

1. **Inspect Recovery Code in First Session**
   - [ ] After signup in Scenario 1, open browser DevTools console
   - [ ] User ID should be visible in signup logs: `{UUID}`
   - [ ] Calculate expected recovery code: `btoa('{UUID}').substring(0, 20)`
   - [ ] Record this value

2. **Sign Out and Sign In**
   - [ ] Sign out
   - [ ] Sign in with same credentials
   - [ ] Look for recovery code derivation in logs (if logging is enabled)

3. **Verify Consistency**
   - [ ] Profile decryption should succeed (means recovery codes matched)
   - [ ] No "bad nonce size" errors in console

**Expected Outcome**: ✓ Recovery code derived consistently

---

### Scenario 3: Questionnaire Data Integrity

**Goal**: Verify that all questionnaire responses are saved and restored correctly.

**Prerequisites**: Complete Scenario 1 with specific test data

**Steps**:

1. **Use Test Data**
   - [ ] Q1: "Specific stress trigger - TEST1"
   - [ ] Q2: "Coping mechanism - TEST2"
   - [ ] Q3: "Support system - TEST3"
   - [ ] Q4: "Personal strength - TEST4"
   - [ ] Q5: "Growth area - TEST5"

2. **Save and Logout/Login**
   - [ ] Follow Scenario 1 steps 4-8

3. **Verify Data Restored**
   - [ ] After login, navigate to profile/questionnaire page (if available in UI)
   - [ ] Verify all test data is displayed correctly
   - [ ] Or inspect browser localStorage for `useRSAStore` state
   - [ ] Look for profile data matching test values

**Expected Outcome**: ✓ All questionnaire responses restored accurately

---

### Scenario 4: Multiple Users

**Goal**: Verify that multiple test users can have independent profiles without interference.

**Steps**:

1. **Create User 1**
   - [ ] Email: `test-user1-{timestamp}@example.com`
   - [ ] Complete questionnaire with distinctive data
   - [ ] Save profile

2. **Sign Out**
   - [ ] Sign out User 1

3. **Create User 2**
   - [ ] Email: `test-user2-{timestamp}@example.com`
   - [ ] Complete questionnaire with DIFFERENT distinctive data
   - [ ] Save profile

4. **Verify Profiles Are Independent**
   - [ ] Sign out User 2
   - [ ] Sign in as User 1
   - [ ] Verify User 1's data is shown (not User 2's)
   - [ ] Sign out
   - [ ] Sign in as User 2
   - [ ] Verify User 2's data is shown (not User 1's)

**Expected Outcome**: ✓ Each user has independent persistent profile

---

## Automated Tests

### Backend Verification Script

Run this to verify backend state:

```bash
node scripts/inspect-profiles.js
# Should show profiles for test users with valid encrypted_data
```

### Cleanup Script (if needed)

If malformed profiles are found:

```bash
node scripts/cleanup-profiles.js
# Should report profiles cleaned up
```

---

## Error Scenarios to Monitor

### ✗ "bad nonce size" Error

**Cause**: Decryption attempted on malformed data or with wrong recovery code

**Action**: 
- Check browser console logs
- Check database with debug endpoint
- Run cleanup if malformed data found

### ✗ "Failed to decrypt profile" Error

**Cause**: Encrypted data is corrupted or recovery code mismatch

**Action**:
- Same as above
- Verify recovery code consistency in code

### ✗ "Failed to save profile" Error

**Cause**: Backend error or network issue

**Action**:
- Check browser network tab for request/response
- Check Railway backend logs
- Verify Supabase is accessible

### ✗ Profile Not Found After Login

**Cause**: Data was saved but filtering logic hiding it

**Action**:
- Check `getProfile()` logs in browser console
- Verify encrypted_data was actually saved to database
- Check if data is being filtered out (length < 20)

---

## Success Criteria

### Phase 4 Complete When:

- [ ] Scenario 1: User can signup → questionnaire → save → logout → login → profile loads (✓)
- [ ] Scenario 2: Recovery code derived consistently across sessions (✓)
- [ ] Scenario 3: All questionnaire data integrity preserved (✓)
- [ ] Scenario 4: Multiple users have independent profiles (✓)
- [ ] No "bad nonce size" errors in console after filtering deployed
- [ ] Browser console shows profile load logs (no errors)
- [ ] Database contains valid encrypted profiles for test users
- [ ] Cleanup script shows 0 malformed profiles

---

## Notes

- Each test should use unique emails to avoid conflicts with previous tests
- Include timestamps in test emails for easy tracking
- Keep browser DevTools console open to monitor logs
- Don't clear local storage between logout/login (persistence test)
- Save screenshots of success states for documentation

---

## Rollback Plan (if issues found)

1. Revert latest frontend commits on Netlify
2. Restore from backup if database corruption suspected
3. Use cleanup script to remove malformed profiles
4. Investigate root cause before retesting

---

## Timeline

- Build deployment: Pending (watch git log for newest commits)
- Scenario 1 (basic persistence): ~5 minutes
- Scenario 2 (recovery code): ~3 minutes
- Scenario 3 (data integrity): ~5 minutes
- Scenario 4 (multiple users): ~5 minutes
- **Total expected time**: ~20 minutes once build deployed
