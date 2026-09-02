# L5 — rendimiento/deuda (FASE 2, último lote) · prompt para Cursor (v1 — redactado por Reasonix)

> Estado: luz verde del dueño (2026-08-31). L0–L4 cerrados y verificados. Suite de partida: **405 tests**.
> Informe: `docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md` §8/§9 (N7, R1, R6, R8a, S2, S3, S4, T5, C2).
> Alcance fuera: SMTP/alerta, P3 overbooking fotos, S5 (reserved sitemap, P3 doc), R8b (P3), S6 (`/academia`, decisión dueño).

---

```
FASE 2 — L5: rendimiento y deuda técnica (último lote). Luz verde del dueño. NO toques nada fuera de esta lista.

ANTES DE ESCRIBIR
Lee docs/taller-prompts/COORDINACION.md (Estado actual + Última actividad) y la §8/§9 del informe maestro.
Lee el código ACTUAL de cada archivo citado: no asumas números de línea ni que la suite sigue en 405.
Si un hallazgo ya está hecho, no lo reimplementes.

CONTEXTO
L0–L4 ya aplicados. Suite ~405 tests verdes.
Decisiones del dueño ya tomadas (NO reabrir): prod Europe/Madrid, UNIQUE taquilla columna generada,
créditos VIP perdidos, N2 refund mismo medio.

REGLA DE ORO DE ESTE LOTE
El PRIMER arreglo es el test unitario de AvailabilityService (hoy 0 tests): `evaluate()` gobierna la
admisión de alumnos en CINCO Actions (RequestLessonAction, RequestPrivateLessonAction,
EnrollStudentAction, ApproveEnrollmentQuotaAction, VipClassManagerController). Un error ahí no
ralentiza: SOBREVENDE clases. Nada de rendimiento se toca antes de que ese test exista y pase.
REGLA REAL A CLAVAR (NO la simplifiques): pool = `MAX_MONITORS = 2` (AvailabilityService.php:18),
márgenes 15/75 min (`marginsForPartySize` :60, `STANDARD_MARGIN_MINUTES`=15 / `BIG_GROUP_MARGIN_MINUTES`=75),
`effectivePartySizeForLesson` (:49), y el oversell se decide con `peakMonitorsUsed + requestMonitors
<= MAX_MONITORS` (:151). Un particular ocupa 1; DOS particulares a la misma hora están permitidos;
grupo de 7+ reserva 2. Clase con monitor y 0 inscritos = 1.
UBICACIÓN DEL TEST: NO lo pongas en tests/Unit a secas — Pest solo aplica RefreshDatabase en `Feature`
(tests/Pest.php). `evaluate()` escribe/lee lessons en transacción: o va en
tests/Feature/Academy/AvailabilityServiceTest.php, o al Unit le añades RefreshDatabase explícito.

OBJETIVO (10 arreglos, ordenados)

1) TEST de AvailabilityService (bloqueante; va PRIMERO). CLAVE: PARTE EL LOTE.
   L5a (este prompt, PRIMERA pasada): test de Availability + N7 + R1 + R6 + R8a — todo el mismo
   servicio/lessons. L5b (SEGUNDA pasada, NO tocar hasta que L5a esté verde): S2 + S3 + S4 + T5 + C2.
   Dilo al empezar: ejecutas L5a; cuando esté verde y cerrado, se redacta/ejecuta L5b.
   Hoy: 0 tests para app/Services/AvailabilityService.php. Crea el test (ver ubicación arriba)
   cubriendo: evaluate() con agenda libre/ocupada, límite de MONITORES REAL (2; 2 particulares a la
   misma hora SÍ, 3 NO), solape parcial, márgenes 15/75 según tamaño de grupo, buildIntervals,
   preview() vs evaluate() (preview no escribe). Usa el mismo estilo que los Feature existentes del
   área (tests/Feature/Academy/*).
   Tests: ~8-12 casos; suite verde.

2) N7 — preview() en bucle en ruta pública (LessonController.php:333-357, disponibilidad de
   particulares). Slots cada 15 min 08:00-22:00 (~56 slots) y por cada uno `preview()` → ~9.000
   queries/min por IP si se sondea.
   Hacer: calcular la disponibilidad de la franja en UNA pasada (precargar las lessons solapadas del día
   y evaluar en memoria) o acotar el rango de slots sin perder funcionalidad. NO cambiar el formato de
   respuesta de la API.
   Tests: la respuesta es idéntica; nº de queries del endpoint < umbral (DB::enableQueryLog).

3) R1 — N+1 del class-manager (Admin/ClassManagerController.php:76,97,120). mapLesson llama
   `preview()` por clase → ~3 queries extra × N clases del mes.
   Hacer: batch en memoria con el set ya precargado (calcular solapamientos/peak una vez), o paginar el
   calendario. Mantener el mismo payload de respuesta.
   Tests: nº de queries en index < 15 con un mes lleno; payload idéntico.

4) R6 — cleanup en el constructor del Commander (Admin/AcademyController.php:32,39).
   Cache::remember('auto_cleanup_check', 900) ejecuta escrituras con lockForUpdate dentro del ciclo
   HTTP. El cron/barrido ya existe (verificado en L3: el constructor de LessonController ya no barre).
   Hacer: eliminar la llamada del constructor; el barrido programado se queda.
   Tests: instanciar/llamar al index NO dispara el cleanup (spy en el servicio o la query no aparece).

5) R8a — índice de lessons.starts_at (migración 2026_03_16_140001_create_lessons_table.php:14).
   class-manager, buildIntervals y catalogUpcomingLessons filtran por rango de starts_at sin índice.
   Hacer: migración nueva añadiendo índice a `lessons(starts_at, status)` (nombre descriptivo).
   Tests: EXPLAIN de la query caliente usa el índice (o test de migración que el índice existe).

6) S2 — tests SEO (hoy solo LegacyRedirectsTest). Cero tests de robots/sitemap/noindex/no-fuga R5.
   Hacer: tests/Feature/Seo/SitemapSeoTest.php + PublicPayloadGuardTest cubriendo: robots.txt (200,
   Disallow correcto), sitemap.xml (200, contiene URLs públicas, excluye admin/carrito/subastas y
   noindex), noindex de carrito/subastas/admin, y que los payloads públicos de catálogos (SecondHand,
   Auction, Store) NO contienen purchase_price/margen/códigos de taquilla (R5).
   Tests: ~8-12 casos.

7) S3 — cache del sitemap sin invalidación real (PublicSitemapService.php:22,101,108).
   forgetCache() no tiene call sites; TTL 1h.
   Hacer: invalidar en los writes (Article, Producto, SecondHandBoard, Surfboard — observers o
   evento) o un comando. Elegir la que menos toque y decirlo.
   Tests: crear/editar un artículo → el sitemap regenerado lo incluye sin esperar TTL.

8) S4 — noindex del comparador de surf (AutoCoach). Con Disallow activo Google nunca ve la meta:
   hay que quitar el Disallow y poner noindex en la página.
   Hacer: `<meta name="robots" content="noindex, nofollow">` (o prop Inertia) en la vista del comparador
   + quitar el Disallow de robots.txt para esa ruta.
   Tests: la URL del comparador responde 200 con la meta noindex; robots.txt ya no la excluye.

9) T5 — throttle de la llave de emergencia (EmergencyKeyService.php:34, EmergencyKeyController.php:46).
   requestCode sin límite: cualquier socio al día puede revelar el código y dejar el candado OFF.
   Hacer: cooldown por socio (1 petición/día) + registrar numeroTaquilla + validar hasPhysicalLocker().
   Tests: 2º reveal en el mismo día → error/cooldown; socio sin taquilla física → error claro.

10) C2 — precios particulares hardcodeados (ChatbotService.php:98 «1 → 80€ · 2 → 55€…») vs tarifa
    viva de BD (private_lesson_tariffs). Hoy coinciden; divergirán al editar la tarifa.
    Hacer: resolver el texto de precios desde la tarifa viva (mismo origen que la consulta con
    «precio», PrivateLessonPricingService o el que use la BD) en lugar del literal.
    Tests: con tarifa BD editada, el FAQ de precios refleja la nueva; test de paridad (literal == BD
    hoy) para detectar divergencia futura.

REGLAS
- Cada arreglo: tests primero o junto (Pest), luego suite completa + npm run build solo si tocas
  frontend (aquí no debería).
- NO tocar: SMTP/alerta, P3 overbooking fotos, S5 (reserved del sitemap — deliberado, P3 documental),
  R8b (índice surfboard_id), S6 (`/academia` — decisión del dueño pendiente), periodo de taquilla,
  LessonBonoCreditUnits.
- LOTE PARTIDO (decisión de Cursor aceptada): ejecutas L5a (test Availability + N7 + R1 + R6 + R8a)
  y lo cierras; L5b (S2 + S3 + S4 + T5 + C2) NO se toca hasta que L5a esté verde y verificado.
- El test de AvailabilityService va PRIMERO, no se salta, y clava la regla REAL (2 monitores,
  márgenes 15/75, effectivePartySizeForLesson). El umbral «< 15 queries» del class-manager es
  ORIENTACIÓN, no dogma: el criterio de verdad es que preview() no se llame una vez por clase y que
  las queries no crezcan lineales con N.
- Reclama y cierra la tarea en COORDINACION.md.

FORMATO DE CIERRE
Por cada arreglo: qué tocaste, tests nuevos, resultado de la suite (y nº de queries antes/después
para N7/R1 si aplica).
Al final: veredicto si algún arreglo exige decisión del dueño. Si un hallazgo ya estaba hecho, dilo y no lo reescribas.

ACEPTACIÓN
- Test de AvailabilityService existe, pasa y clava la regla real (2 monitores, márgenes 15/75,
  effectivePartySizeForLesson, 2 particulares a la misma hora permitidas, 3 no).
- N7 y R1: preview() no se llama una vez por clase/slot; queries no lineales con N; respuesta de
  API/payload idéntica (el «< 15» es orientación, no dogma).
- R6: el constructor no dispara cleanup. R8a: índice creado.
- L5b (S2+S3+S4+T5+C2) se entrega en la SEGUNDA pasada, no junto con L5a.
- Suite verde. Sin cambios en periodo de taquilla ni LessonBonoCreditUnits.
```

