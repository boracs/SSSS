# Auditoría de coherencia de diseño — Web pública S4

**Fecha:** 2026-08-26  
**Alcance:** `resources/js/Pages/` (públicas + área cliente), infraestructura visual asociada.  
**Excluido:** SEO, admin interno salvo tokens compartidos.  
**Autor:** Cursor (solo documentación; sin cambios de código).

---

## 1. Infraestructura de diseño (referencia)

| Capa | Archivo | Rol |
|------|---------|-----|
| Tema global | `resources/js/app.jsx` L43–64 | `lightModePages` → quita `html.dark` |
| Tokens Tailwind | `tailwind.config.js` | `s4`, `brand`, `ocean`, `softdark`, `font-editorial`, `text-scale-*`, `borderRadius lg/md/sm → var(--radius)` |
| CSS global | `resources/css/app.css` | `:root` (`--s4-*`, **sin `--radius`**), inputs globales L156–160, `.s4-btn*`, `.s4-surface-*` |
| Shell externo | `resources/js/layouts/PublicLayout.jsx` | Header + Footer + Chatbot |
| Shell interno | `resources/js/layouts/Layout1.jsx` | `min-h-screen bg-white dark:bg-gray-900` |
| Auth nuevo | `resources/js/components/auth/AuthShell.jsx` | Login/Register |
| Auth legacy | `resources/js/Layouts/GuestLayout.jsx` + `PrimaryButton` | Forgot/Reset/Confirm/Verify |

---

## 2. Tabla maestra de disparidades

