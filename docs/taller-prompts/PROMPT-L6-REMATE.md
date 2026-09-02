# L6 — remate backend (FASE 2 post-lotes) · prompt para Cursor (v1 — redactado por Reasonix)

> Estado: luz verde del dueño (2026-08-31). L0–L5 cerrados y verificados. Suite de partida: **435 tests**.
> Alcance: los 8 P2 de paginación del informe que no entraron en L5a/L5b + **C** (bug de consistencia de
> acceso, el de mayor valor) + **B/A** (full-scans en rutas públicas calientes).
> Informe fuente: `docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md` §8/§9 (R3/R4/R5/R7 + backlog R).
> Fuera: SMTP, P3 overbooking fotos, S5, R8b, S6, periodo de taquilla, AvailabilityService (ya tocado en L5a).

---

```
FASE 2 — L6: remate backend (consistencia de acceso + full-scans + paginación). Luz verde del dueño.
NO toques nada fuera de esta lista.

ANTES DE ESCRIBIR
Lee docs/taller-prompts/COORDINACION.md (Estado actual + Última actividad). Lee el código ACTUAL de cada
archivo citado: no asumas números de línea ni que la suite sigue en 435. Si un hallazgo ya está hecho,
no lo reimplementes.

CONTEXTO
L0–L5 ya aplicados. Suite ~435 tests verdes. Decisiones del dueño tomadas (NO reabrir).
ORDEN DEL LOTE (por valor, no por número): C (consistencia) PRIMERO, luego B, luego A, luego los P2 de
paginación en cola. C es el único con riesgo de dinero percibido.

OBJETIVO

1) C — DIVERGENCIA has_active_locker (consistencia de acceso; bug real, va PRIMERO).
   Backend usa `User::hasActiveLocker()` = física O compartida (User.php:259-262): CarritoController:53,91
   (canCheckout), DatafonoPaymentReconciliationService:1158, MostradorTicketService:280.
   Pero HandleInertiaRequests.php:59 y :61 rellenan `has_active_locker` y `has_locker` con
   `hasPhysicalLocker()` SOLO física → un VIP con taquilla compartida #500 recibe false en el front
   mientras el backend le trata como true (puede comprar con descuento).
   Hacer:
   - HandleInertiaRequests: `has_active_locker` = `$user->hasActiveLocker()` (física O compartida).
     Decidir y documentar `has_locker` y `has_physical_locker`: si el front solo distingue «tiene
     taquilla física» vs «tiene acceso», renombrar/mapear sin romper componentes que lean la prop
     (grep del front: resources/js/ — busca has_active_locker, has_locker, has_physical_locker,
     has_virtual_locker y ajusta al significado REAL de cada una).
   - Revisar quién más lee esas props en el front para no romper UI.
   Tests: VIP con taquilla compartida #500 (fábrica) → el prop has_active_locker es true; usuario sin
   taquilla → false; los componentes que usan la prop no se rompen (test de Inertia middleware).

2) B — FULL-SCANS en fichas públicas (rendimiento percibido; va segundo).
   Una ficha pública de producto dispara 2-3 barridos completos por request:
   - `ProductDetailPageService.php:149-153`: relatedPayload vierte TODA la tabla productos (con la
     relación) solo para 12 relacionados.
   - `StorePromoBannerService.php:70`: featuredAuctionSlide llama `publicCatalog()` (vuelca TODA
     auctions) para elegir 1 subasta (:75-83).
   - `AuctionController.php:45-53`: show() vuelve a llamar publicCatalog() completa solo para 3
     «related live» (ya filtrando en PHP).
   Hacer:
   - relatedPayload: query SQL acotada (`where eliminado=0 AND id != ?` + `limit(12)` + la relación
     principal), sin get() de toda la tabla.
   - featuredAuctionSlide: query SQL (`status=live` o la condición real + orden por bids/precio +
     `limit(1)`) en lugar de publicCatalog()->filter()->sortByDesc()->first(). Si el dto necesita
     campos calculados (bid_count, current_price), calcúlalos con subqueries/aggregates, no materializando.
   - AuctionController::show: related con query SQL acotada (live + id != + limit(3)), no publicCatalog().
   Tests: ficha de producto con N productos en BD → relatedPayload devuelve ≤12 y la query no escanea
   toda la tabla (DB::enableQueryLog o EXPLAIN); el slide destacado devuelve la misma subasta que antes
   (mismo criterio de orden); show de subasta devuelve ≤3 related. Respuesta idéntica en JSON.

3) A — /tienda vuelca todo el catálogo + todas las imágenes en cada visita (TiendaController.php:20-31).
   `Producto::where('eliminado',0)->with('imagenes')->get()` carga TODAS las imágenes (no solo la
   principal) y mapea todo el catálogo en cada request público; el front (Tienda.jsx) no pagina.
   Hacer: `with('imagenPrincipal')` (o la relación que solo traiga la principal) en vez de
   `with('imagenes')`, y si el volumen lo pide, paginación o caché del catálogo público (elegir la que
   menos toque y decirlo). NO cambiar la forma del payload.
   Tests: payload idéntico; nº de imágenes cargadas por producto = 1 (no todas); si paginaste, el
   front sigue funcionando con la primera página.

4) P2 de paginación en cola (los 8 del informe; hazlos TODOS en una pasada, cada uno con su test):
   4.1 DatafonoPaymentReconciliationService.php:467-497: listPayments con limit(100) SIN paginación →
       paginate() (o cursor) manteniendo el contrato del endpoint.
   4.2 AuctionCatalogService.php:25 y :65: publicCatalog()/adminIndex() sin paginar → paginate() en el
       controller/endpoint (no romper otros llamantes: featuredAuctionSlide y AuctionController::show
       YA no deben llamar a publicCatalog() tras el punto 2).
   4.3 SecondHandPublicCatalogService.php:31-40: catálogo público sin paginar → paginate().
   4.4 TaquillaMembershipService.php:787-815 (registro pagos limit 300) y StoreProductCatalogService
       adminIndexRows (:27-49) → paginate().
   4.5 ProductDetailPageService relatedPayload ya acotado en el punto 2 (no duplicar).
   4.6 TallerArticleService.php:58-67 listCards sin paginar → paginate() (o limit si el front no
       pagina; decide y dilo).
   4.7 autoCloseExpiredLiveAuctions (AuctionCatalogService.php:81-95): sin chunk() y se invoca inline
       en cada GET HTTP (AuctionController.php:30,40,67, Admin/AuctionController.php:33) → chunkById()
       + mover a tarea programada (console.php) con la misma lógica; el inline puede quedarse como
       fallback o quitarse si el cron cubre (decide y dilo).
   4.8 Admin/DatafonoPaymentController.php:40-77: payload con limit(500)+limit(300) embebido en un
       solo Inertia::render → paginar el listPayments y acotar los selects (los flags por usuario son
       PHP puro, no N+1: no tocar esa parte).
   Tests: por cada uno, el endpoint responde con paginación y el contrato de datos no cambia (mismos
   campos); para 4.7, el comando cierra las expiradas y el inline ya no es la única vía.

REGLAS
- Cada arreglo: tests primero o junto (Pest), luego suite completa + npm run build SOLO si tocas
  frontend (el punto C y el 3 pueden tocar props/payload: corre build y verifica).
- NO tocar: SMTP/alerta, P3 overbooking fotos, S5, R8b, S6, periodo de taquilla, LessonBonoCreditUnits,
  AvailabilityService (ya rematado en L5a), C2/C3/C6 chatbot.
- Si paginar un listado rompe el front (espera lista completa), dilo y decide con el dueño antes de
  cambiar el contrato: no asumas.
- Reclama y cierra la tarea en COORDINACION.md.

FORMATO DE CIERRE
Por cada arreglo: qué tocaste, tests nuevos, resultado de la suite (y nº de queries antes/después para
B/A si aplica).
Al final: veredicto si algún arreglo exige decisión del dueño (p.ej. paginación que rompa el front).
Si un hallazgo ya estaba hecho, dilo y no lo reescribas.

ACEPTACIÓN
- C: has_active_locker = hasActiveLocker() (física O compartida) en el middleware; front coherente;
  test con VIP compartido → true.
- B: ninguna ficha pública escanea la tabla completa; related ≤12, slide 1, related subasta ≤3, con
  SQL acotada y payload idéntico.
- A: /tienda carga solo la imagen principal por producto (payload idéntico).
- 4.x: los 8 listados pagan o acotan; autoClose con chunkById + cron; contratos intactos (salvo
  aviso explícito).
- Suite verde. Sin cambios en periodo de taquilla ni LessonBonoCreditUnits.
```

