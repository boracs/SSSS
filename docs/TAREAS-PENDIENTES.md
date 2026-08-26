# Tareas pendientes — maider_0

> Lista **personal** del dueño: cosas incompletas, remates o ideas a no olvidar.
> No sustituye `docs/taller-prompts/COORDINACION.md` (pizarrón Cursor ↔ Reasonix).
> Este archivo = backlog tuyo; COORDINACION = qué está haciendo cada IA ahora.

## Flujo (tú ↔ Cursor / Reasonix)

| Tú dices… | El agente hace… |
|-----------|-----------------|
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

| Fecha | Tarea | Notas / archivos |
|-------|-------|------------------|
| 2026-08-24 | Backlog auditoría marketing web (A1–A10) — ejecutar uno a uno | Maestro: `docs/taller-prompts/AUDITORIA-MARKETING-WEB-2026-08-24.md` · Prompt: `PROMPT-EJECUCION-AUDITORIA-MARKETING.md` · Orden sugerido: A3 → A5 → A8 → A1 (decisión) → A4 → A2 → … |
| 2026-08-24 | Handshake marketing ↔ SEO/GEO (M1–M10): **parte Reasonix HECHA** (MD, SKILL.md, router, MASTER §3) · pendiente **Cursor**: diff `seo-geo-public.mdc` (quitar "Taquillas," de noindex) | Siguiente paso del dueño: revisar **home/surf/contacto con la rúbrica de conversión §5.1** y pedir el diff a Cursor |

## Hechas (opcional, últimas)

| Fecha cerrado | Tarea |
|---------------|-------|
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
