# Prompt — Pipeline de imágenes de catálogo (máster web + thumb)

> **Destino:** Cursor (implementación), **solo si el dueño dice adelantar**.
> **Cadena:** v1 análisis Reasonix (2026-08-25) → v3 consolidada (esta).
> **Veredicto de plan:** GO-CON-CAMBIOS. Números y convención A ya cerrados.
> **Bloqueo:** fotos públicas de alquiler (demo vs reales) — ver `DECISION_ALQUILER` abajo; v3 asume **solo admin** hasta que el dueño cambie eso.

## Prompt (copiar desde aquí)

```
1. ROL
Ingeniero Laravel 11 + Inertia 2. Implementas el pipeline de imágenes de catálogo S4.

2. OBJETIVO
Al subir o reemplazar una foto de producto, 2ª mano, subasta o tabla de alquiler (admin): escribir máster WebP 1600 px q80 + thumb `{basename}-thumb.webp` 640 px q80, borrar el RAW si el máster se verificó en disco, y servir thumb en listados públicos (con fallback al máster). No regenerar en cada GET.

3. CONTEXTO
- Stack: Laravel 11, PHP 8.2+, React 19 + Inertia 2, MySQL/XAMPP, disco `public`.
- Lee `docs/PROJECT_TREE_FOR_GEMINI.md` y `docs/taller-prompts/COORDINACION.md` (Estado actual + Última actividad). Reclama la tarea antes de tocar código.
- GD: CLI de este repo tiene GD+WebP (`php -r "var_export(function_exists('imagewebp'));"`). `php artisan serve` usa ese PHP. Apache/XAMPP = DESCONOCIDO; no bloquees el local por eso. Sin Imagick. Sin Intervention Image.
- `app/Services/Photos/PhotoBookingService.php` = reservas de packs de fotos. No lo extiendas. Servicio nuevo: `app/Services/Media/CatalogImageService.php` (carpeta Media bajo Services; no existe hoy; no uses Photos/).
- Writers actuales (guardan el original tal cual):
  - `StoreProductCatalogService::storeImages()` → `productos` + `imagenes.ruta`
  - `Admin\SecondHandBoardController` store/update → `segunda-mano` JSON `images`
  - `Admin\AuctionController` store/update → `subastas` JSON `images`
  - `Admin\SurfboardController` store/update → `surfboards` + `image_url` JSON; `Surfboard::deleteImagesFromDisk()`
- Validación: producto max 2048 KB jpeg/png/jpg/gif/svg/webp (`ProductoController`). 2ª mano y subasta max 5120 jpeg/jpg/png/webp. Alquiler: `StoreSurfboardRequest` / `UpdateSurfboardRequest` solo `image|max:5120` (sin lista de mimes).
- Readers listado (thumb): `Producto::toStorePayload()`; `SecondHandBoard::toPublicArray()` (`first_image`, listado sin galería); `Auction::toPublicArray()` (`first_image`); admin `Surfboard::first_image_url`.
- Readers ficha (máster): `ProductImageGallery.jsx` usa el mismo `images[i]` en panel principal (`:156`), tira de tabs (`:231`) y lightbox (`:299`). Tras el pipeline, `images[]` serán URLs de MÁSTER (ya no RAW 4000 px). Optimización: tabs pueden usar thumb si el payload trae ambas URLs; el panel y el lightbox deben seguir en máster (panel hasta `max-h-[32rem]`). Misma lógica en `SecondHand/Show.jsx` (UniformGallery) y `Auctions/Show.jsx` si sirven el array `images`.
- Alquiler PÚBLICO: `resources/js/lib/surfboardPublicDisplay.js` `imageUrlFor()` / `imageListFor()` ignoran la foto real y usan `demoCatalogImage()`. `SurfboardPublicDetail.jsx` y `Rentals/Surfboards/Index.jsx` van por ahí. El backend de `Rentals\SurfboardController::show` sí pasa `first_image_url` al SEO. Eso NO se conecta en este prompt salvo `DECISION_ALQUILER=conectar`.
- `StorePromoSlideDto` ya tiene `imageUrl` + `thumbUrl`; hoy `StorePromoBannerService` pone la misma URL en los dos. Reutiliza el DTO: `imageUrl`=máster, `thumbUrl`=thumb.
- Fuera: `public/img/**`, justificantes privados, AutoCoach, webcam, detección de screenshots.

4. ENTRADAS
<<<DECISIONES_CERRADAS
Números: máster 1600 px lado largo WebP q80; thumb 640 px lado largo WebP q80. Sin upscale.
Convención A: mismo directorio, thumb = pathinfo(máster) basename + '-thumb.webp'. BD/JSON guarda solo el path del MÁSTER. Listados derivan el thumb; si no existe el archivo, fallback al máster.
Borrar RAW solo tras `Storage::disk('public')->exists(máster)`. Al update/destroy borrar máster Y el -thumb derivado (hoy varios sitios solo borran el path guardado).
Sync en el save del admin. Backfill: comando artisan una vez, idempotente (si ya hay máster/thumb, skip).
Lote: procesar archivo a archivo; un fallo no revierte los ya escritos; log + el archivo fallido se deja/se reporta, no se borra un RAW sin máster.
SVG: no pasar por GD; guardar copia tal cual, sin thumb.
GIF: no re-encodar (se pierde animación); guardar tal cual, sin thumb.
HTTP(S) ya en Surfboard.image_url: no descargar ni procesar.
DECISIONES_CERRADAS>>>

<<<DECISION_ALQUILER
valor por defecto: solo_admin
solo_admin = el servicio corre en el alta/edición admin; el catálogo público de alquiler sigue con demos; no toques surfboardPublicDisplay.js.
conectar = listado y ficha públicos usan first_image_url (máster en ficha, thumb en card) en vez de demoCatalogImage. Tarea aparte solo si el dueño cambia este valor.
DECISION_ALQUILER>>>

5. TAREAS
1. Reclama en COORDINACION. Confirma `imagewebp` en este PHP. Si falta, párate.
2. Implementa `CatalogImageService`: storeFromUpload, thumbPathFor, deletePair, publicThumbUrl (fallback máster). DTO readonly de resultado (path máster + path thumb).
3. Engancha los 4 writers. Extrae el `store()` crudo de los tres controladores admin al servicio (el controlador no llama a GD).
4. Readers de listado: `first_image` / `imagen` / `imagenPrincipal` / admin surfboard apuntan al thumb con fallback. Ficha/galería/og: máster. Promo: `thumbUrl` distinto de `imageUrl`.
5. ProductImageGallery: si el payload de ficha solo trae máster, déjalo (lightbox y panel ya irán a 1600). Si es barato, tabs con thumb; no bajes el panel ni el lightbox a 640.
6. Comando `images:backfill-catalog-thumbs` sobre `productos`, `segunda-mano`, `subastas`, `surfboards` (paths locales). Idempotente. No toques `public/img/**`.
7. Actualiza solo la sección Media/Store afectada en PROJECT_TREE_FOR_GEMINI.md. Cierra COORDINACION.

6. RESTRICCIONES
- No Intervention, Spatie Media, ni cola en el save.
- No migración de BD (convención A).
- No lógica GD en JSX ni en controladores.
- No tocar PhotoBookingService ni `public/img/**`.
- No conectar fotos reales de alquiler público si DECISION_ALQUILER=solo_admin.
- No float para dinero (no aplica); paths string.

7. FORMATO
Diff por archivo. Al final: 5 líneas (qué se genera al subir, qué ve el listado, qué ve el lightbox, comando backfill, alquiler público intacto o no).

8. ACEPTACIÓN
- [ ] Alta admin de producto: en disco máster .webp ~1600 y `-thumb.webp` ~640; el JPEG original no queda.
- [ ] Listado tienda/2ª mano/subastas: HTML de la card usa URL thumb (o máster si no hay thumb).
- [ ] ProductImageGallery lightbox y panel principal: URL máster, no 640.
- [ ] Reemplazar/borrar foto elimina también el -thumb.
- [ ] SVG/GIF producto: sin variantes, archivo conservado.
- [ ] `php artisan images:backfill-catalog-thumbs` se puede reejecutar sin duplicar.
- [ ] Alquiler público sigue demo si solo_admin.
- [ ] Tests existentes de tienda/2ª mano/subasta no rojos por paths.

9. AUTONOMÍA
Nombres internos del servicio, helper de derivar `-thumb`, y si las tabs de galería usan thumb. Párate si GD/WebP no carga. No preguntes px. Pregunta solo si hace falta migración (no debería).

10. VERIFICACIÓN
Antes de cerrar: un upload real o un test de unidad del servicio (si ya hay carpeta Pest de Store); listado vs ficha URLs distintas; deletePair cubre thumb.
```
