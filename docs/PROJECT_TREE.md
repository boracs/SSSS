# maider_0 — Mapa estructural del proyecto (contexto para IA)

**Proyecto:** San Sebastián Surf School (S4)
**Dominio de negocio:** escuela/club de surf — tienda, academia de clases, alquiler de tablas, taquillas/lockers, programa VIP con bonos, tablas de segunda mano y pagos manuales con validación administrativa.
**Tipo de aplicación:** monolito modular (arquitectura por dominios) Laravel 11 + SPA React 19 vía Inertia.js 2.

> Documento de referencia estructural y funcional, verificado contra el código real. Pensado para dar contexto completo a un modelo de IA (Gemini) sobre la arquitectura, los dominios y el inventario del proyecto.

---

## 1. Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Lenguaje backend | PHP 8.2+ |
| Framework backend | Laravel 11 |
| Frontend | React 19 + Inertia.js 2 (`@inertiajs/react`), Vite 6 |
| UI | TailwindCSS 3 + Radix UI / shadcn (~55 primitivos en `components/ui/`) |
| Animación / UX | Framer Motion, Embla, Swiper, Sonner, React Toastify |
| Formularios / validación | React Hook Form + Zod (frontend) · Form Requests (backend) |
| Gráficas | Recharts |
| Autenticación | Laravel Breeze (sesión) + Laravel Sanctum (tokens API) |
| Rutas en JS | Ziggy (`resources/js/ziggy.js`) |
| Base de datos | MySQL (XAMPP local); SQLite para tests/arranque |
| Colas / async | Queue de Laravel (jobs + listeners encolados) |
| IA externa | Google Gemini REST (`GoogleAIService`) |
| Persistencia chatbot | Google Cloud Firestore REST (`FirestoreService`) |
| Cliente JS extra | Firebase SDK (frontend) |
| HTTP cliente | Guzzle 7 |
| Testing | Pest 3 (Feature + Unit), Mockery, Faker |
| Calidad / DevX | Laravel Pint, Pail, Sail; Docker (`docker-compose.yml`, `Dockerfile`) |

**Convención Inertia:** `routes/web.php` → `Controlador@método` → `Inertia::render('Pages/...')` → `resources/js/Pages/{Nombre}.jsx`.
**No hay API REST para la web**: el controlador devuelve directamente la página React.

---

## 2. Arquitectura y principios

- **Arquitectura por dominios** (Domain-based) sobre base MVC de Laravel.
- **Service Layer** (`app/Services/`) para orquestación de dominio.
- **Actions** (`app/Actions/`) para operaciones de negocio unitarias.
- **DTOs inmutables** (`app/DTOs/`) entre capas — sin arrays sueltos.
- **Event-Driven**: Events + Listeners encolados para efectos secundarios (correos, notificaciones).
- **Concurrencia segura**: `DB::transaction()` + `lockForUpdate()` (bloqueo pesimista) en reservas, inventario, bonos y pagos.
- **Dinero como enteros (céntimos)** vía `Support/MoneyCents.php`.
- **Zona horaria de negocio** (Europe/Madrid) centralizada (`BusinessDateTime`, `BusinessWallClockDatetime` cast).

### Mapa de dominios

| Dominio | Backend (app/) | Frontend (resources/js/Pages/) |
| --- | --- | --- |
| Marketing / Home | `Pag_principalController`, `ServicioController` | `Pag_principal`, `Nosotros`, `Servicios*`, `Contacto` |
| Tienda / E-commerce | `Producto`, `Tienda`, `Carrito`, `Pedido` Controllers | `Tienda`, `Productos`, `Carrito`, `Pedido*`, `GestorPedidos` |
| Segunda Mano | `SecondHandBoardController` (público + Admin) | `SecondHand/`, `Admin/SecondHand/` |
| Academia | `Academy/LessonController`, `Actions/Academy/*` | `Academy/`, `Admin/Academy/Commander` |
| Alquileres | `Rentals/*`, `BookingService` | `Rentals/Surfboards/`, `Admin/Surfboards/` |
| Taquillas | `PlanesTaquillas`, `Taquilla`, `PagoCuota`, `Services/Taquilla/*` | `PlanesTaquillas*`, `AsignarTaquilla`, `Admin/Taquillas/Queue` |
| Llave de emergencia | `EmergencyKeyController` (socio + Admin), `EmergencyKeyService` | `Profile/MeQuedeSinLlave`, `Admin/EmergencyKeys/` |
| VIP / Bonos | `Client/BonoController`, `Admin/*`, `BonoService` | `Client/Bonos/`, `Admin/Bonos/`, `Admin/Vips/` |
| Pagos (admin) | `Admin/PaymentValidationController` | `Admin/Payments/`, `Admin/CheckManager` |
| Usuario / Reservas | `User/MyReservationsController` | `User/Dashboard/MyReservations` |
| Auth / Perfil | `Auth/*`, `ProfileController` | `Auth/`, `Profile/`, `Partials/` |
| Chatbot IA | `ChatbotController`, `GoogleAIService`, `FirestoreService` | `components/Chatbot.jsx` |

