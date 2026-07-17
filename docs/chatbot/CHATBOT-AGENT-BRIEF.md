# Briefing — Agente dedicado al Chatbot S4

**Uso:** abre un **chat nuevo** en Cursor (modo **Agent**), pega el bloque de abajo como primer mensaje, o escribe: *"Lee `docs/chatbot/CHATBOT-AGENT-BRIEF.md` y ejecuta la Fase 1."*

---

## ⚠️ Datos de negocio — NO OFICIALES (entorno de prueba)

**Confirmado por el desarrollador:** todo lo que hay hoy en **BD** (`pack_bonos`, `planes_taquilla`, clases demo), **seeders**, **config por defecto** y **textos** del informe **no es tarifa oficial**. Es **dato de prueba** hasta que el cliente (escuela) confirme.

| Implicación para el agente | Qué hacer |
|----------------------------|-----------|
| Implementar Fase 1 | ✅ Leer precios **desde BD** (arquitectura correcta) |
| Tratar 170/240/380 € como verdad de producción | ❌ No — son valores demo de seeders |
| Inventar precios “mejores” o corregir sin cliente | ❌ No |
| Marcar en docs/checklist lo pendiente de confirmar | ✅ Sí |

Cuando el cliente confirme, se actualizan **panel admin / BD / `.env`** — el chatbot heredará los valores sin hardcodear en código.

---

## Prompt de arranque (copiar al nuevo chat)

```
Modo: Agent. Área: chatbot S4 únicamente.

Contexto obligatorio (léelos antes de tocar código):
- `.cursor/rules/chatbot-s4.mdc`
- `docs/faq-architecture.md`
- `docs/chatbot/informe-logica-negocio-s4.md`

Arquitectura YA implementada — NO refactorizar ChatbotAgentService ni sustituir FAQ por hardcode:
ChatbotPromptGuard → ChatbotService (regex) → [fallback] GoogleAIService + S4BusinessContextService → escalación requires_human.

Objetivo de esta sesión: mejorar el chatbot en iteraciones pequeñas (diff mínimo, reutilizar servicios).

IMPORTANTE — Datos de negocio: BD, seeders y textos del informe son DEMO/PRUEBA; nada es oficial hasta confirmación del cliente. Implementa lectura desde BD (no hardcode), pero no asumas que los números actuales son producción ni los “corrijas” por tu cuenta.

Fase 1 (implementar en este orden):
1. Patrón FAQ email → info@sansebastiansurfschool.com (idealmente constante en config o AcademyContact).
2. Patrón FAQ precios bonos → leer PackBono activos (misma fuente que S4BusinessContextService, sin duplicar query en bucle).
3. Opcional si cabe: patrón FAQ precios taquillas desde PlanTaquilla activos.
4. Enganchar S4BusinessContextService::forget() al guardar pack/plan en admin (si hay controller claro).

Fase 2 (solo si el usuario confirma datos de negocio):
- Completar checklist del informe (precios reales, WhatsApp en .env, políticas).
- Ampliar S4BusinessContextService si falta texto (horarios, email en system prompt).

Fase 3 (testing):
- Probar: saludo, email, precios bonos, ubicación, pregunta absurda ×2 → requires_human + caso S4-XXXXXX.
- Verificar GEMINI_API_KEY en .env para Nivel 2.

Restricciones:
- declare(strict_types=1), DTOs readonly, sin lógica en Controller/JSX.
- Precios bonos/taquillas NUNCA hardcodeados en AgentService.
- Actualizar solo la sección chatbot de PROJECT_TREE_FOR_GEMINI.md si creas archivos.

Empieza por Fase 1.1 y dime qué vas a cambiar antes de editar muchos archivos.
```

---

## Estado actual (resumen técnico)

| Pieza | Archivo | Estado |
|-------|---------|--------|
| Orquestador | `app/Services/Chatbot/ChatbotAgentService.php` | ✅ FAQ → Gemini → escalación |
| FAQ local | `app/Services/Chatbot/ChatbotService.php` | ✅ email, precios clases/bonos/taquillas, logística |
| Contexto Gemini | `app/Services/Chatbot/S4BusinessContextService.php` | ✅ BD live + config; caché 5 min; `forget()` |
| Gemini HTTP | `app/Services/Chatbot/GoogleAIService.php` | ✅ |
| Guard | `app/Services/Chatbot/ChatbotPromptGuard.php` | ✅ |
| API | `app/Http/Controllers/ChatbotController.php` | ✅ |
| UI | `resources/js/components/Chatbot.jsx` | ✅ WhatsApp + case_reference |
| Admin | `resources/js/Pages/Admin/Chatbot/Index.jsx` | ✅ |
| Docs negocio | `docs/chatbot/informe-logica-negocio-s4.md` | ⚠️ Precios demo sin confirmar |

## Backlog priorizado

### Código — Fase 1 (HECHA)
- [x] FAQ email → `AcademyContact::contactEmail()` / `config('services.academy.contact_email')`
- [x] FAQ precios bonos/clases → `S4BusinessContextService::surfPricingFaqText()` (BD + tarifario)
- [x] FAQ precios taquillas → `lockerPlanPricesFaqText()` (BD live)
- [x] `forget()` en admin bonos (`BonoController`) y planes taquilla (`TaquillaMembershipService`)
- [x] Email centralizado en `config/services.php` → `academy.contact_email`

### Negocio (pendiente confirmación con el cliente — NO bloquea pruebas)
- [ ] Precios oficiales `pack_bonos` y `planes_taquilla` (hoy: demo en seeders)
- [ ] Políticas reales (señal 30 €, cancelación 4 h, etc.) — hoy: defaults de `config/services.php`
- [ ] `ACADEMY_WHATSAPP_NUMBER` y email de contacto reales en `.env` / marketing
- [ ] `GEMINI_API_KEY` en `.env` (infra dev, no dato del cliente)
- [ ] Horario club/taquillas (existe default en config; confirmar con cliente)

### Explícitamente fuera de alcance
- ❌ Refactor embudo 3 niveles (ya hecho)
- ❌ Firestore / memoria LTP
- ❌ Hardcodear 170/240/380 € en FAQ

## Archivos clave (globs de la rule)

```
app/Services/Chatbot/**
app/Actions/Chatbot/ProcessChatbotQueryAction.php
resources/js/components/Chatbot.jsx
resources/js/lib/chatbotApi.js
docs/chatbot/**
```

## Pruebas manuales

| Pregunta | Esperado |
|----------|----------|
| Hola | Saludo Maider, FAQ local |
| ¿Cuál es vuestro email? | info@sansebastiansurfschool.com (tras Fase 1) |
| ¿Cuánto cuestan los bonos? | Lista desde BD (tras Fase 1) |
| ¿Dónde estáis? | Zurriola (FAQ existente) |
| ¿Vuelo a Madrid? | Incertidumbre → 2.º → requires_human |

## Cola / infra local

- `php artisan migrate` (tabla `chatbot_interactions`)
- `php artisan queue:work` para `PersistChatbotHistoryJob` (usuarios logueados)
- `php artisan serve` + `npm run dev` para probar UI
