#!/usr/bin/env bash
# Vigila serve + túnel quick (~3–4 h). Reinicia procesos caídos y evita public/hot.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DURATION="${1:-14400}" # 4 h por defecto (margen sobre 3 h)
INTERVAL=90
START=$(date +%s)
LOG="$ROOT/storage/logs/share-tunnel-keepalive.log"
CF_LOG="$ROOT/storage/logs/cloudflared-quick.log"

log() {
  echo "[$(date '+%Y-%m-%dT%H:%M:%S%z')] $*" | tee -a "$LOG"
}

get_app_url() {
  grep '^APP_URL=' .env | cut -d= -f2- | tr -d '\r'
}

port_8000_pids() {
  netstat -ano 2>/dev/null | rg ":8000\s+.*LISTENING" | awk '{print $NF}' | sort -u
}

ensure_serve() {
  if curl -sf -o /dev/null --max-time 8 http://127.0.0.1:8000/; then
    return 0
  fi
  log "serve caído — reiniciando"
  for pid in $(port_8000_pids); do
    taskkill //PID "$pid" //F 2>/dev/null || true
  done
  sleep 1
  php artisan serve --host=127.0.0.1 --port=8000 >>"$LOG" 2>&1 &
  sleep 3
}

cloudflared_running() {
  tasklist 2>/dev/null | rg -qi 'cloudflared\.exe'
}

restart_cloudflared() {
  log "cloudflared ausente — relanzando (puede cambiar la URL)"
  : >"$CF_LOG"
  npx cloudflared tunnel --url http://127.0.0.1:8000 >>"$CF_LOG" 2>&1 &
  sleep 18
  NEW_URL=$(rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' "$CF_LOG" | tail -1 || true)
  if [ -n "${NEW_URL:-}" ]; then
    sed -i "s|^APP_URL=.*|APP_URL=$NEW_URL|" .env
    php artisan config:clear >>"$LOG" 2>&1
    log "nueva URL túnel: $NEW_URL"
    ensure_serve
  else
    log "ERROR: no se pudo leer URL nueva de cloudflared"
  fi
}

ensure_no_hot() {
  if [ -f public/hot ]; then
    rm -f public/hot
    log "eliminado public/hot (evita pantalla blanca en túnel)"
  fi
}

TUNNEL_URL="$(get_app_url)"
log "keepalive ON — objetivo $TUNNEL_URL — duración ${DURATION}s — intervalo ${INTERVAL}s"

while [ $(($(date +%s) - START)) -lt "$DURATION" ]; do
  ensure_no_hot
  ensure_serve
  if ! cloudflared_running; then
    restart_cloudflared
  fi
  TUNNEL_URL="$(get_app_url)"
  if curl -sf -o /dev/null --max-time 20 "$TUNNEL_URL/"; then
    log "OK — $TUNNEL_URL"
  else
    log "WARN — túnel no responde: $TUNNEL_URL"
    if cloudflared_running; then
      ensure_serve
    else
      restart_cloudflared
    fi
  fi
  sleep "$INTERVAL"
done

log "keepalive finalizado tras ${DURATION}s"
