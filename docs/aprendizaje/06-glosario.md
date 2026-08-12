# 06 · Glosario (términos y siglas)

> Definiciones cortas de todo lo que suena a chino y no debe volver a sonar. Si un término tiene entrada larga en otro tema, enlaza.

---

| Término | Qué es (en una línea) | Dónde está explicado |
|---|---|---|
| **V3 / V3-ULTRA** | Nombre interno del estándar de arquitectura de maider_0 (atomicidad, idempotencia, concurrencia, zero-logic, DTOs, capas) | [01-arquitectura.md §1.7](01-arquitectura.md) |
| **DTO** | Clase tipada que transporta datos entre capas (en vez de arrays inseguros) | [01 §1.5](01-arquitectura.md) |
| **Idempotencia** | Ejecutar la misma petición N veces = mismo resultado, sin efectos duplicados | [01 §1.2](01-arquitectura.md) |
| **Atomicidad** | Transacción "todo o nada": si falla un paso, se revierten los anteriores | [01 §1.1](01-arquitectura.md) |
| **lockForUpdate** | Bloqueo pesimista de fila en BD para evitar carreras (sobre-reserva) | [01 §1.3](01-arquitectura.md) |
| **Zero-logic controller** | Controlador sin reglas de negocio: valida, delega, responde | [01 §1.4](01-arquitectura.md) |
| **Service** | Capa con la lógica de negocio de un dominio completo | [01 §1.6](01-arquitectura.md) |
| **Action** | Clase para una operación única con responsabilidad única | [01 §1.6](01-arquitectura.md) |
| **Helper** | Utilidad global pura; nunca lógica de negocio | [01 §1.6](01-arquitectura.md) |
| **Eloquent** | ORM de Laravel: tablas ↔ modelos PHP | [02 §2.3](02-laravel-php.md) |
| **Eager loading** | `with()` precarga relaciones → evita el problema N+1 | [02 §2.3](02-laravel-php.md) |
| **N+1** | Bug de rendimiento: 1 consulta + N consultas por fila al listar | [02 §2.3](02-laravel-php.md) |
| **Event/Listener** | "Pasó algo" (evento) → "hago esto" (listener), sin acoplar | [02 §2.4](02-laravel-php.md) |
| **Job / Queue** | Tarea en segundo plano, fuera de la petición web | [02 §2.5](02-laravel-php.md) |
| **FormRequest** | Clase que valida la petición antes de llegar al controlador | [02 §2.2](02-laravel-php.md) |
| **Policy / Gate** | Autorización backend: quién puede hacer qué | [02 §2.6](02-laravel-php.md) |
| **Enum** | Conjunto cerrado de estados tipados (ej. PaymentStatus) | [02 §2.7](02-laravel-php.md) |
| **Inertia.js** | Pegamento Laravel↔React sin API: render de páginas + props | [03 §3.1](03-react-js.md) |
| **Ziggy** | Rutas de Laravel disponibles en JS (`route()`) | [03 §3.1](03-react-js.md) |
| **SPA** | Single Page Application: no recarga la página al navegar | [03 §3.1](03-react-js.md) |
| **Props** | Datos que un componente recibe del padre (solo lectura) | [03 §3.2](03-react-js.md) |
| **Estado (state)** | Memoria del componente que al cambiar re-renderiza | [03 §3.2](03-react-js.md) |
| **Hook** | Función que engancha a estado/efectos (useState, useEffect…) | [03 §3.3](03-react-js.md) |
| **Virtual DOM** | Copia en memoria del DOM; React aplica solo los cambios | [03 §3.5](03-react-js.md) |
| **Async/await** | Esperar a que termine una operación de red antes de seguir | [03 §3.6](03-react-js.md) |
| **TicketBAI** | Sistema fiscal vasco de facturación (QR + envío a Hacienda) | (flujo en `docs/payments/`) |
| **Stripe Checkout** | Pasarela de pago; el frontend recibe URL de checkout | (ver `docs/payments/`) |
| **Firestore** | BD NoSQL de Google (sincronización asíncrona; legacy en este proyecto) | [04 §4.3](04-patrones.md) |
| **Patrón Money** | Dinero siempre en céntimos (int), nunca en float | [04 §4.2](04-patrones.md) |
| **Pessimistic Locking** | Bloqueo de fila para evitar carreras | [04 §4.1](04-patrones.md) |
| **Observer** | Reaccionar a cambios de un modelo sin acoplar el código | [04 §4.3](04-patrones.md) |
| **Pipeline** | Procesamiento por etapas encadenadas | [04 §4.4](04-patrones.md) |
| **Markdown** | Texto plano + símbolos de formato (`#`, `**`, `-`) que se renderiza como documento para humanos. NO es Word: se abre en cualquier editor de texto | [05 §5.10](05-flujos-de-trabajo.md) |
| **JSON** | Texto con estructura de datos (claves/valores) para máquinas: APIs, apps web, envío por internet | [05 §5.10](05-flujos-de-trabajo.md) |
| **Texto plano** | Texto puro sin formato ni estructura (como el bloc de notas) — lo que mejor procesa un LLM para redactar | [05 §5.10](05-flujos-de-trabajo.md) |
| **Cloudflare Tunnel** | Pasadizo de tu PC a Cloudflare: URL pública (`xxx.trycloudflare.com`) que reenvía peticiones a tu `localhost:8000` sin abrir puertos del router. Amigos la abren y prueban tu app local | rule `tunnel-share-modes.mdc` + memoria `cloudflare-tunnel-lecciones` |
| **Bootstrap (término)** | "Arrancar / poner en marcha un sistema desde cero". NO es la librería CSS (esa solo es un caso particular). Ej. local: carpeta `bootstrap/app.php` de Laravel | [05 §5.12](05-flujos-de-trabajo.md) |

---

> **Por ampliar:** cualquier sigla o palabra que te suene a chino en una respuesta de una IA → pedir que la añada aquí con una línea.
