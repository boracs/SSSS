# PROMPT MAESTRO — Saneamiento checkout carrito → Stripe (tienda S4)

> Copiar desde «Modo: Agent» hasta el final e pegar en un chat Agent.
> Documento de trabajo (no es spec de producto cerrado). Actualizado tras el bug
> `description=""` + vaciado prematuro del carrito (ago 2026).

Modo: Agent. Laravel 11 + Inertia React. Leer este prompt entero antes de tocar nada.
Prioriza el código real frente a supuestos. No inventes rutas, tablas ni servicios.

────────────────────────────────────────
OBJETIVO
────────────────────────────────────────
Sanear y endurecer el flujo `Carrito → POST crear.pedido → Stripe Checkout → webhook/pago`,
corrigiendo carreras de stock, confianza ciega en el total del front, vaciado prematuro del
carrito, dinero en float, pedidos huérfanos y UX mínima de errores.

Resultado esperado: pagar con tarjeta abre Stripe de forma fiable; cancelar/abandonar no
deja al usuario sin carrito ni stock “comido”; el servidor es la fuente de verdad del precio.

────────────────────────────────────────
CONTEXTO YA HECHO (NO REVERTIR)
────────────────────────────────────────
1. `PaymentLineItemDto::toStripeLineItem()` ya OMITE `description` vacía (Stripe
   `parameter_invalid_empty`). Mantener esa guarda.
2. En `PedidoController::crear`, si Stripe falla: se revierte stock, se borra el pedido
   pendiente y el carrito NO se vacía. Mantener ese contrato.
3. Redirección Stripe: trait `RedirectsToStripeCheckout` (`Inertia::location` si `X-Inertia`).
4. Confirmación de pago Pedido: `PaymentGatewayService` → `confirmPedidoPayment` pone
   `pagado = true` (webhook / sync sesión).
5. Helper dinero existente: `App\Support\MoneyCents`
   (`eurosToCents`, `centsToEuros`, `amountsMatchCents`).
6. Ruta cancel genérica ya existe: `GET /pago/cancelado` → `payment.cancelled`
   (hoy hace `redirect()->back()` + flash info). Preferir usarla o `/carrito` explícito;
   NO inventar otra ruta salvo que justifiques por qué `/pago/cancelado` no basta.
7. UI carrito: `resources/js/Pages/Carrito.jsx` — selector cantidad + `iniciarPagoStripe`
   → `route("crear.pedido")`. EmptyCartView NO reescribir.
8. Doc webhook: `docs/payments/STRIPE-WEBHOOK.md` (no duplicar; enlazar si hace falta).

────────────────────────────────────────
ARCHIVOS PRINCIPALES (tocar solo lo necesario)
────────────────────────────────────────
Backend:
- `app/Http/Controllers/PedidoController.php` (método `crear` — núcleo)
- `app/DTOs/Payments/PaymentLineItemDto.php` (solo si hace falta ampliar, no romper omit empty)
- `app/DTOs/Payments/InitiatePaymentDto.php` (solo lectura salvo cancelPath)
- `app/Support/MoneyCents.php` (reutilizar; no duplicar helpers)
- `app/Services/Payments/PaymentGatewayService.php` (confirmación Pedido; leer antes de
  cambiar vaciado de carrito)
- Posible comando/job nuevo bajo `app/Console/Commands/` o `app/Jobs/` (dominio Payments/Store)
- Listener/webhook existente que confirma pagos — localizar el punto donde `pagado=true`
  en Pedido y enganchar ahí el vaciado de carrito si se mueve el vaciado post-pago

Frontend (mínimo):
- `resources/js/Pages/Carrito.jsx` (toast flash más visible; sin rediseño global)

Tests:
- Unit: `PaymentLineItemDto` (description vacía omitida; description no vacía presente)
- Feature: `crear.pedido` — stock lock, rechazo total manipulado, carrito intacto si Stripe falla
  (mockear Stripe / PaymentGatewayService)

Docs:
- Actualizar SOLO la sección afectada de `docs/PROJECT_TREE_FOR_GEMINI.md` si creas
  Command/Job/Service nuevo.
- Este archivo (`docs/payments/CHECKOUT-CARRITO-STRIPE-MASTER-PROMPT.md`) no hace falta
  reescribirlo salvo que cambie la política de vaciado.

────────────────────────────────────────
PROHIBIDO
────────────────────────────────────────
- Tocar alquiler (`BookingService`, Surfboards), academia, taquillas, chatbot, Stripe keys en `.env`
- Reescribir `EmptyCartView` ni rediseñar toda la tienda
- Inventar columnas de migración salvo que sea IMPRESCINDIBLE (preferir reutilizar
  `pedidos.pagado`, timestamps `created_at`, tablas carrito/pivot existentes)
- Confiar en el `total` del cliente como fuente de cobro
- Vaciar carrito ANTES de tener sesión Stripe OK **y** preferiblemente ANTES de pago
  confirmado (ver tarea 3 — política elegida abajo)
