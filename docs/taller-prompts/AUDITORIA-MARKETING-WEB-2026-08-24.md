# Auditoría marketing, diseño, SEO y GEO — Web pública S4

> **Fecha:** 2026-08-24  
> **Metodología:** Agente Marketing (`AGENTE-MARKETING-DISENO.md` — skills S1 + S8 + S9), contrastada con código real del repo (no DeepSeek sin verificar).  
> **Nota global sitio público:** **7,4 / 10**  
> **Ejecución ítem a ítem:** usar `PROMPT-EJECUCION-AUDITORIA-MARKETING.md`

---

## Leyenda

| Campo | Significado |
|-------|-------------|
| **Sev** | P0 = bloqueante / pérdida de negocio · P1 = importante · P2 = mejora |
| **Urgencia** | Alta · Media · Baja |
| **Estado** | `PENDIENTE` · `EN CURSO` · `HECHO` · `DESCARTADO` |
| **KPI** | Métrica que mejora si se corrige |

---

## Puntos fuertes transversales (mantener)

1. **SEO técnico:** `SeoHead` + `PublicPageSeoService` en casi todas las landings públicas; canonical, OG, JSON-LD centralizados.
2. **Schema ya implementado (verificado en código):**
   - Home: `LocalBusiness` + `Organization` (+ preload LCP).
   - Contacto: `ContactPage`.
   - Ficha producto: `Product` con precio, stock, SKU.
   - Taller artículo: `Article`.
   - Redes: `sameAs` vía `AcademySocialLinks` (YouTube, Facebook, TikTok, Instagram).
3. **GEO local:** Webcams y home con previsión surf; copy orientado Donostia/Zurriola; sitemap con prioridades altas en `/servicios/surf` y `/servicios/webcams`.
4. **Identidad visual:** cyan/teal S4, Montserrat en headings, CTAs claros en servicios/clases.
5. **Mejoras recientes (no re-auditar como fallo):** tags en productos (`ProductTagPills`), redes footer, carrito móvil horizontal, colaboradores Bunker (`sponsorStrip`), overflow PDP corregido.

---

## Tabla maestra de hallazgos (orden de ejecución recomendado)

| ID | Sev | Urgencia | Estado | Dónde | Problema | Cómo corregir | KPI | Archivos clave |
|----|-----|----------|--------|-------|----------|---------------|-----|----------------|
| **A1** | P0 | Alta | HECHO | `/servicios/taquillas` (canonical) | Landing indexable con SeoHead + sitemap; redirects 301 desde `/taquillas/*`; robots sin disallow `/taquillas` | Implementado 2026-08-24: ruta `/servicios/taquillas`, `serviciosTaquillas()`, CTA «Reservar taquilla» | Leads taquilla / SEO local | Ver registro ejecución |
| **A2** | P1 | Alta | HECHO | Funnel tienda/compra | Modo claro/oscuro partido | Tienda + Carrito + Contacto en `lightModePages`; tienda estilo claro alineado con PDP | Coherencia marca | `app.jsx`, `Tienda.jsx` |
| **A11** | P2 | Baja | HECHO | Global | `html lang` en inglés por defecto | `lang="es"` en `app.blade.php` | i18n/SEO | `resources/views/app.blade.php` |
| **A3** | P1 | Alta | HECHO | `/carrito` | Solo `<Head title>`; sin meta `noindex` | `PublicPageSeoService::carrito()` + `SeoHead` con `noindex, nofollow` | Crawl budget | Ver registro ejecución |
| **A4** | P1 | Media | HECHO | `/servicios/surf` | Sin FAQPage JSON-LD | `surf-classes-faqs.json` + `SurfClassesFaqService` + `FaqPageJsonLdService` | Rich results / GEO | Ver registro ejecución |
| **A5** | P1 | Media | HECHO | `/tienda` móvil | Filtro tags: pills ocultas en móvil | Pills scroll horizontal + `min-h-11` táctil; select móvil eliminado | Conversión tienda móvil | `Tienda.jsx` |
| **A6** | P2 | Media | HECHO | Footer / `/contacto` | Sin mapa / NAP visual | `AcademyLocation` + `AcademyLocationPanel` + enlace Maps en footer | Confianza local / GBP | Ver registro ejecución |
| **A7** | P2 | Media | HECHO | Home `/` | Testimonios genéricos | Contexto servicio/fecha + nota «opiniones reales resumidas» | CRO home | `Pag_principal.jsx` |
| **A8** | P2 | Baja | HECHO | Tags producto | Tags no filtraban tienda | `ProductTagPills` linkable → `/tienda?tag=`; `initialTag` en Tienda | Descubrimiento catálogo | `ProductTagPills.jsx`, `Tienda.jsx`, `Producto.jsx`, `ProductoVer.jsx` |
| **A9** | P2 | Baja | HECHO | `/subastas` | Sin SeoHead noindex | `subastasIndex/Show/Access` + SeoHead | Crawl budget | `PublicPageSeoService.php`, `Auctions/*` |
| **A10** | P2 | Baja | HECHO | Chatbot FAB + PDP sticky | Solapamiento FAB / sticky / footer móvil | Altura real barra (ResizeObserver) + `--s4-footer-overlap-h` en scroll | UX móvil | `Chatbot.jsx`, `ProductStickyPurchaseBar.jsx`, `floatingDockOffset.js` |
| **A11** | P2 | Baja | HECHO | Global | `html lang` en inglés por defecto | `lang="es"` en `app.blade.php` (+ `og:locale` ya en SeoHead) | i18n/SEO | `resources/views/app.blade.php` |

