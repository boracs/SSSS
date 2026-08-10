# Coordinación de trabajo — Reasonix/DeepSeek ↔ Cursor

**Contrato dúo:** `docs/taller-prompts/CONTRATO-IA.md` — roles, router y anti-pisotón; este documento es el pizarrón de estado compartido.

**Regla de oro: nadie toca nada sin analizar antes.** Antes de responder, proponer o editar archivos, leer: (1) este documento, (2) el estado real del código, (3) el mapa del proyecto. Así no se solapan, pisan ni rehacen cosas ya hechas.

## Cuándo se usa

- El trabajo sobre `maider_0` se reparte entre **esta sesión (taller de prompts)** y **Cursor**.
- Según el tipo de prompt y los archivos que toque, el usuario pedirá a uno u otro.
- Este documento es el **punto de encuentro**: qué hay en curso, qué está hecho y por quién. Los dos lo leemos antes de actuar.

## Pre-vuelo obligatorio (antes de tocar nada)

1. Leer este archivo (`docs/taller-prompts/COORDINACION.md`).
2. Leer la sección **Estado actual** y **Última actividad**: si la tarea ya está hecha o en curso por el otro, **no repetirla**.
3. Analizar los archivos reales antes de responder o proponer:
   - `docs/PROJECT_TREE_FOR_GEMINI.md` → rutas y dominios (no inventar directorios).
   - Los archivos concretos que la tarea implica → leerlos, no asumir.
   - Buscar Services/Actions/DTOs existentes antes de crear nuevos (reutilizar antes que crear).
4. Si la tarea va a tocar archivos y no está reclamada: reclamarla en **Estado actual** antes de empezar (quién + qué + cuándo).

## Cómo reclamar una tarea

Añadir/actualizar una fila en **Estado actual**:

```
| [fecha] | [tarea] | [Reasonix | Cursor] | EN CURSO | [archivos que tocará] |
```

## Cómo cerrar una tarea

1. Comprobar que no se pisó ninguna zona del otro (revisar **Última actividad**).
2. Marcar `EN CURSO` → `HECHO` en **Estado actual**.
3. Añadir una entrada en **Última actividad** (1-2 líneas: qué se hizo, por quién, resultado).
4. Si se crearon/renombraron/eliminaron archivos de app o recursos: actualizar `docs/PROJECT_TREE_FOR_GEMINI.md`.

## Zonas que NO se pisan sin avisar

| Zona | Por qué |
|---|---|
| `.cursorrules`, `.cursor/skills/*`, `.cursor/rules/*` | Configuración de Cursor; solo se edita si el usuario lo pide |
| `docs/ia/*` (protocolos) | Solo se actualizan si el propio protocolo lo exige |
| Services existentes (`app/Services/*`) | Se extienden, no se duplican |
| Código de la aplicación | Esta sesión no lo edita; solo genera/mejora prompts |


## Estado actual

| Fecha | Tarea | Quién | Estado | Archivos afectados |
|---|---|---|---|---|
| 2026-08-10 | Afinado `AGENTE-MARKETING-DISENO.md` según crítica de Cursor (8/8): rol corto, disparo de skill (default S1 + mapa), modo admin vs público, anti-patrones S4, plantilla única de hallazgos (R5=§6), límites de alcance, SEO real del repo, qué NO hace | Reasonix | HECHO | `docs/taller-prompts/AGENTE-MARKETING-DISENO.md` |
| 2026-08-10 | Confirmación cruzada de roles (DeepSeek↔Cursor): diseño vs lógica | Cursor | HECHO | `CONTRATO-IA.md` §5.1, `AGENTS.md`, `.cursorrules`, `MASTER-PROMPT-DEEPSEEK.md` |
| 2026-08-10 | Follow-up 2 de Cursor (5/5): separador de tabla restaurado, título + enlace contrato, MASTER L4 (núcleo compartido no "espejo"), USO del script con `--topic ticket`, poda extra 08-09 → archivo | Reasonix | HECHO | `COORDINACION.md`, `COORDINACION-ARCHIVO.md`, `MASTER-PROMPT-DEEPSEEK.md`, `scripts/deepseek-ask.mjs` |
| 2026-08-10 | Compatibilidad dúo Reasonix/DeepSeek ↔ Cursor (contrato + router único) | Cursor | HECHO | `CONTRATO-IA.md` + espejo en `AGENTS.md`, `.cursorrules`, `MASTER-PROMPT-DEEPSEEK.md`, `PROTOCOLO.md`, mapa |
| 2026-08-10 | Follow-up Cursor al remate (8/8): §7 vs §3 unificados, §6 + script, fila ticket en tablas, 02 §4 → pointer, mapa actualizado, usage dinámico, globs ui-admin acotados, poda COORDINACION | Reasonix | HECHO | ver `REGISTRO.md` |
| 2026-08-10 | Remate del sistema de prompts: P1 (UTF-16→UTF-8 en sovereign-architect + typo `docs/ai`→`docs/ia` + 02 degradado a plantilla) + `RESUMEN-PARA-GEMINI.md` + `RUTAS-CONTEXTO.json` (router máquina, cableado al script) + rule `ui-admin-s4.mdc` + S11 del agente + pulidos (prompt-forge desc, AGENTS.md, CONTRATO §3, master §3, .cursorrules) | Reasonix | HECHO | ver `REGISTRO.md` |
| 2026-08-10 | Agente senior Marketing + Diseño Web (persona con skills/rules, invocable `/marketing-diseno`) | Reasonix | HECHO | `docs/taller-prompts/AGENTE-MARKETING-DISENO.md` |
| 2026-08-10 | Tienda: «Ver más» (lotes de 8) en vez de paginación | Cursor | HECHO | `Tienda.jsx` |
| 2026-08-10 | Tienda: suavizar parche blanco de fotos de producto | Cursor | HECHO | `Producto.jsx` (pozo slate-200 + object-contain; grid /tienda y slider ofertas) |

## Última actividad

- **2026-08-10** — Cursor: confirmación cruzada de roles — si DeepSeek recibe pedido de lógica/código, pregunta confirmación; si Cursor recibe solo diseño/UX, pregunta confirmación (`CONTRATO-IA.md` §5.1 + `AGENTS.md` + `.cursorrules` + MASTER). HECHO.
- **2026-08-10** — Cursor: compatibilidad dúo Reasonix/DeepSeek ↔ Cursor — nuevo `CONTRATO-IA.md` (roles, router único, anti-pisotón); espejado en `AGENTS.md`, `.cursorrules`, `MASTER-PROMPT-DEEPSEEK.md`, `PROTOCOLO.md` y mapa. HECHO.
- **2026-08-10** — Cursor: Tienda — paginación Anterior/Siguiente sustituida por «Ver más» (lotes de 8; se acumulan; al filtrar/ordenar se resetea). Contador «Mostrando X de Y». HECHO.
- **2026-08-10** — Cursor: Tienda (`/tienda`) — fotos de producto con fondo blanco sobre card navy: pozo de imagen en gris suave (`from-slate-200 to-slate-300`) + `object-contain` con padding (en vez de `object-cover` sobre `bg-slate-800`). Afecta grid tienda y slider de ofertas vía `Producto.jsx`. HECHO.

> Historial completo (actividad 2026-08-03 → 2026-08-09 y filas HECHO anteriores): `docs/taller-prompts/COORDINACION-ARCHIVO.md` (poda 2026-08-10).
