# Prompt — Veredicto raíl de guías del Taller (`/servicios/webcams`) v3

> V3 2026-08-28 (Reasonix + dueño): +SnapRail compartido (opt-in obligatorio), +Article sin estado publicación, +seeder 18 vs producción divergente, tarea 1 con reclamo/cierre del contrato, +NO APLICA si se descartan ambas. Refinamiento: contenedor de scroll interno (ref no expuesta) → prop opt-in o IntersectionObserver.

Actúa como el agente de marketing y UX de S4 (San Sebastián Surf School). Aplica `docs/taller-prompts/AGENTE-MARKETING-DISENO.md`.

## OBJETIVO
Emitir un veredicto de negocio sobre dos cambios propuestos en el raíl de guías del Taller de `/servicios/webcams`, y —solo si los apruebas— entregar la especificación visual exacta para que Cursor la implemente. No escribes código.

**Decisión 1:** dar al raíl un efecto tipo "ruleta / círculo" (coverflow: tarjetas laterales giradas en perspectiva, la central destacada).
**Decisión 2:** pasar de 6 guías fijas a todas las guías publicadas del Taller, apareciendo según se arrastra.

## CONTEXTO (verificado en el repo; la lectura de la tarea 2 es obligatoria para aterrizar la spec, no para re-auditar el rendimiento)
- Componente: `resources/js/components/Taller/TallerGuideRail.jsx`, sobre `resources/js/components/ui/SnapRail.jsx`.
- Tarjeta: `TallerArticleCardRail` en `resources/js/components/Taller/TallerArticleCard.jsx` (ancho 220px, portada 16/10, chip Mar/Técnica, título a 2 líneas, CTA "Leer").
- SnapRail es scroll nativo (`overflow-x-auto` + `snap-x snap-mandatory`), con fundidos laterales y flechas. No hay librería de carrusel. El único JS es un listener pasivo de scroll para las flechas.
- **SnapRail.jsx es COMPARTIDO**: también lo usa `resources/js/layouts/Contenedor_productos.jsx` (raíles de productos del sitio). Cualquier efecto debe ser opt-in (prop nueva, desactivada por defecto) o vivir en `TallerGuideRail.jsx`. Una spec que cambie el comportamiento por defecto de SnapRail se rechaza. Además, el contenedor de scroll es interno a SnapRail (ref no expuesta): un efecto dependiente de la posición de scroll necesita la prop opt-in o un `IntersectionObserver` por tarjeta dentro de TallerGuideRail.
- Las 6 guías están curadas a mano y en orden fijo en `TallerArticleService::WEBCAM_GUIDE_SLUGS`, con el chip Mar/Técnica asignado ahí. El resto de artículos NO tiene chip asignado en ese servicio. Añadir el chip a los nuevos es cambio de servicio PHP → marcarlo como "requiere coordinación backend", no inventar chips.
- **El modelo `Article` NO tiene campo de publicación** (`$fillable`: title, slug, excerpt, cover_image, content, meta_*, chatbot_*). No existe borrador vs publicado: todos los artículos son públicos. Lee "todas las guías" en ese sentido; no especifiques filtros de estado.
- El Taller tiene 18 artículos (`database/seeders/data/taller_articles.php`). En producción la fuente real es la tabla `articles`, que puede haber divergido del seeder: la spec no debe fijar un número de tarjetas en código.
- Las portadas ya usan `loading="lazy"` y `decoding="async"`: las tarjetas fuera de pantalla no descargan imagen.
- Veredicto técnico de Cursor (no lo repitas ni lo contradigas sin citar el archivo que te haga cambiarlo): transform + opacity tienen coste de render despreciable; animar filter/blur o sombras penaliza; añadir una librería de carrusel costaría ~40 KB gz.
- `framer-motion` ya está instalado en el proyecto (chunk vendor-react).
- `/servicios/webcams` es la página insignia GEO y de tráfico local diario (`docs/taller-seo/KEYWORDS-CONVERSION.md`, P1).
- `docs/taller-seo/GSC-SNAPSHOT-2026-08-27.json` es de **zurriolacam.com.es (webcam WP del dueño), NO de la app S4**, que aún no tiene GSC (lanza ~enero). Úsalo solo como proxy de intención local "webcam"; respeta sus advertencias internas. No cites sus cifras como tráfico de la app.
- La app no tiene GA ni GSC propios todavía: si propones una métrica, di con qué mecanismo se mediría dentro de la app (evento propio, BD, enlace…) o escribe DESCONOCIDO.
- **Objetivo del bloque:** que quien mira la webcam lea guías del Taller y desde ahí siga navegando el Taller (el enlace "Ver todas las guías" ya existe). Cada propuesta debe nombrar qué mejora de ese objetivo; lo puramente decorativo sin métrica se descarta.

