# L2 — créditos (FASE 2) · prompt para Cursor (v1 — redactado por Reasonix)

> Decisiones del dueño (2026-08-30, vía recomendación de Cursor):
> 1. `APP_TIMEZONE` producción → **`Europe/Madrid`** (el `.env` local sigue UTC; casts de fotos se corrigen en L3).
> 2. **UNIQUE de taquilla = columna generada anulando 500/600** (patrón F3); NO tabla `locker_assignments`.
> 3. Créditos de VIP ya borradas: **se asumen perdidos** (no hay reconstrucción).
> 4. A9: persistir y refundar lo cobrado; **NO cambiar la fórmula** (`LessonBonoCreditUnits` se queda).
> L1 ya implementado y verificado (376 tests). Informe: `AUDITORIA-BACKEND-FASE2-2026-08-27.md` §8/§9.

---

```
FASE 2 — L2: créditos de academia (A1 + A2 + A9 + extraer confirmSurfTrip a Action).
Luz verde del dueño concedida. NO toques nada fuera de esta lista.

ANTES DE ESCRIBIR
Lee docs/taller-prompts/COORDINACION.md (Estado actual + Última actividad) y docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md §8 y §9. Lee el código real de cada archivo citado: no asumas números de línea ni que la suite sigue en 376 tests. Si un hallazgo ya está hecho, no lo reimplementes.

CONTEXTO
L0 + L1 ya aplicados (guardas confirmSurfTrip, periodo taquilla, 404 producto, 301, dinero Stripe: W1/T3/P2/N3/A7/N2). Suite actual ~376 tests verdes.
Decisiones del dueño ya tomadas (NO reabrir):
- APP_TIMEZONE de producción = Europe/Madrid (solo .env de prod; NO tocar casts ahora, es L3).
- UNIQUE de taquilla = columna generada anulando 500/600, NO tabla nueva (NO se implementa en L2: es L3).
- Créditos de clases VIP ya borradas = perdidos (no hay script de reconstrucción).
- NO cambiar LessonBonoCreditUnits / unitsForCharge.

OBJETIVO (4 arreglos, todos de créditos/consistencia)

1) A1 — refund sobre-crédito: persistir unidades REALES cobradas y refundar esas mismas.
   El cobro usa unitsForCharge(modality, participantTotalAfter) con participantTotalAfter = total de la clase
   (EnrollStudentAction.php:124, ApproveEnrollmentQuotaAction.php:108), pero el refund usa
   unitsForCharge(modality, quantity de la inscripción) que en el flujo online siempre es 1
   (CreditEngineService::resolveRefundUnits:163-173). Para grupal/semanal: 1.er ocupante cobra 2, 2.º+ cobra 1;
   el refund devuelve siempre 2 → sobre-crédito de +1 por alumno.
   Además hoy NO se registra lo cobrado: EnrollStudentAction escribe credits_locked => 0 (:83, :134) y
   BonoConsumption solo guarda remaining_after (:147; modelo BonoConsumption.php fillable).
   Hacer:
   - Persistir las unidades realmente cobradas: añadir columna (p.ej. units_consumed, int) a la tabla
     de consumos/lesson_user que usa el cobro (migración nueva + backfill con el mismo cálculo
     unitsForCharge aplicado sobre los datos existentes donde sea determinable).
   - resolveRefundUnits (y los refunds de CreditEngineService / LessonObserver Mal Mar / cancelaciones)
     deben leer esa columna persistida en lugar de recalcular por quantity. Fallback para filas sin dato:
     el cálculo actual (no inventar otro).
   - NO cambiar unitsForCharge ni la fórmula de cobro.
   Tests: grupal con 2.º ocupante (cobra 1) → refund de 1 (no 2); grupal 1.er ocupante (cobra 2) → refund 2;
   bono quedar con saldo exacto tras refund (sin créditos regalados).

2) A2 — VipClassManagerController::destroy: devolver créditos de alumnos inscritos.
   Hoy destroy (VipClassManagerController.php:268-296) borra LessonUser + StaffAssignment + lesson con
   cascadeOnDelete y solo Log::warning + flash «consumos revertidos» (falso). Créditos de bonos perdidos.
   Hacer:
   - Antes de borrar, para cada enrollment activo (ACTIVE_ENROLLMENT_STATUSES) cuyo pago fue con bono
     (payment_method bono / user_bono_id), devolver los créditos con el MISMO mecanismo de refund que A1
     (unidades persistidas o fallback de cálculo) dentro de la misma transacción.
   - Log con detalle por alumno (user_id, unidades devueltas) y flash honesto («X créditos devueltos» o
     «sin alumnos inscritos»).
   - Los pagados con tarjeta/otro medio NO se tocan (no hay refund Stripe aquí: es decisión separada).
   Tests: destroy de VIP con alumno de bono → créditos devueltos y BonoConsumption actualizado; destroy
   sin alumnos → sin tocar saldos; flash veraz.

3) A9 — VIP en solitario: el panel miente (VIP_CREDIT_COST=1 vs unitsForCharge('vip', 1)=2).
   NO cambiar la fórmula de cobro. Tres números para el mismo consumo: VIP_CREDIT_COST=1 (panel/flash),
   unitsForCharge('vip',1)=2 (cobro/refund), y el log de destroy hardcodea virtual_credit_refund_uc=1.
   Hacer:
   - Unificar la fuente de verdad: los mensajes/notas/logs (flash destroy, notas de consumo, panel de
     créditos) deben leer las unidades REALES (la persistida de A1, o unitsForCharge) en lugar de
     constantes sueltas como VIP_CREDIT_COST.
   - No tocar unitsForCharge ni precios. El «VIP = siempre 1» sería decisión de producto; NO entra aquí.
   Tests: flash/nota de consumos VIP refleja las unidades reales (2 en solitario), no 1.

4) confirmSurfTrip → Action (dinero fuera del controlador).
   Las guardas de L0 se quedan (is_surf_trip, no empezada, surf_trip_confirmed null, activeSeatStatuses).
   Hacer: extraer la lógica de LessonController::confirmSurfTrip (~696-723, refund de crédito + update
   surf_trip_confirmed) a app/Actions/Academy/ (p.ej. ConfirmSurfTripAction) con el mismo comportamiento
   y las mismas guardas; el controlador solo delega. Usa el refund unificado de A1.
   Tests: los existentes (SurfTripRefundGuardTest) siguen verdes SIN cambios de comportamiento; mismo
   mensaje de error para cada guarda.

REGLAS
- Cada arreglo: tests primero o junto (Pest), luego suite completa + npm run build solo si tocas frontend (aquí no debería).
- NO tocar: LessonBonoCreditUnits/unitsForCharge, AvailabilityService, política de cancelación de 4 h,
  resolvePeriodoInicio/darDeAltaTaquilla (periodo de taquilla), casts de fotos (L3), SMTP/alerta webhook,
  UNIQUE de taquilla (L3), tienda/subastas/bonos (fuera de alcance).
- Migración nueva SOLO para la columna de unidades persistidas (A1). Backfill conservador: si el dato no
  es determinable, déjalo nulo y que el fallback cubra (no inventar valores).
- Reclama y cierra la tarea en COORDINACION.md.

FORMATO DE CIERRE
Por cada arreglo: qué tocaste, tests nuevos, resultado de la suite.
Al final: veredicto si algún arreglo exige decisión del dueño. Si un hallazgo ya estaba hecho, dilo y no lo reescribas.

ACEPTACIÓN
- 4 arreglos hechos o justificados como ya existentes.
- Refund de grupal 2.º ocupante devuelve 1 (no 2); 1.er ocupante devuelve 2. Bono con saldo exacto.
- destroy VIP devuelve créditos de bonos (mismo mecanismo A1) y el flash dice la verdad.
- VIP_CREDIT_COST no se usa como número «mágico» en mensajes/logs nuevos.
- confirmSurfTrip delegado en Action; SurfTripRefundGuardTest intacto y verde.
- unitsForCharge intacto. Periodo de taquilla intacto. Suite verde.
```

