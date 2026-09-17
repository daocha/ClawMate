#!/usr/bin/env bash
# Stop the ClawMate server.
#   ./stop.sh            native node (default)
#   ./stop.sh --docker   docker compose
set -euo pipefail

cd "$(dirname "$0")"
APP_DIR="$(pwd -P)"
PID_FILE="$APP_DIR/.pid"
MODE="node"

for arg in "$@"; do
  case "$arg" in
    --docker) MODE="docker" ;;
    --node)   MODE="node" ;;
    *) echo "unknown option: $arg (expected --docker or --node)" >&2; exit 2 ;;
  esac
done

say() { printf '\033[1;35m[ClawMate]\033[0m %s\n' "$1"; }

if [ "$MODE" = "docker" ]; then
  command -v docker >/dev/null 2>&1 || { echo "docker is not installed" >&2; exit 1; }
  docker compose down --remove-orphans
  say "containers stopped"
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

stop_pid() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null || return 1
  say "stopping pid $pid"
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 20); do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.25
  done
  kill -9 "$pid" 2>/dev/null || true
  return 0
}

STOPPED=0
if [ -f "$PID_FILE" ]; then
  PID="$(cat "$PID_FILE" 2>/dev/null || true)"
  [ -n "${PID:-}" ] && stop_pid "$PID" && STOPPED=1
  rm -f "$PID_FILE"
fi

while read -r pid; do
  [ -n "$pid" ] || continue
  stop_pid "$pid" && STOPPED=1
done < <(find_strays)

[ "$STOPPED" = "1" ] && say "stopped" || say "nothing was running"
