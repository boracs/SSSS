# Prompt C4 — PageShell único + retirar Layout1 (para pegar en Cursor)

> Generado por Reasonix (DeepSeek) 2026-08-26 · Verificado contra el código real.
> Auditoría: `AUDITORIA-COHERENCIA-DISENO.md` ítem C4 · Estado al entregar: C1-C3, C5-C17 HECHO (falta C4).

---

## Tarea: C4 — PageShell único + retirar Layout1 (refactor estructural L)

**Prioridad:** P0 (último pendiente de `AUDITORIA-COHERENCIA-DISENO.md` C4)
**Pre-vuelo obligatorio:** leer `docs/taller-prompts/COORDINACION.md` → reclamar `EN CURSO` (tarea: C4 — PageShell). Verifica cada `file:line` citado antes de tocar. No pisar trabajo ajeno.

### Problema (verificado en código)
- Doble envoltorio en ~31 páginas públicas + catálogo admin: `app.jsx:72-77` asigna `PublicLayout` (Header+Footer+Chatbot) por defecto, y las páginas además envuelven en `Layout1` (`resources/js/Layouts/Layout1.jsx` = `min-h-screen bg-white dark:bg-gray-900` + `<main>`) → **dos `<main>` anidados** y 4+ tonos navy distintos en scroll vertical.
- El fondo real lo pinta cada página con hex sueltos: `#070b14` (Auctions/Index:192, Show:174,436), `#0a2233` (PlanesTaquillasPublic:113, Servicios:132), `#0a2a33` (Servicios_ClasesDeSurf:586, Servicios_Videograbaciones:82), `#1a0f2e` (Servicios_ReparacionNeoprenos:138), `#241405` (Servicios_SurfSkate:144, Servicios_SurfskateGuia:241), `slate-950` (Academy/Index:314, AdminPageShell:26).
- `AdminPageShell.jsx:24` depende de `Layout1` (catálogo admin: Auctions, SecondHand, Chatbot, EmergencyKeys, Datafono, Taquillas/Vigencia + Bonos/Photos/Esquema/PlanesTaquillasAdmin).

### Decisiones de producto (CONFIRMADAS — no reabrir)
- **Un solo shell**: `PageShell` nuevo (variantes por tema) reemplaza el div-fondo de cada página **y** a Layout1. El `lightModePages` de `app.jsx` **NO se toca** (ya alineado por C3/C11/C12) — PageShell solo pinta el fondo; el toggle `html.dark` sigue mandando.
- **Los degradados por vertical se CONSERVAN** (decisión C15: acento por vertical). Los navys cálidos/fríos son intencionales → se convierten en **tokens semánticos**, no se eliminan.
- Admin sigue oscuro (C3). Auth (AuthShell, C7) queda fuera. **Academy oscura se mantiene** (verificado: `/academia` es pública, `routes/web.php:305`; es página de marketing tipo Servicios).

### Fase 1 — Tokens de superficie (sin tocar nada más)
En `tailwind.config.js` (bloque `s4`, ~L74) y `:root` de `resources/css/app.css:36-44`, añadir tokens exactos (los hex actuales de las páginas, sin alterarlos):

| Token | Hex | Uso actual |
|---|---|---|
| `s4.surface-dark` | `#0a2233` | Servicios, PlanesTaquillasPublic |
| `s4.surface-dark-night` | `#070b14` | Auctions |
| `s4.surface-dark-teal` | `#0a2a33` | ClasesDeSurf, Videograbaciones |
| `s4.surface-dark-royal` | `#1a0f2e` | ReparacionNeoprenos |
| `s4.surface-dark-warm` | `#241405` | SurfSkate, SurfskateGuia |
| `s4.surface-light` | `#f8fafc` | (ya existe como `s4.surface`) |

