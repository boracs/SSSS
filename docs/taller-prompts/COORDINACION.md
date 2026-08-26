# Coordinación de trabajo — Reasonix/DeepSeek ↔ Cursor

**Contrato dúo:** `docs/taller-prompts/CONTRATO-IA.md` — roles, router y anti-pisotón; este documento es el pizarrón de estado compartido.

**Backlog personal del dueño** (incompletos / “no olvidar”): `docs/TAREAS-PENDIENTES.md` — no confundir con este pizarrón de IAs.

**Regla de oro: nadie toca nada sin analizar antes.** Antes de responder, proponer o editar archivos, leer: (1) este documento, (2) el estado real del código, (3) el mapa del proyecto. Así no se solapan, pisan ni rehacen cosas ya hechas.

## Cuándo se usa

- El trabajo sobre `maider_0` se reparte entre **esta sesión (taller de prompts)** y **Cursor**.
- Según el tipo de prompt y los archivos que toque, el usuario pedirá a uno u otro.
- Este documento es el **punto de encuentro**: qué hay en curso, qué está hecho y por quién. Los dos lo leemos antes de actuar.

## Pre-vuelo obligatorio (antes de tocar nada)

1. Leer este archivo (`docs/taller-prompts/COORDINACION.md`).
2. Leer la sección **Estado actual** y **Última actividad**: si la tarea ya está hecha o en curso por el otro, **no repetirla**.
3. Analizar los archivos reales antes de responder o proponer:
    - `docs/PROJECT_TREE_FOR_GEMINI.md` → rutas y dominios (no inventar directorios).
    - Los archivos concretos que la tarea implica → leerlos, no asumir.
    - Buscar Services/Actions/DTOs existentes antes de crear nuevos (reutilizar antes que crear).
4. Si la tarea va a tocar archivos y no está reclamada: reclamarla en **Estado actual** antes de empezar (quién + qué + cuándo).

## Cómo reclamar una tarea

Añadir/actualizar una fila en **Estado actual**:

```
| [fecha] | [tarea] | [Reasonix | Cursor] | EN CURSO | [archivos que tocará] |
```

## Cómo cerrar una tarea

1. Comprobar que no se pisó ninguna zona del otro (revisar **Última actividad**).
2. Marcar `EN CURSO` → `HECHO` en **Estado actual**.
3. Añadir una entrada en **Última actividad** (1-2 líneas: qué se hizo, por quién, resultado).
4. Si se crearon/renombraron/eliminaron archivos de app o recursos: actualizar `docs/PROJECT_TREE_FOR_GEMINI.md`.

## Zonas que NO se pisan sin avisar

