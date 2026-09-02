# L1 — dinero Stripe (FASE 2) · prompt para Cursor (v2 — afinado por Reasonix)

> Estado: luz verde del dueño concedida (2026-08-27). L0 ya implementado y verificado (354 tests).
> Informe: `docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md` §8 (N2, N3, A7, T3, P2, W1) y §9.
> N4-remate: YA HECHO y FUERA de L1 (regla de periodo en `resolvePeriodoInicio`, no reimplementar).

---

```
FASE 2 — L1: dinero Stripe (raíz común W1). Luz verde del dueño concedida. NO toques nada fuera de esta lista.

ANTES DE ESCRIBIR
Lee docs/taller-prompts/COORDINACION.md (Estado actual + Última actividad) y docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md §8 y §9. Lee el código real de cada archivo citado: no asumas números de línea ni que la suite sigue en 354 tests. Si un hallazgo ya está hecho, no lo reimplementes.

CONTEXTO
L0 ya aplicado: guardas confirmSurfTrip, periodo taquilla, 404 producto, 301.
N4-remate YA HECHO y FUERA de L1. NO toques resolvePeriodoInicio() ni darDeAltaTaquilla().
La regla del periodo NO es max(hoy, encadenado): sin baja avisada se encadena (deuda); con baja efectiva / alta posterior arranca hoy. Esa regla se queda.

OBJETIVO (6 arreglos, todos de dinero/consistencia)

1) W1 — PaymentGatewayService: los confirmadores deben devolver MOTIVO, no bool.
   Hoy confirmPaymentFromWebhook (y las confirmaciones por dominio) devuelven bool y cualquier
   «payable no confirmable» se clasifica retryable:true. Eso hace que T3/P2/N3 nunca disparen
   ALERT_PERMANENT_FAILURE.
   Hacer: resultado tipado con motivo (ok | transitorio | permanente:deleted|cancelled|rejected|
   token_no_match|importe). Cambiar la firma y adaptar PaymentWebhookController (503 solo si
   transitorio; permanente → 200 + Log::critical con marca ALERT_PERMANENT_FAILURE).
   ALCANCE: adapta al nuevo resultado tipado SOLO los confirmadores de este lote (cuota taquilla,
   fotos, academia). Los de tienda/alquiler/subastas/bonos NO se tocan ahora: se adaptan cuando
   pasen por el mismo punto; no amplíes el alcance.

2) T3 — taquilla: no purgar pendientes con sesión Stripe viva + enviar expires_at a Stripe.
   Hoy config/taquilla.php da 30 min al PagoCuota; el purge lo borra mientras la sesión Stripe
   vive 24 h (createCheckoutSession sin expires_at propio). Resultado: cobro sin cuota, webhook
   503 que Stripe reintenta ~3 días y abandona.
   Hacer:
   - PaymentGatewayService::createCheckoutSession acepta/usa expires_at (30 min–24 h; el mínimo
     que admite Stripe = el TTL actual de taquilla).
   - El purge NO borra un PagoCuota pendiente mientras exista su fila en payment_webhook_idempotency
     viva (checkout_url / expires_at futuro). Para saber si la sesión está viva, REUSA el helper
     existente openCheckoutUrlFor / FindsOpenCheckout (F1/F2 ya lo dejaron en tienda/subastas):
     no reimplementes la consulta a mano.
   - NO cambiar config/taquilla.php (30 min es correcto como mínimo).
   - NO cambiar la regla de encadenado de periodo.
   Tests: extender TaquillaPendingCheckoutExpirationTest (los existentes deben seguir verdes:
   crean pendientes sin fila de idempotency, así que openCheckoutUrlFor devuelve null → siguen
   purgándose); añadir «pendiente con sesión Stripe viva NO se purga» y «webhook de PagoCuota
   borrado → retryable:false + alerta».

3) P2 — fotos: carrera cron-cancelación vs webhook.
   Hoy cancelExpiredPending marca cancelled; si llega checkout.session.completed después,
   ConfirmPhotoBookingPaymentAction lanza ValidationException → retryable:true → 503 infinito
   sin alerta.
   Hacer (fijado por Reasonix — opción a): RESURRECCIÓN. El cliente ya pagó: su dinero confirma
   intención; reembolsar sin aviso le quita las fotos que quería y añade código de refund al lote.
   - Webhook con pago confirmado + reserva cancelled por caducidad → revivirla a confirmed y
     anotar en admin_notes el cambio (fecha, motivo). NO abrir refund automático.
   - Si un día se decide refund (b), será decisión del dueño; no lo implementes ahora.
   Tests: webhook tras reserva cancelada → confirmada; nunca 503 infinito ni alerta falsa.

4) N3 — taquilla: usar FindsOpenCheckout (doble cargo de cuota).
   Hoy el pago de cuota abre sesión nueva por clic sobre el mismo PagoCuota. 2 pagos = 2 cobros,
   1 cuota. Es el F1/F2 ya corregido en tienda/subastas.
   Hacer: reutilizar FindsOpenCheckout en el flujo de pago de cuota, igual que
   CreateStoreCheckoutAction / AuctionSettlementService; si hay sesión viva no expirada, devolverla.
   Tests: doble POST de pago de cuota → 1 sola sesión Stripe.

5) A7 — academia y alquiler: reusar openCheckoutUrlFor.
   payPendingEnrollment, payClassEnrollment y payRentalBooking abren sesión nueva cada clic;
   createCheckoutSession ya persiste checkout_url/expires_at. Reutilizar la sesión abierta.
   Tests: doble clic en «pagar» academia/alquiler → misma URL de checkout.

6) N2 — cupo extra: pagar con tarjeta no debe saltar la aprobación; denegar reembolsa.
   Hoy requestLesson no ramifica por pending_admin: el alumno paga y confirmLessonPayment lo
   pone CONFIRMED; DenyEnrollmentQuotaAction ya no puede denegar; si deniega antes, no hay refund.
   Una plaza bono_vip entra en payPendingEnrollment y el alumno paga con tarjeta lo que cubría el bono.
   Hacer:
   - requestLesson con cupo extra pendiente de admin: NO abrir checkout hasta que el admin apruebe
     (plaza PENDING_EXTRA_MONITOR; el pago se inicia tras aprobar).
   - DenyEnrollmentQuotaAction: reembolsar por el MISMO medio (decisión dueño): tarjeta → refund
     Stripe contra el PaymentIntent ORIGINAL (payment_webhook_idempotency guarda payment_intent_id;
     no crear sesión nueva); bono → CreditEngineService::refundCredits.
   - payPendingEnrollment no debe ofrecer pago con tarjeta cuando la plaza es bono_vip con saldo.
   Tests: pagar cupo extra → sigue PENDING_EXTRA_MONITOR hasta aprobación; denegar cupo pagado →
   refund Stripe o crédito según medio; bono con saldo no ofrece tarjeta.

REGLAS
- Cada arreglo: tests primero o junto (Pest), luego suite completa + npm run build solo si tocas frontend (aquí no debería).
- No cambies unitsForCharge (eso es L2).
- No toques AvailabilityService, la política de cancelación de 4 h, ni confirmSurfTrip (L0 cerrado).
- No implementes L2/L3/L4/L5 ni el canal de alerta SMTP (solo deja la marca ALERT_PERMANENT_FAILURE).
- No adaptes confirmadores fuera de este lote (ver W1).
- Reclama y cierra la tarea en COORDINACION.md.

FORMATO DE CIERRE
Por cada arreglo: qué tocaste, tests nuevos, resultado de la suite.
Al final: veredicto si algún arreglo exige decisión del dueño. Si un hallazgo ya estaba hecho, dilo y no lo reescribas.

ACEPTACIÓN
- 6 arreglos hechos o justificados como ya existentes.
- Webhook: 503 solo transitorio; permanente = 200 + Log::critical ALERT_PERMANENT_FAILURE.
- Doble clic taquilla/academia/alquiler = una sesión Stripe.
- Cupo extra no se confirma al pagar; denegar reembolsa por el mismo medio (refund al PaymentIntent original).
- P2: reserva de fotos cancelada por cron + webhook con pago → resucita a confirmed (sin refund automático).
- Suite verde. Periodo de taquilla intacto.
```

---

## Cambios respecto a la v1 (los 4 matices de Reasonix)

| # | Cambio | Por qué |
|---|---|---|
| 1 | W1: **ALCANCE** — solo confirmadores de taquilla/fotos/academia | Evita que el lote se expanda a tienda/alquiler/subastas/bonos |
| 2 | P2: **opción (a) fijada** (resurrección), (b) aplazada a decisión del dueño | El cliente ya pagó; refund sin aviso = peor UX + más código |
| 3 | T3: **reusar `openCheckoutUrlFor`/`FindsOpenCheckout`** (F1/F2) | Mismo patrón ya probado; no reimplementar la consulta |
| 4 | N2: refund contra el **PaymentIntent original** | `payment_webhook_idempotency.payment_intent_id`; evita refund imposible |

Listo para pegar en Cursor tal cual.
