# Auditoría Backend — Fase 1: dinero/consistencia (2026-08-26)

> Ejecutada por **Reasonix/DeepSeek Pro** con la persona `docs/taller-prompts/AGENTE-BACKEND-SENIOR.md` (reglas R1–R8, formato §6).
> Método: 6 sub-agentes en paralelo (uno por dominio), cada uno con pre-vuelo (mapa → archivos reales → tests → citas `archivo:línea`).
> Estado: **informe para verificación de Cursor** (ver prompt en `AUDITORIA-BACKEND-FASE1-DINERO-2026-08-26.md` §"Prompt para Cursor" — o pedirlo en chat).
> Stack verificado: Laravel 12 · PHP ^8.2 · Stripe ^20.3 · datáfono/TPV · TicketBAI/B2BRouter · colas (dev `--tries=1`) · Sanctum · Pest 3 (277 tests).

---

## 0. Diagnóstico (1 párrafo)

**No hay P0**: no se encontró dinero/datos/seguridad roto de forma inmediata. El diseño transaccional es sólido en lo crítico: webhooks Stripe y datáfono idempotentes (UNIQUE + `lockForUpdate` + HMAC), anti-overbooking de alquiler y venta del último artículo serializados por fila (`lockForUpdate`), precios de tienda recalculados en servidor con anti-tampering, céntimos `int` como estándar (con una excepción: `Booking` en euros decimales). Los **11 P1** son de **consistencia y recuperación bajo fallo**: doble clic → doble cargo (pedidos y subastas), doble inscripción TOCTOU, webhook Stripe que responde 200 cuando falla la confirmación (dinero cobrado en `pending` para siempre), reintento B2B sin idempotencia (factura TicketBAI duplicada), y 2 reglas de negocio rotas (catálogo datáfono sin descuento → 422 reproducible; política FIFO de bonos incoherente entre wallet y consumo). ~25 P2 de deuda (authz inline dispersa, `--tries=1` sin alertas en `failed_jobs`, `Booking` en decimal, paginación, código muerto…).

---

## 1. Hallazgos priorizados (P1; formato del agente)

