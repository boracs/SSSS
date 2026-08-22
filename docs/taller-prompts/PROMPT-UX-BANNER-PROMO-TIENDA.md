# Prompt UX — Banner publicidad tienda (3 slides + fotos nuevas)

> **Destino:** Reasonix `/marketing-diseno` (S3 rediseno + S10 prompt para Cursor).
> **No implementar código aquí.** Cursor ya tiene el banner funcional; tú rediseñas encima de las 3 fotos.
> **Estado:** pendiente diseño · 2026-08-16

## Brief de marketing (ya aplicado a las fotos)

| Slide | Tema | Foto | Copy actual | CTA |
|-------|------|------|-------------|-----|
| 1 | Bono recomendado | `/img/store/promo-bono.png` | 10 clases de 1,5 h por 250 € · si vienes recomendado | Contacto |
| 2 | Subasta | `/img/store/promo-subasta.png` | Mejor subasta live (título + puja) | Ver subasta |
| 3 | Producto ofertado | `/img/store/promo-producto.png` | Producto con más % descuento | Ver producto |

**Intención de cada foto (para no taparla mal):**
1. **Bono:** grupo en Zurriola, luz de tarde, **aire a la izquierda**. Emoción: pertenecer / empezar con la escuela.
2. **Subasta:** material del club en banco/taquilla, luz cálida + ventana. Emoción: lote exclusivo, no catálogo genérico.
3. **Producto:** still life tienda (neopreno + tabla + cera), mar al fondo. Emoción: oferta de socio, premium.

Las 3 son **16:9**. El overlay actual (`from-slate-950/88`) puede estar **demasiado negro** y matar la foto. El texto vive a la izquierda.

---

## Prompt (copiar desde aquí)

```
1. ROL
Eres el agente senior Marketing + Diseño Web S4 (docs/taller-prompts/AGENTE-MARKETING-DISENO.md). Skills S3 + S6 + S10. No implementas código.

2. OBJETIVO
Rediseña el banner promocional de tienda (`StorePromoBanner.jsx`) para que las 3 fotos nuevas se vean atractivas y el CTA convierta. Entrega wireframe + specs + microcopy + prompt listo para Cursor.

3. CONTEXTO
- Componente actual: `resources/js/components/store/StorePromoBanner.jsx`
- Datos: `storePromoSlides` vía `StorePromoBannerService` (bono fijo + subasta + producto).
- Dónde: `/tienda` bajo el H1; ficha `/producto-ver/{id}` bajo «Volver a la tienda».
- Fotos (abrir y mirar antes de opinar):
  /img/store/promo-bono.png
  /img/store/promo-subasta.png
  /img/store/promo-producto.png
- Overlay actual: gradiente izquierda navy pesado; altura ~11.5–13.5rem; dots + flechas; autoplay 6.5s.

4. TAREAS
1) Mira las 3 fotos: qué zona debe quedar libre para texto; si el overlay actual las aplasta.
2) Layout desktop + móvil (ASCII): foto full-bleed, texto, precio, CTA, dots, flechas.
3) Overlay/contraste WCAG AA sobre cada foto (no un único velo si una slide queda ilegible).
4) Microcopy ES (eyebrow/título/subtítulo/CTA) por slide; puedes mejorar el copy actual sin cambiar precios (250 €, 10×1,5 h).
5) Prompt S10 para Cursor: solo UI de `StorePromoBanner.jsx` + clases Tailwind; no tocar pujas ni catálogo.

5. RESTRICCIONES
- No púrpura, no emojis, no hero a pantalla completa.
- No tapar caras/producto clave de la foto con el bloque de texto.
- Targets táctiles ≥ 44 px.
- No cambiar keys del DTO (`key, eyebrow, title, subtitle, ctaLabel, href, imageUrl, priceLabel`) salvo que marques “requiere backend”.
- Español de España, tono club Zurriola.

6. FORMATO
A. Veredicto (cómo tratar las 3 fotos).
B. Wireframe desktop + móvil.
C. Specs overlay/tipo/CTA.
D. Microcopy por slide.
E. Prompt Cursor (bloque único).
F. Checklist aceptación.

7. AUTONOMÍA
Decide overlay, tipografía y si el precio va en pill o en cifra grande. Pregunta solo si el 250 € / “recomendado” debe cambiar de negocio.
```

---

## Instrucciones para el dueño

1. Reasonix → `/marketing-diseno` → pega el **Prompt**.
2. Adjunta las 3 fotos de `public/img/store/` (o recarga tienda y captura el banner).
3. Cuando entregue el diseño: **«implementa el rediseño del banner promo»**.
