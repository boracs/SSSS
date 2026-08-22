# Registro de iteraciones — Taller de Prompts (DeepSeek ↔ Cursor)

Memoria del aprendizaje mutuo entre DeepSeek y Cursor. Cada prompt trabajado en esta sesión se apunta aquí.

## Cómo registrar una iteración

Por cada prompt completado, añade una entrada con este esquema:

```md
### [YYYY-MM-DD] — [Objetivo en una línea]

- **Herramienta destino:** DeepSeek | Cursor | Ambos
- **Iteraciones:** v1 (draft) → v2 (crítica DeepSeek) → v3 (consolidada) — [o las que haya]
- **Qué aportó DeepSeek:** [1-2 líneas: crítica, alternativa, punto ciego detectado]
- **Qué aportó Cursor/este taller:** [1-2 líneas: verdad del repo, arquitectura, verificabilidad]
- **Decisión final:** [acepto/rechazo/adapto más relevante y por qué]
- **Lección aprendida:** [una frase que sirva para futuros prompts]
```

---

## Iteraciones

### 2026-08-21 — S4 acordeones: refactor a AccordionTrigger/ExpandableText (a11y + consistencia) → Cursor

- **Herramienta destino:** Cursor (implementación) + Reasonix (auditoría S4, prompts, verificación S11)
- **Iteraciones:** S4 v1 (auditoría 6/10, ~14 copias manuales + kit Radix muerto) → 4 prompts (aria-expanded GlobalNav, a11y Clients/Vigencia, ContactBlock, refactor acordeones) → verificación S11 ×4 + `npm run build` OK
- **Qué aportó Reasonix (este taller):** decisión de diseño clave — trigger propio en vez de Radix porque `Clients`/`Vigencia` expanden un `<tr>` (colSpan) y Radix renderiza divs; spec cerrada del componente (botón real, aria-expanded, aria-controls vía panelId/useId, ChevronDown rotate-180, stopPropagation configurable); migración por fases con parada; «sin cambios visuales» como restricción dura; Bonos al final por su estado múltiple.
- **Qué aportó Cursor:** respetó la spec al pie (fases, panelId, stopPropagation=false en ExpandableText), conservó los 3 estados independientes de Bonos y la animación framer-motion de Surfboards, build OK.
- **Lección aprendida:** en un patrón duplicado, componente canónico + migración por fases con parada vale más que un mega-prompt; la decisión «Radix vs trigger propio» se decide en el código (semántica de tabla), no en el papel.

### 2026-08-21 — Prompt placement banner promo (full-bleed vs Volver) → Reasonix marketing

- **Herramienta destino:** Reasonix `/marketing-diseno` (S1+S7; luego Cursor solo si gana A o C)
- **Iteraciones:** v1 (Cursor prompt-forge)
- **Qué aportó Cursor/taller:** layout real PDP (`max-w-6xl`, banner bajo Volver); veto CRO 08-16; archivo `PROMPT-UX-BANNER-PROMO-PLACEMENT.md`
- **Decisión final:** no mover el banner hasta veredicto A/B/C
- **Lección aprendida:** full-bleed bajo menú en ficha = decisión CRO (Añadir vs descubrimiento), no estética

### 2026-08-19 — Prompt selector banner promo (dots vs CTA) → Reasonix marketing+UX

- **Herramienta destino:** Reasonix `/marketing-diseno` (FASE A S1+S7 → FASE B S3+S5+S10; luego Cursor)
- **Iteraciones:** v1 (Cursor prompt-forge)
- **Qué aportó Cursor/taller:** estado real post-arreglo (pastilla + pb-14); 4 patrones cerrados; alcance solo chrome, no fotos; archivo `PROMPT-UX-BANNER-PROMO-SELECTOR.md`
- **Decisión final:** no más UI a ciegas; marketing elige patrón; UX entrega specs + prompt S10
- **Lección aprendida:** queja de «puntos pegados al CTA» = CRO de jerarquía (CTA primario) + a11y de hit, no solo estética de dots

### 2026-08-16 — Prompt UX banner/slider subastas en Tienda (→ Reasonix marketing)

- **Herramienta destino:** Reasonix / `/marketing-diseno` (luego Cursor implementa)
- **Iteraciones:** v1 (Cursor prompt-forge)
- **Qué aportó Cursor/taller:** rutas reales tienda/PDP/subastas; estados live/ended/settled; veto CRO a slider bajo menú en ficha; contrato de props; archivo `PROMPT-UX-BANNER-SUBASTAS-TIENDA.md`
- **Decisión final:** diseño primero; implementación tras respuesta del diseñador
- **Lección aprendida:** cross-sell de subastas = brief CRO + placement explícito antes de código

---