| ID | Sev | Dónde | Problema | Por qué importa | Cómo | Esf. | KPI |
|---|---|---|---|---|---|---|---|
| F1 | P1 | `app/Actions/Store/CreateStoreCheckoutAction.php:85` | Doble POST de «Pagar» → 2 pedidos + 2 sesiones Stripe (carrito leído sin lock; borrado al final; sin throttle/idempotencia) | Doble cargo real (doble clic / 2 pestañas) | Lock del carrito por usuario + token de checkout único + throttle | M | % pedidos duplicados del mismo carrito |
| F2 | P1 | `app/Services/Auctions/AuctionSettlementService.php:89` | `initiateWinnerPayment` solo comprueba `Pending` → N sesiones Stripe del mismo lote; el 2º cargo no se cancela | Doble cargo al ganador que pulsa 2× | Sesión pendiente única por auction; bloquear re-apertura | M | nº pagos duplicados por subasta |
| F3 | P1 | `app/Actions/Academy/EnrollStudentAction.php:43` (+ `RequestLessonAction.php:74`) | Chequeo «ya inscrito» ANTES de `withLockedLesson` y sin re-evaluar tras el lock; la migración `2026_07_08_100000:42` eliminó el único `lesson_user(lesson_id,user_id)` y `user_id` es NULL para guest | TOCTOU: doble clic → 2 inscripciones (doble consumo de bono / 2 pagos) sin red en BD | Re-evaluar `exists()` dentro del callback con lección bloqueada (o índice único parcial excluyendo `cancelled`) | M | 0 inscripciones duplicadas activas |
| F4 | P1 | `app/Http/Controllers/Admin/DatafonoPaymentController.php:63-64` | El catálogo del datáfono envía `precio_cents` SIN `descuento`, pero `createPaidPedido` (`DatafonoPaymentReconciliationService.php:1729`) calcula con `StoreProductPricing::unitPriceCents` | **Bug activo hoy**: con cualquier producto con `descuento>0` el ticket falla con 422 «Importe línea ≠ catálogo» salvo teclear a mano | Enviar `precio_cents` ya descontado en el catálogo (o unificar criterio) | S | nº de 422 «≠ catálogo» en mostrador |
| F5 | P1 | `app/Http/Controllers/Payments/PaymentWebhookController.php:87` | Webhook Stripe responde **200** cuando `confirmPaymentFromWebhook` devuelve `ok=false`; `payments:sync-stripe-session` NO está programado (`routes/console.php:7-20`, docs lo definen "Manual") | Stripe no reintenta (200 = entregado) → cobrado y payable en `pending` para siempre sin alerta | 5xx en fallo para reintento de Stripe y/o programar sync cada 5 min + alerta admin | S | `pending` con pago Stripe >24 h = 0 |
| F6 | P1 | `app/Actions/Invoicing/IssueFiscalInvoiceAction.php:66-68` + `app/Jobs/Invoicing/CreateB2BRouterInvoiceJob.php:21-24` | En fallo transitorio: `markFailed()` + `throw`; el reintento re-POSTea el alta completa (`B2BRouterClient.php:32` sin `Idempotency-Key`) | Si el 1er POST llegó a Hacienda pero la respuesta se perdió → **factura TicketBAI duplicada** (riesgo fiscal) | Header de idempotencia derivado de `stripe_session_id` (o consultar antes de re-POST); no marcar `failed` en errores transitorios | S | facturas B2B por cobro = 1 |
| F7 | P1 | `app/Services/Invoicing/FiscalInvoiceBuilderService.php:57` | `fromPedido` exige `$pedido->usuario`; `createPaidPedido` crea Pedidos guest con `user_id=null` (`DatafonoPaymentReconciliationService.php:1754`) → toda venta cash a walk-in con `INVOICING_ENABLED=true` acaba en `fiscal_invoices.status=failed` sin recuperación | Cobro en efectivo sin TicketBAI (política «efectivo → B2B siempre»), riesgo Hacienda | `buildContactForUser()` con `guest_name/guest_email` (como Booking/LessonUser/Fotos) | M | % cobros cash con TicketBAI registrado |
| F8 | P1 | `app/Services/BonoService.php:94` vs `EnrollStudentAction.php:128` / `ApproveEnrollmentQuotaAction.php:103` | `resolveActiveBonoId` define FIFO (más antiguo) pero el consumo usa `orderByDesc('id')` (más nuevo) | Wallet muestra «En uso: bono viejo» mientras se cobra del nuevo → saldo visible ≠ consumido | Unificar política FIFO en las 3 rutas de cargo | S | 0 discrepancias bono «en uso» vs consumo |

**Backlog P1 (no entran en la tabla):**
- B1 | `app/Services/Auctions/AuctionSettlementService.php:43` — cierre fija `Pending` sin deadline ni cron de timeout → lote bloqueado indefinidamente (M).
- B2 | `app/Http/Controllers/Academy/LessonController.php:45-47` + `routes/console.php` — `academy:cleanup` (AutoReleaseService) NO está en el scheduler; corre inline por request con `Cache::remember(900)` → reservas fantasma y cupo bloqueado sin tráfico (S).
- B3 | `routes/api.php:41` — `/api/bookings/check-availability` solo `auth` (no `admin`) expone `id`+`status` internos vía `getBlockedRanges` (S).
- B4 | `routes/api.php:40` — `/api/taquilla` duplica `taquilla.index.admin` sin middleware admin (S).
- B5 | `app/Http/Controllers/AuthController.php:56` — `createToken('admin-token',['server:admin'])` es código muerto; `personal_access_tokens` acumulándose (S).

---

## 2. Riesgos de consistencia (transversales)

