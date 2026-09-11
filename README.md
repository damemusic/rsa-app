# RSA App

Rational Self-Analysis check-in app: an AI-guided conversation that walks a
person through a situation, the beliefs attached to it, and a reframe, and
stores each check-in encrypted in a Decision Log.

## Where it runs

| Piece | Where |
|-------|-------|
| Frontend (React + Vite) | https://harmonious-cassata-9d5220.netlify.app — Netlify project `harmonious-cassata-9d5220`, auto-deploys from `main` |
| Backend (Express) | https://rsa-backend-production-7b95.up.railway.app — Railway project `rsa-app-backend` |
| Database + auth | Supabase project `wthlnrogmwodfbekghsj` |

There is no local development server for this project; see `CLAUDE.md`.

## Layout

```
src/components/   Screens. AIGuidedRSA is the main check-in flow;
                  StepFlow + Summary are the "Review & Adjust" path out of it.
src/services/     api.ts wraps every backend call with the user's access token.
                  encryption.ts does client-side AES-GCM on entries and profiles.
src/stores/       Zustand store, persisted to localStorage.
backend/server.js Express API. Runs on the Supabase service role key, so every
                  /api route is behind requireAuth and an ownership check.
supabase/migrations/  Schema history.
```

## Data handling

Check-ins and profile answers are encrypted in the browser before they are sent;
the server stores ciphertext it cannot read. The key is derived from the user's
recovery code, which is derived from their Supabase user id.

## Deploying

Push to `main`. Netlify builds the frontend, Railway redeploys the backend.
Backend environment variables are documented in `backend/.env.example`.
