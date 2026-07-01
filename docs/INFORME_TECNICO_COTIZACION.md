# Informe Técnico para Cotización — San Sebastián Surf School (S4)

> Análisis estructural y funcional de la aplicación `maider_0`.
> Plataforma de gestión integral para una escuela/club de surf: tienda, academia, alquiler de tablas, taquillas, programa VIP/bonos y pagos manuales.
> _Documento generado para estimación de desarrollo, mejora o mantenimiento._

---

## 1. Stack Tecnológico

### Backend
| Componente | Tecnología / Versión |
| --- | --- |
| Lenguaje | PHP 8.2+ |
| Framework | Laravel 11 (^11.31) |
| Autenticación | Laravel Breeze (sesión) + Laravel Sanctum 4 (tokens API) |
| Rutas para JS | Ziggy (tightenco/ziggy ^2.0) |
| Cliente HTTP | Guzzle 7.9 |
| IA / NoSQL | Google Cloud Firestore (^1.54) vía REST |
| Consola REPL | Laravel Tinker |

### Frontend
| Componente | Tecnología / Versión |
| --- | --- |
| Librería UI | React 19 |
| Puente SPA/SSR | Inertia.js 2 (`@inertiajs/react` ^2.1) |
| Bundler | Vite 6 |
| Estilos | TailwindCSS 3 + tailwindcss-animate + tailwind-merge |
| Sistema de componentes | Radix UI + shadcn (~50 primitivos en `components/ui/`) |
| Animación | Framer Motion 12 |
| Formularios / Validación | React Hook Form 7 + Zod 4 |
| Gráficas | Recharts 3 |
| Carruseles | Embla, Swiper |
| Iconos | Lucide, Heroicons, FontAwesome, React Icons |
| Notificaciones | Sonner, React Toastify |
| Fechas | date-fns, react-datepicker, react-day-picker |
| Cliente Firebase | firebase ^12 (frontend) |

### Base de Datos y Entorno
- **MySQL** (entorno local XAMPP; soporte SQLite para tests/arranque).
- **Colas** (`queue`): jobs y listeners encolados (mail, notificaciones).
- **Docker**: `docker-compose.yml` + `Dockerfile` presentes (Laravel Sail disponible).

### Testing y Calidad
- **Pest 3** + plugin Laravel, Mockery, Faker, Collision.
- **Laravel Pint** (formateo), **Laravel Pail** (logs).

---

## 2. Arquitectura y Estructura

**Patrón general:** Monolito modular con **arquitectura por dominios** y **capa de servicios**, sobre una base MVC de Laravel. El frontend es un **SPA con Inertia.js** (sin API REST tradicional para la web: el controlador devuelve directamente la página React vía `Inertia::render`).

**Principios aplicados (verificados en código):**
- **Domain-Driven** por carpetas: Academia, Tienda, Alquileres, Taquillas, VIP/Bonos, Segunda Mano, Auth.
- **Service Layer** para orquestación de dominio (`app/Services/`).
- **Actions** para operaciones de negocio unitarias (`app/Actions/Academy/`).
- **DTOs** inmutables entre capas (`app/DTOs/`).
- **Arquitectura orientada a eventos**: Events + Listeners encolados para efectos secundarios (correos, notificaciones).
- **Concurrencia**: `DB::transaction()` + `lockForUpdate()` (bloqueo pesimista) en reservas, inventario, bonos y pagos para evitar overbooking/doble consumo.
- **Dinero como enteros (céntimos)** mediante `Support/MoneyCents.php`.

**Estructura de carpetas principal:**
```
app/
├── Actions/        Operaciones de negocio atómicas (academia)
├── Casts/          Casts Eloquent (zona horaria de negocio)
├── Console/        Comandos artisan (cron, auditorías, VIP)
├── DTOs/           Objetos de transferencia inmutables
├── Enums/          Tipos enumerados (segunda mano)
├── Events/         Eventos de dominio
├── Exceptions/     Excepciones de dominio
├── Http/
│   ├── Controllers/  ~40 controladores (orquestadores)
│   ├── Middleware/   Auth, VerificarAdmin, VerificarTaquilla, roles, Inertia
│   ├── Requests/     ~30 Form Requests (validación)
│   └── Resources/    API Resources
├── Jobs/           Trabajos en cola
├── Listeners/      Reacciones a eventos (mail/notif)
├── Mail/ Notifications/  Correos y notificaciones
├── Models/         22 modelos Eloquent
├── Observers/      Observadores Eloquent (Lesson)
├── Policies/       Autorización (Lesson, LessonUser)
├── Providers/      AppServiceProvider (bindings, eventos, Firestore)
├── Services/       18 servicios de dominio (capa de negocio)
└── Support/        Helpers (dinero, zona horaria, créditos)

resources/js/
├── Pages/          ~60 páginas Inertia (organizadas por dominio)
├── components/     Componentes de negocio + ui/ (shadcn/Radix)
├── layouts/        PublicLayout, GuestLayout, etc.
├── Contexts/       Estado React (carrito)
└── utils/ lib/     Helpers (dinero, fechas, cn)

database/
├── migrations/     57 migraciones
├── seeders/        ~14 seeders + factories
```

