# 03 · React 19 + JavaScript + Inertia

> El frontend de `maider_0` es React 19 con Inertia.js 2 y Tailwind. Aquí se guarda lo conceptual de React/JS que vas aprendiendo.

---

## 3.1 ¿Qué es Inertia.js y por qué existe?

- **Qué es:** un pegamento entre Laravel (backend) y React (frontend) **sin construir una API**. El controlador hace `Inertia::render('Pages/Tienda', $props)` y React recibe los datos como props de página. Las rutas se comparten con **Ziggy** (`route()` en JS).
- **Por qué importa:** no hay que montar REST/JSON solo para servir páginas; el enrutado lo sigue mandando Laravel, y el frontend es una SPA (no recarga completa).
- **En tu proyecto:** `routes/web.php` → `Inertia::render('Pages/...')` → `resources/js/Pages/{Nombre}.jsx`. Rutas JS vía `lib/route.js` (build inyecta `@route`).
- **Para recordar:** *Inertia = Laravel manda en las rutas, React pinta la página.*

---

## 3.2 Componente, props y estado (los tres ladrillos)

- **Qué es:** un **componente** es una función que devuelve UI. Las **props** son datos que recibe del padre (inmutables). El **estado** (`useState`) es memoria interna del componente que, al cambiar, re-renderiza.
- **Por qué importa:** entender cuándo algo debe ser prop (viene de fuera) y cuándo estado (vive dentro) es la base de React.
- **En tu proyecto:** cualquier `.jsx` de `resources/js/Pages/` o `components/`.
- **Para recordar:** *props = entrada (solo lectura); estado = memoria que provoca re-render.*

---

## 3.3 Hooks (`useState`, `useEffect`, `useMemo`…)

- **Qué es:** funciones de React que te "enganchan" a características (estado, ciclo de vida, rendimiento). Los componentes deben ser **funcionales y usar Hooks** (regla V3).
- **Por qué importa:** los hooks son la forma moderna de React; `useEffect` para efectos (fetch, suscripciones), `useMemo`/`useCallback` para no recalcular de más.
- **En tu proyecto:** `useDetailedForecast.js` (fetch on-demand), `useOptimistic` (UI optimista en React 19), lazy/Suspense para el chatbot (`import.meta.glob` diferido en `app.jsx` → chunks por ruta).
- **Para recordar:** *¿necesitas recordar algo o reaccionar a un cambio? → hook.*

---

## 3.4 Estado global vs props vs lazy props

- **Qué es:** los datos compartidos a todas las páginas se inyectan desde Laravel con `HandleInertiaRequests` (auth.user, flash, ziggy). Las **Lazy Props** solo se cargan cuando hacen falta (rendimiento).
- **Por qué importa:** no mandar a todas las páginas datos que solo usa una. Restricción de la carga útil en el `share` global.
- **En tu proyecto:** `app/Http/Middleware/HandleInertiaRequests.php` → `auth.user` (role, is_vip, has_active_locker…), `academyWhatsappUrl`, `flash`, `ziggy`.
- **Para recordar:** *lo común → shared props; lo puntual → lazy o por página.*

---

## 3.5 ¿Qué es el DOM y por qué React usa un Virtual DOM?

- **Qué es:** el DOM es la estructura de la página en el navegador (árbol de elementos). Manipularlo directo es lento. React mantiene una copia en memoria (Virtual DOM), calcula qué cambió y aplica solo ese cambio al DOM real.
- **Por qué importa:** rendimiento: la UI reacciona sin recargar la página.
- **Para recordar:** *React no re-pinta todo; solo lo que cambió.*

---

## 3.6 JS: `async/await`, promesas y fetch

- **Qué es:** las operaciones de red son **asíncronas**. Una promesa es "un valor que llegará"; `await` espera a que llegue dentro de una función `async`.
- **Por qué importa:** toda llamada a backend (fetch, axios) es asíncrona; sin `await` trabajarías con datos que aún no existen.
- **En tu proyecto:** llamadas a `servicios.webcams.forecast_detailed` en `useDetailedForecast.js`, POST de reservas/pagos.
- **Para recordar:** *red = promesa; promesa + `await` dentro de `async` = dato listo.*

