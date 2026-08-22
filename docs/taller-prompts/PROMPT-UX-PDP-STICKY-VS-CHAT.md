# Prompt UX — Barra sticky PDP vs FAB chat (móvil)

**Estado:** Cursor aplicó mitigación técnica (CSS `--s4-sticky-purchase-bar-h`). Reasonix validar diseño.

## Contexto

En **ficha producto móvil** (`ProductoVer.jsx`), al hacer scroll aparece `ProductStickyPurchaseBar` (precio + «Añadir»). El **dock del chat** (`Chatbot.jsx`, FAB 56×56, `z-[850]`) está anclado abajo-derecha. **Conflicto:** el CTA de compra quedaba tapado por el chat (captura dueño 2026-08-19).

## Objetivo de negocio (marketing)

- **PDP = conversión tienda** → CTA «Añadir al carrito» es **primario** en esa pantalla.
- **Chat Maider = secundario** → ayuda/dudas, no debe bloquear el commit de compra.
- Regla CRO: un solo objetivo primario visible; targets ≥ 44 px sin solapamiento.

## Mitigación actual (Cursor)

Variable CSS global `--s4-sticky-purchase-bar-h`: cuando la barra sticky está visible, el dock chat **sube** ese offset. Sin ocultar el chat.

## Opciones para validar (Reasonix / diseño)

| Opción | Pros | Contras |
|--------|------|---------|
| **A. Subir FAB** (implementado) | Chat sigue visible; CTA libre | Dock «salta» al aparecer barra |
| **B. Reservar franja derecha** en barra (`pr-16`) | CTA nunca bajo el FAB | Pierdes ancho del botón |
| **C. Ocultar chat solo en PDP móvil** con sticky | Cero solape | Pierdes soporte en momento de compra |
| **D. CTA ancho completo** en barra + chat encima | Muy claro el primario | Barra más alta |
| **E. Barra solo precio**; «Añadir» sigue arriba | Menos chrome | Menos CRO al scroll |

**Recomendación marketing (Cursor):** **A + B suave** — subir FAB (A) y acortar ancho del CTA con `max-w` para que no invada la columna del chat si el offset falla en algún viewport.

## Entregable Reasonix

1. Veredicto A–E (o híbrido).
2. Spec CSS: offsets, animación del dock (¿transición 200 ms?), copy del CTA en barra («Añadir» vs «Añadir al carrito»).
3. ¿Misma regla en otras barras fijas futuras (carrito checkout)?

## Archivos

- `resources/js/components/store/ProductStickyPurchaseBar.jsx`
- `resources/js/components/Chatbot.jsx` (fabDockClass)
- `resources/js/Pages/ProductoVer.jsx`
