# Parte S4 de Zurriola (condiciones de surf automatizadas)

> ⚠️ **ENTORNO DE PRUEBA.** Coordenadas y umbrales de nivel son un borrador de
> partida, validado solo con una comprobación manual puntual. Antes de tratar
> esto como criterio oficial de la escuela, contrastar al menos una semana de
> datos reales con el equipo S4.

## Qué es

Cada mañana (y cada 6 h vía schedule) un job automático:

1. Pide oleaje + viento a **Open-Meteo** (gratis, sin API key) para el punto
   frente a Zurriola. Las **mareas** de la tabla/parte prefieren
   **Euskalmet** (Open Data Euskadi, XML público `sea_forecast.xml`); si falla,
   se estima desde Open-Meteo.
2. Calcula la **energía/potencia** con la fórmula de apps
   P ≈ 0.5 × Hs² × Tp (kW/m; valor indexado en UI como kJ) y un índice
   verbal (Suave/Moderado/Fuerte/Muy fuerte).
3. Calcula una **recomendación de nivel** rápida (iniciación/intermedio/
   avanzado/no recomendado) con umbrales de `config('services.zurriola_surf')`.
4. Genera un **párrafo con Gemini**, usando como `systemInstruction` el
   contenido íntegro de la guía del spot (ver abajo). Si Gemini falla, usa una
   plantilla de respaldo sin IA — la web nunca se queda sin texto.
5. Guarda **una fila por día** en `surf_daily_briefs` (tabla, no solo caché) —
   así el override manual de la escuela no se pierde nunca al limpiar caché.

**Si el cron no ha corrido** y alguien abre `/servicios/webcams` (o la home),
`publicPayload()` encola **una** generación `afterResponse` (sin bloquear la
request HTTP) y la UI muestra “Generando el parte…”. Recargar unos segundos
después debería mostrar `ai_summary`.

## 📌 Dónde editar el "prompt del spot"

Dos archivos, ambos se leen ENTEROS cada vez que se genera el parte y se
envían juntos a Gemini como instrucción de sistema (guía + JSON concatenados):

- **`resources/surf-guide/zurriola-spot-guide.md`** — rol, tono, longitud,
  formato (sin markdown, un párrafo) y qué debe decidir el texto (mañana,
  tarde, franja recomendada por nivel, avisos de seguridad).
- **`resources/surf-guide/zurriola-spot-logistics.json`** — el criterio
  técnico real de Zurriola: viento por componente (nudos), energía en kJ con
  zona/nivel recomendado, estrategia de marea, morfología de marea
  alta/baja, eficiencia de dirección de swell, tipos de periodo, seguridad de
  corrientes de retorno y batimetría estacional. Es la fuente de verdad que
  sustituye a los antiguos "[pendiente]" de la guía.

No hace falta tocar código ni desplegar nada para editar ninguno de los dos —
el próximo ciclo del cron cada 6 h (o una regeneración manual) ya los usa.

### Mañana / tarde, no solo "ahora"

A diferencia de antes, el mensaje que recibe Gemini no es solo el snapshot del
momento: incluye las franjas horarias reales de la mañana (06-12h) y la tarde
(15-21h) de hoy — reutilizando exactamente el mismo cálculo que la tabla de
previsión (`SurfForecastTableService::todayDay()`) — más los eventos de
marea del día. Así el texto puede decir explícitamente cómo cambia el día
(ej. "por la mañana glassy, a partir de mediodía entra viento") y qué franja
recomendar según nivel, en vez de generalizar a partir de un único instante.

Para cada franja se le pasa a Gemini, además de lo que ya se muestra en la
tabla, la **potencia** P ≈ 0.5 × Hs² × Tp (`wavePowerKwPerMeter()` /
`energyKj()`), la misma base que usan las apps de previsión. Los umbrales
`energy_kj` del JSON son orientativos (entorno de prueba) y pueden necesitar
recalibración tras contrastar con el equipo.

### Red de seguridad de formato

El texto se muestra como texto plano en la web (sin renderizar markdown). La
guía le pide a Gemini que no use `**negrita**`, títulos ni listas, y además
`SurfDailyBriefService::sanitizePlainText()` limpia cualquier resto de
markdown y colapsa saltos de línea por si el modelo no lo respeta al 100%.

## Piezas del sistema

