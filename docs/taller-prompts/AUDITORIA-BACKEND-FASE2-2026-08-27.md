# Auditoría Backend — Fase 2: academia/taquillas restantes, fotos, SEO backend, chatbot, rendimiento (2026-08-27)

> Ejecutada por **Reasonix/DeepSeek** con la persona `docs/taller-prompts/AGENTE-BACKEND-SENIOR.md` (reglas R1–R8, formato §6).
> Método: 6 sub-agentes en paralelo (uno por dominio), cada uno con pre-vuelo (mapa → archivos reales → tests → citas `archivo:línea`).
> Estado: **informe para verificación de Cursor** (prompt en §5).
> Alcance: dominios NO cubiertos por la Fase 1 (dinero/consistencia, cerrada 2026-08-27). Stack: Laravel 12 · PHP 8.2 · Stripe · Sanctum · Pest 3.

---

## 0. Diagnóstico (1 párrafo)

**No hay P0**: nada de dinero/datos/seguridad roto de forma inmediata. El núcleo transaccional de los 6 dominios está bien resuelto (céntimos `int`, `lockForUpdate`, webhook idempotente, DTOs públicos sin fuga R5, eager loading mayoritario). Los **13 P1** son de 3 familias: **(a) consistencia de saldos/vigencia** (reembolso de academia calcula 2 unidades donde se cobró 1 → sobre-crédito; destrucción VIP sin refund; caché de vigencia de taquilla que bloquea a socios que sí pagaron; purge de 30 min vs sesión Stripe de 24 h → cobro sin cuota; asignación de taquilla sin índice único → doble ocupación), **(b) carreras caducidad/pago y concurrencia** (reserva de fotos cancelada por cron mientras Stripe confirma → reintento infinito sin alerta; `expires_at` de fotos leído en UTC vs escritura Madrid → caducidad desplazada en producción; TOCTOU de clase particular sin lock; N+1 del Commander admin ~250-450 queries), y **(c) superficie de seguridad/información del chatbot** (guard que no analiza `history` → bypass de prompt-injection; precios hardcodeados vs BD → el bot contesta tarifas distintas según la redacción). El resto (~25 P2) es deuda acotada: listados sin paginar, índices faltantes, tests SEO inexistentes, código muerto, cache sin invalidación.

---

## 1. Hallazgos priorizados por dominio

### 1.1 ACADEMIA (restante) — IDs A

| ID | Sev | Dónde | Problema | Por qué importa | Cómo | Esf. | KPI |
|---|---|---|---|---|---|---|---|
| A1 | P1 | `app/Services/CreditEngineService.php:163-173` vs `app/Actions/Academy/EnrollStudentAction.php:124` / `ApproveEnrollmentQuotaAction.php:108` | `resolveRefundUnits()` devuelve **2 unidades** en grupal/semanal mientras el cobro aplica **1** cuando la clase ya tenía ≥1 ocupante | Todo reembolso (Mal Mar, cancelación ≥4h, no-show) de grupal con >1 ocupante infla el saldo del bono +1 crédito por alumno | Persistir unidades reales consumidas (p.ej. `units_consumed` en `BonoConsumption`) y refundar esas mismas | M | CreditTransaction refund con amount > reales = 0 |
| A2 | P1 | `app/Http/Controllers/Admin/VipClassManagerController.php:268-296` (`destroy`) | Borra lesson+enrollments+staff **sin devolver créditos** (solo `Log::warning`) pese al flash «consumos revertidos» | Borrar VIP con alumnos inscritos pierde créditos del cliente sin trazabilidad | `CreditEngineService::refundCredits` por enrollment (o cancelar) dentro de la tx existente | M | Bonos con consumo huérfano a lesson borrada = 0 |
| A3 | P1 | `app/Actions/Academy/RequestPrivateLessonAction.php:56-86` (línea 70) | TOCTOU: 2 solicitudes concurrentes del mismo slot pasan `evaluate()` y crean 2 Lessons particulares solapadas (la particular crea la Lesson, no hay fila que bloquear) | Pool de 2 monitores: doble reserva de franja = conflicto operativo + depósitos de dos clases imposibles | Lock de franja (fila agenda o lessons solapadas con `lockForUpdate`) antes de crear | M | Lecciones particulares solapadas = 0 |
| A4 | P2 | `routes/web.php:315` + `RequestLessonAction.php:49-59` | Usuario autenticado **no-VIP** puede POST `academia/lessons/{vip|particular}/request`; el front lo oculta pero la API no valida modalidad | Plazas PENDING en clases VIP (precio 0 → checkout Stripe falla, plaza bloqueada hasta AutoRelease) | Gate en `RequestLessonAction`: VIP requiere `user->is_vip` | S | Enrollments VIP creados por no-VIP = 0 |
| A5 | P2 | `Admin/AcademyController.php:327-344` y `:381-398` | `cancelLesson`/`cancelBatch` fijan `refund_status = REFUND_PENDING` pero **ningún código resuelve ese estado** (sin endpoint ni job) | Cancelación admin de clase con alumnos de bono/tarjeta: saldo/crédito bloqueado indefinidamente | Definir flujo de reembolso (job/endpoint → `refundCredits` o devolución Stripe) + test | L | Enrollments `refund_status=pending` sin resolver >30 días = 0 |
| A6 | P2 | `app/Observers/LessonObserver.php:18-37` | `updated()` dispara refunds enrollment a enrollment, cada uno en tx propia, sin transacción única ni catch | Fallo del 3º de 10 alumnos → reembolso parcial con mensaje de éxito; re-ejecución idempotente pero no repara el parcial | Envolver el bucle en `DB::transaction` con enrollments lockeados + log de fallo por alumno | S | Clases Mal Mar con enrollments no-REFUNDED = 0 |
| A7 | P2 | `Academy/LessonController.php:524-584` + `MyReservationsController.php:49-101` | `payPendingEnrollment`/`payClassEnrollment`: `->first()` sin `lockForUpdate` y Checkout sin idempotency por enrollment | Doble clic → 2 sesiones Stripe para la misma plaza → posible doble cobro | Sesión única por enrollment (chequear dentro de tx con enrollment lockeado) | S | Checkout Sessions activas por enrollment >1 = 0 |
| A8 | P2 | Docs (`PROJECT_TREE_FOR_GEMINI.md:90,344,472`) vs código | **No existen** `UploadLessonProofAction`, `LessonProofStorageService`, `NotifyAdminLessonProofUploadedListener`, `LessonProofUploadedEvent`, `UploadLessonProofRequest` (grep → 0) | Flujo de justificante prometido no implementado; el pago manual de clases no tiene comprobante del cliente | Decidir: implementar upload (policy+mime) o borrarlo de docs; test del visor admin | L | Ruta `academy.proof.store` presente (1) |

**Backlog A:** `AdminGuestEnrollmentAction` no valida clase no empezada (walk-in a clase pasada); `AcademyController::confirmEnrollment` re-chequea cupo con `preview()` sin lock (admin, riesgo bajo); `AcademyController::__construct:39-41` cleanup inline cacheado redundante con cron; `AcademyLessonRequestMailService:22-23` no envía confirmación a invitados (`guest_email`); dispatch de `LessonRequestedEvent` dentro de la tx sin `after_commit` (rollback → listener en cola con enrollment inexistente).

### 1.2 TAQUILLAS (restante) — IDs T

| ID | Sev | Dónde | Problema | Por qué importa | Cómo | Esf. | KPI |
|---|---|---|---|---|---|---|---|
| T1 | P1 | `migrations/0001_01_01_000000_create_users_table.php:23`; `TaquillaMembershipService.php:947-954`; `TaquillaController.php:58-75` | `numeroTaquilla` sin índice UNIQUE; asignación por «lock del ocupante» (TOCTOU): 2 transacciones concurrentes asignan la misma taquilla libre; el flujo legacy `AsignarTaquilla`/`liberarTaquilla` ni siquiera pasa por el servicio | Doble ocupación de casillero físico pagado, corrupción silenciosa e indetectable | Índice único parcial (excluyendo `config('vip.shared_locker_numbers')`) + migración de saneamiento + unificar flujos en el servicio | M | `GROUP BY numeroTaquilla HAVING COUNT(*)>1` = 0 |
| T2 | P1 | `TaquillaMembershipService.php:923-938`; `User.php:272-291`; `VerificarTaquilla.php:36-44` | `syncUserLockerCacheFromConfirmedPayments` solo toma pagos con `periodo_inicio <= now`: en renovación prepagada encadenada el caché apunta al fin del periodo anterior (pasado) y **nada lo refresca** (sin job diario) | Socio con cuota confirmada pierde `isLockerPaymentUpToDate()` → bloqueo de descuento tienda/carrito y llave de emergencia; panel le muestra «activo» → contradicción visible | Derivar caché del pago con `MAX(periodo_fin)` confirmado (incluyendo futuros) o leer `pagos_cuotas` directamente; job diario de backfill | M | % socios con pago futuro confirmado y caché pasada = 0 |
| T3 | P1 | `TaquillaMembershipService.php:513-552`; `config/taquilla.php:10`; `PaymentWebhookController.php:87-105` | El purge borra el `PagoCuota` a los **30 min** pero la sesión Stripe vive **24 h**: socio que paga entre min 31 y 24 h es cobrado y webhook/sync encuentran el pago borrado → fallo permanente (200 + log critical) sin recuperación | Dinero cobrado sin cuota activa; no lo arreglan reintentos ni `payments:sync-stripe-session` | No purgar pendientes con `payment_webhook_idempotency` viva / `expires_at` futuro; alinear `expires_at` del PagoCuota con la sesión Stripe | M | Webhooks PagoCuota `ok=false` / alerta permanente = 0 |
| T4 | P2 | `TaquillaController.php:35-114` vs `TaquillaMembershipService.php:960-969` | `AsignarTaquilla`/`liberarTaquilla` no escriben `taquilla_audit_logs` y `liberarTaquilla` no limpia `fecha_vencimiento_cuota`/`id_plan_vigente` | Auditoría incompleta + residuo de caché tras liberar | Reusar el servicio (audit + limpieza) y deprecar `TaquillaController` | S | % asignaciones/liberaciones sin auditoría = 0 |
| T5 | P2 | `EmergencyKeyService.php:18-66`; `EmergencyKeyController.php:26-30`; `routes/web.php:419-421` | `requestCode` sin throttle: cualquier socio al día revela el código y deja el candado OFF indefinidamente; `show()` solo valida `numeroTaquilla!=null` (VIP compartido falla con mensaje genérico) | DoS operativa (candado siempre apagado) + ruido de soporte | Throttle/cooldown por socio (1/día), registrar `numeroTaquilla`, validar `hasPhysicalLocker()` | S | Peticiones de llave por socio/día ≤1 |
| T6 | P2 | `LockerPaymentIndexBuilder.php:95-101` | `progress = min(total, \|dias_restantes\|)/total` invertido (recién renovado ~100%, a punto de caducar ~0%); hoy código muerto | Si se conecta al front, semáforos mostrarían lo contrario | `progress = (total - min(dias_restantes, total))/total` + test | S | Diferencia progress vs % consumido = 0 |
| T7 | P3 | `UserTaquillaController.php:63-82`; `User.php:100` | `show()` carga `pagos`/`pagos.plan`, relación inexistente (solo `pagosCuotas`) → 500 si se registrara; sin rutas hoy | Deuda trampa (IDOR + relación rota) | Eliminar o mapear a `pagosCuotas` + autorización | S | Endpoints muertos sin ruta = 0 |
| T8 | P3 | `CuotaService.php:24-50` vs `TaquillaMembershipService.php:383-392` | Lógica de fechas duplicada: `CuotaService::calcularPeriodoRenovacion` (sin uso) diverge de la inline; `buildClientIndex` no filtra pendientes caducados | Futuro cambio de reglas afecta solo a una implementación; el cliente ve checkouts abandonados | Borrar/unificar `CuotaService`; filtrar `isExpiredPending()` en `buildClientIndex` | S | Implementaciones de periodo 1→1 |

