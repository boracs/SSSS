# Diagnóstico calibración kJ vs Surf-Forecast (Zurriola)

Fecha diagnóstico: **2026-07-25**. Datos S4 desde `SurfForecastTableService::publicPayload()` (Open-Meteo + buildSlot). Referencias SF: captura usuario ≈25–27 jul (no son datos oficiales embebidos en la app).

## 1) Slots S4 (ANTES del cambio) — 09/12/15/18

`buildSlot` usaba **swell** si existe (`swellHeight ?? waveHeight`, `swellPeriod ?? wavePeriod`) → `SurfEnergyCalculator::energyKj` = `round(0.5 × H_ft² × T)` **sin** factor.

| Día | Hora | Wave H/T | Swell H/T | H/T energía (swell) | energyKj |
|-----|------|----------|-----------|---------------------|----------|
| Sáb 25 | 09:00 | 1.06 m / 5.1 s | 0.78 / 4.9 | swell | **16** |
| Sáb 25 | 12:00 | 1.24 / 5.1 | 0.68 / 5.3 | swell | **13** |
| Sáb 25 | 15:00 | 1.38 / 5.5 | 0.80 / 5.8 | swell | **20** |
| Sáb 25 | 18:00 | 1.36 / 5.6 | 1.04 / 5.3 | swell | **31** |
| Dom 26 | 09:00 | 1.30 / 6.0 | 1.26 / 5.3 | swell | **45** |
| Dom 26 | 12:00 | 1.20 / 6.0 | 1.12 / 5.4 | swell | **36** |
| Dom 26 | 15:00 | 1.14 / 5.9 | 1.02 / 5.4 | swell | **30** |
| Dom 26 | 18:00 | 1.14 / 5.8 | 1.02 / 5.2 | swell | **29** |
| Lun 27 | 09:00 | 1.20 / 7.7 | 1.10 / 5.8 | swell | **37** |
| Lun 27 | 12:00 | 1.24 / 8.0 | 1.24 / 6.7 | swell | **55** |
| Lun 27 | 15:00 | 1.26 / 8.1 | 1.26 / 6.8 | swell | **58** |
| Lun 27 | 18:00 | 1.22 / 8.3 | 1.22 / 6.9 | swell | **55** |

## 2) Comparativa vs Surf-Forecast (mismas horas aprox.)

| Ref SF | SF H/T / kJ | S4 slot | S4 wave H/T | S4 kJ (antes, swell) | raw `0.5·Hft²·T` con H/T de SF | SF / raw |
|--------|-------------|---------|-------------|----------------------|--------------------------------|----------|
| Sáb ~15:00 | 2.1 m / 6 s / **341** | sáb 15:00 | 1.38 / 5.5 | **20** | 142 | **2.39** |
| Sáb ~17–18 | 2.2 m / 7 s / **423** | sáb 18:00 | 1.36 / 5.6 | **31** | 182 | **2.32** |
| Dom baja ~1.2 m / 6 s / **~110** | dom 15:00 | 1.14 / 5.9 | **30** | 46.5 (con 1.2/6) | **~2.37** |
| Lun ~14:00 | 1.6 m / 10 s / **527** | lun 15:00 | 1.26 / 8.1 | **58** | 138 | **3.82** |

Notas:

- Con los **mismos** H/T que SF, la fórmula S4 ya da ~142 / ~182 / ~138; SF muestra ~2.3× en periodo corto y ~3.8× con periodo largo → **no es un solo factor constante** en todo el rango de T.
- Open-Meteo en sáb 15:00 da **Hs ~1.38 m** frente a **2.1 m** de SF → gap de modelo de altura (≈ (2.1/1.38)² ≈ 2.3× en energía solo por H).
- Preferir **swell** (0.80 m) frente a **wave** (1.38 m) en sáb 15 agrava el subconteo (20 vs ~56 raw con wave).

## 3) Conclusión: **C) Mixto**

| Componente | Evidencia |
|------------|-----------|
| **A) Modelo (H/T distintos)** | OM Hs/T &lt; SF en slots de swell/viento (p. ej. 1.38 m/5.5 s vs 2.1 m/6 s). Lat/lon no se tocan sin prueba de grid. |
| **B) Escala (misma fórmula, kJ distintos)** | Con H/T idénticos a SF, hace falta ≈**2.4×** en periodo corto para igualar kJ SF; periodo largo SF pide más (~3.8×). |
| **Input interno** | `swell ?? wave` alineaba peor con la columna “ola” que compara la gente en SF. |

## 4) Decisión FASE 2 (implementada)

1. **Input energía:** `wave` (ola primaria/combinada Open-Meteo), configurable (`energy_kj_height_source`: `wave` \| `swell` \| `max_energy`).
2. **Escala:** `energy_kj_calibration_factor = 2.4` sobre `0.5 × H_ft² × T` (modo alineación tipo apps / SF en periodo corto).  
   - Trade-off: con H/T de SF, sáb/dom calzan muy bien; **lun periodo largo SF (~527) sigue por encima** de `raw×2.4` (~331). Preferimos no inflar windswell para no romper días donde OM ya coincide en altura.  
   - Gap restante sáb S4 (~135 vs 341 SF) es **sobre todo Hs OM**, no se inventan metros.
3. **Logística:** umbrales `energy_kj` del JSON **no se multiplican** — ya estaban redactados en escala tipo SF (≥100 todos, etc.); el problema era que S4 mostraba kJ ~5–10× bajos.
4. **UI/docs:** índice calibrado sobre Open-Meteo; **no** se presenta como dato de Surf-Forecast.

## 5) Antes / después (mismos slots S4, medidos tras el cambio)

Fórmula: `round(2.4 × 0.5 × H_ft² × T)` con **wave** H/T. Caché `forecast_table.v5`.

| Slot | Antes (swell, ×1) | Después (medido) | SF ref |
|------|-------------------|------------------|--------|
| Sáb 15:00 | 20 | **134** | 341 (gap = Hs OM 1.38 vs 2.1) |
| Sáb 18:00 | 31 | **134** | 423 |
| Dom 15:00 | 30 | **98** | ~110 ✅ |
| Lun 15:00 | 58 | **166** | 527 (periodo largo: trade-off) |

Sanity con H/T de SF (no OM): sáb 2.1 m/6 s → **342** (≈341 SF); lun 1.6 m/10 s → **331** (SF 527 — factor 2.4 no cubre el boost de periodo largo de SF).

