# Informe Técnico para Cotización — San Sebastián Surf School (S4)

> Estado funcional y arquitectónico de `maider_0` para estimación de mejoras, mantenimiento y roadmap.
> Versión compacta y operativa (alineada al flujo Stripe actual).

## 1) Resumen ejecutivo
- Monolito Laravel + Inertia orientado a dominio.
- Módulos: Academia, Alquileres, Tienda, Taquillas, VIP/Bonos, Segunda Mano, Admin.
- Complejidad técnica: **alta** (concurrencia real + pagos + frontend rico + dominio amplio).

## 2) Stack real
### Backend
- PHP 8.2+, Laravel 11, MySQL (XAMPP), Sanctum, colas/listeners.
- Stripe SDK (`stripe/stripe-php`) para cobros automáticos.
### Frontend
- React 19 + Inertia 2 + Vite 6 + Tailwind 3 + Radix/shadcn.
### Calidad
- Pest + Laravel Pint.

## 3) Arquitectura aplicada
- Domain-driven por carpetas.
- Service Layer + Actions + DTOs readonly.
- Eventos/listeners para side effects.
- Concurrencia con `DB::transaction()` y `lockForUpdate()`.
- Dinero en céntimos (regla de dominio).
- Convención Inertia: `route -> Controller -> Inertia::render`.

## 4) Estado de pagos (actualizado)
### Pasarela activa
Stripe Checkout Sessions para:
- `Booking` (alquileres),
- `LessonUser` (academia),
- `UserBono` (bonos),
- `PagoCuota` (taquillas),
- `Pedido` (tienda).
### Patrón técnico
- DTOs: `InitiatePaymentDto`, `PaymentLineItemDto`
- Action: `InitiatePaymentAction`
- Service: `PaymentGatewayService` (lazy Stripe client)
- Webhook: `PaymentWebhookController`
- Idempotencia: `payment_webhook_idempotency` + `lockForUpdate()`
### Garantías financieras
- Confirmación vía `checkout.session.completed`.
- Anti-duplicado por `transaction_id` y estado `processed`.
- Confirmadores por tipo de payable.
- Fallos secundarios (listeners/notificaciones) no rompen la confirmación principal.
### Legacy
- Se mantiene visualización/gestión administrativa de justificantes históricos manuales.

## 5) Módulos de negocio
1. Auth/perfil/roles.
2. Tienda y pedidos.
3. Academia (cupo/staff/asistencia).
4. Alquileres con pricing dinámico (`BookingService`).
5. Taquillas y llave de emergencia.
6. VIP/bonos y consumo.
7. Segunda mano.
8. Paneles admin y dashboard de pagos.

## 6) Entidades clave
- `User`
- `Lesson`, `LessonUser`
- `Surfboard`, `Booking`, `PriceSchema`
- `Pedido`, `PedidoProducto`
- `PlanTaquilla`, `PagoCuota`
- `PackBono`, `UserBono`, `BonoConsumption`
- `PaymentWebhookIdempotency`

Notas:
- `CreditTransaction` permanece como componente legacy en transición hacia bonos.
- La estructura detallada de carpetas/modelos se referencia en `docs/PROJECT_TREE_FOR_GEMINI.md`.

## 7) Riesgos y deuda prioritaria
- Cobertura de tests insuficiente para pagos y concurrencia.
- Coexistencia de piezas legacy y modernas en algunos flujos.
- Riesgo de desalineación documental si no se actualiza en el mismo cambio.
- Chatbot/Firestore no prioritario (candidato a desactivación modular si queda fuera del roadmap).

## 8) Recomendación por fases
### Fase 1 (rápida, alto retorno)
- Tests de regresión en pagos/reservas.
- Endurecer validaciones y observabilidad de webhook.
- Rutina de mantenimiento documental.
### Fase 2 (evolutiva)
- Consolidar créditos legacy a modelo único de bonos.
- Optimización de payloads Inertia y consultas críticas.
- Hardening de cola/admin/auditoría operativa.
### Fase 3 (opcional)
- Retirada controlada de chatbot/Firestore.
- Automatización de changelog/release notes.

_Documento vivo. Revisar en cada cambio estructural relevante._
