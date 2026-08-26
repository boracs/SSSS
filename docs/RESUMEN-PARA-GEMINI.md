# Resumen del proyecto: maider_0 (San Sebastian Surf School — S4)

> **Para qué:** Gemini no tiene acceso al repo. `docs/PROJECT_TREE_FOR_GEMINI.md` pesa ~83 KB (~21K tokens) — no se pega entero. Este resumen (≈2K tokens) se pega al inicio de cada conversación con Gemini; si hace falta detalle de un dominio, pegar después la sección correspondiente del árbol.
> Complementa a: `docs/PROJECT_TREE_FOR_GEMINI.md` (mapa de ingeniería) · `docs/taller-prompts/MASTER-PROMPT-DEEPSEEK.md` (equivalente para DeepSeek).

## Qué es
Web completa (pública + zona admin) de una escuela de surf de San Sebastián (Donostia).
Cubre todo el negocio: marketing, tienda online, academia/clases, alquiler de tablas,
segunda mano, subastas, taquillas, bonos/VIP, pagos automatizados, chatbot con IA,
blog SEO y webcams. Sistema propio, superior a toda la competencia local.

## Stack
- **Backend:** PHP 8.2+, Laravel 12 (tests: PHPUnit/Pest)
- **Frontend:** React 19 + Inertia.js 2 + Vite 6 + TailwindCSS 3
- **UI:** Radix UI / shadcn (~55 primitivos en `components/ui/`), lucide-react, framer-motion, recharts, react-hook-form, zod, sonner
- **Auth:** Laravel Breeze (sesión) + Sanctum · **Rutas JS:** Ziggy
- **Pagos:** Stripe Checkout + webhooks HMAC, datáfono (TPV) + facturación fiscal TicketBAI (B2BRouter)
- **IA:** Chatbot con Google Gemini (REST) + memoria MySQL + contexto de negocio S4
- **Infra:** Docker (php-fpm + node), local Windows + Cloudflare Tunnel para compartir

## Arquitectura
- Convención Inertia: `routes/web.php` → `Controller@method` → `Inertia::render('Pages/...')` → `resources/js/Pages/{Name}.jsx` (lazy por ruta con `import.meta.glob`)
- Backend por dominios: `app/Services/<Dominio>/`, `app/Actions/<Dominio>/`, `app/DTOs/<Dominio>/`, `app/Enums`, `app/Jobs`, `app/Listeners`
- Patrón Action/DTO/Services; transacciones con `lockForUpdate()` para concurrencia (reservas, saldos, inventario); dinero SIEMPRE en céntimos (`int`)
- Shell global `layouts/PublicLayout.jsx` → Header + Footer + Chatbot lazy
- Roles: `user.role === 'admin'` | `is_vip` | `has_active_locker` (condicionan menú y políticas)

## Módulos de negocio
1. **Tienda** — productos, carrito, pedidos, checkout Stripe, recibos
2. **Academia** — clases grupales/particulares, inscripciones (incl. walk-in admin), bonos de créditos, monitores/fotógrafo, lista de espera
3. **Alquiler de tablas** — reservas por franjas, tarifas por pack, auto-liberación de no-shows (cron)
4. **Segunda mano** — catálogo público + gestión admin (soft-delete)
5. **Subastas** — pujas (throttled) + pago al ganador
6. **Taquillas** — planes, cuotas, ocupación, "Me quedé sin llave" (emergencia)
7. **VIP / Bonos** — membresía, clases VIP, rendimiento de alumnos, consumos
8. **Pagos admin** — datáfono (TPV) con conciliación, ticket multi-línea (efectivo/TPV), facturas fiscales B2BRouter (idempotente)
9. **AutoCoach** — subida de vídeos del alumno, catálogo de referencia
10. **Chatbot IA** — embudo: guard → FAQ local → Gemini (contexto S4) → escalación humana; historial en MySQL
11. **SEO/GEO** — sitemap/robots dinámicos, SEO meta por página, blog "Taller" con artículos relacionados
12. **Condiciones de surf** — previsiones (Euskalmet + Open-Meteo), partes diarios con reacciones, calculadora de energía, recomendador de nivel
13. **Webcams / servicios informativos**

## Estado actual
- Desarrollo activo en local; compartición con clientes vía Cloudflare Tunnel.
- Auditorías técnicas: `AUDITORIA_NUCLEO_LARAVEL_REACT.md` e `INFORME_AUDITORIA_REACT.md` (hallazgos priorizados).
- Docs: `docs/` (chatbot, pagos, surf-conditions, invoicing, taller-seo, taller-prompts).
- Pendientes: análisis SEO de la competencia de Donostia (keywords, tráfico) y plan de rebrand.
