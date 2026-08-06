# Coordinación de trabajo — Reasonix (taller de prompts) ↔ Cursor

**Regla de oro: nadie toca nada sin analizar antes.** Antes de responder, proponer o editar archivos, leer: (1) este documento, (2) el estado real del código, (3) el mapa del proyecto. Así no se solapan, pisan ni rehacen cosas ya hechas.

## Cuándo se usa

- El trabajo sobre `maider_0` se reparte entre **esta sesión (taller de prompts)** y **Cursor**.
- Según el tipo de prompt y los archivos que toque, el usuario pedirá a uno u otro.
- Este documento es el **punto de encuentro**: qué hay en curso, qué está hecho y por quién. Los dos lo leemos antes de actuar.

## Pre-vuelo obligatorio (antes de tocar nada)

1. Leer este archivo (`docs/taller-prompts/COORDINACION.md`).
2. Leer la sección **Estado actual** y **Última actividad**: si la tarea ya está hecha o en curso por el otro, **no repetirla**.
3. Analizar los archivos reales antes de responder o proponer:
   - `docs/PROJECT_TREE_FOR_GEMINI.md` → rutas y dominios (no inventar directorios).
   - Los archivos concretos que la tarea implica → leerlos, no asumir.
   - Buscar Services/Actions/DTOs existentes antes de crear nuevos (reutilizar antes que crear).
4. Si la tarea va a tocar archivos y no está reclamada: reclamarla en **Estado actual** antes de empezar (quién + qué + cuándo).

## Cómo reclamar una tarea

Añadir/actualizar una fila en **Estado actual**:

```
| [fecha] | [tarea] | [Reasonix | Cursor] | EN CURSO | [archivos que tocará] |
```

## Cómo cerrar una tarea

1. Comprobar que no se pisó ninguna zona del otro (revisar **Última actividad**).
2. Marcar `EN CURSO` → `HECHO` en **Estado actual**.
3. Añadir una entrada en **Última actividad** (1-2 líneas: qué se hizo, por quién, resultado).
4. Si se crearon/renombraron/eliminaron archivos de app o recursos: actualizar `docs/PROJECT_TREE_FOR_GEMINI.md`.

## Zonas que NO se pisan sin avisar

| Zona | Por qué |
|---|---|
| `.cursorrules`, `.cursor/skills/*`, `.cursor/rules/*` | Configuración de Cursor; solo se edita si el usuario lo pide |
| `docs/ia/*` (protocolos) | Solo se actualizan si el propio protocolo lo exige |
| Services existentes (`app/Services/*`) | Se extienden, no se duplican |
| Código de la aplicación | Esta sesión no lo edita; solo genera/mejora prompts |

## Estado actual

| Fecha | Tarea | Quién | Estado | Archivos afectados |
|---|---|---|---|---|
| 2026-08-06 | Distinguir "sin plan" (nunca pagó) de "vencido" en vigencia | Cursor | HECHO | `TaquillaMembershipService.php`, `Vigencia.jsx` |
| 2026-08-06 | Fase 3 — labels estado pago admin (Pagado/Por revisar/No válido) | Cursor | HECHO | `resources/js/Pages/Admin/Taquillas/Vigencia.jsx` |
| 2026-08-06 | Demo sandbox recibo Stripe (sin API real) | Cursor | HECHO | `SandboxRandomDemoSeeder.php`, `public/demo/recibo-stripe-sandbox.html` |
| 2026-08-06 | Fase 1 — unificar recibos Stripe en historial admin taquilla | Cursor | HECHO | `TaquillaMembershipService.php`, `Vigencia.jsx` |
| 2026-08-06 | Auditoría Fase 0 — recibos/justificantes taquilla | Cursor | HECHO (solo lectura) | ninguno (auditoría) |
| 2026-08-06 | Fix semáforo rojo con días restantes positivos (vigencia) | Cursor | HECHO | `TaquillaMembershipService.php`, `Vigencia.jsx` |
| 2026-08-06 | Refinar UI admin Vigencia taquillas (color/densidad) | Cursor | HECHO | `resources/js/Pages/Admin/Taquillas/Vigencia.jsx` |

## Última actividad