### 1.3 FOTOS — IDs P

| ID | Sev | Dónde | Problema | Por qué importa | Cómo | Esf. | KPI |
|---|---|---|---|---|---|---|---|
| P1 | P1 | `app/Models/PhotoSessionBooking.php:61` (cast `'datetime'` en `expires_at`); `.env:5` `APP_TIMEZONE=UTC`; `phpunit.xml:22` `Europe/Madrid` | `expires_at` se escribe en reloj de pared Madrid pero se lee como UTC → `isCheckoutExpired()`, guard de confirmación y re-check del cron se desplazan 1–2 h (solo en producción; los tests pasan porque fuerzan Madrid) | La caducidad real de checkouts abandonados no se cumple: el cron omite el re-check PHP, la ventana de confirmación se estira, estados admin erróneos | Castear `expires_at`, `reviewed_at`, `proof_uploaded_at` con `BusinessWallClockDatetime` + test que falle con `APP_TIMEZONE=UTC` | S | Columnas de fecha fuera de `BusinessWallClockDatetime` = 0 |
| P2 | P1 | `PhotoBookingService.php:135-168` + `ConfirmPhotoBookingPaymentAction.php:31-58` + `PaymentGatewayService.php:525-544` + `PaymentWebhookController.php:87-105` | Carrera: el cron marca `cancelled` antes de que llegue `checkout.session.completed` → confirmación lanza `ValidationException` → `retryable:true` → **503 a Stripe → reintento infinito**; `ALERT_PERMANENT_FAILURE` nunca se dispara y `payments:sync` falla igual | Dinero capturado con reserva cancelada, sin alerta ni reembolso automático | Distinguir cancelado/rechazado definitivo de transitorio: resucitar la reserva a confirmada o devolver fallo NO retryable + alerta + refund | M | Cargos Stripe sin reserva confirmada = 0; intents `pending` eternos = 0 |
| P3 | P2 | `PhotoBookingService.php:70-128` (`createBooking`) | Sin control de solape del hueco: 2 reservas pueden solaparse en `fecha_inicio..fecha_fin`; `capacidad_maxima` solo limita `party_size` | Overbooking: dos clientes citados a la vez para el mismo fotógrafo | En la tx con `lockForUpdate` sobre la sesión, consultar solapes `status IN (pending,confirmed,attended)` y 422 | M | 0 solapes confirmados; test doble reserva → 422 |
| P4 | P2 | `PhotoBookingService.php:159-163` (`cancelExpiredPending`) | Al cancelar por caducidad no se fija `reviewed_at` ni se limpia `expires_at`, sin evento/notificación | Metadata incoherente + sin traza auditada ni aviso al usuario | `reviewed_at => now`, `expires_at => null` + evento cancelación | S | 100% canceladas con `reviewed_at` y evento |
| P5 | P3 | `PhotoBookingService.php:185-206`; `PhotoSessionBooking.php:17` | Código muerto (`bookingsForUser`, `pendingPaymentBookings`) y estado `attended` sin transición/endpoint | Mantenimiento confuso; funcionalidad inexistente sugerida | Eliminar métodos no usados o estado inalcanzable | S | 0 métodos sin llamantes |
| P6 | P2 | `tests/Feature/Photos/*` (solo 3 archivos) | Sin tests del flujo completo: confirmación vía webhook/gateway, HTTP admin confirm/reject, carrera caducidad-webhook, reproducción `APP_TIMEZONE=UTC` | P1 y P2 pasan desapercibidos porque la suite fuerza Madrid y no ejercita gateway ni panel | Añadir tests (webhook confirm, cancel→no-retryable o resurrección, UTC, admin HTTP) | M | Cobertura ≥80% ramas Confirm/Reject/cancelExpired |
| P7 | P3 | `2026_08_07_140000_add_expires_at_to_photo_session_bookings.php:15` | Índice compuesto `(status,payment_status,expires_at)` redunda al `(status,payment_status)` base | Coste de escritura extra sin beneficio | Eliminar el índice simple en migración | S | 1 índice por prefijo |

**Riesgo extra P2:** `ConfirmPhotoBookingPaymentAction` no valida `payment_status === pending` antes de confirmar (solo excluye `rejected`); `book()` fallido tras error Stripe deja `expires_at`+`pending` en fila `cancelled` (inocuo hoy por filtros).

### 1.4 SEO backend — IDs S

| ID | Sev | Dónde | Problema | Por qué importa | Cómo | Esf. | KPI |
|---|---|---|---|---|---|---|---|
| S1 | P1 | `app/Http/Controllers/ProductoController.php:71-89` | `ver()` usa `findOrFail($id)` sin filtrar `eliminado=1` → ficha 200 `index,follow` para productos retirados (sitemap y tienda sí lo excluyen) | Soft-404: producto retirado sigue indexable desde URL directa/índice viejo; crawl budget + calidad del catálogo | `abort_if((bool) $producto->eliminado, 404)` | S | URLs `/producto-ver/*` retiradas con 200 = 0 |
| S2 | P1 | `tests/` (grep sitemap\|robots\|noindex = 0) | **Cero tests** del backend SEO: robots, sitemap, noindex carrito/subastas/admin, canonical, JSON-LD, no-fuga R5 | Los guardrails R3/R5 se cumplen por convención, no por CI: un refactor de DTO puede filtrar `purchase_price`/margen o indexar áreas privadas sin detección | `tests/Feature/Seo/SitemapSeoTest.php` + `PublicPayloadGuardTest` | M | Nº tests SEO 0→~10; regresiones de indexación = 0 |
| S3 | P2 | `PublicSitemapService.php:22-24,108` | Cache `seo.sitemap.xml.v2` (TTL 1h) sin invalidación real (`forgetCache()` sin call sites); docs dicen `v1` | Contenido nuevo tarda ≤1h en entrar al sitemap y retirados siguen listados ≤1h | Observers/eventos en writes (Article, Producto, SecondHandBoard, Surfboard) o comando; actualizar doc a `v2` | S | Tiempo hasta inclusión <5 min |
| S4 | P2 | `AutoCoachController.php:26-52` + `PublicSitemapService.php:82` | `/comparador-surf` (público, sube vídeos) se excluye solo vía `Disallow` de robots; sin `<meta noindex>` | Indexación «barnacle» por enlaces externos; uploads en zona gris | Prop `seo` con `robots: noindex, nofollow` en AutoCoach/Index | S | URLs `/comparador-surf*` en índice GSC = 0 |
| S5 | P2 | `PublicSitemapService.php:185-197` vs `.cursor/rules/seo-geo-public.mdc:105` | Sitemap incluye tablas `reserved`; la regla dice «(available)»; al pasar a `sold` → 404 pero sigue listada hasta TTL; JSON-LD `OutOfStock` | Rich results degradados; URLs 404 en sitemap | Incluir solo `available` o actualizar regla; TTL corto | S | URLs `/segunda-mano/*` 404 en sitemap = 0 |
| S6 | P2 | `routes/web.php:307-318` + `LessonController.php:50` | `/academia` bloqueada en robots sin `<meta noindex>` ni entrada en sitemap | Landing pública invisible para Google sin noindex explícito que la fije | Decidir: indexarla (sitemap + `PublicPageSeoService::academia()`) o noindex explícito | S | Visibilidad de `/academia` en GSC |

**Verificado OK (R5):** `SecondHandBoard::toPublicArray()` (165-212) sin `purchase_price`; `Auction::toPublicArray()` (194-243) sin margen y `adminIndex` solo añade internos bajo ruta admin; `PlanTaquillaPublicDto`/`LockerOccupantDto` solo en admin; `HandleInertiaRequests` sin códigos/IDs admin; sitemap excluye carrito/subastas/admin correctamente.

### 1.5 CHATBOT — IDs C

