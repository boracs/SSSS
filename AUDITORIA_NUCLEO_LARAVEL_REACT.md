# Auditoría técnica — Núcleo Laravel + React (sin Chatbot)

**Rol:** Senior Fullstack Engineer y Arquitecto de Seguridad Web  
**Alcance:** Seguridad, CSRF, Vite/Laravel, validaciones de negocio, rutas y estado global.  
**Excluido:** Toda funcionalidad relacionada con el Chatbot.  
**Restricción:** Solo análisis; no se ha modificado código.

---

## 1. Resumen ejecutivo

Se ha revisado la comunicación frontend–backend (Inertia), el uso de `cartContext.jsx`, las rutas web y su protección, la configuración de Vite, y las validaciones en registro, carrito y checkout. A continuación se listan las deficiencias priorizadas por impacto y una hoja de ruta para corregirlas sin comprometer la estabilidad.

---

## 2. Deficiencias técnicas (priorizadas)

### 🔴 Crítico

**1. Posible "Invalid response" en local (Vite + Blade)**  
- **Dónde:** `resources/views/app.blade.php` usa `@vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])`.  
- **Problema:** Con Inertia, el punto de entrada es un solo bundle (`app.jsx`), que resuelve la página por nombre dentro de la app. Incluir un segundo entry dinámico (`$page['component']`) puede hacer que Vite o el middleware de desarrollo esperen un recurso que no está en el grafo de entradas definido en `vite.config.js` (donde solo figuran `app.css` y `app.jsx`), generando respuestas inválidas o 404 en `localhost:5173`.  
- **Evidencia:** `vite.config.js` declara `input: ["resources/css/app.css", "resources/js/app.jsx"]`; no hay entradas por página.

**2. Cálculo de total del carrito en backend con tipos incorrectos**  
- **Dónde:** `CarritoController::index()` — se usa `number_format($subtotal, 2)` por línea y luego `$productos->reduce(..., 0)` sumando `$producto['subtotal']`.  
- **Problema:** `number_format` devuelve **string** (p. ej. `"12,50"` según locale). Sumar strings en PHP puede concatenar o depender de coercion; además, el `total` final se formatea de nuevo a string. Riesgo de totales erróneos y discrepancias con el checkout.  
- **Recomendación:** Calcular siempre con tipos numéricos (float/int); formatear solo al enviar a la vista o en el frontend.

**3. Rutas referenciadas en frontend que no existen en backend**  
- **Dónde:** Componente `Taquilla.jsx` usa `route("taquilla.comprar", plan.id)`, `route("taquilla.pagar", plan.id)` y `route("taquilla.index")`.  
- **Problema:** En `web.php` no existen rutas con esos nombres (sí existen `taquilla.index.admin`, `taquillas.index.client`, etc.). Enlaces y POST llevan a 404 o error de Inertia.  
- **Impacto:** Flujo de “comprar cuota / confirmar pago” roto para el usuario.

**4. Páginas Admin sin componente Inertia**  
- **Dónde:** Rutas `/admin/surfboards` y `/admin/bookings` renderizan `Admin/Surfboards/Index`, `Admin/Surfboards/Create`, `Admin/Surfboards/Edit`, `Admin/Bookings/Index`.  
- **Problema:** No existen los archivos correspondientes en `resources/js/Pages/Admin/`.  
- **Impacto:** Cualquier acceso a esas URLs por un admin produce el error de Inertia "No se encontró la página" y deja la zona admin inutilizable.

---

### 🟠 Medio

**5. CSRF: cobertura correcta pero lógica duplicada**  
- **Estado:** Las peticiones que usan el `router` de Inertia (get/post/put/delete) envían automáticamente el token CSRF que Laravel espera (cookie/header). Axios está configurado globalmente en `bootstrap.js` con `X-CSRF-TOKEN` desde la meta.  
- **Debilidad:** En `Productos.jsx` y `PlanesTaquillasClient.jsx` se usa `fetch()` manual y se repite la lectura de `document.querySelector('meta[name="csrf-token"]')`. Funciona, pero viola DRY y aumenta el riesgo de olvidar el header en futuros fetch.  
- **Recomendación:** Centralizar en un helper (p. ej. `getCsrfHeaders()`) o usar Axios/Inertia para todas las mutaciones.