- **Idempotencia:** webhooks Stripe y datáfono ✅ (UNIQUE + `lockForUpdate` + `hash_equals`); **B2BRouter ❌** (F6) y re-emisión de `PaymentConfirmed` vía GET público `/pago/exito` (P2, `PaymentSuccessController.php:72-98`).
- **Céntimos:** estándar `int` ✅ excepto **`Booking.total_price/deposit_amount` en decimal euros** (P2, `Booking.php:87-88`) → doble estándar y `round()` en controladores.
- **Colas:** jobs de dinero despachados tras commit ✅ (`PaymentConfirmed::emit()` fuera de TX); pero **`--tries=1` sin `$tries`/alerta en `failed_jobs`** (P2: emails/historial chatbot perdidos en silencio; PollB2BRouterTaxReportJob solo `Log::warning` → obligación TicketBAI incumplida sin aviso).
- **Authz:** flujos de dinero protegidos en la práctica (ownership checks en Pedido/MyReservations/Taquillas), pero **patrón inline disperso** (F7/B3/B4/B5) y **solo 2 Policies en todo el proyecto** (Lesson, LessonUser) — ninguna para dinero.
- **Concurrencia:** anti-overbooking ✅ (fila `surfboards` + cupo `withLockedLesson`); doble inscripción ❌ (F3); doble checkout ❌ (F1/F2).
- **Rendimiento:** `listPayments` corta en `limit(100)` sin paginación (P2); lock de `numeroTaquilla` sin índice (P2).

---

## 3. Cómo validar (evidencia y tests)

- Tests existentes que ya cubren zonas: `StoreOrderStockTest` (sobreventa), `PaymentGatewayBookingBalanceTest` (balance pendiente), `B2BRouterInvoiceTest` (reintento tras éxito), `RentalAvailabilityGuardTest` (transacción fuera de TX), `Datafono*` suite.
- **Huecos de tests (P2, todos los dominios):** sin test del propio `PaymentWebhookController` (HMAC, duplicado, 200-en-fallo → F5), sin tests de concurrencia de pujas/cierre subasta (F2/B1), sin tests de BonoService/EnrollStudentAction/refunds (F3/F8), sin tests de authz en subastas/taquilla admin/bookings admin/IDOR (B3-B5).
- Comandos de comprobación propuestos: `php artisan test --filter="PaymentWebhook|BonoService|EnrollStudent|Auction"`; tras fix de F4: ticket mostrador con producto con descuento.

---

## 4. Decisión ejecutiva

1. **Cursor verifica** el informe en código (prompt adjunto; modelo recomendado: Claude Opus) — confirmar/descartar/matizar cada F1–F8.
2. **Fixes P1 en orden:** doble cargo (F1+F2, misma causa raíz: falta de token/sesión única) → TOCTOU F3 → catálogo datáfono F4 (bug activo) → webhook 200 + sync F5 → idempotencia B2B F6 → guest TicketBAI F7 → FIFO bonos F8.
3. **NO implementar nada sin luz verde del dueño.** Cada fix: build + tests verdes.
4. **Fase 2 (pendiente):** academia/taquillas/fotos/SEO backend/chatbot + rendimiento (N+1/índices) — con el mismo método.

---

*Riesgo residual: los hallazgos se verificaron por lectura de código (shell read-only en sub-agentes); Cursor debe confirmar citas y, donde aplique, reproducir (p. ej. F4 con un producto con descuento).*

---

## 5. Verificación Cursor (2026-08-27) — citas y veredictos

No se re-auditó. Se abrió cada `archivo:línea` del informe. **0 DESCARTADO.** Implementación pendiente de luz verde.