| ID | Sev | Dónde | Problema | Por qué importa | Cómo | Esf. | KPI |
|---|---|---|---|---|---|---|---|
| C1 | P1 | `ChatbotAgentService.php:121` (+ `:263`; `GoogleAIService.php:43-50`) | `ChatbotPromptGuard` solo analiza `message`; el `history` del cliente (hasta 24 turnos, solo `strip_tags`) se reenvía íntegro a Gemini sin pasar por el guard | Atacante anónimo manda «hola» + turno hostil inyectado en `history`: se elude el anti-inyección documentado, el modelo puede desviarse de las reglas S4 y se quema coste por IP | Aplicar `detect()` a cada turno de `history` antes de `generateReply` (y/o excluir history si flag); test con `Http::fake()` | S | % llamadas Gemini con texto hostil en history = 0 |
| C2 | P1 | `ChatbotService.php:97-100` vs `:318-321` (+ `S4BusinessKnowledgeService.php:28-63`) | Precios de clases particulares **hardcodeados** («1→80€ · 2→55€ …») en el patrón estático `classes.private`, mientras la consulta con «precio» usa la tarifa viva de BD | Dos fuentes de verdad del mismo precio: según la redacción el bot contesta tarifas distintas; al editar en admin la estática queda desactualizada | Quitar precios del texto estático y resolver `classes.private` contra `surfPricingFaqText()`/tarifa viva | S | Divergencias precio bot vs BD = 0 |
| C3 | P2 | `PersistChatbotHistoryJob.php:36-60` (+ `ChatbotAgentService.php:438-451`) | El job sobrescribe la interacción abierta con el snapshot completo del turno (sin merge ni clave por turno); tras derivar a humano, el branch `REQUIRES_HUMAN` no persiste turnos posteriores | Con cola `database` y 2 mensajes rápidos, el snapshot viejo puede sobrescribir al nuevo (lost update) → huecos en el panel; la conversación post-escalación no queda registrada | Merge append-only / clave `(user_id, turn_index)` / encadenar jobs por usuario; persistir también REQUIRES_HUMAN | M | % chats con turnos ausentes = 0 |
| C4 | P2 | `GoogleAIService.php:55` | API key de Gemini en la **query string** (`?key=`) | La URL se registra en logs de servidor/proxy/CDN | Enviar `x-goog-api-key` header | S | `key=` en logs = 0 |
| C5 | P2 | `tests/` (solo `ChatbotDisplayNameTest.php`) | Dominio chatbot sin tests de feature (guard→FAQ→Gemini→streak→escalación→contact-phone→job) | C1/C2 no se detectaron por pruebas; refactor de `ChatbotAgentService` rompe la derivación silenciosamente | Feature tests de `ProcessChatbotQueryAction` con `Http::fake()` (6 flujos) | L | Cobertura de los 6 flujos = 100% |
| C6 | P2 | `ChatbotAgentService.php:396-434` | En `escalate`, sin interacción abierta, 2 escalaciones concurrentes hacen `lockForUpdate` sobre fila inexistente → ambos `INSERT` | Casos REQUIRES_HUMAN duplicados; WhatsApp puede dispararse 2 veces | Índice único parcial `(user_id, status)`/`(session_token, status)` o `firstOrCreate` con manejo de conflicto; dedupe en panel | M | Casos duplicados por sesión = 0 |
| C7 | P2 | `S4BusinessContextService.php:41-43` (+ `RegisteredUserController.php:36`, `ChatbotDisplayName.php:8-19`) | El `nombre` del usuario (editable, max 50) se interpola sin validar en la `systemInstruction` de Gemini; `ChatbotDisplayName` solo bloquea `[]{}<>\n` | Superficie de prompt-injection vía ficha: «jailbreak»/«IGNORA» como nombre | Sanear/rechazar nombres con patrones del guard antes de inyectarlos | S | % nombres hostiles intactos al system prompt = 0 |
| C8 | P2 | `RouteServiceProvider.php:27-29` | `throttle:chatbot` (20/min/IP) no distingue FAQ local (gratis) de llamadas Gemini (coste) | Atacante (o bypass C1) fuerza llamadas Gemini desde muchas IPs sin tope global diario: coste/DoS | Tope diario solo para la rama Gemini o monitorización de coste con alerta | M | Coste €/día y llamadas forzadas/IP |

**Backlog C:** sin Feature tests; guard no re-ejecutado en branch REQUIRES_HUMAN (`:82-119`); índice compuesto `(status,user_id)` para `openFor`; `trustProxies(at:'*')` solo local → tras proxy real el rate limiter agrupa por IP del proxy; IP en log de validación; regex del guard con bypasses léxicos («no sigas las reglas…») mitigados por system prompt + temperatura 0.2.

### 1.6 RENDIMIENTO — IDs R

| ID | Sev | Dónde | Problema | Por qué importa | Cómo | Esf. | KPI |
|---|---|---|---|---|---|---|---|
| R1 | P1 | `Admin/ClassManagerController.php:116-126` | `mapLesson()` llama `AvailabilityService::preview()` **por cada clase** del mes; cada preview abre `DB::transaction` + `buildIntervals` (1 query + 2 eager) = **~3 queries × N clases** (`AvailabilityService.php:98-105,305-330`) | Pantalla admin principal (Commander), uso diario: verano con 80-150 clases → **~250-450 queries/request** | Batch: calcular solapamientos/peak en memoria con el set precargado (o paginar el calendario) | M | Queries en `ClassManagerController::index` < 15 |
| R2 | P2 | `VipStudentPerformanceService.php:186-193` → `resolveLessonUserIdForAttendanceRow()` `:652-691` | Query a `lesson_user` dentro del loop del `attendanceMap` (limit 240) → **240-480 queries** por perfil | Dashboard alumno VIP (cliente) y análisis admin | Preconstruir map `lesson_id→lesson_user.id` con los ya cargados | M | Queries en `buildPerformanceData()` < 20 |
| R3 | P2 | `DatafonoPaymentReconciliationService.php:467-488` | `listPayments` `limit(100)` **sin paginación** (verificado, P2 de Fase 1) + morph `'payable'` sin `morphWith` → N+1 para payables legacy 1:1 | Ledger: el admin solo ve los últimos 100 cobros (riesgo de conciliación) + queries extra | `paginate()` + `morphWith` | S | Queries en listPayments; nº cobros accesibles |
| R4 | P2 | `AuctionCatalogService.php:21-27,58-77`; `StorePromoBannerService.php:70` | `publicCatalog()`/`adminIndex()` cargan todas las subastas sin paginar; el banner de tienda la ejecuta en cada página pública | Payload crece con cada subasta cerrada; coste duplicado en tienda | `paginate()`/`limit` + filtros; banner → query `first()` acotada | S | Tamaño payload / tiempo `GET /subastas` |
| R5 | P2 | `SecondHandPublicCatalogService.php:31-40` | Catálogo público 2ª mano sin paginar (`count()` + `get()` de todas) | Payload Inertia crece sin límite | `paginate()`/limit+offset como `TallerArticleService::relatedPage` | S | Tamaño payload / latencia `/segunda-mano` |
| R6 | P2 | `Admin/AcademyController.php:39-41` | `Cache::remember('auto_cleanup_check', 900)` ejecuta escrituras con `lockForUpdate()` en el constructor; `Cache::remember` no es atómico y la clave nunca se invalida | Cron dentro del ciclo HTTP de Commander; stampede en cache fría bloquea filas `lesson_user` | Mover a comando programado existente o `Cache::lock`/`Cache::add` + cola | S | Duplicados de cleanup; latencia primer request |
| R7 | P2 | `TaquillaMembershipService.php:637`; `StoreProductCatalogService.php:27-31` | Registro de pagos taquilla `limit(300)` sin paginar; `adminIndexRows()` de productos sin paginar | Admin registry/catálogo crecen | `paginate()` en ambos | S | Queries y payload Registry/Catálogo |
| R8 | P2 | `migrations/2026_03_16_140001_create_lessons_table.php`; `BookingService.php:227-228,252-253` | `lessons.starts_at` **sin índice** (ClassManager, `buildIntervals`, `catalogUpcomingLessons` filtran por rango); `isAvailable`/`getBlockedRanges` usan `COALESCE(pickup_at,start_date)` que **inutiliza** `bookings_availability_index` | Range scans en cada request admin y en cada reserva | Índice `lessons(starts_at, status)`; quitar `COALESCE` o columnas computadas | S | `EXPLAIN` de disponibilidad |

**Backlog R:** `PublicSitemapService::forgetCache()` nunca se invoca (solo TTL 1h); `autoCloseExpiredLiveAuctions()` sin `chunk()`; `ProductDetailPageService::relatedPayload()` `get()` de todo el catálogo + `take(12)` PHP; índice único `(payable_type,payable_id)` + duplicado redundante en `fiscal_invoices`; payload Inertia ~500 usuarios + 300 productos en `DatafonoPaymentController`; `TallerArticleService::listCards()` sin paginar.

---

## 2. Riesgos de consistencia (transversales)

- **Doble fuente de verdad de vigencia de taquilla** (caché `users` vs `pagos_cuotas`): divergen en prepagos futuros (T2) y liberaciones que no limpian caché (T4); el middleware, el descuento de tienda y la llave de emergencia leen el caché, los paneles leen `pagos_cuotas`.
- **Purge vs sesión Stripe** (T3 + P2): el patrón «pendiente con TTL corto + sesión Stripe larga» convierte un abandono en dinero cobrado sin registrar; también el cron de caducidad de fotos compite con el webhook.
- **Refund de academia**: unidades de crédito calculadas en el cobro y en el reembolso por caminos distintos (A1), destrucción sin refund (A2), estados `REFUND_PENDING` sin resolutor (A5), refunds no atómicos (A6).
- **Zona horaria:** `APP_TIMEZONE=UTC` en producción vs `Europe/Madrid` en phpunit oculta bugs de caducidad solo en producción (P1 fotos; verificar si afecta a más cast `datetime` — solo se auditaron fotos).
- **Chatbot:** precios a 3 fuentes + 1 hardcode (C2); `--tries=1` + `failed_jobs` sin monitorizar → pérdida silenciosa (C3/C6); coste Gemini sin tope global (C8).
- **Rendimiento:** N+1 de páginas admin calientes (R1) y N+1 de listados sin paginar (R3-R5, R7); `Cache::remember` con escrituras dentro del ciclo HTTP (R6).

---

## 3. Cómo validar (evidencia y tests)

