# Prompt UX — Selector del banner promo (dots + anterior/siguiente)

> **Destino:** Reasonix `/marketing-diseno`.
> **Cadena:** FASE A = marketing (S1 + S7) → FASE B = UX (S3 + S5 + S10). Misma sesión; no esperar otro chat.
> **No implementar código aquí.** Cursor ya hizo un primer arreglo; no reimplementar a ciegas.
> **Estado:** pendiente Reasonix · 2026-08-19

## Qué pidió el dueño

Los puntos del carrusel (siguiente/anterior) se veían poco profesionales y **pegados al CTA** («Ver subasta»). Quiere un selector más serio, con aire respecto al botón.

## Qué ya hizo Cursor (no rehacer)

En `resources/js/components/store/StorePromoBanner.jsx`:

- Contenido con `pb-14` / `sm:pb-16` para separar CTA de dots.
- Dots en pastilla (`bg-slate-950/55`, blur, borde, sombra); activo = pill blanca; hit area `h-8 min-w-8`.
- Chevrons laterales solo `sm+` (`h-11`, blur, hover). En móvil solo dots.
- Autoplay 6,5 s; pausa on hover. 3 slides (bono / subasta / producto).

**Fuera de alcance de este prompt:** fotos, copy, overlay, precios, DTO, backend. Eso vive en `PROMPT-UX-BANNER-PROMO-TIENDA.md` (sigue pendiente de rediseño de fotos).

---

## Prompt (copiar desde aquí)

```
1. ROL
Eres el agente senior Marketing + Diseño Web S4 (docs/taller-prompts/AGENTE-MARKETING-DISENO.md). Skills: FASE A = S1 + S7 (modo público). FASE B = S3 + S5 + S10. No implementas código.

2. OBJETIVO
Audita el chrome del carrusel del banner promo (dots + flechas vs CTA) y entrega un rediseño de controles listo para Cursor. El CTA de la slide debe seguir siendo la acción primaria; el selector no debe competir ni pegarse a «Ver subasta».

3. CONTEXTO
- Stack: Laravel 11 + React 19 + Inertia 2 + Tailwind. Lee docs/PROJECT_TREE_FOR_GEMINI.md; no inventes rutas.
- Componente: resources/js/components/store/StorePromoBanner.jsx
- Uso: /tienda y ficha /producto-ver/{id}
- Design language: navy/slate, acento #0f5f74, sin púrpura, sin emojis.
- Slides: 3 (bono, subasta, producto). Autoplay 6500 ms. Flechas hidden sm:flex.
- Queja del dueño: selector poco profesional y pegado al CTA.
- Cursor ya aplicó pastilla + padding (ver bloque ESTADO_ACTUAL). Tú decides si vale, hay que iterar, o hay que cambiar de patrón.
- No reabrir PROMPT-UX-BANNER-PROMO-TIENDA.md (fotos/copy/overlay).

4. ENTRADAS
<<<ESTADO_ACTUAL
Chrome actual (Cursor 2026-08-19):
- CTA + precio en fila; padding inferior pb-14 / sm:pb-16.
- Dots: tablist en pastilla absoluta bottom-4 / sm:bottom-5, overlay sobre la foto.
- Hit dots: botón 32px; el indicador visual es 8×8 o 8×24 (activo).
- Chevrons: 44px, laterales, solo desktop.
- Overlay foto: from-slate-950/70 via-slate-950/35.
ESTADO_ACTUAL>>>

<<<QUEJA_DUENO
«poner los botones del selector de siguiente o anterior mejor y más profesionales; que no estén justo pegados al botón»
QUEJA_DUENO>>>

Adjunta captura actual del banner (móvil + desktop si puedes). Si no hay captura: dilo (R2) y trabaja con ESTADO_ACTUAL; no inventes px que no veas.

5. TAREAS
FASE A — Marketing (S1 + S7), primero:
1) Nota 0–10 de la rúbrica §5 solo sobre chrome + jerarquía CTA vs selector (no audites toda la tienda).
2) CRO: un objetivo primario por slide = el CTA. ¿Los dots/flechas restan clics, tapan precio, o están bien como secundarios?
3) Máx. 6 hallazgos (plantilla R5). Incluye sí o sí: (a) solape/aire CTA↔dots, (b) target táctil real vs visual, (c) flechas desktop vs solo dots móvil.
4) Veredicto: conservar pastilla / iterar pastilla / cambiar patrón. Patrones permitidos a elegir UNO:
   P1 Overlay inferior (actual, más aire)
   P2 Barra debajo de la foto (fuera del bleed)
   P3 Segmented control / pills con label corto (Bono | Subasta | Oferta)
   P4 Solo flechas + contador «2 / 3» (sin dots)
   Prohibido inventar un 5º patrón salvo que P1–P4 fallen todos; entonces 1 alternativa + por qué.
5) Decisión ejecutiva A (2–3 líneas): patrón ganador + por qué + qué no tocar.

FASE B — UX (S3 + S5 + S10), en el mismo mensaje, sin preguntar si continúas:
6) Wireframe ASCII desktop + móvil del patrón ganador: CTA, precio, dots/flechas, márgenes en px (Tailwind: p-/gap-/bottom-).
7) Specs: tamaños hit ≥ 44 px (o justificación si el visual es menor y el hit es 44), contraste AA sobre foto/pastilla, foco visible, aria (tablist vs group), hover/active/disabled.
8) Qué desaparece (clases/bloques) y qué se conserva (autoplay, pausa hover, 3 slides).
9) Prompt S10 para Cursor: un bloque copiable. Alcance solo StorePromoBanner.jsx + clases Tailwind. Locator por bloque (dots, chevrons, padding del copy), no por nº de línea. Pre-check COORDINACION. Sin backend, sin DTO, sin fotos nuevas.

6. RESTRICCIONES
- No código React/PHP.
- No cambiar keys del DTO ni copy de slides ni href.
- No librerías de carousel nuevas.
- No rediseñar el banner entero (fotos/overlay/tipografía de título).
- Español de España. Números (px, nota) antes que adjetivos.
- Si un dato no está en ESTADO_ACTUAL ni en captura: escribe DESCONOCIDO.

7. FORMATO
A. Diagnóstico marketing (nota + 1 párrafo).
B. Hallazgos (tabla R5, máx. 6).
C. Veredicto de patrón (P1–P4) + decisión ejecutiva A.
D. Wireframe desktop + móvil.
E. Specs UI/a11y (lista numerada, ≤12 ítems).
F. Prompt Cursor S10 (bloque único).
G. Checklist aceptación (8–10 ítems sí/no).

8. ACEPTACIÓN
- CTA sigue siendo primario; selector secundario y no pegado.
- Un solo patrón ganador.
- Specs implementables sin preguntar layout.
- Prompt S10 no pide tocar backend.
- Distingue «ya hecho por Cursor» vs «aún falta».

9. AUTONOMÍA
Elige el patrón. No preguntes si pasas a FASE B: pásate. Pregunta solo si el dueño prefiere labels con nombre de slide (P3) frente a dots anónimos — y aun así entrega una recomendación por defecto.

10. VERIFICACIÓN
Antes de responder: ¿has competido el CTA con el selector? ¿Hits ≥ 44? ¿El prompt S10 podría ejecutarse mañana sin este chat?
```

---

## Instrucciones para el dueño

1. Reasonix → `/marketing-diseno` → pega el **Prompt**.
2. Adjunta captura actual del banner (la de «Ver subasta» + selector).
3. Cuando entregue FASE A+B: **«implementa el selector del banner promo»** (eso va a Cursor).