| ID | Sev | Cita actualizada | Veredicto |
|---|---|---|---|
| F1 | P1 | `CreateStoreCheckoutAction.php:38-85` · `PedidoController.php:398` (sin throttle) · `PaymentGatewayService.php:73` (UUID nuevo por POST) | **CONFIRMADO** |
| F2 | P1 | `AuctionSettlementService.php:75-113` (sin lock; solo `Pending`) · `auctions.pay` `throttle:30,1` no evita doble clic | **CONFIRMADO** |
| F3 | P1 | `EnrollStudentAction.php:42-58` (check dentro de TX + `lockForUpdate`, **antes** de `withLockedLesson`, sin re-evaluar) · `RequestLessonAction.php:73-88` (check **fuera** de TX) · unique dropeado `2026_07_08_100000.php:42-49` | **MATIZ** (Enroll endurecido; TOCTOU + unique sigue) |
| F4 | P1 | `DatafonoPaymentController.php:55-65` (catálogo sin `descuento`) · `MostradorTicketModal.jsx:488` · `DatafonoPaymentReconciliationService.php:1728-1748` | **CONFIRMADO** (bug activo; tests con `descuento=0`) |
| F5 | P1 | `PaymentWebhookController.php:81-87` (200 si `ok=false`) · `routes/console.php:7-20` (sync no programado) · respaldo `/pago/exito` | **MATIZ** (5xx ciego reintentaría fallos permanentes) |
| F6 | P1 | `IssueFiscalInvoiceAction.php:66-68` · `B2BRouterClient.php:32` (sin `Idempotency-Key`) · job `$tries=5` | **MATIZ** (fila local UNIQUE; duplicado en Hacienda si timeout tras POST) |
| F7 | P1 | `FiscalInvoiceBuilderService.php:57-58` · `createPaidPedido` `…:1753-1756` · cash nunca cubierto por TPV (`…:1816-1818`) | **CONFIRMADO** |
| F8 | P1 | `BonoService.php:92-107` FIFO · `EnrollStudentAction.php:132` y `ApproveEnrollmentQuotaAction.php:107` `orderByDesc('id')` | **CONFIRMADO** (líneas desplazadas) |
| B1 | P1 | `AuctionSettlementService.php:41-44` (Pending sin deadline; sin cron) | **CONFIRMADO** |
| B2 | P1 | `LessonController.php:46-48` · `academy:cleanup` no está en `routes/console.php` | **CONFIRMADO** (línea +1) |
| B3 | P1 | `routes/api.php:41` · `BookingService.php:261-269` (`id`+`status`) | **CONFIRMADO** |
| B4 | P1 | `routes/api.php:40` duplica nombre `taquilla.index.admin` · `AdminIndex` sí comprueba `role===admin` (`PlanesTaquillasController.php:47-51`) | **MATIZ** (no IDOR; colisión de nombre Ziggy) |
| B5 | P1 | `AuthController.php:56` sin ruta en `web`/`api` | **MATIZ** (código muerto; no hay acumulación activa) |

Hallazgo extra (R5, no estaba en F1–F8): `Auction.php:199,208` (`toPublicArray`) envía `payment_status` y `winner_user_id` al catálogo/ficha públicos. Tratarlo al ejecutar F2.

> Corrección de cita: el throttle ausente de F1 está en `routes/web.php:398`, no en `PedidoController.php:398`.

---

## 6. Implementación F1 + F2 (2026-08-27) — RESUELTO

F1 y F2 se cierran con **una sola invariante compartida**: «una sesión Stripe viva por payable», apoyada en la tabla `payment_webhook_idempotency` que ya existía (índice `payable_type, payable_id`) más dos columnas nuevas, `checkout_url` y `expires_at`. No hizo falta la columna `stripe_session_id` en `auctions`.

| Pieza | Cambio |
|---|---|
| `app/Contracts/Payments/FindsOpenCheckout.php` | Contrato nuevo: `openCheckoutUrlFor(payableType, payableId)` |
| `PaymentGatewayService` | Implementa el contrato; guarda URL y caducidad de cada sesión creada |
| `CreateStoreCheckoutAction` | `lockForUpdate` sobre `carritos`; reutiliza pedido sin pagar con la misma huella (líneas + `fecha_entrega` + total) y su sesión viva; rollback limpio si Stripe falla |
| `routes/web.php` | `throttle:6,1` en `POST /crear-pedido` |
| `AuctionSettlementService::initiateWinnerPayment` | `DB::transaction` + `Auction::lockForUpdate()`; reutiliza la sesión abierta |
| `Auction::toPublicArray` | Sin `payment_status` ni `winner_user_id` (R5); el admin los recibe en `AuctionCatalogService::adminIndex` |

