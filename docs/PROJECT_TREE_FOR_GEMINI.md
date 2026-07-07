# maider_0 — Plano de ingeniería (contexto IA)

**Proyecto:** San Sebastian Surf School (S4)  
**Dominio:** escuela de surf — tienda, academia, alquiler de tablas, taquillas, VIP/bonos, pagos manuales.

---

## Stack

| Capa                  | Tecnología                                                   |
| --------------------- | ------------------------------------------------------------ |
| Backend               | PHP 8.2+, Laravel 11                                         |
| Frontend              | React 19, Inertia.js 2 (`@inertiajs/react` ^2.1), Vite 6     |
| UI                    | Tailwind CSS 3, Radix/shadcn (`resources/js/components/ui/`) |
| Auth                  | Laravel Breeze (session) + Sanctum (API tokens)              |
| Rutas JS              | Ziggy (`resources/js/ziggy.js`)                              |
| Persistencia auxiliar | Google Firestore REST (chatbot memoria LTP)                  |
| IA externa            | Google Gemini REST (`GoogleAIService`)                       |

**Convención Inertia:** `routes/web.php` → `Controller@method` → `Inertia::render('Pages/...')` → `resources/js/Pages/{Name}.jsx`.

---

## Excluye (no indexar para contexto)

`node_modules/`, `vendor/`, `storage/framework/`, `storage/logs/`, `public/build/`, `bootstrap/cache/`, uploads masivos en `storage/app/public/`.

---

## Mapa de dominios de negocio

```
┌─────────────────┬──────────────────────────────┬────────────────────────────────────┐
│ Dominio         │ Backend (app/)               │ Frontend (resources/js/Pages/)     │
├─────────────────┼──────────────────────────────┼────────────────────────────────────┤
│ Marketing/Home  │ Pag_principalController      │ Pag_principal.jsx (+ Layout1)      │
│ CMS estático    │ ServicioController           │ Nosotros, Servicios*, Contacto     │
│ Tienda          │ Producto, Carrito, Pedido    │ Productos, Tienda, Carrito, …    │
│ Academia        │ Academy/*, Lesson*, Actions  │ Academy/, Admin/Academy/         │
│ Alquileres      │ Rentals/*, BookingService    │ Rentals/Surfboards/, Admin/…     │
│ Segunda Mano    │ SecondHandBoard, SecondHandStatus │ SecondHand/, Admin/SecondHand/ │
│ Taquillas       │ Taquilla, PlanesTaquillas, EmergencyKey │ PlanesTaquillas*, MeQuedeSinLlave, Admin/EmergencyKeys │
│ VIP / Bonos     │ BonoService, Client/Bono     │ Client/Bonos/, Admin/Bonos/      │
│ Pagos admin     │ PaymentValidation            │ Admin/Payments/*                 │
│ AutoCoach       │ AutoCoachController + Services │ AutoCoach/Index.jsx            │
│ Webcams         │ ServicioController (ruta)    │ Servicios_Webcams.jsx            │
│ Auth / Perfil   │ Auth/*, ProfileController    │ Auth/, Partials/                 │
└─────────────────┴──────────────────────────────┴────────────────────────────────────┘
```

**Shell global:** `layouts/PublicLayout.jsx` → `components/Header.jsx` (navegación única) + `Footer` + `Chatbot` (no-admin). `layouts/AuthenticatedLayout.jsx` es alias de `PublicLayout`. Auth (`Auth/*`) sin shell global.

**Roles y flags:** `user.role === 'admin'` | `user.is_vip` | `user.has_active_locker` / `has_locker` — condicionan menú (`GlobalNav.jsx` vía `Header.jsx`) y políticas.

**Menú admin (`GlobalNav`):** Inicio · **Gestión** (flyout: Taquillas, Pedidos, Alquileres, Clases, Usuarios, Pagos) · **Extras** (Comparador, Webcams) · Contacto.

---

## Árbol visual — raíz y backend (`app/`)

