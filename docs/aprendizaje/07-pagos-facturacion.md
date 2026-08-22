# 07 · Pagos y facturación (Stripe + TicketBAI)

> Flujo real de cobro y factura fiscal en `maider_0`. Cada entrada: qué es, por qué, dónde está, cómo recordarlo.
> Detalle técnico de B2BRouter: `docs/invoicing/B2BROUTER-TICKETBAI.md`. Webhook Stripe: `docs/payments/STRIPE-WEBHOOK.md`.

## Mini-índice

- 7.1 Dos tubos: cobro Stripe ≠ factura TicketBAI
- 7.2 Flujo paso a paso (carrito → Hacienda)
- 7.3 IVA incluido en la web, neto hacia B2B
- 7.4 Sandbox vs Hacienda de verdad
- 7.5 Cómo probarlo en local

---

## 7.1 Dos tubos: cobro Stripe ≠ factura TicketBAI

- **Qué es:** un pago web genera **dos documentos**. (1) **Recibo Stripe**: “he cobrado”. (2) **Factura TicketBAI**: documento fiscal vasco (identificador + QR + envío a Hacienda Foral).
- **Por qué importa:** el recibo de Stripe **no** sustituye la factura. Hacienda no mira Stripe. Mezclarlos te hace pensar que “ya está facturado” cuando solo está cobrado.
- **En tu proyecto:** recibo = `DispatchStripeReceiptCaptureListener` + `PaymentReceiptController` (a veces redirige a Stripe). Factura = `CreateB2BRouterInvoiceJob` → B2BRouter → `fiscal_invoices`. El cliente ve la fiscal en `/pagos/facturas/{id}` y `/mis-facturas`, no en el panel de Stripe.
- **Para recordar:** *Stripe cobra. B2BRouter factura. Son tubos distintos.*

---

## 7.2 Flujo paso a paso (carrito → Hacienda)

- **Qué es:** la cadena completa de un pedido de tienda pagado con tarjeta.
- **Por qué importa:** si falla un eslabón, el síntoma cambia (pedido sin “con tarjeta”, sin factura, o factura “en trámite” para siempre).
- **En tu proyecto (verificado):**
  1. Socio con taquilla o VIP → carrito → `POST crear.pedido` (`PedidoController`) crea el pedido **pendiente** y `payment_method=card`.
  2. Stripe Checkout cobra. Tarjeta test: `4242…`.
  3. Vuelta a `/pago/exito` y/o webhook `POST /webhooks/stripe` → `PaymentGatewayService` marca `pagado` (idempotente por `stripe_checkout_session_id`).
  4. Evento `PaymentConfirmed` (`AppServiceProvider`) encola **recibo** y **factura**.
  5. Worker (`queue:work`) ejecuta `CreateB2BRouterInvoiceJob` → `IssueFiscalInvoiceAction` (1 fila por sesión Stripe) → B2BRouter crea la factura.
  6. Si B2B devuelve `tax_report_ids`, `PollB2BRouterTaxReportJob` sondea hasta `registered` (identificador + QR).
- **Hueco ya corregido:** si el webhook confirma primero, `/pago/exito` no volvía a disparar el evento → cobro OK, **cero** factura. Ahora reintenta si no hay `fiscal_invoices`.
- **Para recordar:** *sin `PaymentConfirmed` + worker, Stripe puede haber cobrado y B2B no enterarse.*

---

## 7.3 IVA incluido en la web, neto hacia B2B

- **Qué es:** en tienda B2C el precio al público **lleva IVA**. Stripe cobra ese total. B2BRouter pide `price` **sin IVA** y luego aplica el 21 %.
- **Por qué importa:** si mandas 45,71 € como neto + 21 %, la factura sale 55,31 € y no cuadra con el cobro.
- **En tu proyecto:** `FiscalInvoiceLineDto::$unitPriceCents` = importe cobrado (IVA incl.). `B2BRouterFiscalInvoiceIssuer::linePayload` usa `MoneyCents::netFromGrossInclusiveVat()` (ej. 45,71 → neto 37,78 + IVA 7,93 = 45,71).
- **Para recordar:** *la web no “quita el IVA”; B2B recibe la base. El total de la factura = lo cobrado.*

---

## 7.4 Sandbox vs Hacienda de verdad

- **Qué es:** B2BRouter tiene Sandbox (`test_…`), Staging y Production. En Sandbox el PDF lleva marca **«No válida / factura de pruebas»**. Hacienda Foral **no** registra de verdad.
- **Por qué importa:** “en trámite” 3 minutos no significa que vaya a salir el QR. Si `tax_report_ids` viene vacío (cuenta sin TicketBAI Gipuzkoa), el sondeo no arranca y se queda así.
- **En tu proyecto:** `INVOICING_ENABLED` en `.env` (kill-switch). Emisor (nombre S.L., NIF, Registro Mercantil) se configura **en el panel B2B**, no en el pedido. TicketBAI real = Staging/prod + tax_report de Gipuzkoa en B2B.
- **Para recordar:** *Sandbox sirve para ver el PDF de prueba. TBAI + QR = cuenta B2B con TicketBAI, no esperar al reloj.*

---

## 7.5 Cómo probarlo en local

- **Qué es:** checklist para un pago de tienda de prueba.
- **Por qué importa:** sin cola o sin flag, “Mis facturas” vacío no es un bug de Stripe.
- **En tu proyecto:**
  1. `.env`: `INVOICING_ENABLED=true`, claves B2B `test_…`, Stripe `pk_test_` / `sk_test_`.
  2. Terminal 1: `php artisan serve`. Terminal 2: `php artisan queue:work` (si no, no hay factura).
  3. Entra como socio (taquilla o VIP). Compra. Paga con `4242 4242 4242 4242`.
  4. Mira el worker: `CreateB2BRouterInvoiceJob`. Luego `/mis-facturas` o el pedido.
  5. PDF Sandbox = prueba. Identificador TBAI solo si B2B devolvió tax report.
- **Para recordar:** *serve + worker. Stripe test. Flag ON. El PDF viejo de un pedido ya enviado a B2B no se recalcula.*
