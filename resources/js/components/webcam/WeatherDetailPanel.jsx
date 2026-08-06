import React, { useState } from "react";
import {
    CalendarDays,
    Cloud,
    CloudDrizzle,
    CloudFog,
    CloudLightning,
    CloudRain,
    CloudSnow,
    CloudSun,
    Clock,
    Loader2,
    Sun,
    Sunrise,
    Sunset,
} from "lucide-react";
import { ForecastSlider } from "./SurfForecastTable";

/**
 * Panel expandible "Tiempo detallado" (horario + 7 días) para
 * `/servicios/webcams`. Puramente presentacional: recibe `data` ya resuelto
 * por el fetch on-demand del padre (Servicios_Webcams.jsx). Amber = meteo,
 * para no confundirse visualmente con el cyan de mar/olas.
 *
 * Iconos SOLO de la lista blanca Lucide (weather_code Open-Meteo → icono);
 * prohibido inventar nombres o usar emojis.
 */
const WEATHER_ICON_BY_CODE = [
    { test: (code) => code === 0, icon: Sun },
    { test: (code) => code >= 1 && code <= 3, icon: CloudSun },
    { test: (code) => code >= 45 && code <= 48, icon: CloudFog },
    { test: (code) => code >= 51 && code <= 55, icon: CloudDrizzle },
    { test: (code) => (code >= 61 && code <= 65) || (code >= 80 && code <= 82), icon: CloudRain },
    { test: (code) => code >= 71 && code <= 77, icon: CloudSnow },
    { test: (code) => code >= 95 && code <= 99, icon: CloudLightning },
];

export function weatherIconFor(code) {
    const numeric = Number(code);
    const match = WEATHER_ICON_BY_CODE.find(({ test }) => test(numeric));
    return match ? match.icon : Cloud;
}

export function formatClock(isoOrTime) {
    const match = /T?(\d{2}:\d{2})/.exec(String(isoOrTime ?? ""));
    return match ? match[1] : "--:--";
}

export function formatWeekdayShort(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("es-ES", { weekday: "short" });
}

export default function WeatherDetailPanel({ panelId, open, data, loading, error }) {
    const [show48h, setShow48h] = useState(false);

    const hourly = Array.isArray(data?.hourly) ? data.hourly : [];
    const daily = Array.isArray(data?.daily) ? data.daily : [];
    const visibleHours = hourly.slice(0, show48h ? 48 : 24);

    return (
        <div
            id={panelId}
            className={`overflow-hidden transition-all duration-500 ease-out ${
                open ? "max-h-[640px] opacity-100" : "max-h-0 opacity-0"
            }`}
        >
            <div className="mt-3 rounded-2xl border border-amber-500/20 bg-slate-900/80 p-4 backdrop-blur-sm sm:p-5">
                {loading && (
                    <p className="flex items-center gap-2 text-sm text-amber-200/80">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Cargando tiempo detallado…
                    </p>
                )}

                {!loading && error && <p className="text-sm text-rose-300">{error}</p>}

                {!loading && !error && hourly.length > 0 && (
                    <div className="space-y-5">
                        <section>
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300">
                                    <Clock className="h-3.5 w-3.5" aria-hidden />
                                    Horario
                                </h3>
                                {hourly.length > 24 && (
                                    <button
                                        type="button"
                                        onClick={() => setShow48h((value) => !value)}
                                        className="text-[11px] font-medium text-amber-300/80 underline-offset-2 hover:text-amber-200 hover:underline"
                                    >
                                        {show48h ? "Ver 24 h" : "Ver 48 h"}
                                    </button>
                                )}
                            </div>

                            <ForecastSlider>
                                <div className="flex gap-2 px-1 pb-1">
                                    {visibleHours.map((hour, idx) => {
                                        const Icon = weatherIconFor(hour.weather_code);
                                        return (
                                            <div
                                                key={`${hour.time}-${idx}`}
                                                className="min-w-[4.5rem] flex-shrink-0 rounded-xl border border-white/5 bg-white/5 p-2 text-center"
                                            >
                                                <p className="text-[11px] text-slate-400">
                                                    {formatClock(hour.time)}
                                                </p>
                                                <Icon
                                                    className="mx-auto mt-1 h-5 w-5 text-amber-300"
                                                    aria-hidden
                                                />
                                                <p className="mt-1 font-heading text-sm font-semibold tabular-nums text-white">
                                                    {Math.round(hour.temperature_c)}°
                                                </p>
                                                <p className="text-[10px] tabular-nums text-sky-300">
                                                    {Math.round(hour.precip_probability_pct ?? 0)}%
                                                </p>
                                                <p className="text-[10px] tabular-nums text-slate-400">
                                                    {Math.round(hour.wind_speed_kmh ?? 0)} km/h
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ForecastSlider>
                        </section>

                        <section>
                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                                Próximos 7 días
                            </h3>

                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                                {daily.map((day, idx) => {
                                    const Icon = weatherIconFor(day.weather_code);
                                    return (
                                        <div
                                            key={`${day.date}-${idx}`}
                                            className="rounded-xl border border-amber-500/10 bg-amber-500/[0.04] p-2 text-center"
                                        >
                                            <p className="text-[11px] font-medium capitalize text-slate-300">
                                                {formatWeekdayShort(day.date)}
                                            </p>
                                            <Icon className="mx-auto mt-1 h-5 w-5 text-amber-300" aria-hidden />
                                            <p className="mt-1 text-xs tabular-nums text-white">
                                                {Math.round(day.temp_max_c)}° / {Math.round(day.temp_min_c)}°
                                            </p>
                                            <p className="text-[10px] tabular-nums text-sky-300">
                                                {Math.round(day.precip_probability_max_pct ?? 0)}%
                                            </p>
                                            <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-500">
                                                <Sunrise className="h-3 w-3" aria-hidden />
                                                {formatClock(day.sunrise)}
                                            </p>
                                            <p className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                                                <Sunset className="h-3 w-3" aria-hidden />
                                                {formatClock(day.sunset)}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