| Archivo | Rol |
|---|---|
| `app/Services/SurfConditions/OpenMeteoMarineClient.php` | HTTP puro hacia Open-Meteo (oleaje + viento horario). Sin lógica de negocio. |
| `app/Services/SurfConditions/EuskalmetSeaForecastClient.php` | HTTP/XML Euskalmet marítimo (mareas oficiales costa vasca). Fallback → Open-Meteo. |
| `app/Services/SurfConditions/SurfEnergyCalculator.php` | P ≈ 0.5×Hs²×Tp (kW/m, indexado como kJ en UI); índice verbal (`energy_bands`). |
| `app/Services/SurfConditions/SurfLevelRecommender.php` | Badge 4 colores + nivel orientativo (config `level_thresholds`). |
| `app/Services/SurfConditions/ZurriolaSpotLogisticsService.php` | Carga el JSON del spot (estrellas por kJ, modificadores, textos de ayuda). |
| `app/Services/SurfConditions/SurfLevelQualityStarsService.php` | Termómetro 1–5 Ini/Int/Ava (JSON, sin Gemini). |
| `app/Services/SurfConditions/SurfDailyBriefService.php` | Orquestador: fetch → cálculo → Gemini (recibe estrellas ya calculadas) → BD. |
| `resources/surf-guide/zurriola-spot-guide.md` | **Guía editable del spot** — rol/tono/formato (ver arriba). |
| `resources/surf-guide/zurriola-spot-logistics.json` | **Reglas técnicas editables del spot** (viento/energía/marea/swell/periodo/seguridad) — ver arriba. |
| `app/Console/Commands/GenerateSurfDailyBrief.php` | Comando `surf:generate-daily-brief {--force}`. |
| `routes/console.php` | Programación cada 6 h (`Schedule::command(...)->everySixHours()` con `--force`). |
| `app/Models/SurfDailyBrief.php` | Una fila por día; incluye override manual de admin. |
| `app/Http/Controllers/Admin/SurfBriefController.php` | Override manual + regenerar a demanda (usado desde la propia página pública, bloque solo-admin). |
| `resources/js/components/webcam/SurfBriefCard.jsx` | Controles admin (override + regenerar). |
| `resources/js/components/webcam/SurfBriefReactions.jsx` | 👍/👎 + contadores bajo el texto del parte. |
| `resources/js/components/webcam/SurfBriefMini.jsx` | Mini-widget compacto (usado en la home). |
| `app/Services/SurfConditions/SurfForecastTableService.php` | Tabla de previsión de varios días (ver sección siguiente). Cacheada 1h, sin persistencia en BD (a diferencia del parte de hoy). |
| `resources/js/components/webcam/SurfForecastTable.jsx` | Tabla días × franjas + bloque Parte S4 en `/servicios/webcams`. |

## Tabla de previsión de varios días

Además del "parte de hoy" (arriba), `/servicios/webcams` muestra una tabla
estilo Surfforecast con **N días** (`config('services.zurriola_surf.forecast_days')`,
default **16**) y franjas cada 3h **solo en horas de luz** (`forecast_slot_hours` =
`[6, 9, 12, 15, 18, 21]` — antes de las 6 y después de las 21 se considera de
noche, no aporta para surfear). La UI es horizontal con scroll; no hay hardcode
de 3 en React.

### `forecast_days` y tope Open-Meteo

| Origen | Tope `forecast_days` |
|---|---|
| `marine-api.open-meteo.com/v1/marine` | **0–16** (OpenAPI `maximum: 16`; default API 7) |
| `api.open-meteo.com/v1/forecast` (viento) | **0–16** (docs oficiales) |

Comprobado en local con las variables que usa `OpenMeteoMarineClient::hourlySeries()`:
`forecast_days=16` → HTTP 200, 384 horas; `=17` → HTTP 400
(`Allowed range 0 to 16`). El client clampa a `OpenMeteoMarineClient::MAX_FORECAST_DAYS`.

Producto: default **16** (tantos como permite la API de forma estable; payload
cacheado 1 h, sin llamadas Open-Meteo en el ciclo HTTP salvo miss de caché).
Override: `ZURRIOLA_FORECAST_DAYS` en `.env`.

Caché de la tabla: clave `surf_conditions.forecast_table.v5`, TTL 1 h.
Invalidar:

```bash
php artisan tinker --execute="app(\\App\\Services\\SurfConditions\\SurfForecastTableService::class)->forget();"
```

