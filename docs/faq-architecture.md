# FAQ de arquitectura — maider_0 (V3-ULTRA)

Documento técnico para desarrollo: **Laravel 11.46**, **PHP 8.3+**, **React 19**, **Inertia 2**.  
Las respuestas están orientadas a quien implementa o mantiene el código, no al cliente final.

---

### ¿Cuándo debo invocar `AvailabilityService` y por qué siempre con transacción activa?

Usa **`AvailabilityService`** siempre que una operación **reserve o evalúe cupo de clase** (inscripción, solicitud grupal, preview admin). Los métodos **`evaluate()`**, **`withLockedLesson()`** y **`buildIntervals()`** exigen **`DB::transaction()`** activa; si no, lanzan **`TransactionRequiredException`**.

**Flujo recomendado:**

1. Abrir **`DB::transaction()`**.
2. Llamar **`withLockedLesson($lessonId, fn ($lesson) => …)`** → ejecuta **`lockForUpdate()`** sobre **`lessons`**.
3. Dentro del callback, **`evaluate($startsAt, $endsAt, $partySize)`** calcula monitores, márgenes (15 min / 75 min) y **`allowed`**.
4. Si **`allowed === false`**, abortar sin confirmar inscripción.

**Nunca** evalúes cupo fuera de transacción en escritura: es la defensa contra **double booking** de plazas.

---

### ¿Qué hace `preview()` frente a `evaluate()` en disponibilidad?

**`preview()`** envuelve **`evaluate()`** en una transacción de **solo lectura** para UI (admin/cliente). **`evaluate()`** es la evaluación real usada dentro de **`EnrollStudentAction`** tras **`lockForUpdate`**. Ambos comparten la misma lógica de negocio; la diferencia es el **contexto transaccional** (lectura vs inscripción bloqueante).

---

### ¿Cómo se traduce el cupo de monitores a plazas para el usuario?

**`AvailabilityService`** modela **máximo 2 monitores** simultáneos. **`monitorsRequiredForPartySize()`** devuelve **2** si el grupo es ≥ 7 personas. **`describeCapacity()`** expone al frontend:

- **12 plazas** → 2 monitores libres  
- **6 plazas** → 1 monitor libre  
- **0 plazas** → franja agotada  

El chatbot comercial (**`ChatbotService`**) explica esto sin mencionar clases PHP; el desarrollador debe usar estos métodos, no duplicar reglas en controladores.

---

### ¿Cuál es el flujo atómico de consumo de bono en `CreditEngineService`?

1. **`canAffordEnrollment()`** comprueba **`UserBono`** con **`status = confirmed`** y **`clases_restantes >= units`** ( **`LessonBonoCreditUnits::unitsForCharge()`** ).
2. **`EnrollStudentAction`** descuenta dentro de **`DB::transaction()`** con **`UserBono::lockForUpdate()`**.
3. Cada movimiento debe quedar en **`credit_transactions`** (tipo consumo, devolución o compra).

**Patrón Money:** los importes de dinero van en **céntimos (`int`)** vía **`MoneyCents`** / Stripe; las **unidades de bono** son enteros en **`clases_restantes`**, no floats.

---

### ¿Qué unidades descuenta el bono según modalidad?

Reglas en **`LessonBonoCreditUnits`** (fuente única):

| Escenario | Unidades |
|-----------|----------|
| **Particular** | **2** |
| **Grupal/semanal**, 1 plaza en sesión | **2** |
| **Grupal** con varias plazas | **1 por plaza** |

**`CreditEngineService::refundCredits()`** restaura unidades con **`lockForUpdate`** sobre **`lesson_users`**, **`bono_consumptions`** y **`user_bonos`**, y crea **`CreditTransaction`** de auditoría.

---

### ¿Cuándo aplica reembolso de bono en cancelación del alumno?

**`CreditEngineService::cancelByStudent()`** compara horas hasta el inicio con **`config('services.academy.cancel_cutoff_hours')`** (default **4 h**). Si cancela **antes** del corte → **`refundCredits()`**; si no → status **cancelled** sin devolución. No reimplementes esta regla en JSX ni en controladores.

---

### ¿Cómo evita `BookingService` el overbooking de tablas?