**Roles y flags:** `user.role` (`admin` / `user`), `user.is_vip`, `user.has_active_locker`. Condicionan menú (`Header.jsx` → `GlobalNav.jsx`), middlewares y políticas.

---

## 3. Árbol — Backend (`app/`)

```
app/
├── Actions/Academy/                      (5) operaciones de negocio atómicas
│   ├── CancelEnrollmentAction.php        ── DB::transaction; revierte inscripción + bono
│   ├── EnrollStudentAction.php           ── VIP-only; UserBono::lockForUpdate + AvailabilityService
│   ├── RequestLessonAction.php           ── dispara LessonRequestedEvent
│   ├── RequestPrivateLessonAction.php    ── dispara PrivateLessonRequestedEvent
│   └── UploadLessonProofAction.php       ── LessonProofStorageService + LessonProofUploadedEvent
│
├── Casts/
│   └── BusinessWallClockDatetime.php     ── TZ negocio (Madrid) en Eloquent
│
├── Console/
│   ├── AuditLessonCreditsCommand.php
│   └── Commands/
│       ├── CleanupExpiredReservations.php ── invoca AutoReleaseService (cron)
│       ├── MakeUserVip.php
│       └── OperationalSanityCheckCommand.php
│
├── DTOs/                                  (3) objetos inmutables entre capas
│   ├── EmergencyKey/EmergencyKeyRevealDto.php   ── código revelado (flash único)
│   ├── EmergencyKey/EmergencyLockStatusDto.php  ── is_active + can_request (sin exponer código)
│   └── Taquilla/PlanTaquillaPublicDto.php       ── catálogo planes: periodo, beneficios, VIP, descuento
│
├── Enums/                                 (2)
│   ├── SecondHandBoardType.php            ── SOFTBOARD | HARDBOARD
│   └── SecondHandStatus.php               ── AVAILABLE | RESERVED | SOLD (+ label/badgeColor)
│
├── Events/                                (6) desacoplamiento mail/notificaciones
│   ├── LessonProofUploadedEvent.php
│   ├── LessonRequestedEvent.php
│   ├── PrivateLessonRequestedEvent.php
│   ├── SoloStudentLocked.php
│   └── Taquilla/
│       ├── PagoTaquillaConfirmado.php     ── emitido tras commit de confirmación de pago
│       └── PagoTaquillaRechazado.php
│
├── Exceptions/
│   └── EmergencyKeyNotEligibleException.php
│
├── Http/
│   ├── Controllers/                       (~40)
│   │   ├── Academy/LessonController.php
│   │   ├── Admin/
│   │   │   ├── AcademyController.php       ── gestión masiva clases/enrollments
│   │   │   ├── BonoController.php
│   │   │   ├── BookingController.php
│   │   │   ├── EmergencyKeyController.php  ── CRUD candado + histórico solicitudes
│   │   │   ├── PaymentValidationController.php
│   │   │   ├── SecondHandBoardController.php ── CRUD admin; expone purchase_price/margen
│   │   │   ├── SurfboardController.php
│   │   │   ├── UserController.php
│   │   │   ├── VipClassManagerController.php
│   │   │   └── VipController.php
│   │   ├── Auth/                           (9) Breeze: sesión, registro, verificación, reset
│   │   ├── Client/BonoController.php
│   │   ├── Rentals/
│   │   │   ├── BookingController.php
│   │   │   └── SurfboardController.php
│   │   ├── User/MyReservationsController.php
│   │   └── [raíz / transversal]
│   │       ├── AuthController.php
│   │       ├── CarritoController.php
│   │       ├── ChatbotController.php       ── GoogleAIService + FirestoreService
│   │       ├── ContactMessageController.php
│   │       ├── EmergencyKeyController.php  ── socio: show + request (código solo vía flash)
│   │       ├── Pag_principalController.php
│   │       ├── PagoCuotaController.php     ── lockForUpdate en verificación de pagos
│   │       ├── PedidoController.php
│   │       ├── PlanesTaquillasController.php ── orquestador Inertia; delega TaquillaMembershipService
│   │       ├── ProductoController.php
│   │       ├── ProfileController.php
│   │       ├── SecondHandBoardController.php ── catálogo público (NO expone purchase_price)
│   │       ├── ServicioController.php
│   │       ├── TaquillaController.php       ── lockForUpdate asignación
│   │       ├── TiendaController.php
│   │       └── UserTaquillaController.php
│   │
│   ├── Middleware/                         (4)
│   │   ├── HandleInertiaRequests.php       ── shared props: auth, cart, adminStats, ziggy
│   │   ├── VerificarAdmin.php
│   │   ├── VerificarTaquilla.php           ── exige taquilla asignada + cuota al día
│   │   └── EnsureUserHasRole.php           ── control por rol (alias 'role')
│   │
│   ├── Requests/                           (~30) validación por dominio
│   │   ├── Academy/  (EnrollStudent, RequestLesson, RequestPrivateLesson, UploadLessonProof)
│   │   ├── Admin/    (StoreAttendanceNote, StoreBooking, StoreSurfboard, UpdateSurfboard, UpdateEmergencyLockCode)
│   │   ├── Auth/     (LoginRequest)
│   │   ├── Rentals/  (StoreBookingRequest)
│   │   ├── Taquilla/ (RegistrarPago, SubirJustificante, StorePlan, UpdatePlan, ConfirmarPago,
│   │   │             RechazarPago, UpdatePagoPaymentState, UpdatePagoCheckedState, ReassignLocker)
│   │   ├── User/     (CancelLessonEnrollmentRequest)
│   │   ├── ProfileUpdateRequest.php
│   │   ├── StoreContactMessageRequest.php
│   │   ├── StoreSecondHandBoardRequest.php / UpdateSecondHandBoardRequest.php
│   │
│   └── Resources/
│       └── PagoCuotaQueueResource.php
│
├── Jobs/
│   └── SendContactMessageJob.php          ── ShouldQueue; delega a ContactMessageService; 3 reintentos
│
├── Listeners/                             (6)
│   ├── NotifyAdminLessonProofUploadedListener.php
│   ├── SendLessonRequestedMailListener.php
│   ├── SendPrivateLessonRequestedMailListener.php
│   ├── SendSoloStudentNotification.php
│   └── Taquilla/
│       ├── EnviarCorreoConfirmacionTaquilla.php  ── ShouldQueue; resiliente (try/catch + Log)
│       └── EnviarCorreoRechazoTaquilla.php
│
├── Mail/                                  (4)
│   ├── RequestReceivedMail.php
│   ├── ReservationConfirmedMail.php
│   └── Taquilla/ (PagoTaquillaConfirmadoMail, PagoTaquillaRechazadoMail)
│
├── Models/                               (22) — ver §5
│
├── Notifications/
│   └── SoloStudentLessonNotification.php
│
├── Observers/
│   └── LessonObserver.php                 ── Mal Mar → CreditEngineService::refundCredits
│
├── Policies/
│   ├── LessonPolicy.php
│   └── LessonUserPolicy.php
│
├── Providers/
│   ├── AppServiceProvider.php             ── FirestoreClient singleton (REST); Lesson::observe; eventos
│   └── RouteServiceProvider.php
│
├── Services/                             (18) capa de negocio
│   ├── AcademyLessonRequestMailService.php
│   ├── AttendanceNoteRelinker.php
│   ├── AutoReleaseService.php             ── lock; libera pending sin comprobante (30m/120m)
│   ├── AvailabilityService.php            ── withLockedLesson exige DB::transaction; máx. 2 monitores
│   ├── BonoService.php                    ── lockForUpdate en confirmBono (SSOT clases restantes)
│   ├── BookingService.php                 ── SSOT precios/disponibilidad alquiler; anti-overbooking
│   ├── ContactMessageService.php
│   ├── CreditEngineService.php            ── DEGRADADO Fase 1 (ver §7)
│   ├── CuotaService.php                   ── ciclo de vida de cuotas de taquilla
│   ├── EmergencyKeyService.php            ── lockForUpdate; requestCode atómico; updateLockCode
│   ├── FirestoreService.php               ── cliente REST inyectado (memoria chatbot LTP)
│   ├── GoogleAIService.php                ── Gemini HTTP; requiere GEMINI_API_KEY
│   ├── LessonProofStorageService.php      ── disco privado: storage/app/private/lesson-proofs
│   ├── VipLoyaltyService.php
│   ├── VipStudentPerformanceService.php   ── agregador read-heavy; perfil VIP/admin
│   └── Taquilla/
│       ├── TaquillaMembershipService.php  ── pagos/planes/cola; DB::transaction; MoneyCents; eventos
│       ├── TaquillaConfirmationMailService.php
│       └── LockerPaymentIndexBuilder.php  ── índice agregado anti-N+1 (cola admin)
│
└── Support/                              (4)
    ├── AcademyContact.php
    ├── BusinessDateTime.php               ── now() negocio Europe/Madrid
    ├── LessonBonoCreditUnits.php          ── unidades de crédito por modalidad/edad
    └── MoneyCents.php                     ── conversión EUR ↔ céntimos
```

