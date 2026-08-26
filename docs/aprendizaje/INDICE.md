# 📚 Libro de Aprendizaje — maider_0

> **Rol de este documento:** profesor analista-educador.
> Cada vez que preguntes algo y la respuesta valga la pena recordarla, **el agente (Cursor o Reasonix/DeepSeek) la guarda aquí** estructurada, con tus propias palabras y con ejemplos reales de **tu proyecto**.
> No es un volcado de chat: es un **cuaderno compartido** del repo, ordenado por temas, que se amplía con cada sesión.
> Cableado del dúo: `docs/taller-prompts/CONTRATO-IA.md` §3.1 · Reasonix skill `/profesor-aprendizaje`.

---

## Reglas de alimentación (las cumple el agente)

### A. Filtro — ¿merece guardarse?
1. **Guardar solo si cumple TODO:** (a) es un **concepto reutilizable** (lo necesitarás en otras tareas o en una entrevista), (b) es **estable** (no un detalle puntual de un bug de hoy), (c) **no está ya en el código** (si el código lo documenta, no se duplica: se referencia).
2. **NO guardar:** detalles puntuales de una tarea (parámetros de un bug concreto, valores de un despliegue), decisiones de una sola vez (esas van a `COORDINACION.md`), ni opiniones sin base.
3. **Duda "¿guardo o no?":** guardar versión de 1 línea en el **glosario (06)**. El glosario es el filtro de entrada: si el término se repite en varias sesiones, se promociona a tema completo.

### B. Dónde va (jerarquía de colocación)
4. **Un concepto pertenece a UN solo tema**, el que mejor encaje: ¿Laravel/PHP? → 02 · ¿React/JS? → 03 · ¿Patrón? → 04 · ¿Técnica de trabajo/con IAs? → 05 · ¿Arquitectura general? → 01 · ¿Sigla o término suelto? → 06.
5. **Si no encaja en ningún tema** → crear tema nuevo (07, 08…) con nombre claro y añadirlo a la tabla de Temas. Nunca meterlo a la fuerza en un tema que no corresponde.
6. **Glosario (06):** siempre 1 línea + enlace al tema donde está explicado. Nunca explicar el mismo concepto en dos sitios.

### C. Cómo se escribe (formato y calidad)
7. **Estructura fija por entrada:** Qué es → Por qué importa → En tu proyecto (ruta real **verificada**) → Para recordar.
8. **Concisión:** una entrada no supera ~200 palabras salvo que el concepto lo exija. Si se pasa, dividir en varias entradas o resumir.
9. **Lenguaje del dueño:** nivel junior, sin jerga sin explicar. Una entrada debe entenderse **sin el chat original** (quien la lea dentro de 6 meses debe entenderla sola).
10. **Numeración:** secuencial dentro del tema (1.1, 1.2…). Si choca con la otra IA, respetar la suya y renumerar la propia.
11. **Mini-índice por tema:** cada archivo temático empieza con la lista de sus entradas, para navegar sin leer todo.

### D. Mantenimiento (ampliar, podar, corregir)
12. **Matiz nuevo sobre un concepto existente** → ampliar esa entrada (no crear otra) y añadirlo al log.
13. **Concepto dominado** → degradar a 1 línea del glosario (poda). Práctica: si un tema supera ~15 entradas, revisar cuáles están dominadas y podarlas.
14. **Obsoleto** (el código cambió) → corregir la entrada. El código manda.
15. **Siempre al guardar:** actualizar el log "Últimas entradas" del `INDICE.md` (fecha + tema + entrada + autor) y, al cerrar un chat de aprendizaje, anotar la sesión en `SESIONES.md`.
16. **Ambas IAs alimentan el libro** (decisión del dueño 2026-08-10), con autores anotados en el log para no pisarse.

---

## Temas (carpeta por tema)

| # | Archivo | Contenido |
|---|---------|-----------|
| 01 | [`01-arquitectura.md`](01-arquitectura.md) | Arquitectura limpia, capas, atomicidad, idempotencia, concurrencia, DTOs, zero-logic controllers, V3 |
| 02 | [`02-laravel-php.md`](02-laravel-php.md) | Laravel + PHP: Services/Actions/Helpers, Eloquent, Events/Jobs, FormRequests, Policies |
| 03 | [`03-react-js.md`](03-react-js.md) | React 19 + JavaScript + Inertia: hooks, componentes, estado, flujo de datos |
| 04 | [`04-patrones.md`](04-patrones.md) | Patrones de diseño y arquitectónicos (Money, Observer, Pipeline, Pessimistic Locking…) |
| 05 | [`05-flujos-de-trabajo.md`](05-flujos-de-trabajo.md) | Método de trabajo: cómo trabajar con las IAs, procesos atómicos, cómo pensar un flujo |
| 06 | [`06-glosario.md`](06-glosario.md) | Términos sueltos y siglas: ¿qué es V3?, DTO, idempotencia, TicketBAI, Inertia, Ziggy… |
| 07 | [`07-pagos-facturacion.md`](07-pagos-facturacion.md) | Cobro Stripe vs factura TicketBAI/B2BRouter: flujo, IVA, Sandbox, cómo probar |
| — | [`SESIONES.md`](SESIONES.md) | **Diario de sesiones:** qué se habló en cada chat y qué se guardó (para cuando el dueño olvide) |
| — | [`FLUJOS-VISUAL.md`](FLUJOS-VISUAL.md) | **Mapa visual del ecosistema IA completo:** puntos de entrada, rules .mdc, skills, contrato/router/pizarrón, scripts + flujos de decisión |
| — | [`DIAGRAMA-ECOSISTEMA.mmd`](DIAGRAMA-ECOSISTEMA.mmd) | **Diagrama Mermaid renderizable** del flujo IA completo (pre-vuelo, anti-pisotón, router, skills/rules, confirmación cruzada, libro A-D, eficiencia). Render en mermaid.live / GitHub / VS Code |
| — | *(ext)* [`docs/taller-prompts/PLANTILLA-BOOTSTRAP-ECOSISTEMA-IA.md`](../taller-prompts/PLANTILLA-BOOTSTRAP-ECOSISTEMA-IA.md) | **Plantilla reutilizable** para montar este ecosistema IA en proyectos nuevos (diagnóstico, checklist, plantillas por pieza) |