- float para dinero en código NUEVO del checkout (usar céntimos int + MoneyCents)
- Commits salvo que el usuario lo pida

────────────────────────────────────────
HECHOS DEL CÓDIGO (no contradecir)
────────────────────────────────────────
- Ruta: `POST /crear-pedido` → `PedidoController@crear` → name `crear.pedido`
- Carrito: `GET /carrito` → `carrito`
- Success Stripe actual en crear: `successPath: '/pago/exito'`
- Cancel actual en crear: `cancelPath: '/tienda'` ← PROBLEMA
- En `crear`, el precio se recalcula en servidor desde `Producto` + `descuento`, pero
  `total` del request se valida solo como `numeric|min:0` y NO se compara con el total real
- Stock: `Producto::find` + `decrement` SIN `lockForUpdate()` (salvo que T1 ya esté aplicado)
- Dinero en crear: `(float) $prod->precio` y floats locales; Stripe recibe céntimos vía DTO
- Tras Stripe OK hoy: `$user->carrito()->delete()` y luego `redirectToStripeCheckout`
  → si el usuario CANCELA en Stripe, carrito ya vacío
- Flash Inertia: `HandleInertiaRequests` expone `flash`; Carrito.jsx ya escucha
  `flash.error` / `flash.success` pero el toast es fácil de no ver
- Log histórico del bug: Stripe `parameter_invalid_empty` por `product_data.description=""`
  en pedidos de tienda (p.ej. ids 16–18 en entorno local)

────────────────────────────────────────
POLÍTICA DE VACIADO DE CARRITO (decisión fija de este prompt)
────────────────────────────────────────
Opción elegida: **no vaciar el carrito hasta pago confirmado** (`pagado = true`).

Flujo objetivo:
1. `crear`: transacción con lock stock → crear Pedido pendiente → adjuntar líneas →
   decrementar stock → NO borrar carrito.
2. Crear sesión Stripe. Si falla → rollback stock + borrar pedido (ya implementado) →
   carrito intacto → flash error.
3. Si Stripe OK → redirigir a Checkout **sin** `$user->carrito()->delete()`.
4. Al confirmar pago (mismo sitio que hoy pone `pagado=true` para Pedido) → vaciar carrito
   del user del pedido (idempotente: si ya vacío, no falla).
5. `cancelPath`: `/carrito` (o path de `payment.cancelled` que acabe llevando al
   carrito con mensaje claro). El carrito sigue con los productos porque no se vació en (3).

Si al implementar descubres que dejar stock descontado + carrito lleno permite
doble-compra del mismo stock: es correcto temporalmente (reserva blanda). Mitigar con
tarea 5 (liberar huérfanos). Documenta el TTL elegido.

────────────────────────────────────────
TAREAS (orden estricto)
────────────────────────────────────────

### T0 — Pre-vuelo (solo lectura)
- Leer `PedidoController::crear` completo.
- Leer `PaymentLineItemDto`, `MoneyCents`, `confirmPedidoPayment` en PaymentGatewayService.
- Localizar listener/job webhook que llama a la confirmación.
- Leer `Carrito.jsx` (`iniciarPagoStripe`, toast flash, `canCheckout`).
- Anotar en 5 líneas el flujo actual vs objetivo. Luego implementar.

### T1 — Carrera de stock (ALTA)
En la transacción de `crear`, por cada línea:
```php
$prod = Producto::query()->whereKey($item['id'])->lockForUpdate()->first();
```
Revalidar stock **después** del lock. Si insuficiente → abortar transacción con error
claro (422/back errors), sin crear pedido a medias.
Prohibido: `find` sin lock en este camino.

### T2 — Total del cliente (ALTA)
- Calcular `$totalServidor` en céntimos con `MoneyCents` (precio unitario con descuento × cantidad).
- El `total` del request: o bien **ignorarlo** del todo, o bien exigir
  `MoneyCents::amountsMatchCents($totalServidorCents, $request->input('total'))`.
- Preferencia: **validar y rechazar** si no cuadra (mensaje: “El total no coincide; recarga el carrito”).
- Persistir `precio_total` del pedido desde el total servidor (euros con 2 decimales vía MoneyCents),
  nunca desde el total ciego del cliente.
- Líneas Stripe: `unitAmountCents` desde el mismo cálculo en céntimos (una sola fuente).

### T3 — cancel_url + vaciado post-pago (ALTA)
- Cambiar `cancelPath` de `'/tienda'` a `'/carrito'` (o path que deje al usuario en carrito
  con flash; si usas `/pago/cancelado`, haz que redirija a `route('carrito')` con mensaje).
- Quitar `$user->carrito()->delete()` del éxito inmediato post-`initiatePayment`.
- Enganchar vaciado idempotente del carrito del comprador cuando Pedido pasa a `pagado=true`
  (dentro de `confirmPedidoPayment` o evento ya disparado — reutilizar pipeline de pagos,
  no inventar segundo webhook).
