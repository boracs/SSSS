# TicketBAI vía B2BRouter — post-pago Stripe

**Estado:** iteración 1 (dominio fiscal + adapter B2BRouter). Flag `INVOICING_ENABLED=false` por defecto: en producción hoy **no se emite ninguna factura** hasta activarlo explícitamente tras validar en staging.

## 1. Qué hace y qué NO hace este código

- Nuestro backend construye un JSON de factura (contacto + líneas) y se lo envía a B2BRouter.
- **B2BRouter genera, firma (XAdES) y envía el XML TicketBAI** a la Hacienda Foral correspondiente, gestiona el encadenamiento de facturas y el certificado ante Hacienda.
- Nuestro código **nunca** genera ni firma XML TicketBAI, ni gestiona certificados.
- Fuera de alcance de esta iteración: anulación/rectificativas (ver TODO abajo), Verifactu (resto de España), envío de PDF/email al cliente.
- **UI React de facturas:** ya implementada. Vista individual en `/pagos/facturas/{id}` (`FiscalInvoiceController` + `FiscalInvoiceAccessService`) y panel cliente unificado en `/mis-facturas` (`MyFiscalInvoicesController` + `ClientFiscalInvoiceListService`), filtrable por categoría de negocio.
- **Cobertura de dominios:** `FiscalInvoiceBuilderService` ya tiene rama implementada para los 5 payables de negocio — `Pedido` (tienda), `UserBono` (bonos de clases), `Booking` (alquileres), `LessonUser` (clases sueltas) y `PagoCuota` (taquillas) — y los 5 están en la whitelist `config('invoicing.payable_types')`. Aun así, **hoy no se emite ninguna factura real**: `INVOICING_ENABLED=false` (entorno de prueba) hace que `FiscalInvoiceCategory::isEnabled()` devuelva `false` para las 5 categorías, así que "Mis facturas" las muestra como "Próximamente" en vez de listas vacías engañosas. Activar de verdad solo requiere `INVOICING_ENABLED=true` en `.env` tras confirmar precios/políticas con el cliente — no hace falta tocar código.

## 2. Flujo

```
PaymentConfirmed (Pedido/UserBono ya cobrados en Stripe)
  → DispatchB2BRouterInvoiceListener (ShouldQueue; early-return si INVOICING_ENABLED=false
     o el payable_type no está en config('invoicing.payable_types'))
  → CreateB2BRouterInvoiceJob
      → IssueFiscalInvoiceAction
          1. getOrCreatePending: fila `fiscal_invoices` única por stripe_checkout_session_id
             (UNIQUE en BD; lockForUpdate solo durante el insert/update, nunca durante el HTTP)
          2. Si ya tiene b2b_invoice_id → return (idempotente, no se repite el alta)
          3. FiscalInvoiceBuilderService: payable → FiscalInvoiceDraftDto
             (Pedido/UserBono; MissingFiscalDataException/UnsupportedFiscalPayableException → status=failed)
          4. B2BRouterFiscalInvoiceIssuer::createIssuedInvoice(send_after_import: true)
          5. Persiste b2b_invoice_id + b2b_tax_report_id; status=processing
      → si processing con tax_report → encola PollB2BRouterTaxReportJob (delay 10s)
  → PollB2BRouterTaxReportJob
      → SyncFiscalTaxReportAction: GET tax_reports/{id}
          - state=processing/signed → no-op, se reencola con backoff (config('invoicing.poll'))
          - state=registered → status=registered + tbai_identifier + qr_payload
          - state=error → status=failed + last_error (el pago Stripe NUNCA se revierte)
```

`DispatchStripeReceiptCaptureListener` / `CaptureStripeReceiptJob` (recibo Stripe) no se tocan y siguen funcionando exactamente igual; ambos listeners cuelgan del mismo evento `PaymentConfirmed` de forma independiente.

## 3. Modelo de datos — `fiscal_invoices`

| Campo | Uso |
|---|---|
| `stripe_checkout_session_id` | UNIQUE — clave de idempotencia real (1 pago = 1 factura como máximo) |
| `payable_type` / `payable_id` | UNIQUE compuesto — mismo patrón que `payment_receipts` |
| `amount_cents` | Importe cobrado en Stripe (autoridad), no el `precio_total` recalculado |
| `status` | `pending` → `processing` → `registered` \| `failed` (`App\Enums\FiscalInvoiceStatus`) |
| `b2b_invoice_id` / `b2b_tax_report_id` | IDs devueltos por B2BRouter al crear la factura |
| `tbai_identifier` / `qr_payload` | Solo se rellenan en `registered`; persistidos para una UI futura (no expuestos aún) |
| `last_error` | Motivo legible cuando `status=failed` |

