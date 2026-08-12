# 04 · Patrones (de diseño y arquitectónicos)

> Patrones que aparecen de verdad en `maider_0`. Cada uno: qué resuelve, cómo se ve en tu código, y cuándo usarlo.

---

## 4.1 Pessimistic Locking (bloqueo pesimista)

- **Qué resuelve:** dos peticiones compitiendo por el mismo recurso (la última plaza, el mismo bono).
- **Cómo:** `Model::lockForUpdate()` dentro de una transacción: la fila queda bloqueada hasta el `commit`.
- **En tu proyecto:** `AvailabilityService::withLockedLesson` (cupos de clases), `EnrollStudentAction` (bloqueo de `UserBono`).
- **Cuándo usarlo:** cuando la carrera es real y perder una unidad de stock/plaza importa.
- **Para recordar:** *"yo primero" — bloqueo pesimista. Corto y dentro de transacción.*

---

## 4.2 Patrón Money (nunca flotantes para dinero)

- **Qué resuelve:** los errores de coma flotante (`0.1 + 0.2 !== 0.3`). El dinero **nunca** se guarda/calcula como `float`.
- **Cómo:** trabajar en **céntimos (int)** y convertir a € solo en la presentación. En tu proyecto los DTOs de pagos usan "céntimos int".
- **En tu proyecto:** `DTOs/Payments/*` ("línea Stripe (céntimos int)"), `DTOs/Invoicing/FiscalInvoiceLineDto` ("céntimos int; conversión € solo en el client B2B").
- **Para recordar:** *dinero = enteros en céntimos; el € es solo para mostrar.*

---

## 4.3 Observer (reaccionar a cambios sin acoplar)

- **Qué resuelve:** ejecutar algo cuando un modelo cambia (crear/actualizar/borrar) sin ensuciar el modelo ni al que lo modificó.
- **Cómo:** un Observer de Eloquent escucha los eventos del modelo y despacha trabajos (ej. sincronizar Firestore).
- **En tu proyecto:** regla V3: Firestore se sincroniza **asíncrona** bajo patrón Observer con degradación elegante (si Firestore falla, MySQL no se cae); `AcademyController` usa Observer para la cancelación "Mal Mar".
- **Para recordar:** *algo cambia → el Observer avisa → Job en cola. Nadie se entera de quién avisó.*

---

## 4.4 Pipeline (procesar por etapas)

- **Qué resuelve:** dividir un procesamiento complejo en etapas encadenadas donde cada una transforma/valida y pasa al siguiente.
- **En tu proyecto:** `VipStudentPerformanceService` (procesamiento analítico del rendimiento de estudiantes) según manifiesto V3.
- **Para recordar:** *cinta transportadora de pasos: entra el dato, sale el resultado.*

---

## 4.5 Patrón Money en UI / idempotencia como patrón de integración

- **Qué resuelve:** que un mismo evento externo (webhook, reintento de red) no produzca efectos duplicados.
- **Cómo:** clave única de idempotencia (ej. `stripe_checkout_session_id`) y guardar/consultar antes de procesar.
- **En tu proyecto:** `IssueFiscalInvoiceAction` (idempotente por `stripe_checkout_session_id`).
- **Para recordar:** *la clave única es la memoria de "esto ya lo hice".*

---

> **Por ampliar:** 4.6+ (Repository, Strategy, Command, Saga, Outbox…). Se añade cuando salga en el código o en tus preguntas.
