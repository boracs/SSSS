# Competencia SEO / Presencia digital — Escuelas de surf de Donostia

**Fecha:** 2026-08-04 · **Origen:** sesión de análisis (conversación guardada en memoria)
**Contexto:** el dueño tiene un sistema propio (Laravel 11 + React/Inertia, webcam + forecast + e-commerce + chatbot IA + reservas con Stripe + TicketBAI). Quiere saber dónde está frente a la competencia y cómo robar tráfico SEO.

---

## 1. Estado digital de la competencia (verificado 2026-08-04)

| Escuela | Web | Reservas online | Pago online | Tienda | Webcam/forecast | Chatbot | Blog/SEO | Login/clientes |
|---|---|---|---|---|---|---|---|---|
| **Pukas** (marca grande, 1973, ~52K IG) | pukassurf.com + pukassurfshop.com (Shopify) | Sí (Bloowatch SS / Shopify Zarautz) | Sí | Sí (Shopify, board builder 3D) | No | No | Sí (blog shop) | Sí (Shopify) |
| **Zurriola Surf Eskola** | zurriolasurfeskola.com (WordPress) | Sí (Bloowatch) | Sí | No | No | No | No | No |
| **Kresala** | kresalasurf.com (WP+WooCommerce) | Sí (Bloowatch) | Sí | Sí (WooCommerce) | Enlace externo | No | Sí (/blog/) | No |
| **Bera Bera** (desde 1999) | beraberasurf.com (Duda) | No (form+tel) | No | No | Sí (webcam in2thebeach + forecast embebido) | No | No | No |
| **Groseko Indarra** ("Groskeo", 4.9★ 348 reseñas) | grosekoindarra.com (WP+Woo) | No (WhatsApp) | No | Sí (merch WooCommerce) | No | No | No | Sí (área privada socios) |
| **Freesurf** (Sagues) | freesurfeskola.com ⚠️ **HACKEDA/ROTA** (HTTP 500 + spam casinos) | No | No | Rota | No | No | No | No |
| **Zuaizti/Zuhaizti** | zuhaiztisurfkluba.com (plantilla mínima) | No | No | No | No | No | No | No |
| **Kulba** | ❌ No existe web de escuela "Kulba" en Donostia | — | — | — | — | — | — | — |
| **Indarra** | = Groseko Indarra; indarra.eus es placeholder | — | — | — | — | — | — | — |

**Estándar del sector:** Bloowatch (SaaS de reservas) lo usan Pukas SS, Zurriola y Kresala. Tiendas: Shopify (Pukas) / WooCommerce (Kresala, Groseko).

## 2. Veredicto competitivo

- **La app propia está POR ENCIMA de todas**: nadie tiene sistema integrado (reservas+pago+tienda+gestión+taquillas+bonos+chatbot+forecast+facturación).
- **Diferenciadores únicos que NADIE tiene:** chatbot IA con RAG sobre el negocio, subastas de segunda mano, forecast/webcam/parte diario generado con IA, gestión admin completa.
- **Único rival con peso real: Pukas** (marca/SEO de marca + Shopify fuerte). No competir en textil — ganar en reserva+chatbot+forecast+SEO local.

## 3. Oportunidades SEO detectadas

- **Freesurf hackeada/rota** → su SEO local está regalado (términos tipo "escuela surf Donostia/Sagues").
- **Kresala y Bera Bera** atraen tráfico con webcam/forecast → superarlos con forecast propio mejor (mareas + resumen IA + actualización diaria).
- Mayoría sin reserva online → el que convierte, gana.
- Nicho de nicho: subastas segunda mano (poca competencia en búsquedas).

## 4. PRÓXIMO PASO (pendiente)

**Análisis de keywords de la competencia + cómo consiguen tráfico:**
- [ ] Qué palabras clave posiciona cada competidor (Kresala, Bera Bera, Zurriola, Pukas, Groseko, Freesurf)
- [ ] De dónde les viene el tráfico (orgánico, redes, directorios tipo Funly/Yumping/Turismo Euskadi, reseñas Google)
- [ ] Ranking actual de nuestra app (una vez con el rebrand y dominio propio)
- [ ] Plan de contenido SEO: artículos del Taller, páginas de forecast/webcam, fichas de servicio, landing de reserva
- [ ] Monitorización: Search Console, Google Business, reseñas

## 4b. Estado SEO técnico de la app (verificado 2026-08-04) ✅

**La app YA tiene el SEO técnico mejor del sector local:**
- ✅ Sitemap XML dinámico (`/sitemap.xml`): páginas estáticas + 16 artículos Taller + productos + segunda mano + tablas alquiler, con lastmod/changefreq/priority
- ✅ robots.txt dinámico (controlador, no estático)
- ✅ **8 tipos de schema JSON-LD** en `app/Services/Seo/PublicPageSeoService.php`: Organization, SportsActivityLocation (con PostalAddress+GeoCoordinates+Place), WebSite, Service, Course, Product+Offer, Article, WebPage (About/Contact/FAQ)
- ✅ Meta tags completos (title, description, canonical, robots, OG, Twitter) en `resources/js/components/seo/SeoHead.jsx`
- ✅ Preloads LCP para Core Web Vitals

**Pendiente técnico (con rebrand):**
- [ ] Re-alimentar datos del schema: nombre, dirección, geo, teléfono, horario (hoy apuntan a Zurriola/S4 en PublicPageSeoService + ZurriolaGeoFactsService)
- [ ] Verificar indexación y sitemap en Google Search Console
- [ ] Oportunidad: rich results del forecast/webcam (contenido diario fresco, nadie lo explota)

**Plan de rebrand (cuando se tenga el repo):** nombre + logos + textos + chatbot re-alimentado + forecast/webcams a nombre propio + dominio + Stripe/TicketBAI propios.

---

## ⏰ RECORDATORIO

**Si el 2026-08-07 (3 días después de guardar esto) no se ha avanzado nada del punto 4 o del rebrand → recordar al dueño** retomar el análisis de keywords de la competencia y el plan SEO.
