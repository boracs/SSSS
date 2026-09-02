# Prompt de verificación — Auditoría Backend Fase 2 (maider_0 / S4)

> Prompt profesional único para las **4 IAs**: Cursor (tiene el repo en local), Grok, Claude Opus y DeepSeek-web.
> **Con repo (Cursor / Reasonix):** abre los `archivo:línea` y verifica contra el código real.
> **Sin repo (Grok / Opus / DeepSeek-web):** trabaja sobre el informe pegado abajo + pide los fragmentos de código que necesites (mejor 1–2 archivos por hallazgo que suposiciones). No des nada por bueno sin ver el código.
> Informe fuente: `docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md`

---

```
ROL
Eres un consultor senior de backend Laravel 12 especializado en auditoría de verificación independiente.
No implementas nada: tu único trabajo es CONFIRMAR, MATIZAR o DESCARTAR cada hallazgo del informe contra el
código real, con cita verificada, y devolver un plan de implementación priorizado.

CONTEXTO DEL PROYECTO
- App: San Sebastian Surf School (S4), escuela de surf en Donostia.
- Stack: Laravel 12 · PHP 8.2 · MySQL/MariaDB · React 19 + Inertia 2 · Stripe + webhooks · datáfono/TPV ·
  TicketBAI (B2BRouter) · colas (worker --tries=1) · Sanctum · Policies · Pest 3 (~336 tests).
- Convenciones duras del proyecto: dinero SIEMPRE en céntimos int · escrituras multi-aggregate con
  DB::transaction() + lockForUpdate() · DTOs readonly · jobs fuera del ciclo HTTP · payloads públicos sin
  campos internos (purchase_price, margen, códigos de taquilla, tokens, IDs de admin) · Zona horaria de
  negocio Europe/Madrid (cast BusinessWallClockDatetime).
- Fuentes de verdad: docs/PROJECT_TREE_FOR_GEMINI.md (mapa; no inventes rutas) · .cursor/rules/seo-geo-public.mdc.

MÉTODO OBLIGATORIO (pre-vuelo por hallazgo)
1. Abre cada archivo:línea citado en el informe. Si la línea ha cambiado, localiza el símbolo equivalente
   y cita la línea ACTUAL (nunca asumas que la vieja sigue valiendo).
2. REPRODUCE donde sea posible: calcula unidades cobradas vs refundadas (A1), sigue el ciclo de vida del
   PagoCuota y la sesión Stripe (T3), compara cast de fechas y APP_TIMEZONE (P1), cuenta queries por
   clase del Commander (R1), lee el guard del chatbot y el payload history (C1).
3. Contrasta con los tests existentes del área (tests/Feature/*): ¿hay un test que YA fije ese
   comportamiento? ¿El fix propuesto lo rompería?
4. Solo entonces emite veredicto.

ESCALA DE VEREDICTO
- CONFIRMADO: el bug/riesgo existe tal cual, con cita actualizada.
- MATIZ: existe pero con causa/alcance distinto al del informe — explica la diferencia con precisión.
- DESCARTADO: no reproducible / ya corregido / no aplica — explica por qué con evidencia.
Además, para cada CONFIRMADO/MATIZ, asigna Sev (P0/P1/P2) con tu criterio y Esfuerzo (S<1h / M<1d / L>1d).

HALLAZGOS A VERIFICAR (13 P1 del informe)
A1 refund academia: CreditEngineService::resolveRefundUnits() (2 uds) vs cobro EnrollStudentAction/ApproveEnrollmentQuotaAction (1 ud cuando la clase ya tenía ocupante).
A2 VipClassManagerController::destroy borra lesson+enrollments sin devolver créditos.
A3 RequestPrivateLessonAction sin lock → 2 lessons particulares solapadas bajo concurrencia.
T1 users.numeroTaquilla sin índice UNIQUE → doble ocupación (TOCTOU) + flujo legacy AsignarTaquilla fuera del servicio.
T2 caché users.fecha_vencimiento_cuota ignora pagos futuros confirmados → socio pagado aparece en mora.
T3 purge de PagoCuota a los 30 min vs sesión Stripe 24 h → cobro sin cuota y fallo permanente del webhook.
P1 PhotoSessionBooking.expires_at cast 'datetime' (UTC en prod) vs BusinessWallClockDatetime → caducidad desplazada 1-2 h solo en producción.
P2 carrera: cron cancela reserva de fotos antes del webhook checkout.session.completed → reintento 503 infinito sin ALERT_PERMANENT_FAILURE.
S1 ProductoController::ver sin filtrar eliminado=1 → soft-404 indexable (200).
S2 cero tests de robots/sitemap/noindex/no-fuga R5 en tests/.
C1 ChatbotPromptGuard solo analiza message, no el history enviado a Gemini → bypass prompt-injection.
C2 precios particulares hardcodeados en ChatbotService estático vs tarifa viva BD → dos fuentes de verdad.
R1 ClassManagerController::mapLesson llama AvailabilityService::preview() por clase → ~250-450 queries/request.
Además verifica los P2 con implicación de seguridad/datos: A4 (gate VIP), A7 (checkout sin idempotencia), T5 (llave emergencia sin throttle), S3/S4/S5 (cache sitemap, noindex comparador, reserved en sitemap), C4 (API key en query string), C7 (nombre de usuario en system prompt), R6 (Cache::remember con escrituras en constructor), R8 (índices faltantes).

ENTREGABLES (responde en español)
1. TABLA DE VEREDICTOS: | ID | Veredicto (CONFIRMADO/MATIZ/DESCARTADO) | Sev (tuya) | Dónde (archivo:línea actual) | Comentario 1-2 líneas | Esfuerzo |
2. HALLAZGOS ADICIONALES: solo P0/P1 que veas en esos dominios y NO estén en el informe (con cita). Si no hay, dilo explícitamente. No rellenes por rellenar.
3. PLAN DE IMPLEMENTACIÓN por lotes (para Cursor): para cada lote, lista de archivos a tocar y tests que cubrirían el fix (existentes o nuevos). Orden sugerido: L1 dinero (A1+A2+T3+T2) → L2 concurrencia/caducidad (A3+P1+P2+T1) → L3 seguridad/info (C1+C2+S1) → L4 P2 priorizados (R1→S2→A4→R3). Si crees que el orden debe cambiar, argumenta.
4. RIESGOS DE ROMPER: qué tests existentes fijan el comportamiento actual (p.ej. TaquillaPendingCheckoutExpirationTest fija los 30 min que T3 propone cambiar) y qué migraciones/datos habría que sanear antes (p.ej. duplicados de numeroTaquilla).
5. DECISIÓN EJECUTIVA: 3 líneas — qué implementar primero, qué NO hacer, qué necesita decisión del dueño.

REGLAS ANTI-ALUCINACIÓN
- Toda afirmación lleva archivo:línea REAL. Si no puedes abrir el código (Grok/Opus/DeepSeek-web), PIDE los fragmentos exactos antes de veredictar; un "CONFIRMADO" sin ver el código no vale.
- No repitas el informe: tu valor es la discrepancia y la confirmación con evidencia.
- Dinero/seguridad: cualquier cosa que toque cobros, saldos o fuga de datos se verifica con el doble de rigor.
```

---

## Notas de uso

- **Cursor**: pega este prompt en chat nuevo + dile «el informe está en `docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md`». Modelo recomendado: Claude Opus.
- **Grok / Opus / DeepSeek-web**: pega el prompt + **pega el informe completo** debajo. Si piden código, dales los archivos que indiquen (o pega el tramo).
- **Reasonix (yo)**: mismo prompt, con repo local — verificación independiente ya en curso.
- Resultado esperado por IA: la tabla de veredictos es el contrato; cruzamos las 4 tablas y las discrepancias se resuelven en el código, no por votación.
