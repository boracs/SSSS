# Prompt UX — Banner/slider subastas en Tienda

> **Destino:** Reasonix / agente Marketing+Diseño (`docs/taller-prompts/AGENTE-MARKETING-DISENO.md`, skill `/marketing-diseno`).
> **Siguiente paso tras diseño:** Cursor implementa (Laravel + React/Inertia).
> **Estado:** pendiente de respuesta del diseñador · 2026-08-16

---

## Prompt (copiar desde aquí)

```
1. ROL
Eres el agente senior de Marketing Digital y Diseño Web de S4 (San Sebastián Surf School), según docs/taller-prompts/AGENTE-MARKETING-DISENO.md. Especialista en UI/UX, CRO y patrones de merchandising e-commerce. No implementas código.

2. OBJETIVO
Diseña una plantilla profesional (wireframe + specs UI + copy + estados) para un banner promocional de Subastas dentro del flujo Tienda socios, con slider de subastas activas y/o finalizadas, para que el socio descubra que existen subastas sin matar la conversión de la ficha/listado de producto.

Entregable listo para que Cursor implemente después, sin ambigüedad de layout, breakpoints ni copy.

3. CONTEXTO
- Stack UI: Laravel 11 + Inertia + React 19 + Tailwind. Design language S4: navy/slate, cyan accent (#0f5f74 / cyan), tipografía heading del proyecto, sin estética genérica “AI purple”.
- Tienda socios: listado `resources/js/Pages/Tienda.jsx` (ruta tienda); ficha `resources/js/Pages/ProductoVer.jsx`.
- Subastas públicas: `/subastas` (`auctions.index`), detalle `/subastas/{slug}` (`auctions.show`). Página existente `resources/js/Pages/Auctions/Index.jsx` con estados visuales: live (En curso), ended (Finalizada), settled (Adjudicada); precio en céntimos; countdown en live.
- Acceso: subastas pueden requerir VIP/taquilla (`Auctions/AccessRequired.jsx`) — el banner no debe prometer pujar si el usuario no tiene acceso; el CTA puede llevar a `/subastas` o a login/upgrade según caso.
- Idea del dueño: banner con slider de subastas activas o ya finalizadas “para que vean que hay subastas”.
- Opinión previa Cursor (CRO): colocar el slider grande justo debajo del menú global y encima de «Volver a la tienda» en la FICHA de producto es agresivo (compite con precio/Añadir, come viewport móvil). Preferible: (A) destacado en listado `/tienda`; (B) en ficha, posición secundaria (p.ej. cerca de «También te puede interesar») o franja muy compacta. Tú puedes contradecir con datos CRO, pero debes justificarlo.

<<<REFERENCIAS_PATRÓN
Busca en internet (o cita de memoria verificable de patrones conocidos) 3–5 referentes de merchandising cross-sell en e-commerce/marketplaces:
- carruseles “También te puede interesar” / “Deals” / auction promo strips
- banners slim bajo header vs módulos mid-page
- tratamientos “live auction” (badge, countdown, precio actual)
No inventes URLs falsas: si no tienes un ejemplo concreto, describe el patrón sin URL.
REFERENCIAS_PATRÓN>>>

<<<CAPTURAS_CONTEXTO
El dueño aportó captura de ficha producto: header navy → zona blanca con «← Volver a la tienda» + breadcrumbs → card producto. Quería el banner “justo debajo del menú, encima de Volver”. Evalúa esa zona y propone alternativa si es inferior.
CAPTURAS_CONTEXTO>>>

4. ENTRADAS (datos de tarjeta del slider — asumir disponibles vía props Inertia)
Por ítem: id, slug, title, first_image (URL o null), status (live|ended|settled|…), current_price_cents, ends_at (ISO o null), bids_count (opcional).
Lista mezclable: hasta N live + M ended/settled (tú defines N/M y orden recomendado).

5. TAREAS
1) Benchmark: 3–5 patrones (nombre del patrón + qué copiar / qué evitar para S4).
2) Decisión de placement: ranking de 2–3 ubicaciones (tienda listado / ficha / ambas) con pros/contras CRO y recomendación única ganadora + variante móvil.
3) Wireframe ASCII (desktop + móvil) del componente ganador: altura máx., padding, qué va en cada slide, controles del slider, CTA global vs CTA por slide.
4) Specs UI: tipografía, colores (tokens Tailwind del proyecto: slate/s4/cyan), badges por status, vacío (0 subastas), loading, error suave, “sin acceso VIP”.
5) Microcopy ES: eyebrow, título, subtítulo, CTA primario/secundario, labels live/finalizada, empty state.
6) Contenido del slider: ratio live vs finalizadas; si finalizadas solo social proof; orden; autoplay sí/no y por qué.
7) Lista de props/comportamiento para Cursor (sin inventar endpoints nuevos si bastan los existentes; marca “requiere backend” solo si hace falta un endpoint de “últimas subastas para banner”).
8) Criterios de no-hacer: no tapar precio/Añadir en ficha; no hero full-bleed; no cards genéricas púrpuras; no emojis.

6. RESTRICCIONES
- No código React/PHP. Solo diseño + specs.
- No cambiar lógica de pujas ni pagos.
- No proponer librerías nuevas salvo justificación breve (preferir patrón ya usado en Contenedor_productos / Embla si aplica).
- Respetar acceso socios/VIP: no engañar con “Puja ahora” si no puede.
- Español de España, tono S4 (claro, club, Cantábrico).
- Si no puedes ver la captura real en tu sesión, dilo y trabaja con la descripción de CAPTURAS_CONTEXTO.

7. FORMATO DE SALIDA (en este orden)
A. Veredicto (5–8 líneas): placement ganador + por qué.
B. Benchmark (tabla: patrón | aprendizaje | aplicar en S4 sí/no).
C. Wireframe desktop + móvil (ASCII).
D. Specs UI (lista numerada).
E. Microcopy final (listo para pegar).
F. Contrato de props / estados para implementación.
G. Checklist de aceptación (8–12 ítems sí/no).
H. Riesgos CRO (máx. 5) + mitigación.

8. ACEPTACIÓN
- Queda claro DÓNDE va el banner (una recomendación primaria).
- Hay wireframe móvil y desktop.
- Copy completo en español.
- Empty + live + ended cubiertos.
- Cursor podría implementar sin preguntar layout.
- No contradice “1 objetivo primario por pantalla” sin justificar excepción.

9. AUTONOMÍA
Decide tú: N slides, autoplay, ratio live/ended, altura. Pregunta solo si falta un dato de negocio crítico (ej. “¿subastas visibles a no-VIP en teaser?”). Si asumes, decláralo en “Supuestos” al final (máx. 5).

10. VERIFICACIÓN
Antes de responder: relee AGENTE-MARKETING-DISENO principios 1–3 y 9; comprueba que no colocaste un slider grande encima del CTA de compra en ficha sin mitigación; comprueba que el CTA lleva a `/subastas` o show con slug.
```

---

## Instrucciones para el dueño

1. Abre Reasonix (DeepSeek) con `/marketing-diseno` o pega también el rol de `AGENTE-MARKETING-DISENO.md`.
2. Pega el bloque **Prompt** de arriba.
3. Adjunta la captura de la ficha producto si el agente no la tiene.
4. Cuando responda: guarda el diseño (o pégalo en este mismo archivo bajo `## Respuesta diseñador`) y di a Cursor: **«implementa el banner de subastas según el diseño»**.
