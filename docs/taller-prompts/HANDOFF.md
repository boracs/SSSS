# Handoff de chat (sobrescribir)

> **Un solo archivo.** Al oír «fin de chat» / «cierro chat» / «guardar y reiniciar», la IA **sobrescribe** este documento (no acumula historial).
> En chat nuevo: si el usuario dice «sigo con el handoff» / «sigo con el chat que acabo de cerrar» / tema claramente relacionado → leer esto + `COORDINACION.md` Última actividad y abrir con puente corto.
> Si el tema es otro → ignorar este archivo (salvo pre-vuelo normal de COORDINACION).

## Meta

| Campo | Valor |
|---|---|
| Cerrado | 2026-08-11 ~16:58 (Europe/Madrid) |
| Canal | Cursor |
| Tema | UI pública S4: home, nosotros, menú usuario, clases surf + ritual tokens/handoff |

## Hecho (esta sesión)

- **Home:** directorio de servicios (sin carrusel pills); teaser Sobre nosotros sin eyebrow; stats «1 año / Instalaciones nuevas»; copy corto.
- **`/nosotros` + planes:** micro-servicios +6 (forecast 16d, niveles, subastas, webcam, AutoCoach, calentamiento); flecha › solo si hay destino; deep-links `#webcam-directo` / `#parte-s4-hoy` / `#prevision-forecast`.
- **Menú usuario normal:** `Inicio · Clases · La Zurriola · Club · Tienda · Reparaciones · Más · Contacto` (`GlobalNav.jsx`; Guía surfskate en Clases; Reparaciones fuera de Más; admin intacto).
- **`/servicios/surf`:** listas de beneficios en cards particulares/bonos; «Equipo incluido» en ambas.
- **Tokens:** puente de continuidad + ritual «fin de chat» → `HANDOFF.md` (sin matching por hora); cableado contrato/router/mapa/`AGENTS.md`.
- Varios rebuilds `npm run share:tunnel` (sigue `TUNNEL_SHARE=true` si aplica).

## A medias / siguiente

- Nada bloqueante abierto en este chat.
- Posible siguiente: menú admin «Gestión» (otra pasada); afinar copy/UX clases o home si el dueño pide.

## Archivos clave

- `resources/js/components/GlobalNav.jsx`
- `resources/js/Pages/Pag_principal.jsx`
- `resources/js/Pages/Nosotros.jsx`
- `resources/js/Pages/PlanesTaquillasPublic.jsx`
- `resources/js/Pages/Servicios_ClasesDeSurf.jsx`
- `resources/js/Pages/Servicios_Webcams.jsx`
- `docs/taller-prompts/HANDOFF.md`
- `docs/taller-prompts/COORDINACION.md`
- `docs/taller-prompts/CONTRATO-IA.md`

## Nota modo túnel

Si `TUNNEL_SHARE=true`, tras cambios JSX: `npm run share:tunnel` + Ctrl+Shift+R.