---

## Auditoría por página

### Home `/` — Nota **8,2/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Baja | Hero denso en móvil; valorar un solo CTA primario above the fold | — |
| Media | Testimonios poco creíbles | A7 |
| Baja | Preload LCP OK; vigilar peso imágenes hero | — |

**SEO/GEO:** ✅ `SeoHead`, LocalBusiness, Organization. Fortaleza del sitio.

---

### Nosotros `/nosotros` — Nota **7,8/10**

| Urgencia | Hallazgo |
|----------|----------|
| Media | Página larga; falta índice ancla sticky en móvil |
| Baja | Micro-servicios club: buen ancla `#micro-servicios-club`; enlazar desde taquillas |
| Baja | Galería: alt descriptivos (“Zurriola”, “taquillas S4”) |

**SEO:** ✅ AboutPage + breadcrumbs.

---

### Contacto `/contacto` — Nota **7,5/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Media | Sin mapa / “Cómo llegar” visual | A6 |
| Baja | Formulario: confirmar `aria-live` en éxito | — |

**SEO:** ✅ ContactPage.

---

### Tienda `/tienda` — Nota **7,0/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Alta | Contraste claro/oscuro vs PDP/pedidos | A2 |
| Media | Filtros tags móvil débiles | A5 |
| Baja | Banner acceso socios: CTA claro a login/taquillas | — |

**SEO:** ✅ SeoHead + sitemap daily 0.8. Tags en cards ✅.

---

### Ficha producto `/producto-ver/{id}` — Nota **7,6/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Baja | Schema Product ✅ | — |
| Media | Tags no enlazan a filtro tienda | A8 |
| Baja | Sticky bar vs chatbot z-index | A10 |

**Modo:** claro forzado (`lightModePages`) — coherente con cards `s4-surface-light`.

---

### Carrito `/carrito` — Nota **6,8/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Alta | Meta noindex explícita | A3 |
| — | UX fila horizontal móvil ✅ (2026-08-24) | — |

---

### Servicios hub `/servicios` — Nota **7,2/10**

| Urgencia | Hallazgo |
|----------|----------|
| Media | Grid homogéneo; destacar clases + alquiler como estrella |
| Baja | Enlaces internos taller/segunda mano OK |

**SEO:** ✅ SeoHead.

---

### Clases de surf `/servicios/surf` — Nota **8,0/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Media | FAQ schema “precio clases surf Donostia”, “nivel principiante” | A4 |
| Baja | Selector “mi nivel” (localStorage) ✅ buen CRO | — |

**Sitemap:** priority 0.9 weekly ✅.

---

### Webcams `/servicios/webcams` — Nota **8,5/10**

| Urgencia | Hallazgo |
|----------|----------|
| Baja | Líder GEO vs competencia; mantener copy “Zurriola en directo” |
| Baja | VideoObject schema opcional |

---

### Surf-skate, trips, fotos, vídeo, neoprenos — Nota **7,0–7,5/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Media | FAQ + enlazado cruzado a clases/alquiler | A4 |
| Baja | Guía equipamiento skate: buen long-tail | — |

Todas con `SeoHead` ✅.

---

### Taller `/taller` + artículos — Nota **7,5/10**

| Urgencia | Hallazgo |
|----------|----------|
| Baja | Article schema ✅ en show |
| Media | Index: fecha/autor visible (E-E-A-T) |
| Baja | Modo claro ✅ |

---

### Segunda mano `/segunda-mano` — Nota **7,3/10**

| Urgencia | Hallazgo |
|----------|----------|
| Media | Fichas: revisar fotos placeholder / condition en schema |
| Baja | CTA vender si hay flujo |

**SEO:** ✅ SeoHead + URLs dinámicas en sitemap.

---

### Alquiler `/tablas-alquiler` — Nota **7,6/10**

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| Media | Listado oscuro vs ficha clara | A2 |
| Baja | Categorías soft/hard en sitemap ✅ | — |

---

### Planes taquillas `/taquillas/planes-y-cuotas` — Nota **4,5/10** ⚠️

| Urgencia | Hallazgo | ID |
|----------|----------|-----|
| **Alta** | Sin title/meta/OG | A1 |
| **Alta** | robots bloquea `/taquillas` entero | A1 |
| Media | Falta CTA único “Reservar taquilla” → contacto/login | A1 |
| Baja | Diseño navy coherente | — |

