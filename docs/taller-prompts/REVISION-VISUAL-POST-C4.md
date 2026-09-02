# Revisión visual post-C4 — checklist

> Sesión Cursor 2026-08-27 · Tras cerrar auditoría C1–C17.
> **Cómo usar:** navega cada URL, marca ✅/⚠️/❌ y anota en la columna Notas. Ctrl+Shift+R en cada página.

**Entorno:** `http://127.0.0.1:8000` + `npm run dev` (HMR). Móvil: DevTools → iPhone 14 o redimensionar 390px.

---

## Qué mirar en TODAS las páginas

| Check | OK si… |
|-------|--------|
| Fondo | Sin franja blanca/gris entre header y contenido; sin “doble scroll” |
| PageShell light | Una sola capa `s4-surface-light` (no duplicar en hijos) |
| Hero + claro | Home/Nosotros usan `transparent`; el hero pinta su propio fondo |
| Header/Footer | Siempre visibles; no tapados por modales (salvo overlay intencional) |
| Contraste | Texto legible; inputs visibles al focus (anillo cyan) |
| Móvil | Sin overflow horizontal; CTAs ≥44px táctil |

---

## Lote 1 — Light (PageShell `variant="light"`)

| # | URL | Qué validar | ✅/⚠️/❌ | Notas |
|---|-----|-------------|---------|-------|
| 1 | `/` | Hero oscuro + secciones claras debajo; sin banda blanca bajo header | | |
| 2 | `/tienda` | Fondo claro; filtro con focus cyan; cards producto | | |
| 3 | `/carrito` | Claro; totales formatEur; botones S4Button | | |
| 4 | `/contacto` | Gradiente claro; formulario + mapa | | |
| 5 | `/nosotros` | Hero oscuro local + secciones claras al scroll (dual intencional) | | |
| 6 | `/taller` | Listado claro | | |
| 7 | `/alquiler-tablas` | Catálogo light; filtros cyan | | |
| 8 | `/pedidos` | (logueado) Lista clara | | |

---

## Lote 2 — Dark por vertical (PageShell + gradiente)

| # | URL | Tono esperado | ✅/⚠️/❌ | Notas |
|---|-----|---------------|---------|-------|
| 9 | `/servicios` | Navy `#0a2233` (reparación Edy) | | |
| 10 | `/servicios/surf` | Teal `#0a2a33` | | |
| 11 | `/servicios/reparacion-neoprenos` | Royal `#1a0f2e` | | |
| 12 | `/servicios/surf-skate` | Warm `#241405` | | |
| 13 | `/servicios/videograbaciones` | Teal | | |
| 14 | `/servicios/taquillas` | Navy `#0a2233` | | |
| 15 | `/academia` | Slate-950 oscuro (marketing) | | |
| 16 | `/subastas` | Night `#070b14` | | |
| 17 | `/segunda-mano` | Oscuro + acento naranja | | |

---

## Lote 3 — Área cliente (C11/C12, claro)

| # | URL | Qué validar | ✅/⚠️/❌ | Notas |
|---|-----|-------------|---------|-------|
| 18 | `/mi-perfil` | s4-surface-light | | |
| 19 | `/mis-reservas` | Alumno claro; admin borde índigo si aplica | | |
| 20 | `/bonos` | Cards blancas; modal Stripe claro | | |
| 21 | `/mis-facturas` | Tabla legible en claro | | |
| 22 | `/pago/exito` | Post-pago claro; link taquilla | | |
| 23 | `/taquilla/planes` | Coherente con flujo post-pago | | |

---

## Lote 4 — Admin (PageShell slate / AdminPageShell)

| # | URL | Qué validar | ✅/⚠️/❌ | Notas |
|---|-----|-------------|---------|-------|
| 24 | `/admin/subastas` | Fondo oscuro; tabs catálogo | | |
| 25 | `/admin/taquillas/vigencia` | Inputs focus cyan | | |
| 26 | `/admin/segunda-mano/create` | Inputs cyan; textarea naranja | | |

---

## Lote 5 — Identidad preservada (NO deben ser cyan)

| # | URL | Esperado | ✅/⚠️/❌ | Notas |
|---|-----|----------|---------|-------|
| 27 | `/subastas` → input puja | Focus **naranja** | | |
| 28 | `/segunda-mano` → buscador | Focus **naranja** | | |
| 29 | `/login` | AuthShell oscuro; focus cyan | | |

---

## Lote 6 — Overlays (C8)

| # | Acción | Esperado | ✅/⚠️/❌ | Notas |
|---|--------|----------|---------|-------|
| 30 | `/servicios/webcams` → abrir overlay | Panel sobre header (z-index) | | |
| 31 | `/bonos` → modal pago | z-modal; no queda bajo header | | |

---

## Regresiones conocidas (no alarmar si se ven)

- **Nosotros:** hero oscuro dentro de PageShell light — diseño intencional (C3).
- **Admin 2ª mano:** inputs genéricos cyan, textarea descripción naranja — deuda menor.
- **Hex en tarjetas** (no fondo de página): PlanesTaquillasPublic sección CTA.

---

## Resultado sesión

| Métrica | Valor |
|---------|-------|
| Páginas revisadas | /31 |
| ❌ Bloqueantes | |
| ⚠️ Menores | |
| Acción siguiente | |

---

*Al cerrar: copiar filas ❌/⚠️ a `COORDINACION.md` Última actividad o abrir tarea nueva.*
