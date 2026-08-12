# Contrato dúo IA — Reasonix/DeepSeek ↔ Cursor

Fuente única de compatibilidad entre las dos IAs. **Las tres entradas** (`AGENTS.md`, `.cursorrules`, `MASTER-PROMPT-DEEPSEEK.md`) deben apuntar aquí y no inventar routers distintos.

Última revisión: 2026-08-10.

---

## 1) Quién es quién

| Canal | Modelo / shell | Acceso al repo | Rol por defecto |
|---|---|---|---|
| **Cursor** | Agente en IDE (este chat) | Lectura/escritura directa | Implementar código, tests, builds; respetar arquitectura |
| **Reasonix + DeepSeek** | DeepSeek dentro de Reasonix (harness local) | Lectura/escritura directa (igual que Cursor) | Taller: prompts, UX/crítica, planes; **código de app solo si el usuario lo pide** |
| **DeepSeek-web** (opcional) | Chat en web sin harness | Ninguno | Solo con `MASTER-PROMPT-DEEPSEEK.md` + archivos que el usuario pegue |

Reasonix/DeepSeek y Cursor **comparten el mismo repo y las mismas reglas**. No son mundos paralelos: si uno reclama una tarea en `COORDINACION.md`, el otro no la reescribe.

---

## 2) Fuentes de verdad (mismo orden en ambos)

1. Código real del repositorio.
2. `docs/PROJECT_TREE_FOR_GEMINI.md` (mapa; no inventar rutas).
3. Este contrato + `docs/taller-prompts/COORDINACION.md` (estado compartido).
4. Núcleo de arquitectura: `.cursorrules` (Cursor) ≡ núcleo de `MASTER-PROMPT-DEEPSEEK.md` (DeepSeek-web) ≡ resumen en `AGENTS.md` (Reasonix).
5. Docs de dominio a demanda (router de la §3).

Si doc ≠ código → gana el código. Si las dos IAs contradicen → gana lo verificable en repo + `COORDINACION`.

---

## 3) Router único (cargar solo lo del tema)

> **Fuente máquina:** `docs/taller-prompts/RUTAS-CONTEXTO.json` (leído por `scripts/deepseek-ask.mjs --topic`). La tabla siguiente es la vista humana; al cambiar el router, editar **el JSON primero** y luego esta tabla. Temas completos y aliases (incl. `ticket`, `diseno/ui/ux`, `estado`): ver el JSON. Temas `mapa` y `feature` son **solo Cursor** (extracto del árbol / skill sovereign — no adjuntan archivos al script).

| # | Tema | Archivo(s) |
|---|---|---|
| 0 | Estado / no pisarse | `docs/taller-prompts/COORDINACION.md` + `HANDOFF.md` (si continuidad) (+ `REGISTRO.md` si es taller de prompts) |
| 1 | UI-UX / CRO / copy / marketing | `docs/taller-prompts/AGENTE-MARKETING-DISENO.md` (Reasonix: `/marketing-diseno`) |
| 2 | Crear/mejorar prompts | `docs/taller-prompts/PROTOCOLO.md` + skill `prompt-forge` (Cursor) |
| 3 | Rediseño modal/pantalla admin | `docs/taller-prompts/PLANTILLA-UX-MODAL.md` (UI-only; sin lógica ni payload keys) |
| 4 | Feature de negocio nueva | skill `sovereign-architect-protocol` (Cursor) + extracto del mapa |
| 5 | Pagos / Stripe / datáfono / TicketBAI | `docs/payments/**` + `docs/invoicing/B2BROUTER-TICKETBAI.md` |
| 6 | Surf / previsiones | `docs/surf-conditions/**` |
| 7 | Chatbot | `docs/chatbot/**` + `.cursor/rules/chatbot-s4.mdc` |
| 8 | SEO / competencia | `docs/COMPETENCIA_SEO_DONOSTIA.md` + `docs/taller-seo/**` + `.cursor/rules/seo-geo-public.mdc` |
| 9 | Rutas / dominios | extracto de `docs/PROJECT_TREE_FOR_GEMINI.md` (sección afectada, no el doc entero) |
| 10 | Ticket mostrador (datáfono) | `node scripts/deepseek-ask.mjs --topic ticket` (modal + backend datáfono) · Cursor: `MostradorTicketModal.jsx` + `DatafonoPayment*` |
| 11 | Teoría / profesor / cuaderno | `docs/aprendizaje/` (`INDICE.md` + temas 01–06). Reasonix: `/profesor-aprendizaje`. Ambos canales pueden **leer y guardar**. |

**Regla de tokens:** nunca volcar todos los `.md`. Solo el/los de la fila del tema.

### 3.1) Libro de Aprendizaje (cuaderno compartido)

