# Informe de Auditoría Técnica — Frontend React (Laravel + Inertia)

**Alcance:** Seguridad, validaciones, rutas y rendimiento del frontend y su integración con el backend.  
**Restricción:** Sin cambios en código; solo análisis y recomendaciones.

---

## 1. Hallazgos técnicos (priorizados)

### Crítico

1. **XSS por `dangerouslySetInnerHTML` en mensajes flash**  
   - **Dónde:** `resources/js/components/Taquilla.jsx` (línea ~28): `flash.success` se renderiza con `dangerouslySetInnerHTML`.  
   - **Riesgo:** Si en algún momento el backend reenvía contenido de usuario o texto sin escapar en `flash.success`, un atacante podría inyectar HTML/script.  
   - **Evidencia:** `flash.error` y `flash.warning` se muestran como texto plano; solo `success` usa HTML.

2. **Rutas inexistentes (dead ends) en componente Taquilla**  
   - **Dónde:** `Taquilla.jsx` usa `route("taquilla.comprar", plan.id)`, `route("taquilla.pagar", plan.id)` y `route("taquilla.index")`.  
   - **Estado:** Esas rutas **no están definidas** en `routes/web.php` (sí existe `taquilla.index.admin` y rutas bajo `taquillas.*`).  
   - **Impacto:** Enlaces y formulario de pago llevan a 404 o error de Inertia si el usuario llega a esa vista.

3. **Páginas Admin Inertia sin componente (error al entrar)**  
   - **Dónde:** Rutas bajo `/admin` (surfboards, bookings) renderizan `Admin/Surfboards/Index`, `Admin/Surfboards/Create`, `Admin/Surfboards/Edit`, `Admin/Bookings/Index`.  
   - **Estado:** No existen los archivos `resources/js/Pages/Admin/Surfboards/*.jsx` ni `Admin/Bookings/Index.jsx`.  
   - **Impacto:** Al acceder a `/admin/surfboards` o `/admin/bookings`, Inertia lanza "No se encontró la página: Admin/...", dejando la app rota para el admin.

### Medio

4. **Falta de estado de carga y doble envío en Carrito**  
   - **Dónde:** `Carrito.jsx`: `router.delete` (eliminar) y `router.post` (crear pedido) no deshabilitan botones ni muestran loading.  
   - **Impacto:** Doble clic puede enviar dos peticiones; el usuario no recibe feedback visual durante la petición.

5. **CrearProducto sin `useForm` y sin feedback de error**  
   - **Dónde:** `CrearProducto.jsx` usa `router.post` directo; no usa `useForm` de Inertia.  
   - **Consecuencias:** No hay `processing` → botón no se deshabilita (doble submit); `onError` solo hace `console.error(errors)` → el usuario no ve mensajes de validación en pantalla.

6. **Productos (admin): errores de modificación solo en consola**  
   - **Dónde:** `Productos.jsx`: en `handleModificar` y `handleEliminar`, `onError` solo hace `console.error`.  
   - **Impacto:** El admin no ve por qué falló la actualización o el toggle de eliminado.

7. **Context del carrito: re-renders innecesarios**  
   - **Dónde:** `cartContext.jsx`: el `value` del `CartContext.Provider` es un objeto creado inline en cada render: `{ cartCount, updateCartCount, cartProducts, loadCart, cartLoadError }`.  
   - **Impacto:** Cualquier cambio de estado del provider hace que todos los consumidores (p. ej. `Menu_Principal`) se re-rendericen aunque no dependan de la parte que cambió. Debería estabilizarse con `useMemo`.

8. **Formulario de contacto no envía a backend**  
   - **Dónde:** `FormularioContacto.jsx`: `handleSubmit` usa `setTimeout` para simular envío; no hay `router.post` ni llamada a API.  
   - **Impacto:** El mensaje "Formulario enviado con éxito" es falso; los datos no se guardan ni se envían por correo. Funcionalidad incompleta o dead end de UX.

9. **Ruta producto-info posiblemente sobrante**  
   - **Dónde:** `web.php` define `Route::get('/producto-info', ...)->name('producto.info')` con comentario "ESTACREO K SOBRA".  
   - **Impacto:** Si nada enlaza a `producto.info` o se usa por error en lugar de `producto.ver`, confusión o rutas duplicadas.

### Bajo

10. **Validación cliente inconsistente en formularios**  
    - **CrearProducto:** No hay validación de `precio`/`unidades` (número, mínimos); solo HTML `required` en algunos campos.  
    - **AsignarTaquilla:** Se valida que no estén vacíos usuario y número de taquilla, pero no que `numero_taquilla` sea numérico; errores vía `alert()` en lugar de mensajes inline.  
    - **Productos (modificar):** Validación básica con `alert()`; no se muestran errores de servidor en el formulario.

11. **URLs hardcodeadas en lugar de `route()`**  
    - **Dónde:** `CrearProducto.jsx`: `router.post('/producto-store', ...)` y `router.visit('/productos')`.  
    - **Impacto:** Si cambian las rutas en Laravel, hay que tocar el JS; además no se beneficia del helper `route()` para nombres.

12. **CartProvider solo envuelve el menú**  
    - **Dónde:** `Layout1.jsx`: `<CartProvider>` envuelve solo `<Menu_principal />`, no el `children` (contenido de la página).  
    - **Impacto:** Cualquier página que use `useCartContext()` fuera del menú (p. ej. en el contenido principal) recibiría el valor por defecto del contexto (undefined si no hay default). Actualmente Carrito y ProductoVer no usan el contexto en el contenido; si en el futuro se usa, podría fallar sin provider.

13. **Uso de `alert()` para feedback al usuario**  
    - **Dónde:** `AsignarTaquilla.jsx`: éxito y error se muestran con `alert()`.  
    - **Impacto:** UX pobre y bloqueante; mejor toasts o mensajes inline como en Carrito/PlanesTaquillasClient.