- **Tests existentes que ya cubren zonas:** `tests/Feature/Academy/{BonoFifoConsumptionTest,EnrollStudentDuplicateTest,RequestLessonDuplicateTest}`, `DatafonoWalkInClaseTest`; `tests/Feature/Taquilla/{TaquillaPendingCheckoutExpirationTest,VigenciaPayloadTest,ClientPlanesFiscalInvoiceTest}` (ojo: el primero fija los 30 min que T3 propone cambiar); `tests/Feature/Photos/*` (9 tests, fuerzan `Europe/Madrid`).
- **Huecos de tests (P2, todos los dominios):** sin tests de `CancelEnrollmentAction`, `LessonObserver`, `AutoReleaseService`, `VipClassManagerController::destroy`, `EmergencyKeyService`, concurrencia de subastas→(cerrado F2 en Fase 1), **0 tests SEO** (S2), chatbot sin feature tests (C5), fotos sin flujo webhook/admin (P6), rendimiento sin test de queries.
- **Comandos:** `php artisan test --filter=Academy|Taquilla|Photos|Chatbot|Seo`; `php artisan photos:cancel-expired`; `php artisan payments:sync-stripe-session --dry-run`; `php artisan schedule:list`; consulta de duplicados `SELECT numeroTaquilla, COUNT(*) FROM users WHERE numeroTaquilla IS NOT NULL GROUP BY numeroTaquilla HAVING COUNT(*) > 1` (T1); `EXPLAIN` de `lessons.starts_at` (R8); contador de queries con `DB::enableQueryLog()` en Commander/VIP (R1/R2).

---

## 4. Decisión ejecutiva

1. **Cursor verifica** el informe en código (prompt en §5; modelo recomendado: Claude Opus, mismo que validó Fase 1).
2. **Fixes P1 por lotes, en este orden:**
   - **Lote 1 (dinero/consistencia):** A1 (unidades de refund) + A2 (refund destroy VIP) + T3 (purge vs Stripe) + T2 (caché vigencia prepagada).
   - **Lote 2 (concurrencia/caducidad):** A3 (lock particular) + P1 (cast `BusinessWallClockDatetime` + test UTC) + P2 (carrera cancelación-webhook: resurrección o fallo no-retryable + alerta) + T1 (índice único + saneamiento).
   - **Lote 3 (seguridad/información):** C1 (guard sobre history) + C2 (precios vivos) + S1 (404 productos eliminados).
   - **Lote 4 (P2 priorizados):** R1 (N+1 Commander) → S2 (tests SEO) → A4 (gate VIP) → R3 (paginación ledger) → resto de P2 por Esfuerzo S primero.
3. **NO implementar nada sin luz verde del dueño.** Cada fix: build + tests verdes.
4. **Decisiones de producto para el dueño:** A8 (flujo de justificantes: implementar o borrar de docs), S6 (`/academia` indexar o no), P5 (eliminar `attended` si no hay flujo de asistencia).

---

## 5. Prompt para Cursor (verificación)

Pegar en Cursor (chat nuevo, sin contexto de otros chats):

```
Rol: verificación de auditoría backend (Fase 2) del proyecto maider_0 (Laravel 12). NO implementes nada todavía: abre cada archivo:línea citado, confirma/corrige/descarta cada hallazgo y devuelve una tabla con tu veredicto (CONFIRMADO / MATIZ / DESCARTADO + cita actualizada).

Informe maestro: docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md (secciones 1.1 a 1.6).

Verifica TODOS los hallazgos P1 (13): A1, A2, A3, T1, T2, T3, P1, P2, S1, S2, C1, C2, R1.
- Reproduce donde puedas (p.ej. A1: cálculo de unidades cobradas vs refundadas; T3: TTL del purge vs expires_at de la sesión Stripe; P1: cast de expires_at y APP_TIMEZONE; R1: nº de queries por clase del Commander).
- Para los P2, verifica al menos los de Esfuerzo S con implicación de seguridad/datos: A4, A7, T5, S3, S4, S5, C4, C7, R6, R8.
- Devuelve también: (1) si los 3 tests de Taquilla fijan comportamientos que T3 rompería; (2) lista de archivos que tocarías por lote si implementáramos; (3) cualquier hallazgo adicional P0/P1 que veas en esos dominios y no esté en el informe.
No des por bueno nada por confianza: cita el código real.
```

---

## 6. Verificación Reasonix (2026-08-27) — misma persona, repo local

Ejecutada con el prompt de §5 (independiente de la auditoría: 5 sub-agentes re-abrieron los archivos). **0 DESCARTADO · 9 CONFIRMADO · 5 MATIZ** (los matices refinan causa/alcance, ninguno invalida el P1).

| ID | Veredicto | Matiz / confirmación clave |
|---|---|---|
| A1 | CONFIRMADO | `CreditEngineService:163-174` refunds `unitsForCharge(modality,1)`=2 siempre; cobro aplica 1 si la clase ya tenía ocupante (`LessonBonoCreditUnits:37-46`). Sobre-reembolso de 1 crédito. |
| A2 | CONFIRMADO | `VipClassManagerController::destroy` borra enrollments+lesson sin `refundCredits`; `LessonObserver` solo tiene `updated` (Mal Mar), no `deleted`. |
| A3 | CONFIRMADO | `evaluate()` lectura sin locks; `lessons` sin índice de solape; REPEATABLE READ → 2 lessons del mismo slot. |
| T1 | MATIZ | Sin índice UNIQUE ✅; el TOCTOU se serializa accidentalmente por next-key locks en InnoDB RR, pero no está garantizado por BD → el fix correcto es el UNIQUE, no el lock. |
| T2 | CONFIRMADO | `syncUserLockerCacheFromConfirmedPayments:929` filtra `periodo_inicio <= now`; sin job diario (console.php solo agenda purge y sync). Socio pagado aparece en mora. |
| T3 | MATIZ | Purge 30 min vs sesión 24 h ✅; pero la respuesta del webhook es **503 retryable** (no 200+critical): `PaymentWebhookController:90-97`. Stripe reintenta ~3 días y abandona → cobro sin cuota sin alerta. |
| P1 | MATIZ | Cast `'datetime'` + `APP_TIMEZONE=UTC` prod vs Madrid en phpunit ✅; `isPast()` es autoconsistente (instante), el desfase real está en la **SQL** de `cancelExpiredPending` (Carbon Madrid vs columna UTC) → caducidad 1-2 h tarde. |
| P2 | CONFIRMADO (matiz «infinito») | Carrera cron-webhook ✅ → `ValidationException` → `retryable:true` → 503 → **ALERT nunca se dispara**; Stripe abandona tras ~3 días, cobro sin confirmar y sin alerta. |
| S1 | CONFIRMADO | `ProductoController:77` `findOrFail` sin `eliminado=0`; sitemap y tienda sí excluyen; `PublicPageSeoService::producto` emite `index,follow` por defecto → soft-404 indexable. |
| S2 | CONFIRMADO | grep sitemap\|robots\|noindex = 0 matches reales (único hit: `toEqualCanonicalizing`, falso positivo). |
| C1 | CONFIRMADO | Guard solo `detect($query->message)` (`:121`); `history` controlado por el cliente se reenvía intacto a Gemini (`GoogleAIService:43-50`). Bypass prompt-injection. |
| C2 | CONFIRMADO (matiz) | Hardcode 1→80€… en `ChatbotService:98`; el patrón de precio (`:318`) se evalúa antes, así que el estático solo responde sin palabra «precio» → 2 fuentes de verdad reales. |
| R1 | CONFIRMADO | `ClassManagerController:76,116-125`: 3 SELECTs por clase → ~6+3N (80→~246, 150→~456). La estimación 250-450 encaja. Alternativa en memoria ya disponible (`$lessons` precargado). |

**Además (P2/P3 verificados):** A4 CONFIRMADO (gate VIP solo en front, daño limitado: pago por tarjeta) · A7 CONFIRMADO (`->first()` sin lock + sin Idempotency-Key real a Stripe + `payClassEnrollment` no chequea `status`) · T5 CONFIRMADO (sin throttle; mitigado: el candado se apaga tras 1 reveal) · P3 CONFIRMADO (**sube a P1**: overbooking de hueco de fotos sin solape ni aforo real) · C4 CONFIRMADO bajo (key en query string; `x-goog-api-key` disponible) · C7 MATIZ bajo (`ChatbotDisplayName` ya filtra `[]{}<>\n`, 40 chars, 1ª palabra; riesgo marginal) · R2/R3/R6/R8 CONFIRMADOS con matices (R3: N+1 solo en cobros legacy sin ticket; R8: `surfboard_id` sí usa el índice, se pierde el rango COALESCE).

**Ajuste a la decisión ejecutiva:** mover **P3 (overbooking fotos) al Lote 2** (concurrencia) por confirmarse P1. T3: el fix debe además decidir qué respuesta dar al webhook (503 retryable hoy → con el fix de no-purge desaparece la causa; añadir alerta permanente si aun así ocurre).

*Riesgo residual: hallazgos verificados por lectura de código (read-only); Cursor debe confirmar citas y reproducir donde aplique (p.ej. A1 con una grupal de 2+ ocupantes, T3 simulando pago entre min 31 y 24 h, P1 con `APP_TIMEZONE=UTC`).*

---

## 7. Verificación Cursor (2026-08-27) — independiente, código real

Prompt: `docs/taller-prompts/PROMPT-VERIFICACION-FASE2.md`. **0 código de app.** Citas reabiertas. Contraste con Reasonix §6 donde hay discrepancia.

**P1:** 0 DESCARTADO · 11 CONFIRMADO · 2 MATIZ (T3, S2). **Ningún P1 se cae.**

