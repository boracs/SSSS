# 02 · Laravel + PHP

> Conceptos de Laravel/PHP que van saliendo al trabajar en `maider_0`. Cada entrada: qué es, por qué, dónde está en tu proyecto, cómo recordarlo.

---

## 2.1 El ciclo de una petición (request → response)

- **Qué es:** una petición HTTP entra por una **ruta** (`routes/web.php`), pasa **middlewares** (auth, throttle, validación), llega al **controlador**, que delega en la **capa de negocio**, y la respuesta se devuelve al frontend.
- **En tu proyecto:** `routes/web.php` → `Controller@method` → `Inertia::render('Pages/...')` → `resources/js/Pages/{Nombre}.jsx` (convención Inertia).
- **Para recordar:** *ruta → middleware → controlador → service → respuesta.*

---

## 2.2 FormRequest (validación en su propia clase)

- **Qué es:** una clase que encapsula las reglas de validación de una petición (en vez de validar dentro del controlador).
- **Por qué importa:** el controlador recibe datos **ya validados y limpios**; no sabe de reglas. También centraliza la autorización (`authorize()`).
- **En tu proyecto:** `app/Http/Requests/` (ej. `SanitizedChatbotRequest` valida y bloquea patrones de riesgo antes de tocar la IA).
- **Para recordar:** *la validación vive en el FormRequest, no en el controlador.*

---

## 2.3 Eloquent, Eager Loading y el problema N+1

- **Qué es:** Eloquent es el ORM (objeto-relacional): cada tabla = un Modelo PHP. `with('relacion')` precarga las relaciones para evitar consultas repetidas.
- **Por qué importa:** sin `with()`, listar 100 pedidos con sus clientes lanza 101 consultas (N+1). Con eager loading, 2. El rendimiento se dispara.
- **En tu proyecto:** regla del manifiesto V3: "mitigación proactiva del problema N+1 con `with()`". Se usa en Services/listados.
- **Para recordar:** *¿Muchas consultas al listar? → `with()` (eager loading).*

---

## 2.4 Events y Listeners (desacoplar efectos secundarios)

- **Qué es:** cuando pasa algo importante (p.ej. alguien pide una clase), el código **emite un evento** (`LessonRequestedEvent`) y un **listener** reacciona (enviar email). El código que emite no sabe quién escucha.
- **Por qué importa:** separa "lo que pasa" de "lo que se hace después"; añadir una reacción nueva no toca el flujo original.
- **En tu proyecto:** `app/Events/` → `LessonRequestedEvent`, `LessonProofUploadedEvent`, `PagoTaquillaConfirmado`… (los eventos de taquilla se emiten tras el commit).
- **Para recordar:** *evento = "ha pasado algo"; listener = "qué hago con ello".*

---

## 2.5 Jobs y Colas (trabajo en segundo plano)

- **Qué es:** un Job es una tarea que se **encola** (`dispatch`) y se ejecuta en segundo plano, fuera de la petición web que la lanzó.
- **Por qué importa:** el usuario no debe esperar a que se envíe un email, se llame a una API externa o se sincronice Firestore. La petición responde rápido y el trabajo pesado ocurre después, con reintentos.
- **En tu proyecto:** `app/Console/Commands/` (cron: `photos:cancel-expired`, `rentals:release-no-shows`…) y Jobs para sincronización externa (facturación B2BRouter, emails). Regla V3: los Jobs van **fuera** del `lockForUpdate`.
- **Para recordar:** *lo que no es crítico para responder al usuario → a la cola.*

---

## 2.6 Policies y Gates (autorización)

- **Qué es:** Policies/Gates deciden **quién puede hacer qué** (solo admin, solo dueño del recurso, solo VIP…).
- **Por qué importa:** no basta con ocultar botones en la UI; el backend debe validar la autorización en cada acción.
- **En tu proyecto:** roles `user.role === 'admin'`, `is_vip`, `has_active_locker` condicionan menú y políticas; los Services validan la propiedad de los recursos con `auth()->id()`.
- **Para recordar:** *la UI oculta, la Policy protege.*

---

## 2.7 Enums (estados tipados)

- **Qué es:** una clase que define un conjunto cerrado de valores (ej. `PaymentStatus: pending | paid | failed`). PHP 8.1+ los tiene nativos.
- **Por qué importa:** imposible guardar un estado que no existe; el código se autodocumenta.
- **En tu proyecto:** estados de pagos, reservas, `SecondHandStatus`, etc.
- **Para recordar:** *¿Un campo solo acepta 3 valores? → Enum, no strings sueltos.*

---

> **Por ampliar:** 2.8+ (middlewares, service providers, scopes, casts…). Se añade cada vez que salga un concepto nuevo.
