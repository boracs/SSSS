# Parte S4 de Zurriola (condiciones de surf automatizadas)

> ⚠️ **ENTORNO DE PRUEBA.** Coordenadas y umbrales de nivel son un borrador de
> partida, validado solo con una comprobación manual puntual. Antes de tratar
> esto como criterio oficial de la escuela, contrastar al menos una semana de
> datos reales con el equipo S4.

## Qué es

Cada mañana (`07:00` por defecto) un job automático:

1. Pide oleaje + viento a **Open-Meteo** (gratis, sin API key) para el punto
   frente a Zurriola.
2. Calcula un índice de **energía** (H²×T) y lo traduce a una etiqueta verbal
   (Suave/Moderado/Fuerte/Muy fuerte).
3. Calcula una **recomendación de nivel** rápida (iniciación/intermedio/
   avanzado/no recomendado) con umbrales de `config('services.zurriola_surf')`.
4. Genera un **párrafo con Gemini**, usando como `systemInstruction` el
   contenido íntegro de la guía del spot (ver abajo). Si Gemini falla, usa una
   plantilla de respaldo sin IA — la web nunca se queda sin texto.
5. Guarda **una fila por día** en `surf_daily_briefs` (tabla, no solo caché) —
   así el override manual de la escuela no se pierde nunca al limpiar caché.

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
tabla, la **potencia física real** en kW/m (fórmula estándar de teoría de
ondas de Airy, `SurfEnergyCalculator::wavePowerKwPerMeter()`) — un dato real,
no un índice arbitrario — para que pueda razonar con más criterio sobre la
tabla `energy_kj` del JSON (que usa una escala externa tipo Surf-Forecast que
no replicamos con una fórmula calibrada; se usa de forma orientativa, no como
coincidencia exacta de rango).

### Red de seguridad de formato

El texto se muestra como texto plano en la web (sin renderizar markdown). La
guía le pide a Gemini que no use `**negrita**`, títulos ni listas, y además
`SurfDailyBriefService::sanitizePlainText()` limpia cualquier resto de
markdown y colapsa saltos de línea por si el modelo no lo respeta al 100%.

## Piezas del sistema

| Archivo | Rol |
|---|---|
| `app/Services/SurfConditions/OpenMeteoMarineClient.php` | HTTP puro hacia Open-Meteo (oleaje + viento). Sin lógica de negocio. |
| `app/Services/SurfConditions/SurfEnergyCalculator.php` | Índice de energía + etiqueta verbal (config `energy_bands`). |
| `app/Services/SurfConditions/SurfLevelRecommender.php` | Recomendación de nivel rápida (config `level_thresholds` + `offshore_wind_*`). |
| `app/Services/SurfConditions/SurfDailyBriefService.php` | Orquestador: fetch → cálculo → Gemini/fallback → persistencia → único punto de lectura (`today()`, `publicPayload()`). Inyecta `SurfForecastTableService` para el desglose mañana/tarde del prompt. |
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
estilo Surfforecast con **3 días** (`config('services.zurriola_surf.forecast_days')`)
y franjas cada 3h **solo en horas de luz** (`forecast_slot_hours` = `[6, 9, 12,
15, 18, 21]` — antes de las 6 y después de las 23 se considera de noche, no
aporta para surfear).

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

## Override manual de la escuela

Si el admin marca el día como "Cerrado"/"Precaución"/"Bien" (desde el bloque
admin de `/servicios/webcams`), ese aviso **manda por encima** del cálculo
automático en toda la UI. Se guarda en `surf_daily_briefs.admin_override_*` y
sobrevive a cualquier limpieza de caché.

## Pendiente / próximos pasos conocidos

- Conectar este mismo `SurfDailyBriefService::today()` al chatbot (Nivel 1,
  antes de tocar Gemini) para preguntas tipo "¿hay olas hoy?".
- Validar la marea estimada (`TideExtremaCalculator`) contra datos oficiales
  de puerto (Pasaia) durante unos días; si se desvía mucho, migrar a Puertos
  del Estado como fuente de marea (mismo esquema de DTO, un cliente nuevo).
- Recalibrar `latitude`/`longitude` y `level_thresholds` tras una semana de
  comparación real con el equipo S4.