**`createPendingBooking()`**:

1. **`DB::transaction()`**
2. **`Surfboard::lockForUpdate()`**
3. **`isAvailable()`** con **`Booking::lockForUpdate()`** sobre reservas **blocking** solapadas
4. **`resolvePricing()`** → **`calculateBestPrice()`** + **`calculateDeposit()`** (default **30 %**)

Si no hay hueco → **`InvalidArgumentException`**. **`checkAvailability()`** es el wrapper de lectura para API/UI.

---

### ¿Cómo funcionan los precios dinámicos de alquiler?

**`BookingService::calculateBestPrice()`** recorre **`PriceSchema`** con tramos **1 h, 2 h, 4 h, 12 h, 24 h, 48 h, 72 h, 168 h** y elige la **combinación óptima** (programación dinámica). No hardcodees tarifas en React: el total viene del backend tras elegir fechas.

---

### ¿Cuál es la cadena DTO → Action → Service → Event obligatoria?

Ejemplo **pago Stripe**:

```
FormRequest → InitiatePaymentDto → InitiatePaymentAction
    → PaymentGatewayService → PaymentInitiated (Event)
    → Redirect Checkout URL
```

Ejemplo **FAQ chatbot** (sin BD):

```
ChatbotMessageRequest → ChatbotQueryDto → ProcessChatbotQueryAction
    → ChatbotService::resolveQuery() → ChatbotReplyDto
```

**Regla:** el **Controller** solo orquesta; cero lógica de negocio intermedia.

---

### ¿Dónde va la lógica de `VipStudentPerformanceService` y qué expone al cliente?

**`VipStudentPerformanceService::buildPerformanceDataForSubject()`** agrega asistencia, consumos, bonos, notas y proyecciones **solo desde BD** para el **`User`** objetivo. El panel **Mis reservas / Mi perfil** consume este payload; el chatbot **no consulta BD** — solo explica que el VIP tiene análisis en el panel.

---

### ¿Qué ocurre en React si Firestore entra en degradación suave?

**Estado actual del chatbot:** **`ChatbotService`** es **100 % local** (regex, sin Firestore/Gemini). En frontend, **`Chatbot.jsx`** persiste en **`localStorage`** y llama **`POST /api/chatbot/message`**.

Si reactivas **`FirestoreService`** para LTP:

- Encapsula escrituras en **`ShouldQueue` Jobs**; nunca dentro de **`DB::transaction()`** principal.
- En React, usa **`useOptimistic`** / **`useActionState`** para mostrar el mensaje al usuario **antes** de confirmar sync cloud; si Firestore falla, mantén historial local y muestra aviso no bloqueante.
- **`FirestoreService`** no debe poder revertir una inscripción o pago ya confirmado en MySQL.

---

### ¿Cómo implemento una nueva respuesta FAQ para clientes sin romper V3-ULTRA?

1. Añade patrón en **`App\Services\Chatbot\ChatbotService::PATTERNS`** (regex + **`context`** + texto **comercial** con `**negritas**`).
2. No llames a BD desde el chatbot FAQ.
3. Si la respuesta requiere datos en vivo (saldo, fechas), redirige al panel (**Mis reservas**) en el copy.
4. Documenta la regla de negocio real en este archivo si afecta a **`AvailabilityService`**, **`CreditEngineService`** o **`BookingService`**.

---

### ¿Qué controladores están prohibidos de contener lógica de negocio?

Todos. Especialmente **`ChatbotController`**: solo **`ChatbotMessageRequest` → ProcessChatbotQueryAction → JSON**. Validación en **FormRequest**, anti-spoofing en **`authorize()`**, patrones en **`ChatbotService`**.

---

### Checklist rápido antes de un PR de dominio

- [ ] **`declare(strict_types=1);`** en PHP tocado  
- [ ] DTO **readonly** entre capas (no arrays crudos)  
- [ ] Escritura con cupo/precio/bono → **`DB::transaction()`** + **`lockForUpdate()`** donde aplique  
- [ ] Dinero en **céntimos int**  
- [ ] Side effects → **Event/Job** encolado  
- [ ] Frontend: estados **`pending`** / **`useActionState`**, sin lógica de negocio en JSX  
