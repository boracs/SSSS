# Handoff de chat (sobrescribir)

> **Un solo archivo.** Al oír «fin de chat» / «cierro chat» / «guardar y reiniciar», la IA **sobrescribe** este documento (no acumula historial).
> En chat nuevo: si el usuario dice «sigo con el handoff» / «sigo con el chat que acabo de cerrar» / tema claramente relacionado → leer esto + `COORDINACION.md` Última actividad y abrir con puente corto.
> Si el tema es otro → ignorar este archivo (salvo pre-vuelo normal de COORDINACION).

## Meta

| Campo | Valor |
|---|---|
| Cerrado | 2026-08-21 (Reasonix) |
| Canal | Reasonix |
| Tema | Análisis/mejora agente marketing + S4 acordeones + 4 tareas cerradas (a11y y refactor) |

## Hecho (esta sesión)

- **Agente marketing mejorado** (`docs/taller-prompts/AGENTE-MARKETING-DISENO.md`): +S12 `critica_prompt_rediseno`, plantilla única de hallazgos con **Sev (P0/P1/P2)** y **KPI***, escala de nota 0–10 con anti-inflación, fórmula de prioridad (impacto×frecuencia/esfuerzo), disparos S4/S5, checklist de contexto R2, anti-patrones AP-1..AP-6, ejemplo few-shot §8. Skill `/marketing-diseno` sincronizado (S1–S12, tabla 8 columnas).
- **S4 auditoría de consistencia — acordeones:** ~14 copias manuales del patrón expandible, kit Radix `ui/accordion.tsx` sin usar, nota 6/10 → 4 tareas al backlog.
- **4 tareas cerradas y verificadas (S11), build `npm run build` OK (29.68s):**
  1. `GlobalNav.jsx:1031` — `aria-expanded={open}` en trigger móvil con submenú (patrón «Mi espacio»).
  2. a11y `Clients.jsx:134` + `Vigencia.jsx:1173` — chevron de fila como `<button type="button" aria-expanded aria-label>` (patrón Surfboards); `<tr>` sin role/tabIndex; sr-only retirado.
  3. `ContactBlock.jsx` (nuevo) — bloque «Contactar con Edy/Willy» extraído de `Servicios.jsx` y `Servicios_ReparacionNeoprenos.jsx` (props: contact, open, onToggle, mailSubject, mailIconClassName, fallbackName).
  4. **Refactor acordeones:** `ui/AccordionTrigger.jsx` + `ui/ExpandableText.jsx` (spec: botón real, aria-expanded, aria-controls vía panelId/useId, ChevronDown rotate-180, stopPropagation configurable). Migrados 11 archivos: Pedidos, SurfBriefMini, Clients, Vigencia (×2), Datafono, Surfboards, SecondHand, Rentals, Commander, Bonos (×4), Nosotros. Icono único ChevronDown (adiós Plus/Minus/▼); Bonos conserva sus 3 estados independientes; animación framer-motion de Surfboards intacta.
- `docs/TAREAS-PENDIENTES.md` actualizado: 4 → Hechas; Abiertas solo **P3 bonos** (deuda técnica, no tocar).

## A medias / siguiente

- **#9 de mejoras Cursor 08-11** (última pendiente; falta confirmar #7) — siguiente prompt del taller si el dueño lo pide.
- **SEO Donostia:** análisis de keywords pendiente + plan SEO/rebrand (recordatorio: `docs/COMPETENCIA_SEO_DONOSTIA.md`).
- `ui/accordion.tsx` (Radix) sigue sin usarse — no borrar; posible migración futura si se necesita estado múltiple + animación nativa.
- Nota menor: existe un `ContactBlock` **local** en `components/Footer.jsx` (función distinta, `onOpenContact`/`className`) — candidato a unificar con `components/ContactBlock.jsx` algún día.

## Archivos clave

- `docs/taller-prompts/AGENTE-MARKETING-DISENO.md` · `.reasonix/skills/marketing-diseno/SKILL.md`
- `resources/js/components/ui/AccordionTrigger.jsx` · `ui/ExpandableText.jsx` · `components/ContactBlock.jsx`
- `resources/js/components/GlobalNav.jsx` · `Pages/Admin/Payments/Clients.jsx` · `Pages/Admin/Taquillas/Vigencia.jsx`
- `docs/TAREAS-PENDIENTES.md` · `docs/taller-prompts/COORDINACION.md`
