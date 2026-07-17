# Informe de lógica de negocio — S4 (San Sebastián Surf School)

**Propósito de este documento:** es el borrador de contexto de negocio que se inyecta a Gemini (vía `App\Services\Chatbot\S4BusinessContextService`) para que el chatbot responda con datos reales de la escuela y nunca invente precios ni políticas.

**Estado:** **ENTORNO DE PRUEBA** — borrador generado a partir del código (modelos, config, seeders). **Ningún precio, plan ni política en BD o en este documento es oficial** hasta que el cliente (San Sebastián Surf School) lo confirme. Los valores de seeders (ej. 8 clases/170 €, taquilla 60 €) sirven solo para desarrollo y demos.

---

## 1. Qué se inyecta realmente a Gemini y de dónde sale

`S4BusinessContextService::buildSystemPrompt()` construye el bloque de contexto combinando dos fuentes distintas — es importante saber cuál es cuál para saber **dónde editar** cada dato:

| Dato | Fuente | Cómo se actualiza |
|------|--------|--------------------|
| Packs de bono VIP (nombre, nº clases, precio) | **Tabla `pack_bonos`** (solo `activo = true`), leído en vivo | Panel admin → Bonos, o editando la tabla directamente. **No hay que tocar código.** |
| Planes de taquilla (nombre, duración, precio) | **Tabla `planes_taquilla`** (solo `activo = true`), leído en vivo | Panel admin → Taquillas → Planes. **No hay que tocar código.** |
| Artículos Taller de Surf | **Tabla `articles`** (`chatbot_summary`, `chatbot_keywords`, slug…) | Panel/admin BD o migración; catálogo en `ChatbotArticleCatalogService`. |
| Páginas explicativas (Nosotros, reparaciones, servicios…) | **`config/chatbot_pages.php`** | Editar summary/keywords/patterns en config; catálogo en `ChatbotPageCatalogService`. |
| Intents FAQ (preguntas típicas + datos personales logueado) | **`config/chatbot_faq.php`** | Patrones regex + `sample_questions`; handlers `static` o `dynamic:locker_status` / `dynamic:bono_balance` vía `ChatbotFaqCatalogService` + `ChatbotUserAccountFaqService`. |
| Contacto reparaciones Edy/Willy | **`config/services.php` → `repair.*`** | Variables `REPAIR_EDY_*`, `REPAIR_WILLY_*` en `.env`. |
| Señal de reserva de clase, cierre de inscripciones, horas de cancelación, aforo por monitor | **`config/services.php` → `academy.*`** (con overrides por `.env`) | Variables `ACADEMY_CLASS_RESERVATION_DEPOSIT_EUR`, `ACADEMY_ENROLL_CUTOFF_MINUTES`, `ACADEMY_CANCEL_CUTOFF_HOURS`, `ACADEMY_STANDARD_MONITOR_CAPACITY` en `.env`. |
| Señal de alquiler de tablas (30%), caducidad de reserva (7 días) | **Hardcodeado en `S4BusinessContextService`**, refleja lo que hace `BookingService` | Si cambia la regla en `BookingService`, hay que actualizar el texto aquí a mano (no se lee en vivo). |
| Contacto WhatsApp | **`AcademyContact::whatsappDisplay()`** → `.env ACADEMY_WHATSAPP_NUMBER` | `.env`. |
| Modalidades de clase, ubicación (Zurriola), reglas de consumo de bono por modalidad | **Texto fijo** en `S4BusinessContextService` | Editar el archivo si cambia la política. |

El bloque se cachea 5 minutos (`Cache::remember`) para no golpear la BD en cada mensaje del chat. Si cambias un precio y quieres verlo reflejado al instante, hay un método `S4BusinessContextService::forget()` para invalidar la caché a mano (aún no conectado a ningún botón de admin — pendiente si lo quieres).

---

## 2. Clases de surf / Academia

- **Modalidades:** iniciación, intermedio, avanzado × grupal, particular, semanal (y `vip` aparece en algunos seeders sin ser una modalidad "oficial" en el modelo).
- **Ubicación:** playa de Zurriola (Donostia), instalaciones del club.
- **Precio de una clase:** no hay un tarifario fijo en código — cada `Lesson` tiene su propio campo `price` en BD. Si una clase no tiene precio asignado, se cobra la señal por defecto (30 €).
  - Precios que aparecen en seeders de demo (**no son tarifas reales, son datos de prueba**): 35 €, 42 €, 55 € según el seeder.
- **Señal de reserva:** máximo **30 €** por tarjeta (config `ACADEMY_CLASS_RESERVATION_DEPOSIT_EUR`), el resto se paga en la escuela. ⚠️ Ojo: el modal de pago en frontend (`PaymentModal.jsx`) siempre habla de "señal de 30 €", pero si una clase tiene `price` superior a 30 €, conviene confirmar que el cobro real coincide con lo que se le dice al chatbot.
- **Cierre de inscripciones online:** 30 minutos antes del inicio (config `ACADEMY_ENROLL_CUTOFF_MINUTES`).
- **Aforo:** hasta 6 alumnos por monitor; grupos de 7 o más requieren 2 monitores (config `ACADEMY_STANDARD_MONITOR_CAPACITY`).
- **Consumo de bono por clase:**
  - Particular → 2 clases del bono.
  - Grupal/semanal con una sola persona apuntada → 2 clases.
  - Grupal con varias personas → 1 clase por persona.