**6. Sanitización de salida: XSS en mensajes flash**  
- **Dónde:** `Taquilla.jsx`: el mensaje de éxito se renderiza con `dangerouslySetInnerHTML={{ __html: flash.success }}`; `flash.error` y `flash.warning` se muestran como texto.  
- **Problema:** Si en algún momento el backend reenvía contenido de usuario o texto sin escapar en `flash.success`, existe riesgo de XSS.  
- **Recomendación:** Mostrar `flash.success` como texto plano o sanitizar en backend antes de enviar HTML.

**7. Validación en checkout (cliente)**  
- **Dónde:** `Carrito.jsx` — antes de `router.post(route("crear.pedido"), ...)` solo se comprueba que el total sea numérico y > 0.  
- **Debilidad:** No se valida que `productos` tenga la estructura esperada (id, cantidad, etc.) ni que las cantidades sean enteros positivos; se confía en que los datos vienen del servidor. Si hubiera manipulación del estado antes del envío, el backend sí valida (PedidoController), pero la UX de error sería solo tras el round-trip.  
- **Recomendación:** Validación ligera en cliente (array no vacío, tipos) y seguir dependiendo del servidor como fuente de verdad.

**8. Formularios sin uso de `useForm` o sin feedback de errores**  
- **CrearProducto.jsx:** Usa `router.post` directo; no hay estado `processing` (riesgo de doble envío) y `onError` solo hace `console.error(errors)` — el usuario no ve mensajes de validación.  
- **Productos.jsx (admin):** En `handleModificar` y `handleEliminar`, `onError` solo registra en consola; no hay toast ni mensaje inline.  
- **Impacto:** UX pobre y posibilidad de envíos duplicados en CrearProducto.

**9. Estado global del carrito: re-renders innecesarios**  
- **Dónde:** `cartContext.jsx` — el `value` del `CartContext.Provider` es un objeto literal creado en cada render: `{ cartCount, updateCartCount, cartProducts, loadCart, cartLoadError }`.  
- **Problema:** Cualquier actualización de estado del provider hace que todos los consumidores (p. ej. `Menu_Principal`) se re-rendericen aunque no cambie la parte que usan.  
- **Recomendación:** Estabilizar referencias con `useMemo` (objeto value) y `useCallback` (funciones) para reducir re-renders.

**10. CartProvider solo envuelve el menú**  
- **Dónde:** `Layout1.jsx`: `<CartProvider>` envuelve únicamente `<Menu_principal />`, no el `children`.  
- **Problema:** Cualquier componente que use `useCartContext()` fuera del menú (p. ej. en el contenido principal) obtendría el valor por defecto del contexto (undefined si no hay default). Hoy Carrito y ProductoVer no dependen del contexto en el contenido; si en el futuro se usa, podría fallar.  
- **Recomendación:** Envolver todo el layout con `CartProvider` o documentar que el contexto solo está disponible dentro del header.

**11. Ruta y comentario “sobrante”**  
- **Dónde:** `web.php` — `Route::get('/producto-info', ...)->name('producto.info')` con comentario "ESTACREO K SOBRA".  
- **Problema:** Duplicidad conceptual con `producto.ver`; si nada enlaza a `producto.info`, es código muerto y confusión.

---

### 🟡 Bajo

**12. URLs hardcodeadas en lugar de `route()`**  
- **Dónde:** `CrearProducto.jsx`: `router.post('/producto-store', form)` y `router.visit('/productos')`; `ProductoCreado.jsx`: `router.get('/productos')`.  
- **Problema:** Si se renombran rutas en Laravel, hay que tocar el JS; además no se aprovecha el helper `route()` para consistencia y refactor.  
- **Recomendación:** Usar `route('producto.create')` y `route('mostrar.productos')` (o los nombres reales definidos en `web.php`).

**13. Uso de `alert()` para feedback**  
- **Dónde:** `AsignarTaquilla.jsx`: éxito y error se muestran con `alert()`.  
- **Problema:** UX bloqueante y poco consistente con el resto de la app (Carrito/PlanesTaquillas usan toasts o mensajes inline).  
- **Recomendación:** Estado local de mensaje (éxito/error) y mostrarlo en la misma página.

