#!/usr/bin/env bash
# Start the ClawMate server, replacing any instance that is already running.
#   ./start.sh            native node (default)
#   ./start.sh --docker   docker compose
set -euo pipefail

cd "$(dirname "$0")"
APP_DIR="$(pwd -P)"
PID_FILE="$APP_DIR/.pid"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/app.log"
MODE="node"

[ -f .env ] && set -a && . ./.env && set +a
PORT="${PORT:-2050}"

say() { printf '\033[1;35m[ClawMate]\033[0m %s\n' "$1"; }

# ------------------------------------------------------------- device pairing
# Every browser that talks to ClawMate generates its own random device id and
# stays pending until an operator approves it here - see server/devices.js.
case "${1:-}" in
  approve|revoke)
    [ -n "${2:-}" ] || { echo "usage: ./start.sh $1 <device-id>" >&2; exit 2; }
    node server/devices.js "$1" "$2"
    exit $?
    ;;
  devices)
    node server/devices.js list
    exit $?
    ;;
esac

for arg in "$@"; do
  case "$arg" in
    --docker) MODE="docker" ;;
    --node)   MODE="node" ;;
    *) echo "unknown option: $arg (expected --docker or --node)" >&2; exit 2 ;;
  esac
done

# --------------------------------------------------------------- docker mode
if [ "$MODE" = "docker" ]; then
  command -v docker >/dev/null 2>&1 || { echo "docker is not installed" >&2; exit 1; }
  say "restarting containers via docker compose"
  docker compose down --remove-orphans >/dev/null 2>&1 || true
  docker compose up -d --build
  say "running at http://localhost:${PORT}"
  exit 0
fi

# Find other instances of THIS app (matching by command AND working directory,
# so we never touch an identically-named server from another checkout).
proc_cwd() {
  local pid="$1"
  if [ -r "/proc/$pid/cwd" ]; then
    readlink -f "/proc/$pid/cwd" 2>/dev/null
  elif command -v lsof >/dev/null 2>&1; then
    lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | awk '/^n/{print substr($0,2); exit}'
  fi
}

find_strays() {
  pgrep -f "node .*server/index\\.js" 2>/dev/null | while read -r pid; do
    [ "$pid" = "$$" ] && continue
    [ "$(proc_cwd "$pid")" = "$APP_DIR" ] && echo "$pid"
  done
}

# ---------------------------------------------------- stop what is running
stop_pid() {
  local pid="$1" label="$2"
  kill -0 "$pid" 2>/dev/null || return 0
  say "stopping $label (pid $pid)"
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.25
  done
  say "pid $pid ignored SIGTERM, sending SIGKILL"
  kill -9 "$pid" 2>/dev/null || true
}

if [ -f "$PID_FILE" ]; then
  OLD_PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "${OLD_PID:-}" ] && stop_pid "$OLD_PID" "previous instance"
  rm -f "$PID_FILE"
fi

# Catch instances of THIS app started outside the pid file (e.g. npm start).
while read -r pid; do
  [ -n "$pid" ] || continue
  stop_pid "$pid" "stray instance"
done < <(find_strays)

# The port may still be held by something we do not own - never kill that blindly.
if command -v lsof >/dev/null 2>&1; then
  for _ in $(seq 1 12); do
    PORT_PID="$(lsof -ti tcp:"$PORT" -sTCP:LISTEN 2>/dev/null | head -n1 || true)"
    [ -z "$PORT_PID" ] && break
    sleep 0.25
  done
  if [ -n "${PORT_PID:-}" ]; then
    if [ "${FORCE_PORT:-0}" = "1" ]; then
      stop_pid "$PORT_PID" "process holding port $PORT"
    else
      echo "port $PORT is held by pid $PORT_PID, which was not started by this app." >&2
      echo "Free it yourself, pick another PORT, or re-run with FORCE_PORT=1 to kill it." >&2
      exit 1
    fi
  fi
fi

# ------------------------------------------------------------------- start
command -v node >/dev/null 2>&1 || { echo "node is not installed" >&2; exit 1; }
[ -d node_modules ] || { say "installing dependencies"; npm install; }

mkdir -p "$LOG_DIR" "${DATA_DIR:-$APP_DIR/data}"
say "starting server on port $PORT"
PORT="$PORT" nohup node server/index.js >>"$LOG_FILE" 2>&1 &
NEW_PID=$!
echo "$NEW_PID" > "$PID_FILE"

for _ in $(seq 1 40); do
  if ! kill -0 "$NEW_PID" 2>/dev/null; then
    echo "server exited during startup - last log lines:" >&2
    tail -n 20 "$LOG_FILE" >&2
    rm -f "$PID_FILE"
    exit 1
  fi
  if curl -fsS "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
    say "ready at http://localhost:${PORT} (pid $NEW_PID, logs: $LOG_FILE)"
    exit 0
  fi
  sleep 0.25
done

say "started (pid $NEW_PID) but health check did not answer yet - check $LOG_FILE"