---

## 3.7 Vite (`npm run dev`): el traductor de la vitrina

- **Qué es:** **React** es una librería (caja de herramientas) para pintar pantallas. Escribe el aspecto de botones y páginas en archivos `.jsx`: parece HTML mezclado con lógica. El navegador **no come** ese formato crudo. **Vite** (el comando `npm run dev`) es el **traductor**: convierte esos archivos a JavaScript normal y se los sirve al Chrome. Mientras está encendido, si guardas un cambio, la página se actualiza sola (no hace falta F5 a cada rato).
- **Por qué importa:** Laravel (el “mostrador” PHP) entrega la página. La vitrina bonita (React) la monta Vite. Si apagas Vite, o Laravel busca un traductor que ya no está (archivo `public/hot`) y ves **pantalla blanca**, o enseña una foto vieja de la vitrina (`public/build`).
- **En tu proyecto:** pantallas en `resources/js/Pages/` y `components/`. Para enseñar a amigos por internet se apaga Vite y se hace una “foto” definitiva (`npm run share:tunnel`). Vite y túnel a la vez se pisan.
- **Para recordar:** *React = cómo se pinta; Vite = traductor en vivo; Laravel = quién atiende al cliente.*

---

## 3.8 Componente canónico (el molde oficial)

- **Qué es:** **canónico = la versión oficial**, la de referencia. En vez de copiar el mismo botón/acordeón en diez pantallas (diez códigos casi iguales), se crea **un molde** (`AccordionTrigger`) y las demás **lo usan**. El molde lleva lo común (botón, chevron que gira, `aria-expanded`). Los **detalles van uno a uno** en cada pantalla: colores, textos («Ver detalles», «Abrir»), tamaño.
- **Por qué importa:** un bug o una mejora de accesibilidad se arregla **en un sitio**, no en diez. Unificar = extraer el código repetido a ese molde; cada página **llama** al molde, no reescribe el motor.
- **En tu proyecto:** `resources/js/components/ui/AccordionTrigger.jsx` (y `ExpandableText.jsx` para «Leer más»). Lo usan Pedidos, Clients, Vigencia, Datáfono móvil, Surfboards admin, SurfBriefMini. SecondHand (Plus/Minus) y Bonos (`▼`) aún no: ahí el dibujo es otro, no solo el molde.
- **Para recordar:** *canónico = molde oficial; las pantallas lo llaman y solo pintan sus matices.*

---

## 3.9 Disparador (trigger): frontend ≠ base de datos

- **Qué es:** misma palabra, dos mundos. En **frontend**, *trigger* es el **gatillo de la pantalla**: un clic, un hover, un submit. Ese gesto llama a una función (`onClick`, `onToggle`) y se dispara la acción (abrir el acordeón). `AccordionTrigger` es ese **botón**, no un trigger de SQL. En **MySQL**, un `TRIGGER` es código **dentro de la BD** que corre solo cuando hay `INSERT`/`UPDATE`/`DELETE` (nadie pulsa nada). Tampoco es un **Event de Laravel** (`PaymentConfirmed`): eso es backend, “pasó un cobro → reacciona un listener”.
- **Por qué importa:** si oyes “trigger” o “disparador”, pregunta **en qué capa**. Si no, mezclas el botón del acordeón con la base de datos.
- **En tu proyecto:** el clic de `AccordionTrigger` abre el panel. Los cobros usan Events/Jobs (`02`), no triggers de MySQL.
- **Para recordar:** *frontend = el usuario aprieta el gatillo; BD = MySQL reacciona solo al cambiar una fila.*

---

> **Por ampliar:** 3.10+ (useActionState, Suspense, context, memoización, testing con Vitest…).
