# ClawMate (伴靈)

A web-based digital pet you keep as a browser tab or install as a PWA. Pet it, feed it,
swipe and hug it — and chat with it through your own [OpenClaw](https://github.com/openclaw)
agent, with streaming replies and optional push notifications.

## Features

- Photorealistic HD portraits and animals, detailed species-specific Q art, and pixel-art character styles with touch interactions (tap, swipe, long-press)
- Mood/energy stats that react to how you play with the pet
- AI chat over an OpenClaw Gateway, via either transport:
  - **OpenAI-compatible** (`/v1/chat/completions`, SSE streaming) — recommended, most reliable
  - **Gateway WebSocket** (native OpenClaw protocol v4)
- Voice input (Web Speech API) and an in-chat "start new session" button to reset context
- Installable PWA with offline shell caching and web push notifications
- Bilingual UI (Traditional Chinese / English), light/dark/auto theme
- Runs as a plain Node process or via Docker

## Quick start

```bash
npm install
./start.sh          # starts on http://localhost:8080
./stop.sh
```

### Tailscale Serve under a path

ClawMate detects its URL prefix automatically, so it can be mounted below a
shared Tailscale Serve hostname. For the default port used by `start.sh`:

```bash
tailscale serve --bg --https=443 --set-path=/clawmate http://127.0.0.1:2050
```

Open the exact URL with its trailing slash:
`https://<machine>.<tailnet>.ts.net/clawmate/`. API, WebSocket, PWA, and push
notification URLs will all remain under `/clawmate/`.

`start.sh` is idempotent — it stops any previous instance of the app (matched by command
and working directory) before starting a fresh one, and waits for `/api/health` before
reporting success. Logs go to `logs/app.log`, the PID to `.pid`.

### Docker

```bash
./start.sh --docker      # or: docker compose up -d --build
./stop.sh --docker
```

Optionally run OpenClaw itself alongside the app:

```bash
docker compose --profile openclaw up -d
```

then point the app's Settings screen at `http://openclaw:18789`.

## Configuring the OpenClaw connection

Everything can be configured from the in-app **Settings** tab — no restart needed:

- **OpenClaw URL** — where your Gateway lives, e.g. `http://localhost:18789`
- **Token** — the Gateway token (kept server-side only, never sent to the browser)
- **Agent ID** — auto-populated from your OpenClaw instance
- **Transport** — OpenAI-compatible (recommended) or Gateway WebSocket

Use **Test connection** to probe the server; it auto-recommends the transport your
OpenClaw build actually supports.

Alternatively, seed the initial config via environment variables (see `.env.example`):
`PORT`, `DATA_DIR`, `OPENCLAW_URL`, `OPENCLAW_TOKEN`, `OPENCLAW_AGENT_ID`, and the
`VAPID_*` keys for push notifications. Settings saved through the UI are persisted to
`data/settings.json` and take precedence over env vars after first boot.

Every request ClawMate sends to OpenClaw identifies itself with the client name
`ClawMate` (WebSocket handshake `client.id` and a `User-Agent` header on HTTP calls), so
it's recognizable in OpenClaw's own connection/session views.

## Starting a new chat session

Each chat message is tied to a session key (`agent:<agentId>:<sessionId>`) so OpenClaw
can keep conversation context. The **new session** button in the chat view (top-right,
"+" icon) clears the visible chat log and rotates to a fresh `sessionId`, so the agent
starts without carrying over prior context.

## Project layout

```
server/           Express + WebSocket backend
  index.js          HTTP routes, WebSocket relay, push notifications
  openclaw.js        OpenClaw transport adapters (OpenAI-compatible + Gateway WS)
  config.js          Settings persistence (data/settings.json)
  push.js            Web push subscription handling
public/           Static PWA frontend
  index.html
  js/                App logic, chat UI, settings, i18n, pet rendering/interactions
  css/app.css
  sw.js              Service worker (offline shell + push)
data/             Persisted settings and VAPID keys (created on first run)
```

## Requirements

- Node.js >= 20
- An OpenClaw Gateway reachable from wherever ClawMate runs
