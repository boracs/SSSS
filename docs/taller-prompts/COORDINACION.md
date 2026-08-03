# Coordinación de trabajo — Reasonix (taller de prompts) ↔ Cursor

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
| — | — | — | — | — |

## Última actividad

- **2026-06-18** — Reasonix: creada infraestructura del taller de prompts (`docs/taller-prompts/PROTOCOLO.md`, `REGISTRO.md`, `COORDINACION.md`) y actualizado `docs/PROJECT_TREE_FOR_GEMINI.md`. HECHO.
- **2026-08-03** — Reasonix: configurado túnel Cloudflare (named + quick), creado túnel `masquesurf` con credenciales en `~/.cloudflared/`, config.yml apuntando a `sansebastiansurfschool.eu`, CNAME enrutado, nameservers cambiados en DonDominio (pendiente propagación DNS). Revertido a modo desarrollo normal. HECHO.
