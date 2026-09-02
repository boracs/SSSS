# 01 · Arquitectura

> Estructura, capas y reglas de oro del backend. Todo lo de aquí está implementado de verdad en `maider_0` — no es teoría suelta.

---

## 1.1 Atomicidad (todo o nada)

- **Qué es:** una operación que toca varias tablas se envuelve en `DB::beginTransaction()`. Si algo falla a mitad, `DB::rollBack()` deshace **todo** lo anterior. El estado nunca queda a medias.
- **Por qué importa:** si un proceso actualiza saldo (crédito), crea una reserva y escribe un log de auditoría, y la BD se cae en el tercer paso → con transacción se revierten los dos primeros. Sin transacción, el sistema quedaría corrupto (dinero movido sin reserva).
- **En tu proyecto:** ejemplos reales → `app/Actions/Academy/CancelEnrollmentAction.php` (revierte enrollment + bono en transacción), `EnrollStudentAction.php`. Los `Action` de `app/Actions/` que mutan varias entidades usan `DB::transaction`.
- **Para recordar:** *todo o nada. Si falla el paso 3, el paso 1 y 2 no existen.*

---

## 1.2 Idempotencia (no repetir efectos)

- **Qué es:** ejecutar la misma petición N veces produce el mismo resultado que la primera, sin efectos secundarios duplicados (ni doble cobro, ni doble consumo de bono) y sin errores 500.
- **Cómo se logra:** el frontend envía una `Idempotency-Key` (UUID). El backend detecta que esa clave ya se procesó con éxito y devuelve la respuesta guardada en vez de re-ejecutar la lógica.
- **Por qué importa:** pagos y webhooks (Stripe) pueden repetirse por red; sin idempotencia un reintento cobraría dos veces.
- **En tu proyecto:** `app/Actions/Invoicing/IssueFiscalInvoiceAction.php` es **idempotente por `stripe_checkout_session_id`** → la factura se crea una sola vez aunque llegue el mismo checkout dos veces.
- **Para recordar:** *misma petición = mismo resultado, sin efectos duplicados.*

---

## 1.3 Concurrencia quirúrgica (`lockForUpdate` — pesimista)

- **Qué es:** `lockForUpdate()` bloquea una fila de la BD para que otra petición no la toque mientras la procesas. Se llama **dentro** de una transacción.
- **Por qué importa:** dos personas apuntándose a la última plaza de una clase a la vez → sin bloqueo, las dos pasan (sobre-reserva). Con bloqueo, la segunda espera y ve que ya no hay plaza.
- **Regla de oro:** el bloqueo debe ser **ultra corto**. Prohibido meter llamadas a APIs externas o procesos lentos de red dentro de un `lockForUpdate` (colapsaría las conexiones de la BD: *lock contention*).
- **Ciclo correcto:**
  1. Abrir transacción.
  2. `lockForUpdate()` para validar disponibilidad (solo BD local, rápido).
  3. Mutar el estado en MySQL.
  4. `commit` → se libera el bloqueo.
  5. **Fuera** del bloqueo: despachar Jobs asíncronos (sincronización externa, pagos, Firestore).
- **En tu proyecto:** `AvailabilityService::withLockedLesson` (usado por `EnrollStudentAction`, `BookingService`). Excepción `TransactionRequiredException` lanza si se usa sin transacción activa.
- **Para recordar:** *bloquea rápido, libera rápido, y el trabajo lento va después (en cola).*

---

## 1.4 Zero-logic controllers (controladores tontos)

- **Qué es:** el controlador **no sabe reglas de negocio, ni cálculos, ni base de datos**. Solo: recibe la petición validada por un `FormRequest`, delega en la capa de negocio (Service/Action) y devuelve la respuesta (`Inertia::render`, redirect, JSON).
- **Por qué importa:** si el controlador tiene lógica, esa lógica no es reutilizable (otro controlador no puede llamarla), es difícil de testear y se duplica. Separar = un solo sitio donde vive cada regla.
- **En tu proyecto:** mira cualquier `app/Http/Controllers/...` → son finos: validan, llaman a un Service/Action, responden. La lógica gorda está en `app/Services/` y `app/Actions/`.
- **Para recordar:** *controlador = recepcionista que pasa el mensaje; no es el que hace el trabajo.*

---

## 1.5 DTOs (Data Transfer Objects)

