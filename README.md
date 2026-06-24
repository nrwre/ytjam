# YT Jam

Real-time collaborative YouTube listening. Create a room, share the code, and listen in sync with friends.

## Stack
React (Vite) + Tailwind · Node/Express + Socket.IO · YouTube Data API v3 · Render (free tier) · GitHub Actions

## Local development

```bash
npm run install:all
```

Create `server/.env` from `server/.env.example` and add a YouTube Data API key
(Google Cloud Console → APIs & Services → enable "YouTube Data API v3" → Create Credentials → API Key).

Create `client/.env` from `client/.env.example` if your server runs on a non-default port/URL.

```bash
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:3001

## Deployment (Render, free tier)

This repo includes a [`render.yaml`](render.yaml) Blueprint defining two free services:

- `yt-jam-server` — Node web service running the Socket.IO backend
- `yt-jam-client` — static site serving the built React app

### One-time setup

1. Push this repo to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com), click **New → Blueprint**, connect the repo. Render reads `render.yaml` and creates both services.
3. Set environment variables in the Render dashboard:
   - `yt-jam-server`: `YOUTUBE_API_KEY`, `CLIENT_URL` (the deployed client URL, e.g. `https://yt-jam-client.onrender.com`)
   - `yt-jam-client`: `VITE_SERVER_URL` (the deployed server URL, e.g. `https://yt-jam-server.onrender.com`)
4. Trigger a manual deploy once so both URLs exist, then fill in the cross-referenced env vars above and redeploy.

### CI/CD via GitHub Actions

[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) runs install/build checks on every push and PR, then on `main` triggers Render deploy hooks.

To wire it up:
1. In Render, open each service → **Settings → Deploy Hook**, copy the URL.
2. In your GitHub repo → **Settings → Secrets and variables → Actions**, add:
   - `RENDER_BACKEND_DEPLOY_HOOK`
   - `RENDER_FRONTEND_DEPLOY_HOOK`

Render also auto-deploys on push to the connected branch by default, so the deploy hooks are a redundant/explicit trigger — useful if you ever disable auto-deploy.

## Architecture notes

- **Host-authoritative sync**: the room host's player emits its position every 2s; other clients seek if drift exceeds 2 seconds. Avoids split-brain state.
- **Server-side search**: keeps the YouTube API key off the client and caches repeated queries for 10 minutes.
- **In-memory room state**: rooms live in the Node process's memory and are cleaned up after 30 minutes of inactivity. This is why the backend needs a persistent process (Render/Railway) rather than a stateless function (Lambda).