## 4. Configuración

`config/invoicing.php` + variables en `.env`:

```
INVOICING_ENABLED=false
INVOICING_DRIVER=b2brouter
B2BROUTER_BASE_URL=https://api-staging.b2brouter.net   # prod: https://api.b2brouter.net
B2BROUTER_API_KEY=
B2BROUTER_API_VERSION=2025-10-13
B2BROUTER_ACCOUNT_ID=
B2BROUTER_DELEGATION=gipuzkoa   # informativo, ver punto 5
```

`config('invoicing.payable_types')` es una whitelist explícita (`Pedido::class`, `UserBono::class`). Añadir un nuevo dominio (p.ej. `Booking`) requiere activarlo ahí **y** añadir su rama en `FiscalInvoiceBuilderService::build()`.

## 5. Entornos de B2BRouter — sí, se puede probar sin coste ni homologación previa

B2BRouter separa **tres** entornos (no solo "staging"):

| Entorno | URL base | Prefijo de API key | Acceso | Para qué |
|---|---|---|---|---|
| **Sandbox** | `https://api.b2brouter.net` (misma que producción) | `test_...` | Gratis, inmediato, sin ticket | Desarrollo diario, validar nuestro JSON/flujo/webhooks, onboarding |
| **Staging** | `https://api-staging.b2brouter.net` (dominio propio) | `stag_...` | Registro en `app-staging.b2brouter.net` + ticket de soporte pidiendo permisos | Integraciones grandes, y sobre todo: validar el envío TicketBAI real contra el **entorno de pruebas de la Hacienda Foral** |
| **Production** | `https://api.b2brouter.net` | `prod_...` (o sin prefijo, legacy) | Cuenta de pago (o Basic plan gratuito con límites) | Tráfico real |

**El enrutamiento a Sandbox NO depende de la URL, depende del prefijo de la API key.** Por eso `B2BROUTER_BASE_URL` por defecto es `https://api.b2brouter.net` tanto en Sandbox como en producción — lo único que cambia entre un entorno y otro es la clave.

Importante para TicketBAI en concreto: en **Sandbox**, los envíos a la Hacienda Foral están **simulados u omitidos** — el documento avanza igualmente por su ciclo de vida (`draft → sent → registered`) para que puedas probar tu código de integración (nuestros Jobs, el polling, la idempotencia…), pero **no valida contra el sistema real de Hacienda** y las facturas descargadas llevan una marca de agua "no válida". Para una validación end-to-end real contra el entorno de pruebas de la Hacienda Foral de Gipuzkoa, hace falta **Staging**.

### Setup rápido — Sandbox (recomendado para empezar hoy mismo)

1. Registrarte/entrar en https://app.b2brouter.net.
2. Botón **Developers** (icono de rayo) en la cabecera → **Crear Sandbox**.
3. Abrir el sandbox creado → caes automáticamente en su página de **Claves API** → generar una clave (empieza por `test_`) → `B2BROUTER_API_KEY`.
4. Anotar el `ACCOUNT_ID` numérico de esa cuenta (visible en la URL del panel o vía `GET /accounts`) → `B2BROUTER_ACCOUNT_ID`.
5. `.env`: `B2BROUTER_BASE_URL=https://api.b2brouter.net` (el valor por defecto ya es este).

### Setup — Staging (solo cuando quieras validar el envío TicketBAI real de prueba)

1. Registrarte en https://app-staging.b2brouter.net (es una cuenta distinta a la de producción/sandbox).
2. Abrir un **ticket de soporte** pidiendo acceso API — las cuentas de staging empiezan con permisos limitados.
3. En **Ajustes de la cuenta de staging**, configurar los `tax_report_settings` de TicketBAI: delegación foral (Gipuzkoa en nuestro caso), datos fiscales del emisor (NIF/razón social de la academia). **Esto no se hace desde nuestra app** — `B2BROUTER_DELEGATION` en `.env` es solo documentación para el equipo, no se envía en ningún payload.
4. Generar la API key de staging (prefijo `stag_...`) → `B2BROUTER_API_KEY`; anotar el `ACCOUNT_ID` de staging → `B2BROUTER_ACCOUNT_ID`.
5. `.env`: `B2BROUTER_BASE_URL=https://api-staging.b2brouter.net`.

