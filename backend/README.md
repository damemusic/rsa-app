# RSA App Backend

Simple Express backend that proxies Claude API calls for the RSA app.

## Setup

1. Create a `.env` file in the backend directory:
   ```
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   PORT=3001
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

The server will run on `http://localhost:3001`

## Endpoints

- `GET /health` - Health check
- `POST /api/claude` - General Claude API calls
  - Body: `{ system: string, messages: Message[], max_tokens: number }`
- `POST /api/suggest-beliefs` - Generate belief suggestions
  - Body: `{ situation: string, stepA: string }`
- `POST /api/check-rewrite` - Validate rewritten beliefs
  - Body: `{ originalBelief: string, failedRuleIds: string[], rewrite: string, ruleDescriptions: Record<string, string> }`

## Deployment

### Railway (Recommended)

1. Connect your GitHub repo to Railway
2. Create a new service from the backend directory
3. Set environment variable `ANTHROPIC_API_KEY` in Railway dashboard
4. Railway will auto-detect and run `npm start`
5. Get the deployed URL and update frontend's `REACT_APP_BACKEND_URL`

### Vercel

1. Deploy backend as a separate Vercel function
2. Update frontend `REACT_APP_BACKEND_URL` to the Vercel deployment URL

### Local Development

Frontend `.env.local`:
```
REACT_APP_BACKEND_URL=http://localhost:3001
```