---

## Verificación del diff L5 (para Cursor cuando termine, o para Reasonix)

```
FASE 2 — L5 rendimiento/deuda: VERIFICACIÓN del diff. NO implementes. Abre cada archivo:línea,
confirma/matiza/descarta y devuelve la tabla. Persona AGENTE-BACKEND-SENIOR (R1–R8).
Destinatario: quien NO implementó el lote (Reasonix). Si el lote no está en disco
(COORDINACION L5 ≠ HECHO), PARA y dilo.

Informe: docs/taller-prompts/AUDITORIA-BACKEND-FASE2-2026-08-27.md §8/§9 · Prompt L5:
docs/taller-prompts/PROMPT-L5-RENDIMIENTO.md · Suite de partida: 405 tests.

PRE-VUELO
1) git diff de: AvailabilityService, AvailabilityServiceTest (NUEVO), LessonController (N7),
   Admin/ClassManagerController (R1), Admin/AcademyController (R6), migraciones *lessons* (R8a),
   tests/Feature/Seo/* (S2), PublicSitemapService (S3), AutoCoach/robots (S4), EmergencyKeyService
   + Controller (T5), ChatbotService (C2).
2) grep: preview( |auto_cleanup_check|starts_at.*index|forgetCache|requestCode|80€|purchase_price
3) php artisan test (suite completa; anota N/aserciones/tiempo).

LENTES POR ARREGLO
AvailabilityServiceTest — ¿EXISTE y clava la regla REAL (MAX_MONITORS=2, márgenes 15/75,
  effectivePartySizeForLesson, 2 particulares a la misma hora permitidas, 3 no, clase con monitor
  y 0 inscritos = 1)? ¿Cubre evaluate() (libre/ocupada, solape parcial), buildIntervals,
  preview() vs evaluate()? ¿Está en Feature (RefreshDatabase) o el Unit lo añade explícito y pasa?
N7 — ¿Una pasada o rango acotado? ¿Formato de respuesta idéntico? ¿preview() NO se llama por slot?
  ¿Queries no lineales con N? ¿NO cambió el formato de la API pública?
R1 — ¿Batch en memoria o paginación? ¿Payload idéntico? ¿preview() no se llama por clase? (el
  «< 15 queries» es orientación: el criterio es no-linealidad con N)
R6 — ¿Constructor sin cleanup? ¿El barrido programado sigue existiendo y cubre?
R8a — ¿Índice real en lessons(starts_at, status)? ¿Migración con nombre descriptivo y down()?
S2 — ¿Tests cubren robots, sitemap, noindex y R5 (sin purchase_price/margen/códigos)? ¿Pasan?
S3 — ¿forgetCache() con call sites reales en writes (u observer/comando)? ¿TTL ya no es la única vía?
S4 — ¿noindex en la vista del comparador + Disallow quitado? ¿200 con meta?
T5 — ¿Cooldown 1/día por socio? ¿numeroTaquilla registrado? ¿hasPhysicalLocker() validado?
C2 — ¿Precios desde BD viva (no literal)? ¿Test de paridad literal vs BD? ¿El FAQ de «precio» y el de
  «clase particular» comparten origen?

ALCANCE NEGATIVO (si hay diff → MATIZ/DESCARTADO)
SMTP/alerta, P3 fotos, S5, R8b, S6, periodo taquilla, LessonBonoCreditUnits, C2 reescritura del
systemPrompt (solo el texto de precios).

FORMATO (este orden)
1) Tabla: | ID | Veredicto | Dónde (archivo:línea actual) | Evidencia 1–2 líneas |
2) Tests: suite N/aserciones/tiempo + lista de tests nuevos.
3) Queries antes/después para N7/R1 si se midieron.
4) Diff fuera de alcance (si lo hay).
5) ¿Exige decisión del dueño? Sí/no + una línea.
6) Hallazgos P0/P1 nuevos en ESTOS archivos (si no hay, dilo).

NO toques código.
```

---

## Notas para el dueño

- **Regla de oro**: el test de `AvailabilityService` va PRIMERO y es bloqueante. Cursor puede partir
  L5 en **L5a** (test + N7 + R1 + R6 + R8a — rendimiento) y **L5b** (S2 + S3 + S4 + T5 + C2 — SEO y
  deuda) si prefiere; el prompt le deja elegir y debe decirlo antes.
- **Con L5 cerrado, FASE 2 queda 100 % completada** (0 P0 · 14 P1 · ~25 P2 del informe → todos los
  lotes). Quedan solo manuales: SMTP + prueba panel Ex-socios + S6 (`/academia` indexar o no, tu
  decisión).
- P3 overbooking de fotos y S5 (reserved del sitemap) quedan **fuera a propósito** (P2/P3, no bloquean).
