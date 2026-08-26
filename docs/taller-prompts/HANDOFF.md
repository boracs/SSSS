# Handoff de chat (sobrescribir)

> **Un solo archivo.** Al oír «fin de chat» / «cierro chat» / «guardar y reiniciar», la IA **sobrescribe** este documento (no acumula historial).
> En chat nuevo: si el usuario dice «sigo con el handoff» / «sigo con el chat que acabo de cerrar» / tema claramente relacionado → leer esto + `COORDINACION.md` Última actividad y abrir con puente corto.
> Si el tema es otro → ignorar este archivo (salvo pre-vuelo normal de COORDINACION).

## Meta

| Campo | Valor |
|---|---|
| Cerrado | 2026-08-23 (Reasonix) |
| Canal | Reasonix |
| Tema | Deuda técnica P3: dinero tienda → céntimos + precios bonos a config |

## Hecho (esta sesión)

- **P3 dinero tienda a céntimos (HECHO, verificado):** migración `2026_08_23_110000_convert_pedidos_money_to_cents` — `pedidos.precio_total` + `pedido_producto.precio_pagado` → `precio_total_cents`/`precio_pagado_cents` (unsignedBigInteger), backfill `round(x*100)`, drop de las decimales viejas, `down()` reversible. `descuento_aplicado` NO se tocó (es porcentaje).
  - Aplicada a BD de desarrollo `mas_que_surf` (`php artisan migrate --force`, OK).
  - Código: `StoreOrderStockService`, `CreateStoreCheckoutAction`, `DatafonoPaymentReconciliationService` (createPaidPedido + fiscalTargets L2111), `PedidoController` (mappers con centsToEuros), `ClientPaymentHistoryService`, modelos `Pedido`/`PedidoProducto`/`Producto`/`User` (accessor `Pedido::precio_total` en euros → **API/front sin cambios**), factory + 4 seeders (CoherentDemo, ExtraPedidos, OperationalSuper, SandboxRandom).
  - Tests: suite completa **267 passed** (1 fallo preexistente ajeno: `PasswordUpdateTest` auth — verificado con stash que falla sin mis cambios). Build OK (59.4s).
- **P3 precios bonos 150/600 € a config (HECHO):** `config/store.php` bloque `bonos_public` (`STORE_BONO5_CENTS`=15000, `STORE_BONO10_PARTICULARES_CENTS`=60000 en `.env`); ruta `/servicios/surf` pasa `pricingLabels` con bono5/bono5PerClass/bono10Particulares; `Servicios_ClasesDeSurf.jsx` sin hardcodes (fallbacks 150/30/600 €).
- **Instagram quitado de la lista:** `docs/TAREAS-PENDIENTES.md` — Abiertas vacía.
- P2 carritos (`UNIQUE(user_id)`) la cerró **Cursor** hoy (2026-08-23) — no tocar.

## A medias / siguiente

- **Nada pendiente del backlog** (`TAREAS-PENDIENTES.md` Abiertas vacía).
- Candidatos futuros: **SEO Donostia** (análisis keywords + plan SEO/rebrand, `docs/COMPETENCIA_SEO_DONOSTIA.md`), `ui/accordion.tsx` Radix sin usar (posible migración futura), unificar `ContactBlock` local de `Footer.jsx` con `components/ContactBlock.jsx`.
- Nota review de seguridad: migración no idempotente (blindar con `Schema::hasColumn()` si se re-ejecuta) y orden de despliegue = migrate antes que código.

## Archivos clave

- `database/migrations/2026_08_23_110000_convert_pedidos_money_to_cents.php`
- `app/Models/Pedido.php` (accessor `precio_total`) · `app/Models/PedidoProducto.php`
- `app/Services/Store/StoreOrderStockService.php` · `app/Services/Payments/DatafonoPaymentReconciliationService.php` · `app/Http/Controllers/PedidoController.php`
- `config/store.php` (bonos_public) · `resources/js/Pages/Servicios_ClasesDeSurf.jsx`
- `docs/TAREAS-PENDIENTES.md` · `docs/taller-prompts/COORDINACION.md`