## 6. Cómo probar (Sandbox, hoy mismo)

1. `.env`: `INVOICING_ENABLED=true`, `INVOICING_DRIVER=b2brouter`, credenciales de **Sandbox** (clave `test_...`).
2. `php artisan config:clear`.
3. `php artisan migrate` (crea `fiscal_invoices`, si no está ya migrada).
4. Completar un pago Stripe de prueba de un `Pedido` o `UserBono` (Stripe test mode).
5. Verificar en `storage/logs/laravel.log` que `CreateB2BRouterInvoiceJob` y `PollB2BRouterTaxReportJob` se ejecutan (con `QUEUE_CONNECTION=database`, lanzar `php artisan queue:work` para procesarlos).
6. Revisar la fila en `fiscal_invoices`: debe llegar a `status=registered` con `tbai_identifier` y `qr_payload` (simulados en Sandbox), o a `failed` con `last_error` legible.
7. Contrastar la factura creada en el panel de B2BRouter (verás la franja morada de Sandbox y la marca de agua "no válida" en el PDF/preview — normal, es solo de prueba).
8. Antes de pasar a producción real con Hacienda, repetir el flujo contra **Staging** (punto 5) para validar el envío TicketBAI de verdad.

## 7. Tests

`tests/Feature/Invoicing/B2BRouterInvoiceTest.php` (Pest, `Http::fake`):

- Flag OFF → 0 filas, 0 llamadas HTTP.
- Flag ON, flujo completo (`create` + 2 sondeos) → 1 fila `registered` con `identifier`/`qr` simulados.
- Reintento del Job de creación → sigue existiendo 1 sola fila y solo 1 POST de alta (idempotencia por `b2b_invoice_id`).
- Payable sin datos fiscales suficientes → `status=failed`, sin ninguna llamada HTTP.

```
php artisan test --filter=Invoicing
php artisan test --filter=Payments
```

## 8. Acceso del cliente a factura + TicketBAI

El cliente autenticado propietario del payable puede:

1. **Página de éxito de pago** (`/pago/exito`): enlace “Ver factura / TicketBAI” cuando exista `fiscal_invoices`.
2. **Detalle de factura** (`/pagos/facturas/{id}`): muestra estado, **identificador TicketBAI**, **QR** y botón de **PDF**.
3. **PDF** (`/pagos/facturas/{id}/pdf`): proxy autenticado a B2BRouter (`GET /invoices/{id}/as/pdf.invoice`) — no se expone la API key.
4. **Mis bonos / Mis pedidos**: enlace “Factura TBAI” cuando haya factura asociada.

El **recibo Stripe** (comprobante de cobro) y la **factura TicketBAI** (documento fiscal) son cosas distintas y coexisten.

## 9. Limitaciones conocidas / TODO iteración 2

- **NIF/dirección fiscal del cliente**: `User` no almacena hoy estos campos. Se emite como *factura simplificada* (nombre + email). Para clientes que requieran factura completa (NIF, dirección), añadir estos campos al modelo/formulario y extender `FiscalInvoiceBuilderService::buildContact()` y `FiscalInvoiceContactDto`.
- **IVA único** (`config('invoicing.default_vat_percent')`, 21% por defecto) aplicado a toda línea. Si conviven tipos distintos (p.ej. exención educativa), habrá que derivarlo por producto/servicio.
- **Anulación / rectificativas**: no implementado. B2BRouter soporta facturas rectificativas; documentar y construir en iteración 2 antes de habilitar cancelaciones de `Pedido`/`UserBono` ya facturados.
- **Carrera de alta concurrente**: `WithoutOverlapping` en ambos Jobs reduce pero no elimina al 100% la ventana entre "leer `b2b_invoice_id`" y "llamar a B2BRouter" si dos workers procesan el mismo `stripe_checkout_session_id` en paralelo fuera de la cola (p.ej. ejecución manual simultánea). No se ha observado en el flujo normal (1 Job por `PaymentConfirmed`).
- **Esquema de respuesta de `GET /tax_reports/{id}`**: `B2BRouterFiscalInvoiceIssuer::getTaxReport()` asume una forma razonable (`state`, `identifier`, `qr`, `error_message`) basada en la documentación pública. Verificar contra una respuesta real de staging antes de pasar a producción y ajustar el parseo si el esquema exacto difiere.
