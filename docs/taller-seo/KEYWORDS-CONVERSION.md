# Mapa de keywords de conversión — S4 (páginas money)

**Fecha:** 2026-08-28 · **Autor:** Reasonix (taller SEO) · **Alcance:** solo análisis y documentación (`docs/taller-seo/`), sin código.
**Método:** inventario real de páginas indexables (`routes/web.php` + `PublicSitemapService::STATIC_PATHS` + `PublicPageSeoService`) → intención de búsqueda → kw_principal única por página → anti-canibalización → clusters → plan GEO.
**Fuentes:** `docs/COMPETENCIA_SEO_DONOSTIA.md` (competencia, verificada 2026-08-04) · `docs/taller-seo/SEO_MATRIX.md` (18 kw del Taller) · `PublicPageSeoService.php` (metas actuales).
**Regla aplicada (igual que en `SEO_MATRIX.md`):** **sin volúmenes ni KD inventados** — van a «medir» con herramientas reales (sección 6).

---

## 1) Por qué este mapa (el hueco que cubre)

`SEO_MATRIX.md` ya cubre las **18 keywords informacionales del blog Taller**. Lo que faltaba: las keywords **comerciales/locales de las páginas que convierten** (clases, alquiler, taquillas, trips…). Este documento las asigna **una kw_principal por página** para que cada URL tenga un objetivo claro y ninguna compita contra otra.

**Páginas indexables (sitemap, 20 estáticas + dinámicas):** home, nosotros, contacto, servicios (hub), reparación neoprenos, **clases** (`/servicios/surf`), surfskate (+guía), surf-trips, fotos, videograbaciones, **webcams**, **taquillas**, tienda, segunda mano, taller (+18 artículos), **tablas-alquiler** (+soft/hard_basic/hard_pro). Dinámicas: productos tienda, tablas segunda mano, tablas de alquiler. `robots.txt` no indexa `/subastas` (auth) ni carrito/cuentas.

---

## 2) Mapa keyword → página (la tabla principal)

Prioridad: **P1** = convierte o alimenta tráfico local diario · P2 = conversión secundaria · P3 = marca/trust. Volumen/KD → sección 6.