---

## Verificación del diff L2 — v2 (prompt del dueño + 3 mejoras Reasonix)

```
FASE 2 — L2 créditos: VERIFICACIÓN del diff. NO implementes. Abre cada archivo:línea,
confirma/matiza/descarta y devuelve la tabla. Persona AGENTE-BACKEND-SENIOR (R1–R8).
Destinatario: quien NO implementó el lote (Reasonix). Si el lote no está en disco
(COORDINACION L2 ≠ HECHO, o no hay migración/Action nuevas), PARA y dilo: no audites §8 otra vez.

Informe: docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md §8/§9
Prompt: docs/taller-prompts/PROMPT-L2-CREDITOS.md
Lee el código ACTUAL (no asumas líneas del informe). Suite de partida L1: 376 tests.

PRE-VUELO
1) git diff de estos paths (o el equivalente en disco):
   CreditEngineService, LessonBonoCreditUnits, EnrollStudentAction, ApproveEnrollmentQuotaAction,
   BonoConsumption, LessonUser, VipClassManagerController, LessonController::confirmSurfTrip,
   Actions/Academy/*SurfTrip*, LessonObserver, CancelEnrollmentAction, DenyEnrollmentQuotaAction,
   database/migrations/*units* / *consumed*, tests/Feature/Academy/*
2) grep refundCredits|resolveRefundUnits|VIP_CREDIT_COST|unitsForCharge|units_consumed|credits_locked
3) php artisan test  (suite completa; anota N tests / aserciones / tiempo)

VEREDICTO
CONFIRMADO = el arreglo existe y cumple la lente.
MATIZ = existe pero causa/alcance distinto (explica).
DESCARTADO = falta, está mal, o cambia comportamiento legacy. Evidencia archivo:línea.

A1 — persistir unidades cobradas
- ¿Columna nueva nullable (p.ej. bono_consumptions.units_consumed) O se reutiliza
  lesson_user.credits_locked escribiendo por fin el número real? Ambas valen; dilo cuál.
- RESOLUCIÓN DEL REFUND (clave): resolveRefundUnits recibe LessonUser (enrollment), no un consumo.
  Si la columna va en bono_consumptions → el refund debe poder consultarla por (lesson_id, user_id):
  comprueba que exista el lookup/relación, no un cálculo paralelo. Si se reutiliza
  lesson_user.credits_locked → REVISA CreditEngineService.php:167 (max(1, credits_locked) hoy es 0
  y el fallback recalcula; con número real escrito dejaría de ser fallback y devoraría filas vacías).
- Backfill: nulo si no determinable. DESCARTADO si rellena con unitsForCharge(modality, 1)
  (escribiría 2 en el 2.º ocupante) o con ocupación actual de la clase. En bono_consumptions,
  backfill SOLO de filas con user_bono_id NOT NULL (consumos sin bono: fallback por quantity sigue).
- Fallback filas sin dato = el cálculo ACTUAL (unitsForCharge por quantity), no uno nuevo.
- Refund lee la columna persistida. Reproduce: grupal 2.º (cobro 1)→refund 1; 1.º (cobro 2)→refund 2;
  bono con saldo exacto (0 regalados).
- UN solo resolveRefundUnits (o equivalente). Callers que ya van a refundCredits
  (LessonObserver Mal Mar, CancelEnrollmentAction, DenyEnrollmentQuotaAction, confirmSurfTrip)
  no deben recalcular por su cuenta.
- LessonBonoCreditUnits / unitsForCharge: git diff vacío. Si hay diff → DESCARTADO.

A2 — destroy VIP
- refundCredits ANTES de borrar lesson/enrollments, MISMA DB::transaction.
  cascadeOnDelete de bono_consumptions.lesson_id: borrar primero = rastro perdido.
- IDEMPOTENCIA: tras borrar con cascade, un segundo destroy no debe refundear nada (no hay
  enrollments activos). Comprobar que el refund no se duplica ni se ejecuta con saldo inventado.
- Filtro real: payment_method === 'bono_vip' (NO 'bono'; LessonUser NO tiene user_bono_id).
  Tarjeta/tienda/datafono: sin refund Stripe.
- Mismo mecanismo A1. No LessonObserver::deleted que doble-refundee.
- Flash veraz («X créditos» vs «sin alumnos»). Log: user_id + unidades por alumno
  (no virtual_credit_refund_uc=1).
- Clases VIP ya borradas: fuera (dueño: perdidas). No script de reconstrucción.

A9 — fuente de verdad VIP
- grep VIP_CREDIT_COST y «consume 1 crédito»: create, update y replicatePreviousWeek
  (hoy ~182, ~255, ~340). Deben leer unidades reales (persistida o unitsForCharge), no 1 mágico.
- No se cambió la fórmula ni precios.

confirmSurfTrip → Action
- LessonController solo valida request y delega. Misma firma de errores que
  SurfTripRefundGuardTest (el test NO debe cambiar casos ni strings).
- Guardas L0 intactas (is_surf_trip, no empezada, surf_trip_confirmed null, activeSeatStatuses).
- Refund solo si confirm=0 y (hoy) payment_method bono_vip, vía CreditEngine unificado.

ALCANCE NEGATIVO (si hay diff → MATIZ/DESCARTADO)
LessonBonoCreditUnits, AvailabilityService, corte 4 h, resolvePeriodoInicio/alta-baja,
casts fotos, UNIQUE taquilla, SMTP/alerta, tienda/subastas.

FORMATO (este orden)
1) Tabla: | ID | Veredicto | Dónde (archivo:línea actual) | Evidencia 1–2 líneas |
2) Tests: suite N/aserciones/tiempo + lista de tests nuevos y qué cubren.
3) Diff fuera de alcance (si lo hay).
4) ¿Exige decisión del dueño? Sí/no + una línea.
5) Hallazgos P0/P1 nuevos en ESTOS archivos (si no hay, dilo).

NO toques código. No «nº queries» (no es R1).
```

## Notas para el dueño

- **A1 es el arreglo gordo del lote**: toca migración + `CreditEngineService` + `LessonObserver` (Mal Mar) + refunds de cancelación. Es M/L en esfuerzo.
- **A9 es pequeño**: unificar la fuente de verdad de mensajes/logs; sin tocar fórmulas.
- **A2 y confirmSurfTrip** son M y S respectivamente.
- Al cerrar L2 quedan: **L3** (casts fotos + UNIQUE taquilla + dedupe A3 + caché T2 — ya desbloqueado por tus decisiones), **L4** chatbot, **L5** rendimiento/deuda. Y los manuales: SMTP + prueba del panel Ex-socios.
