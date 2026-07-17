# Stripe — Webhook y confirmación de pagos

## Arquitectura (híbrida)

| Vía | Cuándo | Rol |
|-----|--------|-----|
| **Webhook** `POST /webhooks/stripe` | Producción y local con túnel | Fuente de verdad |
| **Página éxito** `/pago/exito?session_id=cs_…` | Tras volver de Checkout | Respaldo idempotente |
| **Comando** `php artisan payments:sync-stripe-session` | Soporte / recuperación | Manual |

Todas usan `PaymentGatewayService::confirmPaymentFromWebhook()` (misma idempotencia).

---

## Producción

1. [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) → **Añadir endpoint**
2. URL: `https://TU-DOMINIO.com/webhooks/stripe`
3. Eventos: **`checkout.session.completed`**
4. Copiar **Signing secret** (`whsec_…`) → `.env`:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
5. Claves **live** en `.env`:
   ```env
   STRIPE_KEY=pk_live_...
   STRIPE_SECRET=sk_live_...
   ```
6. `php artisan config:clear`
7. Cola activa: `php artisan queue:work` (recibos Stripe + emails)

---

## Desarrollo local

### Opción A — Stripe CLI (recomendada)

```bash
stripe listen --forward-to http://127.0.0.1:8000/webhooks/stripe
```

Copiar el `whsec_…` que imprime → `STRIPE_WEBHOOK_SECRET` → `php artisan config:clear`.

### Opción B — Sin webhook

Tras pagar con tarjeta test `4242 4242 4242 4242`, la vuelta a `/pago/exito` confirma el pago automáticamente.

### Recuperar pagos atascados

```bash
php artisan payments:sync-stripe-session              # todos los pending
php artisan payments:sync-stripe-session cs_test_...  # una sesión
php artisan payments:sync-stripe-session --dry-run    # solo listar
```

---

## Tarjeta de prueba

| Campo | Valor |
|-------|--------|
| Número | `4242 4242 4242 4242` |
| Fecha | Cualquier futura |
| CVC | `123` |

Solo con badge **«Entorno de prueba»** en Checkout. Nunca uses tarjeta real en test.