**Convención Inertia:** `routes/web.php` → `Controller@method` → `Inertia::render('Pages/...')` → `resources/js/Pages/{Name}.jsx`.

---

## 3. Módulos y Funcionalidades Clave

| # | Módulo | Funcionalidades principales |
| --- | --- | --- |
| 1 | **Autenticación y Perfil** | Registro, login (sesión), verificación de email, reset de contraseña, confirmación de contraseña, gestión de perfil y baja de cuenta. Tokens API con Sanctum. |
| 2 | **Roles y Acceso** | Roles `admin` / `user`, flags `is_vip`, `has_active_locker`. Middlewares `VerificarAdmin`, `VerificarTaquilla`, `EnsureUserHasRole`. |
| 3 | **Tienda / E-commerce** | Catálogo de productos, gestión de imágenes, carrito de compra, pedidos, confirmación y gestor de pedidos. Compra condicionada a tener taquilla activa con cuota al día. |
| 4 | **Segunda Mano** | Catálogo público de tablas usadas (softboard/hardboard, estados disponible/reservado/vendido), galería con zoom, CTA WhatsApp + CRUD admin con márgenes e ingresos. |
| 5 | **Academia / Clases** | Clases de surf, surfskate y surftrips; inscripción VIP con control de cupo y monitores (bloqueo pesimista), solicitud de clases, subida de comprobantes, cancelaciones, notas de asistencia, panel "Commander" de gestión masiva. |
| 6 | **Alquiler de Tablas (Rentals)** | Catálogo de tablas, calendario de disponibilidad, motor de precios dinámicos (`BookingService`, SSOT), reservas anti-solapamiento, validación de pagos, liberación automática de reservas sin comprobante (cron). |
| 7 | **Taquillas (Lockers)** | Catálogo público de planes/cuotas, panel del socio (renovación + historial), asignación de taquilla (bloqueo pesimista), registro y verificación de pagos manuales (cola admin), conversión a céntimos, correos de confirmación/rechazo. |
| 8 | **Llave de Emergencia** | Socio solicita código de candado (flujo atómico con flash único), histórico de solicitudes y reposición/gestión del código por admin. |
| 9 | **VIP / Bonos** | Packs de bonos prepago, bonos de usuario (`UserBono`), consumo de clases, transacciones de crédito (legacy en migración), lealtad VIP y panel de rendimiento del alumno. |
| 10 | **Pagos (validación admin)** | Pagos manuales por transferencia con subida de justificante; colas de verificación (taquillas, alquileres, clases); dashboards de pagos globales. |
| 11 | **Panel de Administración** | Gestión de usuarios, VIPs, bonos, reservas, tablas (nuevas y segunda mano), clases, taquillas, llaves de emergencia y pagos. |
| 12 | **CMS / Marketing** | Home, "Nosotros", páginas de servicios (clases, surfskate, surftrips, fotos, videograbaciones), contacto con envío de mensajes (job en cola). |
| 13 | **Chatbot con IA** | Asistente conversacional con Google Gemini y memoria persistente en Firestore (no disponible para admin). |

---

## 4. Modelos de Datos / Base de Datos

**22 modelos Eloquent / 57 migraciones.** Entidades principales y relaciones:

### Núcleo / Usuarios
- **User** — entidad central. Relaciones: `hasMany` Pedidos, Bookings, PagoCuota, UserBono, LessonUser (inscripciones); plan de taquilla vigente (`id_plan_vigente`), número de taquilla y fecha de vencimiento de cuota. Flags `role`, `is_vip`.

### Tienda
- **Producto** ↔ **Carrito** (pivot `carrito_producto`) ↔ **User**.
- **Pedido** `hasMany` **PedidoProducto** (líneas de pedido) ↔ **Producto**.
- **Imagen** — imágenes asociadas a productos.

### Academia
- **Lesson** (clase) ↔ **User** mediante **LessonUser** (pivot crítico: estados de pago/inscripción, edad, cantidad).
- **AttendanceNote** — notas de asistencia por inscripción.
- **StaffAssignment** — asignación de monitores a clases.

### Alquileres
- **Surfboard** `hasMany` **Booking** (reservas). **PriceSchema** — esquemas de precios dinámicos.

