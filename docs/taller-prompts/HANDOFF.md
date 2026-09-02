# Handoff de chat (sobrescribir)

> **Un solo archivo.** Al oír «fin de chat» / «cierro chat» / «guardar y reiniciar», la IA **sobrescribe** este documento (no acumula historial).
> En chat nuevo: si el usuario dice «sigo con el handoff» / «sigo con el chat que acabo de cerrar» / tema claramente relacionado → leer esto + `COORDINACION.md` Última actividad y abrir con puente corto.
> Si el tema es otro → ignorar este archivo (salvo pre-vuelo normal de COORDINACION).

## Meta

| Campo | Valor |
|---|---|
| Cerrado | 2026-08-27 (Reasonix / DeepSeek) |
| Canal | Reasonix → chat nuevo (el dueño abrirá con «sigo con la Fase 2» / «sigo con el handoff») |
| Tema | **Auditoría backend FASE 1 (dinero/consistencia): CERRADA AL 100%.** F1–F8 + B1–B5 implementados y verificados. Siguiente: FASE 2 (nueva auditoría, mismo método). |

## Hecho en este chat (Fase 1 completa)

1. **Auditoría Fase 1** (2026-08-26, Reasonix): 6 dominios en paralelo → 0 P0 · 11 P1 · ~25 P2. Informe: `docs/taller-prompts/AUDITORIA-BACKEND-FASE1-DINERO-2026-08-26.md`.
2. **Verificación Opus+Grok**: 0 DESCARTADO, 8 CONFIRMADO + 5 MATIZ. Correcciones aceptadas: F1/F2 causa raíz distinta; F8 = 2 rutas de cargo; B5 → P2; nuevo R5 (`Auction::toPublicArray` expone winner/payment_status).
3. **Implementación por Cursor (lotes), cada uno verificado por Reasonix con suite completa:**
   - F1+F2 doble cargo → invariante «1 sesión Stripe viva por payable» (`FindsOpenCheckout` + `payment_webhook_idempotency`).
   - F3 TOCTOU inscripción → columna generada `active_enrollment_key` + UNIQUE + **bug julio encontrado**: `lesson_user.user_id` seguía NOT NULL (guest muerto); FK → SET NULL.
   - F4 catálogo datáfono → `precio_cents` con `StoreProductPricing` + `precio_base_cents`/tachado en modal (bug activo hoy resuelto).
   - F5+B2+B3 webhook → 503 transitorio / 200+`Log::critical` permanente (marca `ALERT_PERMANENT_FAILURE`, **pendiente dueño: canal de alerta real**); `payments:sync` + `academy:cleanup` al scheduler; API admin.
   - F6+F7 TicketBAI → `Idempotency-Key` sha256(`s4-tbai:<session>`); cash walk-in usa `buildContactForUser` + **email obligatorio en mostrador si INVOICING_ENABLED** (decisión dueño).
   - F8 FIFO bonos → `BonoService::lockFifoBono()` compartido por las 2 rutas de cargo.
   - B1+B4+B5 → `payment_deadline_at` + `auctions:expire-unpaid` (5 min); `/api/taquilla` eliminada (Ziggy); `AuthController` muerto borrado.
4. **Suite: 277 → 336 tests verdes** (1280 assertions). Migraciones aplicadas en BD local.

## Siguiente (chat nuevo)

1. **FASE 2 — auditoría Reasonix** (mismo método AGENTE-BACKEND-SENIOR, 6 dominios en paralelo): academia/taquillas restantes, fotos, SEO backend, chatbot, rendimiento (N+1/índices). Luego verificación Cursor → implementación por lotes.
2. **Pendientes del dueño en producción** (anotados en `TAREAS-PENDIENTES.md`): `php artisan migrate` + cron `schedule:run` activo; canal de alerta `ALERT_PERMANENT_FAILURE` (email con Mailables existentes vs panel); comprobación manual F4 (ticket mostrador con producto rebajado); SMTP real (`MAIL_MAILER=log` hoy).

## Lecciones / contexto útil

- Método que funcionó todo el día: Reasonix audita → Opus+Grok verifican → Cursor implementa por lotes → Reasonix verifica (suite + build) → COORDINACION.
- Cuidado con **cruce de chats**: un prompt de lote nuevo va SOLO en chat nuevo; pegar respuestas anteriores como contexto confunde a Cursor (pasó con el raíl webcams).
- `AGENTE-BACKEND-SENIOR.md` mejorado (B1–B7) al inicio: R4 idempotencia, R8 autorización, escalas Sev/Esfuerzo/KPI.

## Archivos clave

- `docs/taller-prompts/AUDITORIA-BACKEND-FASE1-DINERO-2026-08-26.md` — informe maestro Fase 1 (verificado §5)
- `docs/taller-prompts/COORDINACION.md` — filas HECHO + Última actividad de cada lote
- `docs/taller-prompts/AGENTE-BACKEND-SENIOR.md` — persona del agente (para Fase 2)
- `docs/TAREAS-PENDIENTES.md` — 3 tareas URGENTES post-Fase 1 + backlog marketing/diseño