**Decisiones que se apartan del plan original:** el lock se mantiene durante la apertura de la sesión Stripe (soltarlo antes reabre la ventana de las dos sesiones simultáneas, y solo bloquea la fila del propio usuario o del lote ya cerrado); y la sesión pendiente se **reutiliza** en vez de expirarse en Stripe, porque `sessions->expire()` falla si la sesión ya se pagó.

**Verificación:** `php artisan test` → 291 verdes. Nuevos: `tests/Feature/Auctions/AuctionWinnerPaymentIdempotencyTest.php` y dos casos en `tests/Feature/Store/CreateStoreCheckoutActionTest.php`.

---

## 7. Implementación F3 (2026-08-27) — RESUELTO

**Red de BD.** MariaDB 10.4 no tiene índices parciales, así que la unicidad se expresa con una columna generada STORED `lesson_user.active_enrollment_key` más un `UNIQUE` (que admite muchos NULL):

| Caso | Clave |
|---|---|
| Socio con plaza o solicitud activa | `u:<lesson_id>:<user_id>` |
| Invitado de la web | `g:<lesson_id>:<email en minúsculas>` |
| Fila cancelada / caducada / reembolsada | `NULL` → puede reinscribirse |
| Alta de mostrador (`is_admin_guest`) | `NULL` → el admin puede apuntar a varios invitados con el mismo email |

La exención de `is_admin_guest` es imprescindible: sin ella, `AdminGuestEnrollmentAction:148-165` (una familia inscrita con el email del padre) y el walk-in de datáfono reventarían con un error SQL crudo en el panel.

**Código.** El chequeo de duplicado pasa a estar dentro del callback de `withLockedLesson` en `EnrollStudentAction` y `RequestLessonAction` — en esta última estaba fuera de la transacción. `LessonUser::activeSeatStatuses()` centraliza los 5 estados que ocupan plaza para que el índice y el código no puedan divergir.

**Hallazgo nuevo (no estaba en la auditoría): `lesson_user.user_id` era NOT NULL.** La migración `2026_07_08_100000:52-57` condiciona el `nullable()->change()` a que no exista la FK `lesson_user_user_id_foreign`, pero esa FK nace con la tabla (`2026_03_16_140002:14`, `foreignId()->constrained()`), así que el bloque nunca se ejecutó: **ninguna inscripción de invitado, ni por web ni por mostrador, podía guardarse** («Column 'user_id' cannot be null»). Corregido en `2026_08_27_135000`, que además pasa la FK a `ON DELETE SET NULL`.

**Verificación:** `php artisan test` → 300 verdes. Nuevos `tests/Feature/Academy/EnrollStudentDuplicateTest.php` y `RequestLessonDuplicateTest.php` (doble clic de socio y de invitado, corte por índice ante un INSERT crudo, re-inscripción tras cancelar, y mostrador repitiendo email). La migración detectó en local un duplicado real (`u:30:19`) y abortó con la lista en vez de crear el índice a medias.

---

## 8. Implementación F4 (2026-08-27) — RESUELTO

Un solo criterio de precio en los dos extremos. `DatafonoPaymentController::index` selecciona `descuento` y emite:

| Campo | Valor | Para qué |
|---|---|---|
| `precio_cents` | `StoreProductPricing::unitPriceCents($precio, $descuento)` | Lo que el front cobra y el backend valida |
| `precio_base_cents` | PVP sin rebajar | Tachado en la UI |
| `descuento` | Porcentaje entero | Decidir si se pinta el tachado |

`createPaidPedido` (`:1729`) no se toca: ya calculaba con `unitPriceCents`, y con el catálogo corregido los importes coinciden.

**Dos matices al plan original.** El cálculo del front (`MostradorTicketModal.jsx:486-489`) ya sumaba `p.precio_cents`, así que no necesitaba cambio; lo que sí engañaba al operador era el **selector** (`:1069`), que mostraba el PVP base mientras el ticket cobraba el rebajado. Y ampliar solo el test de servicio no habría detectado la regresión, porque el servicio ya calculaba bien: el bug vivía en el payload del controlador, sin test que lo cubriera.