## 3. Cancelaciones y reembolsos

- **Alumno cancela con ≥4 horas de antelación** (config `ACADEMY_CANCEL_CUTOFF_HOURS`) → se le devuelve la clase al bono / se gestiona el reembolso según cómo pagó.
- **Alumno cancela con menos de 4 horas o no avisa** → la plaza se pierde y puede no devolverse la clase del bono.
- **La escuela cancela** (mal mar, temporal, seguridad) → siempre se reprograma o se devuelve el importe/clase del bono. Nunca se penaliza al alumno.
- **Reservas de clase pendientes de pago sin comprobante:** expiran a los 30 min si la clase es en <4h, o a las 2h en caso contrario (liberan la plaza automáticamente).
- **Reservas de alquiler de tabla pendientes de pago:** expiran a los 7 días.

## 4. Bonos VIP

- Se venden como packs de X clases por un precio fijo (ver tabla en vivo en el panel admin — actualmente en seeders de ejemplo: 8 clases/170€, 12 clases/240€, 20 clases/380€, **valores de demo, confírmalos**).
- El saldo de clases (`clases_restantes`) **no caduca por fecha**, solo se agota por uso. Si quieres añadir una fecha de caducidad en el futuro, es un cambio de modelo (`UserBono`) que el chatbot heredaría automáticamente en cuanto se reflejara en la consulta — de momento no existe.
- Solo usuarios marcados como VIP pueden comprar un bono.

## 5. Taquillas

- Planes por duración (mensual/trimestral/semestral/anual) con precio fijo (ver tabla en vivo en admin — valores de demo en seeders van de 50€ a 480€ según el seeder usado, **confírmalos**).
- Hay un concepto de plan "VIP" con descuento, pero el nombrado en distintos seeders no es 100% consistente (p. ej. un seeder de asignación busca planes `"Plan VIP%"` que no siempre existen con ese nombre exacto) — si vas a usar taquillas VIP en producción, conviene revisar que los nombres de plan sean coherentes entre el seeder de datos y el seeder de asignación.
- **FAQ local (usuario logueado):** preguntas como «¿hasta cuándo tengo taquilla?» se resuelven sin Gemini con `LockerPaymentIndexBuilder::computeAvailabilityMap()` (misma lógica que la cola admin: periodo actual + días apilados).

## 6. Alquiler de tablas

- El precio depende del modelo de tabla y la duración elegida (desde 1 hora hasta 1 semana); se calcula en la web al elegir fechas, no es un número fijo.
- Señal de reserva: 30% del precio total.
- No hay dirección postal (calle/número) en el backend, solo "Zurriola, Donostia" como referencia de marketing — si quieres que el chatbot dé una dirección exacta, hay que añadirla a `config/services.php` o a `AcademyContact`.

## 7. Contacto

- WhatsApp: número centralizado en `.env` (`ACADEMY_WHATSAPP_NUMBER`). Si ese valor está vacío o es el placeholder de ejemplo, tanto el botón del chatbot como el texto que Gemini puede ofrecer al usuario quedarán sin número real — **hay que confirmarlo antes de ir a producción**.
- Email/Instagram de marketing (`info@sansebastiansurfschool.com`, `@sansebastiansurfschool`) están escritos directamente en páginas de marketing (`Nosotros.jsx`), no en `config/services.php` — si cambian, hay que tocarlos ahí (fuera del alcance del chatbot).

---

## 8. Qué falta por matizar (para ti)

Esta lista es la que decías que ibas a completar tú:

- [ ] Confirmar los precios reales de los packs de bono VIP (¿son los de seeder o hay tarifas oficiales distintas?).
- [ ] Confirmar los precios reales de los planes de taquilla.
- [ ] Confirmar si la señal de 30 € de clase es siempre así o varía según modalidad/temporada.
- [ ] Decidir si quieres que el chatbot mencione tarifas de alquiler concretas (actualmente se le dice que "depende de la web", sin números) o si prefieres darle una tabla resumen aproximada.
- [ ] Revisar el número de WhatsApp en `.env` (`ACADEMY_WHATSAPP_NUMBER`) — es el mismo que usa el botón del chatbot y el que Gemini puede citar.
- [ ] Decidir si quieres una política de cancelación distinta para bonos VIP vs. clases sueltas (hoy el chatbot no distingue).
- [ ] Revisar si quieres añadir el horario de apertura del club/taquillas (no existe ese dato en ningún sitio del backend hoy).

---

## 9. Cómo probar cambios sin tocar código

1. Cambia el precio/nombre de un pack o plan directamente en la BD o desde el panel admin correspondiente.
2. Espera hasta 5 minutos (TTL de caché) o llama a `S4BusinessContextService::forget()` (por ejemplo desde `php artisan tinker`) para forzar la actualización inmediata.
3. Pregúntale al chatbot algo relacionado (ej. "¿cuánto cuesta el bono de 12 clases?") y comprueba que responde con el valor nuevo.

Para cambios de **política** (cancelación, señales, textos fijos), hay que editar `app/Services/Chatbot/S4BusinessContextService.php` directamente — no están en BD.
