# RSA App - Full Review & Issues Found

**Date:** 2026-09-05  
**Status:** ⚠️ CRITICAL ISSUES FOUND

---

## Issue #1: Step A Missing Back Button

**Current State:**
- StepFlow.tsx lines 90-94 only show back button when `step > 0`
- Step A is step 0, so no back button appears
- Users cannot go back from Step A to CheckIn view

**Impact:** Users get stuck in StepFlow with no way to exit

**Fix Needed:** 
- Add a "Cancel" button on step 0 that goes back to 'checkin' view
- OR show back button even on step 0 to go back to previous view

---

## Issue #2: AI Logic Not Being Used

**Current State:**
- AIGuidedRSA.tsx exists with AI conversation flow (lines 1-240)
- But users are directed to basic StepFlow instead
- No logic to detect if user should get AI experience vs basic RSA

**Problem:** 
- CheckIn component (line 56) sets view to 'flow' which renders StepFlow
- Never sets view to 'ai-rsa' which would show AIGuidedRSA
- The aiConversation service exists but isn't integrated into the flow

**Impact:** Feature #1 (Save Progress & Exit) appears in AIGuidedRSA but users never reach it

**Fix Needed:**
- Add logic to determine AI vs basic flow (maybe preference or feature gate)
- Route to 'ai-rsa' view when user chooses AI-guided experience
- OR route ALL users to 'ai-rsa' view instead of basic 'flow'

---

## Issue #3: CRITICAL - No Client-Side Encryption Before Save

**Current State:**
- Encryption.ts has `encryptData()` and `decryptData()` functions ready to use
- Recovery code exists in currentUser
- BUT saveEntry() and saveProgressEntry() send UNENCRYPTED data to backend

**Evidence:**
- useRSAStore.ts line 235-241: saveEntry() only updates Zustand state
- entries.ts line 5-29: saveProgressEntry() sends entry object directly without encryption
- Backend server.js line 451: stores entry as-is in `encrypted_data` column

**This means:**
```
Client sends: { a: "facts", beliefs: [...], emotions: [...] }
Stored in DB: encrypted_data: { a: "facts", beliefs: [...], emotions: [...] }
                              ↑ NOT ENCRYPTED - plaintext in JSONB column!
```

**Impact:** All user RSA entries are stored UNENCRYPTED in Supabase - major privacy violation

**Fix Needed:**
1. Import encryptData() in entries.ts
2. Call encryptData(entry, userRecoveryCode) before sending to backend
3. Backend receives encrypted string and stores it as-is
4. When retrieving, frontend calls decryptData() to get plaintext

---

## Issue #4: saveEntry() Never Calls Backend

**Current State:**
- Summary.tsx line 10: calls saveEntry() on "Save to Decision Log"
- useRSAStore.ts line 235-241: saveEntry() only updates Zustand state locally
- Never calls saveProgressEntry() which would send to backend

**Evidence:**
```typescript
// Current implementation (WRONG)
saveEntry: () =>
  set((state) => ({
    entries: [...state.entries, state.currentEntry],  // LOCAL ONLY
    currentEntry: freshRSA(),
    step: 0,
    view: 'checkin',
  })),
```

**What Should Happen:**
```
User clicks "Save to Decision Log"
  ↓
saveEntry() should:
  1. Encrypt entry with recovery code
  2. Call saveProgressEntry(userId, entry, 'completed')
  3. Wait for backend to confirm save to Supabase
  4. Update local state
  5. Redirect to Journal
```

**Impact:** 
- "Save to Decision Log" saves locally only
- Entries don't persist to database
- On page reload, entries disappear
- Journal view is empty (no entries to display)

**Fix Needed:** Make saveEntry() async and call backend API before updating state

---

## Issue #5: Backend Storing Wrong Data Structure

**Current State:**
- Backend line 451: `encrypted_data: entry`
- This stores the ENTIRE entry object (which includes unencrypted fields)
- Supabase schema expects encrypted_data to be a single encrypted string

**What Should Happen:**
```javascript
// Receive from client
{ encrypted_data: "U2FsdGVkX1..." }  // Base64 encrypted JSON

// Store in Supabase
encrypted_data: "U2FsdGVkX1..."     // Just the encrypted string
```

**Current Reality:**
```javascript
// Receives and stores as-is
encrypted_data: {
  id: "...",
  situation: "...",
  a: "...",
  beliefs: [...],
  emotions: [...]
}  // Entire object, not encrypted
```

**Fix Needed:** Backend should just pass through encrypted_data string to Supabase

---

## Issue #6: No AI Conversation Integration

**Current State:**
- aiConversation.ts service exists (should be in services/)
- AIGuidedRSA.tsx imports `sendAIMessage` function
- But CheckIn → flow routes to StepFlow, never to AIGuidedRSA

**Fix Needed:** Route users to AI-guided RSA flow, or add UI option to choose

---

## Summary of Required Fixes

### Priority 1 (Data Loss): 
- [ ] Implement client-side encryption in saveProgressEntry()
- [ ] Make saveEntry() call backend API before local state update
- [ ] Ensure entries persist to Supabase database

### Priority 2 (Feature Completeness):
- [ ] Implement AI-guided RSA flow routing
- [ ] Add back/cancel button to Step A

### Priority 3 (Validation):
- [ ] Update backend to validate entry structure
- [ ] Add error handling for encryption failures
- [ ] Log entry saves to track successful persistence

---

## Testing Required After Fixes

1. **Encryption Test:**
   - Fill out complete check-in
   - Click "Save to Decision Log"
   - Check Supabase console - encrypted_data should be base64 string, not JSON object
   
2. **Persistence Test:**
   - Fill out check-in, save it
   - Reload page
   - Verify entry appears in Journal
   
3. **AI Flow Test:**
   - User selects AI-guided experience
   - "Save Progress & Exit" button appears
   - Click button - entry saves with status='in_progress'
   - Entry appears in Journal with "⏸ In Progress" badge

4. **Decryption Test:**
   - Load an in-progress entry via "Resume"
   - Data should be decrypted and appear correctly

---

## Files That Need Changes

- `src/services/entries.ts` - Add encryption before backend call
- `src/stores/useRSAStore.ts` - Make saveEntry() async and call API
- `src/components/Summary.tsx` - Handle async saveEntry()
- `src/components/StepFlow.tsx` - Add back/cancel button for step 0
- `src/components/CheckIn.tsx` - Route to AI flow or add flow option
- `backend/server.js` - Validate encrypted_data is string, not object