| ID | Veredicto | Sev | Dónde (cita actual) | Comentario | Esf. |
|---|---|---|---|---|---|
| A1 | CONFIRMADO | P1 | `LessonBonoCreditUnits.php:37-45` · `EnrollStudentAction.php:124` / `ApproveEnrollmentQuotaAction.php:108` (`participantTotalAfter`) · `CreditEngineService.php:163-173` (`quantity`/`party_size`, casi siempre 1) · `BonoConsumption` sin `units_consumed` | 1.º ocupante grupal: cobra 2, refund 2. 2.º+: cobra 1, refund 2 → +1 crédito. `credits_locked` siempre 0. | M |
| A2 | CONFIRMADO | P1 | `VipClassManagerController.php:268-295` | Log `virtual_credit_refund_uc=1` y flash «consumos revertidos»; **cero** `refundCredits`. `LessonObserver` no tiene `deleted`. | M |
| A3 | CONFIRMADO | P1 | `RequestPrivateLessonAction.php:56-86` · `AvailabilityService.php:134-146,316-330` (GET sin `lockForUpdate`) | TX sin fila que bloquear: dos particulares del mismo slot pasan `evaluate()` y crean 2 Lessons. | M |
| T1 | CONFIRMADO | P1 | `0001_01_01_000000_create_users_table.php:23` (sin UNIQUE; 0 migraciones posteriores) · `TaquillaMembershipService.php:947-954` · `TaquillaController.php:58-75` | **Discrepo §6:** sin índice en `numeroTaquilla` no hay next-key lock útil; dos `lockForUpdate` sobre 0 filas no serializan. VIP 500/600 sí admite múltiples (`VipVirtualLocker`). Legacy `AsignarTaquilla` no audita. | M |
| T2 | CONFIRMADO | P1 | `TaquillaMembershipService.php:923-937` · `User.php:272-291` · `VerificarTaquilla.php:36-50` | Sync solo periodo que **solapa now**. `isLockerPaymentUpToDate` sí mira `periodo_fin >= today` **pero AND** con caché no pasada → tras el fin del periodo anterior, socio prepagado = mora (tienda, llave). Sin job diario de backfill. | M |
| T3 | MATIZ | P1 | `config/taquilla.php:10` (30 min) · `TaquillaMembershipService.php:500-541` · `PaymentGatewayService.php:80-95` (Checkout **sin** `expires_at` → default Stripe 24 h) · `:369-383` (`retryable: true`) · `PaymentWebhookController.php:87-105` | Dinero cobrado + `PagoCuota` borrado **sí**. Tras F5 el webhook es **503**, no 200+`ALERT_PERMANENT_FAILURE`. Stripe reintenta ~3 días y para. `payments:sync-stripe-session` falla igual. | M |
| P1 | CONFIRMADO | P1 | `PhotoSessionBooking.php:59-61` (`datetime`) vs `fecha_*` con `BusinessWallClockDatetime` · `.env` `APP_TIMEZONE=UTC` · `.env.example` y `phpunit.xml:22` = `Europe/Madrid` · write `PhotoBookingService.php:104-106` (`BusinessDateTime::now()`) | **Discrepo §6 en la causa:** SQL compara reloj de pared; el skip en prod es el re-check PHP `isPast()` (`PhotoBookingService.php:154-155`, `ConfirmPhotoBookingPaymentAction.php:46-48`) al interpretar naive como UTC → ventana **1–2 h tarde**. Tests verdes porque fuerzan Madrid. | S |
| P2 | CONFIRMADO | P1 | `PhotoBookingService.php:135-162` · `ConfirmPhotoBookingPaymentAction.php:31-37` · `PaymentGatewayService.php:525-543,369-383` | Cron `cancelled` → `ValidationException` → `retryable:true` → 503. Misma familia que T3 (F5 demasiado grosero). | M |
| S1 | CONFIRMADO | P1 | `ProductoController.php:71-89` · `PublicPageSeoService.php:613-631` (`index, follow` por defecto) · sitemap sí filtra `eliminado=0` (`PublicSitemapService.php:171-173`) | Soft-404 200 indexable por URL directa. | S |
| S2 | MATIZ | P2 | `tests/` grep `sitemap\|robots\|noindex` = 0 | Hueco de CI real; **no es bug de producción**. Lo bajo a P2 (L4 con tests SEO). | M |
| C1 | CONFIRMADO | P1 | `ChatbotAgentService.php:121,263` · `SanitizedChatbotRequest.php:35-54` (solo `strip_tags`) · `GoogleAIService.php:43-50` | `detect()` solo sobre `message`. History cliente (24 turnos, 8 a Gemini) bypasea el guard. | S |
| C2 | CONFIRMADO | P1 | `ChatbotService.php:94-100` vs `:318-321` · `S4BusinessKnowledgeService.php:28-43` (tarifa viva) | «clase particular» sin «precio» → 80/55/40/30 hardcode. Con «precio» → BD. 2 fuentes. | S |
| R1 | CONFIRMADO | P1 | `ClassManagerController.php:66-76,116-125` · `AvailabilityService.php:98-105,305-330` | `preview()` por clase = tx + 1 query lessons + 2 eager. ~3N extra; 80–150 clases → ~240–450. El mes ya está eager-loaded: se puede calcular en memoria. | M |

**P2 seguridad/datos:**

| ID | Veredicto | Sev | Dónde | Comentario | Esf. |
|---|---|---|---|---|---|
| A4 | CONFIRMADO | P2 | `routes/web.php:315-317` (pública, **no** `{vip\|particular}`) · `RequestLessonAction.php:49-59` (gate VIP solo para **guest**) · `EnrollStudentAction.php:31-32` sí exige `is_vip` | No-VIP autenticado puede POST request a clase VIP (`price=0` → Stripe falla, plaza PENDING hasta AutoRelease). | S |
| A7 | CONFIRMADO | P2 | `LessonController.php:524-575` · `MyReservationsController.php:49-75` · `InitiatePaymentAction.php:35` | `FindsOpenCheckout` existe (F1) pero **solo** tienda/subastas. Academia abre sesión nueva cada clic. | S |
| T5 | MATIZ | P2 | `EmergencyKeyService.php:34-66` · `routes/web.php:419-421` (sin throttle) · `EmergencyKeyController.php:26-30` | Sin throttle ✅. Tras 1 reveal el candado queda OFF (`is_active=false`) → no hay spam de códigos; el daño es 1 socio apaga el candado de todos. `show()` no usa `hasPhysicalLocker()`. | S |
| S3 | CONFIRMADO | P2 | `PublicSitemapService.php:22-24,99-108` | `forgetCache()` sin call sites en `app/`. TTL 1 h. Doc/rule siguen diciendo `v1`. | S |
| S4 | CONFIRMADO | P2 | `AutoCoachController.php:41-51` (sin prop `seo`) · robots `Disallow: /comparador-surf` (`PublicSitemapService.php:82`) | Sin `<meta noindex>`. | S |
| S5 | CONFIRMADO | P2 | `PublicSitemapService.php:185-187` · `SecondHandStatus::publicListingValues()` incluye `reserved` · regla `seo-geo-public.mdc` dice available | | S |
| C4 | CONFIRMADO | P2 | `GoogleAIService.php:55` | `?key=` en query string. | S |
| C7 | CONFIRMADO | P2 | `S4BusinessContextService.php:41-43` · `ChatbotDisplayName.php:15` | Solo bloquea `[]{}<>\\n`. «IGNORA las reglas» como nombre entra al system prompt. Reasonix lo bajó de más. | S |
| R6 | CONFIRMADO | P2 | `AcademyController.php:39-41` | F5/B2 limpió `LessonController`; el constructor del Commander **sigue** haciendo `Cache::remember` + escrituras `lockForUpdate`. | S |
| R8 | CONFIRMADO | P2 | `2026_03_16_140001_create_lessons_table.php:14` (sin index `starts_at`) · `BookingService.php:227-228,252-254` (`COALESCE`) | | S |
| P3 | CONFIRMADO | P2 | `PhotoBookingService.php:70-127` | Sin chequeo de solape. **No subo a P1** (operativo, no dinero); L2 si el dueño quiere. | M |

### Hallazgos adicionales P0/P1 (no estaban como ID propio)

- **No hay P0 nuevo.**
- **W1 (P1, cruza T3+P2):** `PaymentGatewayService.php:369-383` marca **todo** «payable no confirmable» como `retryable:true` (diseño F5). Cubre lock transitorio **y** payable borrado/cancelado. Por eso T3/P2 no disparan `ALERT_PERMANENT_FAILURE`. El fix de L1 debe clasificar deleted/cancelled/rejected como permanente.
- **A9 (P1, familia A1/A2):** `VipClassManagerController` escribe `internal_notes` `VIP_CREDIT_COST=1` (`:255`) pero `unitsForCharge('vip', 1)` = **2** (VIP no es `particular`; regla grupal solo). Destroy loguea refund 1. Tres números para el mismo consumo VIP en solitario.

### Discrepancias vs Reasonix §6 (código gana)

| Tema | Reasonix | Cursor | Qué hacer |
|---|---|---|---|
| T1 next-key | MATIZ (RR serializa) | Sin índice no hay gap lock útil → CONFIRMADO | UNIQUE (columna generada excl. 500/600, patrón F3) |
| P1 causa | SQL vs UTC | Re-check PHP `isPast()` tras cast `datetime` | Cast `BusinessWallClockDatetime` + test `APP_TIMEZONE=UTC` |
| S2 sev | P1 | P2 (deuda de tests) | L4, no L1 |
| P3 sev | sube a P1 | se queda P2 | Dueño decide si entra en L2 |
| C7 | MATIZ bajo | CONFIRMADO P2 | Sanitizar nombre con el guard |

### Plan de implementación (lotes para Cursor, 0 código ahora)

**Cambio de orden vs informe §4:** T3 y P2 son la misma clase de fallo (Stripe cobrado, payable inconfirmable, 503 ciego). Van juntos en L1 **antes** que créditos.

- **L1 dinero Stripe + créditos:** W1 (clasificar retryable) + T3 (no purgar si hay sesión viva / alinear `expires_at` con Stripe) + P2 (resucitar o fallo permanente + alerta + refund) + A1 (`units_consumed` en consumo / refund de esas unidades) + A2 (`refundCredits` en destroy) + A9 (VIP = 1 ud).
  - Archivos: `PaymentGatewayService.php`, `PaymentWebhookController.php`, `TaquillaMembershipService.php`, `config/taquilla.php`, `ConfirmPhotoBookingPaymentAction.php`, `PhotoBookingService.php`, `CreditEngineService.php`, `BonoConsumption` + migración, `EnrollStudentAction.php`, `ApproveEnrollmentQuotaAction.php`, `VipClassManagerController.php`.
  - Tests: extender `TaquillaPendingCheckoutExpirationTest` (no borrar con sesión viva; sí borrar abandono sin Stripe); nuevo webhook PagoCuota-deleted y foto-cancelled → `retryable:false` + alerta; nuevo `AcademyCreditRefundUnitsTest`; destroy VIP con alumnos.
