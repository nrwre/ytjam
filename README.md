# YT Jam

Real-time collaborative YouTube listening. Create a room, share the code, and listen in sync with friends.

> naman asked me for spotify jam, i did not have premium.

## Stack
React (Vite) + Tailwind · Node/Express + Socket.IO · YouTube Data API v3 · Koyeb (free, backend) · GitHub Pages (frontend) · GitHub Actions

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

## Deployment (Koyeb backend + GitHub Pages frontend, both free, no card required)

### Backend on Koyeb

1. Sign up at [koyeb.com](https://www.koyeb.com) (GitHub login works, no card needed for the free Nano instance).
2. **Create Service → GitHub** → select this repo, branch `main`.
3. Set:
   - **Work directory**: `server`
   - **Build command**: `npm install`
   - **Run command**: `npm start`
   - **Port**: `3001`
   - **Instance**: Free / Nano
4. Add environment variables:
   - `YOUTUBE_API_KEY` — your key
   - `CLIENT_URL` — `https://<your-github-username>.github.io` (the GitHub Pages origin, set after step below)
   - `PORT` — `3001`
5. Deploy. Koyeb gives you a public URL like `https://yt-jam-server-<you>.koyeb.app` — copy it.
6. Koyeb auto-redeploys on every push to `main` — that's your backend CD, no extra config needed.

### Frontend on GitHub Pages

1. In GitHub repo → **Settings → Pages** → set **Source** to "GitHub Actions".
2. In **Settings → Secrets and variables → Actions → Variables**, add a repository variable:
   - `VITE_SERVER_URL` = your Koyeb backend URL from above (e.g. `https://yt-jam-server-you.koyeb.app`)
3. Push to `main` (or re-run the workflow) — [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml) builds the client with that URL baked in and deploys it to Pages automatically.
4. Your app will be live at `https://<your-github-username>.github.io/ytjam/`.

Once both are live, go back to the Koyeb service and make sure `CLIENT_URL` matches the exact Pages URL from step 4 (for CORS), then redeploy the backend.

## Architecture notes

- **Host-authoritative sync**: the room host's player emits its position every 2s; other clients seek if drift exceeds 2 seconds. Avoids split-brain state.
- **Server-side search**: keeps the YouTube API key off the client and caches repeated queries for 10 minutes.
- **In-memory room state**: rooms live in the Node process's memory and are cleaned up after 30 minutes of inactivity. This is why the backend needs a persistent process (Render/Railway) rather than a stateless function (Lambda).