---

## Últimas entradas (log rápido)

| Fecha | Tema | Entrada |
|---|---|---|
| 2026-08-25 | 02+06 | **2.11** no borrar original a cambio del thumb; glosario máster web (Cursor) |
| 2026-08-25 | 02+06 | **2.10** miniaturas se guardan una vez (no GD por visita); glosario GD + thumbnail (Cursor) |
| 2026-08-21 | 03+06 | **3.8** canónico = molde oficial; **3.9** trigger frontend ≠ BD; glosario (Cursor) |
| 2026-08-19 | 02+06 | 2.4–2.5–2.9: evento **escribe** `jobs`; cron = reloj + `console.php` (Cursor) |
| 2026-08-19 | 02 | 2.9 ampliada: cron mira el reloj, worker mira `jobs` (Cursor) |
| 2026-08-19 | 06 | glosario: JSON del spot ≠ estrellas de la tabla (Cursor) |
| 2026-08-19 | 03+05+06 | 3.7 y 5.14 reescritos sin jerga (restaurante); glosario React/JSX (Cursor) |
| 2026-08-19 | 03+05+06 | **3.7** Vite/`npm run dev`; **5.14** 4 terminales; glosario Vite, HMR, `public/hot` (Cursor) |
| 2026-08-16 | 02+06 | **2.9** schedule ≠ queue (`schedule:work`); glosario schedule:work (Cursor) |
| 2026-08-16 | 07+06 | **Tema nuevo 07** pagos/facturación: 7.1–7.5 (Stripe ≠ TBAI, flujo, IVA, Sandbox, prueba local); glosario (Cursor) |
| 2026-08-16 | 02+06 | 2.5 reordenada (cola vs HTTP, dispatch, pago+redirect); **2.8 Workers: 1 job a la vez**; glosario Worker (Cursor) |
| 2026-08-10 | 01 | 1.1 Atomicidad, 1.2 Idempotencia, 1.3 lockForUpdate, 1.4 Zero-logic controllers, 1.5 DTOs, 1.6 Services/Actions/Helpers, 1.7 ¿Qué es V3? |
| 2026-08-11 | 05 | 5.5 Cuaderno compartido Cursor + DeepSeek |
| 2026-08-10 | 05 | 5.1 Pensar un flujo antes de escribir código, 5.2 Embudo chatbot FAQ→IA→humano |
| 2026-08-10 | 05 | 5.5 Cuaderno compartido (entrada de Cursor), 5.6 Memoria y contexto de las IAs (entrada de Reasonix) |
| 2026-08-10 | 05 | 5.7 Cómo se consumen los tokens: pagan por releer, no por recordar (entrada de Reasonix) |
| 2026-08-10 | 05 | 5.8 Cuándo abrir un chat nuevo: el "circulito" de contexto (entrada de Reasonix) |
| 2026-08-10 | 05 | 5.9 El aviso de reinicio de chat: cuesta 50 tokens, evita releer 100.000 (idea del dueño + entrada de Reasonix) |
| 2026-08-11 | 05 | 5.6 ampliada: los 3 niveles de memoria (resúmenes / libro / transcripciones) (entrada de Reasonix) |
| 2026-08-11 | 05 | 5.10 Markdown vs JSON: el formato depende del consumidor (entrada de Reasonix) |
| 2026-08-11 | 05 | 5.10 ampliada: tu cadena real de la parte de olas (API→JSON→React; texto plano para Gemini; markdown solo en chatbot) (entrada de Reasonix) |
| 2026-08-11 | 05+06 | 5.10 ampliada: los 3 formatos son texto plano por debajo (MD≠Word); glosario: +Markdown, +JSON, +Texto plano (entrada de Reasonix) |
| 2026-08-11 | 05 | 5.11 Cómo verificar que una IA leyó de verdad: el "sí" sin cita no es "sí" (entrada de Reasonix) |
| 2026-08-11 | 06 | glosario: +Cloudflare Tunnel (pasadizo local→público, URL para amigos) (entrada de Reasonix) |
| 2026-08-11 | 05 | 5.12 Portabilidad del ecosistema IA: estructura portable, contenido específico (entrada de Reasonix) |
| 2026-08-11 | 05 | 5.13 Las 3 vías de valor del ecosistema IA: producto (poco), habilidad (mucho), eficiencia (cuantificable) (entrada de Reasonix) |
| 2026-08-11 | 06 | glosario: +Bootstrap (término = arrancar; no es la librería CSS) (entrada de Reasonix) |

---

## Notas viejas (fuente original, no borrar)

El contenido de la carpeta `Conceptos y flujos de trabajo/` (raíz del repo) se ha integrado en estos archivos. Esa carpeta queda como archivo histórico; **no alimentar** el libro desde ahí, sino desde las sesiones nuevas.

> 📌 Si algún concepto del libro se queda obsoleto o cambiado en el código real, corregir aquí la entrada (el código manda).