**14. Validaciones cliente desiguales**  
- **Registro (Register.jsx):** useForm + errores de Inertia + campos required/email — correcto.  
- **AsignarTaquilla:** Solo comprueba que usuario y número no estén vacíos; no valida que el número de taquilla sea numérico.  
- **CrearProducto:** Solo `required` en algunos inputs; no hay validación de rango para precio/unidades.  
- **Recomendación:** Unificar criterio: validaciones básicas en cliente (tipo, rangos) y siempre validación estricta en servidor.

**15. Código muerto en cartContext**  
- **Dónde:** Bloque grande comentado al final de `cartContext.jsx` (otra versión de CartProvider/useCart).  
- **Problema:** Ruido en el archivo y riesgo de que alguien “reactive” código antiguo por error.  
- **Recomendación:** Eliminar el bloque o moverlo fuera del flujo (p. ej. documento de referencia).

---

## 3. Hoja de ruta de refactorización (paso a paso)

Objetivo: corregir un problema a la vez para mantener la estabilidad y que el sitio vuelva a cargar correctamente en local.

| Paso | Acción | Prioridad | Objetivo |
|------|--------|-----------|----------|
| 1 | Ajustar Blade para que solo cargue el entry de Inertia: `@vite(['resources/js/app.jsx'])` (sin el segundo argumento dinámico por página). Verificar que `vite.config.js` tenga `input` con `resources/js/app.jsx`. Reiniciar `npm run dev` y comprobar que `localhost:5173` responde bien. | Crítico | Estabilidad local y Vite |
| 2 | En `CarritoController::index()`, calcular subtotales y total con tipos numéricos (float); usar `round(..., 2)` y enviar números. Formatear a string solo en la vista (React) con `Intl.NumberFormat` o similar. | Crítico | Precisión financiera |
| 3 | Decidir el flujo de Taquilla: o bien crear en `web.php` las rutas `taquilla.comprar`, `taquilla.pagar` y `taquilla.index` que apunten a controladores existentes, o bien sustituir/eliminar los enlaces y el POST en `Taquilla.jsx` para no referenciar rutas inexistentes. | Crítico | Rutas sin dead ends |
| 4 | Crear componentes Inertia mínimos para Admin: `Admin/Surfboards/Index.jsx`, `Create.jsx`, `Edit.jsx` y `Admin/Bookings/Index.jsx` (aunque sea placeholder con título y enlace atrás), para que las rutas no lancen “No se encontró la página”. | Crítico | Zona admin accesible |
| 5 | Eliminar `dangerouslySetInnerHTML` para `flash.success` en `Taquilla.jsx`; mostrar el mensaje como texto plano. Si en el futuro se necesita HTML, sanitizar en backend y documentar. | Medio | Mitigación XSS |
| 6 | Centralizar CSRF para fetch: crear un helper (p. ej. en `bootstrap.js` o un módulo `api.js`) que devuelva `{ 'X-CSRF-TOKEN': ... }` y usarlo en `Productos.jsx` y `PlanesTaquillasClient.jsx` en lugar de repetir `document.querySelector(...)`. | Medio | DRY y mantenibilidad |
| 7 | En `CrearProducto.jsx`, migrar a `useForm` de Inertia: usar `processing` para deshabilitar el botón de envío y `errors` para mostrar mensajes bajo los campos (o resumen). Mantener validación en servidor. | Medio | UX y evitar doble submit |
| 8 | En `Productos.jsx`, en los callbacks `onError` de modificar y eliminar, guardar los errores en un estado y mostrarlos en la UI (toast o mensaje junto al formulario). | Medio | Feedback al admin |
| 9 | En `cartContext.jsx`, memorizar el objeto `value` del provider con `useMemo` (dependencias: cartCount, cartProducts, cartLoadError) y envolver `updateCartCount` y `loadCart` en `useCallback` para evitar re-renders innecesarios de los consumidores. | Medio | Rendimiento |
| 10 | Reemplazar en `CrearProducto.jsx` y `ProductoCreado.jsx` las URLs literales por `route('producto.create')` y `route('mostrar.productos')`. | Bajo | Consistencia y refactor seguro |
| 11 | En `AsignarTaquilla.jsx`, sustituir `alert()` por un estado de mensaje (éxito/error) mostrado en la misma página; opcionalmente validar que el número de taquilla sea numérico en cliente. | Bajo | UX y coherencia |
| 12 | Eliminar la ruta `producto.info` si no se usa en ningún enlace; en caso contrario, documentar su uso o unificarla con `producto.ver`. Eliminar el bloque comentado al final de `cartContext.jsx`. | Bajo | Limpieza y claridad |

