# 🗺️ Mapa visual — Ecosistema IA completo del dúo (Cursor ↔ Reasonix/DeepSeek)

> Todo lo que **ve la IA** en `maider_0` y está automatizado: puntos de entrada, rules, skills, contrato, router, scripts y el Libro de Aprendizaje.
> **Pieza central:** `docs/taller-prompts/CONTRATO-IA.md` (contrato único) + `RUTAS-CONTEXTO.json` (router máquina).

---

## 1) Las piezas del ecosistema (inventario)

### Puntos de entrada (se cargan al arrancar cada chat)

| Pieza | Para quién | Qué hace |
|---|---|---|
| `.cursorrules` (raíz) | Cursor | Rol (Arquitecto Laravel/React), mapa por tema, confirmación cruzada §5.1, apunta a contrato + `COORDINACION.md` + `PROJECT_TREE_FOR_GEMINI.md` |
| `AGENTS.md` (raíz) | Reasonix (harness) | Corto: rol diseño/taller, confirmación cruzada, índice rápido = router, no editar `.cursorrules`/`.cursor/*`/`docs/ia/*` (sí `docs/taller-prompts/` y `docs/aprendizaje/`) |
| `MASTER-PROMPT-DEEPSEEK.md` | DeepSeek-web (sin repo) | Se pega al inicio del chat web; núcleo compartido + router §3; el usuario es el "sistema de archivos" |
| `RESUMEN-PARA-GEMINI.md` | Gemini (sin repo) | Resumen compacto (~2K tokens) en vez del árbol de 83KB |

### Rules `.cursor/rules/*.mdc` (se disparan solas por globs o always)

| Rule | Cuándo se dispara | Qué obliga |
|---|---|---|
| `tunnel-share-modes.mdc` | **alwaysApply** + frases "túnel/cloudflare/compartir" | Cambia `.env`, reinicia Vite, controla puertos 5173/8000 |
| `chatbot-s4.mdc` | Al tocar `Chatbot*`, `docs/chatbot/**` | Embudo FAQ→Gemini→humano; invalidar cache tras editar bonos/planes |
| `seo-geo-public.mdc` | Páginas públicas/SEO/Schema.org | Patrón Controller→`PublicPageSeoService`→`SeoMetaDto`→`SeoHead.jsx` |
| `ui-admin-s4.mdc` | UI admin (`components/admin/**`, `Pages/Admin/**`) | Kit slate/cyan, € es-ES, 4 estados obligatorios |
| `taller-reading-layout.mdc` | Páginas Taller | Layout de lectura (zoom 100%, max-w, tipografía) |

### Skills (se invocan por petición o intención)

| Skill | Dónde vive | Cuándo se invoca | Qué hace |
|---|---|---|---|
| `sovereign-architect-protocol` | `.cursor/skills/` (Cursor) | "Nueva funcionalidad / blueprint completo" | Blueprint de 14 piezas + Golden Path transaccional |
| `prompt-forge` | `.cursor/skills/` (Cursor) | "Hazme un prompt", mejorar prompts | 4 fases + rúbrica 8 ejes + protocolo dúo |
| `marketing-diseno` | `.reasonix/skills/` (Reasonix) | UI/UX, rediseños, CRO, copy, SEO | Persona de `AGENTE-MARKETING-DISENO.md`; cierra con prompt para Cursor |
| `profesor-aprendizaje` | `.reasonix/skills/` (Reasonix) | "Qué es X", teoría, "guárdalo" | Libro de Aprendizaje con reglas A-D |

### Contrato, router y pizarrón (los 3 pilares)

| Pieza | Tipo | Para quién | Función |
|---|---|---|---|
| `CONTRATO-IA.md` | Contrato único | Ambos | §1 roles · §2 fuentes de verdad · §3 router · §3.1 Libro · §4 anti-pisotón · §5.1 confirmación cruzada |
| `RUTAS-CONTEXTO.json` | Router máquina | Ambos (script) | Tema → archivos; **cargar solo la fila, nunca todo** |
| `COORDINACION.md` | Pizarrón de estado | Ambos (pre-vuelo) | Estado actual + Última actividad + zonas que no se pisan + flujo de eficiencia |
| `REGISTRO.md` | Log del taller | Ambos | v1 → crítica → v3; qué aportó cada IA; lección |
| `scripts/deepseek-ask.mjs` | Script CLI | Ambos | `--topic <tema>` → lee el router y adjunta los archivos; key en `.env` |
| `docs/aprendizaje/` | Libro de Aprendizaje | Ambos | INDICE (reglas A-D) + temas 01-06 + SESIONES + este mapa |

---

## 2) Flujo de arranque — qué se carga según la petición

```
                    Pregunta del usuario
                            │
                            ▼
              ¿Qué tipo de petición es?
                            │
      ┌──────────┬──────────┼──────────┬─────────────┐
      ▼          ▼          ▼          ▼             ▼
   TEORÍA    ESTADO     DISEÑO/UX   CÓDIGO/       OTROS TEMAS
  "qué es"  tareas      marketing   LÓGICA        (pagos/surf/
      │          │          │          │           chatbot/seo)
      ▼          ▼          ▼          ▼             │
  LIBRO     COORDINA-  /marketing-  (Cursor;     RUTAS-CONTEXTO
  (flujo 3) CION.md    diseno      Reasonix     → solo la fila
      │          │       (skill)    pregunta
      │          │          │       confirmación
      │          │          ▼       §5.1)
      │          │     AGENTE-
      │          │     MARKETING-
      │          │     DISENO.md
      │          ▼
      │    ANTI-PISOTÓN (siempre):
      │    ¿tarea EN CURSO/HECHO
      │    por el otro? → NO repetir
      ▼
   (flujo 3)
```