---

## 2. Hoja de ruta de refactorización (paso a paso)

- **Paso 1 — Seguridad XSS**  
  Eliminar `dangerouslySetInnerHTML` en `Taquilla.jsx` y mostrar `flash.success` como texto plano (o usar una librería de sanitización si realmente se necesita HTML controlado desde el backend).

- **Paso 2 — Rutas Taquilla**  
  Decidir si el flujo de Taquilla (comprar/pagar/index) debe existir en esta app. Si sí: crear en `web.php` las rutas `taquilla.comprar`, `taquilla.pagar` y `taquilla.index` que apunten a controladores existentes o nuevos. Si no: sustituir/eliminar el componente Taquilla o sus enlaces para no referenciar rutas inexistentes.

- **Paso 3 — Páginas Admin**  
  Crear los componentes Inertia mínimos para que las rutas admin no fallen: `Admin/Surfboards/Index.jsx`, `Create.jsx`, `Edit.jsx` y `Admin/Bookings/Index.jsx` (aunque sea un placeholder con título y enlace atrás). Opcional: eliminar o comentar temporalmente las rutas admin si no se usan aún.

- **Paso 4 — Estado de carga en Carrito**  
  Añadir estado local `isSubmitting` (o similar) en `Carrito.jsx` que se ponga a `true` al llamar a `router.delete`/`router.post` y se resetee en `onFinish`. Deshabilitar los botones "Eliminar" (en el modal) y "Confirmar Pedido" mientras `isSubmitting` sea true y, si se desea, mostrar un indicador de carga.

- **Paso 5 — CrearProducto con useForm y errores**  
  Refactorizar `CrearProducto.jsx` a `useForm` de Inertia: usar `processing` para deshabilitar el botón y `errors` para mostrar mensajes de validación bajo cada campo (o un resumen en la parte superior), en lugar de solo `console.error`.

- **Paso 6 — Errores visibles en Productos (admin)**  
  En `Productos.jsx`, en `handleModificar` y `handleEliminar`, usar `onError` para guardar `errors` en un estado y mostrarlos en la UI (toast o mensaje junto al formulario), sin depender solo de la consola.

- **Paso 7 — Optimización del CartContext**  
  En `cartContext.jsx`, memorizar el objeto `value` del provider con `useMemo` dependiendo de `cartCount`, `cartProducts`, `cartLoadError` y de las funciones estables (p. ej. `updateCartCount`, `loadCart` envueltas en `useCallback` si hace falta) para reducir re-renders de los consumidores.

- **Paso 8 — Formulario de contacto**  
  O bien conectar `FormularioContacto.jsx` a un endpoint Laravel (p. ej. `post(route('contacto.store'))`) y mostrar éxito/error con estado y mensajes en la página, o bien dejar el formulario deshabilitado/oculto con un texto tipo "Próximamente" para no dar la impresión de que el mensaje se envía.

- **Paso 9 — Unificar rutas con `route()`**  
  Sustituir en `CrearProducto.jsx` y `ProductoCreado.jsx` las cadenas `/producto-store` y `/productos` por `route('producto.create')` y `route('mostrar.productos')` (o los nombres que tengas en `web.php`).

- **Paso 10 — Validaciones y UX en AsignarTaquilla**  
  Añadir validación numérica para número de taquilla en cliente y reemplazar `alert()` por un estado de mensaje (éxito/error) mostrado en la misma página, de forma similar a otros formularios del proyecto.

---

## 3. Buenas prácticas no aplicadas o mejorables

- **DRY (Don't Repeat Yourself)**  
  - CSRF: en varios sitios se lee `document.querySelector('meta[name="csrf-token"]')?.content`; ya está centralizado en `bootstrap.js` para Axios, pero los `fetch` manuales en `Productos.jsx` y `PlanesTaquillasClient.jsx` repiten la lógica. Conviene un helper (p. ej. `getCsrfHeader()`) o usar Axios/Inertia para no duplicar.

- **Validación en dos capas**  
  - Mantener y reforzar validación en servidor (Laravel); en cliente, además de `required`/`type="email"`/`type="number"`, usar las mismas reglas que el backend cuando sea posible (longitud, rangos) y mostrar errores de Inertia (`errors`) en los mismos campos para no depender solo de `alert()` o consola.

- **Estados de carga y error**  
  - Patrón común: un estado `loading`/`processing` y otro `error`/`errors`; deshabilitar botones de envío y mostrar mensajes bajo los campos o en un banner. Aplicarlo de forma uniforme en Carrito, CrearProducto, Productos y AsignarTaquilla.

- **Rutas nombradas**  
  - Usar siempre `route('nombre.ruta')` en el frontend para enlaces y redirecciones; evitar URLs literales para mantener una sola fuente de verdad en `web.php`.

- **Context y rendimiento**  
  - Valor del provider estable por referencia (`useMemo`/`useCallback`) para evitar que los consumidores se re-rendericen sin necesidad. Si el estado del carrito crece, valorar dividir el contexto (p. ej. solo contador en un contexto y lista en otro) para afinar suscripciones.

- **Seguridad de salida**  
  - No usar `dangerouslySetInnerHTML` con contenido que pueda venir de usuario o de mensajes del servidor sin sanitizar; en mensajes flash, preferir texto plano.

- **Código muerto**  
  - Eliminar o comentar el bloque grande comentado en `cartContext.jsx` (antiguo `useCart`/`CartProvider` alternativo) para reducir ruido. Revisar si `producto.info` y la ruta `/producto-info` se usan; si no, eliminarlos.

---

*Fin del informe. No se ha modificado código; solo análisis y recomendaciones.*