| ID | Sev. | Familia | Descripción | Archivos clave | Cómo corregir |
|----|------|---------|-------------|----------------|---------------|
| **C1** | P2 | Tokens / Tailwind | `rounded-lg/md/sm` apuntan a `var(--radius)` pero `:root` no define `--radius` (solo `--s4-radius`). Componentes que usen el token de tema pueden quedar con radio 0. | `tailwind.config.js` L120–124; `resources/css/app.css` L32–46 | Añadir `--radius: 0.75rem` (o alias a `--s4-radius-compact`) en `:root`, o cambiar `borderRadius` a valores fijos/rem. |
| **C2** | P1 | Tokens | Clases `surf-primary`, `surf-secondary`, `surf-sand` **usadas pero no definidas** en Tailwind. `ocean-*`, `softdark-*`, `font-editorial`, `text-scale-*` están definidos pero **sin uso** en páginas/componentes públicos. | `resources/js/components/Titulo.jsx` L5–15; `resources/js/Pages/Admin/Bookings/Index.jsx` L24,280,485; `tailwind.config.js` L25–36,98–109 | Eliminar `surf-*` o mapearlos a `s4`/`brand`. Deprecar tokens muertos o documentar cuáles son canónicos (`s4` > `brand` > `ocean`). |
| **C3** | P0 | Tema / routing | Páginas en `lightModePages` con shell oscuro hardcodeado → `body` blanco + contenido navy (flash/blanco entre secciones). | `app.jsx` L43–60; `Academy/Index.jsx` L314; `Rentals/Surfboards/Index.jsx` L221; `Rentals/Surfboards/Show.jsx` L41; `Nosotros.jsx` L454 | **Resuelto 2026-08-26:** Academy fuera de `lightModePages`; Rentals + Nosotros migrados a light/híbrido. |
| **C4** | P0 | Shell | Doble envoltorio `PublicLayout` + `Layout1` en ~20 páginas públicas/cliente. Cuatro+ tonos navy distintos en scroll vertical (`#0a2233`, `#0a2a33`, `#0a2230`, `#241405`, `#1a0f2e`, `#070b14`, `slate-950`). | `PublicLayout.jsx`; `Layout1.jsx`; servicios/taquillas/auctions (grep hex en Pages) | Un solo wrapper de página (`PageShell` light/dark). Sustituir hex sueltos por `--s4-deep` + variantes semánticas (`surface-dark`, `surface-dark-warm`). |
| **C5** | P0 | Inputs | Regla global `@apply bg-gray-900` en todos los inputs/select/textarea ganaba a utilidades Tailwind en páginas claras. | `app.css` L156–160 | **Resuelto 2026-08-26:** `@layer base` con scope `html:not(.dark)` / `html.dark`; `.input-focus-ring` → cyan S4; `TextInput.jsx` sin hardcode dark. |
| **C6** | P1 | CTA | Al menos 6 familias de botón primario: `.s4-btn` / `S4Button`, `.btn-primary`, gradientes pill por servicio, `AuthSubmitButton`, `PrimaryButton` azul legacy, CTAs ad-hoc (`cyan-600`, `emerald-500`, `brand-action`). | `S4Button.jsx`; `app.css` L163–206; `Servicios_*.jsx`; `Carrito.jsx` L414–418; `AuthShell.jsx` L36–44; `primary_button.css` | Un componente `S4Button` + variantes (`primary`, `secondary`, `onMedia`, `accent-{servicio}` opcional). Prohibir gradientes inline en páginas. |
| **C7** | P0 | Auth | Login/Register (`AuthShell`, ES, cyan/teal) vs 4 páginas Breeze (`GuestLayout`, `PrimaryButton`, EN, azul `#3b82f6`). | `Auth/Login.jsx`, `Register.jsx`; `ForgotPassword.jsx`, `ResetPassword.jsx`, `ConfirmPassword.jsx`, `VerifyEmail.jsx`; `GuestLayout.jsx`; `primary_button.css` | Migrar las 4 restantes a `AuthShell` + copy ES. Retirar `GuestLayout` público. |
| **C8** | P1 | z-index | Header `z-[500]` por debajo de overlays webcam `z-[520]`/`z-[530]` → nav puede quedar visible sobre/modificar stacking del overlay. | `Header.jsx` L6; `SurfFullForecastOverlay.jsx` L239,254; `SurfDetailedForecastSlider.jsx` L305 | Subir header a `z-[540]` en rutas con overlay **o** bajar overlays y usar escala central (`tailwind.config.js` zIndex) por encima de header (70→500 actual inconsistente con config). |
| **C9** | P1 | Tienda | Misma familia con cards, precios y CTAs distintos: `Producto`/`formatEur`+`text-s4`, carrito `formatCartEur` local + `cyan-600`, confirmación legacy teal sin formateador. | `Producto.jsx` L231–268; `ProductPurchaseCta.jsx`; `Carrito.jsx` L21–27,414–418; `PedidoConfirmacion.jsx` L8–22; `Pedido.jsx` / `Pedidos.jsx` | Pipeline tienda unificado: `formatEur`, `S4Button`, cards `rounded-2xl ring-1 ring-slate-200`. Rehacer `PedidoConfirmacion` al patrón `Pedido.jsx`. |
| **C10** | P1 | Tipografía | `font-heading` en h1 solo en home, PDP, academy, webcams y bloques puntuales; hub servicios, nosotros, tienda, pedidos sin `font-heading`. | grep `h1` en Pages | Regla: todo `h1` público lleva `font-heading`. |
| **C11** | P1 | Área cliente | Perfil/edit/facturas en claro (`bg-slate-50`, cards blancas) vs dashboard reservas/perfil antiguo y bonos en oscuro (`slate-950`, `gray-900`). | `Edit.jsx` L25; `Payments/MyInvoices.jsx` L86; `User/Dashboard/MyProfile.jsx` L8; `MyReservations.jsx` L420; `Client/Bonos/Index.jsx` L237+ | Definir “cliente claro” o “cliente oscuro” y migrar todas las rutas `/user/*`, `/client/*`, `/payments/*`. |
| **C12** | P1 | Pagos | Post-pago: `Success` y `FiscalInvoice` oscuro glass; `MyInvoices` claro — misma familia visual rota. | `Payments/Success.jsx` L30; `FiscalInvoice.jsx` L18; `MyInvoices.jsx` L86 | Una plantilla `PaymentStatusShell` (light o dark según decisión C11). |
| **C13** | P2 | Componentes | `Titulo.jsx` huérfano (no importado en ninguna página) con tokens rotos `surf-*`. | `resources/js/components/Titulo.jsx` | Eliminar o conectar; si se usa, tokens `s4`. |
| **C14** | P2 | Tokens duplicados | `brand-action` / `brand-accent` vs `s4` / `s4-cyan` en flujos distintos (p. ej. asignar taquilla). | `AsignarTaquilla.jsx` L28–44 | Consolidar en palette `s4` documentada. |
| **C15** | P2 | Servicios | CTA con gradiente único por vertical (cyan, orange, violet, pink…) — coherente como acento de categoría pero incompatible con sistema unificado si no se formaliza. | Todos `Servicios_*.jsx` | Opción A: formalizar `S4Button variant="accent"` + mapa por servicio. Opción B: un solo gradiente S4 en hub y pills de color solo en badges. |
| **C16** | P1 | Alquiler | En `lightModePages` pero sin `Layout1`; fondo `bg-black`/`slate-950` e inputs estilo dark embebidos en constantes. | `Rentals/Surfboards/Index.jsx` L45–46, L221 | **Resuelto 2026-08-26:** catálogo + ficha + reserva en light (`SurfboardPublicDetail`, `SurfboardBookingSection.surfaceTone`). |
| **C17** | P2 | Focus inputs | Tres anillos de foco: global cyan (`app.css` L139–146), `focus:ring-blue-500` (`.input-focus-ring`), `focus:ring-brand-action` (`TextInput.jsx`), cyan Tailwind en tienda. | `app.css`; `TextInput.jsx` L24; `Tienda.jsx` L150 | Un token `focus-ring: ring-s4-cyan/20 border-s4-cyan`. |