- **L2 concurrencia/caducidad:** A3 (lock de franja) + P1 (cast + test UTC) + T1 (saneamiento duplicados + UNIQUE parcial vía columna generada, patrón F3) + T2 (caché = `MAX(periodo_fin)` confirmado). Opcional P3.
  - Archivos: `RequestPrivateLessonAction.php`, `AvailabilityService.php`, `PhotoSessionBooking.php`, `TaquillaController.php`, `TaquillaMembershipService.php`, `User.php`, migración `users` / `numeroTaquilla`.
  - Tests: particular concurrente; `PhotoBookingExpirationTest` con `APP_TIMEZONE=UTC`; vigencia prepagada futura; unique taquilla (shared 500/600 sigue múltiple).
- **L3 seguridad/info:** C1 (guard por turno de history) + C2 (quitar precios del estático; usar `surfPricingFaqText()`) + S1 (`abort_if(eliminado, 404)`).
  - Tests: `Http::fake()` history hostil; FAQ particular vs tarifa BD; producto `eliminado=1` → 404.
- **L4 P2:** R1 (preview en memoria) → R6 (quitar cleanup del constructor) → A4 (gate `is_vip`) → A7 (reusar `FindsOpenCheckout` en academia) → S2 tests SEO → T5 throttle → C4 header → C7 sanitize → S3/S4/S5 → R8 índices.

### Riesgos de romper (tests + datos)

- **`TaquillaPendingCheckoutExpirationTest`:** fija TTL 30 min, purge que **borra** el pendiente, y reintento que no desplaza `periodo_inicio`. T3 no debe reintroducir filas pending eternas ni romper el reintento; debe **exceptuar** pendientes con `payment_webhook_idempotency` viva.
- **`PhotoBookingExpirationTest`:** `cancelExpiredPending` + confirm de caducada lanza `ValidationException`. P2/W1 cambian el contrato del webhook (no el del panel admin).
- **`BonoFifoConsumptionTest`:** usa `unitsForCharge(GRUPAL, 1)=2`. A1 no debe cambiar la fórmula de cobro; solo persistir y refundar lo cobrado.
- **phpunit `APP_TIMEZONE=Europe/Madrid`:** P1 necesita un test que fuerce UTC o no se verá el bug.
- **T1:** `SELECT numeroTaquilla, COUNT(*) FROM users WHERE numeroTaquilla IS NOT NULL GROUP BY 1 HAVING COUNT(*)>1` **antes** del UNIQUE; excluir `config('vip.shared_locker_numbers')` (500, 600). MariaDB 10.4: columna generada STORED (mismo truco que F3), no índice parcial PostgreSQL.
- **A2:** enrollments VIP ya borrados = créditos perdidos; el fix no los recupera (script/dueño).

### Decisión ejecutiva

1. **Primero:** W1+T3+P2 (dinero Stripe huérfano), luego A1+A2+A9 (créditos). **No implementar sin luz verde.**
2. **No hacer ahora:** S2 como P1; no subir P3 a P1; no reescribir AvailabilityService entero (R1 = batch in-memory).
3. **Dueño:** `APP_TIMEZONE` prod (`.env` local = UTC vs example Madrid); A8 justificantes; S6 `/academia`; saneamiento duplicados de taquilla; VIP ¿1 o 2 uds en solitario?

---

## 8. Verificación Cursor — 2ª pasada desde cero (2026-08-27)

Segunda ejecución del prompt §5 / `PROMPT-VERIFICACION-FASE2.md`, con **6 verificadores en paralelo a ciegas** (sin ver §6 ni §7) para que la confirmación sea independiente. **0 código de app.** Lo que aporta esta pasada: **8 P1 nuevos** que ninguna de las dos pasadas anteriores tenía, y 4 correcciones de mecanismo que cambian el fix.

**P1 del informe (13):** 0 DESCARTADO · 10 CONFIRMADO · 3 MATIZ (A3, T1, C2). Bajan de severidad: **S2 → P2** (deuda de CI, no bug de producción) y **C2 → P2** (los números coinciden hoy en BD).

| ID | Veredicto | Sev | Cita actual | Comentario | Esf. |
|---|---|---|---|---|---|
| A1 | CONFIRMADO | P1 | `LessonBonoCreditUnits.php:37-46` · cobro `EnrollStudentAction.php:102,124` (total de la clase) · refund `CreditEngineService.php:170-173` (`quantity`, siempre 1 por `:133`) | Clase con ≥1 ocupante: cobra 1, devuelve 2. **No hay dónde leer lo cobrado**: `credits_locked` se escribe a 0 (`:134`), `bono_consumptions` solo guarda `remaining_after`, y `credit_transactions.amount` registra ya la cifra errónea. 3 puntos de entrada afectados (`LessonObserver:34`, `CancelEnrollmentAction:79`, `LessonController:706`). | M |
| A2 | CONFIRMADO | P1 | `VipClassManagerController.php:272-295` | Cero `refundCredits`; flash miente. **Agravante:** `bono_consumptions.lesson_id` es `cascadeOnDelete` → al borrar la clase desaparece el rastro para reconstruir lo descontado; solo queda un `Log::warning` que además dice 1 ud cuando pudo ser 2. | M |
| A3 | MATIZ | P1 | `RequestPrivateLessonAction.php:70-86` · `AvailabilityService.php:18` (`MAX_MONITORS=2`), `:49-58` | El TOCTOU existe pero **no es el fallo reproducible**: dos particulares solapadas están permitidas por diseño (harían falta 3 concurrentes). Lo grave es que **no hay ningún dedupe** (el grupal sí, `RequestLessonAction.php:209-236`): doble clic **secuencial** = 2 Lessons + **2 señales Stripe** al mismo cliente. `throttle:10,1` no lo frena. | M |
| T1 | MATIZ | P1 | `create_users_table.php:23` (sin índice; 0 migraciones posteriores) · `Taquilla/TaquillaMembershipService.php:947-954` · `TaquillaController.php:35-114` | Falta el UNIQUE ✅. Pero la carrera hoy **no se materializa en MySQL**: sin índice el `SELECT … FOR UPDATE` escala a la tabla y serializa por accidente (a cambio de bloquear `users` entero y arriesgar deadlock con `:755`). El argumento correcto es «invariante inexistente» (seeders, `VipMembershipService:54`, updates manuales), no «dos transacciones asignan la misma». | M |
| T2 | CONFIRMADO | P1 | `Taquilla/TaquillaMembershipService.php:923-937` · `User.php:286-291` · `VerificarTaquilla.php:44-51` | Sync solo mira el periodo que cubre *hoy*; 3 call sites, todos en ciclo HTTP; **ningún job** (12 tareas en `routes/console.php`, ninguna refresca). Divergencia confirmada: Vigencia dice «activo» (lee pagos) y el registro dice `up_to_date=false` (lee caché, `LockerPaymentIndexBuilder:53-68`). | S |
| T3 | CONFIRMADO (mecanismo corregido) | P1 alto | `config/taquilla.php:10` (30 min) · purge `:513-552` (borrado físico; cron cada 5 min + 2 puntos HTTP) · `PaymentGatewayService.php:80-95` (Checkout **sin** `expires_at` → 24 h de Stripe) · `:369-383` · `PaymentWebhookController.php:90-96` | Dinero cobrado con `PagoCuota` borrado ✅. El webhook responde **503 y reintenta días**, nunca 200+`ALERT_PERMANENT_FAILURE`; `payments:sync` lo cuenta como `skipped` con `warn`. Nadie expira la sesión en Stripe (`sessions->expire` = 0 resultados). Un verificador lo sube a P0. | M |
| P1 | CONFIRMADO (mecanismo corregido) | P1 | `PhotoSessionBooking.php:61` · write `PhotoBookingService.php:104-107` (`BusinessDateTime::now()`) · re-check `:154-155` y `ConfirmPhotoBookingPaymentAction.php:46-49` | Desfase reproducido en tinker: **+119,98 min**. **El SQL del cron es correcto** (binding en reloj Madrid); quien bloquea es el re-check PHP `isPast()` → TTL efectivo 30 min → ~2 h 30. Corrección de cita: `.env.example:5` ya es `Europe/Madrid` (el UTC está solo en `.env`) y `config/app.php:68` tiene Madrid por defecto. Sin migración de datos. | S |
| P2 | CONFIRMADO | P1 | `PhotoBookingService.php:135-162` · `PaymentGatewayService.php:525-544,369-383` | **Interacción crítica: arreglar P1 sin P2 multiplica la incidencia** (la ventana pasa de «2 h 30–24 h» a «30 min–24 h»). Van en el mismo lote. No existe ninguna ruta de refund de fotos. | M |
| S1 | CONFIRMADO | P1 | `ProductoController.php:77` · `PublicPageSeoService.php:658-667` (`index, follow` por defecto) · tienda `TiendaController.php:20` y sitemap `PublicSitemapService.php:171-183` sí filtran | Cadena verificada hasta el `<meta robots>`. Es el **único** hueco del catálogo: alquiler (`SurfboardController.php:52-54`) y 2ª mano (`SecondHandPublicCatalogService.php:88-93`) sí abortan 404. | S |
| S2 | CONFIRMADO · **bajo a P2** | P2 | grep `sitemap\|robots\|noindex\|canonical\|jsonLd\|PublicPageSeoService` en `tests/` = **0 sobre 74 archivos** | Hueco de CI real, no bug de producción. Matiz: la no-fuga R5 **sí** tiene aserciones (`SecondHandCatalogTest.php:30-46`). | M |
| C1 | CONFIRMADO | P1 | `ChatbotAgentService.php:121` (única invocación del guard en el repo) · `SanitizedChatbotRequest.php:28-54` (solo `strip_tags`) · `:263-264` · `GoogleAIService.php:43-50` | Flujo trazado punta a punta: 24 turnos admitidos, 8 llegan a `contents` de Gemini sin pasar por `detect()`. | M |
| C2 | MATIZ · **bajo a P2** | P2 | `ChatbotService.php:95-101` (hardcode) vs `:318-321` → `PrivateLessonPricingService::tariffTable()` | Consulta real a `private_lesson_tariffs`: 80/55/40/30 € = **idéntico** al literal. No hay contradicción hoy; es deuda que estalla al editar la tarifa en admin. | S |
| R1 | CONFIRMADO (pantalla corregida) | P1 | `Admin/ClassManagerController.php:66-77,116-125` · `AvailabilityService.php:98-105,305-330` | **No es el Commander** (`AcademyController::index` no llama a `preview()`): es `admin/class-manager` (calendario mensual, `routes/web.php:545`). Conteo exacto N=100: **306 SELECTs** + 200 `BEGIN`/`COMMIT` + 100 líneas de log. N=80 → 246; N=150 → 456. | M |

