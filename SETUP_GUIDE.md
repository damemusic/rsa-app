# RSA App Setup Guide (User Profile + Check-in System)

## What's New

The app now includes:
1. **User Setup** — Recovery code generation (encrypted locally)
2. **Profile Onboarding** — AI-driven questionnaire to understand the user
3. **Check-in System** — Daily/weekly prompts triggering full RSA flow
4. **Supabase Integration** — Encrypted data storage (user-side encryption)

## Setup Steps

### 1. Set Up Supabase Database

You're using the same Supabase project as GroupChat (`wthlnrogmwodfbekghsj`).

**Create the RSA tables:**

1. Go to your Supabase project: https://app.supabase.com
2. Click **SQL Editor**
3. Create a new query and paste the entire contents of:
   ```
   /Users/trader/rsa-app/supabase/migrations/001_rsa_schema.sql
   ```
4. Click **Run**

This creates:
- `rsa_users` — User accounts + recovery code hash
- `rsa_profiles` — Encrypted user profiles
- `rsa_check_ins` — Check-in logs (compliance tracking)
- `rsa_entries` — Encrypted RSA entries
- `rsa_pos` — Probation officers
- `rsa_po_assignments` — User-to-PO assignments

### 2. Get Supabase Credentials

From your Supabase project:
1. Go to **Project Settings** → **API**
2. Copy:
   - `Project URL` → This is `SUPABASE_URL`
   - `anon public` → This is `SUPABASE_ANON_KEY`

### 3. Update Backend Environment

1. Edit `/Users/trader/rsa-app/backend/.env`:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   PORT=3001
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

2. Also update Railway:
   - Go to your Railway project (rsa-app-backend)
   - Add environment variables:
     - `SUPABASE_URL` = Your project URL from Supabase
     - `SUPABASE_ANON_KEY` = Your anon public key from Supabase

### 4. Local Testing

**Terminal 1 — Backend:**
```bash
cd /Users/trader/rsa-app/backend
npm start
```
Should run on `http://localhost:3001`

**Terminal 2 — Frontend:**
```bash
cd /Users/trader/rsa-app
npm run dev
```
Should run on `http://localhost:5173`

### 5. Test User Flow

1. **Setup** — Generate recovery code, copy it
2. **Profile** — Answer 5 questions (Claude analyzes answers)
3. **Check-in** — See your check-in schedule (daily first week, then weekly)
4. **RSA Flow** — Full ABCDE entry, saved encrypted

All data encrypted client-side before sending to backend.

## Architecture

```
User (Browser)
  ↓
  └→ Recovery Code → Derive Encryption Key (PBKDF2)
     └→ Encrypt Profile & Entries locally
        └→ Send to Backend

Backend
  ↓
  └→ Store encrypted blobs in Supabase (can't read them)
  └→ Track check-in dates (compliance)
  └→ Claude API calls (belief suggestions, rewrite feedback)

PO Dashboard (Future)
  ↓
  └→ See: User name, check-in history, compliance %
  └→ Cannot see: Profile, beliefs, RSA entries (encrypted)
```

## Deployment

### Netlify (Frontend)
Already deployed. Add env var:
- `REACT_APP_BACKEND_URL=https://rsa-backend-production-7b95.up.railway.app`

Then redeploy:
```bash
npm run build && netlify deploy --prod --dir=dist
```

### Railway (Backend)
Already deployed. Just add Supabase env vars in Railway dashboard.

## Troubleshooting

**"Failed to save profile"**
- Check Supabase connection: is `SUPABASE_URL` and `SUPABASE_ANON_KEY` set?
- Check backend logs: `preview_logs` on Railway

**"Couldn't reach the AI"**
- Check `ANTHROPIC_API_KEY` is set in Railway
- Check Claude endpoint working: `curl https://backend-url.railway.app/health`

**Encryption errors**
- Check browser console (F12) for details
- Make sure recovery code is being saved correctly

## Next: PO Dashboard

When ready, create:
1. PO login page (Supabase auth)
2. Dashboard showing assigned users + compliance
3. Escalation alerts (encrypted, no content revealed)

See comments in `/Users/trader/rsa-app/backend/server.js` for PO endpoints already built.
