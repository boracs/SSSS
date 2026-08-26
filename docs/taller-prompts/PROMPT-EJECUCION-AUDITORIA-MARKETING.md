# Prompt — Ejecutar auditoría marketing ítem a ítem

Copia el bloque **PROMPT BASE** en un chat nuevo de Cursor (modo Agent). Sustituye `{ID}` por el hallazgo que quieras (ej. `A3`, `A5`).

---

## PROMPT BASE (pegar en Cursor)

```
Implementa UN SOLO ítem de la auditoría marketing S4.

## Ítem a ejecutar
**ID:** {ID}

## Pre-vuelo obligatorio (lee antes de tocar código)
1. `docs/taller-prompts/COORDINACION.md` — no pisar tareas EN CURSO
2. `docs/taller-prompts/AUDITORIA-MARKETING-WEB-2026-08-24.md` — busca el ID en la tabla maestra y en la sección por página
3. `.cursor/rules/seo-geo-public.mdc` si el ítem toca SEO/GEO
4. Archivos listados en la columna "Archivos clave" del ID

## Reglas de implementación
- Rol: lógica/implementación Laravel 12 + React 19 + Inertia
- Money en céntimos (int); SEO vía DTO readonly + PublicPageSeoService (nunca arrays crudos ni lógica SEO en JSX)
- Cambio mínimo: solo lo necesario para cerrar ESTE ID
- Si el ID requiere **decisión de negocio** (ej. A1 taquillas indexable vs noindex), **para y pregunta** con 2 opciones claras antes de codificar
- Tras implementar: `npm run build` si tocaste JSX
- Actualiza en `AUDITORIA-MARKETING-WEB-2026-08-24.md`: Estado del ID → HECHO + fila en "Registro de ejecución"
- Actualiza `docs/taller-prompts/COORDINACION.md`: fila EN CURSO al empezar, HECHO al cerrar

## Entregable
1. Qué hiciste (2–4 frases)
2. Archivos tocados
3. Cómo probarlo (URL + pasos)
4. Si quedó algo pendiente del mismo ID, dilo
```

---

## Variantes útiles

### Solo revisar / decidir (sin implementar)

```
Revisa el ítem **{ID}** de `docs/taller-prompts/AUDITORIA-MARKETING-WEB-2026-08-24.md`.
No implementes aún. Dame: (1) diagnóstico contra código actual, (2) opciones A/B con pros/contras, (3) tu recomendación y esfuerzo S/M/L.
```

### Implementar lote quick wins

```
Implementa en este orden (parar si A1 necesita mi decisión): A3 → A5 → A8.
Misma pre-vuelo y reglas que PROMPT BASE. Un commit lógico por ítem si pido commit después.
```

### Continuar sesión anterior

```
Sigo la auditoría marketing S4. Lee `AUDITORIA-MARKETING-WEB-2026-08-24.md` registro de ejecución y propón el siguiente ID pendiente por urgencia.
```

---

## Orden recomendado (para el dueño)

| Orden | ID | Por qué |
|-------|-----|---------|
| 1 | **A3** | Rápido, sin decisión negocio |
| 2 | **A5** | UX móvil tienda, impacto visible |
| 3 | **A8** | Tags clicables, bajo riesgo |
| 4 | **A1** | ⚠️ Preguntar: ¿indexar taquillas en Google? |
| 5 | **A4** | FAQ schema — piloto en `/servicios/surf` |
| 6 | **A2** | Mayor refactor visual |
| 7 | **A6** | Mapa footer/contacto |
| 8 | **A7** | Copy testimonios home |
| 9 | **A10** | Chatbot vs sticky |
| 10 | **A9** | Subastas (opcional) |

---

## Ejemplo relleno — A3 (revisado Reasonix + Cursor)

Prompt listo para pegar; incluye criterios de aceptación y patrón canónico del proyecto.

```
Implementa UN SOLO ítem de la auditoría marketing S4.

## Ítem a ejecutar
**ID:** A3 — Carrito sin meta noindex

## Contexto (verificado en repo)
- `Carrito.jsx` línea ~199: solo `<Head title="Carrito">`
- `PublicSitemapService`: `Disallow: /carrito` (redundancia defensiva: algunos crawlers ignoran robots.txt)
- Patrón noindex existente: auth pages usan `<meta name="robots" content="noindex, nofollow">`
- Patrón SEO canónico del proyecto: DTO + `PublicPageSeoService` + `SeoHead` (no meta suelta en JSX salvo auth legacy)

## Pre-vuelo obligatorio
1. `docs/taller-prompts/COORDINACION.md` — reclamar A3 EN CURSO
2. `docs/taller-prompts/AUDITORIA-MARKETING-WEB-2026-08-24.md` — fila A3
3. `.cursor/rules/seo-geo-public.mdc`
4. Leer: `PublicPageSeoService.php` (param `robots` en `make()`), `SeoHead.jsx`, `CarritoController.php`, `Carrito.jsx`

## Implementación esperada (criterios de aceptación)
1. Nuevo método `PublicPageSeoService::carrito()` con:
   - `title`: «Carrito | San Sebastian Surf School» (o similar)
   - `description`: breve, sin keyword stuffing
   - `robots`: `noindex, nofollow`
   - `path`: `/carrito`
   - Sin JSON-LD innecesario (página transaccional privada)
2. `CarritoController::index()` pasa prop `seo` en ambos returns (carrito vacío y con items)
3. `Carrito.jsx`: sustituir `<Head title>` por `<SeoHead seo={seo} />` (prop desde `usePage().props`)
4. Verificar en HTML: `<meta name="robots" content="noindex, nofollow">` presente
5. No tocar lógica de carrito, precios ni checkout

## Reglas
- Cambio mínimo; no refactorizar otros ítems (A5, A8…)
- Tras JSX: `npm run build`
- Marcar A3 HECHO en auditoría + COORDINACION

## Entregable
1. Qué hiciste (2–4 frases)
2. Archivos tocados
3. Cómo probar: `/carrito` autenticado → View Source → meta robots
4. Confirmar que title ya no es genérico de Inertia
```

### Nota para A4 (siguiente con patrón conocido)

Replicar pipeline webcams: `ZurriolaGeoFactsService::faqPageNodes()` + JSON en `resources/surf-guide/` (o JSON dedicado por servicio) → inyectar en `PublicPageSeoService` del controller de `/servicios/surf`.