### Verificación de hipótesis iniciales (usuario)

| # | Veredicto |
|---|-----------|
| 1 `--radius` sin definir | **Confirmado** (C1) |
| 2 Tokens surf/ocean/softdark muertos | **Parcial** (C2): `surf-*` usados sin existir; `ocean`/`softdark`/`font-editorial`/`text-scale-*` definidos pero no usados en UI pública |
| 3 Academy/Rentals en light pero oscuro | **Confirmado** (C3); añadido **Nosotros** mismo patrón |
| 4 Doble shell + navies | **Confirmado** (C4) |
| 5 Inputs globales dark | **Confirmado** (C5) |
| 6 CTA compra 5+ estilos | **Confirmado** (C6, C9) |
| 7 Auth partido | **Confirmado** (C7) |
| 8 z-index header vs webcam | **Confirmado** (C8) |
| 9 Cards/precios tienda | **Confirmado** (C9) |

---

## 3. Notas por página / familia

### Leyenda tema
- **Light routing:** en `lightModePages` → `html` sin clase `dark`.
- **Dark routing:** fuera de la lista → `html.dark`, body `#030712`.

### Home y institucional

| Página | Tema real | Hero | Tarjetas | CTA | Inputs | Precios | h1 |
|--------|-----------|------|----------|-----|--------|---------|-----|
| `Pag_principal.jsx` | Light routing; hero oscuro a sangre | Full-viewport imagen + overlay slate | Secciones claras; carrusel `Contenedor_productos` | `S4Button` primary/onMedia | N/A | `Producto` → `formatEur` | `font-heading` |
| `Nosotros.jsx` | **Conflicto C3:** light routing + `bg-slate-950` | Oscuro full-page | Glass `rounded-3xl border-white/10` | Mix links + modales | Globales dark si hay form | N/A | Sin `font-heading` |
| `Contacto.jsx` | Light coherente | Gradiente claro | Panel contacto claro | Canales / WhatsApp | Riesgo C5 en forms | N/A | `sr-only` |

### Tienda / pedidos (familia compra)

| Página | Tema | Tarjetas | CTA | Precios | Notas |
|--------|------|----------|-----|---------|-------|
| `Tienda.jsx` | Light + `s4-surface-light` | Filtros `rounded-full` / chips cyan | Link `rounded-xl` borde | Grid vía `Producto.jsx` | Referencia más sana de la familia |
| `ProductoVer.jsx` | Light + Layout1 | Galería + sticky bar | `S4Button` lg | `text-s4` + `formatEur` vía hijos | h1 con `font-heading` |
| `Carrito.jsx` | Light | `rounded-2xl ring-1 ring-slate-200` | **Pagar:** `bg-cyan-600 rounded-xl` (no S4) | `formatCartEur` local | Empty state con banda oscura inside card |
| `Pedido.jsx` / `Pedidos.jsx` | Light | Cards blancas consistentes | Links slate | `formatEur` `@/utils/money` | h1 sin `font-heading` |
| `PedidoConfirmacion.jsx` | Light | Legacy `shadow-lg`, tabla `bg-teal-600` | N/A | Raw `{precio} €` | **Outlier** — pre-rediseño |
| `Productos.jsx` | Light | Similar tienda | — | `Producto` | — |

### Servicios (familia marketing oscura)

| Página | Navy mid | Hero h1 | CTA | Layout1 |
|--------|----------|---------|-----|---------|
| `Servicios.jsx` | `#0a2233` | 4xl extrabold | Gradiente cyan→emerald pill | No |
| `Servicios_ClasesDeSurf.jsx` | `#0a2a33` | idem + bloques `font-heading` | Múltiples gradientes | No |
| `Servicios_SurfSkate.jsx` / `SurfskateGuia.jsx` | `#241405` | idem | Orange/amber pills | No |
| `Servicios_ReparacionNeoprenos.jsx` | `#1a0f2e` | idem | Violet/fuchsia | No |
| `Servicios_SurfTrips.jsx` | `#0a2233` | idem | Teal/cyan | No |
| `Servicios_Videograbaciones.jsx` | `#0a2a33` | idem | Pink/amber | No |
| `Servicios_Fotos.jsx` | (oscuro estándar) | idem | — | No; `formatPrice` local |
| `Servicios_Webcams.jsx` | slate-950 | **`font-heading`** | Links | No; overlays C8 |

