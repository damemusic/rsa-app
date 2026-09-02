# RSA App Development Rules

## HARD STOP: No Local Development Server

**DO NOT** start, configure, or use any local development server (localhost:5173, npm run dev, or equivalent).

**REASON:** Local dev environment creates misalignment with production. All testing and development work must use the live deployed version only.

**ALWAYS USE:** https://rsa-app.netlify.app (or current production URL)

### If You Start to Do Local Dev Work:
- Stop immediately
- Delete any local dev files created
- Use the live URL instead
- Do not apologize, just switch to live URL

## Deployment
- Code changes → Push to GitHub main branch → Netlify auto-deploys
- No local testing. Test on the live URL after deployment.
- Backend: https://rsa-backend-production-7b95.up.railway.app
- Database: Supabase project wthlnrogmwodfbekghsj