- **Dónde:** `docs/aprendizaje/` (entrada: `INDICE.md`).
- **Quién:** Cursor **y** Reasonix/DeepSeek (mismo cuaderno; no es “solo DeepSeek”).
- **Cuándo guardar:** el usuario pregunta teoría/conceptos/flujos y la respuesta merece quedar; o pide explícitamente “guárdalo / anótalo”.
- **Cómo:** seguir las reglas de alimentación del `INDICE.md` (no duplicar; estructura Qué es / Por qué / En tu proyecto / Para recordar; actualizar log del índice).
- **Flujo de eficiencia de tokens (2026-08-11, ambas IAs):** resúmenes (nunca transcripciones); aviso de reinicio; ritual **«fin de chat» → sobrescribir `docs/taller-prompts/HANDOFF.md`**; en chat nuevo, puente solo si el usuario sigue el handoff o el tema encaja (máx. ~5 viñetas; sin matching por hora ni Q&A). Detalle: `COORDINACION.md` §Flujo de eficiencia.
- Preguntar teoría **no** dispara la confirmación cruzada §5.1 (no es implementación ni rediseño UI).

---

## 4) Protocolo anti-pisotón (obligatorio)

1. Antes de proponer o editar: leer `COORDINACION.md` (Estado actual + Última actividad).
2. Si la tarea está `EN CURSO` o `HECHO` por la otra IA → no repetir; preguntar o extender.
3. Antes de empezar trabajo que toque archivos: reclamar fila `EN CURSO` (Quién = `Cursor` o `Reasonix`).
4. Al terminar: `HECHO` + 1–2 líneas en Última actividad; si hay archivos nuevos/renombrados → actualizar solo la sección del mapa.
5. Reasonix **no** edita `.cursorrules` / `.cursor/*` / `docs/ia/*` sin petición explícita. Cursor sí puede si el usuario lo pide (p. ej. este contrato).

---

## 5) División de trabajo recomendada

| Tipo de petición | Preferir | Entrega |
|---|---|---|
| Implementar / bugfix / tests / build | **Cursor** | Diff + verificación |
| Prompt listo, crítica UX, alternativas, rúbrica | **Reasonix/DeepSeek** | Prompt o informe; si hay que codear → handoff a Cursor |
| Rediseño UI modal | Reasonix diseña con plantilla → Cursor ejecuta UI-only | Prompt + PR/diff |
| Dúo de calidad | Reasonix critica → Cursor consolida/verifica en código | v3 verificable |
| Teoría / conceptos / “guárdalo en el libro” | **Cualquiera de los dos** | Entrada en `docs/aprendizaje/` según `INDICE.md` |

Ante empate de propuestas: gana la más **verificable en el repo**; si empatan, la más corta.

### 5.1) Confirmación cruzada (obligatoria al cruzar roles)

Por defecto: **DeepSeek = diseño / taller**; **Cursor = lógica / implementación**.

| Canal | Si el usuario pide… | Respuesta obligatoria (parar y preguntar) |
|---|---|---|
| **Reasonix / DeepSeek** | implementar código, lógica de negocio, tests, builds, migraciones | *«Mi rol por defecto es diseño/UX/prompts; la lógica la hace Cursor. ¿Seguro que lo implemento yo aquí?»* — solo continuar con un **sí explícito**. |
| **Cursor** | solo diseño/UX/auditoría visual/redactar prompt (sin pedir implementar) | *«Mi rol por defecto es lógica/implementación; el diseño suele ir a DeepSeek (Reasonix). ¿Seguro que lo hago yo aquí?»* — solo continuar con un **sí explícito**. |

No hace falta confirmar si la petición ya encaja en el rol por defecto del canal.

---

## 6) Cómo arrancar cada canal

- **Cursor:** ya carga `.cursorrules` → leer este contrato cuando haya dúo o duda de rol.
- **Reasonix:** ya carga `AGENTS.md` → mismo contrato; DeepSeek con harness = acceso directo a archivos (no pedir “pega X” salvo que falte permiso). Para consultar a DeepSeek con contexto automático: `node scripts/deepseek-ask.mjs --topic <tema>` (lee el JSON del router).
- **DeepSeek-web:** pegar `MASTER-PROMPT-DEEPSEEK.md` al inicio; si pide contexto, pegar el archivo del router §3.

---

## 7) Mantenimiento

**Router:** editar `docs/taller-prompts/RUTAS-CONTEXTO.json` (fuente máquina) **primero**; las tablas de CONTRATO §3 y MASTER §3 son **vista humana** (actualizarlas o regenerarlas después). **Roles:** actualizar este contrato y espejar solo **enlaces** en `AGENTS.md` y `.cursorrules` — nunca tablas duplicadas. No dejar tres versiones de lo mismo.
