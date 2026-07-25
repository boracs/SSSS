# Taller SEO — cierre técnico (Paso 4)

**Fecha:** 2026-07-25  
**Estado:** 16/18 HECHO editorial + cable SeoHead/DTO · 2 POSPONER editorial (#1, #15)  
**Fuente de ángulos:** `docs/taller-seo/SEO_MATRIX.md`

---

## Inventario 18

| # | slug | kw_principal | meta_title | imagen | estado |
|---|------|--------------|------------|--------|--------|
| 1 | `el-kit-del-surfista-guia-esencial-de-equipamiento` | equipamiento básico para surfear | (legado seed) | — | POSPONER editorial |
| 2 | `guia-practica-como-reparar-una-tabla-de-surf` | reparar tabla de surf | Cómo reparar una tabla de surf (Solarez y más) | `reparar-tabla-surf-solarez-paso-a-paso.webp` | HECHO |
| 3 | `manual-de-surf-seguridad-convivencia-y-localismo` | normas de prioridad en el surf | Normas de prioridad y seguridad en el surf | `normas-prioridad-surf-lineup.webp` | HECHO |
| 4 | `cual-es-la-tabla-de-surf-ideal-para-aprender` | tabla de surf para principiantes | Mejor tabla de surf para principiantes | `softboard-tabla-principiantes-espuma.webp` | HECHO |
| 5 | `como-saber-si-tu-tabla-de-surf-se-ha-quedado-pequena` | cuándo cambiar de tabla de surf | Cuándo cambiar de tabla de surf (señales claras) | `progresion-cambiar-tabla-surf.webp` | HECHO |
| 6 | `que-debo-tener-en-cuenta-al-reservar-una-clase-de-surf` | reservar clase de surf | Qué mirar antes de reservar una clase de surf | `reservar-clase-surf-checklist.webp` | HECHO |
| 7 | `guia-de-corrientes-en-la-playa-…` | corrientes de resaca en la playa | Cómo detectar corrientes de resaca en la playa | `corrientes-resaca-playa-senales.webp` | HECHO |
| 8 | `que-aprendere-en-mi-primera-clase-…` | primera clase de surf | Qué aprenderás en tu primera clase de surf | `primera-clase-surf-teoria-arena.webp` | HECHO |
| 9 | `de-que-materiales-esta-hecha-…` | materiales de una tabla de surf | De qué materiales está hecha una tabla de surf | `materiales-tabla-surf-epoxi-poliester.webp` | HECHO |
| 10 | `a-que-edad-puede-un-nino-…` | edad para empezar a surfear niños | A qué edad puede un niño empezar a surfear | `ninos-iniciacion-surf-playa.webp` | HECHO |
| 11 | `guia-completa-partes-de-una-tabla-…` | partes de una tabla de surf | Partes de una tabla de surf y para qué sirven | `partes-tabla-surf-diagrama-etiquetado.webp` | HECHO |
| 12 | `medidas-de-las-tablas-de-surf-…` | volumen en litros de una tabla de surf | Volumen y medidas de tablas de surf (guía) | `volumen-litros-tabla-surf-guia.webp` | HECHO |
| 13 | `guia-de-olas-y-rompientes-…` | tipos de rompientes de surf | Tipos de rompientes: beach, reef y point break | `tipos-rompientes-beach-reef-point.webp` | HECHO |
| 14 | `donde-colocarse-en-el-agua-…` | posicionarse en el pico de surf | Dónde colocarse en el pico para coger más olas | `posicionamiento-pico-surf-referencias.webp` | HECHO |
| 15 | `que-titulacion-se-necesita-…` | titulación instructor de surf en España | (legado seed) | — | POSPONER editorial |
| 16 | `como-hacer-el-pato-en-surf-duck-dive` | cómo hacer el pato en surf | Cómo hacer el pato (duck dive) en surf | `duck-dive-pato-surf-tecnica.webp` | HECHO |
| 17 | `como-interpretar-el-parte-de-olas-…` | interpretar el parte de olas | Cómo interpretar un parte de olas (forecast) | `interpretar-parte-olas-periodo-swell.webp` | HECHO |
| 18 | `como-saber-en-que-direccion-rompe-una-ola` | ola de derecha o de izquierda | Cómo saber si una ola es de derecha o izquierda | `ola-derecha-izquierda-explicacion.webp` | HECHO |

Imágenes en `public/img/taller/` (salvo POSPONER).

---

## Qué se migró a SeoHead / DTO (Paso 4)

| Pieza | Detalle |
|-------|---------|
| `PublicPageSeoService::tallerIndex()` | WebPage (CollectionPage) + Organization · path `/taller` |
| `PublicPageSeoService::tallerArticle(Article)` | Article + WebPage + Organization · `og:type=article` · `og:image` = 1ª `<img src>` del content o fallback `/img/brand/og-share.jpg` |
| `ArticleController` | Pasa `seo` → `toArray()` del DTO (sin arrays SEO montados a mano) |
| `Taller/Index.jsx` / `Taller/Show.jsx` | `<SeoHead seo={seo} />` · eliminadas metas legacy duplicadas en Show |
| Canonical | Absoluto vía `APP_URL` (`/taller`, `/taller/{slug}`) |
| JSON-LD Article | headline, description, image, datePublished/dateModified, author/publisher Organization S4 |
| Sitemap | Sin cambio de lógica: ya listaba `/taller` + 18 slugs · cache invalidada con `forgetCache()` |

---

## Cómo probar

1. Abrir view-source (o DevTools → Elements → `<head>`) en:
   - `http://127.0.0.1:8000/taller`
   - `http://127.0.0.1:8000/taller/que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes`
2. Comprobar: `<title>`, `meta[name=description]`, `link[rel=canonical]`, `meta[property=og:image]`, `meta[property=og:type]` (`article` en show), scripts `application/ld+json` (Organization, WebPage, Article).
3. `http://127.0.0.1:8000/sitemap.xml` → `/taller` + 18 `/taller/{slug}`.
4. `http://127.0.0.1:8000/robots.txt` → Allow públicos + `Sitemap: {APP_URL}/sitemap.xml`.

**Invalidar cache sitemap (si hace falta tras cambios masivos):**

```php
app(\App\Services\Seo\PublicSitemapService::class)->forgetCache();
```

Clave cache: `seo.sitemap.xml.v1` (TTL 1 h).

---

## Pendientes conscientes

- **#1** kit: rewrite ángulo S4 original (anti-duplicado).
- **#15** titulación: rewrite anclado a BOE + FESurfing (riesgo legal).
- **GEO FAQPage** del Taller: opcional futuro (no en este cierre).
- Contenido editorial de #1/#15 intacto a propósito (POSPONER); siguen en sitemap como URLs existentes.

---

*Documento de cierre Paso 4. No modifica artículos.*