- **2026-08-06** — Cursor: añadidos tests feature `tests/Feature/Taquilla/VigenciaPayloadTest.php` (7 casos: activo, vencido, activo por pago futuro, sin plan, pago pendiente/rechazado no cuenta, prepago tras vencido, exclusión sin taquilla). Suite completa: 142 passed. HECHO.
- **2026-08-06** — Cursor: `buildVigenciaPayload()` distingue ahora `estado: 'sin plan'` (socio con taquilla asignada pero cero pagos confirmados nunca) de `estado: 'vencido'` (tuvo cobertura y caducó). En `Vigencia.jsx`: `rowUrgency` trata ambos como urgentes (mismo rojo/borde), pero `daysLabel` ya muestra "Sin plan" en vez de "Vencido"; también se ajustó el mensaje de WhatsApp y el tooltip de aviso de baja para no decir "ha vencido el sin fecha" en estos casos. Verificado contra BD real: 6 socios afectados (ej. Cesar Dopico, taquilla #0), antes mal etiquetados como "Vencido". HECHO.
- **2026-08-06** — Cursor: Fase 3 — `paymentStatusLabel` en `Vigencia.jsx` (admin) ahora dice "Pagado / Por revisar / No válido" en vez de "Confirmado / Pendiente / Rechazado"; `paymentMethodLabel` simplificado para no duplicar/contradecir el estado (siempre muestra el método real, no un status). Cliente (`PlanesTaquillasClient.jsx`) no se toca: ya usa etiquetas contextuales propias (En vigor/Preparado/Finalizado). HECHO.
- **2026-08-06** — Cursor: añadido pago demo (tarjeta) + `PaymentReceipt` simulado en `SandboxRandomDemoSeeder` para el cliente #4 (`$clients[3]`), con `receipt_url` apuntando a página estática `public/demo/recibo-stripe-sandbox.html`. Permite probar "Ver recibo" (abre en pestaña nueva) sin credenciales reales de Stripe. Requiere re-ejecutar `php artisan db:seed --class=SandboxRandomDemoSeeder`. HECHO.
- **2026-08-06** — Cursor: Fase 1 recibos taquilla — `userPaymentHistory()` ahora mezcla recibo Stripe (`PaymentReceiptAccessService`) + justificante manual, igual que `buildClientIndex()`. En `Vigencia.jsx` (admin), "Ver recibo/Ver" abre el recibo Stripe en pestaña nueva (bloquea iframe por `X-Frame-Options`) y el justificante manual sigue en el modal embebido. HECHO.
- **2026-08-06** — Cursor: auditoría Fase 0 de recibos/justificantes de taquilla (sin cambios de código). Gap encontrado: `TaquillaMembershipService::userPaymentHistory()` (usado por admin en `Vigencia.jsx`) no mezcla recibos Stripe vía `PaymentReceiptAccessService`, a diferencia de `buildClientIndex()` y `enrichRegistryRowsWithReceipts()` que sí lo hacen. Propuesta: Fase 1 = unificar ese método. Ver informe completo en el chat.
- **2026-08-06** — Cursor: fix vigencia — no pintar rojo si `dias_restantes > 0`; backend ya no marca `vencido` cuando el fin del periodo (o prepago futuro) sigue vigente. HECHO.
- **2026-08-06** — Cursor: refinamiento UI `Vigencia.jsx` (semáforo solo en urgentes, barras suaves, WhatsApp outline, densidad py-2, badges muted). HECHO.
- **2026-08-04** — Reasonix: creado `docs/COMPETENCIA_SEO_DONOSTIA.md` (análisis competitivo de escuelas de surf de Donostia + oportunidades SEO + pendientes: análisis de keywords de la competencia y plan de rebrand/SEO). No toca código de la app. PENDIENTE para el dueño (recordatorio a 3 días: 2026-08-07).
- **2026-06-18** — Reasonix: creada infraestructura del taller de prompts (`docs/taller-prompts/PROTOCOLO.md`, `REGISTRO.md`, `COORDINACION.md`) y actualizado `docs/PROJECT_TREE_FOR_GEMINI.md`. HECHO.
- **2026-08-03** — Reasonix: configurado túnel Cloudflare (named + quick), creado túnel `masquesurf` con credenciales en `~/.cloudflared/`, config.yml apuntando a `sansebastiansurfschool.eu`, CNAME enrutado, nameservers cambiados en DonDominio (pendiente propagación DNS). Revertido a modo desarrollo normal. HECHO.
