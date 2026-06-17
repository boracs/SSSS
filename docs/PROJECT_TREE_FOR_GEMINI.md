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

`node_modules/`, `vendor/`, `storage/framework/`, `storage/logs/`, `public/build/`, `bootstrap/cache/`, uploads masivos en `storage/app/public/`, `tmp_v0_template/` (plantilla Next de referencia, **no producción**).

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
│ Taquillas       │ Taquilla, PlanesTaquillas    │ PlanesTaquillas*, AsignarTaquilla│
│ VIP / Bonos     │ BonoService, Client/Bono     │ Client/Bonos/, Admin/Bonos/      │
│ Pagos admin     │ PaymentValidation            │ Admin/Payments/*                 │
│ Auth / Perfil   │ Auth/*, ProfileController    │ Auth/, Partials/                 │
└─────────────────┴──────────────────────────────┴────────────────────────────────────┘
```

**Shell global:** `layouts/AuthenticatedLayout.jsx` → `components/Header.jsx` (menú activo) + `Footer` + `Chatbot` (no-admin).

**Roles y flags:** `user.role === 'admin'` | `user.is_vip` | `user.has_active_locker` / `has_locker` — condicionan menú (`Header.jsx`) y políticas.

---

## Árbol visual — raíz y backend (`app/`)

```
maider_0/
├── .cursor/
│   └── skills/
│       └── sovereign-architect-protocol/
│           └── SKILL.md
├── app/
│   │
│   ├── [DOMINIO: ACADEMIA] Actions/Academy/
│   │   ├── CancelEnrollmentAction.php      ──► DB::transaction; revierte enrollment + bono
│   │   ├── EnrollStudentAction.php         ──► Pessimistic lock UserBono::lockForUpdate; AvailabilityService::withLockedLesson
│   │   ├── RequestLessonAction.php         ──► Dispara LessonRequestedEvent → mail listener
│   │   ├── RequestPrivateLessonAction.php  ──► PrivateLessonRequestedEvent
│   │   └── UploadLessonProofAction.php     ──► LessonProofStorageService; LessonProofUploadedEvent
│   │
│   ├── Casts/
│   │   └── BusinessWallClockDatetime.php   ──► TZ negocio (Madrid) en Eloquent
│   │
│   ├── Console/
│   │   ├── AuditLessonCreditsCommand.php
│   │   └── Commands/
│   │       ├── CleanupExpiredReservations.php ──► Invoca AutoReleaseService (cron)
│   │       ├── MakeUserVip.php
│   │       └── OperationalSanityCheckCommand.php
│   │
│   ├── Events/                             ──► Desacoplamiento mail/notificaciones
│   │   ├── LessonProofUploadedEvent.php
│   │   ├── LessonRequestedEvent.php
│   │   ├── PrivateLessonRequestedEvent.php
│   │   └── SoloStudentLocked.php
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
│   │   │   │       ├── SecondHandBoardController.php  ──► CRUD admin; filtros search/status/board_type/date_type/fechas; expone purchase_price y margen; protegido VerificarAdmin
│   │   │   │       ├── SurfboardController.php
│   │   │   │       ├── UserController.php
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
│   │   │   │       └── MyReservationsController.php ──► VipStudentPerformanceService
│   │   │   │
│   │   │   └── [TRANSVERSAL / LEGACY ROOT]
│   │   │       ├── AuthController.php
│   │   │       ├── CarritoController.php
│   │   │       ├── ChatbotController.php          ──► GoogleAIService + FirestoreService
│   │   │       ├── ContactMessageController.php
│   │   │       ├── Controller.php
│   │   │       ├── Pag_principalController.php
│   │   │       ├── PagoCuotaController.php        ──► lockForUpdate en verificación pagos
│   │   │       ├── PedidoController.php
│   │   │       ├── PlanesTaquillasController.php  ──► Pessimistic lock taquillas/usuarios
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
│   │   │   │   └── UpdateSurfboardRequest.php
│   │   │   ├── StoreSecondHandBoardRequest.php    ──► Valida + sanitiza; autorización role=admin
│   │   │   └── UpdateSecondHandBoardRequest.php   ──► Same; reglas 'sometimes'
│   │   │   ├── Auth/
│   │   │   │   └── LoginRequest.php
│   │   │   ├── Rentals/
│   │   │   │   └── StoreBookingRequest.php
│   │   │   ├── User/
│   │   │   │   └── CancelLessonEnrollmentRequest.php
│   │   │   ├── ProfileUpdateRequest.php
│   │   │   └── StoreContactMessageRequest.php
│   │   │
│   │   └── Resources/
│   │       └── PagoCuotaQueueResource.php
│   │
│   ├── Enums/
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
│   │   └── SendSoloStudentNotification.php
│   │
│   ├── Mail/
│   │   ├── RequestReceivedMail.php
│   │   └── ReservationConfirmedMail.php
│   │
│   ├── Models/                               ──► 19 modelos Eloquent (ver tabla abajo)
│   │   ├── AttendanceNote.php
│   │   ├── BonoConsumption.php
│   │   ├── Booking.php
│   │   ├── Carrito.php
│   │   ├── CreditTransaction.php
│   │   ├── Imagen.php
│   │   ├── Lesson.php
│   │   ├── LessonUser.php                    ──► Pivot crítico: estados pago/enrollment
│   │   ├── PackBono.php
│   │   ├── PagoCuota.php
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
│   │   └── LessonObserver.php                ──► updated(Lesson): Mal Mar → CreditEngineService::refundCredits
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
│   │   ├── AvailabilityService.php             ──► withLockedLesson exige DB::transaction; cupo monitores
│   │   ├── BonoService.php                     ──► lockForUpdate en confirmBono; flujo prepago VIP
│   │   ├── BookingService.php                  ──► SSOT precios/disponibilidad alquiler; anti-overbooking
│   │   ├── ContactMessageService.php
│   │   ├── CreditEngineService.php             ──► DEGRADADO Fase 1: canAfford=true; runOneHourBeforeAudit OFF; [LEGACY_SIN_SALDO]
│   │   ├── CuotaService.php                    ──► Ciclo vida cuotas taquilla
│   │   ├── FirestoreService.php                ──► Inyección obligatoria FirestoreClient REST (AppServiceProvider)
│   │   ├── GoogleAIService.php                 ──► Gemini HTTP; GEMINI_API_KEY requerida o 500
│   │   ├── LessonProofStorageService.php       ──► Disco: storage/app/private/lesson-proofs
│   │   ├── VipLoyaltyService.php
│   │   └── VipStudentPerformanceService.php    ──► Agregación pesada BD; ~800 LOC; perfil VIP/admin
│   │
│   └── Support/
│       ├── AcademyContact.php
│       ├── BusinessDateTime.php                ──► Now() negocio Europe/Madrid
│       └── LessonBonoCreditUnits.php           ──► Unidades crédito bono por modalidad edad
│
├── bootstrap/
│   ├── app.php
│   └── providers.php
│
├── config/
│   ├── app.php, auth.php, cache.php, cors.php, database.php
│   ├── filesystems.php, google.php, logging.php, mail.php
│   ├── queue.php, sanctum.php, services.php, session.php
│
├── database/
│   ├── factories/          (7)
│   ├── migrations/         (49) — users, productos, pedidos, taquillas, lessons, bookings, bonos, pagos, second_hand_boards (+model, +board_type)
│   └── seeders/            (10) — OperationalSuperSeeder, TaquillaSeeder, VIP seeders
│
├── docs/
│   ├── ai/
│   │   ├── 01-cto-protocol.md
│   │   └── 02-master-prompt-v3-ultra.md
│   ├── PROJECT_TREE.md
│   └── PROJECT_TREE_FOR_GEMINI.md              ← este documento
│
├── public/
│   ├── img/                — assets marketing estáticos
│   ├── index.php
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
│   └── public/             — productos, surfboards, comprobantes_bonos, taquilla-proofs
│
├── tests/
│   ├── Feature/            — Auth, Carrito, Contact, Profile
│   ├── Unit/               — BusinessDateTimeTest
│   ├── Pest.php
│   └── TestCase.php
│
├── artisan
├── composer.json, package.json, vite.config.js, tailwind.config.js
├── docker-compose.yml, Dockerfile
└── README.md, AUDITORIA_NUCLEO_LARAVEL_REACT.md, INFORME_AUDITORIA_REACT.md
```

---

## Capa de negocio — Services & Actions (referencia quirúrgica)

| Componente                                         | Patrón                    | Estado / notas críticas                                                                                                                                                                                                   |
| -------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CreditEngineService`                              | Transacciones + audit log | **DEGRADADO Fase 1:** sin `credits_balance` en `users`; `canAffordEnrollment()` siempre `true`; `runOneHourBeforeAudit()` no-op; transacciones marcadas `[LEGACY_SIN_SALDO]`. Migración hacia bonos prepago (`UserBono`). |
| `LessonObserver`                                   | Observer Eloquent         | Activo en `Lesson::observe`. Solo reacciona a `STATUS_CANCELLED` + `CANCELLATION_MAL_MAR` → refund vía `CreditEngineService`.                                                                                             |
| `AvailabilityService`                              | Pessimistic locking       | `withLockedLesson()` **lanza** si no hay `DB::transaction()`. Margen operativo 15m (estándar) / 75m (grupos ≥7). Máx. 2 monitores.                                                                                        |
| `EnrollStudentAction`                              | Action + lock             | VIP-only; `UserBono::lockForUpdate()`; delega cupo a `AvailabilityService`.                                                                                                                                               |
| `BonoService`                                      | Transaction + lock        | `confirmBono()` usa `lockForUpdate`; fuente de verdad clases restantes.                                                                                                                                                   |
| `BookingService`                                   | Domain service (SSOT)     | Único punto para precios dinámicos y solapes de reserva surfboard.                                                                                                                                                        |
| `AutoReleaseService`                               | Batch + lock              | `lockForUpdate` sobre pending sin `payment_proof_path`; grace 30min (<4h clase) o 120min.                                                                                                                                 |
| `FirestoreService`                                 | Singleton REST            | Cliente **obligatorio** inyectado; `transport => 'rest'` en `AppServiceProvider` (evita gRPC/caché roto). Chatbot LTP: `/artifacts/{appId}/users/{userId}/artifacts`.                                                     |
| `GoogleAIService`                                  | HTTP Guzzle               | Modelo `gemini-2.5-flash-preview-05-20`; falla en boot si falta `GEMINI_API_KEY`.                                                                                                                                         |
| `VipStudentPerformanceService`                     | Read-heavy agregador      | Consultas amplias por mes bono; usar con `loadHistory` consciente en admin.                                                                                                                                               |
| `LessonProofStorageService`                        | Filesystem                | Privado; no exponer URL directa sin policy.                                                                                                                                                                               |
| `PlanesTaquillasController` / `TaquillaController` | lockForUpdate inline      | Asignación taquillas y verificación pagos — contención alta en picos admin.                                                                                                                                               |

**Eventos → Listeners (registrados en `AppServiceProvider::boot`):**

```
SoloStudentLocked          → SendSoloStudentNotification
LessonRequestedEvent       → SendLessonRequestedMailListener
LessonProofUploadedEvent   → NotifyAdminLessonProofUploadedListener
PrivateLessonRequestedEvent → SendPrivateLessonRequestedMailListener
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
    ├── bootstrap.js            ──► Axios + CSRF + Ziggy
    ├── ziggy.js
    │
    ├── Contexts/
    │   └── cartContext.jsx
    │
    ├── lib/
    │   ├── madridTime.js       ──► Helpers TZ cliente (alineado BusinessDateTime)
    │   └── utils.ts            ──► cn() shadcn
    │
    ├── layouts/
    │   ├── AuthenticatedLayout.jsx   ──► Header + main + Footer + Chatbot
    │   ├── GuestLayout.jsx
    │   ├── Layout1.jsx               ──► Home Pag_principal (sin Header duplicado)
    │   ├── Layout2_login_inicio.jsx
    │   └── Contenedor_productos.jsx
    │
    ├── components/
    │   ├── Header.jsx                ──► Navegación global ACTIVA (adminStats badges)
    │   ├── Menu_Principal.jsx        ──► LEGACY — no montado en AuthenticatedLayout
    │   ├── Footer.jsx
    │   ├── Chatbot.jsx
    │   ├── OpcionesIntro.jsx         ──► Carrusel home (solo isHome en Header)
    │   ├── BookingCalendar.jsx
    │   ├── PaymentModal.jsx
    │   ├── ManualPaymentInstructionsModal.jsx
    │   ├── Taquilla.jsx
    │   ├── Producto.jsx, ProductoGestor.jsx, ProductoOferta.jsx
    │   ├── FormularioContacto.jsx
    │   ├── Breadcrumbs.jsx, SafeImage.jsx, EmptyState.jsx
    │   └── ui/                       ──► ~50 primitivos shadcn/Radix (.tsx)
    │
    └── Pages/                        ──► Resolución: ./Pages/{name}.jsx (eager glob)
        │
        ├── [DOMINIO: MARKETING / CMS]
        │   ├── Pag_principal.jsx
        │   ├── Nosotros.jsx            ──► Landing page premium club: Bento Grid instalaciones, tabla de ahorro socio, timeline Edy Mulder (dark/glassmorphic)
        │   ├── Contacto.jsx
        │   ├── Servicios.jsx
        │   ├── Servicios_ClasesDeSurf.jsx
        │   ├── Servicios_SurfSkate.jsx
        │   ├── Servicios_SurfTrips.jsx
        │   └── Servicios_Fotos.jsx
        │
        ├── [DOMINIO: TIENDA]
        │   ├── Tienda.jsx
        │   ├── Productos.jsx
        │   ├── ProductoVer.jsx
        │   ├── CrearProducto.jsx
        │   ├── Edit.jsx
        │   ├── ProductoCreado.jsx
        │   ├── ProductoModificado.jsx
        │   │
        │   └── SecondHand/
        │       ├── Index.jsx   ──► Catálogo público; filtros status + búsqueda; cards glassmorphic; specs Lucide icons
        │       └── Show.jsx    ──► Detalle tabla; galería multi-imagen + modal zoom; CTA WhatsApp; specs técnicas
        │   ├── Carrito.jsx
        │   ├── Pedido.jsx
        │   ├── Pedidos.jsx
        │   ├── PedidoConfirmacion.jsx
        │   └── GestorPedidos.jsx
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
        │           └── Index.jsx
        │
        ├── [DOMINIO: USUARIO]
        │   └── User/
        │       └── Dashboard/
        │           └── MyReservations.jsx
        │
        ├── [DOMINIO: TAQUILLAS]
        │   ├── PlanesTaquillasClient.jsx
        │   ├── PlanesTaquillasAdmin.jsx
        │   └── AsignarTaquilla.jsx
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
                ├── Vips/
                │   └── Index.jsx
                └── VipManager.jsx
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

1. **Fuente de verdad UI:** `resources/js/` — ignorar `tmp_v0_template/` salvo referencia de diseño shadcn.
2. **Menú:** usar `Header.jsx`; `Menu_Principal.jsx` es código paralelo no integrado en el layout principal.
3. **Créditos legacy vs bonos:** operaciones nuevas de consumo deben pasar por `UserBono` / `BonoService`; no reintroducir `users.credits_balance` sin migración explícita.
4. **Concurrencia:** cualquier cambio en cupo de clase debe usar `AvailabilityService::withLockedLesson` dentro de transacción.
5. **Firestore:** nunca instanciar `FirestoreClient` fuera del binding REST de `AppServiceProvider`.
6. **Convención nombres página Inertia:** archivo `resources/js/Pages/Admin/Academy/Commander.jsx` → render `'Admin/Academy/Commander'`.

---

_Documento generado para contexto quirúrgico de agentes IA. Actualizar tras refactors estructurales en `app/Services` o `resources/js/Pages`._