```
maider_0/
├── .cursor/
│   ├── rules/
│   │   ├── tunnel-share-modes.mdc          ──► Modos local vs Cloudflare túnel (Vite/build)
│   │   └── seo-geo-public.mdc              ──► Reglas SEO/GEO páginas públicas
│   └── skills/
│       └── sovereign-architect-protocol/
│           └── SKILL.md
├── app/
│   │
│   ├── [DOMINIO: ACADEMIA] Actions/Academy/
│   │   ├── CancelEnrollmentAction.php      ──► DB::transaction; revierte enrollment + bono
│   │   ├── EnrollStudentAction.php         ──► Pessimistic lock UserBono::lockForUpdate; AvailabilityService::withLockedLesson
│   │   ├── AdminGuestEnrollmentAction.php  ──► Inscripciones walk-in admin (sin user_id; grupal/semanal/particular)
│   │   ├── RequestLessonAction.php         ──► Dispara LessonRequestedEvent → mail listener
│   │   ├── RequestPrivateLessonAction.php  ──► PrivateLessonRequestedEvent
│   │   ├── SyncLessonStaffAction.php       ──► Sincroniza monitor, monitor_2 y fotógrafo en staff_assignments
│   │   └── UploadLessonProofAction.php     ──► LessonProofStorageService; LessonProofUploadedEvent
│   │
│   ├── Casts/
│   │   └── BusinessWallClockDatetime.php   ──► TZ negocio (Madrid) en Eloquent
│   │
│   ├── Console/
│   │   ├── AuditLessonCreditsCommand.php
│   │   └── Commands/
│   │       ├── CleanupAutoCoachUploads.php      ──► Purga uploads AutoCoach expirados
│   │       ├── CleanupExpiredReservations.php   ──► Invoca AutoReleaseService (cron)
│   │       ├── MakeUserVip.php
│   │       ├── OperationalSanityCheckCommand.php
│   │       └── SyncAutoCoachReferenceVideos.php ──► Sincroniza catálogo vídeos referencia
│   │
│   ├── DTOs/
│   │   ├── Academy/
│   │   │   └── AdminGuestEnrollmentDto.php     ──► DTO readonly inscripción walk-in (nombre, pago)
│   │   ├── EmergencyKey/
│   │   │   ├── EmergencyKeyRevealDto.php       ──► Código revelado post-solicitud (flash único)
│   │   │   └── EmergencyLockStatusDto.php      ──► is_active + can_request (sin exponer código)
│   │   └── Taquilla/
│   │       └── PlanTaquillaPublicDto.php       ──► Catálogo planes: periodo, beneficios, VIP, descuento
│   │
│   ├── Exceptions/
│   │   ├── EmergencyKeyNotEligibleException.php
│   │   └── TransactionRequiredException.php  ──► Lanza si AvailabilityService/BookingService sin DB::transaction activa
│   ├── Events/                             ──► Desacoplamiento mail/notificaciones
│   │   ├── LessonProofUploadedEvent.php
│   │   ├── LessonRequestedEvent.php
│   │   ├── PrivateLessonRequestedEvent.php
│   │   ├── SoloStudentLocked.php
│   │   └── Taquilla/
│   │       ├── PagoTaquillaConfirmado.php      ──► Emitido tras commit confirmacion pago (pago+usuario+locker)
│   │       └── PagoTaquillaRechazado.php      ──► Emitido tras rechazo pago taquilla
│   │
│   ├── Http/
│   │   ├── Controllers/
│   │   │   │
│   │   │   ├── [DOMINIO: ACADEMIA]
│   │   │   │   └── Academy/
│   │   │   │       └── LessonController.php
│   │   │   │
│   │   │   ├── [DOMINIO: ADMIN]
│   │   │   │   └── Admin/
│   │   │   │       ├── AcademyController.php      ──► Commander; cancelación Mal Mar → Observer
│   │   │   │       ├── BonoController.php
│   │   │   │       ├── BookingController.php
│   │   │   │       ├── PaymentValidationController.php
│   │   │   │       ├── EmergencyKeyController.php ──► CRUD candado + histórico solicitudes
│   │   │   │       ├── SecondHandBoardController.php  ──► CRUD admin; filtros search/status/board_type/date_type/fechas; expone purchase_price y margen; protegido VerificarAdmin
│   │   │   │       ├── SurfboardController.php
│   │   │   │       ├── UserController.php
│   │   │   │       ├── ClassManagerController.php   ──► Gestor unificado calendario (VIP+grupal+semanal+particular)
│   │   │   │       ├── ClassManagerEnrollmentController.php ──► CRUD apuntados walk-in + estado pago
│   │   │   │       ├── VipClassManagerController.php
│   │   │   │       └── VipController.php
│   │   │   │
│   │   │   ├── [DOMINIO: AUTH]
│   │   │   │   └── Auth/
│   │   │   │       ├── AuthenticatedSessionController.php
│   │   │   │       ├── ConfirmablePasswordController.php
│   │   │   │       ├── EmailVerificationNotificationController.php
│   │   │   │       ├── EmailVerificationPromptController.php
│   │   │   │       ├── NewPasswordController.php
│   │   │   │       ├── PasswordController.php
│   │   │   │       ├── PasswordResetLinkController.php
│   │   │   │       ├── RegisteredUserController.php
│   │   │   │       └── VerifyEmailController.php
│   │   │   │
│   │   │   ├── [DOMINIO: VIP / CLIENTE]
│   │   │   │   └── Client/
│   │   │   │       └── BonoController.php
│   │   │   │
│   │   │   ├── [DOMINIO: ALQUILERES]
│   │   │   │   └── Rentals/
│   │   │   │       ├── BookingController.php
│   │   │   │       └── SurfboardController.php
│   │   │   │
│   │   │   ├── [DOMINIO: USUARIO]
│   │   │   │   └── User/
│   │   │   │       ├── MyProfileController.php      ──► Perfil VIP: wallet, asistencia, extracto créditos
│   │   │   │       └── MyReservationsController.php ──► Clases + alquileres (reservas)
│   │   │   │
│   │   │   └── [TRANSVERSAL / LEGACY ROOT]
│   │   │       ├── AuthController.php
│   │   │       ├── AutoCoachController.php        ──► Comparador maniobras; uploads + catálogo referencia
│   │   │       ├── CarritoController.php
│   │   │       ├── ChatbotController.php          ──► GoogleAIService + FirestoreService
│   │   │       ├── ContactMessageController.php
│   │   │       ├── Controller.php
│   │   │       ├── Pag_principalController.php
│   │   │       ├── PagoCuotaController.php        ──► lockForUpdate en verificación pagos
│   │   │       ├── PedidoController.php
│   │   │       ├── EmergencyKeyController.php   ──► Socio: show + request; código solo vía flash
│   │   │       ├── PlanesTaquillasController.php  ──► Orquestador Inertia; delega TaquillaMembershipService
│   │   │       ├── ProductoController.php
│   │   │       ├── ProfileController.php
│   │   │       ├── ServicioController.php
│   │   │       ├── TaquillaController.php         ──► lockForUpdate asignación
│   │   │       ├── SecondHandBoardController.php  ──► Catálogo público segunda mano; NO expone purchase_price
│   │   │       ├── TiendaController.php
│   │   │       └── UserTaquillaController.php
│   │   │
│   │   ├── Middleware/
│   │   │   ├── HandleInertiaRequests.php          ──► Shared props: auth, cart, adminStats
│   │   │   ├── EnsureUserHasRole.php                ──► Gate por role (admin/user)
│   │   │   ├── VerificarAdmin.php
│   │   │   └── VerificarTaquilla.php
│   │   │
│   │   ├── Requests/
│   │   │   ├── Academy/
│   │   │   │   ├── EnrollStudentRequest.php
│   │   │   │   ├── RequestLessonRequest.php
│   │   │   │   ├── RequestPrivateLessonRequest.php
│   │   │   │   └── UploadLessonProofRequest.php
│   │   │   ├── Admin/
│   │   │   │   ├── StoreAttendanceNoteRequest.php
│   │   │   │   ├── StoreBookingRequest.php
│   │   │   │   ├── StoreSurfboardRequest.php
│   │   │   │   ├── UpdateEmergencyLockCodeRequest.php ──► digits:4; authorize admin
│   │   │   │   └── UpdateSurfboardRequest.php
│   │   │   ├── AutoCoach/
│   │   │   │   ├── CatalogQueryRequest.php
│   │   │   │   └── UploadVideosRequest.php
│   │   │   ├── StoreSecondHandBoardRequest.php    ──► Valida + sanitiza; autorización role=admin
│   │   │   └── UpdateSecondHandBoardRequest.php   ──► Same; reglas 'sometimes'
│   │   │   ├── Auth/
│   │   │   │   └── LoginRequest.php
│   │   │   ├── Rentals/
│   │   │   │   └── StoreBookingRequest.php
│   │   │   ├── Taquilla/
│   │   │   │   ├── RegistrarPagoTaquillaRequest.php
│   │   │   │   ├── SubirJustificanteTaquillaRequest.php
│   │   │   │   ├── StorePlanTaquillaRequest.php
│   │   │   │   ├── UpdatePlanTaquillaRequest.php
│   │   │   │   ├── ConfirmarPagoTaquillaRequest.php
│   │   │   │   ├── RechazarPagoTaquillaRequest.php
│   │   │   │   ├── UpdatePagoTaquillaPaymentStateRequest.php
│   │   │   │   ├── UpdatePagoTaquillaCheckedStateRequest.php
│   │   │   │   └── ReassignLockerRequest.php
│   │   │   ├── User/
│   │   │   │   └── CancelLessonEnrollmentRequest.php
│   │   │   ├── ProfileUpdateRequest.php
│   │   │   └── StoreContactMessageRequest.php
│   │   │
│   │   └── Resources/
│   │       └── PagoCuotaQueueResource.php
│   │
│   ├── Enums/
│   │   ├── PaymentStatus.php                 ──► Pending | Confirmed | Rejected (pasarela + comprobantes)
│   │   ├── ProductTag.php                    ──► Tags tienda (invierno, neopreno, material_surf, …)
│   │   ├── SecondHandBoardType.php         ──► SOFTBOARD | HARDBOARD; label() descriptivo
│   │   └── SecondHandStatus.php            ──► AVAILABLE | RESERVED | SOLD; helpers label() y badgeColor()
│   │
│   ├── Jobs/
│   │   └── SendContactMessageJob.php       ──► ShouldQueue; delega a ContactMessageService; 3 reintentos
│   │
│   ├── Listeners/
│   │   ├── NotifyAdminLessonProofUploadedListener.php
│   │   ├── SendLessonRequestedMailListener.php
│   │   ├── SendPrivateLessonRequestedMailListener.php
│   │   ├── SendSoloStudentNotification.php
│   │   └── Taquilla/
│   │       ├── EnviarCorreoConfirmacionTaquilla.php  ──► ShouldQueue; try/catch + Log::error; resiliente
│   │       └── EnviarCorreoRechazoTaquilla.php       ──► Mail rechazo pago taquilla
│   │
│   ├── Mail/
│   │   ├── RequestReceivedMail.php
│   │   ├── ReservationConfirmedMail.php
│   │   └── Taquilla/
│   │       ├── PagoTaquillaConfirmadoMail.php   ──► view emails.taquilla.pago-confirmado
│   │       └── PagoTaquillaRechazadoMail.php
│   │
│   ├── Models/                               ──► 24 modelos Eloquent (ver tabla abajo)
│   │   ├── AttendanceNote.php
│   │   ├── AutoCoachReferenceVideo.php     ──► Catálogo vídeos referencia comparador maniobras
│   │   ├── BonoConsumption.php
│   │   ├── Booking.php
│   │   ├── Carrito.php
│   │   ├── CreditTransaction.php
│   │   ├── EmergencyKeyRequest.php         ──► Histórico solicitudes llave; toAdminArray()
│   │   ├── EmergencyLockSetting.php        ──► Singleton candado; current_code + is_active
│   │   ├── Imagen.php
│   │   ├── Lesson.php
│   │   ├── LessonUser.php                    ──► Pivot crítico: estados pago/enrollment
│   │   ├── PackBono.php
│   │   ├── PagoCuota.php
│   │   ├── PaymentWebhookIdempotency.php   ──► Idempotencia webhooks pasarela (transaction_id único)
│   │   ├── Pedido.php
│   │   ├── PedidoProducto.php
│   │   ├── PlanTaquilla.php
│   │   ├── PriceSchema.php
│   │   ├── Producto.php
│   │   ├── SecondHandBoard.php             ──► Modelo segunda mano; campos model/board_type; scope adminFilters; scopes publicCatalog (excluye sold); toPublicArray() sin datos financieros internos
│   │   ├── StaffAssignment.php
│   │   ├── Surfboard.php
│   │   ├── User.php
│   │   └── UserBono.php
│   │
│   ├── Notifications/
│   │   └── SoloStudentLessonNotification.php
│   │
│   ├── Observers/
│   │   └── LessonObserver.php                ──► Mal Mar → refund bono_vip o credits_locked vía CreditEngineService
│   │
│   ├── Policies/
│   │   ├── LessonPolicy.php
│   │   └── LessonUserPolicy.php
│   │
│   ├── Providers/
│   │   ├── AppServiceProvider.php            ──► FirestoreClient singleton transport=rest; Lesson::observe; Events
│   │   └── RouteServiceProvider.php
│   │
│   ├── [CAPA DE NEGOCIO] Services/
│   │   ├── AcademyLessonRequestMailService.php ──► Plantillas mail solicitud clase
│   │   ├── AttendanceNoteRelinker.php          ──► Reconciliación notas asistencia
│   │   ├── AutoReleaseService.php              ──► Pessimistic lock; libera pending sin comprobante (30m/2h)
│   │   ├── AutoCoach/
│   │   │   ├── AutoCoachCatalogService.php     ──► Catálogo vídeos referencia
│   │   │   ├── AutoCoachCleanupService.php     ──► Purga uploads expirados
│   │   │   ├── AutoCoachSessionService.php     ──► Sesión cookie + path traversal safe
│   │   │   └── AutoCoachUploadService.php      ──► Cuotas atómicas, MIME, disco public/autocoach
│   │   ├── AvailabilityService.php             ──► assertActiveTransaction; evaluate() exige tx; preview() lectura UI
│   │   ├── BonoService.php                     ──► lockForUpdate en confirmBono; flujo prepago VIP
│   │   ├── BookingService.php                  ──► SSOT precios/solapes; createPendingBooking(PaymentStatus::Pending); checkAvailability()
│   │   ├── ContactMessageService.php
│   │   ├── CreditEngineService.php             ──► Saldo atómico UserBono; refund vía BonoConsumption; sin LEGACY_SIN_SALDO
│   │   ├── CuotaService.php                    ──► Ciclo vida cuotas taquilla
│   │   ├── EmergencyKeyService.php             ──► lockForUpdate; requestCode atómico; updateLockCode ON
│   │   ├── Payments/
│   │   │   └── PaymentGatewayService.php       ──► registerPaymentIntent + confirmPaymentFromWebhook (idempotencia)
│   │   ├── Taquilla/
│   │   │   ├── TaquillaMembershipService.php   ──► Pagos/planes/cola; DB::transaction; MoneyCents; event PagoTaquillaConfirmado
│   │   │   ├── TaquillaConfirmationMailService.php ──► Envio correo confirmacion cuota
│   │   │   └── LockerPaymentIndexBuilder.php   ──► Indice agregado anti-N+1 cola admin
│   │   ├── Vip/
│   │   │   └── VipMembershipService.php        ──► Activar/desactivar VIP; taquilla virtual #500 si sin casillero
│   │   ├── FirestoreService.php                ──► Inyección obligatoria FirestoreClient REST (AppServiceProvider)
│   │   ├── GoogleAIService.php                 ──► Gemini HTTP; GEMINI_API_KEY requerida o 500
│   │   ├── LessonProofStorageService.php       ──► Disco: storage/app/private/lesson-proofs
│   │   ├── VipLoyaltyService.php
│   │   └── VipStudentPerformanceService.php    ──► Agregación pesada BD; ~800 LOC; perfil VIP/admin
│   │
│   └── Support/
│       ├── AcademyContact.php
│       ├── BusinessDateTime.php                ──► Now() negocio Europe/Madrid
│       └── StaffVisualIdentity.php             ──► Iniciales + color estable por monitor
│       ├── IniSize.php                         ──► Parseo upload/post limits de php.ini
│       ├── LessonBonoCreditUnits.php           ──► Unidades crédito bono por modalidad edad
│       ├── MoneyCents.php                      ──► Conversion EUR <-> centimos (taquillas)
│       └── VipVirtualLocker.php                ──► Número reservado taquilla virtual VIP (config vip.php)
│
├── bootstrap/
│   ├── app.php
│   └── providers.php
│
├── config/
│   ├── app.php, auth.php, autocoach.php, cache.php, cors.php, database.php
│   ├── filesystems.php, google.php, logging.php, mail.php
│   ├── queue.php, sanctum.php, services.php, session.php, vip.php
│
├── database/
│   ├── factories/          (7)
│   ├── migrations/         (58) — … payment_webhook_idempotency; autocoach_reference_videos; emergency_lock_settings
│   └── seeders/            (26) — CoherentDemoSeeder, ClassManagerSummer2026Seeder, BorjaReservationsSeeder, …
│       └── Concerns/       (2) — SeedsBonoConsumptions, SeedsVipAcademyEnrollments
│
├── docs/
│   ├── ai/
│   │   ├── 01-cto-protocol.md
│   │   └── 02-master-prompt-v3-ultra.md
│   ├── PROJECT_TREE.md
│   ├── INFORME_TECNICO_COTIZACION.md           ← informe estructural/funcional para cotización
│   └── PROJECT_TREE_FOR_GEMINI.md              ← este documento
│
├── public/
│   ├── img/
│   │   ├── brand/          — logos S4 WebP/PNG (nav, hero, mark, og-share)
│   │   │   └── source/     — masters PNG IA (logo-s4-navy/white-master.png)
│   │   └── sponsors/
│   │       └── bunker/     — logo The Bunker Surf Shop (nav, mark, hero WebP/PNG)
│   │           └── source/ — masters PNG IA (bunker-navy/white-master.png)
│   │   └── placeholder.svg
│   ├── favicon.ico, favicon.svg, favicon-*.png, apple-touch-icon.png, site.webmanifest
│   ├── index.php
│   ├── .user.ini           — límites PHP upload/post para AutoCoach (Apache/XAMPP)
│   ├── favicon.ico, robots.txt
│   └── storage/            — symlink → storage/app/public
│
├── routes/
│   ├── web.php             — rutas Inertia principales
│   ├── auth.php
│   ├── api.php
│   └── console.php
│
├── storage/app/
│   ├── private/            — lesson-proofs, payment-proofs
│   └── public/             — productos, surfboards, comprobantes_bonos, taquilla-proofs, autocoach/uploads
│
├── tests/
│   ├── Feature/            — Auth, Carrito, Contact, Profile
│   ├── Unit/               — BusinessDateTimeTest
│   ├── Pest.php
│   └── TestCase.php
│
├── artisan
├── composer.json, package.json, vite.config.js, tailwind.config.js
│                              ──► vite: plugin injectRouteImport + alias @route → lib/route.js
├── docker-compose.yml, Dockerfile
└── README.md, AUDITORIA_NUCLEO_LARAVEL_REACT.md, INFORME_AUDITORIA_REACT.md
```