---

## 3) Flujo de teoría — el Libro de Aprendizaje (skill `/profesor-aprendizaje`)

```
        "¿Qué es X?" / concepto nuevo
                    │
                    ▼
          ¿Es un concepto guardable?
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
       SÍ                      NO
        │                       │
        ▼                       ▼
  ¿Ya está en el libro?    Responder normal
  (buscar en su tema)          │
        │                      └── fin
   ┌────┴────┐
   ▼         ▼
  SÍ        NO
   │         │
   ▼         ▼
 Citar la  ¿Merece guardarse?
 entrada   (filtro A: reutilizable
 (tema+nº) + estable + no en código)
   │              │
   │         ┌────┴────┐
   │         ▼         ▼
   │        SÍ        NO / duda
   │         │         │
   │         ▼         ▼
   │    Escribir   1 línea al
   │    entrada    glosario (06)
   │    (Qué es →
   │     Por qué →
   │     En tu proyecto →
   │     Para recordar)
   │         │
   │         ▼
   │    Actualizar log INDICE
   │    con AUTOR
   │         │
   │         ▼
   │    (fin de sesión)
   │    Anotar SESIONES.md
   │
   └── fin
```

---

## 4) Flujo del aviso de reinicio (ahorro de tokens)

```
      En cada respuesta…
                    │
                    ▼
   ¿Chat largo Y el historial viejo
   ya no aporta a lo actual?
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
       SÍ                      NO
        │                       │
        ▼                       ▼
  Añadir aviso:            Seguir normal
  "🔄 Se recomienda
  reiniciar chat para
  ahorrar tokens"
        │
        ▼
  (ritual) ¿Quieres que
  guarde algo del chat
  antes de reiniciar?
        │
        ▼
  Guardar → reiniciar → reutilizar
```

**Cuenta:** avisar cuesta ~50 tokens; releer el contexto obsoleto cuesta 100k+ por turno.
**NO avisar** si reiniciar haría perder contexto útil a mitad de tarea.

---

## 5) Flujo del dúo — quién hace qué (confirmación cruzada §5.1)

```
      Petición del usuario
                    │
                    ▼
   ┌─────────────────────────────────┐
   │  ¿Es lógica/código/tests/build? │
   └─────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
       SÍ                      NO
        │                       │
        ▼                       ▼
  Reasonix PARA y          ¿Es diseño/UX/
  pregunta:                prompts/marketing?
  "Mi rol es diseño;            │
   la lógica la hace      ┌─────┴─────┐
   Cursor. ¿Seguro?"      ▼           ▼
        │                SÍ          NO
        ▼                 │           │
  (tras "sí" del         ▼           ▼
   dueño: ejecuta)   Reasonix    Ambos pueden
                     lo hace    (libro: ambos
                                con autor)
```

---

## 6) Flujo de skills — quién se invoca y cuándo

```
 ┌─ "Nueva funcionalidad / blueprint" ──► sovereign-architect (Cursor)
 ├─ "Hazme un prompt / mejora este prompt" ──► prompt-forge (Cursor) ──► REGISTRO.md
 ├─ "Diseño / UI / CRO / valora captura" ──► /marketing-diseno (Reasonix)
 │        └──► AGENTE-MARKETING-DISENO.md ──► prompt final para Cursor (PLANTILLA-UX-MODAL)
 ├─ "Qué es X / teoría / guárdalo" ──► /profesor-aprendizaje (Reasonix)
 │        └──► docs/aprendizaje/ (reglas A-D)
 └─ Automático (sin invocar): rules .mdc por globs + alwaysApply (tunnel)
```

---

## 7) Reglas de oro (resumen de un vistazo)

| # | Regla | Dónde |
|---|---|---|
| 1 | Cargar solo lo necesario (contexto por demanda) | CONTRATO §3 |
| 2 | Resúmenes, no transcripciones ni `.md` enteros | 05 §5.6–5.7 |
| 3 | "Sí" sin cita no es "sí" → pedir cita, ruta o aplicación | 05 §5.11 |
| 4 | Si doc ≠ código → gana el código | CONTRATO §2 |
| 5 | Avisar de reinicio si el chat es largo y obsoleto | 05 §5.9 |
| 6 | Antes de guardar en el libro: filtrar (A), ubicar (B), formatear (C), mantener (D) | INDICE A-D |
| 7 | Autor en el log del INDICE para no pisarse | INDICE regla 16 |
| 8 | Anti-pisotón: leer `COORDINACION.md` antes de tocar; NO repetir EN CURSO/HECHO | CONTRATO §4 |
| 9 | Router: editar `RUTAS-CONTEXTO.json` primero; las tablas humanas se regeneran de él | CONTRATO §7 |
| 10 | Globs de Cursor: `tunnel-share-modes` alwaysApply; el resto por archivos tocados | `.cursor/rules/` |

---

> **Por ampliar:** si cambia cualquier pieza (nueva rule/skill/tema), actualizar este mapa — debe reflejar SIEMPRE el ecosistema real.