| Página (ruta) | kw_principal | kw_secundarias (2–3) | Intención | Prioridad | Estado SEO actual y acciones |
|---|---|---|---|---|---|
| `/` (home) | **escuela de surf san sebastián** | escuela de surf donostia · san sebastian surf school · escuela de surf zurriola | local comercial (marca+local) | **P1** | Title/meta ya OK («Clases de surf en la playa de Zurriola…»). **Regla anti-canibalización: el término «escuela de surf + ciudad» SOLO en home.** Acción: enlace interno desde /servicios/surf y webcams al home con ese ancla. GEO ya tiene teaser + LocalBusiness. |
| `/servicios/surf` (clases) | **clases de surf donostia** | clases de surf san sebastián · curso de surf principiantes zurriola · bonos de surf donostia | comercial local (reserva) | **P1** | Ya tiene `Service`+`Course` JSON-LD y FAQPage (`surf-classes-faqs.json`). Acción: **citas numéricas citables para GEO** (duración, ratio, precio «desde») y enlace cruzado a /tablas-alquiler y /servicios/webcams. |
| `/servicios/taquillas` | **taquillas de surf zurriola** | guardar tabla de surf donostia · taquilla playa donostia precio · taquillas surf san sebastián | local comercial (alta recurrencia) | **P1** | Ruta nueva indexable (2026-08-24). Acción: **FAQPage candidato** («¿Puedo guardar mi tabla? ¿Incluye duchas? ¿Se puede mensual?») → GEO + rich results. Enlace desde home y /tablas-alquiler. |
| `/tablas-alquiler` | **alquiler de tablas de surf donostia** | alquilar tabla surf san sebastián · precio alquiler tabla zurriola · alquiler tabla + neopreno | comercial local (impulso) | **P1** | Acción: **FAQPage candidato** («¿Incluye neopreno? ¿Precio por día? ¿Depósito?») y H1 que incluya la kw exacta (verificar SEO actual de la página: no aparece en `PublicPageSeoService`). |
| `/servicios/webcams` | **webcam zurriola** | webcam zurriola en directo · cámara mar zurriola · parte de olas donostia · previsión de surf san sebastián | transaccional diario (tráfico local) | **P1** | **Buque insignia GEO**. Demanda REAL confirmada (GSC zurriolacam 16m, CSV en `data/gsc-zurriolacam-2026-08/`): "webcam zurriola" **2.427 clics / 163.169 imp / pos 4,63** y la familia completa de cámara en top-6; **83 % móvil**; CTR 1,49 % en pos 4,63 → meta/parte con números para ganar el clic. El 301 de enero transfiere ese ranking a esta página. Acción: respuesta citable de 2–3 frases («¿Cómo está el mar hoy en Zurriola?») |
| `/servicios/surf-skate` | **clases de surfskate donostia** | surfskate san sebastián · aprender surfskate guipúzcoa | comercial local | **P2** | Ya tiene `Service`+`Course`. Acción: enlace cruzado con /servicios/surf (misma familia «clases»). |
| `/servicios/surf-trips` | **surf trip desde san sebastián** | excursiones de surf donostia · surf trips landas desde donostia | comercial | **P2** | Ya tiene `Service`. Acción: enlazar a /servicios/webcams (lectura del mar) y al Taller #17 (interpretar parte). |
| `/segunda-mano` | **tablas de surf segunda mano donostia** | comprar tabla surf usada san sebastián · tabla surf segunda mano guipúzcoa | comercial nicho | **P2** | **Oportunidad de nicho** (COMPETENCIA doc §3: poca competencia en búsquedas). Acción: FAQ («¿Cómo compro? ¿Estado de las tablas?») + enlace desde /tienda y Taller #4/#5/#12 (elegir tabla). |
| `/tienda` | **tienda de surf san sebastián** | material de surf donostia · tienda surf zurriola | comercial | **P2** | Ya tiene `CollectionPage`. Enlazar a /segunda-mano (mismo buyer) y a fichas de producto. |
| `/servicios/reparacion-neoprenos` | **reparar neopreno donostia** | arreglo neopreno san sebastián · reparación traje de neopreno | comercial local | **P2** | Ya tiene `Service`. Enlace desde /servicios (hub) y Taller #2 (reparar tabla — misma intención «arreglar»). |
| `/servicios/fotos` | **fotos de surf zurriola** | fotógrafo de surf donostia · fotos sesión de surf san sebastián | comercial | **P3** | Ya tiene `Service`. Enlazar desde /servicios/webcams (quien mira las olas, quiere su foto). |
| `/servicios/videograbaciones` | **vídeo de surf san sebastián** | análisis de surf en vídeo zurriola · grabación sesión de surf | comercial | **P3** | Ya tiene `Service`. Mismo enlace desde webcams. |
| `/servicios` (hub) | (ver nota) | — | hub navegación | **P3** | ⚠️ **Nota de auditoría:** el meta de `/servicios` hoy dice «Reparación de tablas | …» (foco taller Edy). Verificar si es intencional; si el hub debe vender la escuela completa, su kw sería «servicios de surf donostia». Decisión de negocio, no cambio. |
| `/nosotros` | san sebastian surf school zurriola | club de surf donostia · escuela de surf en la playa de zurriola | marca/trust | **P3** | Ya tiene `AboutPage` + NAP (Paseo Colón 41, 2026-08-27). |
| `/contacto` | contactar escuela de surf donostia | teléfono escuela surf san sebastián | transaccional contacto | **P3** | Ya tiene `ContactPage` + `ContactPoint`. |
| `/taller` + 18 artículos | (informacional — **ya mapeado en `SEO_MATRIX.md`**) | — | informacional | P2 | Regla: **no colar kw comerciales en el blog** (anti-canibalización). Los artículos enlazan a las páginas money (CTA natural). |
| `/tablas-alquiler/soft`, `hard_basic`, `hard_pro` | variantes de nivel («tabla soft», «tabla hard pro») | — | comercial filtro | P3 | Proteger de canibalización interna: solo matizan la página madre; canonical y copy diferenciados por nivel. |
| `/servicios/surf-skate/guia-equipamiento` | (guía informacional — fuera del alcance money) | — | informacional | P3 | Ya tiene `WebPage`. Enlaza a /servicios/surf-skate. |
| `/subastas` | — | — | (auth) | — | `robots.txt` la excluye (auth). COMPETENCIA doc §3 la señaló como nicho, pero requiere login: **decisión de negocio** si algún día se hace pública una vitrina indexable. |

---

## 3) Clusters y enlaces internos (Fase 2 — implementación en Cursor)

- **Clases:** `/servicios/surf` ↔ `/servicios/surf-skate` ↔ `/servicios/surf-trips` → enlaces cruzados + CTA reserva.
- **Tablas:** `/tablas-alquiler` (+3 categorías) ↔ `/servicios/taquillas` (guardar) ↔ `/tienda` (comprar) ↔ `/segunda-mano` (usada).
- **Playa/GEO:** `/servicios/webcams` ↔ Taller #17 (interpretar parte) ↔ home (teaser GEO) ↔ `/servicios/fotos` y `/servicios/videograbaciones`.
- **Reparación:** `/servicios` (hub) ↔ `/servicios/reparacion-neoprenos` ↔ Taller #2 (reparar tabla).

**Anti-canibalización clave (una kw por página, sin duplicar):**
| Keyword | Solo en |
|---|---|
| escuela de surf donostia / san sebastián | `/` (home) |
| clases de surf donostia | `/servicios/surf` |
| alquiler de tablas de surf donostia | `/tablas-alquiler` |
| webcam zurriola | `/servicios/webcams` |
| taquillas de surf zurriola | `/servicios/taquillas` |
| tablas de surf segunda mano donostia | `/segunda-mano` |

