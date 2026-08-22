# Prompt UX — Placement banner promo (full-bleed bajo menú, encima de Volver)

> **Destino:** Reasonix `/marketing-diseno` (S1 + S7, modo público).
> **No implementar código.** Cursor espera veredicto + specs; no mueve el banner a ciegas.
> **Estado:** ejecutado por Cursor · 2026-08-21 (dueño eligió: listado bleed; ficha debajo de la card).

## Pregunta del dueño

En la **ficha de producto**: ¿poner el banner promo **encima** de «Volver a la tienda» y breadcrumbs, y que ocupe **todo el ancho como el menú**?

---

## Prompt (copiar desde aquí)

```
1. ROL
Eres el agente senior Marketing + Diseño Web S4 (docs/taller-prompts/AGENTE-MARKETING-DISENO.md). Skills S1 + S7, modo público. No implementas código.

2. OBJETIVO
Da un veredicto CRO sobre placement y ancho del banner promo en ficha de producto (y si el listado /tienda debe seguir el mismo patrón). Entrega specs mínimas para que Cursor pueda implementar SOLO si el veredicto es sí, o una alternativa si es no.

3. CONTEXTO
- Stack: Laravel 11 + React 19 + Inertia 2 + Tailwind. Lee docs/PROJECT_TREE_FOR_GEMINI.md; no inventes rutas.
- Banner: resources/js/components/store/StorePromoBanner.jsx — 3 slides (bono / subasta / producto), autoplay 6,5 s, chevrons, CTA único (sin pastilla de precio).
- Ficha: resources/js/Pages/ProductoVer.jsx. HOY el banner va DENTRO de max-w-6xl px-4, DEBAJO de «Volver a la tienda» + breadcrumbs, ENCIMA de la card de producto. Altura ~12–14 rem.
- Listado: resources/js/Pages/Tienda.jsx — banner bajo el H1, dentro de max-w-[96rem] con padding (no edge-to-edge).
- Menú: Header/GlobalNav a ancho de viewport (full-bleed).
- Hay sticky bar móvil de compra (precio + Añadir) y FAB de chat. Viewport móvil estrecho.
- Doctrina S4: una pantalla, un objetivo primario. En ficha el primario es precio + Añadir.
- Opinión previa Cursor (2026-08-16, PROMPT-UX-BANNER-SUBASTAS-TIENDA.md): full-bleed justo bajo el menú en FICHA es agresivo (compite con Añadir, come fold móvil). Prefería destacado en /tienda y en ficha posición secundaria o franja compacta. Tú PUEDES contradecir, pero con heurística/dato, no con gusto.

4. ENTRADAS
<<<PROPUESTA_DUENO
En ficha: banner encima de «Volver a la tienda» y breadcrumbs. Ancho = el del menú (full-bleed, sin max-w-6xl ni px del contenedor).
PROPUESTA_DUENO>>>

<<<ESTADO_ACTUAL
Ficha ProductoVer.jsx (~línea 190): contenedor max-w-6xl → fila Volver+crumbs → StorePromoBanner (mt-4) → article producto.
Tienda.jsx: H1 → StorePromoBanner (ancho del contenedor, no del viewport).
Banner ya no muestra pastilla de precio; solo CTA.
ESTADO_ACTUAL>>>

Adjunta captura de ficha (móvil + desktop si puedes). Si no hay captura: DESCONOCIDO de px exactos; trabaja con ESTADO_ACTUAL.

5. TAREAS
1) Nota 0–10 solo de jerarquía/CRO del placement actual vs la propuesta (no audites toda la ficha).
2) Ranking de 3 opciones con un ganador único:
   A) Propuesta dueño: full-bleed bajo menú, encima de Volver/crumbs (ficha).
   B) Status quo: banner dentro del contenedor, bajo Volver/crumbs.
   C) Alternativa tuya (p.ej. solo en /tienda; o strip compacto 4–5 rem; o al final cerca de relacionados).
3) Si A gana: ¿misma regla en /tienda (bajo menú, encima del H1, full-bleed)? Sí/no + por qué.
4) Altura máx. móvil y desktop en rem si A o C. Radios: ¿flush al menú (0) o rounded-2xl con margen?
5) Riesgos: fold móvil vs sticky Añadir; competencia CTA banner vs Añadir; breadcrumbs tapados; CLS por autoplay.
6) Decisión ejecutiva 2–3 líneas. Si A o C: specs Tailwind (dónde sale el banner del max-w-6xl) + prompt S10 de 8–12 líneas para Cursor. Si B: no pidas implementar.

6. RESTRICCIONES
- No código. No cambiar DTO ni slides ni copy.
- No librerías de carousel.
- Números (rem, %) antes que adjetivos.
- Si un dato no está en ESTADO_ACTUAL ni captura: DESCONOCIDO.

7. FORMATO
A. Diagnóstico (nota + 1 párrafo).
B. Ranking A/B/C (tabla: opción | CRO | riesgo móvil | veredicto).
C. Decisión ejecutiva.
D. Specs si hay que mover (altura, bleed, radios, /tienda sí/no).
E. Prompt Cursor S10 o «no implementar».
F. Checklist aceptación (6–8 ítems).

8. ACEPTACIÓN
- Un ganador, no un empate.
- Ficha y /tienda cubiertas.
- Si implementas, Cursor sabe si el banner sale del max-w-6xl y a qué altura.

9. AUTONOMÍA
Elige A, B o C. No preguntes si el dueño «lo prefiere bonito»: el criterio es conversión de Añadir en ficha vs descubrimiento de ofertas. Pregunta solo si falta captura Y eso cambia el ganador.

10. VERIFICACIÓN
¿El objetivo primario de la ficha sigue siendo Añadir? ¿El banner full-bleed lo respeta o lo pisa?
```

---

## Instrucciones para el dueño

1. Reasonix → `/marketing-diseno` → pega el **Prompt**.
2. Adjunta captura de ficha (menú + Volver + banner + card).
3. Si el veredicto es mover: **«implementa el placement del banner promo»** (Cursor).
