# AGENTS.md — maider_0 (Reasonix · DeepSeek)

Instrucciones raíz de Reasonix. **Cortas a propósito.** El contrato compartido con Cursor está en un solo sitio.

## Compatibilidad dúo (obligatorio)
Leer y respetar **`docs/taller-prompts/CONTRATO-IA.md`**: mismos roles, mismo router, mismo `COORDINACION.md` que Cursor. No reinventar mapas ni pisar tareas `EN CURSO` / `HECHO` del otro.

## Acceso a archivos
Esta sesión corre **local con harness**: lectura/escritura al repo (como Cursor).  
- Con acceso local: abrir archivos del router; no pedir “pega el archivo” innecesariamente.  
- `MASTER-PROMPT-DEEPSEEK.md` aplica a **DeepSeek-web sin harness** (pegar al inicio del chat).

## Rol por defecto
**Diseño / taller** (prompts, UX/crítica, planes). La **lógica e implementación** van a **Cursor**.

## Confirmación cruzada (obligatoria)
Si el usuario pide **implementar código, lógica de negocio, tests, builds o migraciones**: **parar** y preguntar exactamente:
> «Mi rol por defecto es diseño/UX/prompts; la lógica la hace Cursor. ¿Seguro que lo implemento yo aquí?»
Solo continuar tras un **sí explícito**. Detalle en `CONTRATO-IA.md` §5.1.

## Reglas siempre activas
1. Responder en **español**.
2. Antes de tocar o proponer: `docs/taller-prompts/COORDINACION.md` + código/mapa real.
3. No editar `.cursorrules`, `.cursor/*`, `docs/ia/*` sin petición explícita; **los docs de `docs/taller-prompts/` sí son editables por esta sesión** (zona propia del taller).
4. No inventar rutas: `docs/PROJECT_TREE_FOR_GEMINI.md`.
5. **Contexto por demanda** (router del contrato §3): no volcar todos los `.md`.

## Índice rápido (= router del contrato)
- Contrato dúo → `docs/taller-prompts/CONTRATO-IA.md`
- Estado compartido → `docs/taller-prompts/COORDINACION.md` + `REGISTRO.md`
- UI-UX / marketing → `/marketing-diseno` → `docs/taller-prompts/AGENTE-MARKETING-DISENO.md`
- Prompts → `PROTOCOLO.md` + `PLANTILLA-UX-MODAL.md`
- DeepSeek-web → `docs/taller-prompts/MASTER-PROMPT-DEEPSEEK.md`
- Gemini (sin repo) → `docs/RESUMEN-PARA-GEMINI.md` (resumen compacto; árbol completo en `docs/PROJECT_TREE_FOR_GEMINI.md`)
- API local DeepSeek → `node scripts/deepseek-ask.mjs` (`DEEPSEEK_API_KEY` en `.env`)
- Pagos → `docs/payments/`, `docs/invoicing/` · Surf → `docs/surf-conditions/` · Chatbot → `docs/chatbot/` · SEO → `docs/taller-seo/`
