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
| 2026-08-19 | Quitar icono Instagram de «Escríbenos» en tienda | Modal de contacto abierto desde tienda: no mostrar canal Instagram. `ContactChannelsModal.jsx` (topic `store`). |
| 2026-08-19 | P2 unique(`user_id`) en carritos | Deuda técnica. No implementar ahora. |
| 2026-08-19 | P3 float → céntimos en pivot carrito/pedido | Deuda técnica. No implementar ahora. |
| 2026-08-19 | P3 precios bonos 150 € / 600 € a config | Deuda técnica. No implementar ahora. |

## Hechas (opcional, últimas)

| Fecha cerrado | Tarea |
|---------------|-------|
| 2026-08-16 | Refactor acordeones → `AccordionTrigger` + `ExpandableText` (11 archivos, build OK, Bonos 3 estados intactos) |
| 2026-08-16 | UX rediseño «Mis pedidos» (`Pedidos.jsx`) |
| 2026-08-20 | A11y acordeón fila-cliente: `Clients.jsx` + `Vigencia.jsx` desktop (botón accesible en chevron, patrón Surfboards) |
| 2026-08-20 | Extraer `ContactBlock` (Edy/Willy) en tablas + neoprenos |
| 2026-08-16 | Rediseño UX banner promo (overlay + WebP) |
| 2026-08-16 | Banner/slider subastas en Tienda (strip en listado + compact en ficha) |
