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

- **Qué es:** cuando pasa algo importante (pago, reserva, clase), el código **emite un evento** (`PaymentConfirmed`, `LessonRequestedEvent`…) y un **listener** reacciona (mail, factura). Quien emite no sabe quién escucha.
- **Por qué importa:** añadir una reacción nueva no toca el flujo de compra. Si el listener lleva `ShouldQueue`, el trabajo **no** se hace en el mismo clic: se **escribe** en la tabla `jobs` y sigue el usuario.
- **En tu proyecto:** `app/Events/` + `AppServiceProvider` (p.ej. `PaymentConfirmed` → factura B2B y recibo Stripe). Compra/reserva **invocan el evento**; no consultan `jobs` para “ver qué toca”.
- **Para recordar:** *evento = “ha pasado”; listener = “qué hago”. Si va a cola, el evento deja el papel; no lo busca.*

---

## 2.5 Jobs y Colas (trabajo en segundo plano)

- **Qué es:** un Job es una tarea en segundo plano. La **cola** es la bandeja (`.env`: `QUEUE_CONNECTION=database` → tabla `jobs`). No es un GET de página.
- **Sentido del flujo (compra):** 1) el evento/`dispatch` **mete** una fila en `jobs`. 2) `php artisan queue:work` **saca** esa fila y la ejecuta. La web no “mira `jobs` para adivinar el evento”; el obrero mira `jobs` para ejecutar lo ya dejado.
- **Por qué importa:** factura TicketBAI, mail, recibo Stripe no deben bloquear el redirect de éxito.
- **En tu proyecto:** `app/Jobs/` (`CreateB2BRouterInvoiceJob`…). Sin worker, la bandeja se llena.
- **Para recordar:** *evento escribe `jobs`; worker lee `jobs`.* Detalle de pago+factura: [07](07-pagos-facturacion.md).

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

## 2.8 Workers: 1 job a la vez (estándar)

- **Qué es:** un `queue:work` = **1 trabajador / 1 proceso**. Modelo mental: casi un “segundo proceso” junto a la web, pero **no** un segundo servidor HTTP; comparten la cola (BD).
- **Regla estándar:** **1 trabajador = 1 job a la vez**. Cuando termina, coge el siguiente. No es multitarea dentro del mismo worker.
- **Paralelismo:** varios trabajadores (varias terminales o Horizon) = varios jobs a la vez. Misma **familia** que la concurrencia/multi-hilo (no bloquear), pero en Laravel/PHP local suele ser **multi-proceso**, no hilos dentro del PHP de la home.
- **Extras nuevos** (`--concurrency`, etc.): existen; no son el modelo base. En Windows suelen ser flojos. Para más paralelismo en local: más workers.
- **Para recordar:** *estándar = una tarea por trabajador; varios trabajadores = varios jobs en paralelo.*

---

## 2.9 El reloj (`schedule`) no es la cola (`queue`)

- **Qué es:** `routes/console.php` lista tareas a hora fija (cron). `store:release-unpaid` está cada 5 min. Eso **no corre solo**: hace falta un despertador.
- **Por qué importa:** la cola cobra facturas/mails (`queue:work`). El schedule suelta stock, cancela Stripe abandonado, parte de olas… Son **dos procesos**. En Windows no hay crontab: `php artisan schedule:work` (llama a `schedule:run` cada minuto). En servidor: crontab `* * * * * php artisan schedule:run`.
- **Matiz (no son el mismo “pendiente”):** el **worker** mira la tabla `jobs` (“¿hay un papel que dejó un pago?”). El **cron** mira el **reloj** (“¿ya pasaron 5 min para soltar stock?”). El cron **no** vacía la cola. Familia parecida (trabajo fuera del clic del usuario); disparador distinto.
- **En tu proyecto:** la lista está en **`routes/console.php`** (archivo PHP, **no** una tabla “de agentes”). Ej.: `store:release-unpaid` cada 5 min. Un comando del cron *puede* encolar un Job; entonces sí entra `jobs`. Local: 4.ª terminal o `composer run dev`.
- **Para recordar:** *evento escribe `jobs`; cron mira el reloj + `console.php` y corre el comando.*

---

> **Por ampliar:** 2.10+ (middlewares, service providers, scopes, casts…). Se añade cada vez que salga un concepto nuevo.