Patrón común: `min-h-screen bg-gradient-to-b from-slate-950 via-[hex] to-slate-950`, tarjetas glass `border-white/10`, CTAs pill gradiente por vertical.

### Taquillas

| Página | Tema | Notas |
|--------|------|-------|
| `PlanesTaquillasPublic.jsx` | Dark `#0a2233` | Precios `text-emerald-300` + `formatEur` |
| `PlanesTaquillasClient.jsx` | Dark `#0a2a33` | Tablas + Stripe; sin Layout1 |
| `AsignarTaquilla.jsx` | Dark + Layout1 | CTAs `brand-action` (C14) |

### Academia / alquiler / subastas / 2ª mano

| Página | Tema routing | Shell real | Notas |
|--------|--------------|------------|-------|
| `Academy/Index.jsx` | **Light** | `bg-slate-950` + Layout1 | Cards gradient S4; inputs en modales |
| `Rentals/Surfboards/Index.jsx` | **Light** | `bg-black`, sin Layout1 | Constantes input dark L45–46 |
| `Rentals/Surfboards/Show.jsx` | **Light** | Gradiente slate-950 | Breadcrumbs custom |
| `Auctions/Index.jsx` | Dark | Layout1 + `#070b14` | Cards glass naranja; `Intl` propio |
| `Auctions/Show.jsx` | Dark | Layout1 | Puja — revisar CTA vs index |
| `SecondHand/Index.jsx` | Dark | Layout1; contenido asume dark | Inputs `bg-white/5`; h1 blanco sin page bg explícito |
| `SecondHand/Show.jsx` | Dark | Layout1 | Precios `formatEurFromCents` coherente |

### Taller

| Página | Tema | Notas |
|--------|------|-------|
| `Taller/Index.jsx` | Light | Cards blancas, acento `#0f5f74` en título |
| `Taller/Show.jsx` | Light | Detalle coherente con index |

### Auth

| Página | Shell | Idioma | Botón |
|--------|-------|--------|-------|
| `Login`, `Register` | AuthShell | ES | Gradiente cyan-teal |
| `ForgotPassword`, `ResetPassword`, `ConfirmPassword`, `VerifyEmail` | GuestLayout | EN | PrimaryButton azul |

### Área cliente

| Página | Tema | Notas |
|--------|------|-------|
| `Edit.jsx` | Light (`slate-50`) | Sin Layout1; forms partials Breeze |
| `User/Dashboard/MyProfile.jsx` | Dark navy | Links amber/teal |
| `User/Dashboard/MyReservations.jsx` | Dark / condicional | `formatEurEs` local |
| `Client/Bonos/Index.jsx` | Dark (`gray-200` text) | Botones `bg-sky-600`; precios `.toFixed(2) €` |
| `Payments/MyInvoices.jsx` | Light | Patrón cards blancas — buena referencia cliente claro |
| `Payments/Success.jsx` | Dark glass | CTA emerald |
| `Payments/FiscalInvoice.jsx` | Dark | CTA emerald |
| `Profile/MeQuedeSinLlave.jsx` | Dark + Layout1 | Flujo emergencia |
| `AutoCoach/Index.jsx` | Dark `#0a2230` | Sin Layout1; flujo largo |

---

## 4. Lo que YA es coherente (no tocar sin motivo)

1. **Tokens S4 canónicos** en CSS (`--s4-teal`, `--s4-cyan`, `.s4-btn*`, `.s4-surface-light/dark`) — base sólida para unificación.
2. **`S4Button` + `ProductPurchaseCta`** en PDP — patrón correcto para CTAs de tienda.
3. **Familia tienda clara** (`Tienda`, `Producto`, `ProductoVer`, `Pedido`, `Pedidos`) — cards `rounded-2xl`, anillos slate, precios `formatEur` / `text-s4` (excepto confirmación y carrito checkout).
4. **`Payments/MyInvoices`** — listado cliente claro consistente internamente.
5. **`Taller/Index` + `Show`** — light mode alineado con routing.
6. **`Contacto`** — gradiente claro simple.
7. **Hub servicios** — estructura repetible (eyebrow cyan, hero, grid glass) aunque colores mid/CTA varíen.
8. **`AuthShell`** (Login/Register) — referencia para migrar resto auth.
9. **Header/Footer únicos** vía `PublicLayout` — no duplicar navegación.
10. **Precios subastas/2ª mano** — `formatEurFromCents` / Intl centralizado en esas rutas.