| Zona                                                  | Por qué                                                                                                                                                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.cursorrules`, `.cursor/skills/*`, `.cursor/rules/*` | Configuración de Cursor; solo se edita si el usuario lo pide                                                                                                                                         |
| `docs/ia/*` (protocolos)                              | Solo se actualizan si el propio protocolo lo exige                                                                                                                                                   |
| Services existentes (`app/Services/*`)                | Se extienden, no se duplican                                                                                                                                                                         |
| Código de la aplicación                               | Esta sesión no lo edita; solo genera/mejora prompts                                                                                                                                                  |
| `docs/aprendizaje/*` (Libro de Aprendizaje)           | **Decisión del dueño (2026-08-10): lo alimentan ambas IAs** (Reasonix y Cursor). Anti-duplicado: leer `INDICE.md` antes de escribir, no repetir conceptos y registrar el autor en el log de entradas |

## Flujo de eficiencia de tokens (nuevo 2026-08-11 — lo aplican AMBAS IAs)

**Objetivo:** flujo de trabajo profesional que ahorra tokens y mantiene contexto limpio. Documentado en `docs/aprendizaje/05-flujos-de-trabajo.md` §5.6–5.10 y reglas A-D en `INDICE.md`.

1. **Libro de Aprendizaje con criterio (A-D):** guardar solo conceptos reutilizables/estables/no duplicados, cada uno en un solo tema, formato fijo (Qué es → Por qué → En tu proyecto → Para recordar, ≤200 palabras), mantenimiento (ampliar/podar/corregir), autores anotados en el log.
2. **Resúmenes, no transcripciones:** nunca volcar chats ni `.md` enteros; usar resúmenes compactos + contexto por demanda (router `RUTAS-CONTEXTO.json`: cargar solo la fila del tema, nunca todo).
3. **Aviso de reinicio de chat:** cuando el chat sea largo y el historial viejo ya no aporte a la tarea actual, añadir al final: _"se recomienda reiniciar chat para ahorrar tokens"_ (cuesta ~50 tokens; releer el contexto cuesta 100k+). Criterio: chat largo + contexto obsoleto; NO avisar si reiniciar perdería contexto útil. Antes de reiniciar, ofrecer guardar lo importante (ritual "guardar y reiniciar").
4. **Ritual «fin de chat» → `HANDOFF.md` (ambas IAs):**
    - Disparadores: _fin de chat_, _cierro chat_, _guardar y reiniciar_, _handoff_.
    - Acción: **sobrescribir** `docs/taller-prompts/HANDOFF.md` con un resumen corto (meta + hecho + a medias + archivos clave). Máx. ~15–20 líneas útiles. **No** acumular historial; **no** volcar Q&A literales; **no** matching por hora.
    - Opcional: 1 línea en `Última actividad` («handoff escrito»).
    - Responder al usuario: handoff listo + puede abrir chat nuevo con _«sigo con el handoff»_.
5. **Puente de continuidad (chat nuevo — solo si el tema encaja):**
    - En **todo** chat nuevo: leer `Estado actual` + `Última actividad` (ya obligatorio en pre-vuelo).
    - **Si** el usuario dice _«sigo con el handoff»_ / _«sigo con el chat que acabo de cerrar»_ **o** el tema encaja con `HANDOFF.md` + 3–5 entradas recientes de `Última actividad` → leer `HANDOFF.md` y abrir con **puente corto** (máx. 5 viñetas).
    - **Si** el tema es nuevo / no relacionado → **no** resumir; ignorar handoff salvo pre-vuelo de COORDINACION.
    - **Prohibido:** pegar “últimas 5 preguntas y respuestas” del chat anterior; asociar chats por reloj.

## Estado actual

| 2026-08-26 | PDP: crash sticky bar + 403 PNG ya convertido a WebP | Cursor | HECHO | `ProductoVer.jsx`, `CatalogImageService.php`, `ProductDetailPageService.php` |
| 2026-08-26 | Tienda cards: contraste light (A2 residual surface=dark sobre fondo blanco) | Cursor | HECHO | `Tienda.jsx`, `Producto.jsx`, `StoreAddToCartButton.jsx` |
| 2026-08-26 | Upgrade Laravel 11 → 12 (local, sin features) | Cursor | HECHO | `composer.json`, `composer.lock`, `ProductoController.php`, `docs/PROJECT_TREE_FOR_GEMINI.md` |
| 2026-08-25 | Pipeline imágenes catálogo: máster 1600 + thumb 640 WebP, borrar RAW | Cursor | HECHO | `CatalogImageService`, writers admin, payloads listado, `images:backfill-catalog-thumbs`, `docs/EN-EL-MOMENTO-DE-DESPLEGAR.md` |
| 2026-08-25 | Pipeline imágenes ronda 2: orden seguro subir→borrar, thumbs en galería pública subasta/2ª mano, sin Service Locator en modelos, mimes surfboard | Cursor | HECHO | `SecondHandBoardController.php` (admin+público), `AuctionController.php`, `SurfboardController.php`, `StoreProductCatalogService.php`, `Auction.php`, `SecondHandBoard.php`, `Producto.php`, `AuctionCatalogService.php`, `SecondHandPublicCatalogService.php`, `ProductDetailPageService.php`, `PedidoController.php`, `Auctions/Show.jsx`, `SecondHand/Show.jsx`, `StoreSurfboardRequest.php`, `UpdateSurfboardRequest.php` |
| 2026-08-25 | Segunda mano público: filtros URL, reservadas, ficha (formato/H1/WhatsApp/placeholder) | Cursor | HECHO | `SecondHandPublicCatalogService`, `SecondHandCatalogFilters`, `SecondHand/{Index,Show}.jsx` |
| 2026-08-25 | Prompt pipeline imágenes catálogo v3 (tras crítica Reasonix) | Cursor | HECHO | `docs/taller-prompts/PROMPT-CATALOG-IMAGE-PIPELINE.md` |
| 2026-08-24 | Webcam DVR: acortar barra a ventana jugable (sin tramo izquierdo muerto) | Cursor | HECHO | `ZurriolaWebcamPlayer.jsx` |
| 2026-08-24 | Webcam DVR: thumb al vivo (final de barra) hasta que el usuario rebobine | Cursor | HECHO | `ZurriolaWebcamPlayer.jsx` |
| 2026-08-24 | Segunda mano catálogo: lazy-load fotos (SafeImage) | Cursor | HECHO | `SecondHand/Index.jsx`, `SecondHandBoard.php`, `SecondHandBoardController.php` |
| 2026-08-24 | Webcam: DVR freeze al recargar + barra seek | Cursor | HECHO | `ZurriolaWebcamPlayer.jsx` |
| 2026-08-24 | Horario: recuperar slider (ocultar solo la barra, no el deslizamiento) | Cursor | HECHO | `WeatherDetailPanel.jsx`, `SurfForecastTable.jsx` |
| 2026-08-24 | ForecastSlider: sin barra nativa (`overflow-x-hidden`; arrastre + flechas) | Cursor | HECHO | `SurfForecastTable.jsx`, `WeatherDetailPanel.jsx` |
| 2026-08-24 | Tiempo detallado: quitar scroll lateral también del horario | Cursor | HECHO | `WeatherDetailPanel.jsx`, `Servicios_Webcams.jsx` |
| 2026-08-24 | Tiempo detallado: días arriba + horas abajo (master→detalle) | Cursor | HECHO | `WeatherDetailPanel.jsx` |
| 2026-08-24 | Webcam: barra DVR no se veía (seekable HLS vacío) | Cursor | HECHO | `ZurriolaWebcamPlayer.jsx` |
| 2026-08-24 | Webcam: barra DVR + «Volver al directo» (P2) | Cursor | HECHO | `ZurriolaWebcamPlayer.jsx`, `Servicios_Webcams.jsx` |
| 2026-08-24 | Webcam: barra seek vs percepción «en directo» (S1+S6 → S3+S10) | Reasonix | HECHO (P2 dueño+Cursor) | `PROMPT-UX-WEBCAM-BARRA-DIRECTO.md` |
| 2026-08-24 | Auditoría marketing web completa (10 hallazgos A1–A10 + por página) — documento maestro + prompt ejecución ítem a ítem | Cursor | HECHO | `docs/taller-prompts/AUDITORIA-MARKETING-WEB-2026-08-24.md`, `PROMPT-EJECUCION-AUDITORIA-MARKETING.md` |
| 2026-08-24 | A3 SEO carrito noindex (`SeoHead` + `PublicPageSeoService::carrito()`) | Cursor | HECHO | `PublicPageSeoService.php`, `CarritoController.php`, `Carrito.jsx` |
| 2026-08-24 | A5 tienda — pills tags móvil scroll + targets 44px | Cursor | HECHO | `Tienda.jsx` |
| 2026-08-24 | A8 tags clicables → filtro tienda (`?tag=`) | Cursor | HECHO | `ProductTagPills.jsx`, `Tienda.jsx`, `TiendaController.php`, `Producto.jsx`, `ProductoVer.jsx` |
| 2026-08-24 | A4 FAQPage JSON-LD clases surf (`surf-classes-faqs.json`) | Cursor | HECHO | `SurfClassesFaqService.php`, `FaqPageJsonLdService.php`, `PublicPageSeoService.php` |
| 2026-08-24 | A6 mapa/NAP contacto + footer (`AcademyLocationPanel`) | Cursor | HECHO | `AcademyLocation.php`, `AcademyLocationPanel.jsx`, `Contacto.jsx`, `Footer.jsx`, `HandleInertiaRequests.php` |
| 2026-08-24 | A10 chatbot FAB — offset sticky real + footer | Cursor | HECHO | `Chatbot.jsx`, `ProductStickyPurchaseBar.jsx`, `useStickyPurchaseBarHeight.js`, `floatingDockOffset.js` |
| 2026-08-24 | A7 testimonios + A9 subastas noindex | Cursor | HECHO | `Pag_principal.jsx`, `PublicPageSeoService.php`, `Auctions/*`, `AuctionController.php` |
| 2026-08-25 | FAB chat/subir: offset footer + sync global en PublicLayout | Cursor | HECHO | `floatingDockOffset.js`, `FloatingDockOffsetSync.jsx`, `PublicLayout.jsx`, `Chatbot.jsx` |
| 2026-08-25 | Rediseño bloque Google Reviews (auditoría marketing S1 → frontend) | Cursor | HECHO | `GoogleReviewsBadge.jsx`, `Pag_principal.jsx`, `AcademyLocationPanel.jsx` |
| 2026-08-25 | A2 + A11 — funnel claro + lang es | Cursor | HECHO | `app.jsx`, `Tienda.jsx`, `app.blade.php` |
| 2026-08-24 | Ejecución backlog auditoría marketing — **11/11 HECHO** | Dueño + Cursor | HECHO | Ver `AUDITORIA-MARKETING-WEB-2026-08-24.md` |
| 2026-08-24 | A1 SEO taquillas: `/servicios/taquillas` indexable + redirects + SeoHead | Cursor | HECHO | `PublicPageSeoService.php`, `PlanesTaquillasController.php`, `PlanesTaquillasPublic.jsx`, `PublicSitemapService.php`, `routes/web.php`, `chatbot_pages.php` |
| 2026-08-24 | Handshake marketing↔SEO (M1–M10) + mejoras agente frontend (F1–F8): edición de docs | Reasonix | HECHO | `AGENTE-MARKETING-DISENO.md`, `marketing-diseno/SKILL.md`, `RUTAS-CONTEXTO.json`, `MASTER-PROMPT-DEEPSEEK.md` |
| 2026-08-24 | Tags producto: píldoras en cards tienda + carrito (`ProductTagPills`) | Cursor | HECHO | `ProductTagPills.jsx`, `Producto.jsx`, `Carrito.jsx`, `CarritoController.php` |
| 2026-08-24 | Agente `/despliegue-ops` (persona + skill + router + enlaces) | Reasonix | HECHO | `AGENTE-DESPLIEGUE-OPS.md`, `.reasonix/skills/despliegue-ops/SKILL.md`, `RUTAS-CONTEXTO.json`, `CONTRATO-IA.md`, `MASTER-PROMPT-DEEPSEEK.md`, `AGENTS.md` |
| 2026-08-23 | Header: share Inertia `cart.count` para badge del carrito | Cursor | HECHO | `HandleInertiaRequests.php` |
| 2026-08-23 | H6: limpiar estado muerto «No hay unidades disponibles» en `canBuy` (inalcanzable) | Reasonix | HECHO | `ProductPurchaseCta.jsx` |
| 2026-08-22 | PDP sticky: filete marca s4 + miniatura izq. + logo solo `sm+` | Cursor | HECHO | `store/ProductStickyPurchaseBar.jsx` |
| 2026-08-22 | PDP sticky: pill inline + miniatura 48/56px (marketing + UX) | Cursor | HECHO | `store/ProductStickyPurchaseBar.jsx` |
| 2026-08-22 | PDP sticky: «En tu carrito» sin recortar (miniatura a la dcha.) | Cursor | HECHO | `store/ProductStickyPurchaseBar.jsx` |
| 2026-08-22 | PDP: reducir hueco blanco entre relacionados y footer (móvil) | Cursor | HECHO | `ProductoVer.jsx` |
| 2026-08-22 | PDP sticky: pill «En tu carrito: N» tras añadir (estado local) | Cursor | HECHO | `ProductoVer.jsx`, `store/ProductStickyPurchaseBar.jsx` |
| 2026-08-16 | Refactor acordeones F2–F3: SecondHand, Rentals, Commander, Bonos, Nosotros | Cursor | HECHO | SecondHand, Rentals/Surfboards, Commander, Client/Bonos, Nosotros (+ AccordionTrigger API) |
| 2026-08-16 | Refactor acordeón: AccordionTrigger + ExpandableText; migrar ChevronDown (sin SecondHand/Bonos) | Cursor | HECHO | `ui/AccordionTrigger.jsx`, `ui/ExpandableText.jsx`, Pedidos, SurfBriefMini, Clients, Vigencia, Datafono, Surfboards |
| 2026-08-20 | Extraer ContactBlock (Edy/Willy) en servicios reparación | Cursor | HECHO | `ContactBlock.jsx`, `Servicios.jsx`, `Servicios_ReparacionNeoprenos.jsx` |
| 2026-08-20 | a11y acordeón fila-cliente: Clients + Vigencia desktop | Cursor | HECHO | `Clients.jsx`, `Vigencia.jsx` |
| 2026-08-21 | Banner promo: /tienda bleed bajo menú; H1 debajo; ficha tras la card | Cursor | HECHO | `StorePromoBanner.jsx`, `Tienda.jsx`, `ProductoVer.jsx` |
| 2026-08-21 | Banner promo placement: full-bleed bajo menú vs Volver/crumbs (S1+S7) | Reasonix | HECHO (dueño + Cursor) | `PROMPT-UX-BANNER-PROMO-PLACEMENT.md` |
| 2026-08-22 | Footer marca: Instagram + YouTube + Facebook + TikTok (config .env) | Cursor | HECHO | `FooterSocialLinks.jsx`, `AcademySocialLinks.php`, `Footer.jsx`, `config/services.php` |
| 2026-08-20 | GlobalNav móvil: aria-expanded en secciones con submenú | Cursor | HECHO | `GlobalNav.jsx` |
| 2026-08-21 | Banner promo: sin pastilla de precio (solo CTA) | Cursor | HECHO | `StorePromoBanner.jsx` |
| 2026-08-21 | PDP sticky: feedback carrito «En carrito · N» (estado local addedQty, UI-only) | Cursor (prompt Reasonix) | HECHO | `ProductoVer.jsx`, `ProductStickyPurchaseBar.jsx` |
| 2026-08-21 | PDP ficha: «Precio socio» persistente + ancla precio tachado en sticky bar + hint cantidad sin duplicar stock | Reasonix | HECHO | `ProductoVer.jsx`, `ProductStickyPurchaseBar.jsx` |
| 2026-08-21 | Scroll lateral PDP: guard `overflow-x: clip` global + blindaje breadcrumbs/título | Reasonix | HECHO | `app.css`, `Breadcrumbs.jsx`, `ProductoVer.jsx` |
| 2026-08-20 | Planes socio: quitar copy redundante bajo «Qué incluye» | Cursor | HECHO | `PlanesTaquillasClient.jsx` |
| 2026-08-20 | Planes socio: taquilla nº en la misma fila que el título | Cursor | HECHO | `PlanesTaquillasClient.jsx` |
| 2026-08-21 | Mejora agente marketing: fixes skill↔MD, +S12, Sev/KPI, few-shot | Reasonix | HECHO | `AGENTE-MARKETING-DISENO.md`, `.reasonix/skills/marketing-diseno/SKILL.md` |
| 2026-08-20 | Planes socio: hero sin subtítulo ni chip Micro-servicios | Cursor | HECHO | `PlanesTaquillasClient.jsx` |
| 2026-08-20 | Planes socio: amenities solo título, 1 fila en lg | Cursor | HECHO | `PlanesTaquillasClient.jsx` |
| 2026-08-20 | Taquilla planes: TicketBAI izq. + Factura (sin Recibo) | Cursor | HECHO | `StoreFiscalInvoiceActions.jsx`, `PlanesTaquillasClient.jsx` |
| 2026-08-19 | Taquilla planes: factura + TicketBAI en historial | Cursor | HECHO | `TaquillaMembershipService.php`, `PlanesTaquillasClient.jsx`, `StoreFiscalInvoiceActions.jsx` |
| 2026-08-19 | PDP sticky: justify-between (precio | foto | CTA) | Cursor | HECHO | `ProductStickyPurchaseBar.jsx` |
| 2026-08-19 | Footer marca: quitar eslogan y Escríbenos duplicado | Cursor | HECHO | `Footer.jsx` |
| 2026-08-19 | Chatbot: tono cercano + nombre BD + preguntar nivel | Cursor | HECHO | `S4BusinessContextService`, `ChatbotDisplayName`, `ChatbotAgentService` |
| 2026-08-19 | Footer: quitar @ Instagram duplicado; «Escríbenos» bajo el icono | Cursor | HECHO | `Footer.jsx` |
| 2026-08-19 | Banner promo selector: marketing (S1+S7) → UX (S3+S10) | Reasonix | EN CURSO | `PROMPT-UX-BANNER-PROMO-SELECTOR.md` |
| 2026-08-19 | Banner promo: dots/selector más profesional y separado del CTA | Cursor | HECHO | `StorePromoBanner.jsx` |
| 2026-08-19 | Nav: chevron en icono cuenta (menú pedidos/perfil) | Cursor | HECHO | `GlobalNav.jsx` |
| 2026-08-20 | Banner promo: foto real producto + thumb + copy ahorro | Cursor | HECHO | `StorePromoBannerService`, `StorePromoSlideDto`, `StorePromoBanner.jsx` |
| 2026-08-19 | UX Mis pedidos: rediseño tarjeta (estado protagonista, Link único) | Cursor | HECHO | `Pedidos.jsx` |
| 2026-08-19 | Estrellas: bandas viento sur/norte × kJ (entrevista dueño) | Cursor | HECHO | `zurriola-spot-logistics.json`, `SurfLevelQualityStarsService` |
| 2026-08-19 | Parte: mismo recetario estrellas/nivel/JSON (sin contradicciones) | Cursor | HECHO | logistics JSON, `SurfLevelRecommender`, `SurfDailyBriefService`, guía spot |
| 2026-08-19 | Mis pedidos: solo `pagado=true` (no huérfanos Stripe) | Cursor | HECHO | `PedidoController.php`, `PedidoListTest.php` |
| 2026-08-19 | Fusionar JSON spot + estrellas + parte Gemini | Cursor | HECHO | `zurriola-spot-logistics.json`, `SurfLevelQualityStarsService`, `SurfForecastTableService`, `SurfDailyBriefService` |
| 2026-08-16 | Modo compartir: rebuild + túnel Cloudflare | Cursor | HECHO | `.env` APP_URL/TUNNEL_SHARE, `public/hot`, cloudflared, artisan serve |
| 2026-08-16 | Datáfono: columna Hacienda + comunicar efectivo a B2B | Cursor | HECHO | `DatafonoHaciendaStatusDto`, reconciliation, controller, `Datafono/Index.jsx`, tests |
| 2026-08-16 | VIP historial: créditos numéricos + layout móvil | Cursor | HECHO | `VipProfileDashboard.jsx` |
| 2026-08-16 | Pedidos: Ver factura (PDF) + Ver TicketBAI | Cursor | HECHO | `PedidoController.php`, `Pedidos.jsx`, `Pedido.jsx`, `StoreFiscalInvoiceActions.jsx` |
| 2026-08-16 | Mis facturas: Ver factura / Ver TicketBAI + estados pendientes claros | Cursor | HECHO | `MyInvoices.jsx`, `FiscalInvoiceStatus.php` |
| 2026-08-16 | Carrito: confirmar cantidad al 2º clic + factura subastas en Mis facturas | Cursor | HECHO | `Producto.jsx`, `StoreCartQtyPrompt.jsx`, `FiscalInvoiceCategory`, builder, list service |
| 2026-08-16 | Badge factura en trámite clicable en Mis pedidos | Cursor | HECHO | `Pedidos.jsx` |
| 2026-08-16 | Fix TypeError PedidoController Producto typehint (namespace) | Cursor | HECHO | `PedidoController.php` |
| 2026-08-16 | Fix PaymentConfirmed::dispatch named params (pago/exito 500) | Cursor | HECHO | `PaymentConfirmed.php`, `PaymentSuccessController.php`, webhook, sync command |
| 2026-08-16 | Ops local: verificar cron `schedule` + cola (liberar stock tienda / facturas) | Cursor | HECHO | `StoreOrderStockService`, `composer.json` (`schedule:work`), tests |
| 2026-08-16 | P2 checkout tienda: Action + banner promo configurable | Cursor | HECHO | `CreateStoreCheckoutAction`, `StartsCheckout`, `config/store.php`, `PedidoController` |
| 2026-08-16 | P1 catálogo tienda: extraer lógica de ProductoController a Service | Cursor | HECHO | `StoreProductCatalogService`, `StoreProductWriteDto`, `ProductoController` |
| 2026-08-16 | P0 dinero tienda: totales en céntimos + verificar total del carrito | Cursor | HECHO | `StoreProductPricing`, `StoreOrderStockService`, `CarritoController`, `PedidoController` |
| 2026-08-16 | P0 stock tienda: lockForUpdate + liberar pedidos Stripe no pagados | Cursor | HECHO | `StoreOrderStockService`, `PedidoController`, `store:release-unpaid`, `config/store.php` |
| 2026-08-16 | B2B: enviar neto (IVA incluido en web, no doblar 21%) | Cursor | HECHO | `MoneyCents.php`, `B2BRouterFiscalInvoiceIssuer.php` |
| 2026-08-16 | Factura TBAI: reemitir pedido 21 + no perder evento en /pago/exito | Cursor | HECHO | `PaymentSuccessController.php` |
| 2026-08-16 | Pedido Stripe: persistir payment_method=card | Cursor | HECHO | `PedidoController.php`, `PaymentGatewayService.php` |
| 2026-08-16 | UX banner promo: overlay + WebP (spec diseñador) | Cursor | HECHO | `StorePromoBanner.jsx`, `StorePromoBannerService` (rutas .webp), `public/img/store/promo-*.webp` |
| 2026-08-16 | UX banner promo: brief + 3 fotos IA + prompt diseñador | Cursor → Reasonix | HECHO | `public/img/store/promo-*.png`, `PROMPT-UX-BANNER-PROMO-TIENDA.md` |
| 2026-08-16 | Banner promo tienda: 3 slides (bono / subasta / producto) | Cursor | HECHO | `StorePromoBannerService`, `StorePromoSlideDto`, `StorePromoBanner.jsx`, Tienda + ProductoVer |
| 2026-08-16 | Banner subastas en Tienda: diseño UX (Reasonix) → luego Cursor | Reasonix → Cursor | HECHO | `SubastasBanner.jsx`, `TiendaController.php`, `ProductoController.php`, `Tienda.jsx`, `ProductoVer.jsx` |
| 2026-08-16 | PDP: más aire arriba/abajo slider relacionados | Cursor | HECHO | `ProductoVer.jsx`, `Contenedor_productos.jsx` |
| 2026-08-16 | Home: unir Explora S4 + teaser club (un solo bloque) | Cursor | HECHO | `HomeExploraDirectorio.jsx`, `Pag_principal.jsx` |
| 2026-08-16 | Home: fundidos progresivos en más cortes (no solo Explora) | Cursor | HECHO | `SectionEdgeFade.jsx`, `Pag_principal.jsx`, `HomeExploraDirectorio.jsx`, `OpcionesIntro.jsx`, `Contenedor_productos.jsx` |
| 2026-08-16 | Home: degradado Explora S4 → GEO (sin corte navy/blanco) | Cursor | HECHO | `HomeExploraDirectorio.jsx`, `Pag_principal.jsx`, `HomeGeoTeaser.jsx` |
| 2026-08-16 | Home: quitar HomeGeoTeaser (ruido GEO duplicado) | Cursor | HECHO | `Pag_principal.jsx`, `Pag_principalController.php` |
| 2026-08-16 | Tienda: VIP→#500 automático; taquilla física compra sin VIP | Cursor | HECHO | `VipMembershipService`, `User`, `VerificarTaquilla`, `TaquillaController` |
| 2026-08-16 | Webcams/parte: botón Compartir (Web Share + copiar enlace) | Cursor | HECHO | `SharePageButton.jsx`, `Servicios_Webcams.jsx`, `SurfBriefParteToday.jsx` |
| 2026-08-16 | PDP: quitar highlights genéricos (uso/recogida/precio) | Cursor | HECHO | `ProductDetailPageService.php`, `ProductoVer.jsx` |
| 2026-08-16 | Home: full-bleed Explora+Nosotros; fusionar ofertas↔OpcionesIntro (sin franja blanca) | Cursor | HECHO | `Pag_principal.jsx`, `HomeExploraDirectorio.jsx`, `Contenedor_productos.jsx` |
| 2026-08-16 | Ofertas socios: banda full-bleed (fondo navy a todo el ancho) | Cursor | HECHO | `Contenedor_productos.jsx`, `Pag_principal`, Taller, `ProductoVer` |
| 2026-08-16 | Ofertas socios: variante clara (fondo blanco + cards light en home/PDP/Taller) | Cursor | HECHO | `Contenedor_productos.jsx`, `Producto.jsx` |
| 2026-08-16 | Home directorio: flecha CompactLink visible en móvil (no solo hover) | Cursor | HECHO | `HomeExploraDirectorio.jsx` |
| 2026-08-16 | PDP producto: quitar hint carrito + copy ventajas exclusivas | Cursor | HECHO | `ProductPurchaseCta.jsx`, `ProductoVer.jsx` |
| 2026-08-15 | Subastas: grid 2 cols móvil + cards densas (familia tienda/2ª mano) | Cursor | HECHO | `Auctions/Index.jsx` |
| 2026-08-14 | 2ª mano: grid 2 cols móvil + cards densas (patrón tienda) | Cursor | HECHO | `SecondHand/Index.jsx` |
| 2026-08-12 | FAB móvil: chat+↑ también con sesión admin; scrollY robusto | Cursor | HECHO | `Chatbot.jsx`, `PublicLayout.jsx` |
| 2026-08-12 | Taller: apartado escuela (marea, parte, momento) en artículo reservar clase | Cursor | HECHO | `taller_articles.php` + BD |
| 2026-08-12 | Taller: omitir cierre débil «S4 Academia / checklist» en artículo reservar clase | Cursor | HECHO | `taller_articles.php` + BD |
| 2026-08-12 | Taller Show: lectura estimada según palabras (mín. 1, sin suelo 3) | Cursor | HECHO | `Taller/Show.jsx` |
| 2026-08-12 | Cache ZurriolaGeoFactsService (filemtime + remember) | Cursor | HECHO | `ZurriolaGeoFactsService.php` |
| 2026-08-12 | GEO webcams: quitar card «Día de clase» + CTAs (fuera de contexto) | Cursor | HECHO | `ZurriolaGeoGuide.jsx` |
| 2026-08-12 | Iconos meteo: color por tipo (sol/nube/lluvia) | Cursor | HECHO | `WeatherDetailPanel.jsx`, slider, overlay |
| 2026-08-12 | Tiempo detallado: días clicables → horario de ese día | Cursor | HECHO | `WeatherDetailPanel.jsx`, `OpenMeteoWeatherClient.php`, cache v2 |
| 2026-08-12 | Webcam: «Ver tiempo» bajo player (izq.) + panel visible al abrir | Cursor | HECHO | `Servicios_Webcams.jsx` |
| 2026-08-12 | Webcam: CTA «Ver tiempo» arriba (Reasonix UX) + quitar duplicado abajo | Cursor | HECHO → ajustado | `Servicios_Webcams.jsx` |
| 2026-08-12 | Forecast detalle: icono lluvia en % + CTA aclara olas+tiempo (sin 3er botón) | Cursor | HECHO | `SurfDetailedForecastSlider.jsx`, `SurfForecastTable.jsx`, `SurfFullForecastOverlay.jsx` |
| 2026-08-12 | Admin verify email: middleware + flag OFF local + allowlist .env | Cursor | HECHO | `EnsureAdminVerified.php`, `config/auth.php`, `routes/web.php`, tests |
| 2026-08-12 | Quitar breadcrumbs visibles (mantener JSON-LD backend) | Cursor | HECHO | `Servicios_Webcams.jsx`, `Nosotros.jsx`, `Contacto.jsx` |
| 2026-08-12 | FAQ GEO webcams: título fuera de caja + brief UX para Reasonix | Cursor | HECHO (quick win) / pendiente UX Reasonix | `ZurriolaGeoGuide.jsx` |
| 2026-08-12 | GEO tabla energía: nota orientativa + responsabilidad bajo la tabla | Cursor | HECHO | `zurriola-geo-facts.json`, DTO/Service, `ZurriolaGeoGuide.jsx` |
| 2026-08-12 | GEO tabla energía: franjas progresivas 100–400…≥2500 kJ (JSON) | Cursor | HECHO | `zurriola-geo-facts.json`, `zurriola-spot-logistics.json` |
| 2026-08-12 | FAQ GEO Zurriola: enlaces internos (Taller, webcam, parte, temporada) | Cursor | HECHO | `zurriola-geo-facts.json`, `ZurriolaGeoGuide.jsx`, `ZurriolaGeoFactsService.php` |
| 2026-08-12 | Taller: artículo parte de olas — añadir Energía a los números | Cursor | HECHO | `taller_articles.php` + BD Article |
| 2026-08-12 | Webcams: quitar «escuela a 20 m» del hero/señal (queda en GEO/SEO) | Cursor | HECHO | `Servicios_Webcams.jsx` |
| 2026-08-12 | Webcams SEO fase 3: OG image Zurriola + primaryImageOfPage JSON-LD | Cursor | HECHO | `PublicPageSeoService.php` |
| 2026-08-12 | Webcams SEO fase 2: FAQ ampliada + enlace Taller + timestamp visible | Cursor | HECHO | `zurriola-geo-facts.json`, `Servicios_Webcams.jsx`, `SurfForecastTable.jsx`, `SurfForecastSheetFooter.jsx` |
| 2026-08-12 | Webcams SEO fase 1: H2 forecast + breadcrumbs UI/JSON-LD + anchors footer/nav | Cursor | HECHO | `Servicios_Webcams.jsx`, `PublicPageSeoService.php`, `Footer.jsx`, `GlobalNav.jsx` |
| 2026-08-12 | SEO/GEO home MVP: WebPage+description + HomeGeoTeaser + alts + prop zurriolaGeo | Cursor | HECHO | `PublicPageSeoService.php`, `Pag_principalController.php`, `HomeGeoTeaser.jsx`, `Pag_principal.jsx`, mapa |
| 2026-08-12 | ContactChannelsModal a11y: focus-trap + Escape + devolver foco | Cursor | HECHO | `ContactChannelsModal.jsx` |
| 2026-08-12 | GlobalNav: typo Fotografía + decidir Mis Pedidos/Reservas (solo cliente) | Cursor | HECHO | `GlobalNav.jsx` |
| 2026-08-12 | Commander: chips pendientes/justificantes en fila cerrada (sin hover) | Cursor | HECHO | `Commander.jsx` |
| 2026-08-12 | Anclas hash públicas: inventario + scroll-mt-24 | Cursor | HECHO | `Servicios_SurfskateGuia`, `Servicios_ClasesDeSurf`, `Rentals/Surfboards/Index` |
| 2026-08-12 | Integridad slug artículo 1ª clase (seed ↔ BD ↔ enlaces) | Cursor | HECHO | 0 cambios (todo coincide) |
| 2026-08-12 | SEO post-rebrand: keywords + JSON-LD + cache sitemap + plan re-crawl                                                                                                                                                                                                                                                                           | Cursor   | HECHO                  | solo `forgetCache()`; 0 cambios de código                                                                              |
| 2026-08-12 | Home hero: CRO marketing+UX (jerarquía, contraste, CTA academia)                                                                                                                                                                                                                                                                               | Cursor   | HECHO                  | `Pag_principal.jsx`, `pagina_principal.css`                                                                            |
| 2026-08-12 | Footer móvil: banda contacto + 2 cols enlaces                                                                                                                                                                                                                                                                                                  | Cursor   | HECHO                  | `Footer.jsx`                                                                                                           |
| 2026-08-12 | Footer público: rediseño marketing+UX (marca unificada, 3 cols enlaces, colaboradores strip)                                                                                                                                                                                                                                                   | Cursor   | HECHO                  | `Footer.jsx`, `SponsorsStrip.jsx`                                                                                      |
| 2026-08-12 | Chatbot: auditoría consistencia «Taller de Surf» → «Blog educativo»                                                                                                                                                                                                                                                                            | Cursor   | HECHO                  | `ChatbotArticleCatalogService.php` (PHPDoc); resto ya OK                                                               |
| 2026-08-11 | Auditoría del trabajo de Cursor (rebrand + UX) + **9 mejoras pendientes** (privacidad admin, chatbot, SEO, seeders, hash-links, Commander, GlobalNav, modal a11y, llave de emergencia routes) — prompts uno a uno en chat                                                                                                                      | Reasonix | EN CURSO               | ver memoria `mejoras-pendientes-auditoria-0811`                                                                        |
| 2026-08-11 | Brand SEO: San Sebastián Surf School (1ª mención) + S4 en UI                                                                                                                                                                                                                                                                                   | Cursor   | HECHO                  | `PublicPageSeoService.php`, home, nosotros, clases, tienda, landings servicios                                         |
| 2026-08-11 | Taller: legibilidad tipográfica (H1 + cuerpo + cards)                                                                                                                                                                                                                                                                                          | Cursor   | HECHO                  | `Show.jsx`, `TallerArticleCard.jsx`, `tallerTitle.js`, seeder, BD                                                      |
| 2026-08-13 | Ficha producto (`ProductoVer`) — scroll, nav móvil, CTA acceso | Cursor   | HECHO                  | `ProductoVer.jsx`, `Producto.jsx`, `ProductPurchaseCta.jsx` |
| 2026-08-12 | Home: auditoría marketing «¿Por qué S4?» → eliminar (ruido, sin CTA, duplica teaser/testimonios)                                                                                                                                                                                                                                               | Cursor   | HECHO                  | `Pag_principal.jsx`, `Por_que_escogernos_motivo.jsx` (borrado)                                                         |
| 2026-08-12 | FAB: rediseño profesional botón subir + stack chatbot (marketing/UX)                                                                                                                                                                                                                                                                           | Cursor   | HECHO                  | `Chatbot.jsx`                                                                                                          |
| 2026-08-11 | Consola del día: lista clases del día + acordeón alumnos/WhatsApp                                                                                                                                                                                                                                                                              | Cursor   | HECHO                  | `Commander.jsx`, `AcademyController.php`                                                                               |
| 2026-08-11 | Hub Gestor de servicios: quitar tabs redundantes (quedan cards)                                                                                                                                                                                                                                                                                | Cursor   | HECHO                  | `Admin/Catalog/Index.jsx`                                                                                              |
| 2026-08-11 | Reordenar menú admin Gestión (por frecuencia mostrador)                                                                                                                                                                                                                                                                                        | Cursor   | HECHO                  | `GlobalNav.jsx`                                                                                                        |
| 2026-08-11 | Ritual fin de chat → `HANDOFF.md` (sobrescribir; sin matching por hora)                                                                                                                                                                                                                                                                        | Cursor   | HECHO                  | `HANDOFF.md`, `COORDINACION.md`, `CONTRATO-IA.md`, `RUTAS-CONTEXTO.json`, mapa, `AGENTS.md`                            |
| 2026-08-11 | Clases surf: CTA secundario → artículo Taller primer día                                                                                                                                                                                                                                                                                       | Cursor   | HECHO                  | `Servicios_ClasesDeSurf.jsx`                                                                                           |
| 2026-08-11 | Clases surf: unificar aviso nivel amigo (sin duplicar Ver más)                                                                                                                                                                                                                                                                                 | Cursor   | HECHO                  | `Servicios_ClasesDeSurf.jsx`                                                                                           |
| 2026-08-11 | Clases surf: H2=servicio + H3=beneficio (particulares/bonos)                                                                                                                                                                                                                                                                                   | Cursor   | HECHO                  | `Servicios_ClasesDeSurf.jsx`                                                                                           |
| 2026-08-11 | Clases surf: jerarquía tipográfica badge 01/02 vs H2                                                                                                                                                                                                                                                                                           | Cursor   | HECHO                  | `Servicios_ClasesDeSurf.jsx`                                                                                           |
| 2026-08-11 | Home directorio: rediseño ítem individual (densidad + contraste)                                                                                                                                                                                                                                                                               | Cursor   | HECHO                  | `Pag_principal.jsx`                                                                                                    |
| 2026-08-11 | HomeServiciosDestacados (bloque oferta 4: clases/taquillas/surfskate/fotos)                                                                                                                                                                                                                                                                    | Cursor   | HECHO                  | `HomeServiciosDestacados.jsx`, `Pag_principal.jsx`, mapa                                                               |
| 2026-08-11 | Beneficios en cards modalidades clases (particulares + bonos)                                                                                                                                                                                                                                                                                  | Cursor   | HECHO                  | `Servicios_ClasesDeSurf.jsx`                                                                                           |
| 2026-08-11 | Reordenar menú usuario normal (Clases/Mar/Club/Tienda/Reparaciones/Más)                                                                                                                                                                                                                                                                        | Cursor   | HECHO                  | `GlobalNav.jsx`                                                                                                        |
| 2026-08-11 | Deep-links webcams: #webcam-directo #parte-s4-hoy #prevision-forecast                                                                                                                                                                                                                                                                          | Cursor   | HECHO                  | `Servicios_Webcams.jsx`, `Nosotros.jsx`, `PlanesTaquillasPublic.jsx`, `Pag_principal.jsx`                              |
| 2026-08-11 | Micro-servicios: flecha discreta solo en ítems con destino                                                                                                                                                                                                                                                                                     | Cursor   | HECHO                  | `Nosotros.jsx`, `PlanesTaquillasPublic.jsx`                                                                            |
| 2026-08-11 | Ampliar micro-servicios club (forecast 16d, niveles, subastas…)                                                                                                                                                                                                                                                                                | Cursor   | HECHO                  | `Nosotros.jsx`, `PlanesTaquillasPublic.jsx`                                                                            |
| 2026-08-11 | Alinear stats Sobre nosotros con home                                                                                                                                                                                                                                                                                                          | Cursor   | HECHO                  | `Nosotros.jsx`                                                                                                         |
| 2026-08-11 | Ajuste teaser Sobre nosotros home (copy + stats)                                                                                                                                                                                                                                                                                               | Cursor   | HECHO                  | `Pag_principal.jsx`                                                                                                    |
| 2026-08-11 | Remodelar accesos home: carrusel pills → directorio servicios completo                                                                                                                                                                                                                                                                         | Cursor   | HECHO                  | `Pag_principal.jsx`                                                                                                    |
| 2026-08-11 | Rediseño ContactChannelsModal (WhatsApp primario, glass, acentos)                                                                                                                                                                                                                                                                              | Cursor   | HECHO                  | `ContactChannelsModal.jsx`, copy academia/video                                                                        |
| 2026-08-11 | Fix redirect Stripe reserva fotos (Inertia X-Inertia-Location)                                                                                                                                                                                                                                                                                 | Cursor   | HECHO                  | `PhotoSessionController.php`, `PhotoBookingStripeRedirectTest.php`                                                     |
| 2026-08-11 | Rediseño slider "Accesos rápidos" (Embla carousel + flechas + fade edges + pills modernos)                                                                                                                                                                                                                                                     | Reasonix | HECHO                  | `Pag_principal.jsx`                                                                                                    |
| 2026-08-11 | Cablear Libro de Aprendizaje al dúo (Cursor+DeepSeek leen/guardan)                                                                                                                                                                                                                                                                             | Cursor   | HECHO                  | `CONTRATO-IA` §3.1, `AGENTS.md`, `.cursorrules`, `RUTAS-CONTEXTO.json`, skill `/profesor-aprendizaje`, `05-flujos` 5.5 |
| 2026-08-10 | Afinado `AGENTE-MARKETING-DISENO.md` según crítica de Cursor (8/8): rol corto, disparo de skill (default S1 + mapa), modo admin vs público, anti-patrones S4, plantilla única de hallazgos (R5=§6), límites de alcance, SEO real del repo, qué NO hace                                                                                         | Reasonix | HECHO                  | `docs/taller-prompts/AGENTE-MARKETING-DISENO.md`                                                                       |
| 2026-08-10 | Confirmación cruzada de roles (DeepSeek↔Cursor): diseño vs lógica                                                                                                                                                                                                                                                                              | Cursor   | HECHO                  | `CONTRATO-IA.md` §5.1, `AGENTS.md`, `.cursorrules`, `MASTER-PROMPT-DEEPSEEK.md`                                        |
| 2026-08-10 | Follow-up 2 de Cursor (5/5): separador de tabla restaurado, título + enlace contrato, MASTER L4 (núcleo compartido no "espejo"), USO del script con `--topic ticket`, poda extra 08-09 → archivo                                                                                                                                               | Reasonix | HECHO                  | `COORDINACION.md`, `COORDINACION-ARCHIVO.md`, `MASTER-PROMPT-DEEPSEEK.md`, `scripts/deepseek-ask.mjs`                  |
| 2026-08-10 | Compatibilidad dúo Reasonix/DeepSeek ↔ Cursor (contrato + router único)                                                                                                                                                                                                                                                                        | Cursor   | HECHO                  | `CONTRATO-IA.md` + espejo en `AGENTS.md`, `.cursorrules`, `MASTER-PROMPT-DEEPSEEK.md`, `PROTOCOLO.md`, mapa            |
| 2026-08-10 | Follow-up Cursor al remate (8/8): §7 vs §3 unificados, §6 + script, fila ticket en tablas, 02 §4 → pointer, mapa actualizado, usage dinámico, globs ui-admin acotados, poda COORDINACION                                                                                                                                                       | Reasonix | HECHO                  | ver `REGISTRO.md`                                                                                                      |
| 2026-08-10 | Remate del sistema de prompts: P1 (UTF-16→UTF-8 en sovereign-architect + typo `docs/ai`→`docs/ia` + 02 degradado a plantilla) + `RESUMEN-PARA-GEMINI.md` + `RUTAS-CONTEXTO.json` (router máquina, cableado al script) + rule `ui-admin-s4.mdc` + S11 del agente + pulidos (prompt-forge desc, AGENTS.md, CONTRATO §3, master §3, .cursorrules) | Reasonix | HECHO                  | ver `REGISTRO.md`                                                                                                      |
| 2026-08-10 | Agente senior Marketing + Diseño Web (persona con skills/rules, invocable `/marketing-diseno`)                                                                                                                                                                                                                                                 | Reasonix | HECHO                  | `docs/taller-prompts/AGENTE-MARKETING-DISENO.md`                                                                       |
| 2026-08-10 | Tienda: «Ver más» (lotes de 8) en vez de paginación                                                                                                                                                                                                                                                                                            | Cursor   | HECHO                  | `Tienda.jsx`                                                                                                           |
| 2026-08-10 | Tienda: suavizar parche blanco de fotos de producto                                                                                                                                                                                                                                                                                            | Cursor   | HECHO                  | `Producto.jsx` (pozo slate-200 + object-contain; grid /tienda y slider ofertas)                                        |
| 2026-08-10 | Prompt auditoría BD + archivos rotos (tras «Partida 1» de Cursor: valor de reposición)                                                                                                                                                                                                                                                         | Reasonix | HECHO → ejecuta Cursor | `docs/taller-prompts/PROMPT-AUDITORIA-DB-ARCHIVOS.md`                                                                  |
| 2026-08-10 | Libro de Aprendizaje del dueño: carpeta `docs/aprendizaje/` (rol profesor; INDICE + 6 temas) integrando los `.txt` sueltos de `Conceptos y flujos de trabajo/`                                                                                                                                                                                 | Reasonix | HECHO                  | `docs/aprendizaje/*`                                                                                                   |

## Última actividad

- **2026-08-26** — Cursor: ficha producto — crash `ProductStickyPurchaseBar is not defined` (faltaba el import al meter Share) + galería pedía `.png` ya borrado (403). Restaurado import; `publicMasterUrl` resuelve al WebP hermano; galería PDP usa ese URL; backfill local 102 filas. Tests imagen+PDP OK. HECHO.

- **2026-08-26** — Cursor: tienda `/tienda` — cards `surface=dark` (texto blanco) sobre página clara A2. Ahora `surface=light` (título/precio slate-900, CTA teal min-h-11). Foto de card con `alt=""` para no duplicar el nombre. HECHO.

- **2026-08-26** — Cursor: compartir ficha pública — `SharePageButton` en 2ª mano (bajo WhatsApp) y PDP tienda (bajo el CTA de compra). Sin subastas (ruta con login). No tocado el upgrade Laravel 12. HECHO.

- **2026-08-26** — Cursor: **Upgrade Laravel 11 → 12 HECHO**. `laravel/framework` v11.46.1 → **v12.68.0** (constraint `^12.0`); PHP local sigue 8.2.12 y `"php": "^8.2"` sin tocar. Punto de rollback previo: commit `57077c3` (consolidó 151 archivos sin commitear). Baseline de tests antes del upgrade: 276 pasados / 1 fallido (`PasswordUpdateTest::test_password_can_be_updated`); **después: 277/277 verdes**. OJO: ese test NO lo arregló el upgrade — durante esta misma sesión otro agente editó `Auth/PasswordController.php` moviendo `Auth::logoutOtherDevices()` ANTES del `update()` del password (si va después compara la contraseña vieja contra el hash nuevo y siempre falla). Mérito ajeno al upgrade. De la guía 11→12 solo aplicaba un punto real: `image` ya no admite SVG → quitado `svg` de `mimes` en `ProductoController::validateProduct` (el resto del repo ya usaba `jpeg,jpg,png,webp`). No aplicaban `HasUuids`, `Concurrency`, `mergeIfMissing`, `Schema::getTables`, `Blueprint`/`Grammar` (sin usos); Carbon ya estaba en 3.10.3; `config/filesystems.php` ya definía `local` con root `storage/app/private`. Extra: cerrados 5 CVEs (1 alta) subiendo `pestphp/pest` 3.8.4→3.8.7 (arrastra phpunit 11.5.33→11.5.56), `psy/psysh` y `symfony/yaml` dentro de sus constraints — `composer audit` limpio. Pendiente aparte: PHP 8.4 en el VPS y Laravel 13 más adelante.

- **2026-08-26** — Cursor: barrido de menciones de stack «Laravel 11» → «Laravel 12» en docs vivos (`.cursorrules`, mapas, agentes). `PROMPT-UPGRADE-LARAVEL-12.md` marcado YA EJECUTADO. HECHO.

- **2026-08-25** — Cursor: pipeline catálogo — `CatalogImageService` (máster 1600 + thumb 640 WebP, borra RAW) en producto/2ª mano/subasta/alquiler admin. Listados → thumb; ficha/lightbox → máster. Backfill local 16 paths. Checklist VPS `docs/EN-EL-MOMENTO-DE-DESPLEGAR.md`. Alquiler público sigue demo. HECHO.
- **2026-08-25** — Cursor: pipeline catálogo ronda 2 (auditoría propia post-implementación) — (1) orden seguro subir→persistir→borrar en reemplazo de fotos (2ª mano/subasta/alquiler/producto: antes se borraba el par viejo antes de subir el nuevo, riesgo de perder fotos si fallaba a mitad de lote); (2) `images_thumbs` en `Auction`/`SecondHandBoard::toPublicArray()` + consumido en galería de ficha pública (`Auctions/Show.jsx`, `SecondHand/Show.jsx`: antes servían el máster 1600px también en miniaturas/grid); (3) quitado `app(CatalogImageService::class)` (Service Locator) de los puntos calientes con inyección disponible (`Auction`/`SecondHandBoard::toPublicArray` aceptan el servicio inyectado; `AuctionCatalogService`, `SecondHandPublicCatalogService`, `PedidoController`, `ProductDetailPageService` lo pasan) — quedan como excepción aceptada los accessors/eventos de Eloquent sin punto de inyección (`Surfboard::getFirstThumbUrlAttribute`, `deleteImagesFromDisk`); (4) mimes explícitos en `StoreSurfboardRequest`/`UpdateSurfboardRequest` (paridad con 2ª mano/subasta). Suite completa: 276/277 OK (1 fallo preexistente y ajeno en `PasswordUpdateTest`, no tocado). Pendiente de decisión del dueño: conectar Alquiler público a fotos reales. HECHO.

- **2026-08-25** — Cursor: catálogo 2ª mano público — filtros en URL (`q/tipo/altura/volumen/precio/orden`) en servicio+DTO; reservadas visibles (vendidas 404); listado sin `description`/galería; ficha con `height_label`, un H1, placeholder real (sin DEMO), Volver=`Link`, icono WhatsApp. Tests Feature+Unit OK. HECHO.

- **2026-08-25** — Cursor: ronda 2 prompt-forge — Reasonix GO-CON-CAMBIOS verificado. v3 en `PROMPT-CATALOG-IMAGE-PIPELINE.md`. Alquiler público = demo hasta decisión; VPS no cambia números. HECHO.

- **2026-08-25** — Cursor: prompt-forge v1 — pipeline catálogo (máster ~1600 WebP + thumb ~640, borrar RAW, un servicio, 4 altas). Destino Reasonix análisis, no código. Archivo `PROMPT-CATALOG-IMAGE-PIPELINE.md`. HECHO.

- **2026-08-24** — Cursor: webcam DVR — la barra era más larga que lo jugable (union 30 s + fragmento viejo caído). Ahora ~18 s reales, thumb al 100 %, seek al inicio sigue reproduciendo. HECHO.

- **2026-08-24** — Cursor: webcam DVR — al cargar el thumb queda al final (Al vivo); rebobinar muestra «Volver al directo»; el botón devuelve el thumb al final y sigue el directo. Test Chrome: value 30/30 → seek 2.5 + botón → 30/30. HECHO.

- **2026-08-24** — Cursor: webcam DVR — el freeze al recargar era un auto-seek al live cada 400 ms. Quitado; arranque con `play()`; stall salta hueco de buffer. Test Chrome: avanza, seek atrás muestra «Volver al directo», volver al vivo sigue reproduciendo. HECHO.

- **2026-08-24** — Cursor: catálogo 2ª mano — `SafeImage` + `loading=lazy` (primeras 4 eager; LCP `fetchPriority=high`). Listado ya no manda la galería completa, solo `first_image`. La ficha Show ya tenía lazy en thumbs. HECHO.

- **2026-08-24** — Cursor: barra DVR de la webcam no se veía porque `video.seekable` en HLS en directo sale vacío y se ocultaba. Ahora usa playlist/buffer + fallback ~30 s, `lowLatencyMode: false`, y la franja bajo el vídeo se pinta en cuanto hay live. HECHO.

- **2026-08-24** — Cursor: horario otra vez en `ForecastSlider` (una fila, arrastre + flechas). Solo se oculta la barra nativa (`scrollbar-width: none` + webkit height 0); se revierte la rejilla 4/6/8. HECHO.

- **2026-08-24** — Cursor: tiempo detallado — horario sin slider; días y horas en grid (`overflow-x-hidden`). El scroll lateral que seguía viendo el dueño era el strip de horas. HECHO.

- **2026-08-24** — Cursor: `ForecastSlider` ya no usa `overflow-x-auto` (barra nativa de Windows). Clip `overflow-x-hidden`; mover con arrastre o flechas. Panel tiempo: `overflow-x-hidden` para que el `overflow-y-auto` no pinte barra horizontal. HECHO.

- **2026-08-24** — Cursor: tiempo detallado — los 7 días vuelven a grid fijo (`grid-cols-4` / `sm:grid-cols-7`), sin strip `overflow-x`. El slider (arrastre + flechas) queda solo en el horario. HECHO.

- **2026-08-24** — Cursor: tiempo detallado (`WeatherDetailPanel.jsx`) — 7 días arriba (strip compacto) + horario debajo; sin hint ni «Ver por horas»; amanecer/atardecer solo del día elegido; `overflow-y-auto` para no recortar. UI-only. HECHO.

- **2026-08-24** — Cursor: P2 webcam — barra DVR custom (sin `controls` nativos) + «Volver al directo» si vas atrás; hint «puedes ir unos minutos atrás». `ZurriolaWebcamPlayer.jsx` + `Servicios_Webcams.jsx`. Si el HLS no da ventana ≥8 s, la barra no se pinta. HECHO.

- **2026-08-24** — Cursor: brief `PROMPT-UX-WEBCAM-BARRA-DIRECTO.md` — marketing (live vs VOD) → UX (barra sí/no + copy). Veredicto P2. HECHO.

- **2026-08-24** — Cursor: **A1 auditoría marketing** — taquillas indexables `/servicios/taquillas` (SeoHead, JSON-LD, sitemap, 301 legacy, CTA «Reservar taquilla»). Build OK. HECHO.

- **2026-08-24** — Cursor: auditoría marketing web completa guardada en `docs/taller-prompts/AUDITORIA-MARKETING-WEB-2026-08-24.md` (10 hallazgos A1–A10, notas por página, design system, SEO/GEO, anti-alucinación). Prompt ítem a ítem en `PROMPT-EJECUCION-AUDITORIA-MARKETING.md`. Backlog en `TAREAS-PENDIENTES.md`. HECHO.
- **2026-08-24** — Reasonix: handshake M1–M10 aprobado (ACEPTO×5 / ADAPTO×3) y ejecutado en docs + mejoras agente frontend F1–F8 (S8→`seo_contenido`, +S13 copy, rúbrica conversión §5.1, AP-7/8/9, KPIs verificables, voz de marca, rutas reales). Pendiente: **Cursor aplica diff en `seo-geo-public.mdc`** (quitar "Taquillas," de noindex — A1). Después: revisión home/surf/contacto con la rúbrica de conversión §5.1.

- **2026-08-23** — Reasonix: deuda técnica P3 — dinero tienda a céntimos: migración `2026_08_23_110000_convert_pedidos_money_to_cents` (`pedidos.precio_total` + `pedido_producto.precio_pagado` → `_cents`, backfill + drop viejas; `descuento_aplicado` sigue porcentaje). Código: StoreOrderStockService, CreateStoreCheckoutAction, Datafono createPaidPedido/fiscalTargets, PedidoController mappers, ClientPaymentHistoryService, modelos Pedido/PedidoProducto/Producto/User (accessor `Pedido::precio_total` en euros → API/front sin cambios), factory + 4 seeders. Precios bonos 150/600 € → `config/store.php bonos_public` (env). Tests 267 ✓ (1 fallo preexistente ajeno: PasswordUpdateTest); build OK; migración aplicada a BD dev. HECHO.

- **2026-08-23** — Cursor: P2 carritos — `UNIQUE(user_id)` + `user_id` NOT NULL; fusión de duplicados si los hubiera; `Carrito::forUser()`. Tests 7/7. HECHO.

- **2026-08-23** — Cursor: badge carrito del header — `HandleInertiaRequests::share()` envía `cart.count` (suma de `carrito_producto.cantidad` del usuario; invitado/error → 0). `GlobalNav` ya lo leía; sticky H5 intacta. Build OK. HECHO.
- **2026-08-23** — Reasonix (implementación autorizada): H6 — eliminado estado muerto «No hay unidades disponibles en este momento» del branch `canBuy` de `ProductPurchaseCta.jsx` (inalcanzable: canBuy ⇒ stock≥1 ⇒ qtySelect presente). Build OK (1m34s). HECHO.
- **2026-08-24** — Reasonix: creado agente `/despliegue-ops` (persona `AGENTE-DESPLIEGUE-OPS.md` §1–§8 + S1–S12, skill Reasonix, router con 5 aliases `ops/operaciones/despliegue/deploy/tunel`, filas §3 en CONTRATO y MASTER, enlace en AGENTS.md). Zona Cursor (.cursorrules + skill) queda como diff para que la aplique Cursor/el dueño. JSON validado. HECHO.

- **2026-08-22** — Cursor: sticky PDP — identidad de marca sin gastar ancho: filete superior 3px `border-s4`, miniatura al extremo izquierdo, `BrandLogo navyNav h-7` solo `sm+`. Descartado (marketing): logo en móvil (56px de coste sobre 19px de holgura a 360px) y centrar la fila (rompe patrón precio-izq./CTA-dcha. + Fitts). Extra: ancla tachada oculta bajo 380px (no truncar cifras) y `min-w-[96px]` en CTA Agotado/Entrar/Taquilla. HECHO.

- **2026-08-22** — Cursor (consulta marketing S1/S6 + UX frontend): sticky PDP — precio en 2 líneas (grande + ancla tachado inline), pill «En carrito · N» a la derecha del label sin wrap (10px, `aria-hidden` + `sr-only` con `aria-live`), miniatura 48px / 56px `sm` decorativa, CTA `min-w-[96px]`. `--s4-sticky-purchase-bar-h` se queda en 5rem (barra baja a ~71px, sin solape con el FAB). HECHO.

- **2026-08-22** — Cursor: PDP — menos padding bajo «También te puede interesar» (`pb-14`→`pb-2`, sticky `pb-24`→`pb-20`). HECHO.

- **2026-08-22** — Cursor: sticky PDP — pill «En tu carrito» en la misma fila que «Precio socio» (sin extra altura). HECHO.

- **2026-08-22** — Cursor: PDP sticky — pill «En tu carrito: N» (estado local + toast; offset chat 6.25rem con pill). HECHO.

- **2026-08-16** — Cursor: pase criterio post-F3 — Commander flex-1, Bonos th sin «+», Pedidos label dinámico, Datafono/ExpandableText stopPropagation=false + label a11y. HECHO.

- **2026-08-16** — Cursor: cierre F2–F3 acordeones — SecondHand (ChevronDown), Rentals <lg, Commander, Bonos (3 estados + ChevronDown), Nosotros BenefitVerMas via AccordionTrigger. HECHO.

- **2026-08-16** — Cursor: `AccordionTrigger` + `ExpandableText`; migrados Pedidos, SurfBriefMini, Clients, Vigencia, Datafono móvil, Surfboards admin. Pendiente (iconografía): SecondHand Plus/Minus, Bonos ▼, Rentals pill, Commander/Nosotros. HECHO.

- **2026-08-21** — Cursor: `/tienda` — banner full-bleed justo bajo el menú; H1 «Tienda · …» debajo del banner. Ficha: banner tras la card. HECHO.

- **2026-08-20** — Cursor: extraído `ContactBlock` (pill + panel Edy/Willy); usado en tablas y neoprenos. Sin cambio visual. HECHO.
- **2026-08-20** — Cursor: a11y — chevron de fila en Clients + Vigencia desktop como `<button aria-expanded>` (patrón Surfboards interior; sin role en `<tr>`). HECHO.
- **2026-08-21** — Cursor: brief `PROMPT-UX-BANNER-PROMO-PLACEMENT.md` — marketing decide si el banner va full-bleed bajo el menú (encima de Volver/crumbs). No implementar hasta veredicto. EN CURSO Reasonix.

- **2026-08-20** — Cursor: GlobalNav móvil — `aria-expanded={open}` en triggers de sección con submenú (mismo patrón que «Mi espacio»). HECHO.
- **2026-08-21** — Cursor: banner promo — sin pastilla de precio ni miniatura; debajo del copy solo el CTA (Consultar oferta / Ver subasta / Ver producto). HECHO.

- **2026-08-20** — Cursor: «Qué incluye tu plan» — sin el párrafo de pack/duración/precio. HECHO.

- **2026-08-20** — Cursor: «Tus planes y pagos» + «taquilla nºX» en la misma fila; sin «Preparado → en vigor → finalizados». HECHO.

- **2026-08-20** — Cursor: hero planes socio — solo «Club de socios S4» + «Planes y cuotas»; sin subtítulo ni chip Micro-servicios (el CTA sigue más abajo). HECHO.

- **2026-08-20** — Cursor: «Qué incluye tu plan» — solo títulos (sin detalle); rejilla compacta `lg:grid-cols-6` (una fila en desktop). HECHO.

- **2026-08-20** — Cursor: planes taquilla — ya no pone «Recibo»; **TicketBAI a la izquierda**, **Factura a la derecha**. Si no hay PDF fiscal aún, Factura abre el justificante/Stripe. HECHO.

- **2026-08-19** — Cursor: historial «Tus planes y pagos» — Ver factura (izq.) + Ver TicketBAI (der.) por cuota, mismo patrón que pedidos. Recibo Stripe solo si aún no hay factura. HECHO.

- **2026-08-19** — Cursor: barra sticky PDP — `justify-between` (precio izq., miniatura centro, CTA der.); sin `flex-1` que pegaba la foto al botón. HECHO.

- **2026-08-19** — Cursor: Concha = **recomendación** (no orden) para iniciación/intermedio si quieren baño tranquilo y seguro. JSON spot + parte + chatbot.

- **2026-08-19** — Cursor: footer marca — logo, nombre e Instagram; sin eslogan ni «Escríbenos» duplicado (el CTA sigue en Contacto / banda móvil). HECHO.

- **2026-08-19** — Cursor: banner promo — dots en pastilla (blur + hit area), padding bajo el CTA para que no se peguen; flechas laterales con hover. HECHO.

- **2026-08-19** — Cursor: icono cuenta del nav (desktop) con chevron a la derecha; gira al abrir el menú. HECHO.

- **2026-08-19** — Cursor: 70–99 kJ: ini 5 (buen viento); int 4 glass / 3 sur; ava tope 3, si viento malo máx. 2.

- **2026-08-19** — Cursor: parte/JSON — titular del parte sale de las estrellas (no de 0,8 m); JSON desfasado/sur alineados; viento pesa más que kJ (G6). Tests 9/9. HECHO.

- **2026-08-20** — Cursor: **banner promo slide producto** — foto real del SKU (fondo + thumb entre precio y CTA), subtítulo con ahorro € y stock bajo; `fetchPriority` slide 1. Marketing P0/P1. HECHO.
- **2026-08-19** — Cursor: **Mis pedidos** — `mostrarPedidos()` filtra `pagado=true` (coherente con gestor admin; no muestra huérfanos Stripe hasta cron). Test Feature. HECHO. Reasonix OK. P2/P3 copiados a `TAREAS-PENDIENTES.md` **sin implementar**.
- **2026-08-19** — **Sincronización dúo (auditoría tienda):** Reasonix confirmó informe desactualizado. **Ya hecho:** banner bono → `config/store.php` (`title_template` + `STORE_PROMO_BONO_CENTS`); checkout → `StoreCartCheckoutValidator` en `CreateStoreCheckoutAction`. **Backlog P2/P3:** `unique(user_id)` en `carritos`; float residual `MoneyCents::centsToEuros` / pivot céntimos; bonos 150€/600€ hardcode en clases JSX.

- **2026-08-19** — Cursor: fusion cuaderno Zurriola — estrellas leen JSON (kJ/viento/verano/rip); Gemini recibe esas notas en el parte. Tests 5/5. HECHO.

- **2026-08-16** — Cursor: modo compartir — Vite parado, `share:tunnel`, túnel Cloudflare `https://recovered-conflicts-workflow-responses.trycloudflare.com`. HTML con `/build/assets` (sin `public/hot`). HECHO.

- **2026-08-16** — Cursor: historial VIP — créditos solo número (1/2); en móvil filas-tarjeta; SKU bajo la clase / columna desde lg. HECHO.

- **2026-08-16** — Cursor: datáfono — columna **Hacienda** + botón **Comunicar a Hacienda** (efectivo pendiente); efectivo → B2B aunque TPV tenga TBAI propio; TPV = «Cubierto por TPV». Tests 7/7. HECHO.
- **2026-08-16** — Cursor: en Mis pedidos, dos chips como en Mis facturas: **Ver factura** (PDF) y **TicketBAI en proceso / Ver TicketBAI**. Tests 2/2. HECHO.

- **2026-08-16** — Cursor: pantalla TicketBAI en proceso ya no enseña el PDF (está en Mis facturas); el verde solo sale con sello de Hacienda. Volver → `/mis-facturas`. Tests 2/2. HECHO.

- **2026-08-16** — Cursor: Mis facturas — «Ver factura» (PDF) + «Ver TicketBAI»; si no listo: «Pendiente de emisión» / «TicketBAI en proceso»; labels enum fiscales aclarados. HECHO.
- **2026-08-16** — Cursor: 2º clic al carrito en 5s pide unidades extra (cards tienda). Mis facturas: chip **Subastas** (cobro Stripe). 2ª mano no (WhatsApp, sin TBAI). Tests 4/4. HECHO.

- **2026-08-16** — Cursor: «Factura en trámite» en Mis pedidos era un span sin enlace; ahora va a `/pagos/facturas/{id}` (página de estado TBAI). Tests 2/2. HECHO.

- **2026-08-16** — Cursor: `/pedidos` TypeError — el typehint `Producto` apuntaba al namespace del controller, no al modelo. Añadido `use App\Models\Producto`. Test 1/1. HECHO.

- **2026-08-16** — Cursor: `/pago/exito` 500 `Unknown named parameter $payableType` — Laravel `Event::dispatch()` no acepta nombres; sustituido por `PaymentConfirmed::emit()`. Test 1/1. HECHO.
- **2026-08-16** — Cursor: P2 checkout — `CreateStoreCheckoutAction` reserva + Stripe + vacía carrito solo si hay sesión; banner bono en `config/store.php`. Tests 2/2. HECHO.
- **2026-08-16** — Cursor: P1 catálogo — `ProductoController` delgado; alta/edición/ocultar/imagen en `StoreProductCatalogService` + DTO; listado admin sin Eloquent crudo; precio redondeado a céntimo. Tests 5/5. HECHO.
- **2026-08-16** — Cursor: P0 dinero tienda — descuento/total en céntimos (`StoreProductPricing`); el `total` del carrito debe coincidir o se aborta; Stripe/datáfono/ficha usan la misma fórmula. Tests 9/9. HECHO.
- **2026-08-16** — Cursor: P0 stock tienda — `lockForUpdate` al reservar; cron `store:release-unpaid` (24 h) libera checkout Stripe abandonado; si falla crear sesión Stripe se suelta al momento. Tests Feature. HECHO.
- **2026-08-16** — Cursor: banner promo — overlay más claro, text-shadow, CTA 44px, fotos WebP (~240 KB las 3). HECHO.
- **2026-08-16** — Cursor: 3 fotos promo (bono/subasta/producto) en `public/img/store/` + brief UX `PROMPT-UX-BANNER-PROMO-TIENDA.md` para Reasonix. Pendiente diseño → implementación.
- **2026-08-16** — Cursor: banner publicidad tienda/ficha — 3 slides (bono recomendado 250€, mejor subasta, producto más ofertado) con imagen a fondo. HECHO.
- **2026-08-16** — Cursor: banner subastas en Tienda — strip bajo H1 en `/tienda` + compact encima de relacionados en ficha; `featuredAuctions` vía `AuctionCatalogService::publicCatalog`. HECHO.
- **2026-08-16** — Cursor: prompt UX banner/slider subastas en Tienda para Reasonix (`PROMPT-UX-BANNER-SUBASTAS-TIENDA.md`) + pendiente en `TAREAS-PENDIENTES.md`. Diseño primero → luego implementación.
- **2026-08-16** — Cursor: B2B — el importe cobrado (IVA incl.) se convierte a neto antes del POST; 60,00 € → price 49,59 € + 21 %. Tests 6/6. HECHO.
- **2026-08-16** — Cursor: pedido #21 — reemitido PaymentConfirmed (el webhook confirmó el cobro y no se encoló la factura); /pago/exito ahora reintenta si no hay fiscal_invoice. HECHO.
- **2026-08-16** — Cursor: pedido Stripe — se guarda `payment_method=card` al crear/confirmar; 3 pedidos pagados huérfanos actualizados. UI: «Pago: Con tarjeta». HECHO.
- **2026-08-16** — Cursor: home — eliminados fundidos `SectionEdgeFade` (componente borrado); cortes secos entre bandas. HECHO.
- **2026-08-16** — Cursor: PDP — más margen arriba/abajo del slider «También te puede interesar» + más padding interno compact del carrusel. HECHO.
- **2026-08-16** — Cursor: OpcionesIntro — última fila incompleta (1–3 tiles) reparte a todo el ancho (`grid-cols-1/2/3`). HECHO.
- **2026-08-16** — Cursor: home OpcionesIntro — oculto heading «Explora S4 / Todo lo que puedes…» (`showHeading={false}`); quedan solo las tiles clicables. HECHO.
- **2026-08-16** — Cursor: home — Explora S4 y teaser del club/instalaciones en una sola banda (sin corte entre directorio y «San Sebastian Surf School»). HECHO.
- **2026-08-16** — Cursor: home — fundidos más altos/progresivos (`SectionEdgeFade`) en hero→claro, claro↔Explora+club, claro→OpcionesIntro; sin fade agresivo corto. HECHO.
- **2026-08-16** — Cursor: home — fade navy→slate-50 al pie de Explora S4 (quita corte seco antes del teaser GEO). HECHO.
- **2026-08-16** — Cursor: tienda checkout — validación `productos_json` vs carrito BD (`StoreCartCheckoutValidator`); pricing int céntimos; bono 250€ desde `config/store.php` + clases sincronizadas. Tests 26/26 store. HECHO.
- **2026-08-16** — Cursor: home — Explora S4 + Nosotros a full-bleed; ofertas fusionadas con OpcionesIntro (sin franja blanca entre oscuros). Cards de contenido (parte, GEO, testimonios) siguen en flujo claro. HECHO.
- **2026-08-16** — Cursor: botón Compartir en webcam (`#webcam-directo`) y Parte S4 (`#parte-s4-hoy`); Web Share API + copiar enlace. HECHO.
- **2026-08-16** — Cursor: ficha producto — quitados highlights genéricos (uso/recogida/precio) y el cierre del summary que los repetía; esas ventajas quedan solo en el trust strip. HECHO.
- **2026-08-16** — Cursor: ofertas socios — variante clara (`tone="light"`): sección blanca + cards `surface="light"` (texto slate, botón light); coherente en home, ficha producto y Taller. Grid `/tienda` sigue oscuro. HECHO.
- **2026-08-16** — Cursor: ofertas socios — banda full-bleed (fondo navy a todo el ancho; contenido en `max-w-6xl`); sacado del contenedor estrecho en home/Taller/PDP. HECHO.
- **2026-08-16** — Cursor: home directorio — flecha en `CompactLink` visible en móvil (`opacity-80`); en `md+` más sutil hasta hover. HECHO.
- **2026-08-16** — Cursor: ficha producto — quitado hint «ajustar cantidades en el carrito»; trust strip → ventajas exclusivas (Acceso exclusivo / Precio de socio / Recogida en Zurriola) y visible también en móvil. HECHO.
- **2026-08-15** — Cursor: subastas — grid `grid-cols-2` móvil (familia tienda/2ª mano) + cards densas; badges estado/tiempo/pujas intactos. HECHO.
- **2026-08-14** — Cursor: 2ª mano — grid `grid-cols-2` móvil (patrón tienda) + cards más densas; specs compactas en móvil. HECHO.
- **2026-08-12** — Cursor: FAB público — ya no se oculta el dock entero si hay sesión admin (antes ↑ y chat desaparecían juntos); scrollY más robusto en móvil. HECHO.
- **2026-08-12** — Cursor: Taller «reservar clase» — nuevo H2 qué mira la escuela (marea medias/bajas vs altas en vivas/orillera; parte adecuado; franjas con menos gente). Seeder + BD. HECHO.
- **2026-08-12** — Cursor: Taller «reservar clase» — quitado párrafo final débil (S4 Academia / WhatsApp / checklist). Seeder + BD. HECHO.
- **2026-08-12** — Cursor: Taller artículo — «Lectura estimada» ya no fuerza 3 min; calcula por palabras (~200/min, mín. 1). HECHO.
- **2026-08-12** — Cursor: `ZurriolaGeoFactsService` — cache `remember` 1 h con clave `zurriola.geo_facts.v1.{filemtime}` (invalida al editar el JSON). HECHO.
- **2026-08-12** — Cursor: GEO webcams — quitada card «Día de clase» (llegada/material + Ver clases/Contacto); H2 → «lugar, temporada y condiciones». Datos siguen en JSON/FAQ. HECHO.
- **2026-08-13** — Cursor: ficha producto — fix `preserveScroll` en grid tienda; scroll top al entrar; nav móvil compacta (sin breadcrumb); CTA guest/login/taquilla/contacto (`ProductPurchaseCta`). Build OK. HECHO.
- **2026-08-12** — Cursor: CTA «Ver tiempo» bajo título webcam (fuera del player); `WeatherDetailPanel` tras el stream; eliminado duplicado bajo forecast. Build OK. HECHO.
- **2026-08-12** — Cursor: forecast — `CloudRain` junto al % (prob. lluvia); CTA «Ver forecast al detalle» con subtítulo «olas · sol · lluvia» (mismo panel; sin 3er botón). Build OK. HECHO.
- **2026-08-12** — Cursor: FAQ GEO — título fuera de la card; quitada caja envolvente (alineado Temporada/Energía). Brief marketing→UX en chat para Reasonix. HECHO quick win.
- **2026-08-12** — Cursor: Taller + JSON viento — offshore ordena/anticipa/coloca; onshore aplana/pica/dificulta lectura; `ui_metric_help` + `surfMetricHelp` + BD. HECHO.
- **2026-08-12** — Cursor: Taller «Cómo interpretar el parte» — período definido (s entre crestas) + revisión oceanográfica (Hs, Tp, energía); seeder + BD. HECHO.
- **2026-08-12** — Cursor: Taller «Cómo interpretar el parte» — añadida **Energía** (punch/kJ) a «Los 5 números»; seeder + BD. HECHO.
- **2026-08-12** — Cursor: admin verify email — `EnsureAdminVerified` + `ADMIN_REQUIRE_EMAIL_VERIFIED` (default false local); allowlist `ADMIN_EMERGENCY_EMAILS`; rutas admin unificadas; tests 4/4. HECHO.
- **2026-08-12** — Cursor: SEO `/servicios/surf` — `og:image`, JSON-LD, sin breadcrumbs UI. HECHO.
- **2026-08-12** — Cursor: SEO/GEO **nosotros + contacto** — JSON-LD + OG; `ContactPage` con `ContactPoint`; H1 sr-only contacto. HECHO.
- **2026-08-12** — Cursor: bajo tabla energía GEO — nota orientativa (partes no 100 % precisos; más/menos mar; responsabilidad del surfista) vía `energy_bands_note`. HECHO.
- **2026-08-12** — Cursor: tabla GEO energía — desdoblado `≥100` en franjas 100–400 / 401–800 / 801–1500 / 1501–2500 / ≥2500 (alineado a `energy_kj` del JSON logística) + mismas reglas en `level_recommendation_by_energy_kj`. HECHO.
- **2026-08-12** — Cursor: FAQ GEO Zurriola — enlaces markdown en 4 respuestas (Taller interpretar parte, webcam, parte S4, temporada); ancla `#zurriola-temporada`; UI clickable + JSON-LD en texto plano. HECHO.
- **2026-08-12** — Cursor: webcams — quitada frase «escuela a X metros» del hero y de la cabecera de señal; se mantiene en GEO (`ZurriolaGeoGuide`) y meta SEO. HECHO.
- **2026-08-12** — Cursor: webcams SEO **fase 3** — `og:image` + Twitter card → `/img/zurriola-surf-sunset-1280.webp`; JSON-LD `primaryImageOfPage` en WebPage. Informe GSC entregado en chat (manual). HECHO.
- **2026-08-12** — Cursor: webcams SEO **fase 2** — +3 FAQs (webcam, leer forecast, parte S4) en `zurriola-geo-facts.json` → JSON-LD + guía GEO; enlace Taller «Cómo interpretar el parte» junto al H2; timestamp parte visible (fecha+hora, pill verde). Build OK. HECHO.
- **2026-08-12** — Cursor: webcams SEO **fase 1** — H2 «Previsión de olas en Zurriola»; breadcrumbs visibles (Inicio/Servicios); JSON-LD `BreadcrumbList`; anchors «Webcam Zurriola en directo» en footer y nav. Build OK. HECHO.
- **2026-08-12** — Cursor: ContactChannelsModal a11y — focus-trap Tab (sin deps), Escape ya existía, restaura foco al origen; role/aria ya OK. HECHO.
- **2026-08-12** — Cursor: SEO/GEO home MVP — meta description citables; JSON-LD `WebPage`; prop `zurriolaGeo` + `HomeGeoTeaser` (hub→teaser club); alts galería/teaser con nombre completo; ancla `#zurriola-guia` ya existía. Rebuild túnel. HECHO.
- **2026-08-12** — Cursor: GlobalNav — «Fotografia»→«Fotografía»; Mis Pedidos/Reservas solo cliente (`!isAdmin` + menú admin aparte), documentado en comentarios. HECHO.
- **2026-08-12** — Cursor: Commander — chips «X pendientes» / «X justificantes» en fila cerrada + focus-visible; sin restaurar hover/prefetch. HECHO.
- **2026-08-12** — Cursor: anclas hash — reaplicado `scroll-mt-24` en `#tabla-seleccion`, `#particulares`, `#bonos`, `#catalogo-tablas` (previo no estaba en disco) + rebuild túnel. HECHO.
- **2026-08-12** — Cursor: integridad slug 1ª clase — seed=BD=`que-aprendere-en-mi-primera-clase-…`; enlaces JSX/chatbot/seeder OK; 0 roturas. HECHO.
- **2026-08-12** — Cursor: SEO post-rebrand — `forgetCache` sitemap (115 URLs, sin titles); keywords clave OK; JSON-LD «San Sebastian Surf School»; plan GSC. 0 copy cambiado. HECHO.
- **2026-08-12** — Cursor: home hero — CRO: eyebrow local, H1 sin duplicar marca, scrim más fuerte, chips confianza, CTA→academia + enlace tarifas secundario. HECHO.
- **2026-08-12** — Cursor: ofertas socios home — banda oscura (patrón tienda), títulos/precios legibles; cards compact más sólidas; ahorro en verde (sin doble rojo). HECHO.
- **2026-08-12** — Cursor: footer público — rediseño tras ronda marketing+UX: marca+Instagram real siempre visible; Explorar/Servicios/Contacto; colaboradores en franja horizontal (sin cajas); título «Colaboradores». Build OK. HECHO.
- **2026-08-12** — Cursor: chatbot — auditoría «Taller de Surf»→«Blog educativo»: prompts/FAQ ya OK; solo PHPDoc del catálogo; path `/taller` intacto; taller Edy no tocado. HECHO.
- **2026-08-12** — Cursor: forecast al detalle — botón «Cómo interpretar el parte» + modal con textos de las «?» (fuente única `surfMetricHelp.js`) + CTA al artículo Taller. HECHO.
- **2026-08-12** — Cursor: home — eliminado bloque «¿Por qué San Sebastián Surf School?» (3 cards genéricas sin CTA; duplicaba teaser Sobre nosotros + testimonios). Borrado `Por_que_escogernos_motivo.jsx`. Rebuild túnel. HECHO.
- **2026-08-12** — Cursor: home — eliminado trust strip («Instructores federados / Equipo premium / +5.000»); sin restos en repo. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: home — «Empieza por aquí» encima del Parte S4 (orden invertido bajo el hero). HECHO.
- **2026-08-11** — Cursor: brand SEO híbrido — metas/`PublicPageSeoService` + eyebrows/H2 clave con «San Sebastián Surf School»; S4 queda en UI corta/productos (parte, menú). HECHO.
- **2026-08-11** — Cursor: Taller 1ª clase — 4 objetivos iniciación S4 (pop-up→escapes→olas solos→unión); FAQ alineada; `chatbot_summary` + `zurriola-spot-logistics` iniciacion. HECHO.
- **2026-08-11** — Cursor: Taller FAQ «¿Necesito saber nadar?» — mar pequeño gestionable; mar grande → particular con pie. BD + seeder. HECHO.
- **2026-08-11** — Cursor: Taller — tipografía legible (H1 sentence case + subtítulo entre paréntesis; cuerpo ~65ch; tracking normal; cards índice). Título 1ª clase actualizado en BD/seeder. HECHO.
- **2026-08-11** — Cursor: menú admin Clases — añadido **Gestor de clases diario** (`admin.academy.index`) junto al Gestor de clases. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: **Consola del día** — navegación ‹ › por jornada; formulario arriba; lista de clases debajo con acordeón (nombre, correo, WhatsApp); contacto completo en payload admin. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: admin menú Clases — quitada **Consola del día** (entrada confusa; se entra desde Gestor de clases). Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: hub **Gestor de servicios** — quitadas pills redundantes; quedan solo cards con descripción. Pills siguen en gestores hijos. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: admin nav — **La Zurriola** flyout (webcam/parte hoy/forecast); añadidos Consola del día + Tarifas particulares; Inventario a Tienda (sin grupo Alquiler huérfano); Extras = solo Comparador. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: admin Gestión — 2ª mano, Subastas y Reservas de alquiler pasan a **Tienda** (se venden/comercializan); Alquiler queda solo Inventario. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: menú admin **Gestión** reordenado por frecuencia de mostrador — `Cobros · Taquillas · Clases · Tienda · Alquiler · Catálogo · Clientes`; Usuarios+Chatbot fusionados; Gestor de Clases fuera de Catálogo; Extras sin duplicar Parte. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: handoff escrito (cierre chat UI home/menú/clases/nosotros). Ver `docs/taller-prompts/HANDOFF.md`.
- **2026-08-11** — Cursor: ritual **«fin de chat» → sobrescribir `docs/taller-prompts/HANDOFF.md`**; chat nuevo con «sigo con el handoff»; sin matching por hora. Cableado en contrato/router/mapa. HECHO.
- **2026-08-11** — Cursor: directriz **puente de continuidad** en chat nuevo (solo si tema relacionado; resumen desde Última actividad, no Q&A). `COORDINACION` + `CONTRATO-IA` §3.1. HECHO.
- **2026-08-11** — Cursor: cards modalidades en `/servicios/surf` — listas de beneficios comerciales (particulares + bonos). Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: menú usuario normal — barra `Inicio · Clases · Mar · Club · Tienda · Reparaciones · Más · Contacto`; Guía surfskate en Clases; Reparaciones flyout propio (no en Más); Blog educativo en Más; admin sin tocar. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: deep-links webcams — `#webcam-directo`, `#prevision-forecast`, `#parte-s4-hoy` (recomendaciones Ini/Int/Ava); scroll genérico en `Servicios_Webcams`; micro-servicios + home alineados. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: micro-servicios — quitado botón «Ver dinámica»; flecha › discreta + tarjeta clicable solo si hay destino (webcam, forecast, niveles, subastas, AutoCoach, taquillas, taller Edy). Baños/USB/café sin nav. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: micro-servicios club — +6 (calentamiento, webcam, forecast **16 días** según `ZURRIOLA_FORECAST_DAYS`, recomendación Ini/Int/Ava, subastas, AutoCoach); contador dinámico; sync en planes públicos. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: `/nosotros` — mismas métricas que home (`1 año` / Instalaciones nuevas; 2 líneas sin sub) + copy corto coherente. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: teaser Sobre nosotros home — quitado eyebrow; copy corto (+ «muchos más servicios»); stat «1 año / Instalaciones nuevas»; métricas a 2 líneas. Rebuild túnel. HECHO.
- **2026-08-11** — Cursor: `/servicios/surf` — bloque tutorial: CTA reserva + enlace Taller `que-aprendere-en-mi-primera-clase-…`. HECHO.
- **2026-08-11** — Cursor: `/servicios/surf` — aviso amigo resumido; eliminado «Ver más» duplicado; enlace a `#nivel-minimo-monitor` (fuente única). HECHO.
- **2026-08-11** — Cursor: `/servicios/surf` — outline Hn: H2 «Clases particulares» / «Bonos en grupo», H3 beneficio; `01`/`02` solo eyebrow. HECHO.
- **2026-08-11** — Cursor: `/servicios/surf` — `SectionChapterBadge` 01/02 reducido a eyebrow (`text-xs`); deja de competir con H2 («Atención 100%…» / bonos). HECHO.
- **2026-08-11** — Cursor: directorio home — ítems más densos (menos padding/gap, icono s4 sólido, borde sutil, flecha en color marca). HECHO.
- **2026-08-11** — Cursor: `HomeServiciosDestacados` — bloque oferta 4 (Clases destacado + Taquillas/Surfskate/Fotos) montado tras `SurfBriefMini` en home; CTAs distintos del hero/directorio/OpcionesIntro; mapa actualizado. HECHO.
- **2026-08-11** — Cursor: home «Accesos rápidos» (carrusel Embla de pills de Reasonix) sustituido por **directorio de servicios** completo agrupado (Clases / Mar y olas / Material y tienda / Club y taller): particulares, webcam/parte, alquiler, tienda, 2ª mano, subastas, fotos, etc. Sin carrusel ni «Ver todos». Solo `Pag_principal.jsx`. HECHO.
- **2026-08-11** — Cursor: reserva de fotos no abría Stripe porque `PhotoSessionController::book` usaba `redirect()->away()` en vez de `redirectToStripeCheckout()` (Inertia necesita `X-Inertia-Location`). Tests 2/2 OK. HECHO.
- **2026-08-11** — Reasonix: `PLANTILLA-BOOTSTRAP-ECOSISTEMA-IA.md` creada (pieza reutilizable: diagnóstico §1, checklist de bootstrap §2, plantillas por pieza §3, decisiones del dueño §4, mantenimiento §5). Para montar el ecosistema en proyectos nuevos. HECHO.
- **2026-08-11** — Reasonix: prompt HomeServiciosDestacados revisado y mejorado (6 refinamientos: asset fotos, anti-duplicación CTA, modo claro, cita de rutas L201/206/218/286, verificación visual, fuente de decisión). Entregado al dueño **en chat** (política: prompts puntuales en chat, no en archivos). HECHO.
- **2026-08-11** — Reasonix: `FLUJOS-VISUAL.md` ampliado a **mapa del ecosistema IA completo** (puntos de entrada, 5 rules .mdc, 4 skills, contrato/router/pizarrón, script, libro) + flujos de decisión. Referencia visual del dúo. HECHO.
- **2026-08-11** — Reasonix: flujo de eficiencia de tokens definido y documentado (Libro con criterio A-D, resúmenes en vez de transcripciones, aviso de reinicio de chat §5.6–5.10). Reglas en `docs/aprendizaje/INDICE.md` + `COORDINACION.md` §Flujo de eficiencia. Skill `/profesor-aprendizaje` alineado con A-D. HECHO.
- **2026-08-11** — Cursor: Libro de Aprendizaje cableado al dúo — Cursor y Reasonix/DeepSeek pueden leer y guardar en `docs/aprendizaje/`; skill Reasonix `/profesor-aprendizaje`; router `--topic aprendizaje|teoria|profesor`; contrato §3.1. HECHO.
- **2026-08-10** — Reasonix: crítica de la «Partida 1» de Cursor (valor de reposición) + prompt de auditoría BD/archivos rotos guardado en `docs/taller-prompts/PROMPT-AUDITORIA-DB-ARCHIVOS.md` para que lo ejecute Cursor. Verificado contra repo: 39 modelos ✓, 98 migraciones ✓, TPV reconciliación 1.900 líneas ✓, 86 páginas JSX = frontend total (admin solo 25).

- **2026-08-10** — Cursor: confirmación cruzada de roles — si DeepSeek recibe pedido de lógica/código, pregunta confirmación; si Cursor recibe solo diseño/UX, pregunta confirmación (`CONTRATO-IA.md` §5.1 + `AGENTS.md` + `.cursorrules` + MASTER). HECHO.
- **2026-08-10** — Cursor: compatibilidad dúo Reasonix/DeepSeek ↔ Cursor — nuevo `CONTRATO-IA.md` (roles, router único, anti-pisotón); espejado en `AGENTS.md`, `.cursorrules`, `MASTER-PROMPT-DEEPSEEK.md`, `PROTOCOLO.md` y mapa. HECHO.
- **2026-08-10** — Cursor: Tienda — paginación Anterior/Siguiente sustituida por «Ver más» (lotes de 8; se acumulan; al filtrar/ordenar se resetea). Contador «Mostrando X de Y». HECHO.
- **2026-08-10** — Cursor: Tienda (`/tienda`) — fotos de producto con fondo blanco sobre card navy: pozo de imagen en gris suave (`from-slate-200 to-slate-300`) + `object-contain` con padding (en vez de `object-cover` sobre `bg-slate-800`). Afecta grid tienda y slider de ofertas vía `Producto.jsx`. HECHO.

- **2026-08-21** — Reasonix: análisis del agente de marketing → mejoras aplicadas: +S12 `critica_prompt_rediseno`, plantilla única con Sev/KPI, escala de nota anti-inflación, fórmula de prioridad, disparos S4/S5, checklist de contexto R2, AP numerados, few-shot §8; skill `/marketing-diseno` sincronizado. HECHO.
- **2026-08-21** — Reasonix (implementación autorizada por el dueño): PDP ficha — etiqueta «Precio socio» siempre visible en bloque de precio, precio normal tachado como ancla en sticky bar (guests ven el ahorro), hint de cantidad solo con info nueva (máx. por pedido). Build OK (40s). HECHO.
- **2026-08-21** — Reasonix: scroll lateral PDP — guard `overflow-x: clip` en html/body (app.css; no rompe sticky), `min-w-0`+`break-words` en Breadcrumbs y H1 de ficha. Build OK (30s). HECHO.
- **2026-08-21** — Reasonix: H4 cerrado sin cambios (verdict S6: split «Añadir»/«Añadir al carrito» es el patrón correcto). H5: prompt feedback carrito en sticky bar entregado en chat (estado local, UI-only). Hallazgo: badge carrito header lee `props.cart.count` que nadie comparte → nunca se actualiza (pendiente decidir fix).
- **2026-08-21** — Reasonix: H5 VERIFICADO — implementado vía prompt (addedQty + pill «En carrito · N» + aria-live). Build OK (53s) por Reasonix. Nota copy: pill visible usa «En carrito · N» (prompt decía «En tu carrito: N»); aria-live usa «En tu carrito: N». No crítico. HECHO.

- **2026-08-21** — Reasonix: cierre de sesión — 4 tareas del S4 acordeones cerradas y verificadas (GlobalNav a11y, Clients/Vigencia a11y, ContactBlock, refactor AccordionTrigger/ExpandableText ×11 archivos) + build OK. `HANDOFF.md` actualizado. Siguiente pendiente: #9 mejoras 08-11 y SEO Donostia.
- **2026-08-21** — Reasonix: verificación #9 mejoras 08-11 — ya implementada por Cursor 2026-08-12 (`EnsureAdminVerified` + `ADMIN_REQUIRE_EMAIL_VERIFIED` + allowlist `ADMIN_EMERGENCY_EMAILS`, config/auth.php documentado, tests 4/4). Lista 08-11 completa; solo falta confirmación del dueño para #7 GlobalNav. Sin cambios de código.
- **2026-08-21** — Reasonix: #7 GlobalNav CONFIRMADA por el dueño — admins no ven menú cliente (Mis Pedidos/Reservas/Facturas/Carrito); premisa: admin solo gestiona back-office (subastas, pedidos, forecast, webcam…), para comprar usa cuenta user aparte. Typo "Fotografía" OK. Auditoría 08-11 CERRADA al 100%.

> Historial completo (actividad 2026-08-03 → 2026-08-09 y filas HECHO anteriores): `docs/taller-prompts/COORDINACION-ARCHIVO.md` (poda 2026-08-10).
