# YT Jam

Real-time collaborative YouTube listening. Create a room, share the code, and listen in sync with friends.

> naman asked me for spotify jam, i did not have premium.

## Stack
React (Vite) + Tailwind · Node/Express + Socket.IO · YouTube Data API v3 · self-hosted backend via Cloudflare Tunnel · GitHub Pages (frontend) · GitHub Actions

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

## Deployment (current: self-hosted backend + GitHub Pages frontend)

Every "free" cloud host with persistent WebSocket support now either requires a card on file
(Render, Koyeb, Railway, Fly.io — all just a $1 auth hold, never an actual charge) or has shut
down (Glitch). Until a card is added to one of those, the backend runs on a local machine and is
exposed publicly via a [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
— free, no card, no signup required for a quick tunnel.

### Backend (self-hosted)

1. On the machine that will host it: `npm install --prefix server`, fill in `server/.env` (`YOUTUBE_API_KEY`, `CLIENT_URL` — comma-separate multiple allowed origins, e.g. `http://localhost:5173,https://<you>.github.io`), then `npm start --prefix server`.
2. Install `cloudflared` (`winget install --id Cloudflare.cloudflared` on Windows, or see [cloudflared docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) for Mac/Linux).
3. Run `cloudflared tunnel --url http://localhost:3001` — it prints a public HTTPS URL (e.g. `https://random-words.trycloudflare.com`). That's your live backend URL.
4. Caveats: the tunnel URL changes every time you restart `cloudflared` (free "quick tunnels" are ephemeral), and the app is only live while this machine + tunnel process are running. There's no automated CD here — redeploying means pulling the latest code and restarting the Node process locally.

### Frontend on GitHub Pages

1. In GitHub repo → **Settings → Pages** → set **Source** to "GitHub Actions".
2. In **Settings → Secrets and variables → Actions → Variables**, add a repository variable:
   - `VITE_SERVER_URL` = your current Cloudflare Tunnel URL from above
3. Push to `main` (or re-run the workflow) — the `build`/`deploy-pages` jobs build the client with that URL baked in and deploy it to Pages automatically.
4. Your app will be live at `https://<your-github-username>.github.io/ytjam/`.

Whenever the tunnel URL changes (i.e. after restarting `cloudflared`), update the `VITE_SERVER_URL` repo variable and re-run the workflow to rebuild the frontend against the new URL.

### Moving to a real always-on host later

When ready to stop self-hosting, the cleanest path is Render: add a card (auth hold only), then
`render.yaml`-based Blueprint deploy gives both services with proper CI/CD in a few clicks — ask
for it again and it can be restored quickly since the app code itself doesn't need to change.

## Architecture notes

- **Host-authoritative sync**: the room host's player emits its position every 2s; other clients seek if drift exceeds 2 seconds. Avoids split-brain state.
- **Server-side search**: keeps the YouTube API key off the client and caches repeated queries for 10 minutes.
- **In-memory room state**: rooms live in the Node process's memory and are cleaned up after 30 minutes of inactivity. This is why the backend needs a persistent process (Glitch/Render/Railway) rather than a stateless function (AWS Lambda) — Socket.IO needs a long-lived connection, and Lambda would lose room state between invocations.