---

## Capa de negocio — Services & Actions (referencia quirúrgica)

| Componente                                         | Patrón                    | Estado / notas críticas                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreditEngineService`                              | Transacciones + audit log | Saldo atómico vía `UserBono`; `canAffordEnrollment()` consulta bonos; `refundCredits()` restaura `BonoConsumption`; sin bypass legacy. |
| `LessonObserver`                                   | Observer Eloquent         | Mal Mar → refund si `payment_method=bono_vip` o `credits_locked > 0`. |
| `AvailabilityService`                              | Pessimistic locking       | `evaluate()`/`withLockedLesson()` exigen tx activa; `preview()` para UI. Margen 15m/75m; máx. 2 monitores. |
| `EnrollStudentAction`                              | Action + lock             | VIP; doble `UserBono::lockForUpdate()`; `BonoConsumption`; `PaymentStatus::Confirmed` al consumir bono. |
| `BonoService`                                      | Transaction + lock        | `confirmBono()` usa `lockForUpdate`; fuente de verdad clases restantes. |
| `BookingService`                                   | Domain service (SSOT)     | `resolvePricing`, `createPendingBooking` (`PaymentStatus::Pending`), `checkAvailability()`. |
| `PaymentGatewayService`                            | Pasarela async            | `registerPaymentIntent` + `confirmPaymentFromWebhook` con idempotencia DB. |
| `AutoReleaseService`                               | Batch + lock              | `lockForUpdate` sobre pending sin `payment_proof_path`; grace 30min (<4h clase) o 120min.                                                                                                                                 |
| `FirestoreService`                                 | Singleton REST            | Cliente **obligatorio** inyectado; `transport => 'rest'` en `AppServiceProvider` (evita gRPC/caché roto). Chatbot LTP: `/artifacts/{appId}/users/{userId}/artifacts`.                                                     |
| `GoogleAIService`                                  | HTTP Guzzle               | Modelo `gemini-2.5-flash-preview-05-20`; falla en boot si falta `GEMINI_API_KEY`.                                                                                                                                         |
| `VipStudentPerformanceService`                     | Read-heavy agregador      | Consultas amplias por mes bono; usar con `loadHistory` consciente en admin.                                                                                                                                               |
| `LessonProofStorageService`                        | Filesystem                | Privado; no exponer URL directa sin policy.                                                                                                                                                                               |
| `AutoCoachUploadService`                           | Upload + cuotas IP/disco | Throttle + MIME; `config/autocoach.php`; uploads en `storage/app/public/autocoach/uploads` |
| `AutoCoachSessionService`                          | Sesión por cookie        | Path traversal safe; TTL configurable |
| `PlanesTaquillasController` / `TaquillaController` | lockForUpdate inline      | Asignación taquillas y verificación pagos — contención alta en picos admin.                                                                                                                                               |

**Eventos → Listeners (registrados en `AppServiceProvider::boot`):**

```
SoloStudentLocked          → SendSoloStudentNotification
LessonRequestedEvent       → SendLessonRequestedMailListener
LessonProofUploadedEvent   → NotifyAdminLessonProofUploadedListener
PrivateLessonRequestedEvent → SendPrivateLessonRequestedMailListener
PagoTaquillaConfirmado     → EnviarCorreoConfirmacionTaquilla
PagoTaquillaRechazado      → EnviarCorreoRechazoTaquilla
```

---

## Árbol visual — frontend (`resources/`)

```
resources/
├── css/
│   ├── app.css
│   ├── pagina_principal.css, menu_principal.css, inicio.css
│   ├── GestorPedidos.css, footer.css, nosotros.css
│   └── primary_button.css, danger_button.css, …
│
├── views/
│   ├── app.blade.php           ──► Shell HTML: @vite, @inertia
│   ├── home.blade.php
│   └── emails/
│       ├── request-received.blade.php
│       └── reservation-confirmed.blade.php
│
└── js/
    ├── app.jsx                 ──► createInertiaApp; layout default AuthenticatedLayout
    ├── bootstrap.js            ──► Axios + CSRF; window.route vía lib/route.js
    ├── ziggy.js
    │
    ├── Contexts/
    │   └── cartContext.jsx
    │
    ├── lib/
    │   ├── route.js            ──► Helper Ziggy exportado (import ESM; evita ReferenceError en build)
    │   ├── madridTime.js       ──► Helpers TZ cliente (alineado BusinessDateTime)
    │   ├── classManagerModality.js ──► Colores/filtros modalidad (VIP, grupal, semanal, particular)
    │   ├── monitorAvailability.js ──► Estado pool monitores (Borja+Willy): avisos UI gestor clases
    │   ├── quarterTime.js         ──► roundQuarter, parseTime24 — intervalos 15 min
    │   ├── guestEnrollment.js     ──► Labels/badges pago walk-in; formulario vacío
    │   ├── staffAssignValidation.js ──► Conflictos monitor/fotógrafo (no duplicar roles)
    │   ├── staffConflictFormat.js   ──► Formato legible ventanas horarias en conflictos staff
    │   ├── surfboardMeasures.js ──► Altura/volumen surf (3'5"→11'0", filtros alquiler)
    │   └── utils.ts            ──► cn() shadcn
    │
    ├── utils/
    │   └── money.js            ──► formatEur(), formatEurFromCents() (Intl es-ES)
    │
    ├── layouts/
    │   ├── PublicLayout.jsx          ──► Header + main + Footer + Chatbot (shell único)
    │   ├── AuthenticatedLayout.jsx   ──► Alias de PublicLayout
    │   ├── GuestLayout.jsx           ──► Auth Breeze (sin Header global)
    │   ├── Layout1.jsx               ──► Wrapper contenido (sin nav; evitar duplicar con PublicLayout)
    │   ├── Layout2_login_inicio.jsx
    │   └── Contenedor_productos.jsx
    │
    ├── components/
    │   ├── Header.jsx                ──► Shell: logo + hero home; monta GlobalNav.jsx
    │   ├── GlobalNav.jsx             ──► Menú flyout por rol; admin: Gestión (6 cols) + Extras; móvil acordeón
    │   ├── BrandLogo.jsx             ──► `<picture>` WebP/PNG logos S4 (nav, hero, mark)
    │   ├── BunkerLogo.jsx            ──► Logo patrocinador The Bunker Surf Shop
    │   ├── SponsorsStrip.jsx         ──► Bloque patrocinadores (footer, home)
    │   ├── Footer.jsx
    │   ├── Chatbot.jsx
    │   ├── OpcionesIntro.jsx         ──► Carrusel home (solo isHome en Header)
    │   ├── webcam/
    │   │   └── ZurriolaWebcamPlayer.jsx ──► Reproductor HLS webcam Zurriola (Gipuzkoa)
    │   ├── BookingCalendar.jsx
    │   ├── SurfboardBookingSection.jsx   ──► calendario + Collapsible + pago alquiler
    │   ├── PaymentModal.jsx
    │   ├── ManualPaymentInstructionsModal.jsx
    │   ├── Taquilla.jsx
    │   ├── Producto.jsx, ProductoGestor.jsx, ProductoOferta.jsx, ProductImageGallery.jsx, ProductTagSelector.jsx, ProductoEditorPanel.jsx, ProductoEditModal.jsx, ProductoCreateModal.jsx, PedidoDetailModal.jsx
    │   ├── FormularioContacto.jsx
    │   ├── Breadcrumbs.jsx, SafeImage.jsx, ImageLightbox.jsx, EmptyState.jsx
    │   ├── Academy/
    │   │   ├── ClassLessonInfoPanel.jsx    ──► Detalle clase + apuntados walk-in y estado pago
    │   │   ├── ClassGuestEnrollmentModal.jsx ──► Alta/edición persona sin registro web
    │   │   ├── ConfirmPaymentModal.jsx     ──► Confirmación cambio estado pago
    │   │   ├── ClassCalendarPill.jsx       ──► Fila compacta: hora · monitores · cámara fotógrafo · nivel · plazas
    │   │   ├── LessonStaffAssignFields.jsx ──► Formulario 1º/2º monitor + fotógrafo (sí/no + selector)
    │   │   ├── StaffConflictAlert.jsx      ──► Aviso estructurado conflicto monitores (debajo hora)
    │   │   ├── TimePicker24h.jsx           ──► Selector hora 24h (intervalos 15 min) — gestor/clases admin
    │   │   ├── ClassManagerCalendarDay.jsx ──► Celda día (grid desktop / lista móvil)
    │   │   └── StaffAvatar.jsx             ──► Círculo iniciales + PhotographerBadge (icono cámara)
    │   └── ui/                       ──► ~50 primitivos shadcn/Radix (.tsx)
    │
    └── Pages/                        ──► Resolución: ./Pages/{name}.jsx (eager glob)
        │
        ├── [DOMINIO: MARKETING / CMS]
        │   ├── Pag_principal.jsx
        │   ├── Nosotros.jsx            ──► Landing page premium club: Bento Grid instalaciones, tabla de ahorro socio, timeline Edy Mulder (dark/glassmorphic)
        │   ├── Contacto.jsx
        │   ├── Servicios.jsx                    ──► Reparación tablas (Edy Mulder)
        │   ├── Servicios_ReparacionNeoprenos.jsx ──► Reparación neoprenos (Willy)
        │   ├── Servicios_ClasesDeSurf.jsx
        │   ├── Servicios_SurfSkate.jsx
        │   ├── Servicios_SurfTrips.jsx
        │   ├── Servicios_Fotos.jsx
        │   ├── Servicios_Videograbaciones.jsx   ──► Landing videograbación + análisis técnico
        │   └── Servicios_Webcams.jsx            ──► Webcam Zurriola (HLS Gipuzkoa)
        │
        ├── [DOMINIO: AUTOCOACH]
        │   └── AutoCoach/
        │       └── Index.jsx               ──► Comparador de maniobras (vídeos usuario vs referencia)
        │
        ├── [DOMINIO: TIENDA]
        │   ├── Tienda.jsx
        │   ├── Productos.jsx
        │   ├── ProductoVer.jsx
        │   ├── CrearProducto.jsx
        │   ├── Edit.jsx
        │   ├── ProductoCreado.jsx
        │   ├── ProductoModificado.jsx
        │   ├── Carrito.jsx
        │   ├── Pedido.jsx
        │   ├── Pedidos.jsx
        │   ├── PedidoConfirmacion.jsx
        │   ├── GestorPedidos.jsx
        │   └── SecondHand/
        │       ├── Index.jsx   ──► Catálogo público; filtros status + búsqueda
        │       └── Show.jsx    ──► Detalle tabla; galería + CTA WhatsApp
        │
        ├── [DOMINIO: ACADEMIA — cliente]
        │   └── Academy/
        │       └── Index.jsx           ──► lightMode; reserva/inscripción clases
        │
        ├── [DOMINIO: ALQUILERES — cliente]
        │   └── Rentals/
        │       └── Surfboards/
        │           ├── Index.jsx       ──► lightMode
        │           └── Show.jsx        ──► lightMode; BookingCalendar
        │
        ├── [DOMINIO: VIP — cliente]
        │   └── Client/
        │       └── Bonos/
        │           ├── Index.jsx               ──► Compra bonos + historial (solo is_vip)
        │           └── VipRequired.jsx         ──► Info activación VIP + contacto (no VIP autenticado)
        │
        ├── [DOMINIO: USUARIO]
        │   └── User/
        │       └── Dashboard/
        │           ├── MyProfile.jsx             ──► Perfil alumno: evolución VIP, calendario, stats
        │           └── MyReservations.jsx        ──► Reservas clases + alquileres (admin: + análisis VIP)
        │
        ├── components/
        │   └── VipProfile/
        │       └── VipProfileDashboard.jsx     ──► Wallet + heatmap + extracto (compartido perfil/admin)
        │
        ├── [DOMINIO: PERFIL]
        │   └── Profile/
        │       └── MeQuedeSinLlave.jsx       ──► Doble modal confirmación; código 4 dígitos post-POST
        │
        ├── [DOMINIO: TAQUILLAS]
        │   ├── PlanesTaquillasPublic.jsx   ──► Catálogo público planes/cuotas (sin login)
        │   ├── PlanesTaquillasClient.jsx   ──► Panel socio: renovación + historial pagos
        │   ├── PlanesTaquillasAdmin.jsx
        │   ├── AsignarTaquilla.jsx
        │   └── ListaUsuarios.jsx             ──► Admin: listado socios/usuarios (taquilla, contacto)
        │
        ├── [DOMINIO: AUTH]
        │   └── Auth/
        │       ├── Login.jsx
        │       ├── Register.jsx
        │       ├── ForgotPassword.jsx
        │       ├── ResetPassword.jsx
        │       ├── VerifyEmail.jsx
        │       └── ConfirmPassword.jsx
        │
        ├── [DOMINIO: PERFIL — partials Breeze]
        │   └── Partials/
        │       ├── UpdateProfileInformationForm.jsx
        │       ├── UpdatePasswordForm.jsx
        │       └── DeleteUserForm.jsx
        │
        └── [DOMINIO: ADMIN]
            └── Admin/
                ├── Academy/
                │   └── Commander.jsx       ──► Gestión masiva clases/enrollments
                ├── Bonos/
                │   └── Index.jsx
                ├── Bookings/
                ├── SecondHand/
                │   ├── Index.jsx           ──► CRUD admin; barra filtros (marca/modelo, estado, fechas); stats margen/ingresos; modal confirmación borrado
                │   ├── Create.jsx
                │   └── Edit.jsx
                ├── CheckManager.jsx
                ├── EmergencyKeys/
                │   └── Index.jsx             ──► Admin: reponer código (ON), histórico, marcar extravío
                ├── Payments/
                │   ├── Dashboard.jsx
                │   └── GlobalDashboard.jsx
                ├── Surfboards/
                │   ├── Index.jsx
                │   ├── Create.jsx
                │   └── Edit.jsx
                ├── Taquillas/
                │   └── Queue.jsx           ──► Cola verificación pagos taquilla
                ├── Users/
                │   └── Index.jsx
                ├── ClassManager/
                │   └── Index.jsx             ──► Gestor unificado: calendario + filtros + creación todas modalidades
                ├── Vips/
                │   └── Index.jsx
                └── VipManager.jsx            ──► Legacy (redirige a ClassManager)
```

**Páginas con `document.documentElement` modo claro forzado** (`app.jsx`):  
`Pag_principal`, `Productos`, `Academy/Index`, `Servicios_ClasesDeSurf`, `Rentals/Surfboards/Index`, `Rentals/Surfboards/Show`.  
_(`Nosotros` ya NO fuerza modo claro — es dark/glassmorphic por diseño propio)_

---

## Flujo de datos Inertia (shared props)

```
HandleInertiaRequests
    ├── auth.user          (role, is_vip, has_active_locker, …)
    ├── cart / cartCount
    ├── adminStats         (unreviewed_payments_total, unreviewed_rentals_count, unreviewed_lockers_total, vipRenewalAlertCount)
    └── ziggy              (rutas)
```

---

## Notas operativas (IA)

1. **Fuente de verdad UI:** `resources/js/` — menú en `Header.jsx` → `GlobalNav.jsx`.
2. **Menú admin:** flyout **Gestión** + **Extras** en `GlobalNav.jsx`.
3. **AutoCoach vídeos referencia:** `storage/app/public/autocoach/videos/` (seed vía `php artisan autocoach:sync-reference-videos`; fuente opcional `AUTOCOACH_REFERENCE_VIDEOS_SOURCE`).
4. **Rutas JS:** importar `route` vía `lib/route.js` (build inyecta `@route` en vite.config.js).
5. **Créditos legacy vs bonos:** operaciones nuevas de consumo deben pasar por `UserBono` / `BonoService`; no reintroducir `users.credits_balance` sin migración explícita.
6. **Concurrencia:** cualquier cambio en cupo de clase debe usar `AvailabilityService::withLockedLesson` dentro de transacción.
7. **Firestore:** nunca instanciar `FirestoreClient` fuera del binding REST de `AppServiceProvider`.
8. **Convención nombres página Inertia:** archivo `resources/js/Pages/Admin/Academy/Commander.jsx` → render `'Admin/Academy/Commander'`.

---

_Documento generado para contexto quirúrgico de agentes IA. Actualizar tras refactors estructurales en `app/Services` o `resources/js/Pages`._