---

## 4) Plan GEO (optimización para motores de respuesta: ChatGPT, Perplexity, AI Overviews)

S4 ya es **líder GEO local** (webcams + forecast + FAQ JSON-LD; auditoría 2026-08-24). Próximos pasos:

1. **Citas numéricas citables** en `/servicios/surf` (duración, ratio, precio «desde») — los motores de IA citan números concretos.
2. **FAQPage nuevos:** `/servicios/taquillas`, `/tablas-alquiler`, `/segunda-mano` (mismo patrón `*_faqs.json` + `FaqPageJsonLdService`).
3. **FAQPage del Taller** (lo dejó pendiente `SEO_DONE.md` §Pendientes): ahora sí recomendable, 5–6 FAQs generales.
4. **Webcams:** mantener frescura diaria del parte + respuesta corta «¿Cómo está el mar hoy en Zurriola?» (2–3 frases, número + dirección del viento).
5. **Entidad local:** re-alimentar datos del schema si el rebrand cambia nombre/dirección (pendiente de `COMPETENCIA_SEO_DONOSTIA.md` §4b).

### 4b. Parte de olas — keywords reales y formato citable (nuevo 2026-08-28)

**Fuente:** GSC de zurriolacam (captura del dueño). El parte de olas de `/servicios/webcams` debe cubrir:

| Keyword no-marca (ganable) | Demanda observada | Nota |
|---|---|---|
| parte de olas zurriola / donostia | real (artículo zurriolacam + variantes) | kw principal del parte |
| previsión olas zurriola · oleaje zurriola | ~22 imp | cubrir en el texto del parte |
| viento zurriola (demanda de "windguru zurriola" ~363 imp) | alta | el parte ya da viento propio; reforzarlo como dato visible |
| interpretar parte de olas | (Taller #17) | enlace interno natural desde el parte |

**Formato citable (GEO):** el parte debe abrir con 2–3 frases con números — «Hoy en Zurriola: olas de 0,8 m con período de 11 s y viento sur. Buena opción para iniciación; el nivel avanzado tendrá que esperar a la tarde.» — que es lo que citan ChatGPT/AI Overviews (misma idea que la sección 4 punto 4).

**Transferencia 301 (enero):** "camaramar zurriola" (~3.800 imp) + "webcam zurriola" (~2.700 imp) + marca "zurriolacam" pasan de zurriolacam a `/servicios/webcams` → el parte hereda la audiencia diaria de cámara.

---

## 5) Oportunidades contra la competencia (solo datos verificados de `COMPETENCIA_SEO_DONOSTIA.md`)

- **Freesurf (Sagues) hackeada/rota** → sus términos («escuela de surf sagues», «escuela surf donostia») están regalados; atacables desde home + `GEO` de Zurriola.
- **Kresala y Bera Bera** atraen tráfico con webcam/forecast → S4 ya los supera en producto (parte diario + mareas + resumen IA); consolidar con las FAQs GEO de la sección 4.
- **Nicho sin competencia:** segunda mano (kw «tablas de surf segunda mano donostia») y taquillas a pie de playa.

---

## 6) Datos que faltan (no inventados — así se mide)

| Dato | Herramienta | Cómo me lo pasas |
|---|---|---|
| Volumen mensual y estacionalidad | Google Keyword Planner (gratis, con cuenta de Ads) | Export/CSV o captura de las kw de la sección 2 |
| Impresiones/clics/posición reales | Google Search Console | Export de queries (últimos 3–6 meses) |
| Dificultad (KD) y SERP | Ahrefs / Semrush / Ubersuggest (opcional) | Export o captura |
| Ranking actual de la app | Search Console + búsquedas manuales | — |

Con esos datos actualizo este mapa con columnas `volumen` / `dificultad` / `prioridad_final` (ej. Puntuación = relevancia × conversión ÷ dificultad) y un plan de contenido por trimestre. **Hasta entonces, las prioridades de la sección 2 son cualitativas (fiables en intención, no en volumen).**

---

## 7) Próximos pasos

1. (Hecho) Este mapa — Reasonix, `docs/taller-seo/KEYWORDS-CONVERSION.md`.
2. **Pendiente dueño:** export de GSC + Keyword Planner (sección 6) para fijar prioridad final.
3. **Pendiente (de 2026-08-04, sin retomar):** análisis de keywords de la competencia (qué kw posiciona cada rival y de dónde saca tráfico) → `COMPETENCIA_SEO_DONOSTIA.md` §4.
4. **Implementación (Cursor):** metas/FAQ/enlaces internos por página según este mapa + sección 3/4 (respetando `.cursor/rules/seo-geo-public.mdc` y `PublicPageSeoService`).