Días sin ola/periodo real (Open-Meteo suele devolver `null` en horizontes lejanos,
que aquí se ven como fuerza 0 / celdas vacías) **se omiten** en
`SurfForecastTableService::build()` — solo se listan días con al menos una
franja diurna con `waveHeightM > 0` y `wavePeriodS > 0`. El título de la UI
usa `days.length`, así que refleja el recorte.

También se invalida al regenerar el parte (admin / `SurfBriefController::regenerate()`).

### Escala visual Energía/kJ (`energyTone`)

Fuente de verdad: `config('services.zurriola_surf.forecast_energy_color_kj.bands')`
→ `SurfForecastTableService::energyTone($kj)` → slot `energyTone` →
`ENERGY_TONE_PILL` en `SurfForecastTable.jsx` (solo clases Tailwind).

| kJ (inclusivo hasta el `max` de la banda) | toneKey | Look (Tailwind) |
|---|---|---|
| 0 | `e0` | `bg-transparent text-slate-400 ring-transparent` |
| 1–9 | `e1` | verde casi imperceptible (`emerald/10`) |
| 10–19 | `e2` | verde muy ligero (`/15`) |
| 20–49 | `e3` | verde claro (`/20`) |
| 50–99 | `e4` | verde medio-bajo (`/30`) |
| 100–199 | `e5` | verde medio (`/40`) |
| 200–399 | `e6` | verde notable (`/50`) |
| 400–699 | `e7` | verde intenso (`emerald-400/55`) |
| 700–999 | `e8` | lima “fosforito” controlado (`lime-400/45`) |
| 1000–1299 | `e9` | transición verde→ámbar |
| 1300–1499 | `e10` | ámbar claro |
| 1500–1999 | `e11` | amarillo/ámbar |
| 2000–2499 | `e12` | naranja |
| 2500–4999 | `e13` | rojo-naranja / rose |
| ≥5000 | `e14` | rojo intenso (`rose-600/65`) |

Caché de tabla: `surf_conditions.forecast_table.v5` (sube versión al cambiar tones/shape).

### Calibración con el equipo (estrellas + preguntas)

- Escenarios para puntuar 1–5 estrellas: `CALIBRACION_ESTRELLAS.csv` (o el TSV de Google).
- **Cuestionario de referencia** (criterios, texto del parte, organización de la info — no es el Excel): `CALIBRACION_PREGUNTAS.md`.

### Calibración vs Surf-Forecast

La gente compara el kJ S4 con Surf-Forecast Zurriola. Diagnóstico completo:
`docs/surf-conditions/SURFFORECAST_CALIBRATION_DIAG.md` (conclusión **C mixta**).

Qué hace la app (sin afirmar que somos SF):

| Pieza | Valor |
|---|---|
| Fuente oleaje/viento | Open-Meteo (marine + weather) |
| H/T para el kJ | `energy_kj_height_source` default **`wave`** (ola combinada; no swell preferido) |
| Fórmula UI | `kJ = round(factor × periodBoost × 0.5 × (H×height_scale)_ft² × T)` |
| Factor SF | `energy_kj_calibration_factor` default **2.4** (con H/T de SF, periodo corto → mismo kJ) |
| Escala OM→SF | `energy_kj_height_scale` default **1.52** (solo energía; no cambia la columna de altura) |
| Periodo largo | `energy_kj_period_boost_max` default **1.6** (1.0 si T≤6 s → max si T≥10 s) |

Límites: el factor alinea bien periodo corto cuando H/T coinciden con SF; periodo largo SF suele ir más alto; si Open-Meteo trae Hs más bajo que SF, el kJ S4 también queda más bajo (no inventamos metros). Umbrales del JSON de logística (`≥100`, `400`, …) se mantienen: ya estaban en escala tipo apps/SF.

Piezas específicas de esta tabla:

| Archivo | Rol |
|---|---|
| `app/DTOs/SurfConditions/SurfHourlySeriesDto.php` | Serie horaria cruda (oleaje+swell+viento+nivel del mar) para N días. |
| `app/Services/SurfConditions/OpenMeteoMarineClient::hourlySeries()` | Pide esa serie a Open-Meteo (mismo cliente que el parte de hoy, método nuevo). |
| `app/Services/SurfConditions/SurfWindStateClassifier.php` | Clasifica el viento en los 5 estados estándar (glassy/off/cross-off/cross-on/on) según ángulo respecto al offshore configurado + umbral `wind_glassy_max_kmh`. |
| `app/Services/SurfConditions/TideExtremaCalculator.php` | Marea alta/baja **estimada**: máximos/mínimos locales de `sea_level_height_msl` (variable de marea de Open-Meteo), resolución horaria. No es el dato oficial de un puerto — se muestra como estimación en la UI. |
| `app/Support/CompassDirection.php` | Grados → punto cardinal (N/NE/E/...), compartido con el parte de hoy. |
| `SurfForecastTableService::todayDay()` | Método público reutilizado por `SurfDailyBriefService` para dar a Gemini el desglose mañana/tarde real de hoy (ver sección "Mañana / tarde" más abajo) — no solo la tabla visual. |