## TAREAS
1. Lee `docs/taller-prompts/COORDINACION.md` (Estado actual + Última actividad). Si nadie la tiene reclamada, recláma la tarea antes de empezar y ciérrala al entregar, según el contrato del dúo.
2. Lee `TallerGuideRail.jsx`, `SnapRail.jsx`, `TallerArticleCard.jsx`, `app/Services/Taller/TallerArticleService.php` (constante `WEBCAM_GUIDE_SLUGS`) y el JSON de GSC.
3. Decide cada decisión por separado.
4. Si apruebas la Decisión 1, especifica con valores concretos: qué propiedades se animan (solo transform/opacity), rango de rotación y escala, comportamiento en móvil (<640px), foco de teclado, `prefers-reduced-motion` y fallback en navegadores sin soporte.
5. Si apruebas la Decisión 2, define: número de tarjetas (todas las guías; 18 en el seeder, producción puede divergir — no fijar número en código), criterio de orden (¿las 6 curadas primero? ¿alguna prioridad?), y qué pasa con la curación Mar/Técnica de los nuevos.

## RESTRICCIONES
- Prohibido proponer dependencias npm nuevas (Swiper, Embla, Keen). Solo CSS, el scroll nativo existente o framer-motion.
- Prohibido proponer animar filter, blur, box-shadow o width/height.
- Prohibido inventar métricas, porcentajes de conversión o benchmarks. Si citas un dato, di de dónde sale; si no lo tienes, escribe DESCONOCIDO.
- No edites código de la aplicación. Solo puedes escribir en `docs/taller-prompts/`.
- Responde en español.

## FORMATO DE SALIDA (exacto, en este orden)
1. **VEREDICTO** — dos líneas, una por decisión: `Decisión 1: ADELANTE | ADELANTE CON CAMBIOS | DESCARTAR — [motivo en máx. 15 palabras]`.
2. **POR QUÉ** — máximo 6 viñetas. Cada una atada a un principio CRO o a un dato citado. Sin relleno.
3. **ESPECIFICACIÓN** — solo de lo aprobado. Valores concretos, no adjetivos. Incluye el comportamiento móvil.
4. **LO QUE NO SE TOCA** — elementos de la tarjeta que deben quedar intactos y por qué.
5. **RIESGO PRINCIPAL Y CÓMO MEDIRLO** — un riesgo, una métrica, dónde se mira.
6. **ALTERNATIVA MÁS BARATA** — si existe un cambio de menor coste con efecto comercial parecido, dilo en 3 líneas. Si no existe, escribe NINGUNA.

Si descartas ambas decisiones, escribe **NO APLICA** en las secciones 3 y 4 y desarrolla la 6.

## AUTONOMÍA
Decides tú el veredicto y la especificación. Consulta al dueño solo si la decisión depende de un objetivo de negocio que no está en los documentos citados; en ese caso, formula una única pregunta cerrada y detente.

## VERIFICACIÓN ANTES DE RESPONDER
- Cada ruta que nombres existe en el repo.
- Ningún dato numérico sin fuente.
- El apartado 3 es lo bastante preciso para que Cursor lo implemente sin preguntarte nada.
- Ninguna sección supera su límite de longitud.
