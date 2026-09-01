# RSA App Deployment Guide

## Frontend (Already Live)

The frontend is deployed on Netlify at:
**https://harmonious-cassata-9d5220.netlify.app**

## Backend Setup

### Local Development

1. Set up backend environment:
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

2. Start backend server:
   ```bash
   npm start
   ```
   Backend runs on `http://localhost:3001`

3. Frontend automatically connects to localhost:3001 (see `.env.local`)

### Production Deployment (Railway)

1. **Create Railway Account**
   - Go to https://railway.app
   - Sign in with GitHub

2. **Deploy Backend**
   - Click "New Project" → "Deploy from GitHub"
   - Select your RSA repo
   - Railway will detect the `backend/` directory
   - Add environment variable in Dashboard:
     - Key: `ANTHROPIC_API_KEY`
     - Value: Your Anthropic API key

3. **Update Frontend**
   - Get your Railway backend URL from the Dashboard
   - Rebuild and redeploy frontend with:
     ```bash
     REACT_APP_BACKEND_URL=https://your-railway-url.railway.app npm run build
     ```
   - Deploy to Netlify:
     ```bash
     netlify deploy --prod --dir=dist
     ```

   Or set as Netlify environment variable and rebuild:
   - Go to Netlify Dashboard → Site Settings → Build & Deploy → Environment
   - Add `REACT_APP_BACKEND_URL=https://your-railway-url.railway.app`

## Testing AI Features

Once backend is running (locally or deployed), test in the app:

1. Go to Step B (Beliefs)
2. Click "Get AI Suggestions" button
3. Should get 3 belief suggestions from Claude
4. In Step D, click "Check My Rewrite" to validate your rewrite

## Troubleshooting

**"Couldn't reach the AI just now"**
- Check if backend is running
- Check `REACT_APP_BACKEND_URL` matches your backend deployment
- Check CORS is enabled (it is in server.js)
- Check `ANTHROPIC_API_KEY` is set in backend

**Backend won't start**
- Verify Node.js is installed: `node --version`
- Install dependencies: `npm install`
- Check for port conflicts: `ANTHROPIC_API_KEY=test npm start`

## Architecture

```
Frontend (Netlify)
    ↓
    └→ Backend (Railway)
        ↓
        └→ Claude API (Anthropic)
```

The backend securely proxies all API calls—your API key never reaches the frontend.
