# YT Jam

Real-time collaborative YouTube listening. Make a room, share the code, listen together.

> naman asked me for spotify jam, i did not have premium.

Stack: React (Vite) + Tailwind on the frontend, Node/Express + Socket.IO on the backend, plus a scikit-learn genre classifier and an Electron desktop companion app. Backend is self-hosted right now (more on that below), frontend's on GitHub Pages.

## running it locally

```bash
npm run install:all
```

copy `server/.env.example` to `server/.env` and drop in a YouTube Data API key (Google Cloud Console -> APIs & Services -> enable "YouTube Data API v3" -> Create Credentials). copy `client/.env.example` too if your server isn't on the default port.

```bash
npm run dev
```

client's on :5173, server on :3001.

## the desktop companion

`desktop-pet/` is a separate Electron app — a transparent always-on-top window that floats over your desktop and shows the genre sprite reacting live. Tried doing this in-browser first with Picture-in-Picture but browsers won't give you real transparency for arbitrary content, only video. So it's a proper native app instead.

```bash
cd desktop-pet
npm install
npm start
```

paste in your backend url + room code and it joins as a silent spectator (won't show up in the participant list). there's a `ytjam://` protocol link on the site itself ("Open Companion" button) that does this for you automatically once the app's installed once.

## deploying

Every free host that can run a persistent WebSocket process now wants a card on file (Render, Koyeb, Railway — just an auth hold, not an actual charge, but still). Glitch used to be the no-card option but it shut down. So for now the backend just runs on my own machine and gets exposed through a Cloudflare Tunnel, which is genuinely free with no signup.

backend side:
1. `npm install --prefix server`, fill in `.env`, `npm start --prefix server`
2. install cloudflared, run `cloudflared tunnel --url http://localhost:3001`
3. that gives you a public https url — that's your backend, paste it wherever needed

frontend side: GitHub Pages, source set to Actions in repo settings, with `VITE_SERVER_URL` set as a repo variable to whatever the tunnel url currently is. push to main and it builds+deploys automatically.

annoying part: the tunnel url changes every time it restarts (sleep/wake, reboot, whatever), so there's a script (`scripts/start-ytjam.ps1`) wired up as a scheduled task that restarts the server+tunnel, grabs the new url, and pushes it to the repo variable + triggers a redeploy on its own. mostly hands-off but still a self-hosted setup at the end of the day, not a real always-on host.

if/when this moves to an actual host, Render's the obvious pick — just needs a card added and the CI/CD basically writes itself from there.

## a few things worth knowing

- the room host's player is authoritative for sync — broadcasts position every 2s, everyone else corrects if they drift more than 2s. unless "everyone controls playback" is on, then anyone's play/pause counts.
- search happens server-side so the YouTube API key never reaches the client, and repeated queries get cached for a bit.
- rooms live in memory on the Node process and get cleaned up after 30 min of nobody being active. this is also why it can't just run on Lambda — socket.io needs a connection that stays open, and a stateless function would forget the room the second the invocation ends.
- genre classifier is trained in python (TF-IDF + logistic regression, see `ml/`) but the actual inference is just a dot product, so it's reimplemented in plain JS in the server — no python needed at runtime.
