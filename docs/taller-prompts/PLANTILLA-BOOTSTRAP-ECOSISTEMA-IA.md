# 🧰 PLANTILLA-BOOTSTRAP — Ecosistema de trabajo con IA por proyecto

> **Para qué sirve:** montar en un proyecto NUEVO el sistema de trabajo con IAs que funciona en maider_0.
> **Filosofía:** la estructura es portable; el contenido es específico. Esta plantilla da la estructura; cada proyecto rellena SU info (stack, rutas, conocimiento).
> **Referencia viva:** el ecosistema real de maider_0 (contrato, router, libro, coordinación) en `docs/taller-prompts/` y `docs/aprendizaje/`.

---

## 0) Las 3 capas del ecosistema

```
CAPA 1 · ENTRADA        AGENTS.md / .cursorrules / MASTER-PROMPT (rol + router)
CAPA 2 · ESTADO         COORDINACION.md (pre-vuelo + anti-pisotón) + RUTAS-CONTEXTO.json
CAPA 3 · CONOCIMIENTO   docs/aprendizaje/ (INDICE A-D + temas + SESIONES + FLUJOS)
```

Todo converge en un **contrato único** y un **router máquina** (tema → archivos, cargar solo la fila).

---

## 1) Diagnóstico inicial (5 minutos — decide ANTES de montar)

| Pregunta | Opciones | Impacto |
|---|---|---|
| ¿Stack? | Laravel/React · Node · PHP puro · Python… | Define el mapa y las rules del stack |
| ¿Cuántas IAs/herramientas? | 1 sola · 2 (dúo) · varias | Define si hay contrato/coordinación |
| ¿Equipo? | Solo yo · con otra IA · con humanos | Define anti-pisotón y confirmación cruzada |
| ¿Qué conservar? | Aprendizaje · decisiones · arquitectura | Define el libro y su criterio |
| ¿Idioma de trabajo? | Español · Inglés | Define AGENTS.md / prompts |

---

## 2) Checklist de bootstrap (orden recomendado)

- [ ] **1. Mapa del proyecto** → `PROJECT_TREE_<IA>.md` (o `docs/PROJECT_TREE.md`):
      tabla de stack + mapa de dominios + árbol de carpetas + notas operativas (ver §3.1).
- [ ] **2. Router de contexto** → `RUTAS-CONTEXTO.json`: tema → archivos; regla "solo la fila, nunca todo" (ver §3.2).
- [ ] **3. Libro de aprendizaje** → `docs/aprendizaje/`: `INDICE.md` (reglas A-D) + temas 01-06 + `SESIONES.md` + `FLUJOS-VISUAL.md` (ver §3.3).
- [ ] **4. Coordinación** → `COORDINACION.md`: pre-vuelo obligatorio, anti-pisotón, tabla de estado, últimas actividades, zonas que no se pisan (ver §3.4).
- [ ] **5. Puntos de entrada** → `AGENTS.md` (y `.cursorrules` si hay Cursor): rol por defecto, confirmación cruzada, índice = router (ver §3.5).
- [ ] **6. Skills** → copiar los portables y adaptar: `profesor-aprendizaje` (siempre útil), `prompt-forge` (si se trabaja prompts), `marketing-diseno` (si hay UI).
- [ ] **7. Eficiencia de tokens** → reglas: resúmenes no transcripciones, contexto por demanda, aviso de reinicio de chat cuando el contexto sea obsoleto.
- [ ] **8. Mapa visual** → `FLUJOS-VISUAL.md` + diagrama `.mmd` renderizable (para ver el sistema de un vistazo y enseñarlo).

---

## 3) Plantillas por pieza

### 3.1) Mapa del proyecto (`PROJECT_TREE_<IA>.md`)

```markdown
# <Proyecto> — Plano de ingeniería (contexto IA)
**Proyecto:** <nombre> · **Dominio:** <qué hace>
## Stack          | Capa | Tecnología | (tabla)
## Excluye        | node_modules/, vendor/, builds…
## Mapa de dominios | tabla dominio → backend → frontend
## Árbol visual   | estructura de carpetas con anotación por archivo
## Notas operativas | convenciones, reglas de oro del repo (el código manda)
_Actualizar tras refactors estructurales._
```

### 3.2) Router (`RUTAS-CONTEXTO.json`)

```json
{
  "version": 1,
  "updated": "<fecha>",
  "note": "Regla: cargar solo la fila del tema, nunca todo.",
  "router": {
    "<tema>": ["<ruta-archivo>", "<ruta-archivo>"],
    "<tema2>": ["<ruta>"]
  }
}
```
**Regla de mantenimiento:** editar el JSON PRIMERO; las vistas humanas (tablas en contrato/master) se regeneran de él.

### 3.3) Libro de aprendizaje (`docs/aprendizaje/INDICE.md` — reglas A-D)

```markdown
A. FILTRO    Guardar solo si: reutilizable + estable + no está ya en el código.
             NO: detalles puntuales de tareas ni decisiones de una sola vez.
             Duda → 1 línea en glosario.
B. UBICACIÓN Un concepto en UN solo tema; si no encaja, crear tema nuevo.
             Glosario = 1 línea + enlace, nunca duplicar.
C. FORMATO   Qué es → Por qué importa → En tu proyecto (ruta verificada) → Para recordar.
             ≤200 palabras; entendible sin el chat original; autores en el log.
D. MANTENER  Matiz → ampliar; dominado → podar a glosario; obsoleto → corregir (el código manda).
```

### 3.4) Coordinación (`COORDINACION.md`)

```markdown
- Pre-vuelo obligatorio (antes de tocar nada): leer este archivo + estado + mapa.
- Anti-pisotón: si la tarea está EN CURSO/HECHO por el otro → no repetir.
- Reclamar fila EN CURSO (quién + qué + cuándo); cerrar HECHO + última actividad.
- Zonas que NO se pisan: <config de la IA> / <protocolos> / código de la app.
```

### 3.5) Punto de entrada (`AGENTS.md`)

```markdown
- Rol por defecto: <cuál hace diseño, cuál hace lógica>.
- Confirmación cruzada: si llega pedido del rol contrario → parar y preguntar.
- Índice rápido = router (tema → archivo). Contexto por demanda, no volcar .md.
- No editar: <archivos protegidos>. Sí editar: <zonas del taller>.
```

---

## 4) Decisiones que solo el dueño del proyecto toma

1. **¿Quién hace qué?** (lógica vs diseño) → define la confirmación cruzada.
2. **¿Una o varias IAs?** → 1 sola: sin contrato/coordinación (solo libro + router). 2+: contrato completo.
3. **¿Libro de aprendizaje?** → recomendado siempre; es la memoria que no se pierde entre chats.
4. **¿Plantilla de prompts puntuales?** → política: puntuales en chat; reutilizables en archivos.

---

## 5) Mantenimiento (reglas que nunca caducan)

| Regla | Dónde aplica |
|---|---|
| El código manda (si doc ≠ código → código) | Todo el ecosistema |
| Router primero; vistas humanas se regeneran de él | RUTAS-CONTEXTO.json |
| Resúmenes, no transcripciones | Eficiencia de tokens |
| "Sí" sin cita no es "sí" (verificar lectura) | Cualquier IA |
| Poda del libro: dominado → glosario | INDICE regla D |

---

> **Cómo se usa esta plantilla:** copia este archivo al proyecto nuevo, responde el diagnóstico (§1), sigue el checklist (§2) y rellena cada pieza con la plantilla (§3). El resultado será el mismo sistema, con la información de ese proyecto.
