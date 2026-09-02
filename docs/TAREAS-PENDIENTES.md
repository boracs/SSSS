# Tareas pendientes — maider_0

> Lista **personal** del dueño: cosas incompletas, remates o ideas a no olvidar.
> No sustituye `docs/taller-prompts/COORDINACION.md` (pizarrón Cursor ↔ Reasonix).
> Este archivo = backlog tuyo; COORDINACION = qué está haciendo cada IA ahora.

## Flujo (tú ↔ Cursor / Reasonix)

| Tú dices… | El agente hace… |
|-----------|-----------------|
| **«la 1ª tarea» / «prioridad 1» / «sigo con la 1»** | **Siempre la primera fila 🔴 P1 de Abiertas.** Empieza diciendo que hay **dos chats relacionados** (nombres abajo). No inventar otra prioridad. |
| «añade a pendientes: …» / «esto está incompleto: …» | Añade una fila abajo (fecha + texto + opcional zona/archivo) |
| «¿qué hay en la lista?» / «muestra pendientes» | Lee este archivo y te resume lo abierto |
| «quítalo de la lista» / «ya terminé: …» | Marca o borra esa fila (si no queda claro cuál, pregunta) |
| «limpia hechos» | Quita las que estén hechas si quedó alguna tachada |

## Reglas cortas

1. Preferir **frases concretas** (qué falta + dónde), no ensayos.
2. Si al cerrar una tarea tocáis código, el agente puede apuntar 1 línea en COORDINACION solo si era trabajo de IA reclamado allí.
3. No meter secretos (`.env`, claves, tokens).

---

## Abiertas

> **Al pedir «la 1ª tarea» / «prioridad 1»:** L5 (L5a+L5b) ya está **HECHO** (2026-08-31, 435 tests). Siguiente P1 de código de Fase 2: no hay lote L6; quedan urgentes SMTP/alerta y la prueba manual N4 en panel. Decisiones timezone/UNIQUE ya cerradas.
>
> Chats relacionados Fase 2: Cursor «auditoria fase 2 back» + Reasonix «Fase 2 — dinero Stripe».

| Fecha | Tarea | Notas / archivos |
|-------|-------|------------------|
| 2026-08-27 | **FASE 2 · decisiones del dueño** — (1) prod `Europe/Madrid` ✅ · (2) UNIQUE taquilla = columna generada anulando 0/500/600 ✅ · (3) refund N2 L1 ✅ · (4) créditos VIP borradas = perdidos ✅ | **L5 CERRADO 2026-08-31 (435 tests, L5a+L5b).** S5 reserved sitemap sigue P3 documental. Maestro: `docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md` §8/§9 · Chats: Cursor «auditoria fase 2 back» + Reasonix «Fase 2 — dinero Stripe» |
| 2026-08-27 | **🔴 P1 — FASE 2 · verificación manual en panel (cierre N4-remate; no bloquea L1)** — probar Ex-socios → Dar de alta → pagar un plan → el periodo sale de HOY | Código ya hecho (`resolvePeriodoInicio` + `TaquillaAltaBajaPeriodoTest`). Falta la prueba en el panel. **Mismos 2 chats:** Cursor «auditoria fase 2 back» + Reasonix «Fase 2 — dinero Stripe» |
| 2026-08-27 | **FASE 2 backend auditada + verificada por Reasonix (0 P0 · 14 P1 · ~25 P2)** — pendiente: verificación Cursor + Grok + Opus, luego implementar por lotes | Maestro: `docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md` (veredictos Reasonix en §6) · Prompt de verificación: `PROMPT-VERIFICACION-FASE2.md` · P1: A1-A3 (refund academia), T1-T3 (taquillas), P1-P3 (fotos TZ + carrera webhook + overbooking), S1-S2 (SEO), C1-C2 (chatbot), R1 (N+1 Commander) · Decisiones de producto: A8 (justificante academia: implementar o borrar de docs), S6 (`/academia` indexar o no), P5 (estado `attended` fotos) |
| 2026-08-24 | Backlog auditoría marketing web (A1–A10) — ejecutar uno a uno | Maestro: `docs/taller-prompts/AUDITORIA-MARKETING-WEB-2026-08-24.md` · Prompt: `PROMPT-EJECUCION-AUDITORIA-MARKETING.md` · Orden sugerido: A3 → A5 → A8 → A1 (decisión) → A4 → A2 → … |
| 2026-08-24 | Handshake marketing ↔ SEO/GEO (M1–M10): **parte Reasonix HECHA** (MD, SKILL.md, router, MASTER §3) · pendiente **Cursor**: diff `seo-geo-public.mdc` (quitar "Taquillas," de noindex) | Revisión conversión §5.1 HECHA (home 8.6 · surf 8.9 · contacto 8.3). Quick wins pendientes de ejecutar: **S1 hero surf (P0, ya en HANDOFF)**, S2 CTA cierre surf, C1 home copy, C1 contacto WhatsApp… |
| 2026-08-26 | Auditoría coherencia diseño público (C1–C17, nota 6,3/10) — ejecutar pendientes: C1, C2, C4, C6, C7, C8, C9, C10, C11, C12, C13, C14, C15, C17 | Doc: `docs/taller-prompts/AUDITORIA-COHERENCIA-DISENO.md` §6 (C3/C5/C16 HECHOS 2026-08-26) · HANDOFF con P0 hero surf (AP-8) · Implementa Cursor, UI-only (R6) |
| 2026-08-27 | **URGENTE (post-Fase 1):** canal de alerta real para `payment_webhook_permanent_failure` — hoy solo `Log::critical` en `PaymentWebhookController` (marca `ALERT_PERMANENT_FAILURE`); decidir email (reutiliza Mailables existentes) o notificación en panel admin | F5 auditoría backend (verificado 2026-08-27). La marca ya es estable: enganchar el canal no toca la lógica |
| 2026-08-27 | **URGENTE (post-Fase 1):** comprobación manual F4 — cerrar un ticket de mostrador con producto con descuento (>0) → debe cobrar sin el 422 «Importe línea ≠ catálogo» | Fix F4 aplicado y tests verdes; falta la prueba manual en el mostrador real |
| 2026-08-27 | **URGENTE (post-Fase 1):** activar SMTP real — hoy `MAIL_MAILER=log` (los correos se escriben en `laravel.log`, no salen). Breeze ya trae verify-email y existen Mailables (`RequestReceivedMail`, `ReservationConfirmedMail`, `PagoTaquillaConfirmadoMail`). Configurar SMTP en `.env` desbloquea verificación de email Y el canal de alerta de F5 | Requiere decisión del dueño: qué cuenta SMTP usar. `config/mail.php` ya está preparado |