---

## 4. Árbol — Frontend (`resources/`)

```
resources/
├── css/                                  (16) estilos legacy por página (app.css + módulos)
│
├── views/
│   ├── app.blade.php                      ── shell HTML: @vite + @inertia
│   ├── home.blade.php
│   └── emails/
│       ├── request-received.blade.php
│       ├── reservation-confirmed.blade.php
│       └── taquilla/ (pago-confirmado, pago-rechazado)
│
└── js/
    ├── app.jsx                            ── createInertiaApp; layout por defecto AuthenticatedLayout
    ├── bootstrap.js                       ── Axios + CSRF + Ziggy
    ├── ziggy.js
    │
    ├── Contexts/cartContext.jsx           ── estado del carrito
    ├── lib/ (madridTime.js, utils.ts)     ── helpers TZ cliente + cn() shadcn
    ├── utils/money.js                     ── formatEur / formatEurFromCents (Intl es-ES)
    │
    ├── layouts/
    │   ├── PublicLayout.jsx               ── Header + main + Footer + Chatbot (shell único)
    │   ├── AuthenticatedLayout.jsx        ── alias de PublicLayout
    │   ├── GuestLayout.jsx                ── Auth Breeze (sin header global)
    │   ├── Layout1.jsx                    ── wrapper de contenido
    │   ├── Layout2_login_inicio.jsx
    │   └── Contenedor_productos.jsx
    │
    ├── components/                        (~30 de negocio + ui/)
    │   ├── Header.jsx                     ── shell: logo + hero home; monta GlobalNav
    │   ├── GlobalNav.jsx                  ── menú flyout por rol (hover+debounce); móvil acordeón
    │   ├── Footer.jsx, Chatbot.jsx, OpcionesIntro.jsx
    │   ├── BookingCalendar.jsx, SurfboardBookingSection.jsx
    │   ├── PaymentModal.jsx, ManualPaymentInstructionsModal.jsx
    │   ├── Taquilla.jsx, UsuarioTaquillaCard.jsx
    │   ├── Producto.jsx, ProductoGestor.jsx, ProductoOferta.jsx
    │   ├── FormularioContacto.jsx, ListaUsuarios.jsx
    │   ├── Breadcrumbs.jsx, SafeImage.jsx, ImageLightbox.jsx, EmptyState.jsx, Modal.jsx
    │   ├── CartaServicio_surf.jsx, CartaServicio_skate.jsx, BrandBanner.jsx, SurfTripFab.jsx
    │   ├── [Breeze base] PrimaryButton, SecondaryButton, DangerButton, TextInput,
    │   │                 InputLabel, InputError, Checkbox, Dropdown, NavLink, ResponsiveNavLink,
    │   │                 ApplicationLogo, Modal, ToggleMenu …
    │   ├── [legacy / no montados] Menu_Principal.jsx, NavigationMenu.tsx
    │   └── ui/                            (~55 primitivos shadcn/Radix .tsx)
    │
    └── Pages/                            (~60) resolución ./Pages/{name}.jsx
        ├── [Marketing/CMS] Pag_principal, Nosotros, Contacto, Servicios,
        │   Servicios_ClasesDeSurf, Servicios_SurfSkate, Servicios_SurfTrips,
        │   Servicios_Fotos, Servicios_Videograbaciones
        ├── [Tienda] Tienda, Productos, ProductoVer, CrearProducto, Edit,
        │   ProductoCreado, ProductoModificado, Carrito, Pedido, Pedidos,
        │   PedidoConfirmacion, GestorPedidos
        ├── [Segunda Mano] SecondHand/ (Index, Show)
        ├── [Academia] Academy/Index
        ├── [Alquileres] Rentals/Surfboards/ (Index, Show)
        ├── [VIP] Client/Bonos/Index
        ├── [Usuario] User/Dashboard/MyReservations
        ├── [Perfil] Profile/MeQuedeSinLlave, Partials/ (UpdateProfileInformation,
        │   UpdatePassword, DeleteUser)
        ├── [Taquillas] PlanesTaquillasPublic, PlanesTaquillasClient,
        │   PlanesTaquillasAdmin, AsignarTaquilla
        ├── [Auth] Login, Register, ForgotPassword, ResetPassword, VerifyEmail, ConfirmPassword
        └── [Admin] Academy/Commander, Bonos/Index, Bookings/Index, SecondHand/(Index,Create,Edit),
            CheckManager, EmergencyKeys/Index, Payments/(Dashboard,GlobalDashboard),
            Surfboards/(Index,Create,Edit), Taquillas/Queue, Users/Index, Vips/Index, VipManager
```