---

## Verificación del diff L6 (para Cursor cuando termine, o para Reasonix)

```
FASE 2 — L6 remate: VERIFICACIÓN del diff. NO implementes. Abre cada archivo:línea, confirma/matiza/
descarta y devuelve la tabla. Persona AGENTE-BACKEND-SENIOR (R1–R8). Destinatario: quien NO implementó
(Reasonix). Si no está en disco (COORDINACION L6 ≠ HECHO), PARA y dilo.

Informe: docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md §8/§9 · Prompt L6:
docs/taller-prompts/PROMPT-L6-REMATE.md · Suite de partida: 435 tests.

PRE-VUELO
1) git diff de: HandleInertiaRequests, User, resources/js/** (solo props locker), ProductDetailPageService,
   StorePromoBannerService, AuctionController, TiendaController, DatafonoPaymentReconciliationService,
   AuctionCatalogService, SecondHandPublicCatalogService, TaquillaMembershipService,
   StoreProductCatalogService, TallerArticleService, Admin/DatafonoPaymentController, routes/console.php.
2) grep: has_active_locker|has_locker|has_physical_locker|publicCatalog\(|limit\(|paginate\(|chunkById
3) php artisan test + npm run build (si tocó front).

LENTES
C — ¿has_active_locker = hasActiveLocker() (física O compartida)? ¿VIP #500 → true en test? ¿Qué pasó
    con has_locker/has_physical_locker (renombrados/mapeados sin romper front)? ¿grep del front coherente?
B — ¿relatedPayload ≤12 con SQL acotada? ¿featuredAuctionSlide 1 subasta con SQL (mismo criterio de
    orden: bids×1e6+precio)? ¿show de subasta ≤3 related sin publicCatalog()? ¿Payloads idénticos?
A — ¿/tienda con imagenPrincipal (1 img/producto)? ¿Payload idéntico? ¿Se paginó/caché? ¿Front OK?
4.x — ¿Los 8 listados pagan o acotan con contrato intacto? ¿autoClose con chunkById + cron (el inline
    ya no es la única vía)? ¿Admin/Datafono paginado sin tocar el map PHP de flags?

ALCANCE NEGATIVO (si hay diff → MATIZ/DESCARTADO)
SMTP, P3 fotos, S5, R8b, S6, periodo taquilla, LessonBonoCreditUnits, AvailabilityService, C2/C3/C6.

FORMATO (este orden)
1) Tabla: | ID | Veredicto | Dónde (archivo:línea actual) | Evidencia 1–2 líneas |
2) Tests: suite N/aserciones/tiempo + build + tests nuevos.
3) Queries antes/después (B/A).
4) Diff fuera de alcance.
5) ¿Exige decisión del dueño? Sí/no + línea.
6) Hallazgos P0/P1 nuevos en ESTOS archivos (si no hay, dilo).

NO toques código.
```

---

## Notas para el dueño

- **C es el que más valor tiene** (consistencia de acceso visible: un VIP con taquilla compartida ve la
  web «sin taquilla» mientras el backend le deja comprar con descuento). Es el único con riesgo de
  dinero percibido → va primero.
- **B es el mayor ahorro de rendimiento**: hoy una ficha pública escanea tablas completas 2-3 veces
  por request; se acota a SQL con limit.
- Los 8 P2 de paginación son mecánicos pero con riesgo de romper el front si este espera listas
  completas (p.ej. registro de taquilla con scroll infinito client-side) → el prompt exige avisar
  antes de cambiar un contrato.
- Cuando Cursor cierre L6, la Fase 2 + remate quedan cerrados. Queda solo operativo: SMTP (Brevo),
  prueba panel Ex-socios, S6 (`/academia`).
