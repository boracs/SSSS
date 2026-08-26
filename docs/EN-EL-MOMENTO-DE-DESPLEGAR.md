# En el momento de desplegar (VPS)

Checklist para **subir maider_0 a un servidor propio**. No es el túnel de amigos (`TUNNEL_SHARE`); es producción.

Hoy el hosting concreto (nginx, dominio, SSL, panel) sigue siendo **el que tú elijas**. Aquí va lo que la app **sí exige** para que fotos, colas y cron funcionen.

---

## 0. Una vez: PHP con GD + WebP

Sin esto el pipeline de fotos no recorta: se queda el JPEG del móvil.

**Debian / Ubuntu** (ajusta `8.2` si tu PHP es 8.3):

```bash
sudo apt update
sudo apt install php8.2-gd php8.2-exif php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip php8.2-cli php8.2-fpm
```

Comprueba **el mismo PHP que sirve la web** (php-fpm, no solo CLI):

```bash
php -r "echo 'gd='.(extension_loaded('gd')?'yes':'no').' webp='.(function_exists('imagewebp')?'yes':'no').PHP_EOL;"
```

Tiene que salir `gd=yes webp=yes`. Si el FPM es otro binario, `phpinfo()` en una ruta temporal o `php-fpm8.2 -m`.

Reinicia PHP-FPM / Apache después de instalar extensiones.

---

## 1. Código y dependencias

```bash
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build
```

El HTML de producción debe cargar `/build/assets/*.js` (no Vite en el 5173).

---

## 2. Entorno

Copia `.env.example` → `.env` en el servidor. Rellena secretos **tú** (nunca en el chat).

Mínimo coherente con producción:

- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL=https://tu-dominio` (sin barra final)
- `TUNNEL_SHARE=false` (eso es solo demo local)
- Sin `ASSET_URL` salvo que sepas por qué
- MySQL real; `QUEUE_CONNECTION=database` (como ahora)

```bash
php artisan key:generate   # solo la primera vez
php artisan storage:link
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

---

## 3. Fotos de catálogo (obligatorio en el primer deploy)

Las fotos **nuevas** se convierten al subir (máster 1600 + thumb 640 WebP). Las **ya subidas** en local hay que pasarlas **una vez**:

```bash
php artisan images:backfill-catalog-thumbs
```

Se puede repetir: no duplica thumbs. No toca `public/img/**`.

Alquiler **público** sigue mostrando demos hasta que conectemos las fotos reales; el admin de tablas sí usa las subidas.

---

## 4. Procesos que no son “la web”

La home puede cargar y aun así fallar mails, facturas y stock si faltan estos dos:

| Qué | Comando / idea |
|-----|----------------|
| Cola | `php artisan queue:work --tries=1` supervisado (systemd, supervisor…) |
| Cron | crontab: `* * * * * php /ruta/al/proyecto/artisan schedule:run` |

Lista de tareas: `php artisan schedule:list` (debe coincidir con `routes/console.php`).

---

## 5. Pagos (cuando pases de test a live)

Webhook Stripe a `https://tu-dominio/webhooks/stripe`. Detalle: `docs/payments/STRIPE-WEBHOOK.md`. No pegues `sk_live` ni `whsec` en documentos.

TicketBAI: no actives producción Hacienda sin staging. `docs/invoicing/B2BROUTER-TICKETBAI.md`.

---

## 6. Comprobar que las fotos van

1. Sube un JPEG de móvil en admin (producto o 2ª mano).
2. En disco: `storage/app/public/…/*.webp` y `…-thumb.webp`; el `.jpg` original no debe quedar.
3. Listado: la card pide `*-thumb.webp`. Ficha / ampliar: el máster (sin `-thumb`).

---

Runtime local vs túnel: `.cursor/rules/tunnel-share-modes.mdc`. Persona ops: `docs/taller-prompts/AGENTE-DESPLIEGUE-OPS.md` (S11 apunta aquí).