- Garantizar: cancelar en Stripe → usuario vuelve al carrito CON productos.
- Garantizar: pago OK → carrito vacío y pedido pagado.

### T4 — Dinero en céntimos en el camino crítico (MEDIA)
En `PedidoController::crear` (y helpers privados si extraes lógica):
- Convertir precio/descuento a céntimos con `MoneyCents::eurosToCents`.
- Aplicar descuento en céntimos (cuidado: definir regla explícita, p.ej.
  `unitCents = eurosToCents(precio); discounted = (int) round($unitCents * (100 - $descuento) / 100)`
  o la que ya use el carrito en `CarritoController` — ALINEAR ambas; no divergir).
- `precio_pagado` pivot y `precio_total` pedido: escribir euros solo al persistir si la
  columna sigue en decimal, pero el cálculo interno en int.
- No migrar todo el catálogo Producto a `*_cents` en esta tarea (fuera de alcance salvo
  que ya existan columnas).

### T5 — Pedidos huérfanos (MEDIA)
Crear comando Artisan (nombre alineado al repo, p.ej. `orders:release-unpaid-checkouts` o
similar en `app/Console/Commands/`):
- Seleccionar `Pedido` con `pagado = false`, creados hace más de **N minutos** (N=30 por
  defecto, configurable en `config/services.php` o `config` de store/payments si existe;
  si no hay config, constante documentada en el comando + default 30).
- Para cada uno: en `DB::transaction` + locks: devolver stock (`increment` por pivot),
  detach líneas, delete pedido (o marcar cancelado si existe status — si NO existe columna
  status, delete como hoy en el rollback de Stripe fail).
- NO tocar pedidos `pagado=true`.
- Idempotente y seguro a re-ejecución.
- Registrar en scheduler solo si el proyecto ya programa comandos similares; si no,
  documentar cómo lanzarlo y NO forzar schedule sin patrón existente.
- Actualizar `PROJECT_TREE_FOR_GEMINI.md` solo la rama Commands/Jobs.

### T6 — Front + tests (BAJA pero obligatoria al cerrar)
Front (`Carrito.jsx`):
- Si llega `flash.error` tras `crear.pedido`, toast más visible (p.ej. duración 6–8s o
  ancla cerca del CTA “Pagar”); sin rediseñar la página.
- Mantener `canCheckout` / link taquillas.
- Asegurar `onFinish` desbloquea `procesandoPago`.

Tests mínimos:
1. Unit `PaymentLineItemDto`: description `''` → clave ausente; description `'x'` → presente.
2. Feature `crear.pedido` (auth + producto con stock):
   - mock/fake de `InitiatePaymentAction` o gateway que lance RuntimeException →
     carrito sigue con líneas; stock restaurado.
   - total manipulado en request → 422/back error; sin pedido pagable.
   - (si testable) dos decrements concurrentes no bajan de 0 — al menos assert del path
     con stock insuficiente tras lock.

────────────────────────────────────────
CRITERIOS DE ACEPTACIÓN
────────────────────────────────────────
- [ ] `lockForUpdate()` en productos al crear pedido
- [ ] Total servidor en céntimos; total cliente validado o ignorado (nunca cobrado ciego)
- [ ] `cancelPath` lleva al carrito; cancelar Stripe NO deja carrito vacío
- [ ] Carrito se vacía solo al confirmar `pagado=true`
- [ ] Si Stripe falla al crear sesión: carrito intacto + stock ok + flash error
- [ ] description vacía sigue omitida en Stripe line items
- [ ] Comando de liberación de pedidos pendientes documentado/ejecutable
- [ ] Tests unit + feature mínimos en verde
- [ ] Cero cambios en alquiler/academia/chatbot
- [ ] `npx vite build` OK si tocaste JSX

────────────────────────────────────────
ORDEN DE IMPLEMENTACIÓN SUGERIDO
────────────────────────────────────────
T0 → T1 → T2 → T4 (cálculo céntimos alimenta T2/Stripe) → T3 → T5 → T6 → build/tests →
checklist.

────────────────────────────────────────
FORMATO DE SALIDA AL TERMINAR
────────────────────────────────────────
1. Diff por archivo tocado (resumen).
2. Checklist de aceptación (cumplido / no).
3. TTL elegido para huérfanos y dónde se configura.
4. Si algún supuesto del prompt choca con el código: 1 línea, prioriza el código.
5. No commits salvo petición explícita.

────────────────────────────────────────
ARRANQUE RÁPIDO (para el agente)
────────────────────────────────────────
Ejecuta T0 ahora. No preguntes confirmaciones de estilo dentro de lo especificado.
Pregunta solo si un parche exige tocar algo fuera de alcance (migración masiva de Producto,
cambio de webhook Stripe, o vaciado que rompa otro payable).