---

## 5. Modelos de datos (22) y relaciones

| Modelo | Rol / relaciones clave |
| --- | --- |
| **User** | Entidad central. `hasMany` Pedidos, Bookings, PagoCuota, UserBono, LessonUser; `numeroTaquilla`, `id_plan_vigente`, `fecha_vencimiento_cuota`; flags `role`, `is_vip`. |
| **Producto** | Catálogo tienda; ↔ User vía `Carrito` (pivot `carrito_producto`); ↔ Pedido vía `PedidoProducto`. |
| **Imagen** | Imágenes asociadas a productos. |
| **Carrito** | Carrito de compra (pivot User↔Producto). |
| **Pedido** / **PedidoProducto** | Pedido `hasMany` líneas; ↔ Producto. Incluye justificante de pago. |
| **Lesson** | Clase (surf/surfskate/surftrip); modalidad, batch, niveles, campos commander. |
| **LessonUser** | Pivot crítico User↔Lesson: estados pago/inscripción, edad, cantidad, comprobante. |
| **AttendanceNote** | Notas de asistencia por inscripción. |
| **StaffAssignment** | Asignación de monitores a clases. |
| **Surfboard** | Tabla de alquiler; specs técnicas, slug, imagen. `hasMany` Booking. |
| **Booking** | Reserva de tabla; precios, periodos, estados de pago/reembolso. |
| **PriceSchema** | Esquemas de precios dinámicos de alquiler. |
| **SecondHandBoard** | Tabla de segunda mano (autónoma); Enums tipo/estado; separa datos públicos de financieros. |
| **PlanTaquilla** | Planes/cuotas de taquilla; precio en céntimos; campos de marketing; VIP/descuento. |
| **PagoCuota** | Pago de cuota; estados confirmado/rechazado/pendiente; periodos, justificante, revisión. |
| **EmergencyLockSetting** | Singleton del candado: `current_code` + `is_active`. |
| **EmergencyKeyRequest** | Histórico de solicitudes de llave de emergencia. |
| **PackBono** | Catálogo de packs de bonos. |
| **UserBono** | Bono adquirido por usuario (SSOT clases restantes prepago). |
| **BonoConsumption** | Consumos de bono. |
| **CreditTransaction** | Movimientos de crédito (legacy, en migración a bonos). |