**P2 de seguridad/datos:** A4 CONFIRMADO (ruta `academy.lessons.request` sin `auth` ni gate; el filtro de modalidad de `RequestLessonAction:49-59` solo aplica a invitados; la plaza queda `pending` ocupando cupo) · A7 CONFIRMADO **con causa distinta** (el `->first()` sin lock es irrelevante —no hay escritura—; la causa única es no llamar a `openCheckoutUrlFor`; `createCheckoutSession:127-135` ya persiste `checkout_url`/`expires_at` para cualquier payable → **Esf. S**, y el mismo hueco está en `payRentalBooking`) · T5 MATIZ (sin throttle ✅, pero el candado OFF es **diseño explícito** `EmergencyKeyService:59`; lo que falta es cooldown por socio y un mensaje correcto para VIP compartida, `EmergencyKeyController.php:26`) · S3 CONFIRMADO (+agravante: `SitemapController.php:27` añade otra hora de `Cache-Control` → ventana real ~2 h; único observer del repo es `LessonObserver`) · S4 CONFIRMADO **pero el fix del informe no funciona** (con `Disallow` activo Google no rastrea la página y nunca ve la meta: hay que poner `noindex` **y quitar el Disallow**; mismo conflicto ya en `/subastas` y `/carrito`) · S5 **MATIZ → P3 documental** (`SecondHandStatus::publicListingValues()` incluye `reserved` **a propósito**, docblock `PublicSitemapService.php:16-19`; `sold` ya da 404 con test; el error está en `.cursor/rules/seo-geo-public.mdc:105`) · C4 CONFIRMADO (+agravante: al fallar la red se loguea el mensaje de Guzzle **con la URI y el `?key=`**, `GoogleAIService.php:71-74`) · C7 MATIZ bajo (`ChatbotDisplayName` se queda con la **primera palabra**, ≤40 chars: solo cabe un token sin espacios, y el atacante envenena su propio prompt) · R6 CONFIRMADO con matiz (la clave **sí** expira por TTL; el problema es que es **redundante** con `academy:cleanup` cada 5 min y aun así paga un `SELECT … FOR UPDATE` sin filtro de fecha sobre todas las pendientes, `AutoReleaseService.php:25-31`; `CACHE_STORE=database` y el constructor corre también en `checkAvailability`) · **R8 se divide**: R8a CONFIRMADO P2 (`lessons` solo tiene PK; revisadas las 5 `Schema::table('lessons')` y `add_performance_indexes` — solo toca `lesson_user` y `bookings`), R8b **MATIZ → P3** (el `COALESCE` **no** inutiliza `bookings_availability_index`: la igualdad por `surfboard_id` sigue resolviéndose por índice; solo se pierde el refinado por rango, y es 1 query por request) · P3 CONFIRMADO P2 (sin chequeo de solape en `createBooking`).

### Hallazgos adicionales — 8 P1 nuevos (ninguno estaba en el informe, §6 ni §7)

| ID | Sev | Dónde | Qué es |
|---|---|---|---|
| N1 | **P1** | `Academy/LessonController.php:696-710` (`confirmSurfTrip`) | **Puerta trasera de reembolso.** No valida `is_surf_trip`, ni hora, ni estado: cualquier alumno inscrito hace `POST .../confirm-surf-trip` con `confirm=0` sobre **cualquier** clase suya y recibe el crédito, incluso ya empezada. Salta `AcademyEnrollmentPolicy::canCancelByTime` (que sí se aplica en `CancelEnrollmentAction:30`). Con A1, devuelve 1 ud de más. |
| N2 | **P1** | `Academy/LessonController.php:461-505,534-537` · `PaymentGatewayService.php:451-458` · `DenyEnrollmentQuotaAction.php:26-30` | **Pagar con tarjeta salta la aprobación de cupo extra.** `requestLesson` no ramifica por `pending_admin`: el alumno paga y `confirmLessonPayment` lo pone `CONFIRMED`; después el admin ya no puede aprobar ni denegar (ambas Actions exigen `PENDING_EXTRA_MONITOR`). Si deniega antes, **no hay reembolso** en todo el archivo. Efecto lateral: una plaza `bono_vip` también entra en el filtro de `payPendingEnrollment` → el alumno paga con tarjeta lo que cubría su bono. |
| N3 | **P1** | `PlanesTaquillasController.php:269,314` | **Doble cargo de cuota.** Taquilla no usa `FindsOpenCheckout`: cada `payPendingPago` abre sesión nueva sobre el mismo `PagoCuota` (throttle 10/min). Si se pagan dos, el 2.º webhook ve el pago ya `confirmed`, marca el intent `processed` y responde 200: **dos cobros, una cuota, sin traza**. Es el F1/F2 ya corregido en tienda y subastas, no aplicado aquí. |
| N4 | **P1** | `Taquilla/TaquillaMembershipService.php:383-392` | **El periodo del pago nuevo cuenta pagos `rejected`/`pending`** (sin filtro de `status`, al contrario que `:73`, `:928` y `VigenciaPayloadTest:88-103`). Un rechazado con `periodo_fin` futuro —que el purge nunca borra— desplaza el `periodo_inicio`: el socio paga hoy y su cobertura arranca semanas después. |
| N5 | **P1** | `SanitizedChatbotRequest.php:67` (`in:user,model`) · `ChatbotAgentService.php:136,154,326-331` | **El cliente puede forjar turnos `role: model`.** Inyecta respuestas falsas del asistente y, mandando el texto exacto de `SOFT_UNCERTAIN_MESSAGE`, fuerza `requires_human` a voluntad: casos `REQUIRES_HUMAN` a 20/min **sin autenticar**, con `session_token` distinto cada vez. El streak de fallos debe vivir en servidor. |
| N6 | **P1** | `RouteServiceProvider.php:22-29` | **Rate limit calibrado con una premisa caduca:** el comentario justifica 20/min «sin coste de IA externa», falso desde que existe la rama Gemini. Sin tope diario ni por sesión. |
| N7 | **P1** | `Academy/LessonController.php:346-366` (`privateAvailability`) | **`preview()` dentro de un bucle de slots de 15 min en ruta PÚBLICA sin `auth`** (`routes/web.php:307-311`, `throttle:60,1`): ~51 iteraciones × 3 SELECTs ≈ **153 queries + 102 transacciones** por request, cada SELECT con full scan de `lessons`. Un anónimo sostiene ~9.000 queries/min desde una IP. Es la instancia más grave de la familia R1. |
| N8 | **P1** | `routes/web.php:64,262-267` | **6 redirects de URLs públicas legacy en 302**, no 301 (`/webcams`, `/clases-de-surf`, `/surftrips`, `/surfskate`, `/surfskate/guia`, `/tienda-oficial`). Las dos de taquillas sí pasan `301` explícito → es descuido. Con 302 Google no consolida señales, justo lo contrario del plan de rebrand. |

**P2 nuevos:** `PaymentSuccessController.php:100-111` manda las reservas de fotos al catálogo de alquiler (`PhotoSessionBooking` entra por `str_ends_with(…, 'Booking')`) · fotos sin reuso de sesión Stripe (`PhotoSessionController.php:63-118`) · `cancelExpiredPending` sin `reviewed_at`/`expires_at`/evento (taquilla sí lo hace bien, `:583-584`) · `preview()` en bucles de escritura admin (`AcademyController.php:502-512`, `VipClassManagerController.php:313-319`) · `escalate()` no replica el guard de nulos de `findOpenInteraction:386-388` (visitantes sin token comparten fila).

### Discrepancias con §6 y §7 (gana el código)

| Tema | §6 / §7 | 2ª pasada | Consecuencia |
|---|---|---|---|
| T1 carrera | §6: RR serializa · §7: sin índice **no** hay gap lock | Sin índice el lock **escala a la tabla y sí serializa**, pero la invariante no existe | El UNIQUE sigue siendo el fix; el argumento cambia |
| P1 fotos causa | §6: la SQL · §7: re-check PHP | **§7 acierta**: SQL correcta (binding Madrid), falla `isPast()`. Reproducido: +119,98 min | Cast + test con `APP_TIMEZONE=UTC` |
| A3 | Ambas: TOCTOU concurrente | El fallo real es **falta de dedupe secuencial** (2 señales cobradas) | Dedupe primero; el lock es secundario |
| A7 esfuerzo/causa | Falta de lock | Sin escritura, el lock es irrelevante; falta `openCheckoutUrlFor` | Esf. **S** |
| C2 | P1 en ambas | Precios **coinciden hoy** en BD → P2 | Fuera del lote de seguridad |
| S5 | CONFIRMADO como defecto | `reserved` es deliberado y documentado → **P3 documental** | Corregir la regla `.mdc`, no el código |
| R8b | «inutiliza el índice» | Solo pierde el rango → P3 | Baja prioridad |
| R1 pantalla | Commander | `admin/class-manager` | El fix va en otro controlador |
| S4 fix | Añadir `noindex` | Insuficiente con `Disallow` activo | `noindex` **+** quitar Disallow |

### Plan por lotes (revisado)

- **L0 — quirúrgico, esfuerzo S, entra ya:** N1 (guardas en `confirmSurfTrip`) · N4 (filtrar `status` en el cálculo de periodo) · S1 (`abort_if(eliminado, 404)`) · N8 (`, 301` × 6).
  Archivos: `Academy/LessonController.php`, `Taquilla/TaquillaMembershipService.php`, `ProductoController.php`, `routes/web.php`.
- **L1 — dinero Stripe (raíz común W1):** W1 (que los confirmadores devuelvan motivo, no `bool`) + T3 (no purgar con sesión viva **y** enviar `expires_at` a Stripe) + P2 fotos + N3 (`FindsOpenCheckout` en taquilla) + A7 (academia y `payRentalBooking`) + N2 (cupo extra y refund al denegar).
  Archivos: `PaymentGatewayService.php`, `PaymentWebhookController.php`, `Taquilla/TaquillaMembershipService.php`, `PlanesTaquillasController.php`, `Academy/LessonController.php`, `User/MyReservationsController.php`, `DenyEnrollmentQuotaAction.php`, `ConfirmPhotoBookingPaymentAction.php`, `PhotoBookingService.php`.
