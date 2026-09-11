# RSA App Development Rules

## HARD STOP: No Local Development Server

**DO NOT** start, configure, or use any local development server (localhost:5173, npm run dev, or equivalent).

**REASON:** Local dev environment creates misalignment with production. All testing and development work must use the live deployed version only.

**ALWAYS USE:** https://harmonious-cassata-9d5220.netlify.app

### If You Start to Do Local Dev Work:
- Stop immediately
- Delete any local dev files created
- Use the live URL instead
- Do not apologize, just switch to live URL

## Deployment
- Code changes → Push to GitHub main branch → Netlify auto-deploys
- No local testing. Test on the live URL after deployment.
- Frontend: https://harmonious-cassata-9d5220.netlify.app (Netlify project `harmonious-cassata-9d5220`)
- Backend: https://rsa-backend-production-7b95.up.railway.app (Railway project `rsa-app-backend`)
- Database: Supabase project wthlnrogmwodfbekghsj

## Backend API
Every `/api/*` route requires the caller's Supabase access token as
`Authorization: Bearer <token>` and rejects a user id that is not the token's
own. Call the backend from the frontend through `apiFetch()` in
`src/services/api.ts`, never bare `fetch` — a bare call comes back 401.
Operator-only routes (`/api/admin/*`) need the `X-Admin-Secret` header.