- **Herramienta destino:** Cursor (tras auditoría Reasonix)
- **Iteraciones:** v1 (plan Cursor) → v2 (crítica Reasonix 8/10) → v3 (prompt implementación consolidado)
- **Qué aportó Reasonix:** ancla `#zurriola-guia` no existe; solape ítems 2↔6; separar H2 (no tocar) vs alts; límite altura bloque GEO; aclarar `webPageNode` private.
- **Qué aportó Cursor/taller:** rutas reales (`Pag_principalController`, `ZurriolaGeoFactsService::publicPayload`, patrón webcams); MVP ordenado ~45 min.
- **Decisión final:** aceptar crítica; MVP = WebPage + description + HomeGeoTeaser + ancla + alts; sin stuffing; sin teléfono inventado.
- **Lección aprendida:** en prompts GEO con deep-link, verificar el `id` en DOM antes de citar el hash.

### 2026-08-12 — SEO post-rebrand: sitemap + keywords + re-crawl

- **Herramienta destino:** Cursor
- **Iteraciones:** v1 (Reasonix/usuario) → v2 (Cursor prompt-forge)
- **Qué aportó Cursor:** corrección factual — el sitemap (`PublicSitemapService`) NO lleva title/description; solo `loc/lastmod/changefreq/priority` + cache `seo.sitemap.xml.v1` 1h; no hay Artisan command → `forgetCache()`; el valor real de la tarea es auditoría de keywords en `PublicPageSeoService` + plan GSC.
- **Decisión final:** v2 lista; no reescribir copy; no inventar comando de sitemap.
- **Lección aprendida:** tras un rebrand de metas, no pedir «regenerar sitemap para reflejar títulos» — el sitemap no contiene títulos; invalidar cache es opcional; lo crítico es HTML/JSON-LD + re-crawl.

### 2026-08-12 — Auditoría consistencia «Taller de Surf» → «Blog educativo» (chatbot)

- **Herramienta destino:** Cursor
- **Iteraciones:** v1 (Reasonix/usuario) → v2 (Cursor prompt-forge, anclada a grep real del repo)
- **Qué aportó Cursor:** falsos positivos (taller Edy en JSON; keywords `taller de surf`; path `/taller` legítimo); taxonomía INCONSISTENTE/LEGÍTIMO/FUERA_ALCANCE; estado esperado (rebrand ya casi hecho → resultado probable «0 inconsistencias» o PHPDoc); checklist + plantilla de tabla.
- **Decisión final:** v2 lista para ejecutar en Cursor; no cambiar rutas ni seeders sin preguntar.
- **Lección aprendida:** en auditorías de rename, listar explícitamente los homónimos del dominio (aquí «taller» = blog vs reparación Edy) evita correcciones falsas.

### 2026-08-10 — Afinado del agente de marketing/diseño (crítica Cursor 8/8 aceptada)

- **Herramienta destino:** Ambos (fuente del skill `/marketing-diseno` + pegable en Gemini/DeepSeek)
- **Iteraciones:** v1 (creación) → crítica Cursor (10 puntos) → aceptación 8 + 1 adaptado (puntero ya existía) + 0 rechazos → ejecución
- **Qué aportó Cursor:** trigger de skill explícito (default S1 + mapa por intención), separación admin vs público, anti-patrones vividos del proyecto (botón ticket, "Pendiente" ambiguo, badges redundantes), SEO real del repo (no JSON-LD a mano), plantilla única R5/§6, límites de tokens (máx. 8 hallazgos), bloque "qué NO hace", y el duplicado tipográfico.
- **Qué aportó este taller (ejecución):** rol recortado (sin épica), secciones nuevas "Disparo de skill", "Modo admin vs público", "Anti-patrones S4", "Qué NO hace", unificación de la plantilla de hallazgos, referencias SEO a `seo-geo-public.mdc` + `PublicPageSeoService` + `DTOs/Seo`.
- **Lección aprendida:** una persona de agente gana determinismo cuando la selección de skill es explícita (mapa de intención → skill), no cuando el modelo la infiere; y gana anclaje cuando incluye anti-patrones vividos del proyecto en vez de principios genéricos.

### 2026-08-10 — Follow-up 2 de Cursor (5/5 aceptados): regresiones de la reconstrucción

- **Herramienta destino:** Ambos
- **Qué aportó Cursor:** detectó 2 regresiones reales de mi reconstrucción post-incidente (fila separadora de la tabla de COORDINACION perdida → render roto; título + enlace al contrato perdidos), el wording de MASTER L4 ("espejo" → "núcleo compartido"), el USO del script sin `--topic ticket`, y propuso podar más (08-09 → archivo).
- **Qué aportó este taller (ejecución):** separador restaurado, título `Reasonix/DeepSeek ↔ Cursor` + línea de contrato al inicio, MASTER L4 corregido, USO con `--topic ticket`, poda extra (COORDINACION 75 → 65 líneas; solo quedan las filas y entradas 08-10). Verificado sin duplicados: 70 filas + 71 entradas íntegras entre vivo y archivo.
- **Lección aprendida:** tras una reconstrucción manual, pedir siempre a la otra IA que audite la estructura markdown (tablas/separadores), no solo el contenido — las regresiones estructurales son invisibles en el diff de contenido.