- **L2 — créditos:** A1 (persistir unidades cobradas; migración + ambas Actions + `resolveRefundUnits`) + A2 (refund antes de borrar, o pasar la clase a `cancelled`) + A9.
- **L3 — concurrencia y caducidad:** A3 (dedupe + lock de franja) + P1 fotos (cast + test UTC) + T1 (saneamiento → UNIQUE sobre columna generada) + T2 (caché desde `MAX(periodo_fin)` + job diario).
- **L4 — chatbot:** C1 (guard por turno) + N5 (streak en servidor / no fiarse de `role: model`) + N6 (tope para la rama Gemini) + C4 (header `x-goog-api-key` + sanear el log) + C7 (lista blanca de nombre).
- **L5 — rendimiento y deuda:** **primero** `tests/Unit/Availability/AvailabilityServiceTest.php` (hoy 0 tests), luego N7 (ruta pública) → R1 → R6 (+ extender `CriticalCommandsScheduledTest` al controlador admin) → R8a → S2 (tests SEO) → S3 → S4 → T5 → C2 → S5 (regla `.mdc`).

### Riesgos de romper

- **`TaquillaPendingCheckoutExpirationTest` (6 tests):** si el fix de T3 **alarga el TTL a 24 h**, rompe 4 de 6. Si el fix es «no purgar con sesión Stripe viva + enviar `expires_at` a Stripe», **los 6 siguen verdes** (los tests no crean filas de `payment_webhook_idempotency`, así que `openCheckoutUrlFor` devuelve `null`). Stripe admite `expires_at` entre 30 min y 24 h: el TTL actual de 30 min es exactamente el mínimo, así que no hay que tocar `config/taquilla.php`. **La premisa del prompt de que ese test bloquea T3 no se sostiene.**
- **Academia:** `grep refundCredits|resolveRefundUnits|RequestPrivateLesson|payPendingEnrollment|VipClassManager` en `tests/` = **0**. Riesgo casi nulo. `BonoFifoConsumptionTest` no fija el número de unidades (llama a la propia función), así que A1 no lo rompe **si no se cambia la fórmula de cobro**.
- **Fotos:** ningún test rompe con el cambio de cast (bajo `phpunit.xml:22` ambos casts son equivalentes — ese es justo el motivo de que P1 sea invisible). `PhotoBookingExpirationTest:82-99` solo rompería si el fix cambia `execute()` de excepción a resultado tipado.
- **Rendimiento:** **0 tests de `AvailabilityService`** y `evaluate()` gobierna la admisión en 5 Actions. Un error ahí no ralentiza: **sobrevende clases**. Reglas a replicar si se calcula en memoria: pool de 2 monitores, márgenes 15/75 min, `effectivePartySizeForLesson`, clase con monitor y 0 inscritos = 1, desempate de `peakUsage`, ventana ±(margen+75), normalización de TZ.
- **T1 datos:** ejecutar antes `SELECT numeroTaquilla, COUNT(*) … NOT IN (500,600) HAVING COUNT(*)>1`. El UNIQUE plano **rompe** las compartidas VIP (`config/vip.php:16-19`); la vía viable es columna generada que anule 500/600 (congela en esquema lo que hoy es env) o tabla `locker_assignments`. Decisión de arquitectura del dueño.
- **A2:** los créditos de clases VIP ya borradas **no se pueden reconstruir** (`cascadeOnDelete`).

### Decisión ejecutiva

1. **Primero L0** (4 arreglos de una línea cada uno, dos de ellos cierran fugas de dinero abiertas hoy) y **luego L1**, tratando W1 como raíz única de T3, P2, N3 y A7. **No implementar nada sin luz verde.**
2. **No hacer ahora:** S2 y C2 como P1, S5 como código, R8b, ni tocar `AvailabilityService` antes de tener su test unitario.
3. **Decisiones del dueño:** ¿T3 es P0? · `APP_TIMEZONE` de producción · UNIQUE de taquilla vía columna generada o tabla nueva · qué hacer con los créditos VIP ya perdidos (A2) · política de refund cuando el admin deniega un cupo extra ya pagado (N2).

---

## 9. Cruce final — 4 verificaciones (2026-08-27)

Cuatro ejecuciones independientes del prompt `PROMPT-VERIFICACION-FASE2.md`: **Reasonix §6** (repo local), **Cursor §7** (1ª pasada), **Cursor/Opus §8** (2ª pasada desde cero, 6 verificadores a ciegas) y **Grok** (pegado por el dueño). **0 descartados en ningún P1; ninguno se cae.** El código manda sobre la opinión (regla §8).

### Consenso firme (4/4 o 3/4 sin discrepancia de fondo)

| Hallazgos | Veredicto cruzado |
|---|---|
| A1 refund sobre-crédito · A2 destroy VIP sin refund · T2 caché vigencia prepagada · P1 cast TZ fotos · P2 carrera cron-webhook · S1 soft-404 producto · C1 guard sin history · R1 preview() por clase | **CONFIRMADO por las 4** |
| T3 purge 30 min vs Stripe 24 h | **CONFIRMADO 3/4** (Grok y §8: MATIZ de mecanismo — el webhook responde 503 retryable, no 200+alerta; dinero cobrado sin cuota es real) |
| W1 raíz común (todo «payable inconfirmable» = retryable:true) · A9 (VIP_CREDIT_COST=1 vs unitsForCharge=2) | **Nuevos, P1, 2/4 (Cursor §7 + Grok)** y absorbidos por §8 en L1/L2 |
| S2 (0 tests SEO) | **Baja a P2** en §7, §8 y Grok (deuda de CI, no bug de prod) — Reasonix la tenía P1; se acepta P2 (L4) |
| C2 (precios hardcodeados) | **Baja a P2** en §8 (los valores coinciden hoy con `private_lesson_tariffs`); Grok la mantiene P1 → se deja P2 con test de paridad en L5 |
| P3 (overbooking fotos) | P2 en §7, §8 y Grok (operativo, no dinero). Reasonix la subía a P1 → se queda P2; entra en L3 si el dueño quiere |

### Discrepancias residuales (resueltas por evidencia §8)

| Tema | Fallo | Resolución |
|---|---|---|
| A3 particular | §6/§7: TOCTOU concurrente | §8: el fallo reproducible es **falta de dedupe secuencial** (doble clic = 2 Lessons + 2 señales Stripe); el lock es secundario. Fix: dedupe primero. |
| T1 taquilla | §6: RR serializa · §7: sin índice no hay gap lock · §8: el lock escala a tabla y serializa por accidente | El **UNIQUE sigue siendo el fix** (invariante inexistente); el argumento de carrera cambia. |
| P1 fotos | §6: SQL · §7: re-check PHP `isPast()` | **§7/§8 aciertan** (+119,98 min reproducido): SQL correcta, falla el re-check PHP. |
| A7 | Falta de lock | §8: sin escritura el lock es irrelevante; falta `openCheckoutUrlFor` (mismo patrón F1) → Esf. S. |
| R1 | Commander | §8: es `admin/class-manager` (306 SELECTs con N=100), no el Commander. |
| S4 | Añadir `noindex` | §8: con `Disallow` activo Google nunca ve la meta → `noindex` **+ quitar Disallow**. |
| S5 | Bug de código | §8: `reserved` es deliberado y documentado → **P3 documental**: corregir `.cursor/rules/seo-geo-public.mdc`, no el código. |
| R8b | «Inutiliza el índice» | §8: solo pierde el rango (la igualdad `surfboard_id` sí usa el índice) → P3. |

### 8 P1 nuevos de la 2ª pasada (§8; Grok no los vio, estaba en 1ª pasada)

N1 reembolso libre vía `confirmSurfTrip` · N2 tarjeta salta aprobación de cupo extra y denegar no reembolsa · N3 doble cargo de cuota (taquilla sin `FindsOpenCheckout`) · N4 periodo contando pagos rechazados · N5 `role: model` forjable (escalaciones falsas) · N6 rate limit sin tope de coste Gemini · N7 `preview()` en bucle en ruta pública (~9.000 queries/min/IP) · N8 6 redirects 302 en vez de 301.

### Plan consolidado (de §8, aceptado)

**L0 quirúrgico (S, entra ya):** N1 + N4 + S1 + N8 → **L1 dinero Stripe:** W1 + T3 + P2 + N3 + A7 + N2 → **L2 créditos:** A1 + A2 + A9 → **L3 concurrencia/caducidad:** A3 (dedupe) + P1 (cast+test UTC) + T1 (UNIQUE) + T2 (caché) + P3 (opcional) → **L4 chatbot:** C1 + N5 + N6 + C4 + C7 → **L5 rendimiento/deuda:** test `AvailabilityService` primero → N7 → R1 → R6 → R8a → S2 → S3 → S4 → T5 → C2 → S5.

### Decisiones del dueño (bloquean L0–L3)

1. **Luz verde** a L0+L1 (dinero Stripe y fugas abiertas hoy).
2. ¿T3 se trata como **P0** (cobro sin cuota) o P1? (afecta urgencia, no el fix).
3. `APP_TIMEZONE` de **producción**: `.env` local = UTC vs `.env.example`/config = `Europe/Madrid`. Recomendado: Madrid (coherente con `BusinessDateTime`).
4. **UNIQUE de taquilla**: columna generada que anule 500/600 (patrón F3, congela en esquema) vs tabla `locker_assignments` nueva (más limpia, más migración).
5. **Créditos VIP ya perdidos** (A2): los de clases borradas no se pueden reconstruir (`cascadeOnDelete`) → ¿script de reconciliación manual o se asume?
6. **Política de refund N2**: cuando el admin deniega un cupo extra ya pagado, ¿devolver automático vía Stripe, crédito en bono, o manual?

### Lo que NO se hace ahora

S2 y C2 como P1 · S5 como código · R8b · tocar `AvailabilityService` antes de su test unitario · reescribir la fórmula de cobro de A1 (persistir y refundar lo cobrado, sin cambiar `unitsForCharge`).