---

## 4. Buenas prácticas (Clean Code / SOLID) aplicables

- **Single Responsibility (SRP)**  
  Los controladores mezclan lógica de negocio (cálculo de totales, reglas de stock) con la capa HTTP. A medio plazo, extraer la lógica a servicios (p. ej. `CarritoService`, `PedidoService`) deja a los controladores solo para validar request, llamar al servicio y devolver respuesta. Facilita tests y cambios de reglas sin tocar rutas.

- **DRY (Don’t Repeat Yourself)**  
  - CSRF: un único punto de verdad para headers (helper o Axios/Inertia).  
  - Mensajes flash: un componente reutilizable que reciba `flash` y muestre success/error/warning como texto, sin HTML crudo.  
  - Validaciones: donde se repitan reglas (p. ej. “número positivo”), considerar helpers o constantes compartidas entre cliente y documentación del backend.

- **Validación en dos capas**  
  - Servidor: siempre como fuente de verdad; validación estricta en todos los formularios (registro, carrito, checkout, admin).  
  - Cliente: validaciones básicas (requerido, tipo, rangos) para feedback inmediato; no sustituir la validación del servidor.

- **Estados de carga y error**  
  - Patrón uniforme: estado `processing`/`loading` para deshabilitar botones y mostrar indicador; estado `errors`/`message` para mostrar mensajes debajo de campos o en banner. Aplicarlo en Carrito, CrearProducto, Productos, AsignarTaquilla.

- **Rutas nombradas**  
  - Usar siempre `route('nombre')` en el frontend para enlaces y redirecciones; evitar URLs literales para que `web.php` sea la única fuente de verdad.

- **Context y rendimiento**  
  - Valor del provider estable por referencia (`useMemo`/`useCallback`) para no provocar re-renders en cascada. Si el estado del carrito crece, valorar dividir contexto (p. ej. solo contador vs. lista) para afinar suscripciones.

- **Seguridad de salida**  
  - No usar `dangerouslySetInnerHTML` con contenido que pueda venir de usuario o de mensajes del servidor sin sanitizar. En mensajes flash, preferir texto plano.

- **Protección de rutas**  
  - Las rutas sensibles (carrito, pedidos, admin) ya están agrupadas con `auth`, `verificarTaquilla` y `VerificarAdmin`. Mantener este criterio para cualquier ruta nueva y revisar que no queden GET/POST sensibles fuera de middleware.

---

## 5. Nota sobre el prompt de auditoría

Este prompt es **mejor que el anterior** en varios aspectos:

- **Enfoque explícito:** Excluir el Chatbot evita ruido y centra el análisis en el núcleo (carrito, checkout, auth, admin).  
- **Áreas acotadas:** Pedir explícitamente seguridad/CSRF, Vite/Laravel, validaciones y rutas/estado obliga a revisar cada capa y produce un informe más estructurado.  
- **Priorización:** “Crítico / Medio / Bajo” obliga a ordenar hallazgos por impacto y a una hoja de ruta realista.  
- **Restricción “solo análisis”:** Evita cambios prematuras y deja un documento estable para decidir qué tocar primero.

**Detalles que se pueden mejorar en futuros prompts:**

- Pedir explícitamente **no solo “si hay validación”** sino **“si la validación del cliente es coherente con la del servidor”** (mismas reglas o subconjunto).  
- Incluir **“revisar que no se expongan datos sensibles en props de Inertia o en respuestas JSON”** (p. ej. no enviar campos de usuario innecesarios al frontend).  
- Pedir **una tabla de rutas vs. middleware** (ruta, método, middleware aplicado) para comprobar que no queden endpoints sensibles desprotegidos.  
- Si se quiere ir más lejos, añadir **“sugerir tests mínimos (unit/integración) que cubran los puntos críticos”** (carrito, checkout, auth).

Con estos añadidos, el informe sale aún más orientado a un programador senior: seguro, práctico y fácil de ejecutar paso a paso.

---

*Fin del informe. No se ha modificado código; solo análisis y recomendaciones.*
