# YT Jam

Real-time collaborative YouTube listening. Create a room, share the code, and listen in sync with friends.

> naman asked me for spotify jam, i did not have premium.

## Stack
React (Vite) + Tailwind · Node/Express + Socket.IO · YouTube Data API v3 · Glitch (free, no card, backend) · GitHub Pages (frontend) · GitHub Actions

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

## Deployment (Glitch backend + GitHub Pages frontend, both free, no card required)

### Backend on Glitch

1. Sign up at [glitch.com](https://glitch.com) (no card, ever).
2. **New Project → Import from GitHub** → paste `https://github.com/nrwre/ytjam.git`. Glitch clones the whole repo as the project root and runs `npm install && npm start` automatically (the root [`package.json`](package.json) `start` script installs and starts `server/`).
3. In the Glitch editor, click the `.env` file in the sidebar (create it if missing — it's a special file, never committed to git) and add:
   ```
   YOUTUBE_API_KEY=your_key_here
   CLIENT_URL=https://<your-github-username>.github.io
   ```
4. Your project gets a URL like `https://your-project-name.glitch.me` — copy it.
5. **Enable git-push CD**: in the Glitch editor, open the Terminal (Tools → Terminal) and run `git remote -v` to get your project's git remote URL (format: `https://api.glitch.com/git/your-project-name`, authenticated via your Glitch login token — the full authenticated URL is shown under **Tools → Import/Export → Git, Import and Export**). Copy that full URL.
6. In GitHub repo → **Settings → Secrets and variables → Actions → Secrets**, add:
   - `GLITCH_GIT_REMOTE` = the authenticated git URL from step 5
7. Every push to `main` now triggers [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml)'s `deploy-glitch` job, which force-pushes to Glitch and triggers a redeploy.

Note: Glitch's free tier puts the project to sleep after 5 minutes of inactivity. The next request wakes it up (~10s cold start) — fine for a demo link, not for guaranteed always-on uptime.

### Frontend on GitHub Pages

1. In GitHub repo → **Settings → Pages** → set **Source** to "GitHub Actions".
2. In **Settings → Secrets and variables → Actions → Variables**, add a repository variable:
   - `VITE_SERVER_URL` = your Glitch backend URL from above (e.g. `https://your-project-name.glitch.me`)
3. Push to `main` (or re-run the workflow) — the `build`/`deploy-pages` jobs build the client with that URL baked in and deploy it to Pages automatically.
4. Your app will be live at `https://<your-github-username>.github.io/ytjam/`.

Once both are live, double check `CLIENT_URL` in Glitch's `.env` matches the exact Pages origin from step 4 (for CORS), then it'll pick it up on the next wake/restart.

## Architecture notes

- **Host-authoritative sync**: the room host's player emits its position every 2s; other clients seek if drift exceeds 2 seconds. Avoids split-brain state.
- **Server-side search**: keeps the YouTube API key off the client and caches repeated queries for 10 minutes.
- **In-memory room state**: rooms live in the Node process's memory and are cleaned up after 30 minutes of inactivity. This is why the backend needs a persistent process (Glitch/Render/Railway) rather than a stateless function (AWS Lambda) — Socket.IO needs a long-lived connection, and Lambda would lose room state between invocations.