**Decisión negocio obligatoria antes de implementar A1.**

---

### Subastas `/subastas` — N/A marketing público

- robots `Disallow: /subastas` ✅
- Solo `<Head title>` — aceptable (A9 opcional)

---

### Auth / área cliente

- Login, pedidos, academia: no indexables ✅
- Pedidos: modo claro ✅
- Academia: oscuro (herramienta) — OK

---

## Design system — colores y tipografía

| Aspecto | Estado | Urgencia | Notas |
|---------|--------|----------|-------|
| Primarios cyan/teal + navy | ✅ Consistente marketing oscuro | — | |
| Tipografía Inter + Montserrat | ✅ Bien | Baja | Unificar pesos H1 |
| Modo claro/oscuro por ruta | ⚠️ Partido | **Alta** | Ver A2 |
| Contraste WCAG | ⚠️ Revisar `text-slate-400` en claro | Media | |
| Targets táctiles ≥44px | ⚠️ Filtros tienda móvil | Media | Ver A5 |
| Admin vs público | ✅ Separados | — | |

**Referencia modo:** `resources/js/app.jsx` líneas 43–60 (`lightModePages`).

---

## SEO / GEO — matriz

| Área | Nota | Gap principal |
|------|------|---------------|
| Sitemap + robots | 8/10 | Taquillas públicas bloqueadas (A1) |
| JSON-LD | 8/10 | FAQ servicios (A4) |
| Meta / OG | 7/10 | Taquillas + carrito noindex (A1, A3) |
| Local Donostia/Zurriola | 8/10 | Mapa footer (A6) |
| Long-tail contenido | 7/10 | Taller + guía skate OK |
| sameAs redes | ✅ | Mantener `.env` social URLs |

**Competencia:** ver `docs/COMPETENCIA_SEO_DONOSTIA.md`.  
**Reglas implementación SEO:** `.cursor/rules/seo-geo-public.mdc`.

---

## Quick wins (orden sugerido)

1. **A3** — noindex carrito (rápido, sin decisión negocio)
2. **A5** — pills tags móvil tienda
3. **A1** — requiere decisión URL/indexación taquillas
4. **A4** — FAQ clases surf (piloto)
5. **A2** — unificación tema (mayor esfuerzo)

---

## Correcciones a informes externos (anti-alucinación)

Estos puntos **NO son fallos** (ya implementados — no reimplementar):

| Afirmación incorrecta | Realidad en repo |
|-----------------------|------------------|
| “Home sin LocalBusiness” | ✅ Implementado en `PublicPageSeoService` |
| “Producto sin schema Product” | ✅ `producto()` con Product node |
| “Contacto sin ContactPage” | ✅ Implementado |
| “Taller sin Article” | ✅ `tallerArticle()` |
| “Sin sameAs redes” | ✅ `AcademySocialLinks::sameAsUrls()` |

---

## Registro de ejecución

| ID | Fecha | Quién | Resultado |
|----|-------|-------|-----------|
| **A1** | 2026-08-24 | Cursor | Ruta indexable `/servicios/taquillas`; SEO `serviciosTaquillas()`; SeoHead; sitemap priority 0.85; robots sin block `/taquillas`; 301 desde legacy; CTA «Reservar taquilla»; chatbot path actualizado |
| **A3** | 2026-08-24 | Cursor | `PublicPageSeoService::carrito()` noindex + SeoHead en `Carrito.jsx`; prop `seo` en ambos returns del controller |
| **A5** | 2026-08-24 | Cursor | Pills tags visibles en móvil (scroll horizontal, min-h-11); eliminado select duplicado en `Tienda.jsx` |
| **A8** | 2026-08-24 | Cursor | Tags clicables en cards/PDP → `/tienda?tag=`; `ProductTagPills` con botón + `initialTag` en controller |
| **A4** | 2026-08-24 | Cursor | FAQPage JSON-LD en `/servicios/surf` (6 FAQs, precios desde config) |
| **A6** | 2026-08-24 | Cursor | Mapa + NAP en `/contacto`; enlace Maps en footer; `AcademyLocation` compartido Inertia |
| **A10** | 2026-08-24 | Cursor | Chat FAB: altura sticky medida + offset footer en scroll (`floatingDockOffset.js`) |
| **A7** | 2026-08-24 | Cursor | Testimonios home con contexto (servicio/fecha) + disclaimer |
| **A9** | 2026-08-24 | Cursor | Subastas: SeoHead noindex en index/show/access |
| **A2** | 2026-08-25 | Cursor | Funnel tienda/compra en modo claro; Tienda rediseñada light |
| **A11** | 2026-08-25 | Cursor | `lang="es"` fijo en app.blade.php |

---

## Changelog documento

| Fecha | Cambio |
|-------|--------|
| 2026-08-24 | Reasonix validó hallazgos A1–A3 contra código; matices A1 (sin title), A4 (patrón webcams), A11 og:locale |
| 2026-08-24 | Auditoría inicial completa (Cursor + agente marketing, verificado contra código) |