- **Qué es:** una clase PHP tipada (`declare(strict_types=1)`, propiedades con tipo, muchas veces `readonly`) que transporta datos **estructurados** entre capas, en vez de arrays sueltos.
- **Por qué importa:** un array puede llevar cualquier cosa (string donde se esperaba int, claves que no existen). Un DTO garantiza en el compilador que el dato que llega al Service tiene el tipo correcto → menos bugs, menos "hackeos" por datos inesperados.
- **En tu proyecto:** decenas en `app/DTOs/` — `Rentals/RentalRequestDto`, `Payments/InitiatePaymentDto`, `Chatbot/ChatbotAgentReplyDto`, `Invoicing/FiscalInvoiceDraftDto`… El flujo es: petición → FormRequest valida → DTO → Service.
- **Para recordar:** *el DTO es el "contenedor seguro" entre la petición y la lógica: si el Service espera un int, llega un int.*

---

## 1.6 Services vs Actions vs Helpers (dónde vive cada lógica)

| Pieza | Qué contiene | Regla |
|---|---|---|
| **Service** | Lógica de negocio cohesiva de un **dominio completo** (ej. `BookingService`, `AvailabilityService`, `BonoService`) | Se inyecta en el constructor; se reutiliza |
| **Action** | Una **operación única** con responsabilidad única (ej. `EnrollStudentAction`, `CancelEnrollmentAction`) | Una clase = un trabajo concreto, aislado |
| **Helper** | Utilidades **globales y puras** (formatear fecha, manipular string) | **Nunca** lógica de negocio |

- **Por qué importa:** saber dónde va cada cosa evita controladores gordos, servicios Frankenstein y helpers con reglas de negocio escondidas.
- **En tu proyecto:** `app/Services/` (dominios), `app/Actions/Academy|Photos|Invoicing|Chatbot` (operaciones), y los helpers puros solo para utilidades.
- **Para recordar:** *Service = dominio completo · Action = una operación · Helper = utilidad pura.*

---

## 1.7 ¿Qué es V3 (V3-ULTRA)? — contexto

- **Qué es:** el **nombre interno del estándar técnico** que se definió para `maider_0` cuando se sentaron las reglas de arquitectura: atomicidad estricta, idempotencia, concurrencia con `lockForUpdate`, zero-logic controllers, DTOs, capas Services/Actions/Helpers, tipado estricto, enums, eventos/jobs para lo asíncrono.
- **Por qué importa:** cuando Cursor o yo decimos "según V3" o "regla V3-ULTRA", nos referimos a esas directrices de arquitectura — no es un framework ni una versión de software.
- **En tu proyecto:** es el "manifiesto" que estaba en `Conceptos y flujos de trabajo/Conceptos_teoria_basica.txt`; este libro lo integra. El código real de `app/` es la demostración de esas reglas.
- **Para recordar:** *V3 = el estándar de arquitectura de este proyecto (atomicidad, desacoplamiento, idempotencia, concurrencia).*

---

## 1.8 Funciones y triggers de MySQL no aceleran el catálogo

- **Qué es:** un **índice** es un índice de libro (MySQL encuentra filas sin leer toda la tabla). Una **función/procedimiento** es código SQL reutilizable. Un **TRIGGER** de MySQL se dispara solo en `INSERT`/`UPDATE`/`DELETE` (no es el botón `AccordionTrigger` de React: ver [03 §3.9](03-react-js.md)).
- **Por qué importa:** tener tablas y filas no pide triggers. Lo lento suele ser **consultas mal hechas** (N+1, `WHERE` sin índice), no la falta de SQL automático. Un trigger **esconde reglas** fuera de Laravel: no las ves en el Service, los tests PHP no las cubren, y un `seed`/`update` masivo puede dispararlas mil veces. En este proyecto el “cuando pasa X, haz Y” ya es **Event + Job** ([02 §2.4](02-laravel-php.md)).
- **En tu proyecto:** la lógica vive en `app/Services/` y `app/Actions/`; el dinero y las plazas van con transacción + `lockForUpdate` ([01 §1.1–1.3](01-arquitectura.md)). Hay índices de rendimiento en `database/migrations/2026_08_11_083720_add_performance_indexes.php` (p. ej. `bookings.status`, `expires_at`). No hay triggers de negocio.
- **Para recordar:** *rápido = índices + `with()` + transacciones cortas. Triggers de MySQL no son el atajo; duplicarían lo que ya hacen Events/Jobs.*

---

> **Por ampliar:** cuando surjan dudas nuevas de arquitectura (event sourcing, CQRS, hexagonal…), añadir entradas 1.9… aquí con la misma estructura.
