#!/usr/bin/env bash
# Despliegue rápido en cloud (Cloudflare quick tunnel).
# Uso: bash scripts/deploy-cloud.sh [--skip-build]
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_BUILD=false
for arg in "$@"; do
  [ "$arg" = "--skip-build" ] && SKIP_BUILD=true
done

CFDIR="/c/Users/ASUS/.cloudflared"
LOG="$ROOT/storage/logs/cloudflared-quick.log"

log() { echo "[deploy-cloud] $*"; }

kill_port() {
  local port="$1"
  for pid in $(netstat -ano 2>/dev/null | rg ":${port}\s+.*LISTENING" | awk '{print $NF}' | sort -u); do
    taskkill //PID "$pid" //F 2>/dev/null || true
  done
}

log "Parando Vite, serve y cloudflared..."
kill_port 5173
kill_port 8000
taskkill //IM cloudflared.exe //F 2>/dev/null || true
rm -f public/hot

[ -f "$CFDIR/config.yml" ] && mv "$CFDIR/config.yml" "$CFDIR/config.yml.sharebak" && log "config.yml movido a .sharebak"

if [ "$SKIP_BUILD" = true ] && [ -f public/build/manifest.json ]; then
  log "Build omitido (--skip-build, manifest existente)"
else
  log "Build producción (share:tunnel)..."
  npm run share:tunnel
fi

log "Arrancando serve..."
php artisan serve --host=127.0.0.1 --port=8000 >>"$ROOT/storage/logs/deploy-cloud-serve.log" 2>&1 &
sleep 2

log "Arrancando cloudflared..."
: >"$LOG"
npx cloudflared tunnel --url http://127.0.0.1:8000 >>"$LOG" 2>&1 &
sleep 18

TUNNEL_URL=$(rg -o 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | tail -1 || true)
if [ -z "${TUNNEL_URL:-}" ]; then
  log "ERROR: no se obtuvo URL del túnel. Revisa $LOG"
  exit 1
fi

log "URL túnel: $TUNNEL_URL"
sed -i "s|^APP_URL=.*|APP_URL=$TUNNEL_URL|" .env
sed -i 's|^TUNNEL_SHARE=.*|TUNNEL_SHARE=true|' .env
php artisan config:clear

kill_port 8000
sleep 1
php artisan serve --host=127.0.0.1 --port=8000 >>"$ROOT/storage/logs/deploy-cloud-serve.log" 2>&1 &
sleep 2

LOCAL_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:8000/ || echo 000)
TUNNEL_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$TUNNEL_URL/" || echo 000)

log "Local: $LOCAL_CODE | Túnel: $TUNNEL_CODE"
echo ""
echo "=== CLOUD LISTO ==="
echo "$TUNNEL_URL"
echo "==================="
[ "$LOCAL_CODE" = "200" ] && [ "$TUNNEL_CODE" = "200" ]
