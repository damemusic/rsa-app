# Quick Start: Backend + Frontend

## Local Testing (Before Deployment)

### 1. Set up Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add: ANTHROPIC_API_KEY=sk-ant-...
npm install  # already done, but just in case
npm start
```

Your backend is now running at `http://localhost:3001`

### 2. Start Frontend Dev Server

In another terminal:

```bash
npm run dev
```

Frontend connects to backend automatically (see `.env.local`)

### 3. Test AI Features

1. Go to http://localhost:5173
2. Enter a situation and click Begin
3. On Step B, click "Get AI Suggestions" — should show 3 beliefs from Claude
4. On Step D, answer some rules as "No" then click "Check My Rewrite" — should get AI feedback

## Deploy to Production

### Backend on Railway

```bash
# 1. Push to GitHub (if not already there)
git add .
git commit -m "Add backend proxy"
git push

# 2. Go to https://railway.app
# 3. New Project → Deploy from GitHub → Select repo
# 4. Railway detects backend/ automatically
# 5. Add env var: ANTHROPIC_API_KEY=sk-ant-...
# 6. Copy your Railway URL (e.g., https://rsa-backend-production.railway.app)
```

### Update Frontend

```bash
# Option A: Set env var and rebuild
export REACT_APP_BACKEND_URL=https://your-railway-url.railway.app
npm run build

# Option B: Push to git, let Netlify rebuild with env var set

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

That's it! Your app now has live Claude AI features.