## Hechas (opcional, últimas)

| Fecha cerrado | Tarea |
|---------------|-------|
| 2026-08-31 | **FASE 2 · L5 rendimiento/deuda** (L5a: Availability+N7+R1+R6+R8a · L5b: S2+S3+S4+T5+C2). Suite 435 ✓. S5 reserved sitemap queda P3 documental. Reasonix verifica el diff L5b. |
| 2026-08-31 | **FASE 2 · L4 chatbot** (C1+N5+N6+C4+C7). Suite 405 ✓. Reasonix verifica el diff (PROMPT-L4 v2). |
| 2026-08-31 | **FASE 2 · L3 concurrencia/caducidad** (A3+P1+T1+T2). Suite 394 ✓. Reasonix verifica el diff. |
| 2026-08-30 | **FASE 2 · L2 créditos** (A1+A2+A9+ConfirmSurfTripAction). Suite 384 ✓. Reasonix verifica el diff (PROMPT-L2 v2). |
| 2026-08-30 | **FASE 2 · L1 dinero Stripe** (W1+T3+P2+N3+A7+N2). Suite 376 ✓. Reasonix verifica el diff. |
| 2026-08-26 | Upgrade Laravel 11 → 12: `laravel/framework` v11.46.1 → v12.68.0, PHP sigue 8.2, tests 277/277 ✓, `composer audit` limpio (5 CVEs cerrados). Pendiente aparte: PHP 8.4 en el VPS y Laravel 13 |
| 2026-08-23 | P3 dinero tienda a céntimos: `pedidos.precio_total` + `pedido_producto.precio_pagado` → `_cents` (migración `2026_08_23_110000`, backfill + drop; API en euros vía accessor; tests 267 ✓) |
| 2026-08-23 | P3 precios bonos 150 €/600 € a config: `config/store.php` `bonos_public` (env `STORE_BONO5_CENTS`/`STORE_BONO10_PARTICULARES_CENTS`); `Servicios_ClasesDeSurf.jsx` sin hardcodes |
| 2026-08-23 | P2 unique(`user_id`) en carritos |
| 2026-08-16 | Refactor acordeones → `AccordionTrigger` + `ExpandableText` (11 archivos, build OK, Bonos 3 estados intactos) |
| 2026-08-16 | UX rediseño «Mis pedidos» (`Pedidos.jsx`) |
| 2026-08-20 | A11y acordeón fila-cliente: `Clients.jsx` + `Vigencia.jsx` desktop (botón accesible en chevron, patrón Surfboards) |
| 2026-08-20 | Extraer `ContactBlock` (Edy/Willy) en tablas + neoprenos |
| 2026-08-16 | Rediseño UX banner promo (overlay + WebP) |
| 2026-08-16 | Banner/slider subastas en Tienda (strip en listado + compact en ficha) |