### 2026-08-10 — Follow-up Cursor al remate (8/8 aceptados y ejecutados)

- **Herramienta destino:** Ambos
- **Iteraciones:** remate Reasonix → revisión Cursor (8 puntos) → aceptación total → ejecución
- **Qué aportó Cursor:** detectó la contradicción §3 vs §7 del CONTRATO, la vista humana desfasada del JSON (faltaba `ticket`), el §4 del 02 con reglas duplicadas, el usage estático del script, los globs demasiado amplios de `ui-admin-s4`, y el `deepseek-ask.mjs` sin mención en CONTRATO §6.
- **Qué aportó este taller (ejecución):** unificó §7 (JSON = fuente máquina; tablas = vista humana; solo enlaces en AGENTS/.cursorrules), fila `ticket` en CONTRATO §3 y MASTER §3, 02 §4 → pointer a `.cursorrules`+CONTRATO (fin de la 3ª copia de reglas), mapa `PROJECT_TREE` actualizado (rules + docs nuevos), usage dinámico desde `Object.keys(router)`, globs acotados a `components/admin/**`+`Pages/Admin/**`, y **poda de COORDINACION** (192 → 75 líneas; historial 2026-08-03→09 movido a `COORDINACION-ARCHIVO.md`).
- **Incidente recuperado:** un script de poda truncó COORDINACION.md (open('w') antes de validar el join) → recuperado reconstruyendo desde lecturas en contexto + verificado sin duplicados (69 filas originales + 1 nueva).
- **Lección aprendida:** (1) en scripts que reescriben archivos, construir el string completo y validarlo ANTES de abrir el fichero en modo 'w'. (2) El router solo converge si la vista humana se regenera/cita del JSON — Cursor y yo coincidimos en eso.

### 2026-08-10 — Remate del sistema de prompts (plan consensuado Reasonix↔Cursor)

- **Herramienta destino:** Ambos (Cursor + DeepSeek + Reasonix)
- **Iteraciones:** v1 (mi análisis) → crítica Cursor (acepta 90 %) → réplica mía (convergencia total) → ejecución
- **Qué aportó Cursor:** confirmó P1 (UTF-16 FF FE, typo `docs/ai`), propuso degradar el 02 a plantilla, matizó "espejo corto" (núcleo compartido, no contenido), y creó `CONTRATO-IA.md` como pegamento de roles.
- **Qué aportó este taller (ejecución):** conversión UTF-16→UTF-8 de `sovereign-architect-protocol` (pesaba el doble), fix typo ×2 en `docs/ia/`, 02 degradado a plantilla operativa, `docs/RESUMEN-PARA-GEMINI.md` (árbol 83 KB → resumen 2K tokens para Gemini), `docs/taller-prompts/RUTAS-CONTEXTO.json` como fuente máquina del router (elimina la duplicación script↔masters; incluye `--topic ticket` con el modal + backend), rule `.cursor/rules/ui-admin-s4.mdc` (design language de implementación), S11 verificación en el agente de diseño, y cross-links en CONTRATO/MASTER/.cursorrules/AGENTS.
- **Lección aprendida:** el dúo converge cuando cada IA aporta su punto ciego (Cursor confirmó mis P1; yo vi el UTF-16 que él no). El router solo deja de derivar cuando hay una fuente máquina (JSON) que el script lee, no tablas copiadas a mano.
- **Pendiente (sugerido por Cursor, no ejecutado):** podar `COORDINACION.md` (hoy ~38 KB): archivar filas HECHO antiguas en `COORDINACION-ARCHIVO.md`, dejando EN CURSO + últimas 10 HECHO.

### 2026-08-10 — Sistema de contexto selectivo por herramienta (Cursor / DeepSeek / Reasonix)

- **Herramienta destino:** Ambos (Cursor + DeepSeek) + esta sesión
- **Iteraciones:** v1
- **Qué aportó este taller:** mismo patrón de 3 capas en cada herramienta — siempre-encendido corto (`.cursorrules`, `AGENTS.md`, núcleo del master prompt) + routing (Cursor: `globs`/skills nativos; DeepSeek: tabla router que pide pegar contextos; Reasonix: skills bajo demanda). Se creó `MASTER-PROMPT-DEEPSEEK.md` como equivalente del `.cursorrules` para chat sin repo, y se activó la auto-invocación del skill `prompt-forge`.
- **Lección aprendida:** el router no se escribe a mano donde ya existe nativo (Cursor `globs`); en chats sin repo (DeepSeek) el usuario es el sistema de archivos — el router solo puede _pedir_ que se pegue el contexto, nunca cargarlo.

