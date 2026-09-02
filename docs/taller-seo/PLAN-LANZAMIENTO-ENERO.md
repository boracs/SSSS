# Plan de lanzamiento SEO/GEO — enero (app S4)

**Fecha:** 2026-08-28 · **Autor:** Reasonix · **Alcance:** plan por fases (docs; 0 código).
**Base:** `KEYWORDS-CONVERSION.md` (kw por página) · `KEYWORDS-COMPETENCIA.md` (huecos) · `ZURRIOLACAM-301-PLAN.md` (301) · GSC real de zurriolacam 16m (`data/gsc-zurriolacam-2026-08/`) · SEO técnico ya implementado (`SeoHead` + `PublicPageSeoService` + sitemap + FAQ JSON-LD).
**Regla:** sin volúmenes inventados; medir con GSC/GA propios desde el día 1.

---

## Fase 0 · Fundación técnica (antes de abrir al público)

| # | Tarea | Quién | Esfuerzo |
|---|---|---|---|
| 0.1 | Rebrand final: **nombre cerrado** («San Sebastián Surf School» / S4), **dominio oficial `sansebastiansurfschool.com`** (decisión dueño 2026-08-28; `.es`/`.eu` → 301 al `.com`), logos (ya existen: `public/img/brand/` navy+white × full/hero/mark/nav), textos | Dueño + Cursor | M |
| 0.2 | **301 de zurriolacam → app** (mapa completo en `ZURRIOLACAM-301-PLAN.md` §2) — hereda top-5 de la familia de cámara | Cursor/despliegue | M |
| 0.3 | Verificar la tabla indexable/noindex según `.cursor/rules/seo-geo-public.mdc` + sitemap + `robots.txt` | Cursor | S |
| 0.4 | **Alta GSC + GA4** de la app desde el día 1 + envío de sitemap + petición de indexación de las ~20 URL money | Dueño (con ayuda) | S |
| 0.5 | Re-alimentar schema LocalBusiness/Organization con datos del rebrand (nombre, dirección, geo, horario) | Cursor | S |

**KPI fase 0:** indexación del 100 % de las URL money en GSC (comprobar en «Indexación > Páginas»).

---

## Fase 1 · Primera oleada (semanas 1–2 tras lanzar) — donde ya hay demanda y poca competencia

**Objetivo:** capturar el tráfico heredado del 301 y los huecos libres. Páginas priorizadas según `KEYWORDS-CONVERSION.md` + `KEYWORDS-COMPETENCIA.md`:

| Página | Kw principal | Por qué primero |
|---|---|---|
| `/servicios/webcams` (+parte) | webcam zurriola / parte de olas donostia | Hereda 2.427 clics/16m del 301; único rival: Bera Bera |
| `/servicios/taquillas` | taquillas de surf zurriola | Rivales básicos sin planes online |
| `/servicios/surf-skate` | clases de surfskate donostia | **Terreno libre** (nadie lo ataca) |
| `/tablas-alquiler` | alquiler de tablas de surf donostia | Competida pero ganable con precio+reserva online |
| `/segunda-mano` | tablas de surf segunda mano donostia | Nicho (solo Groseko, débil) |

**Acciones por página:** verificar H1 único + title/description como copy (backend `SeoHead`), FAQ si aplica, enlaces internos del cluster (sección 3 de `KEYWORDS-CONVERSION.md`).

**Retoques pendientes de la página webcams (P1-2/P1-3 del agente marketing):**
- P1-2: frase citable del parte (2-3 frases con números) en HTML inicial o meta/JSON-LD → GEO (GPTBot lee peor el JS). SEO técnico → Cursor con `seo-geo-public.mdc`.
- P1-3: mención natural "la cámara de la Zurriola en directo" en el intro (refuerza "camaramar zurriola", ~291 clics/16m).

**KPI fase 1:** posición media < 10 para las 5 kw principales antes del día 30.

---

## Fase 2 · Conversión y GEO (semanas 3–4)

| # | Tarea | Por qué | Quién |
|---|---|---|---|
| 2.1 | **FAQPage nuevos**: taquillas, tablas-alquiler, segunda mano (patrón `*_faqs.json` + `FaqPageJsonLdService`) | Rich results + citas de IA | Cursor |
| 2.2 | **Citas numéricas** en `/servicios/surf` (duración, ratio, precio «desde») | ChatGPT/AI Overviews citan números | Cursor |
| 2.3 | FAQPage del **Taller** (5-6 FAQs; quedó opcional en `SEO_DONE.md`) | Consolidar bloque educativo | Cursor |
| 2.4 | Verificar CTA P0-1 (ya implementado) con analítica encendida | Medir el primer KPI real | Dueño (revisa GA) |

**KPI fase 2:** presencia en AI Overviews / sesiones AI Assistant > 0; CTR de "webcam zurriola" > 2 % (hoy 1,49 % en zurriolacam).

---

## Fase 3 · Contenido del Taller (mes 2) — sin canibalizar

Regla de `SEO_MATRIX.md`: **el blog no ataca kw comerciales**. Entrar por long-tail donde Kresala no domina:

| Artículo propuesto (ángulo) | Kw objetivo | Nota |
|---|---|---|
| Clases de surf para principiantes en Donostia: qué esperar | clases de surf principiantes donostia | Kresala ataca el genérico; nosotros el long-tail + local |
| Surf para niños en la Zurriola (guía para familias) | surf niños donostia | Ya existe #10 en matriz; ángulo local nuevo |
| Bonos y packs de clases: cómo elegir | bonos de clases de surf | Comercial ligera; enlaza a /servicios/surf |
| Segunda mano vs tienda: cómo comprar tu primera tabla | tabla surf segunda mano donostia | Alimenta /segunda-mano y /tienda |

Cada artículo con `kw_principal` única + enlace interno a su página money + FAQ citable. **KPI:** 3 artículos en top-20 a los 60 días.

---

## Fase 4 · Medición y ajuste (mes 3)

- Revisar GSC: qué queries reales llegan → cruzar con `KEYWORDS-CONVERSION.md` (columna volumen real).
- Detectar queries nuevas no cubiertas → huecos de contenido.
- Revisar GA: embudo webcam → clases (¿el CTA P0-1 convierte?).
- Decidir con datos: ampliar FAQ, escribir nuevos artículos o atacar kw comerciales de Kresala de frente.

**Regla del proyecto:** nada de esto inventa volúmenes; si se necesita Keyword Planner/Ahrefs, se integra el dato real.

---

## Qué NO hacer en enero

- ❌ No duplicar contenido entre zurriolacam y la app (mientras viva zurriolacam, sus artículos quedan como están; tras el 301, el Taller es el único dueño).
- ❌ No atacar "pukas"/marcas ajenas (windguru, ingurumena, camaramar oficial): solo cubrir la necesidad con producto propio.
- ❌ No poner CTAs secundarios que compitan con el CTA único (AP-8/AP-9).

*Plan de Reasonix 2026-08-28. Ejecución: Cursor (implementación), dueño (decisiones rebrand + accesos GSC/GA). Registrado en `COORDINACION.md`.*
