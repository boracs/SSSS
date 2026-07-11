# Master Prompt Operativo — V3-ULTRA (maider_0)

Usa este documento como plantilla de trabajo para cualquier tarea técnica en Cursor.

## 1) Contexto mínimo
- Stack: Laravel 11 + PHP 8.2+, React 19 + Inertia 2, MySQL.
- Dominios críticos: Academia, Rentals, Taquillas, Bonos VIP, Pedidos.
- Pagos actuales: Stripe Checkout + webhooks + idempotencia.

## 2) Servicios/áreas sensibles
- `AvailabilityService`: cupo y staff (evitar overbooking).
- `BookingService`: precio/disponibilidad Rentals (SSOT).
- `CreditEngineService` + `BonoService`: saldo/bonos.
- `PaymentGatewayService`: checkout, intentos, webhook idempotente.
- `TaquillaMembershipService`: cuotas y confirmación de membresía.

## 3) Protocolo de ejecución por tarea
1. Leer `docs/ai/01-cto-protocol.md`.
2. Validar contexto en `docs/PROJECT_TREE_FOR_GEMINI.md`.
3. Hacer +AA breve (impacto, concurrencia, seguridad, datos).
4. Ejecutar cambio por capas cuando aplique:
   - Migration
   - DTO
   - Action
   - Service
   - Controller
   - UI
5. Verificar y documentar cambios.

## 4) Reglas no negociables
- `declare(strict_types=1);`
- Sin lógica de negocio en controller ni JSX.
- `DB::transaction()` en operaciones multi-escritura.
- `lockForUpdate()` en recursos con concurrencia.
- Dinero en céntimos (`int`) en el dominio.
- Logs de error con contexto (`payable_type`, `payable_id`, ids relevantes).

## 5) Formato de respuesta recomendado
- +AA (3-6 bullets).
- Implementación aplicada (qué cambió y por qué).
- Riesgos / compatibilidad.
- Validación ejecutada.
- Próximo paso sugerido.

## 6) Plantilla rápida (copiar/pegar)
```md
Objetivo:
Contexto:
Restricciones:

Aplica +AA y luego implementa por capas (Migration -> DTO -> Action -> Service -> Controller -> UI).

Valida:
- Sintaxis
- Flujo principal
- Impactos colaterales

Entrega:
- Archivos tocados
- Resultado funcional
- Riesgos pendientes
```

