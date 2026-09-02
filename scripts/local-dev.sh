#!/usr/bin/env bash
# Modo local: HMR con Vite + php artisan serve.
# Uso: bash scripts/local-dev.sh
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

log() { echo "[local-dev] $*"; }

kill_port() {
  local port="$1"
  for pid in $(netstat -ano 2>/dev/null | rg ":${port}\s+.*LISTENING" | awk '{print $NF}' | sort -u); do
    taskkill //PID "$pid" //F 2>/dev/null || true
  done
}

log "Parando cloudflared y servidores..."
taskkill //IM cloudflared.exe //F 2>/dev/null || true
kill_port 5173
kill_port 8000
rm -f public/hot

sed -i 's|^APP_URL=.*|APP_URL=http://127.0.0.1:8000|' .env
sed -i 's|^TUNNEL_SHARE=.*|TUNNEL_SHARE=false|' .env
grep -q '^SESSION_SECURE_COOKIE=' .env && sed -i 's|^SESSION_SECURE_COOKIE=.*|SESSION_SECURE_COOKIE=false|' .env

php artisan config:clear
php artisan ziggy:generate resources/js/ziggy.js

log "Arrancando serve + Vite..."
php artisan serve --host=127.0.0.1 --port=8000 >>"$ROOT/storage/logs/local-dev-serve.log" 2>&1 &
npm run dev >>"$ROOT/storage/logs/local-dev-vite.log" 2>&1 &
sleep 4

if [ -f public/hot ]; then
  log "HMR: $(cat public/hot)"
else
  log "WARN: public/hot aún no creado (Vite arrancando...)"
fi

LOCAL_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:8000/ || echo 000)
log "Local: $LOCAL_CODE"
echo ""
echo "=== MODO LOCAL ==="
echo "http://127.0.0.1:8000"
echo "Vite: http://127.0.0.1:5173"
echo "=================="
[ "$LOCAL_CODE" = "200" ]