### Taquillas
- **PlanTaquilla** (planes/cuotas) ↔ **User**; **PagoCuota** (pagos de cuota, estados confirmado/rechazado/pendiente, periodos, justificantes).
- **EmergencyLockSetting** (singleton del candado: código + activo) y **EmergencyKeyRequest** (histórico de solicitudes de llave).

### VIP / Bonos
- **PackBono** (catálogo) → **UserBono** (bono adquirido por usuario) → **BonoConsumption** (consumos) + **CreditTransaction** (movimientos de crédito, legacy en migración a bonos prepago).

### Segunda Mano
- **SecondHandBoard** — autónomo, con Enums `SecondHandBoardType` (softboard/hardboard) y `SecondHandStatus` (disponible/reservado/vendido). Separa datos públicos de datos financieros internos (precio de compra/margen).

**Observaciones de diseño:** dinero en **céntimos (int)**; zona horaria de negocio (Europe/Madrid) gestionada por casts; estados modelados con constantes/enums; auditoría de taquillas (`taquilla_audit_logs`).

---

## 5. Integraciones Externas

| Integración | Uso | Notas |
| --- | --- | --- |
| **Google Gemini (IA)** | Chatbot conversacional (`GoogleAIService`, modelo `gemini-2.5-flash-preview`). | Requiere `GEMINI_API_KEY`; llamadas HTTP vía Guzzle. |
| **Google Cloud Firestore** | Memoria persistente del chatbot (REST). | Cliente singleton con `transport=rest` en `AppServiceProvider`. |
| **Firebase (cliente JS)** | SDK Firebase en el frontend (`firebase` ^12). | Complemento del flujo de IA/persistencia en cliente. |
| **Correo (SMTP / Mail)** | Confirmaciones de pago, reservas, solicitudes de clase, contacto. | Envío encolado (jobs/listeners `ShouldQueue`). |
| **WhatsApp** | CTA de contacto en catálogo de segunda mano (enlace directo, sin API). | Integración ligera vía enlace. |
| **Laravel Sanctum** | Tokens de acceso personal (API). | Tabla `personal_access_tokens`. |

> No se detectan pasarelas de pago automáticas (Stripe/PayPal/Redsys): **los pagos son manuales por transferencia** con subida de justificante y validación administrativa.

---

## 6. Complejidad y Tamaño

### Métricas cuantitativas
| Métrica | Cantidad |
| --- | --- |
| Definiciones de ruta (`web` + `auth` + `api`) | **~164** (145 web · 15 auth · 4 api) |
| Controladores | **~40** |
| Modelos Eloquent | **22** |
| Migraciones | **57** |
| Servicios de dominio | **18** |
| Actions | 5 |
| Eventos / Listeners | 6 / 6 |
| Form Requests (validación) | ~30 |
| Páginas Inertia (React) | **~60** |
| Componentes de negocio + primitivos UI | ~25 + ~50 (shadcn/Radix) |
| Seeders / Factories | ~14 / 7 |
| Tests (Pest) | Feature (Auth, Carrito, Contact, Profile) + Unit |

### Nivel de complejidad técnica: **ALTA**

**Factores que elevan la complejidad:**
- **Multidominio amplio** (13 módulos funcionales) con lógica de negocio real, no CRUD trivial.
- **Concurrencia avanzada**: bloqueos pesimistas y transacciones en reservas, bonos y pagos (anti-overbooking / anti-doble-consumo).
- **Arquitectura orientada a eventos** con colas (mail/notificaciones desacoplados).
- **Integraciones de IA externas** (Gemini + Firestore) fuera del ciclo HTTP.
- **Frontend rico**: React 19 + Inertia 2 + ~50 primitivos shadcn, calendarios, dashboards con gráficas, modales de pago, modo claro/oscuro por página.
- **Gestión financiera** con dinero en céntimos, auditorías y flujos de pago manual multi-estado.

**Factores que la moderan:**
- Monolito Laravel bien estructurado (no microservicios).
- Patrones consistentes y documentación interna (`PROJECT_TREE_FOR_GEMINI.md`).
- Pagos manuales (sin la complejidad de integrar/conciliar pasarelas automáticas).

### Notas relevantes para mantenimiento / cotización
- **Deuda técnica conocida:** `CreditEngineService` está **degradado (Fase 1)** — sistema de créditos en migración hacia bonos prepago (`UserBono`). Requiere atención si se retoma esa funcionalidad.
- **Código legacy/paralelo:** existen componentes de menú duplicados (`Menu_Principal.jsx`, `NavigationMenu.tsx` no montados) y controladores raíz "transversales" junto a la estructura por dominios; conviene consolidar.
- **Dependencia de claves externas:** la app falla en arranque si falta `GEMINI_API_KEY` (acoplamiento a configurar bien en despliegue).
- **Cobertura de tests limitada** respecto al tamaño del dominio: oportunidad de inversión en QA antes de cambios grandes.

---

_Fin del informe._