- NO eliminar `s4.deep` (#0a1f2e) ni `brand-deep/primary` (#0d234d) — se usan en otros sitios.

### Fase 2 — Crear `resources/js/Layouts/PageShell.jsx`
- Props: `variant` (`"light" | "dark" | "night" | "teal" | "royal" | "warm"`), `withGradient` (boolean → `bg-gradient-to-b from-slate-950 via-<variant> to-slate-950`, para las páginas que hoy lo tienen), `className`, `children`.
- Estructura: **un solo `<div>`** con `min-h-screen` + fondo según variant + `overflow-x-clip` + `className` extra. **NO renderizar `<main>`** (ya lo pone `PublicLayout`).
- Regla de tema: variant `light` = fondo claro fijo (`bg-slate-50` o el gradiente que tenía la página — las páginas light de `lightModePages` son claras en ambos temas). Las variants dark usan su token.

### Fase 3 — Migración por lotes (un lote = build + ojo humano)
**Lote A — fondos planos dark (sin gradiente):**
`Academy/Index.jsx:312-314` (bg-slate-950) · `Auctions/Index.jsx:192` (#070b14) · `Auctions/Show.jsx:436` (#070b14) · `SecondHand/Index.jsx:198` y `Show.jsx` (fondo oscuro actual) · `AsignarTaquilla.jsx` · `AutoCoach/Index.jsx:1155` (tiene gradiente `from-slate-950 via-[#0a2230] to-slate-950` → variant `dark` + withGradient, conservando su via exacto `#0a2230`; si no encaja en los tokens, añadir `surface-dark-coach` #0a2230) → sustituir el div-fondo por `<PageShell variant="…" withGradient>…</PageShell>` y **eliminar el import + envoltura `Layout1`** de cada una.

**Lote B — gradientes por vertical:**
`Servicios.jsx:132` · `Servicios_ClasesDeSurf.jsx:586` · `Servicios_ReparacionNeoprenos.jsx:138` · `Servicios_SurfSkate.jsx:144` · `Servicios_SurfskateGuia.jsx:241` · `Servicios_Videograbaciones.jsx:82` · `PlanesTaquillasPublic.jsx:113` → `variant` + `withGradient` con su token (tabla Fase 1). El `via-[#0b1d33]` de PlanesTaquillasPublic:281 se mantiene como está (es una tarjeta, no superficie).

**Lote C — páginas light:**
`Carrito.jsx:200,204` (bg-slate-50) · `Contacto.jsx:12,14` (gradiente slate-100) · `Nosotros.jsx:450,453` (min-h-screen) · `Tienda.jsx:76` · `Pag_principal.jsx` · `Taller/Index.jsx` y `Show.jsx` · `Productos.jsx` · `ProductoVer.jsx` · `Pedido.jsx` · `Pedidos.jsx` · `GestorPedidos.jsx` · `CrearProducto.jsx` · `ProductoCreado.jsx` · `ProductoModificado.jsx` · `Profile/MeQuedeSinLlave.jsx` → `variant="light"` + conservar su className/gradiente exacto. **Verificar que cada una sigue en `lightModePages`** (`app.jsx:43-66`); si alguna no está, añadirla ahí (no al revés).

**Lote D — AdminPageShell (sin Layout1):**
Refactor `resources/js/components/admin/ui/AdminPageShell.jsx:24`: reemplazar `<Layout1>` interno por `<PageShell variant="night">` (o `dark` + className `bg-slate-950`), conservando blobs, tabs, breadcrumbs y cabecera **exactamente igual**. `Admin/Auctions/*`, `Admin/SecondHand/*`, `Admin/Chatbot/Index.jsx`, `Admin/EmergencyKeys/Index.jsx`, `Admin/Payments/Datafono/Index.jsx`, `Admin/Taquillas/Vigencia.jsx` dejan de importar Layout1 (quedan envueltos solo por PublicLayout/PageShell).

### Fase 4 — Retirar Layout1
- `grep -rln "Layout1" resources/js` → debe dar **0 resultados** (imports y envolturas eliminados en Fases 3A-D).
- Eliminar `resources/js/Layouts/Layout1.jsx`.
- Barrido final de hex sueltos: `grep -rn "#0a2233\|#0a2a33\|#0a2230\|#241405\|#1a0f2e\|#070b14" resources/js/Pages` → solo deben quedar usos justificados en tarjetas/secciones (como PlanesTaquillasPublic:281), nunca como fondo de página.

### Fase 5 — Verificación y cierre
- `npm run build` sin errores.
- Comprobación visual en navegador: 1 página por lote en **claro y oscuro** (Tienda light, Academy dark, Servicios dark cálido, Auctions night, una admin) + móvil.
- `grep -c "<main" resources/js/Layouts/PublicLayout.jsx` → 1 (único main).
- Marcar `C4` HECHO en `AUDITORIA-COHERENCIA-DISENO.md` y `COORDINACION.md`.

### NO hacer
- No tocar `lightModePages` salvo el caso Lote C verificado. No cambiar `PublicLayout.jsx` ni `Header/Footer`. No tocar AuthShell ni rutas auth (C7). No unificar los acentos de vertical (C15). No cambiar tamaños, radios ni espaciados — **solo estructura de envoltura y tokens de fondo**.