**Verificación:** `php artisan test` → 304 verdes, `npm run build` OK. Nuevo `tests/Feature/Payments/DatafonoProductCatalogDiscountTest.php` (payload con y sin descuento) y dos casos en `DatafonoProductStockAndFiscalTest.php`: cobro rebajado sin 422, y cobro al PVP base que **sigue** dando 422 para comprobar que la guardia anti-tampering no se ha aflojado.

---

## 9. Implementación F5 + B2 + B3 (2026-08-27) — RESUELTO

### F5 · el webhook cerraba en falso los cobros que no podía confirmar

Un 200 le dice a Stripe «recibido, no reintentes». El controlador lo devolvía también cuando la confirmación fallaba, así que un fallo pasajero dejaba al cliente cobrado y el payable en `pending` sin segunda oportunidad. La distinción ahora es explícita: `PaymentGatewayService::failure()` acepta `retryable` y el resultado lo transporta hasta el controlador.

| Fallo | `retryable` | Respuesta | Motivo |
|---|---|---|---|
| Payable no confirmable por estado | `true` | **503** | Puede confirmarse en el siguiente intento |
| Excepción de BD / deadlock | — | **500** (propaga) | Igual que arriba, sin necesidad de capturarla |
| Intent no registrado | `false` | 200 + alerta | El intent se persiste antes de devolver la URL; si no está, no aparecerá |
| Token de idempotencia distinto | `false` | 200 + alerta | Reintentar repite el mismo desajuste |
| Importe inferior al esperado | `false` | 200 + alerta | Ídem |

**Matiz al plan.** El encargo pedía «200 + alerta admin», pero en la app no hay canal de alertas: ni `Notification` a admin, ni correo de administración configurado, ni tabla de incidencias. En vez de inventar infraestructura, la alerta es un `Log::critical` con la marca estable `PaymentWebhookController::ALERT_PERMANENT_FAILURE`, que es lo que los tests verifican y lo que permitirá engancharla a un canal real sin tocar la lógica.

Programado también `payments:sync-stripe-session` cada 5 min: es la red que recupera un cobro cuyo webhook nunca llegó.

### B2 · el barrido de plazas dependía del tráfico

`Cache::remember('auto_cleanup_check', 900, …)` en el constructor de `LessonController` ataba la liberación de plazas a que alguien visitara la academia. Fuera del constructor y dentro del scheduler (`academy:cleanup`, cada 5 min). Al quitarlo, `AutoReleaseService` y el import de `Cache` quedaban sin uso en ese controlador y se han eliminado.

### B3 · la API de disponibilidad solo pedía sesión

`/api/bookings/check-availability` responde con `getBlockedRanges`, que incluye `id` y `status` crudos de cada reserva; con solo `auth`, cualquier socio podía enumerar la agenda interna.

**Comprobación previa:** ningún componente del front usa esa ruta. El calendario público llama a `rentals.bookings.check-availability` (`web.php:346`, payload sin ids vía `getPublicBlockedRanges`) y el mostrador a `admin.bookings.check-availability` (`web.php:503`). La de `api.php` es un duplicado sin nombre, así que cerrarla no rompe ninguna pantalla. El grupo pasa a `['auth', 'admin']` y el controlador añade `authorize('viewAny', Booking::class)` contra la nueva `BookingPolicy` (auto-descubierta; no hace falta registrarla). **B4 queda abierto** como pedía el encargo.

**Verificación:** `php artisan test` → 317 verdes (304 + 13). Sin front, sin build. Cubre el hueco declarado en §3: `tests/Feature/Payments/PaymentWebhookControllerTest.php` (firma inválida → 400; cobro correcto → un solo `PaymentConfirmed`; reenvío → 200 sin re-emitir; transitorio → 5xx; importe insuficiente y token inválido → 200 con alerta), más `CriticalCommandsScheduledTest.php` y `BookingAvailabilityApiAuthorizationTest.php`.
