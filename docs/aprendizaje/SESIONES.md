# 📓 Diario de Sesiones — qué hablamos y qué se guardó

> **Para qué sirve:** el dueño olvida qué preguntó y si fue interesante. Este diario registra, por chat, el tema tratado y las entradas guardadas en el libro.
> **Quién lo escribe:** el agente (Reasonix o Cursor) al final de cada sesión de aprendizaje, o cuando el dueño lo pida ("anota la sesión").
> **Formato por entrada:** `fecha · tema · entradas guardadas · notas`.

---

## 2026-08-26 · ¿Cada rama toca archivos distintos? ¿Los conflictos son un infierno?

- **Tema:** una rama es una línea de tiempo del repo entero, no un cajón. Git mezcla solo en la mayoría de merges; conflicto solo si las mismas líneas chocan. En este proyecto no hace falta dos ramas de desarrollo eternas: `main` es el cuaderno; `production` (cuando exista el VPS) solo recibe lo ya probado.
- **Entradas guardadas:** 05 **§5.15**; glosario rama / merge / conflicto (Cursor).

---

## 2026-08-26 · ¿Funciones o triggers en MySQL para “eficienciar” la BD?

- **Tema:** tablas y filas no piden triggers. Lo que acelera es índice + consultas (`with()`, `WHERE` con índice) + transacción corta. La reacción “pasó X → haz Y” ya está en Events/Jobs de Laravel.
- **Entradas guardadas:** 01 **§1.8**; glosario índice + función/procedimiento SQL (Cursor).

---

## 2026-08-25 · ¿Borrar el original y dejar solo el thumb?

- **Tema:** ahorro de disco sí, pero no a costa de la ficha/lightbox. Sustituir el RAW del móvil por un máster web (~1600 px); thumb aparte para cards.
- **Entradas guardadas:** 02 **§2.11**; glosario máster web (Cursor).

---

## 2026-08-25 · Miniaturas: ¿se guardan o se recalculan?

- **Tema:** en catálogo de 2ª mano, las thumbs no se crean al abrir la página: se generan al subir (o un comando para las ya existentes) y se quedan en disco. El CSS que encoge no aligera el archivo.
- **Entradas guardadas:** 02 **§2.10**; glosario GD + miniatura/thumbnail (Cursor).
- **Notas:** el dueño descartó “ocultar capturas de pantalla” como portada; solo le importa el almacenamiento de thumbs.

---

## 2026-08-21 · Canónico + disparador frontend vs BD

- **Tema:** unificar acordeones en un molde oficial (`AccordionTrigger`); *canónico* = la versión de referencia (detalles de color/texto en cada pantalla); *trigger* en frontend = clic/gatillo, no trigger de MySQL ni Event de Laravel.
- **Entradas guardadas:** 03 **§3.8**, **§3.9**; glosario Canónico, AccordionTrigger, Trigger frontend/BD (Cursor).

---

## 2026-08-11 · Creación del Libro de Aprendizaje + tokens/contexto

- **Tema:** creación de `docs/aprendizaje/` (idea del "profesor" que archiva lo que se aprende); cómo funcionan la memoria, el contexto y los tokens de las IAs; ahorro de tokens y cuándo reiniciar chat.
- **Entradas guardadas:** 5.5 (Cursor: cuaderno compartido), 5.6 (memoria/contexto), 5.7 (cómo se cobran los tokens), 5.8 (el "circulito" y cuándo abrir chat nuevo), 5.9 (aviso de reinicio + ritual "guardar y reiniciar").
- **Decisiones del dueño:** el libro lo alimentan **ambas IAs** (Cursor + Reasonix) con autores anotados en el log para no pisarse.
- **Notas:** Cursor añadió su entrada 5.5 por su cuenta → prueba real de por qué hace falta coordinar. El agente propuso guardar conceptos por iniciativa propia (sin esperar a que el dueño lo pida).

---

## 2026-08-19 · Evento vs cron (quién escribe `jobs`)

- **Tema:** compra/reserva disparan un evento que **deja** el papel en `jobs`; el worker lo **saca**. El cron mira el reloj y `routes/console.php` (no es una tabla de agentes).
- **Entradas guardadas:** 02 §2.4, §2.5, §2.9 ampliadas; glosario Event/queue/schedule (Cursor).

---

## 2026-08-19 · Las 4 terminales (Vite / cola / schedule)

- **Tema:** cómo funcionan `npm run dev`, `queue:work` y `schedule:work` frente a `artisan serve`; parte S4/Gemini cada 6 h vía schedule.
- **Entradas guardadas:** 03 **§3.7**; 05 **§5.14**; glosario Vite, HMR, `public/hot` (Cursor).
- **Notas:** atajo `composer run dev`. Túnel y Vite no a la vez.

---

## 2026-08-16 · Cron local vs cola

- **Tema:** el worker ya vaciaba jobs; el schedule no corría en Windows. Verificar `store:release-unpaid` y no borrar pedidos sandbox viejos sin `payment_method=card`.
- **Entradas guardadas:** 02 **§2.9**; glosario `schedule:work` (Cursor).
- **Notas:** `composer run dev` ahora incluye `schedule:work`.

---

## 2026-08-16 · Flujo Stripe + TicketBAI (tienda)

- **Tema:** cobro vs factura; carrito → Stripe → `PaymentConfirmed` → cola → B2B; IVA incluido en web / neto a B2B; Sandbox no cierra TBAI; cómo probar en local.
- **Entradas guardadas:** tema **07** (§7.1–7.5); glosario TicketBAI, Stripe Checkout, B2BRouter, IVA incluido (Cursor).
- **Notas:** docs técnicos siguen en `docs/invoicing/B2BROUTER-TICKETBAI.md` y `docs/payments/STRIPE-WEBHOOK.md`. El libro explica el flujo en lenguaje del dueño.

---

## 2026-08-16 · Colas Laravel (`queue:work`)

- **Tema:** cola vs GET de página; `dispatch` no es HTTP; worker como segundo proceso (no 2º servidor); pago → redirect + jobs en fondo; relación con multi-hilo; estándar **1 worker = 1 job**.
- **Entradas guardadas:** 02 §2.5 reordenada; **02 §2.8** nueva; glosario Job/Queue, queue:work, dispatch, Worker, multi-hilo (Cursor).
- **Notas:** `QUEUE_CONNECTION=database`; ejemplos reales B2BRouter, contacto, chatbot, `PaymentConfirmed`.

---

> **Por ampliar:** una entrada por sesión/chat. Si una sesión no guardó nada en el libro, escribir solo el tema (sirve para recordar de qué se habló).
