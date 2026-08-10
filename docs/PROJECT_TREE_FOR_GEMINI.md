# maider_0 — Plano de ingeniería (contexto IA)

**Proyecto:** San Sebastian Surf School (S4)  
**Dominio:** escuela de surf — tienda, academia, alquiler de tablas, taquillas, VIP/bonos, pagos automatizados (Stripe Checkout).

---

## Stack

| Capa                  | Tecnología                                                   |
| --------------------- | ------------------------------------------------------------ |
| Backend               | PHP 8.2+, Laravel 11                                         |
| Frontend              | React 19, Inertia.js 2 (`@inertiajs/react` ^2.1), Vite 6     |
| UI                    | Tailwind CSS 3, Radix/shadcn (`resources/js/components/ui/`) |
| Auth                  | Laravel Breeze (session) + Sanctum (API tokens)              |
| Rutas JS              | Ziggy (`resources/js/ziggy.js`)                              |
| Chatbot (memoria)     | MySQL `chatbot_interactions` + `localStorage` (anónimos)     |
| Persistencia auxiliar | Google Firestore REST (legacy; chatbot ya no lo usa)         |
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
│ Subastas        │ Auction, AuctionBid, Auction*Service │ Auctions/, Admin/Auctions/   │
│ Taquillas       │ Taquilla, PlanesTaquillas, EmergencyKey │ PlanesTaquillas*, MeQuedeSinLlave, Admin/EmergencyKeys │
│ VIP / Bonos     │ BonoService, Client/Bono     │ Client/Bonos/, Admin/Bonos/      │
│ Pagos admin     │ Datafono + ClientPayments    │ Admin/Payments/{Datafono,Clients} │
│ AutoCoach       │ AutoCoachController + Services │ AutoCoach/Index.jsx            │
│ Chatbot         │ ChatbotAgentService (regex→Gemini), GoogleAIService, S4BusinessContextService │ Admin/Chatbot/Index.jsx │
│ Webcams         │ ServicioController (ruta)    │ Servicios_Webcams.jsx            │
│ Auth / Perfil   │ Auth/*, ProfileController    │ Auth/, Partials/                 │
└─────────────────┴──────────────────────────────┴────────────────────────────────────┘
```

**Shell global:** `layouts/PublicLayout.jsx` → `components/Header.jsx` (navegación única) + `Footer` + `Chatbot` lazy/`Suspense` (no-admin; único FAB — WhatsAppFloatingButton retirado). `layouts/AuthenticatedLayout.jsx` es alias de `PublicLayout`. Auth (`Auth/*`) sin shell global. Páginas vía `import.meta.glob` diferido en `app.jsx` (chunks por ruta).

**Roles y flags:** `user.role === 'admin'` | `user.is_vip` | `user.has_active_locker` / `has_locker` — condicionan menú (`GlobalNav.jsx` vía `Header.jsx`) y políticas.

**Menú admin (`GlobalNav`):** Inicio · **Gestión** (flyout: Taquillas, Tienda, Alquileres, Servicios/Gestor de servicios, Chatbot, Usuarios, Pagos/cobros) · **Extras** (Comparador, Webcams) · Contacto.

---

## Árbol visual — raíz y backend (`app/`)

```
maider_0/
├── AGENTS.md                               ──► Entrada Reasonix (DeepSeek); apunta a CONTRATO-IA.md
├── .cursorrules                            ──► Entrada Cursor; dúo + router (= CONTRATO-IA)
├── .cursor/
│   ├── rules/
│   │   ├── tunnel-share-modes.mdc          ──► Modos local vs Cloudflare túnel (Vite/build)
│   │   ├── seo-geo-public.mdc              ──► Reglas SEO/GEO páginas públicas
│   │   ├── chatbot-s4.mdc                  ──► Embudo FAQ→Gemini→escalación; fuentes de verdad S4
│   │   ├── taller-reading-layout.mdc       ──► Layout de lectura del Taller (ancho tipográfico)
│   │   └── ui-admin-s4.mdc                 ──► Design language admin (slate/cyan, kit, estados, €)
│   └── skills/
│       ├── sovereign-architect-protocol/
│       │   └── SKILL.md
│       └── prompt-forge/
│           ├── SKILL.md                    ──► Diseño/auditoría de prompts; rúbrica + protocolo dúo DeepSeek
│           └── TEMPLATES.md                ──► Esqueletos por tipo de tarea (feature, bug, refactor, auditoría…)
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
│   ├── [DOMINIO: FOTOS] Actions/Photos/
│   │   ├── ConfirmPhotoBookingPaymentAction.php ──► Confirma pago; bloquea cancelled/rejected/expires_at pasado
│   │   └── RejectPhotoBookingPaymentAction.php  ──► Rechaza pago reserva fotos
│   │
│   ├── Actions/Chatbot/
│   │   └── ProcessChatbotQueryAction.php   ──► ChatbotInteractionQueryDto → ChatbotAgentService (guard + FAQ + derivación)
│   │
│   ├── Actions/Invoicing/
│   │   ├── IssueFiscalInvoiceAction.php    ──► Idempotente por stripe_checkout_session_id; crea factura en B2BRouter (HTTP fuera de lockForUpdate)
│   │   └── SyncFiscalTaxReportAction.php   ──► Sondea tax_report; registered/error → persiste; nunca revierte el pago Stripe
│   │
│   ├── Casts/
│   │   └── BusinessWallClockDatetime.php   ──► TZ negocio (Madrid) en Eloquent
│   │
│   ├── Console/
│   │   ├── AuditLessonCreditsCommand.php
│   │   └── Commands/
│   │       ├── CancelExpiredPhotoBookingsCommand.php ──► `photos:cancel-expired` (schedule everyFiveMinutes)
│   │       ├── CleanupAutoCoachUploads.php      ──► Purga uploads AutoCoach expirados
│   │       ├── CleanupExpiredReservations.php   ──► Invoca AutoReleaseService (cron)
│   │       ├── MakeUserVip.php
│   │       ├── OperationalSanityCheckCommand.php
│   │       ├── ReleaseRentalNoShowsCommand.php  ──► rentals:release-no-shows (--dry-run); libera solo no pagadas del todo (respeta prepago completo); barrido OFF hasta que exista check-in (config/rentals.php)
│   │       ├── SyncAutoCoachReferenceVideos.php ──► Sincroniza catálogo vídeos referencia
│   │       └── SyncStripeCheckoutSessionCommand.php ──► Recupera pagos Stripe pending (webhook perdido)
│   │
│   ├── DTOs/
│   │   ├── Rentals/
│   │   │   ├── RentalPolicyDto.php             ──► Condiciones operativas para la UI (buffer, flexibilidad, hora mediodía, ventana de recogida, notas)
│   │   │   ├── RentalRequestDto.php            ──► Entrada validada de alquiler (pickup_at/start/end, mode, pack_minutes, pack_days)
│   │   │   ├── RentalTariffRowDto.php          ──► Fila de tarifas: categoría + precios en céntimos por pack (null = no ofertado)
│   │   │   ├── RentalTariffTableDto.php        ──► Tabla pública de tarifas (columnas horas/días, filas, notas de condiciones)
│   │   │   └── RentalWindowDto.php             ──► Ventana resuelta: pickupAt→returnAt (cobrado) vs blockEnd (inventario, +buffer)
│   │   ├── Seo/
│   │   │   ├── SeoMetaDto.php                  ──► title/description/canonical/OG/robots/jsonLd (readonly)
│   │   │   └── SitemapUrlDto.php               ──► loc + lastmod/changefreq/priority (readonly)
│   │   ├── Academy/
│   │   │   └── AdminGuestEnrollmentDto.php     ──► DTO readonly inscripción walk-in (nombre, pago)
│   │   ├── Taller/
│   │   │   ├── ArticleCardDto.php              ──► Tarjeta artículo (id/title/slug/excerpt/cover_image)
│   │   │   └── ArticleRelatedPageDto.php       ──► Página related + has_more/next_offset (load more)
│   │   ├── Chatbot/
│   │   │   └── ChatbotReplyDto.php             ──► FAQ local: response + context (readonly)
│   │   │   └── ChatbotInteractionQueryDto.php  ──► message + userId/sessionToken/ip + history (readonly)
│   │   │   └── ChatbotAgentReplyDto.php        ──► message + context + requiresHuman + caseReference (readonly)
│   │   ├── EmergencyKey/
│   │   │   ├── EmergencyKeyRevealDto.php       ──► Código revelado post-solicitud (flash único)
│   │   │   └── EmergencyLockStatusDto.php      ──► is_active + can_request (sin exponer código)
│   │   └── Taquilla/
│   │       ├── PlanTaquillaPublicDto.php       ──► Catálogo planes: periodo, beneficios, VIP, descuento
│   │       ├── LockerOccupantDto.php           ──► Celda mapa ocupación (nº + nombre/apellido + email + telefono + dias_deuda)
│   │       └── LockerOccupancyMapDto.php       ──► Mapa ocupación taquillas (max + occupants)
│   │   └── Payments/
│   │       ├── InitiatePaymentDto.php          ──► Intención de cobro: payable_type/id, lineItems[], success/cancel paths
│   │       ├── PaymentLineItemDto.php          ──► Línea Stripe (céntimos int)
│   │       └── CheckoutSessionResultDto.php    ──► URL checkout + session_id + idempotency_token
│   │   └── Invoicing/
│   │       ├── FiscalInvoiceLineDto.php        ──► Línea factura (céntimos int); conversión € solo en el client B2B
│   │       ├── FiscalInvoiceContactDto.php     ──► Destinatario factura simplificada (nombre+email; sin NIF/dirección hoy)
│   │       ├── FiscalInvoiceDraftDto.php       ──► Borrador payable→factura: contact + lines[]
│   │       ├── FiscalInvoiceResultDto.php      ──► Respuesta alta B2BRouter: b2b_invoice_id + tax_report_ids[]
│   │       ├── FiscalTaxReportStatusDto.php    ──► Estado sondeo: state/identifier/qr/error_message
│   │       ├── FiscalInvoicePublicDto.php      ──► Vista cliente 1 factura: status/QR/PDF url (sin secrets B2B)
│   │       ├── ClientFiscalInvoiceRowDto.php   ──► Fila de "Mis facturas": categoría + descripción + reusa status/PDF de FiscalInvoicePublicDto
│   │       ├── ClientFiscalInvoiceCategoryOptionDto.php ──► Chip de filtro: value/label/enabled ("Próximamente" si enabled=false)
│   │       └── ClientFiscalInvoiceListPageDto.php ──► Página paginada devuelta por ClientFiscalInvoiceListService
│   │
│   ├── Contracts/Invoicing/
│   │   └── FiscalInvoiceIssuerInterface.php    ──► Puerto facturación fiscal; createIssuedInvoice()/getTaxReport(); bind en AppServiceProvider según invoicing.driver
│   │
│   ├── Exceptions/
│   │   ├── EmergencyKeyNotEligibleException.php
│   │   ├── TransactionRequiredException.php  ──► Lanza si AvailabilityService/BookingService sin DB::transaction activa
│   │   ├── Chatbot/
│   │   │   └── GeminiUnavailableException.php ──► Sin key/HTTP fail/respuesta vacía; ChatbotAgentService la degrada a incertidumbre (nunca 500)
│   │   └── Invoicing/
│   │       ├── MissingFiscalDataException.php       ──► Payable/usuario sin datos mínimos; status=failed determinista
│   │       ├── UnsupportedFiscalPayableException.php ──► payable_type fuera de config('invoicing.payable_types')
│   │       └── B2BRouterApiException.php             ──► Fallo HTTP/API B2BRouter; error transitorio, permite retry del Job
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
│   │   │   │       └── LessonController.php ──► Catálogo público + particular guest; enroll/grupal auth
│   │   │   │
│   │   │   ├── [DOMINIO: ADMIN]
│   │   │   │   └── Admin/
│   │   │   │       ├── AcademyController.php      ──► Commander; cancelación Mal Mar → Observer
│   │   │   │       ├── CatalogHubController.php   ──► Hub admin Gestor de servicios (`/admin/catalogo`) + placeholder Surfskate
│   │   │   │       ├── BonoController.php
│   │   │   │       ├── BookingController.php        ──► Reservas alquiler admin; markPickedUp() = check-in de mostrador (PATCH admin/bookings/{booking}/mark-picked-up), exige payment_status=confirmed (si no, error flash y no entrega); check-availability sigue con detalle completo (id incluido) vía getBlockedRanges(); index() manda payment_status al listado para pintar el botón
│   │   │   │       ├── ClientPaymentsController.php ──► Admin · Pagos · Clientes: index (listado ligero + nº pagos) + history() JSON perezoso por acordeón; usa Services/Payments/ClientPaymentHistoryService
│   │   │   │       ├── DatafonoPaymentController.php ──► Ledger datáfono + ticket multi-línea (store efectivo cierra ticket; assign TPV con N lines; pending/ignore)
│   │   │   │       ├── PhotoSessionAdminController.php ──► CRUD sesiones fotos + confirmar/rechazar reservas + justificante
│   │   │   │       ├── EmergencyKeyController.php ──► CRUD candado + histórico solicitudes
│   │   │   │       ├── SecondHandBoardController.php  ──► CRUD admin; filtros search/status/board_type/date_type/fechas; expone purchase_price y margen; protegido VerificarAdmin
│   │   │   │       ├── SurfboardController.php ──► CRUD alquiler; index slim + detalle() JSON perezoso para acordeón inline
│   │   │   │       ├── UserController.php
│   │   │   │       ├── ClassManagerController.php   ──► Gestor unificado calendario (VIP+grupal+semanal+particular)
│   │   │   │       ├── ClassManagerEnrollmentController.php ──► CRUD apuntados walk-in + estado pago
│   │   │   │       ├── ChatbotInteractionController.php ──► Panel casos derivados; index (filtro status, teléfono, whatsapp_reply_url) + resolve
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
│   │   │   │       ├── BookingController.php    ──► Alta pública + Stripe; si el cobro no se abre (o el importe sale 0) cancela la pending para no bloquear la tabla; expira en minutos (no 7 días) si el cliente abandona el pago; store/check-availability con throttle:8,1 / throttle:40,1; check-availability usa getPublicBlockedRanges() (sin id de reserva ni status crudo, solo start/end/display_status)
│   │   │   │       └── SurfboardController.php  ──► Catálogo público (solo is_active); show() 404 si la tabla está retirada
│   │   │   │
│   │   │   ├── [DOMINIO: FOTOS]
│   │   │   │   └── Photos/
│   │   │   │       └── PhotoSessionController.php ──► Landing servicios/fotos + reserva Stripe (PhotoSessionBooking payable)
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
│   │   │       ├── ChatbotController.php          ──► SanitizedChatbotRequest → ProcessChatbotQueryAction; history; registerContactPhone (POST /api/chatbot/contact-phone)
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
│   │   │       ├── SitemapController.php          ──► robots.txt + sitemap.xml (PublicSitemapService)
│   │   │       ├── ArticleController.php          ──► Taller de Surf; index/show + JSON related (load more)
│   │   │       ├── SecondHandBoardController.php  ──► Catálogo público segunda mano; NO expone purchase_price
│   │   │       ├── TiendaController.php
│   │   │       └── UserTaquillaController.php
│   │   │
│   │   ├── Middleware/
│   │   │   ├── HandleInertiaRequests.php          ──► Shared props: auth, academyWhatsappUrl (sin adminStats)
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
│   │   │   ├── Chatbot/
│   │   │   │   ├── SanitizedChatbotRequest.php    ──► strict_types; message max:500 + history/sessionToken sanitizados
│   │   │   │   ├── RegisterChatbotContactPhoneRequest.php ──► POST contact-phone: phone + sessionToken/caseReference
│   │   │   │   └── ChatbotArtifactRequest.php     ──► Stub compat. memoria LTP
│   │   │   ├── StoreSecondHandBoardRequest.php    ──► Valida + sanitiza; autorización role=admin
│   │   │   └── UpdateSecondHandBoardRequest.php   ──► Same; reglas 'sometimes'
│   │   │   ├── Auth/
│   │   │   │   └── LoginRequest.php
│   │   │   ├── Rentals/
│   │   │   │   └── StoreBookingRequest.php  ──► surfboard_id debe existir Y estar activa (igual en Admin/StoreBookingRequest)
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
│   │       └── PagoCuotaRegistryResource.php
│   │
│   ├── Enums/
│   │   ├── ChatbotInteractionStatus.php    ──► ACTIVE | REQUIRES_HUMAN | RESOLVED; label() y badgeColor()
│   │   ├── FiscalInvoiceStatus.php           ──► Pending | Processing | Registered | Failed; label() + isTerminal()
│   │   ├── PaymentStatus.php                 ──► Pending | Confirmed | Rejected (pasarela + comprobantes)
│   │   ├── ProductTag.php                    ──► Tags tienda (invierno, neopreno, material_surf, …)
│   │   ├── SecondHandBoardType.php         ──► SOFTBOARD | HARDBOARD; label() descriptivo
│   │   ├── SecondHandStatus.php            ──► AVAILABLE | RESERVED | SOLD; helpers label() y badgeColor()
│   │   └── Invoicing/
│   │       └── FiscalInvoiceCategory.php   ──► Tienda|BonosClases|BonosTaquilla|Alquileres|Clases; isEnabled() lee config('invoicing.payable_types') (nunca hardcodeado)
│   │
│   ├── Jobs/
│   │   ├── SendContactMessageJob.php       ──► ShouldQueue; delega a ContactMessageService; 3 reintentos
│   │   ├── Chatbot/
│   │   │   └── PersistChatbotHistoryJob.php ──► ShouldQueue; upsert history logueados (lockForUpdate); no bloquea respuesta
│   │   ├── Payments/
│   │   │   └── CaptureStripeReceiptJob.php     ──► ShouldQueue; PaymentConfirmed → captura recibo Stripe (reintentos)
│   │   └── Invoicing/
│   │       ├── CreateB2BRouterInvoiceJob.php   ──► ShouldQueue; WithoutOverlapping(session_id); IssueFiscalInvoiceAction → encola Poll
│   │       └── PollB2BRouterTaxReportJob.php   ──► ShouldQueue; auto-reencola con backoff hasta registered/error/max_attempts
│   │
│   ├── Listeners/
│   │   ├── NotifyAdminLessonProofUploadedListener.php
│   │   ├── SendLessonRequestedMailListener.php
│   │   ├── SendPrivateLessonRequestedMailListener.php
│   │   ├── SendSoloStudentNotification.php
│   │   ├── Payments/
│   │   │   ├── DispatchStripeReceiptCaptureListener.php ──► ShouldQueue; PaymentConfirmed → CaptureStripeReceiptJob
│   │   │   └── DispatchB2BRouterInvoiceListener.php     ──► ShouldQueue; PaymentConfirmed → CreateB2BRouterInvoiceJob; early-return si INVOICING_ENABLED=false
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
│   ├── Models/                               ──► 25 modelos Eloquent (ver tabla abajo)
│   │   ├── Article.php                       ──► Blog Taller de Surf; route key slug; cover_image (opc.); chatbot_summary/chatbot_keywords (opc.) para catálogo FAQ/Gemini
│   │   ├── AttendanceNote.php
│   │   ├── AutoCoachReferenceVideo.php     ──► Catálogo vídeos referencia comparador maniobras
│   │   ├── BonoConsumption.php
│   │   ├── Booking.php                       ──► Ventana alquiler (start/end, pickup_at, return_at, block_end, picked_up_at, no_show_at) con cast BusinessWallClockDatetime (hora de escuela)
│   │   ├── Carrito.php
│   │   ├── ChatbotInteraction.php            ──► history JSON acotado (trimHistory); status enum; contact_phone; accessor case_reference (S4-000123)
│   │   ├── CreditTransaction.php
│   │   ├── EmergencyKeyRequest.php         ──► Histórico solicitudes llave; toAdminArray()
│   │   ├── EmergencyLockSetting.php        ──► Singleton candado; current_code + is_active
│   │   ├── FiscalInvoice.php                 ──► Factura TicketBAI/B2BRouter por payable (session_id UNIQUE, status, b2b_invoice_id, tbai_identifier, qr_payload)
│   │   ├── Imagen.php
│   │   ├── Lesson.php
│   │   ├── LessonUser.php                    ──► Pivot crítico: estados pago/enrollment
│   │   ├── PackBono.php
│   │   ├── PagoCuota.php
│   │   ├── PaymentWebhookIdempotency.php   ──► Idempotencia webhooks (transaction_id, idempotency_token, payable polimórfico)
│   │   ├── PaymentReceipt.php              ──► Recibo Stripe por payable (session_id, receipt_url, storage_path)
│   │   ├── Pedido.php                        ──► Tienda; guest_name/guest_email opc. (venta datáfono sin cuenta)
│   │   ├── PedidoProducto.php
│   │   ├── PlanTaquilla.php
│   │   ├── PriceSchema.php                   ──► Packs alquiler: minutos (60/90/120/180/240/360) + días (1d…5d, week); NAME_BY_CATEGORY; alias legacy price_1h…price_72h (deprecados)
│   │   ├── Producto.php
│   │   ├── SecondHandBoard.php             ──► Modelo segunda mano; campos model/board_type; scope adminFilters; scopes publicCatalog (excluye sold); toPublicArray() sin datos financieros internos
│   │   ├── StaffAssignment.php
│   │   ├── Surfboard.php                     ──► CATEGORIES: soft | hard_basic | hard_pro; categoryLabel()
│   │   ├── User.php                          ──► is_vip; taquilla_baja_solicitada_at (aviso baja taquilla)
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
│   │   ├── BookingService.php                  ──► SSOT alquiler: priceForMinutes (DP packs), buildWindow/normalizeDayRange (12:00→12:00), modo hora con recogida real dentro del horario de mostrador, buffer rotación, isAvailable sobre block window, releaseNoShows; getBlockedRanges() (detalle completo, admin) vs getPublicBlockedRanges() (start/end/display_status, sin id, para el endpoint público); markPickedUp() rechaza si payment_status !== confirmed (InvalidArgumentException)
│   │   ├── ContactMessageService.php
│   │   ├── CreditEngineService.php             ──► Saldo atómico UserBono; refund vía BonoConsumption; sin LEGACY_SIN_SALDO
│   │   ├── CuotaService.php                    ──► Ciclo vida cuotas taquilla
│   │   ├── EmergencyKeyService.php             ──► lockForUpdate; requestCode atómico; updateLockCode ON
│   │   ├── Payments/
│   │   │   ├── PaymentGatewayService.php       ──► lazy StripeClient; createCheckoutSession→CheckoutSessionResultDto; idempotency_token; confirmPaymentFromWebhook (lockForUpdate)
│   │   │   ├── StripeReceiptCaptureService.php ──► Tras webhook: recupera charge.receipt_url de Stripe y persiste PaymentReceipt
│   │   │   ├── PaymentReceiptAccessService.php ──► proofMetaMapForPayables(); prioriza recibo Stripe sobre justificante manual
│   │   │   ├── ClientPaymentHistoryService.php ──► Admin · Pagos · Clientes: historyForUser() unifica Pedido/UserBono/Booking/LessonUser/PagoCuota/PhotoSessionBooking
│   │   │   ├── DatafonoPaymentReconciliationService.php ──► registerRawPayment; materializePayable(line cents); reconcile 1:1 (+ticket 1 línea); listPayments domains; fiscal
│   │   │   └── MostradorTicketService.php ──► closeCashTicket / assignTpvTicket: N líneas atómicas; perfiles guest/VIP/taquilla
│   │   ├── [DOMINIO: FOTOS] Services/Photos/
│   │   │   └── PhotoBookingService.php           ──► packs fotos (base+plus×personas), createBooking, confirm/reject, payloads
│   │   ├── Invoicing/
│   │   │   ├── FiscalInvoiceBuilderService.php   ──► payable (+ PhotoSessionBooking) → FiscalInvoiceDraftDto; fallback contacto invitado
│   │   │   ├── FiscalInvoiceAccessService.php    ──► Vista cliente: ownership + DTO público (TBAI id, QR, PDF URL)
│   │   │   ├── ClientFiscalInvoiceListService.php ──► "Mis facturas" (/mis-facturas): paginado + filtro por FiscalInvoiceCategory; ownership por user_id; reusa FiscalInvoiceAccessService::toPublicDto()
│   │   │   ├── B2BRouterClient.php               ──► HTTP fino: POST invoices, GET tax_reports, GET PDF; headers X-B2B-API-Key/Version
│   │   │   └── B2BRouterFiscalInvoiceIssuer.php   ──► Adapter FiscalInvoiceIssuerInterface; única conversión céntimos→euros (MoneyCents)
│   │   ├── Rentals/
│   │   │   ├── RentalPolicyService.php        ──► config/rentals.php → RentalPolicyDto (buffer, ±flexibilidad, hora mediodía, horario 09:00–19:00, paso de slots) + notas; prop `rentalPolicy`
│   │   │   └── RentalTariffTableService.php   ──► Tabla pública de tarifas: 3 esquemas canónicos → RentalTariffTableDto (céntimos + notas de RentalPolicyService); prop `tariffTable` en /tablas-alquiler
│   │   ├── Taquilla/
│   │   │   ├── TaquillaMembershipService.php   ──► Pagos/planes/cola; vigencia; toggleBajaSolicitada; confirmarBajaTaquilla; marcarBajaSolicitadaPorCliente; DB::transaction; MoneyCents; event PagoTaquillaConfirmado
│   │   │   ├── TaquillaConfirmationMailService.php ──► Envio correo confirmacion cuota
│   │   │   └── LockerPaymentIndexBuilder.php   ──► Indice agregado anti-N+1 cola admin
│   │   ├── Vip/
│   │   │   └── VipMembershipService.php        ──► Activar/desactivar VIP; taquilla virtual #500 si sin casillero
│   │   ├── Taller/
│   │   │   └── TallerArticleService.php        ──► Listado + related paginado (load more JSON) + productos tip tienda
│   │   ├── Chatbot/
│   │   │   ├── ChatbotService.php              ──► FAQ cliente: resolveQuery() regex + chatbot_faq intents (sin BD, gratis, 1ª opción)
│   │   │   ├── ChatbotPromptGuard.php          ──► detect(): patrones prompt_injection/role_override/sql/script (pre-Service)
│   │   │   ├── GoogleAIService.php             ──► Http::withHeaders() → Gemini generateContent; SIN grounding search; GeminiUnavailableException si falla
│   │   │   ├── S4BusinessContextService.php    ──► systemInstruction Gemini: JSON knowledge + PackBono/PlanTaquilla live (cache 5min) + catálogos
│   │   │   ├── S4BusinessKnowledgeService.php  ──► Carga/compila resources/chatbot/s4-business-knowledge.json (políticas, edge cases, tarifario)
│   │   │   ├── ChatbotArticleCatalogService.php ──► Artículos `articles` en vivo: matching FAQ + enlaces /taller/{slug} + bloque Gemini (cache 5min)
│   │   │   ├── ChatbotPageCatalogService.php     ──► Páginas públicas (Nosotros, reparaciones, servicios…): config/chatbot_pages.php + FAQ/Gemini
│   │   │   ├── ChatbotFaqCatalogService.php      ──► Intents FAQ: config/chatbot_faq.php (regex + static/dynamic handlers)
│   │   │   ├── ChatbotUserAccountFaqService.php  ──► Respuestas dinámicas cuenta: taquilla (días/vencimiento), saldo bono
│   │   │   ├── ChatbotContactPhoneService.php    ──► Normaliza móvil ES; register() en caso REQUIRES_HUMAN; syncFromUserProfile(); adminReplyWhatsappUrl()
│   │   │   └── ChatbotAgentService.php         ──► processInteraction(): guard → FAQ → [fallback] Gemini acotado → streak O(1) por marcador texto → escalate/persist
│   │   ├── FirestoreService.php                ──► Inyección obligatoria FirestoreClient REST (AppServiceProvider)
│   │   ├── LessonProofStorageService.php       ──► Disco: storage/app/private/lesson-proofs
│   │   ├── VipLoyaltyService.php
│   │   └── VipStudentPerformanceService.php    ──► Agregación pesada BD; ~800 LOC; perfil VIP/admin
│   │
│   └── Support/
│       ├── AcademyContact.php                ──► WhatsApp escuela: dígitos, wa.me base/url, urlForPhone()
│       ├── AutoCoach/
│       │   └── VideoDurationProbe.php        ──► Duración MP4/MOV (mvhd) / ffprobe opcional
│       ├── ChatbotQueryNormalizer.php        ──► Normalización consultas chatbot (acentos + raíces verbales ES)
│       ├── BusinessDateTime.php                ──► Now()/toApi()/toDatabaseString() en zona de negocio Europe/Madrid (los datetimes naive de BD se leen con el cast BusinessWallClockDatetime)
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
│   ├── queue.php, sanctum.php, services.php, chatbot_pages.php, chatbot_faq.php, session.php, vip.php
│   ├── rentals.php  ──► Buffer rotación (30m, no cobrado), flexibilidad recogida ±30m, no-show (grace + kill-switch + lookback), hora modo día (12:00), señal %, paso DP, caducidad pending: 45m (pública/Stripe, pending_unpaid_expiration_minutes) vs 7 días (admin/pago manual, pending_expiration_days)
│   └── invoicing.php  ──► INVOICING_ENABLED (kill-switch), driver, credenciales B2BRouter, payable_types whitelist, IVA default, backoff sondeo
│
├── database/
│   ├── factories/          (10) — … PriceSchemaFactory (tarifa Softboards de referencia + onlyPacks), SurfboardFactory, BookingFactory (hourWindow/dayWindow/depositPaid/fullyPaid para tests de alquiler)
│   ├── migrations/         (79) — … payment_webhook_idempotency; payment_receipts; auctions; auction_bids; fiscal_invoices; autocoach_reference_videos; emergency_lock_settings; chatbot_interactions; restructure_price_schema_packs; split_hard_surfboard_categories; add_rental_window_fields_to_bookings
│   └── seeders/            (27) — AuctionDemoSeeder (15 lotes: 4 live · 6 settled · 5 draft), CoherentDemoSeeder, ClassManagerSummer2026Seeder, BorjaReservationsSeeder, PriceSchemaSeeder (3 esquemas canónicos + reasignación tablas por categoría), …
│       └── Concerns/       (2) — SeedsBonoConsumptions, SeedsVipAcademyEnrollments
│
├── docs/
│   ├── ia/
│   │   ├── 01-cto-protocol.md
│   │   └── 02-master-prompt-v3-ultra.md
│   ├── chatbot/
│   │   ├── informe-logica-negocio-s4.md        ← contexto de negocio; apunta al JSON editable
│   │   └── CHATBOT-AGENT-BRIEF.md              ← briefing + prompt de arranque para chat dedicado al chatbot
│   ├── payments/
│   │   ├── STRIPE-WEBHOOK.md                   ← webhook producción/local + comando sync-stripe-session
│   │   └── CHECKOUT-CARRITO-STRIPE-MASTER-PROMPT.md  ← prompt Agent: sanear carrito→Stripe (stock lock, total, cancel, huérfanos)
│   ├── invoicing/
│   │   └── B2BROUTER-TICKETBAI.md              ← flujo PaymentConfirmed→B2BRouter, setup cuenta B2B, cómo probar en staging, TODO iteración 2
│   ├── faq-architecture.md                     ← FAQ técnico dev (V3-ULTRA); incluye flujo chatbot híbrido regex+Gemini
│   ├── taller-seo/
│   │   ├── SEO_MATRIX.md                       ← auditoría + Paso 1b + checklists Paso 2 / estructura
│   │   └── SEO_DONE.md                         ← cierre Paso 4 (SeoHead/DTO/sitemap QA)
│   ├── taller-prompts/
│   │   ├── CONTRATO-IA.md                      ← compatibilidad dúo Reasonix/DeepSeek ↔ Cursor (roles + router único)
│   │   ├── RUTAS-CONTEXTO.json                 ← router máquina (fuente única; lo lee `scripts/deepseek-ask.mjs --topic`)
│   │   ├── PROTOCOLO.md                        ← metodología prompt-forge + protocolo dúo
│   │   ├── COORDINACION.md                     ← estado compartido (quién toca qué; historial en COORDINACION-ARCHIVO.md)
│   │   ├── COORDINACION-ARCHIVO.md             ← historial HECHO archivado (poda 2026-08-10)
│   │   ├── REGISTRO.md                         ← iteraciones de prompts (aprendizaje mutuo)
│   │   ├── MASTER-PROMPT-DEEPSEEK.md           ← núcleo para DeepSeek-web (espejo .cursorrules)
│   │   ├── AGENTE-MARKETING-DISENO.md          ← persona UI/UX/CRO (skill Reasonix `/marketing-diseno`)
│   │   └── PLANTILLA-UX-MODAL.md               ← plantilla prompts UX modal (UI-only)
│   ├── RESUMEN-PARA-GEMINI.md                  ← resumen compacto del proyecto (pegar en Gemini; el árbol no, 83 KB)
│   ├── PROJECT_TREE.md
│   ├── INFORME_TECNICO_COTIZACION.md           ← informe estructural/funcional para cotización
│   └── PROJECT_TREE_FOR_GEMINI.md              ← este documento
│
├── public/
│   ├── img/
│   │   ├── brand/          — logos S4 WebP/PNG (nav, hero, mark, og-share)
│   │   │   └── source/     — masters PNG IA (logo-s4-navy/white-master.png)
│   │   ├── zurriola-surf-sunset-{960,1280,1920}.{webp,jpg} ──► Hero home responsive (LCP)
│   │   ├── opciones/       — tiles fila 2 OpcionesIntro (`opcion-*.{webp,jpg}`)
│   │   ├── taller/         — héroes artículos Taller SEO (16 APROBADO `*.webp` IA; #1/#15 POSPONER)
│   │   ├── tienda/demo/    — placeholders prueba catálogo (productos + tablas)
│   │   ├── webcam/         — fallback offline Zurriola (`zurriola-offline.webp` + `.jpg`)
│   │   └── sponsors/
│   │       ├── bunker/     — logo The Bunker Surf Shop (nav, mark, hero WebP/PNG)
│   │       │   └── source/ — masters PNG IA (bunker-navy/white-master.png)
│   │       ├── yow/        — logo YOW Surfskate (yow-logo-white.svg)
│   │       ├── gipuzkoa/   — crédito webcams Diputación (SVG wordmark)
│   │       └── open-meteo/ — crédito datos Open-Meteo (SVG)
│   │   └── placeholder.svg
│   ├── favicon.ico, favicon.svg, favicon-*.png, apple-touch-icon.png, site.webmanifest
│   ├── index.php
│   ├── .user.ini           — límites PHP upload/post para AutoCoach (Apache/XAMPP)
│   └── storage/            — symlink → storage/app/public
│   # robots.txt / sitemap.xml → rutas Laravel (SitemapController), no estáticos en public/
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
│   ├── Feature/            — Auth, Carrito, Contact, Profile, Invoicing
│   │   └── Rentals/        — RentalAvailabilityTest (solape con buffer, extremos, TZ pared, alta de reserva), RentalNoShowSweepTest (barrido apagado + liberación manual), RentalBookingStoreTest (tabla retirada + liberación si falla Stripe), RentalPendingExpirationTest (caducidad corta pública vs larga admin + autoExpirePending), RentalThrottleTest (contrato de límites en las rutas), RentalHardeningCierreTest (check-availability público sin id/status crudo vs admin con detalle completo; markPickedUp exige payment_status confirmed; listado admin manda payment_status)
│   ├── Unit/               — BusinessDateTimeTest
│   │   └── Rentals/        — RentalPricingTest (DP packs), RentalWindowTest (día 12:00→12:00 / hora + horario mostrador), RentalNoShowTest (regla actual: protege solo prepago íntegro; markPickedUp rechaza sin pago confirmado), RentalPricingJsParityTest (PHP↔JS), RentalAvailabilityGuardTest (isAvailable exige transacción)
│   ├── Fixtures/           — rental-pricing-cases.json (contrato de precios compartido PHP↔JS)
│   ├── Js/                 — rental-pricing-parity.mjs (ejecuta lib/rentalPricing.js; lo lanza el test de paridad)
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
| `BookingService`                                   | Domain service (SSOT)     | `priceForMinutes` (DP sobre packs, paso 30 min) · `buildWindow`/`normalizeDayRange` (12:00→12:00) · buffer de rotación no cobrado (`block_end`) · `isAvailable` con solape estricto + `lockForUpdate` · `createPendingBooking` rechaza tablas `is_active=false` dentro del lock; caducidad corta (`expiresInMinutes`) para el flujo público Stripe vs larga (7 días) para admin/pago manual · `releaseNoShows` (OFF por defecto; solo libera si `Booking::isRentalFullyPaid()` es false). Espejo JS: `resources/js/lib/rentalPricing.js` (paridad verificada en `tests/Unit/Rentals/RentalPricingJsParityTest`). Contrato fijado en `tests/Unit/Rentals/*` y `tests/Feature/Rentals/*`. |
| `PaymentGatewayService`                            | Pasarela Stripe           | `createCheckoutSession(InitiatePaymentDto): CheckoutSessionResultDto`; metadata con `idempotency_token`; `registerPaymentIntent` + `confirmPaymentFromWebhook` con `lockForUpdate`. |
| `InitiatePaymentAction`                            | Action pagos              | DTO → PaymentGatewayService → PaymentInitiated (graceful) → URL checkout. |
| `PaymentWebhookController`                         | Webhook Stripe            | Firma HMAC → confirmPaymentFromWebhook → PaymentConfirmed (graceful). POST /webhooks/stripe. |
| `DatafonoIngestWebhookController` (`Http/Controllers/Payments/`) | Webhook TPV firmado | POST /webhooks/datafono/ingest (sin CSRF/auth, firma HMAC-SHA256 propia `X-Datafono-Signature` con `config('services.datafono.ingest_secret')`). Decodifica JSON → `TpvPaymentIngestDto::fromArray` → `DatafonoPaymentReconciliationService::ingestTpvPayment`. 401 firma inválida, 422 payload/terminal inválido, 503 si `DATAFONO_INGEST_ENABLED=false`. |
| `TpvPaymentIngestDto` (`DTOs/Payments/`)            | DTO readonly              | `amountCents`, `paidAt` (ISO8601), `externalReference`, `terminalCodigo?`, `notes?`, `rawPayload` (payload completo, auditoría). `fromArray()` valida obligatorios. |
| `MostradorTicketLineDto` (`DTOs/Payments/`)         | DTO readonly              | Línea de ticket: `category`, `amountCents`, `payload` (ids dominio). |
| `MostradorTicket` / `MostradorTicketLine`          | Modelos                   | Ticket 1:1 con `datafono_payments`; N líneas con morph payable + payload JSON. |
| `MostradorTicketService`                           | Ticket multi-servicio     | `closeCashTicket` / `assignTpvTicket`: suma líneas, perfiles guest/VIP/locker, materializa N payables atómicos. |
| `DatafonoPaymentReconciliationService::ingestTpvPayment` | Ingesta TPV | Resuelve terminal por `terminal_codigo` o `config('services.datafono.default_terminal_codigo')` (404/inactivo → ValidationException) → delega en `registerRawPayment()` (source=tpv, idempotente por `external_reference`, ya en Fase 1). |
| `RedirectsToStripeCheckout` (trait Controller)     | Redirección Inertia 2     | `Inertia::location()` si X-Inertia; `redirect()->away()` si no. |
| `PaymentSuccessController`                         | Retorno Stripe            | Página de aterrizaje tras pago: lee session_id → redirige contextualmente. |
| `MyFiscalInvoicesController` / `ClientFiscalInvoiceListService` | Panel cliente | `/mis-facturas`; filtro por las 5 categorías (tienda, bonos_clases, alquileres, clases, bonos_taquilla). Las 5 ramas están implementadas en `FiscalInvoiceBuilderService`, pero `FiscalInvoiceCategory::isEnabled()` exige además `INVOICING_ENABLED=true`; con el flag en `false` (entorno de prueba actual) todas se muestran como "Próximamente". |
| `AutoReleaseService`                               | Batch + lock              | `lockForUpdate` sobre pending sin `payment_proof_path`; grace 30min (<4h clase) o 120min.                                                                                                                                 |
| `FirestoreService`                                 | Singleton REST            | Cliente inyectado; `transport => 'rest'` en `AppServiceProvider`. Legacy artifacts; **chatbot ya no usa Firestore** (MySQL + localStorage).                                                     |
| `GoogleAIService`                                  | HTTP Guzzle               | Modelo `gemini-2.5-flash-preview-05-20`; falla en boot si falta `GEMINI_API_KEY`. `generationConfig.thinkingConfig.thinkingBudget=0` (fix 2026-07-17: sin esto, el modelo consumía casi todo `maxOutputTokens` en "thinking" interno y devolvía texto cortado). |
| `PublicPageSeoService` (`Services/Seo/`) | Sync, sin APIs externas | SEO/GEO: landings + catálogo + taller (`tallerIndex`/`tallerArticle`) + `preloadImages` (LCP). JSON-LD Organization/LocalBusiness/Service/Course/Product/Offer/Article. `SeoHead`. Regla: `.cursor/rules/seo-geo-public.mdc`. |
| `ProductDetailPageService` (`Services/Store/`) | Sync | Ficha `ProductoVer`: precios/stock/galería + relacionados + `seo` DTO. Controller delgado. |
| `PublicSitemapService` (`Services/Seo/`) | Sync + Cache 1h | `robots.txt` (Allow/Disallow + Sitemap) y `sitemap.xml` (landings + taller + productos + 2ª mano available + alquiler activos). Rutas `seo.robots` / `seo.sitemap`. |
| `ZurriolaGeoFactsService` (`Services/SurfConditions/`) | Sync, JSON local | Hechos GEO públicos (`zurriola-geo-facts.json`): lugar, 20 m escuela↔playa, temporada, kJ, material, FAQs. DTO `ZurriolaGeoFactsDto`; UI `ZurriolaGeoGuide.jsx` en webcams; FAQPage en SEO. Cancelación = null hasta redactar. |
| `SurfDailyBriefService` (`Services/SurfConditions/`) | Cron cada 6 h + Gemini | "Parte S4 de Zurriola": Open-Meteo (ola/viento) + mareas/texto Euskalmet vía tabla → energía/nivel → Gemini. `afterResponse` si falta parte. Ver `docs/surf-conditions/README.md`. |
| `SurfBriefReactionService` (`Services/SurfConditions/`) | Voto sesión + throttle | 👍/👎 del parte del día (`surf_brief_votes` + contadores en `surf_daily_briefs`). Un voto/sesión, toggle y cambio de sentido. Ruta `POST servicios.webcams.parte.reaccion`. |
| `EuskalmetSeaForecastClient` (`Services/SurfConditions/`) | Cache XML 30 min | Predicción marítima Euskalmet (Open Data Euskadi XML público, sin API key): pleamar/bajamar a minutos + texto/temp agua. DTO `EuskalmetSeaDayDto`. |
| `SurfForecastTableService` (`Services/SurfConditions/`) | Cache::remember 1h (tabla) / 45 min (`detailedPayload()`) | Tabla previsión (compacta, `forecast_slot_hours` = diurno cada 2h): oleaje/viento horario Open-Meteo; **mareas preferente Euskalmet** (fallback `TideExtremaCalculator` sobre `sea_level_height_msl`). Energía/viento como antes. Distinto de `SurfDailyBriefService`. Se invalida junto al parte en `SurfBriefController::regenerate()` (`forget()` limpia también la caché del slider detallado). Cada slot lleva además `signal` (reusa `SurfLevelRecommender::recommendSignal()`, misma escala good/espigon/caution/closed que el badge de "hoy"); cada día expone `bestSignal`/`qualityStars`/`bestSlotTime` para el resumen fusionado "Ver forecast completo" (`SurfFullForecastOverlay.jsx`). `qualityStars` (día) usa `intermediateQualityStars()`: heurística para **nivel intermedio** (mayoría del alumnado), tamaño de ola (umbrales `level_thresholds`) + viento (`SurfWindStateClassifier`), tope 2★ si "closed" o tamaño > techo "avanzado". `detailedPayload()` (método nuevo) expone además el slider "cada 2h · todos los días" con `qualityStars` por FRANJA vía `surferQualityStars()` (nivel intermedio/avanzado: más tamaño = mejor nota si el viento acompaña). |
| `ZurriolaWeatherForecastService` + `OpenMeteoWeatherClient` (`Services/SurfConditions/`) | Cache::remember 45 min, on-demand | Panel "Tiempo detallado" (horario 24/48h + 7 días) en `/servicios/webcams`: `OpenMeteoWeatherClient::fetchForecast()` (`api/forecast`, `Http::timeout(10)`, `wind_speed_unit=kmh`) → DTOs `ZurriolaWeatherHourDto`/`ZurriolaWeatherDayDto`/`ZurriolaWeatherForecastDto`. Flag `zurriola_surf.weather_detail_enabled`; fallo → `{ok:false,message}` + `Log::warning`, nunca 500. Controller fino `SurfConditions\ZurriolaWeatherController` → `GET servicios.webcams.weather`. Front: botón amber + fetch SOLO al primer clic (cero peso en carga inicial), `WeatherDetailPanel.jsx`. `OpenMeteoWeatherClient::fetchDetailedForecast(days)` es la variante SIN recorte desde "ahora" ni tope de puntos, usada por `SurfForecastTableService::detailedPayload()` (ver fila siguiente). |
| `SurfDetailedForecastController` (`Http/Controllers/`) | Cache::remember 45 min (vía `SurfForecastTableService`), on-demand | Slider "Ver forecast al detalle" (cada 2h · todos los días): fusiona oleaje + tiempo franja a franja (`forecast_detailed_slot_hours`). DTOs `SurfDetailedSlotDto`/`SurfDetailedDayDto`. `GET servicios.webcams.forecast_detailed`. Front: `SurfDetailedForecastSlider.jsx` + `LevelStars.jsx` (3 filas Ini/Int/Ava). Estrellas: `starsForIniciacion` / `starsForIntermedio` / `starsForAvanzado` (`level_thresholds`); payload `qualityStarsIniciacion|Intermedio|Avanzado` (`qualityStars` = intermedio, compat). |
| `VipStudentPerformanceService`                     | Read-heavy agregador      | Consultas amplias por mes bono; usar con `loadHistory` consciente en admin.                                                                                                                                               |
| `LessonProofStorageService`                        | Filesystem                | Privado; no exponer URL directa sin policy.                                                                                                                                                                               |
| `AutoCoachUploadService`                           | Upload + cuotas IP/disco | Throttle + MIME + duración (≤30s) + máx. 7/tanda; `config/autocoach.php`; `VideoDurationProbe`; uploads en `storage/app/public/autocoach/uploads` |
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
├── chatbot/
│   └── s4-business-knowledge.json  ──► Políticas/edge cases/tarifario comercial (Gemini; draft_unconfirmed)
├── surf-guide/
│   ├── zurriola-spot-guide.md
│   ├── zurriola-spot-logistics.json
│   └── zurriola-geo-facts.json           ──► Hechos GEO públicos (ubicación, temporada, FAQs)
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
    ├── app.jsx                 ──► createInertiaApp; resolve async (glob diferido); layout PublicLayout / guest
    ├── bootstrap.js            ──► Axios + CSRF; window.route vía lib/route.js
    ├── ziggy.js
    │
    ├── Contexts/
    │   └── cartContext.jsx
    │
    ├── lib/
    │   ├── route.js            ──► Helper Ziggy exportado (import ESM; evita ReferenceError en build)
    │   ├── madridTime.js       ──► Helpers TZ cliente (alineado BusinessDateTime)
    │   ├── privateLessonPricing.js ──► Tarifario particular 1–6 pax (UI + PaymentModal)
    │   ├── classManagerModality.js ──► Colores/filtros modalidad (VIP, grupal, semanal, particular)
    │   ├── monitorAvailability.js ──► Estado pool monitores (Borja+Willy): avisos UI gestor clases
    │   ├── quarterTime.js         ──► roundQuarter, parseTime24 — intervalos 15 min
    │   ├── guestEnrollment.js     ──► Labels/badges pago walk-in; formulario vacío
    │   ├── staffAssignValidation.js ──► Conflictos monitor/fotógrafo (no duplicar roles)
    │   ├── staffConflictFormat.js   ──► Formato legible ventanas horarias en conflictos staff
    │   ├── surfboardMeasures.js ──► Altura/volumen surf (3'5"→11'0", filtros alquiler)
    │   ├── rentalAvailability.js ──► Slots de recogida + solape con block_end (espejo de BookingService::isAvailable) + normalizeDayWindow mediodía
    │   ├── rentalPricing.js     ──► Espejo JS de BookingService::priceForMinutes (packs 60→360 min + 1d…5d/week, paso 30 min) + PACK_LABELS/packLabel (etiquetas de duración únicas en la UI). Paridad con PHP: tests/Unit/Rentals/RentalPricingJsParityTest + tests/Fixtures/rental-pricing-cases.json
    │   ├── surfboardCategories.js ──► BOARD_CATEGORIES + boardCategoryLabel (espejo de Surfboard::CATEGORIES)
    │   ├── surfboardPublicDisplay.js ──► Helpers ficha pública alquiler (galería demo, specs, tarifas 60m/240m/1d/week)
    │   ├── whatsapp.js         ──► wa.me helpers + plantillas por dominio (academia, alquiler, taquilla…)
    │   ├── chatbotApi.js       ──► POST message + GET history + POST contact-phone (FAQ + derivación WhatsApp)
    │   ├── inertiaErrors.js    ──► inertiaErrorMessages + showInertiaErrors (toasts desde errors Laravel)
    │   └── utils.ts            ──► cn() shadcn
    │
    ├── utils/
    │   ├── money.js            ──► formatEur(), formatEurFromCents() (Intl es-ES)
    │   ├── hasStoreAccess.js   ──► gate compra tienda socios (`has_store_discount_access` | taquilla)
    │   └── demoCatalogImages.js ──► placeholders prueba tienda/tablas (`/img/tienda/demo`)
    │
    ├── layouts/
    │   ├── PublicLayout.jsx          ──► Header + main + Footer + FlashErrorModal + Chatbot lazy (único FAB flotante)
    │   ├── AuthenticatedLayout.jsx   ──► Alias de PublicLayout
    │   ├── GuestLayout.jsx           ──► Auth Breeze (sin Header global)
    │   ├── Layout1.jsx               ──► Wrapper contenido (sin nav; suele ir dentro de PublicLayout)
    │   ├── Layout2_login_inicio.jsx
    │   └── Contenedor_productos.jsx
    │
    ├── components/
    │   ├── Header.jsx                ──► Shell: GlobalNav (sin OpcionesIntro)
    │   ├── GlobalNav.jsx             ──► Navegación única; menú flyout por rol; admin Gestión (Servicios + Pagos cobros + resto)/Extras; CTA Acceder/Salir; PressRipple cyan al clic
    │   ├── admin/
    │   │   └── CatalogOfferTabs.jsx  ──► Tabs Gestor de servicios → Taquillas / Bonos VIP / Clases / Fotos / Surfskate
    │   ├── PressRipple.jsx           ──► Rail vertical izquierdo cyan (barra + flyout + móvil; sin fondo; reduced-motion)
    │   ├── OpcionesIntro.jsx         ──► Mosaico accesos S4 (home); tile "Forecast al detalle" abre panel on-demand; assets `/img/opciones/*.webp`
    │   ├── S4Button.jsx              ──► CTA marca S4 (tokens .s4-btn* en app.css)
    │   ├── seo/
    │   │   └── SeoHead.jsx           ──► title/description/canonical/OG/JSON-LD desde prop `seo`
    │   ├── BrandLogo.jsx             ──► `<picture>` WebP/PNG logos S4 (nav, hero, mark)
    │   ├── BunkerLogo.jsx            ──► Logo patrocinador The Bunker Surf Shop
    │   ├── YowLogo.jsx               ──► Logo YOW Surfskate
    │   ├── GipuzkoaLogo.jsx          ──► Crédito webcams Diputación Gipuzkoa
    │   ├── OpenMeteoLogo.jsx         ──► Crédito datos Open-Meteo
    │   ├── SponsorsStrip.jsx         ──► Bloque patrocinadores (footer, home): bunker, yow, gipuzkoa, open_meteo
    │   ├── Footer.jsx
    │   ├── Chatbot.jsx                 ──► FAB chat; captura móvil al derivar a humano; POST contact-phone + wa.me escuela
    │   ├── webcam/
    │   │   ├── ZurriolaWebcamPlayer.jsx ──► Reproductor HLS webcam Zurriola (Gipuzkoa); fallback `/img/webcam/zurriola-offline.webp` si cae el stream
    │   │   ├── ZurriolaGeoGuide.jsx ──► Bloque GEO citables (props `zurriolaGeo`; sin lógica)
    │   │   ├── SurfBriefCard.jsx ──► Controles admin del parte (override + regenerar) en `/servicios/webcams`
    │   │   ├── surfBriefOverride.js ──► Labels/tonos override: good | espigon | caution | closed
    │   │   ├── surfLevels.js ──► Textos fijos iniciación/intermedio/avanzado + clases de etiqueta del Parte S4
    │   │   ├── SurfLevelAccordion.jsx ──► Acordeón «¿Cuál es mi nivel?» (fila desktop / vertical móvil)
    │   │   ├── SurfBriefMini.jsx ──► Parte S4 destacado en home (resumen expertos + métricas → webcams) + botón secundario "Ver forecast al detalle" (`DetailedForecastEntry`)
    │   │   ├── SurfBriefReactions.jsx ──► 👍/👎 + contadores bajo el texto del parte
    │   │   ├── SurfForecastTable.jsx ──► Tabla previsión (slots diurnos cada 2h) + Parte S4; botones "Ver forecast al detalle" / "Ver resumen por día", en `/servicios/webcams`
    │   │   ├── WeatherDetailPanel.jsx ──► Panel "Tiempo detallado" (horario 24/48h + 7 días) bajo demanda, amber; iconos Lucide por `weather_code` (lista blanca, sin emojis), en `/servicios/webcams`; exporta `weatherIconFor`/`formatClock`/`formatWeekdayShort` reutilizados por `SurfFullForecastOverlay.jsx`
    │   │   ├── SurfFullForecastOverlay.jsx ──► "Ver resumen por día": oleaje + tiempo + estrellas; footer compartido `SurfForecastSheetFooter`
    │   │   ├── SurfForecastSheetFooter.jsx ──► Footer sheets: Ver parte de hoy (modal) + Ver webcam; usado por detalle y resumen por día
    │   │   ├── LevelStars.jsx ──► Fila/stack de estrellas por nivel (Ini emerald · Int sky · Ava rose)
    │   │   ├── SurfDetailedForecastSlider.jsx ──► "Ver forecast al detalle": bottom-sheet al ras; estrellas por franja; footer `SurfForecastSheetFooter`
    │   │   ├── useDetailedForecast.js ──► Hook fetch on-demand `servicios.webcams.forecast_detailed` (1 request tras éxito)
    │   │   ├── DetailedForecastEntry.jsx ──► Botón+panel reutilizable (home `SurfBriefMini`, `OpcionesIntro` tile, Subastas, Taller artículo parte de olas)
    │   ├── BookingCalendar.jsx ──► selectionMode range (días 12:00→12:00 + total) | single (día suelto para el selector de horas)
    │   ├── SurfboardBookingSection.jsx   ──► Toggle horas/días + Collapsible + pago alquiler; POST con mode/pack/pickup_at
    │   ├── Rentals/
    │   │   ├── RentalHourPicker.jsx ──► Modo horas: chips de pack + día + slots de recogida (descarta los que pisan el buffer); devolución solo lectura
    │   │   ├── TariffMatrix.jsx ──► Matriz compartida rate-card (tabs Horas|Días, sticky, Habitual); usada por RentalTariffTable + WetsuitPriceTables
    │   │   ├── RentalTariffTable.jsx ──► Tarifario RENT en /tablas-alquiler (prop `tariffTable` + TariffMatrix; neopreno bloque aparte; notas política)
    │   │   ├── WetsuitPriceTables.jsx ──► Precios orientativos neopreno (constantes; TariffMatrix 1 fila; modal + inline)
    │   │   └── SurfboardPublicDetail.jsx ──► Ficha compartida Index/Show (galería, specs, tarifas, booking embedded)
    │   ├── PaymentModal.jsx
    │   ├── Taquilla.jsx
    │   ├── Producto.jsx ──► Card tienda navy (density full|compact); ProductoOferta.jsx alias compact
    │   ├── ProductoGestor.jsx, ProductImageGallery.jsx, ProductTagSelector.jsx, ProductoEditorPanel.jsx, ProductoEditModal.jsx, ProductoCreateModal.jsx, PedidoDetailModal.jsx
    │   ├── FormularioContacto.jsx
    │   ├── ContactChannelsModal.jsx ──► Modal canales: WhatsApp / Instagram / email / formulario
    │   ├── FlashErrorModal.jsx ──► Modal rojo bloqueante por `flash.access_alert` (cuota vencida / sin taquilla → carrito); montado en PublicLayout
    │   ├── StoreAccessPopover.jsx ──► Gate compra socios (popover + ContactChannelsModal topic=store)
    │   ├── StoreAddToCartButton.jsx ──► CTA «Añadir al carrito» (Producto)
    │   ├── Breadcrumbs.jsx, SafeImage.jsx, ImageLightbox.jsx, EmptyState.jsx, SortableTable.jsx (SortableTh + compareRows)
    │   ├── icons/WhatsAppIcon.jsx ──► SVG WhatsApp compartido (taquillas admin + asignar)
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
        │   ├── Pag_principal.jsx       ──► Hero + Parte S4 + `OpcionesIntro` (antes footer) + SeoHead
        │   ├── Nosotros.jsx            ──► Landing page premium club: Bento Grid instalaciones, tabla de ahorro socio, timeline Edy Mulder (dark/glassmorphic)
        │   ├── Contacto.jsx
        │   ├── Servicios.jsx                    ──► Reparación tablas (Edy Mulder)
        │   ├── Servicios_ReparacionNeoprenos.jsx ──► Reparación neoprenos (Willy)
        │   ├── Servicios_ClasesDeSurf.jsx
        │   ├── Servicios_SurfSkate.jsx
        │   ├── Servicios_SurfskateGuia.jsx   ──► Guía YOW: altura/peso, tabla selección, perfiles rider
        │   ├── Servicios_SurfTrips.jsx
        │   ├── Servicios_Fotos.jsx              ──► Catálogo PhotoSession + reserva Stripe
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
        │   ├── ProductoVer.jsx         ──► Ficha PDP light (`ProductDetailPageService` + `SeoHead`)
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
        ├── [DOMINIO: SUBASTAS]
        │   ├── Auctions/
        │   │   ├── Index.jsx   ──► Catálogo subastas; filtros en curso/finalizadas
        │   │   └── Show.jsx    ──► Detalle + pujar + pagar Stripe (ganador)
        │   └── Admin/Auctions/
        │       ├── Index.jsx   ──► Gestión: publicar, cerrar, cancelar
        │       ├── Create.jsx
        │       └── Edit.jsx
        │
        ├── [DOMINIO: TALLER DE SURF — blog SEO]
        │   └── Taller/
        │       ├── Index.jsx   ──► Grid tarjetas artículos; route taller.index
        │       └── Show.jsx    ──► Artículo individual; Head SEO + dangerouslySetInnerHTML
        │
        ├── [DOMINIO: ACADEMIA — cliente]
        │   └── Academy/
        │       ├── Index.jsx                      ──► Orquestador alumno (stepper 3 pasos)
        │       ├── AcademyFlowSteps.jsx           ──► Guía visual ver → apuntarse → confirmación
        │       ├── StudentCalendar.jsx            ──► Calendario + helpers día/stats
        │       ├── StudentClassCard.jsx           ──► Card clase + CTAs apuntarme/VIP
        │       ├── StudentClassFeed.jsx           ──► Listado por días + filtros modalidad
        │       ├── StudentBookingModal.jsx        ──► Modal grupo (lazy)
        │       └── PrivateLessonRequestModal.jsx  ──► Particular fecha/slots (lazy)
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
        │   ├── Taller/
        │   │   ├── TallerShell.jsx       ──► Shell gradiente, hero, barra lectura, fadeUp
        │   │   └── TallerArticleCard.jsx ──► Tarjetas (texto + miniatura cover_image) + relacionados con «Cargar más artículos» (JSON)
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
        │   ├── PlanesTaquillasAdmin.jsx    ──► Admin: Planes taquillas (CRUD planes de cuota)
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
                ├── Catalog/
                │   ├── Index.jsx ──► Hub Gestor de servicios (crear/editar/activar ofertas)
                │   └── SurfskatePlaceholder.jsx ──► Placeholder tarifas surfskate (Fase 2)
                ├── Bonos/
                │   └── Index.jsx
                ├── Bookings/
                ├── Chatbot/
                │   └── Index.jsx           ──► Casos derivados (requires_human/resolved); historial expandible + botón resolver
                ├── SecondHand/
                │   ├── Index.jsx           ──► CRUD admin; barra filtros (marca/modelo, estado, fechas); stats margen/ingresos; modal confirmación borrado
                │   ├── Create.jsx
                │   └── Edit.jsx
                ├── EmergencyKeys/
                │   └── Index.jsx             ──► Admin: reponer código (ON), histórico, marcar extravío
                ├── Payments/
                │   ├── Clients.jsx ──► Historial pagos (incluye entity fotos)
                │   └── Datafono/
                │       └── Index.jsx ──► Ledger datáfono + modal conciliación (hub Pagos; GlobalDashboard retirado)
                ├── Photos/
                │   └── Index.jsx ──► CRUD sesiones fotos + validación reservas
                ├── Surfboards/
                │   ├── Index.jsx             ──► Listado zebra + acordeón edición inline (detalle JSON perezoso) + toggle is_active
                │   └── Create.jsx
                ├── Taquillas/
                │   ├── Esquema.jsx           ──► Esquema taquillas (mapa ocupación)
                │   ├── Registry.jsx          ──► Registro de pagos taquilla (SortableTh compartido)
                │   └── Vigencia.jsx          ──► Vigencia socios (ordenación columnas + select móvil)
                ├── Users/
                │   └── Index.jsx
                ├── ClassManager/
                │   └── Index.jsx             ──► Gestor unificado: calendario + filtros + creación todas modalidades
```

**Páginas con `document.documentElement` modo claro forzado** (`app.jsx`):  
`Pag_principal`, `Nosotros`, `Taller/*`, `Productos`, `ProductoVer`, `Academy/Index`, `Rentals/Surfboards/*`, `Pedido*`, `Payments/MyInvoices`, `Edit`.  

---

## Flujo de datos Inertia (shared props)

```
HandleInertiaRequests
    ├── auth.user          (role, is_vip, has_active_locker, …)
    ├── academyWhatsappUrl / academyWhatsappDisplay
    ├── flash
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
