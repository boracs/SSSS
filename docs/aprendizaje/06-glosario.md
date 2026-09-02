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
| **Event/Listener** | "Pasó algo" → reacción. Si `ShouldQueue`, **escribe** `jobs`; no consulta la bandeja | [02 §2.4](02-laravel-php.md) |
| **Job / Queue** | Tarea en segundo plano; el worker **lee** `jobs` | [02 §2.5](02-laravel-php.md) |
| **queue:work** | Obrero que **saca** filas de `jobs` | [02 §2.5](02-laravel-php.md) |
| **schedule:work** | Despertador: reloj + `routes/console.php` (código, no tabla). No vacía `jobs` | [02 §2.9](02-laravel-php.md) |
| **GD** | Extensión de PHP para recortar/comprimir imágenes. En XAMPP hay que activarla en `php.ini` | [02 §2.10](02-laravel-php.md) |
| **Miniatura / thumbnail** | Copia pequeña **guardada en disco**. Se crea al subir (o 1 vez para las ya existentes), no al abrir la página | [02 §2.10](02-laravel-php.md) |
| **Máster web** | Foto “buena” para ficha/lightbox (~1600 px WebP). Sustituye al RAW del móvil; no es el thumb de la card | [02 §2.11](02-laravel-php.md) |
| **Vite / npm run dev** | Taller del frontend (puerto 5173): compila React y recarga al guardar (HMR) | [03 §3.7](03-react-js.md) |
| **HMR** | Hot Module Replacement: el navegador actualiza JS/CSS sin recargar toda la página | [03 §3.7](03-react-js.md) |
| **public/hot** | Archivo que dice a Laravel “carga assets desde Vite”. Si existe y Vite está parado → pantalla blanca | [03 §3.7](03-react-js.md) |
| **dispatch** | Llamada PHP que encola un Job (no es GET/POST). “Deja esto aparte”, no “espera en este request” | [02 §2.5](02-laravel-php.md) |
| **Worker** | Proceso `queue:work`. Estándar: **1 worker = 1 job a la vez**; N workers = paralelismo | [02 §2.8](02-laravel-php.md) |
| **Multi-hilo / concurrencia** | Familia: no bloquear. En colas Laravel suele ser **multi-proceso**, no hilos en el PHP de la home | [02 §2.8](02-laravel-php.md) |
| **FormRequest** | Clase que valida la petición antes de llegar al controlador | [02 §2.2](02-laravel-php.md) |
| **Policy / Gate** | Autorización backend: quién puede hacer qué | [02 §2.6](02-laravel-php.md) |
| **Enum** | Conjunto cerrado de estados tipados (ej. PaymentStatus) | [02 §2.7](02-laravel-php.md) |
| **JSON del spot (logistics)** | Recetario de Zurriola para que la IA escriba el parte. Las estrellas de la tabla las calcula el PHP con otras reglas (config), no leyendo ese JSON | [03 §3.7](03-react-js.md) + `resources/surf-guide/zurriola-spot-logistics.json` |
| **JSX** | Forma de escribir la pantalla: HTML mezclado con JavaScript (archivos `.jsx`) | [03 §3.7](03-react-js.md) |
| **Inertia.js** | Pegamento Laravel↔React sin API: render de páginas + props | [03 §3.1](03-react-js.md) |
| **Ziggy** | Rutas de Laravel disponibles en JS (`route()`) | [03 §3.1](03-react-js.md) |
| **SPA** | Single Page Application: no recarga la página al navegar | [03 §3.1](03-react-js.md) |
| **Props** | Datos que un componente recibe del padre (solo lectura) | [03 §3.2](03-react-js.md) |
| **Estado (state)** | Memoria del componente que al cambiar re-renderiza | [03 §3.2](03-react-js.md) |
| **Hook** | Función que engancha a estado/efectos (useState, useEffect…) | [03 §3.3](03-react-js.md) |
| **Canónico** | Versión oficial / molde de referencia. Las pantallas lo reutilizan; los detalles (color, texto) van uno a uno | [03 §3.8](03-react-js.md) |
| **AccordionTrigger** | Botón canónico del acordeón (clic → abre/cierra). No es trigger de MySQL ni Event de Laravel | [03 §3.8–3.9](03-react-js.md) |
| **Trigger (frontend)** | Gatillo de la UI: clic, hover, submit. Ejecuta `onClick` / `onToggle` | [03 §3.9](03-react-js.md) |
| **Trigger (BD)** | Código en MySQL que corre solo al INSERT/UPDATE/DELETE. No es un botón | [03 §3.9](03-react-js.md) + [01 §1.8](01-arquitectura.md) |
| **Opus / Sonnet / Grok** | Modelos de IA (cerebros): Opus y Sonnet = Claude de Anthropic (el grande/potente y el equilibrado); Grok = xAI. **Composer** no es un modelo, es un modo de Cursor (trabajo multiarchivo) | [05 §5.17](05-flujos-de-trabajo.md) |
| **Índice (BD)** | “Índice de libro”: MySQL localiza filas del `WHERE`/`ORDER` sin escanear toda la tabla | [01 §1.8](01-arquitectura.md) |
| **Función / procedimiento SQL** | Código que vive en MySQL. No sustituye a un Service de Laravel | [01 §1.8](01-arquitectura.md) |
| **Virtual DOM** | Copia en memoria del DOM; React aplica solo los cambios | [03 §3.5](03-react-js.md) |
| **Async/await** | Esperar a que termine una operación de red antes de seguir | [03 §3.6](03-react-js.md) |
| **TicketBAI** | Factura fiscal vasca (identificador + QR + Hacienda Foral). No es el recibo de Stripe | [07 §7.1–7.4](07-pagos-facturacion.md) |
| **Stripe Checkout** | Pasarela que cobra; el recibo no sustituye la factura TicketBAI | [07 §7.1–7.2](07-pagos-facturacion.md) |
| **B2BRouter** | Proveedor que firma y envía TicketBAI; Sandbox = PDF de prueba, no Hacienda real | [07 §7.4](07-pagos-facturacion.md) |
| **IVA incluido** | Precio de tienda/Stripe es el total; a B2B se manda la base neta | [07 §7.3](07-pagos-facturacion.md) |
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
| **Rama (Git)** | Línea de tiempo del proyecto entero, no un cajón de archivos. Todas las ramas tienen los mismos ficheros | [05 §5.15](05-flujos-de-trabajo.md) |
| **Merge** | Juntar dos líneas de tiempo. Git suele combinar solo; no hace falta que cada rama toque archivos distintos | [05 §5.15](05-flujos-de-trabajo.md) |
| **Conflicto (Git)** | Las dos ramas cambiaron las mismas líneas (o una borró y la otra editó). Git para y tú eliges. El resto se mezcla solo | [05 §5.15](05-flujos-de-trabajo.md) |

---

> **Por ampliar:** cualquier sigla o palabra que te suene a chino en una respuesta de una IA → pedir que la añada aquí con una línea.