**Persistencia auxiliar:** tablas `taquilla_audit_logs`, `jobs`, `cache`, `personal_access_tokens` (Sanctum).
**Total:** 57 migraciones · 22 modelos.

---

## 6. Flujo de datos Inertia (shared props)

```
HandleInertiaRequests::share
├── auth.user      (id, role, is_vip, has_active_locker, …)
├── cart / cartCount
├── adminStats     (unreviewed_payments_total, unreviewed_rentals_count,
│                   unreviewed_lockers_total, vipRenewalAlertCount)
└── ziggy          (rutas para el frontend)
```

### Eventos → Listeners (registrados en `AppServiceProvider::boot`)

```
SoloStudentLocked            → SendSoloStudentNotification
LessonRequestedEvent         → SendLessonRequestedMailListener
LessonProofUploadedEvent     → NotifyAdminLessonProofUploadedListener
PrivateLessonRequestedEvent  → SendPrivateLessonRequestedMailListener
PagoTaquillaConfirmado       → EnviarCorreoConfirmacionTaquilla
PagoTaquillaRechazado        → EnviarCorreoRechazoTaquilla
```

---

## 7. Integraciones externas

| Integración | Uso | Notas |
| --- | --- | --- |
| Google Gemini | Chatbot conversacional (`GoogleAIService`) | Modelo `gemini-2.5-flash-preview`; requiere `GEMINI_API_KEY` (falla en boot si falta). |
| Google Firestore | Memoria persistente del chatbot (REST) | Cliente singleton `transport=rest` en `AppServiceProvider`. |
| Firebase (JS) | SDK en frontend | Complemento del flujo de IA en cliente. |
| Mail / SMTP | Confirmaciones de pago, reservas, clases, contacto | Envío encolado (`ShouldQueue`). |
| WhatsApp | CTA contacto en segunda mano | Enlace directo (sin API). |
| Laravel Sanctum | Tokens de acceso API | Tabla `personal_access_tokens`. |