---

## 5. Propuesta de unificación priorizada

| Prioridad | Ítem | Esfuerzo | Acción |
|-----------|------|----------|--------|
| 1 | **C3** — Alinear `lightModePages` con tema real (Academy, Rentals, Nosotros) | S | Editar lista en `app.jsx` o quitar overrides oscuros en esas 4 rutas |
| 2 | **C5** — Scope inputs globales a `html.dark` | S | 3–5 líneas en `app.css` |
| 3 | **C7** — Migrar 4 páginas auth a `AuthShell` | M | Copiar patrón Login; ES |
| 4 | **C9** — Unificar checkout tienda (`Carrito` CTA + `PedidoConfirmacion`) | M | `S4Button` + `formatEur` + layout tipo `Pedido` |
| 5 | **C6** — Deprecar `.btn-primary` y gradientes inline en CTAs primarios | M | Buscar/reemplazar → `S4Button` |
| 6 | **C4** — Introducir `PageShell` y retirar Layout1 progresivo | L | Nuevo layout + migración ~20 páginas |
| 7 | **C11/C12** — Decisión tema área cliente + plantilla pagos | M | Producto: una variante light |
| 8 | **C8** — Escala z-index documentada y header ≥ overlays | S | Ajuste numérico + test webcams |
| 9 | **C1/C2/C13** — Limpieza tokens | S | `--radius`, borrar `surf-*` / Titulo |
| 10 | **C10/C15** — Tipografía h1 + acentos servicio formalizados | S | Guía en CSS |

**Quick wins (S, ≤1 sesión):** C3, C5, C8, C1.  
**Impacto visible (M):** C7, C9, C6.  
**Refactor estructural (L):** C4.

---

## 6. Registro de ejecución

| ID | Estado | Fecha | Agente | Notas |
|----|--------|-------|--------|-------|
| C1 | ☑ Hecho | 2026-08-26 | Cursor | --radius 0.5rem en :root |
| C2 | ☑ Hecho | 2026-08-26 | Cursor | surf-* → s4 en Admin/Bookings |
| C3 | ☑ Hecho | 2026-08-26 | Cursor | Academy fuera de lightModePages; Rentals/Nosotros light |
| C4 | ☑ Hecho | 2026-08-26 | Cursor | `PageShell` (variants light/dark/night/teal/royal/warm/coach/slate); Layout1 eliminado; AdminPageShell migrado |
| C5 | ☑ Hecho | 2026-08-26 | Cursor | @layer base light/dark + TextInput |
| C6 | ☑ Hecho | 2026-08-26 | Cursor | S4Button en tienda+servicios; variant accent; legacy btn eliminado |
| C15 | ☑ Hecho | 2026-08-26 | Cursor | Acento por vertical vía constantes + S4Button variant accent |
| C7 | ☑ Hecho | 2026-08-26 | Cursor | 4 auth Breeze → AuthShell ES; GuestLayout/PrimaryButton eliminados |
| C8 | ☑ Hecho | 2026-08-26 | Cursor | z-header 500 / overlay 540-550 / modal 800; overlays webcam |
| C9 | ☑ Hecho | 2026-08-26 | Cursor | Carrito formatEur + S4Button; PedidoConfirmacion eliminado |
| C10 | ☑ Hecho | 2026-08-26 | Cursor | font-heading en h1 públicos (servicios, tienda, pedidos, nosotros, subastas…) |
| C11 | ☑ Hecho | 2026-08-26 | Cursor | Área cliente clara: MyProfile, VipProfileDashboard, MyReservations (alumno), Bonos, PlanesTaquillasClient, Edit |
| C12 | ☑ Hecho | 2026-08-26 | Cursor | Pagos coherentes en claro: Success, FiscalInvoice, MyInvoices; link taquilla `/taquilla/planes` |
| C13 | ☑ Hecho | 2026-08-26 | Cursor | Titulo.jsx eliminado (huérfano) |
| C14 | ☑ Hecho | 2026-08-26 | Cursor | `brand-action`/`accent`→`s4-cyan`; eliminados `ocean`, `softdark`, `text-scale-*`, `font-editorial`; `brand-deep`/`primary` intactos |
| C16 | ☑ Hecho | 2026-08-26 | Cursor | SurfboardPublicDetail + booking + tariff matrix light |
| C17 | ☑ Hecho | 2026-08-26 | Cursor | Focus `s4-cyan` unificado (fase 1 público + C17-B barrido admin); queda deuda menor `cyan-400` focus (hex distinto) |

---

*Documento generado sin modificar código de aplicación. Implementación → Cursor; validación visual → Reasonix/marketing.*
