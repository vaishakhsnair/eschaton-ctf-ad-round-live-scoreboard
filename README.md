# Eschaton CTF AD Round Live Scoreboard

This app renders the official live scoreboard UI for Eschaton CTF AD Round, with a backend poller.

The backend polls:
- `http://10.66.30.100/competition/scoreboard.json`
- `http://10.66.30.100/competition/status.json`

If remote fetch fails at startup, it falls back to local sample files (`../scoreboard.json`, `../status.json` by default).

## Run Locally

1. Install dependencies:
   `npm install`
2. Copy env template and adjust values if needed:
   `cp .env.example .env.local`
3. Start backend (Terminal 1):
   `npm run dev:backend`
4. Start frontend (Terminal 2):
   `npm run dev:ui`
5. Open:
   `http://127.0.0.1:3000`

Frontend calls `/api/live`; Vite proxies `/api` to `LIVE_SCORE_BACKEND_PROXY_TARGET` (default `http://127.0.0.1:3101`).

## Deploy With Docker Compose

From `live_score/`:

1. Build and start:
   `docker compose up -d --build`
2. Open:
   `http://127.0.0.1:8080`
3. Check health:
   `docker compose ps`
   `docker compose logs -f backend`

Default compose values already target:
- `http://10.66.30.100/competition/scoreboard.json`
- `http://10.66.30.100/competition/status.json`

Override any value via shell env before `docker compose up`, for example:
`LIVE_SCORE_GAMESERVER_BASE_URL=http://10.66.30.100 LIVE_SCORE_UI_PORT=8090 docker compose up -d --build`

## Backend Endpoints

- `GET /api/live` enriched live state for UI
- `GET /api/health` poller status
- `GET /api/raw/scoreboard` last raw scoreboard snapshot
- `GET /api/raw/status` last raw status snapshot

## Production Notes

- Run the backend process in the same network zone as the CTF gameserver.
- Set `LIVE_SCORE_CORS_ORIGIN` to your frontend origin (avoid `*` in production).
- Keep `LIVE_SCORE_REQUEST_TIMEOUT_MS` lower than `LIVE_SCORE_POLL_INTERVAL_MS`.
