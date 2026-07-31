# Informe de lógica de negocio — S4 (San Sebastián Surf School)

**Propósito de este documento:** es el borrador de contexto de negocio que se inyecta a Gemini (vía `App\Services\Chatbot\S4BusinessContextService`) para que el chatbot responda con datos reales de la escuela y nunca invente precios ni políticas.

**Estado:** **ENTORNO DE PRUEBA** — borrador generado a partir del código (modelos, config, seeders). **Ningún precio, plan ni política en BD o en este documento es oficial** hasta que el cliente (San Sebastián Surf School) lo confirme. Los valores de seeders (ej. 8 clases/170 €, taquilla 60 €) sirven solo para desarrollo y demos.

---

## 1. Qué se inyecta realmente a Gemini y de dónde sale

`S4BusinessContextService::buildSystemPrompt()` combina:

| Dato | Fuente | Cómo se actualiza |
|------|--------|--------------------|
| Políticas, edge cases, tarifario comercial, playbook WhatsApp | **`resources/chatbot/s4-business-knowledge.json`** vía `S4BusinessKnowledgeService` (compilado a markdown; no se manda el JSON crudo) | Editar el JSON; `status: draft_unconfirmed` hasta confirmación cliente. Luego `S4BusinessContextService::forget()`. |
| Packs de bono VIP (nombre, nº clases, precio) | **Tabla `pack_bonos`** (solo `activo = true`), leído en vivo | Panel admin → Bonos |
| Planes de taquilla (nombre, duración, precio) | **Tabla `planes_taquilla`** (solo `activo = true`), leído en vivo | Panel admin → Taquillas → Planes |
| Artículos Taller de Surf | **Tabla `articles`** | Panel/admin BD |
| Páginas explicativas | **`config/chatbot_pages.php`** | Editar config |
| Intents FAQ | **`config/chatbot_faq.php`** | Patrones + handlers |
| Contacto reparaciones Edy/Willy | **`config/services.php` → `repair.*`** | `.env` |
| Señal / cierre / cancelación clase | **`config/services.php` → `academy.*`** (inyectado al compilar el JSON) | `.env` |
| Señal alquiler 30 %, caducidad 7 días | **JSON knowledge** (alineado con `BookingService`) | Editar JSON si cambia el código |
| WhatsApp | **`AcademyContact`** | `.env` |

El bloque se cachea 5 minutos. Tras editar JSON o precios admin: `S4BusinessContextService::forget()`.

---

## 2. Clases de surf / Academia

Ver sección `academy` + `edge_cases` en el JSON. Resumen ejecutable:

- **Modalidades:** iniciación, intermedio, avanzado × grupal, particular, semanal (+ calendario VIP).
- **Nivel del alumno:** la app **no** valida nivel vs sesión; proceso humano / monitor.
- **Amigo sin cuenta:** grupal abierta y particular = self-service guest en `/academia` (contacto + señal). Semanal/VIP = login. Alternativas: grupo del titular o walk-in admin.
- **Señal online:** máx. según `ACADEMY_CLASS_RESERVATION_DEPOSIT_EUR` (default 30 €); resto en escuela.
- **Consumo bono:** particular = 2; grupal solo = 2; grupal con varios = 1.

Tarifario comercial (particulares / bonos grupo) vive en el JSON con `pricing_status: unconfirmed`.

---

## 3. Cancelaciones y reembolsos

- Cutoff alumno: `ACADEMY_CANCEL_CUTOFF_HOURS` (default 4 h) — ver `academy.cancel_student_policy` en JSON.
- Mal mar: siempre reprograma/devuelve — `academy.mal_mar_policy`.
- Alquiler pendiente: 7 días (`rentals.pending_expires_days`).

---

## 4. Bonos VIP / Taquillas / resto

Packs y planes: **solo BD**. Reglas VIP virtual 500/600, llave emergencia, tienda, reparaciones, segunda mano, subastas y playbook WhatsApp: **JSON**.

---

## 5. Contacto

WhatsApp / email vía `AcademyContact` y config academy — no hardcodear en el JSON números (solo `*_source`).

---

## 6. Checklist pendiente de confirmación con el cliente

- [ ] Precios oficiales tarifario comercial + packs VIP + planes taquilla
- [ ] Señal 30 € y políticas de cancelación
- [ ] `ACADEMY_WHATSAPP_NUMBER` real
- [ ] Horario club
- [ ] Pasar `meta.status` del JSON de `draft_unconfirmed` → `confirmed` cuando el cliente valide

---

## 7. Cómo probar cambios

1. Edita `resources/chatbot/s4-business-knowledge.json` o precios en admin.
2. `php artisan tinker` → `app(App\Services\Chatbot\S4BusinessContextService::class)->forget();`
3. Pregunta al chatbot (precios, “viene un amigo”, “nivel avanzado”, etc.).