### Sobre la marea

Se pidió inicialmente usar Puertos del Estado, pero Open-Meteo ya expone
`sea_level_height_msl` (incluye la marea astronómica) en el mismo endpoint de
oleaje que ya estábamos consumiendo — evita depender de una fuente nueva
(sin API pública limpia conocida) y mantiene todo el dato en un solo
proveedor. Los picos altos/bajos se calculan localmente comparando cada hora
con sus vecinas; al ser resolución horaria (no minuto a minuto), la hora y
altura exactas son una aproximación razonable, no el dato oficial de puerto.

## Regenerar a mano

```bash
php artisan surf:generate-daily-brief --force
```

Útil si quieres refrescar ya sin esperar al próximo ciclo (00:00, 06:00, 12:00,
18:00 hora de la app). También hay un botón "Regenerar ahora" visible solo
para admin en `/servicios/webcams`.

## Local vs servidor (checklist)

### Local (desarrollo)

1. MySQL/XAMPP encendido + `.env` con Gemini (`GOOGLE_AI_*` / clave del proyecto).
2. Generar el parte **a mano** (lo más simple):

```bash
php artisan surf:generate-daily-brief
# o forzar regeneración:
php artisan surf:generate-daily-brief --force
```

3. Alternativa: dejar el scheduler en foreground mientras desarrollas:

```bash
php artisan schedule:work
```

4. Verificar:

```bash
php artisan tinker --execute="echo optional(\\App\\Models\\SurfDailyBrief::query()->whereDate('report_date', today())->first())->ai_summary;"
```

O abre `/servicios/webcams`: debe verse el bloque “Parte S4 · Hoy” con texto.
Si ves “Generando…”, recarga a los ~10–30 s (fallback `afterResponse`).

### Servidor (producción / staging)

El schedule de Laravel **solo corre** si el SO llama a `schedule:run` cada minuto:

```cron
* * * * * cd /ruta/al/proyecto && php artisan schedule:run >> /dev/null 2>&1
```

Eso dispara `surf:generate-daily-brief --force` cada 6 h (`routes/console.php`).

Checklist deploy:

- [ ] Crontab con `schedule:run` cada minuto
- [ ] Worker de colas **no** es obligatorio para el parte (el cron es sync vía Artisan; el fallback web usa `afterResponse` en el mismo PHP-FPM)
- [ ] Variables Open-Meteo/Gemini presentes en `.env`
- [ ] Tras el primer ciclo (o un `surf:generate-daily-brief --force` post-deploy), hay fila de hoy en `surf_daily_briefs` con `ai_summary` no nulo y `summary_source` ∈ `gemini|fallback_template`

### Cómo verificar `ai_summary` de hoy

```sql
SELECT report_date, summary_source, LEFT(ai_summary, 120), generated_at
FROM surf_daily_briefs
WHERE report_date = CURDATE();
```

Esperado: 1 fila, `ai_summary` con texto, `summary_source` distinto de `pending`.

## Override manual de la escuela

Si el admin fija uno de los 4 niveles (`good` / `espigon` / `caution` / `closed`)
desde el bloque admin de `/servicios/webcams`, ese aviso **manda por encima** del
cálculo automático del badge. Sin override, el badge sale solo de
`signal_thresholds` (ola + viento). Nota opcional + «Quitar aviso» restaura el auto.
Se guarda en `surf_daily_briefs.admin_override_*`.

## Pendiente / próximos pasos conocidos

- Conectar este mismo `SurfDailyBriefService::today()` al chatbot (Nivel 1,
  antes de tocar Gemini) para preguntas tipo "¿hay olas hoy?".
- Validar la marea estimada (`TideExtremaCalculator`) contra datos oficiales
  de puerto (Pasaia) durante unos días; si se desvía mucho, migrar a Puertos
  del Estado como fuente de marea (mismo esquema de DTO, un cliente nuevo).
- Recalibrar `latitude`/`longitude` y `level_thresholds` tras una semana de
  comparación real con el equipo S4.