> **No hay pasarela de pago automática** (Stripe/PayPal/Redsys): los pagos son **manuales por transferencia** con subida de justificante y validación administrativa en colas.

---

## 8. Métricas y complejidad

| Métrica | Cantidad |
| --- | --- |
| Rutas (`web` 145 · `auth` 15 · `api` 4) | ~164 |
| Controladores | ~40 |
| Modelos Eloquent | 22 |
| Migraciones | 57 |
| Servicios de dominio | 18 |
| Actions | 5 |
| Eventos / Listeners | 6 / 6 |
| Mailables / Jobs | 4 / 1 |
| DTOs / Enums | 3 / 2 |
| Form Requests | ~30 |
| Comandos artisan | 4 |
| Páginas Inertia (React) | ~60 |
| Componentes de negocio + primitivos UI | ~30 + ~55 |
| Layouts | 6 |
| Seeders / Factories | ~17 / 8 |
| Config files | 13 |
| Tests (Pest) | 14 archivos (Feature + Unit) |

**Complejidad técnica: ALTA** — multidominio (13 áreas funcionales), concurrencia con bloqueo pesimista, arquitectura orientada a eventos con colas, integraciones de IA externas y frontend rico (React 19 + Inertia 2 + shadcn).

---

## 9. Notas operativas y deuda técnica

1. **`CreditEngineService` DEGRADADO (Fase 1):** sin `credits_balance` en `users`; `canAffordEnrollment()` siempre `true`; auditoría no-op. Migración en curso hacia bonos prepago (`UserBono` / `BonoService`). No reintroducir `users.credits_balance` sin migración explícita.
2. **Concurrencia obligatoria:** cualquier cambio de cupo de clase debe usar `AvailabilityService::withLockedLesson` dentro de `DB::transaction()`.
3. **Firestore:** nunca instanciar `FirestoreClient` fuera del binding REST de `AppServiceProvider`.
4. **Menú:** la fuente válida es `Header.jsx` → `GlobalNav.jsx`. `Menu_Principal.jsx` y `NavigationMenu.tsx` son código paralelo/legacy no montado (candidatos a eliminar).
5. **Controladores raíz "transversales"** conviven con la estructura por dominios; consolidación pendiente.
6. **Acceso a comprobantes:** `LessonProofStorageService` usa disco privado; no exponer URL sin policy.
7. **Cobertura de tests limitada** respecto al tamaño del dominio (foco actual en Auth, Carrito, Contact, Profile).
8. **Carpetas excluidas de contexto:** `node_modules/`, `vendor/`, `storage/framework/`, `storage/logs/`, `public/build/`, `bootstrap/cache/`.

---

_Documento estructural verificado contra el código. Actualizar tras refactors en `app/Services`, `app/Models` o `resources/js/Pages`._
