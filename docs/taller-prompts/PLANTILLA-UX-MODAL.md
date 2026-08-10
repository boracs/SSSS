# Plantilla — Prompt de UX de modal (admin mostrador)

> **Provenance:** destilada 2026-08-09 de la tarea "Datáfono ticket: UX Alquiler (pastillas + chips)" (ejecutada por Cursor, auditada por DeepSeek Ronda 1 y Ronda final). v2 = condensada según DeepSeek. Válida para rediseños de UI/UX del admin sin tocar lógica.
>
> **Lecciones (5, no eliminar):**
> 1. **Pre-check HECHO** → abortar sin reescribir.
> 2. **€ float ≠ céntimos**: declarar la unidad según la fuente (÷100 solo si céntimos).
> 3. **Shared UI acotada** por categoría/estado.
> 4. **Locator por bloque**, no por números de línea.
> 5. **Payload keys**: verificar por diff; el build no prueba nada de eso.

---

ROL: FE React/Inertia (admin slate/cyan).

OBJETIVO: En `[ARCHIVO]`, rediseñar solo `[bloque]`: [cambios]. Sin tocar negocio ni
keys payload [lista].

PRE-CHECK: 1) Leer `docs/taller-prompts/COORDINACION.md`. 2) Si `[Tarea]` está HECHO y el
código ya cumple → responder "Ya implementado" + evidencias; no tocar. Si no → reclamar
EN CURSO. 3) Leer [archivos]; localizar por `[locator/bloque]`; ignorar nº de línea.

CONTEXTO (no inventar): [props disponibles + unidad (€|céntimos); 0/ausente = no vendible].
No tocar backend. [Fuente importe] → [consumidor]; sin state paralelo. Helpers:
[nombre@archivo]. Conservar [efecto ya existente]. Estilo = [referencia del mismo componente].

€ (solo si la tarea implica dinero): float → `Number(x).toLocaleString("es-ES", { minimumFractionDigits: 2 })` sin /100; céntimos → `x/100` + mismo formato.

TAREAS: 1) [UI + a11y + efectos a mantener]. 2) [Regla única + triggers A/B → resync según C].
3) [Estado vacío]. 4) [Orden visual]. 5) [Shared: condicional SOLO [cat/estado]]. 6) [Copy
definitivo]. 7) COORDINACION HECHO + `[build]`.

RESTRICCIONES: Solo UI/JS de [archivo]. No backend/[libs]/deps/archivos nuevos. No cambiar
payload. No tocar [bloques vecinos] salvo shared condicional.

SALIDA: 1) Archivos tocados o "ya implementado". 2) Resumen/evidencia. 3) `[build]` + diff
keys payload. 4) Riesgos o "ninguna".

CRITERIOS:
- [ ] pre-check respetado
- [ ] cambio A→B + efecto
- [ ] € según fuente
- [ ] vacío
- [ ] resync sin tocar raíz
- [ ] importe 1 fuente
- [ ] shared solo [cat]
- [ ] payload keys
- [ ] build + COORDINACION si hubo cambios
