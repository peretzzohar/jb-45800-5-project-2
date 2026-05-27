# Crypto Tracker + AI Recommendation

A React + TypeScript + Vite app for tracking cryptocurrencies and getting AI BUY/HOLD/SELL recommendations.

## Stack

- React 19
- TypeScript
- Redux Toolkit
- Vite
- CoinGecko APIs (market data)
- NVIDIA Inference API (AI recommendation)

## Run Locally (Teacher Friendly)

### 1) Requirements

- Node.js 20+ (recommended)
- npm

### 2) Install

```bash
npm install
```

### 3) Environment setup

Copy `.env.example` to `.env.development` and keep default values unless needed.

Windows (PowerShell):

```powershell
Copy-Item .env.example .env.development
```

macOS/Linux/Git Bash:

```bash
cp .env.example .env.development
```

Optional: set `VITE_NVIDIA_KEY` in `.env.development`.
- If set, AI recommendations work immediately.
- If not set, user can paste API key in the Recommendation page UI.

For production deployment (recommended), set a server-side environment variable:

- `NVIDIA_API_KEY=your_real_key`

This key should be configured in your hosting provider (for example Vercel project settings), not committed to the repo.

### 4) Start dev server

```bash
npm run dev
```

Open: `http://localhost:5173`

## Available Scripts

- `npm run dev` - start local dev server
- `npm run build` - type-check and build production assets
- `npm run test` - run unit tests
- `npm run preview` - preview production build locally
- `npm run lint` - run ESLint

## How AI Recommendation Works

- Frontend calls `/api/recommendation`
- Serverless API route in `api/recommendation.js` calls NVIDIA securely using `NVIDIA_API_KEY`
- In local Vite development, the app falls back to direct `/api/nvidia/v1/chat/completions` if the serverless route is not running
- Vite proxy forwards `/api/nvidia/*` to `https://integrate.api.nvidia.com`

## Quick Demo Flow (For Grading)

1. Open Home page and track one or more coins.
2. Open Recommendation page.
3. Provide NVIDIA API key in input (unless `VITE_NVIDIA_KEY` is set).
4. Click "Get AI Recommendations".
5. App shows BUY/HOLD/SELL plus short explanation for the selected tracked coin.

## Grading Checklist

- App starts with `npm run dev` without backend setup.
- Coin list loads from CoinGecko.
- User can track at least one coin from Home.
- Recommendation page accepts API key and returns BUY/HOLD/SELL result.
- `npm run build` completes successfully.
- `npm run test` has passing tests.

## Deployment

Deployment URL: add your live URL here before submission.

Suggested platforms:

- Vercel
- Netlify

After deployment, confirm that the Recommendation page works by entering a valid NVIDIA API key in the UI.

### Vercel deployment checklist

1. Import this repo into Vercel.
2. Set environment variable `NVIDIA_API_KEY` in project settings.
3. Deploy.
4. Verify `POST /api/recommendation` returns content and Recommendation page works without exposing secret keys.

## Project Notes

- This project intentionally runs frontend-only.
- The `backend/` folder was removed.
- `dist/` is generated output from `npm run build`.