### 2026-08-10 — Creación del agente senior de Marketing + Diseño Web (persona invocable)

- **Herramienta destino:** Ambos (autocontenido para Gemini/DeepSeek/Cursor; skill `/marketing-diseno` en Reasonix)
- **Iteraciones:** v1 (persona completa, validada contra el contexto real del repo)
- **Qué aportó este taller:** contexto del proyecto incrustado (design language slate/cyan, archivos clave del admin, `PLANTILLA-UX-MODAL.md` como puente UI→Cursor, regla UI-only, anti-alucinación por capturas que el modelo no puede ver), rúbrica ponderada de 7 ejes con nota 0-10, y lección del ticket mostrador (fricción ≠ confirmación) elevada a principio.
- **Lección aprendida:** un agente de diseño gana precisión cuando su persona lleva el contexto real del proyecto y una rúbrica numérica, no solo criterios genéricos.

### 2026-08-09 — UX ticket mostrador: bloque Alquiler (pastillas Modo + chips de pack con precio)

- **Herramienta destino:** Cursor
- **Iteraciones:** v1 (usuario) → v2 (taller, contrastado con código real) → v3 (consolidada con ajustes del usuario, 5/5 verificados contra código) → v4 (consolidada con la Ronda 1 de DeepSeek, 7/7 aceptadas)
- **Qué aportó DeepSeek (Ronda 1):** trampa de unidades — `board.prices` es float en € y el patrón del pie (/100) podía inducir a dividir; riesgo de duplicar el pie global "Importe línea"; verificar payload exige diff de keys, no solo build; tensión entre "no tocar otras categorías" y el botón compartido; falta pre-check de tarea ya HECHO (evita rehacer); regla de pack repetida 3× (densidad); "modo actual" vs "nuevo modo" al cambiar tabla.
- **Verificación cruzada:** los 2 riesgos factuales de DeepSeek se contrastaron con el código ejecutado por Cursor → Cursor NO cayó en ellos (chips con `formatEurosLabel` sin /100, línea 136; pie global sustituido por hint en alquiler, 1456-1466). 0 rechazos en la Ronda 2.
- **Ronda final (plantilla):** DeepSeek auditó `PLANTILLA-UX-MODAL.md` → 5/5 aceptados: condensar lecciones (5 bullets), locator genérico sin ejemplo concreto, sección €/importe opcional (no toda tarea es money), criterios como checklist medible. Plantilla v2 guardada.
- **Lección final del ciclo:** el activo durable es la PLANTILLA, no el prompt ejecutado; el bucle de crítica sobre la plantilla vale más que re-auditar la tarea cerrada. Playbook pactado por los tres (usuario + Cursor + DeepSeek).
- **Qué aportó este taller (v2):** los precios ya llegan en `surfboard.prices` (no tocar `DatafonoPaymentController`); reutilizar `quoteRentalCents()` para el importe; el reset de `rental_pickup_at` ya existe; caso límite: pack no disponible al cambiar de tabla → reset; semántica de chips con `MINUTE_PACKS`/`DAY_PACKS` + `packLabel`.
- **Qué aportó el usuario (v3):** líneas como pista y localización por bloque `draft.category === "alquiler"`; formato € único del pie `toLocaleString("es-ES", { minimumFractionDigits: 2 })`; reset de pack también al cambiar Modo; el importe vive en `draftAmountCents` (useMemo), no en un campo mutado; el botón solo se deshabilita visualmente en alquiler (`addLine` compartido).
- **Decisión final:** v3 lista para entregar a Cursor.
- **Ejecución:** Cursor la ejecutó y cerró en COORDINACION (2026-08-09, HECHO). Reasonix verificó el código contra los criterios de aceptación: todos cumplidos (pastillas con aria-pressed, reset pickup+pack con `withSyncedRentalPack`, chips con € vía `rentalPackOptions`/`buildPacksFromSchema`, importe vía `draftAmountCents`, botón `alquilerAddDisabled` solo en alquiler). Extra de Cursor: estado vacío "Esta tabla no tiene packs vendibles".
- **Lección aprendida:** un prompt de UI gana precisión cuando cita qué datos reales ya traen los props y qué helpers existentes reutilizar — evita que el agente toque backend innecesariamente. Los ajustes del usuario se validaron contra el código antes de aceptarse (5/5 correctos). El prompt se ejecutó a la primera sin preguntas del agente.
