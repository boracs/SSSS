# Taller de Prompts — maider_0 (DeepSeek ↔ Cursor)

Sesión exclusiva de la que salen prompts listos para usar, mejorados y fusionados entre **DeepSeek (Reasonix)** y **Cursor**, con aprendizaje mutuo: cada iteración deja registrado qué aportó cada herramienta.

**Compatibilidad:** `docs/taller-prompts/CONTRATO-IA.md` (roles, router único, anti-pisotón). Ambas IAs lo respetan.

## Metodología adoptada

Esta sesión aplica la metodología de `.cursor/skills/prompt-forge/SKILL.md` (y sus plantillas en `TEMPLATES.md`):

- **4 fases**: capturar intención → draft v1 → auditoría con rúbrica → entrega.
- **Anatomía de 10 bloques**: ROL, OBJETIVO, CONTEXTO, ENTRADAS, TAREAS, RESTRICCIONES, FORMATO, ACEPTACIÓN, AUTONOMÍA, VERIFICACIÓN.
- **Rúbrica de 8 ejes** (objetivo, contexto, verificabilidad, formato, restricciones, anti-alucinación, densidad, autonomía): cualquier eje < 4 obliga a reescribir.
- **Reglas de redacción**: imperativo, nombres reales, números en vez de adjetivos, delimitadores `<<<...>>>`, cláusula anti-invención, sin cortesía, en español.
- **Protocolo dúo con DeepSeek** (2 rondas): ronda 1 = bloque de crítica copiable; ronda 2 = consolidación clasificando cada sugerencia como acepto / rechazo / adapto. Ante empate, gana la versión más verificable; en segundo lugar, la más corta.

## Fuentes de verdad (orden de prioridad)

1. Código del repositorio.
2. `docs/PROJECT_TREE_FOR_GEMINI.md` (mapa de rutas y dominios; leerlo antes de proponer rutas).
3. `docs/taller-prompts/CONTRATO-IA.md` + `COORDINACION.md` (dúo Reasonix/DeepSeek ↔ Cursor).
4. `.cursorrules` + `.cursor/rules/*` (chatbot-s4, seo-geo-public, tunnel-share-modes, taller-reading-layout) · en Reasonix: `AGENTS.md`.
5. `docs/ia/01-cto-protocol.md` (V5) y `docs/ia/02-master-prompt-v3-ultra.md`.
6. Este `PROTOCOLO.md` + `REGISTRO.md`.

Si un documento y el código se contradicen, prevalece el código.

## Roles por herramienta destino

| Herramienta | Naturaleza | Consecuencia para el prompt |
|---|---|---|
| **Cursor** | Agente IDE con repo | Lee/escribe código; rutas reales; arquitectura (DTOs, Services, Actions, transacciones, dinero int). Implementación por defecto. |
| **Reasonix + DeepSeek** | DeepSeek con harness local | Misma repo que Cursor; taller/UX/prompts por defecto; código solo si el usuario lo pide. Coordina vía `COORDINACION.md`. |
| **DeepSeek-web** | Chat sin repo | Prompt autocontenido + pegar archivos del router (`MASTER-PROMPT-DEEPSEEK.md`). Crítica y alternativas. |

## Flujo de trabajo estándar

**Paso 0 (obligatorio, los dos lados):** antes de que esta sesión o Cursor responda o toque archivos, consultar `docs/taller-prompts/COORDINACION.md` (estado actual + última actividad) y analizar los archivos implicados. No repetir, solapar ni pisar trabajo ya hecho.

1. El usuario trae una de estas entradas:
   - un **prompt** a mejorar (suyo o de cualquiera de las dos herramientas);
   - una **tarea** a convertir en prompt (generar desde cero);
   - **outputs de ambos** a fusionar (versión final con lo mejor de cada uno).
2. Capturar intención (ficha de la Fase 1; preguntar solo si falta algo crítico).
3. Redactar draft v1 con la anatomía de 10 bloques.
4. Auditar con la rúbrica; reescribir lo que no llegue a 4.
5. Entregar: **prompt final en bloque de código** + supuestos + "qué pegar tú" si aplica.
6. Si el prompt es para DeepSeek, se puede ofrecer el protocolo dúo: el usuario lo lleva a DeepSeek y trae la crítica; aquí se consolida la v3.
7. Registrar la iteración en `REGISTRO.md` (lección aprendida: qué aportó cada herramienta).

## Qué NO hace esta sesión

- No edita código de la aplicación.
- No modifica `.cursorrules`, los skills de `.cursor/` ni los protocolos de `docs/ia/` sin que el usuario lo pida.
- No inventa rutas, archivos ni dominios que no estén en `docs/PROJECT_TREE_FOR_GEMINI.md`.

## Contexto mínimo para prompts de este repo (bloque CONTEXTO)

- Stack: Laravel 12 (PHP 8.2+), React 19 + Inertia.js 2, MySQL (XAMPP local), TailwindCSS 3, Vite 6, Pest 3.
- "Lee `docs/PROJECT_TREE_FOR_GEMINI.md` antes de proponer rutas; no inventes directorios."
- Arquitectura: DTOs readonly, Service Layer, Actions, eventos + listeners encolados, `DB::transaction()` y `lockForUpdate()` en reservas/inventario/saldos, dinero en céntimos (`int`), `declare(strict_types=1)`.
- Aplicar la skill/regla correspondiente al área que toque el prompt (ver fuentes de verdad).

## Registro

Cada iteración se apunta en `REGISTRO.md`: fecha, objetivo, herramienta destino, versión v1 → crítica → v3 consolidada, y la lección (qué aportó cada herramienta). El registro es la memoria del aprendizaje mutuo.
