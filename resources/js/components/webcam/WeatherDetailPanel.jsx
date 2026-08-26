import React, { useEffect, useMemo, useState } from "react";
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
    { test: (code) => code === 0, icon: Sun, tone: "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.35)]" },
    { test: (code) => code >= 1 && code <= 3, icon: CloudSun, tone: "text-amber-300" },
    { test: (code) => code >= 45 && code <= 48, icon: CloudFog, tone: "text-slate-400" },
    { test: (code) => code >= 51 && code <= 55, icon: CloudDrizzle, tone: "text-sky-400" },
    { test: (code) => (code >= 61 && code <= 65) || (code >= 80 && code <= 82), icon: CloudRain, tone: "text-sky-500" },
    { test: (code) => code >= 71 && code <= 77, icon: CloudSnow, tone: "text-cyan-200" },
    { test: (code) => code >= 95 && code <= 99, icon: CloudLightning, tone: "text-violet-400" },
];

/** @returns {{ icon: import('lucide-react').LucideIcon, tone: string }} */
export function weatherIconMeta(code) {
    const numeric = Number(code);
    const match = WEATHER_ICON_BY_CODE.find(({ test }) => test(numeric));
    if (match) {
        return { icon: match.icon, tone: match.tone };
    }
    return { icon: Cloud, tone: "text-slate-300" };
}

export function weatherIconFor(code) {
    return weatherIconMeta(code).icon;
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

function formatDayNumber(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "";
    return String(date.getDate());
}

function hourDateKey(time) {
    return String(time ?? "").slice(0, 10);
}

export default function WeatherDetailPanel({ panelId, open, data, loading, error }) {
    const [show48h, setShow48h] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    const hourly = Array.isArray(data?.hourly) ? data.hourly : [];
    const daily = Array.isArray(data?.daily) ? data.daily : [];

    const hoursByDate = useMemo(() => {
        const map = new Map();
        for (const hour of hourly) {
            const key = hourDateKey(hour.time);
            if (!key) continue;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(hour);
        }
        return map;
    }, [hourly]);

    useEffect(() => {
        if (!open) {
            setSelectedDate(null);
            setShow48h(false);
        }
    }, [open]);

    const visibleHours = useMemo(() => {
        if (selectedDate) {
            return hoursByDate.get(selectedDate) ?? [];
        }
        return hourly.slice(0, show48h ? 48 : 24);
    }, [selectedDate, hoursByDate, hourly, show48h]);

    const selectedLabel = selectedDate
        ? formatWeekdayShort(selectedDate)
        : null;

    const selectedDay = selectedDate
        ? daily.find((day) => day.date === selectedDate) ?? null
        : null;

    const selectDay = (date) => {
        const hours = hoursByDate.get(date) ?? [];
        if (hours.length === 0) return;
        setSelectedDate(date);
        setShow48h(false);
        window.setTimeout(() => {
            document.getElementById(`${panelId}-horario`)?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }, 40);
    };

    return (
        <div
            id={panelId}
            className={`min-w-0 transition-[max-height,opacity] duration-200 ease-out ${
                open
                    ? "max-h-[min(80vh,720px)] overflow-x-hidden overflow-y-auto opacity-100"
                    : "max-h-0 overflow-hidden opacity-0"
            }`}
        >
            <div className="mt-3 min-w-0 overflow-x-hidden rounded-2xl border border-amber-500/20 bg-slate-900/80 p-3 backdrop-blur-sm sm:p-5">
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
                            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-amber-300">
                                <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                                Próximos 7 días
                            </h3>

                            <div className="grid min-w-0 grid-cols-4 gap-1.5 md:grid-cols-7 md:gap-2">
                                {daily.map((day, idx) => {
                                    const { icon: Icon, tone } = weatherIconMeta(day.weather_code);
                                    const dayHours = hoursByDate.get(day.date) ?? [];
                                    const hasHours = dayHours.length > 0;
                                    const isSelected = selectedDate === day.date;
                                    const weekday = formatWeekdayShort(day.date);
                                    const dayNumber = formatDayNumber(day.date);
                                    const baseClass =
                                        "min-w-0 w-full overflow-hidden rounded-xl border p-1.5 text-center transition sm:p-2";
                                    const activeClass = isSelected
                                        ? "border-amber-400/50 bg-amber-500/15 ring-1 ring-amber-400/40"
                                        : hasHours
                                          ? "border-amber-500/20 bg-amber-500/[0.06] hover:border-amber-400/40 hover:bg-amber-500/10"
                                          : "cursor-not-allowed border-white/5 bg-white/[0.02] opacity-55";

                                    const inner = (
                                        <>
                                            <p className="truncate text-[10px] font-medium capitalize text-slate-300 sm:text-[11px]">
                                                {weekday}
                                                {dayNumber ? (
                                                    <span className="ml-0.5 font-normal tabular-nums text-slate-500">
                                                        {dayNumber}
                                                    </span>
                                                ) : null}
                                            </p>
                                            <Icon
                                                className={`mx-auto mt-1 h-5 w-5 ${tone}`}
                                                strokeWidth={1.75}
                                                aria-hidden
                                            />
                                            <p className="mt-1 text-[11px] leading-tight tabular-nums text-white sm:text-xs">
                                                {Math.round(day.temp_max_c)}°
                                            </p>
                                            <p className="text-[10px] leading-tight tabular-nums text-slate-400">
                                                {Math.round(day.temp_min_c)}°
                                            </p>
                                            <p className="inline-flex items-center justify-center gap-0.5 text-[10px] tabular-nums text-sky-300">
                                                <CloudRain
                                                    className="h-2.5 w-2.5 shrink-0 text-sky-400/90"
                                                    aria-hidden
                                                />
                                                <span className="sr-only">
                                                    Probabilidad de lluvia{" "}
                                                </span>
                                                {Math.round(day.precip_probability_max_pct ?? 0)}%
                                            </p>
                                        </>
                                    );

                                    return hasHours ? (
                                        <button
                                            key={`${day.date}-${idx}`}
                                            type="button"
                                            onClick={() => selectDay(day.date)}
                                            aria-pressed={isSelected}
                                            aria-controls={`${panelId}-horario`}
                                            aria-label={`Ver horario del ${weekday} ${dayNumber}`.trim()}
                                            className={`${baseClass} ${activeClass}`}
                                        >
                                            {inner}
                                        </button>
                                    ) : (
                                        <div
                                            key={`${day.date}-${idx}`}
                                            className={`${baseClass} ${activeClass}`}
                                            aria-disabled="true"
                                        >
                                            {inner}
                                        </div>
                                    );
                                })}
                            </div>

                            {selectedDay ? (
                                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tabular-nums text-slate-400">
                                    <span className="inline-flex items-center gap-1">
                                        <Sunrise className="h-3 w-3 shrink-0" aria-hidden />
                                        <span className="sr-only">Amanecer </span>
                                        {formatClock(selectedDay.sunrise)}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Sunset className="h-3 w-3 shrink-0" aria-hidden />
                                        <span className="sr-only">Atardecer </span>
                                        {formatClock(selectedDay.sunset)}
                                    </span>
                                </p>
                            ) : null}
                        </section>

                        <section id={`${panelId}-horario`} className="scroll-mt-2">
                            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
                                <h3 className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs font-semibold uppercase tracking-widest text-amber-300">
                                    <Clock className="h-3.5 w-3.5" aria-hidden />
                                    Horario
                                    {selectedLabel ? (
                                        <span className="normal-case tracking-normal text-amber-200/90">
                                            · {selectedLabel}
                                        </span>
                                    ) : (
                                        <span className="normal-case tracking-normal text-amber-200/90">
                                            · próximas {show48h ? "48 h" : "24 h"}
                                        </span>
                                    )}
                                </h3>
                                <div className="flex items-center gap-2">
                                    {selectedDate ? (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDate(null)}
                                            className="text-[11px] font-medium text-amber-300/80 underline-offset-2 hover:text-amber-200 hover:underline"
                                        >
                                            Próximas horas
                                        </button>
                                    ) : hourly.length > 24 ? (
                                        <button
                                            type="button"
                                            onClick={() => setShow48h((value) => !value)}
                                            className="text-[11px] font-medium text-amber-300/80 underline-offset-2 hover:text-amber-200 hover:underline"
                                        >
                                            {show48h ? "Ver 24 h" : "Ver 48 h"}
                                        </button>
                                    ) : null}
                                </div>
                            </div>

                            {visibleHours.length > 0 ? (
                                <ForecastSlider key={selectedDate ?? (show48h ? "48" : "24")}>
                                    <div className="flex w-max flex-nowrap gap-2 px-1 pb-1">
                                        {visibleHours.map((hour, idx) => {
                                            const { icon: Icon, tone } = weatherIconMeta(
                                                hour.weather_code,
                                            );
                                            return (
                                                <div
                                                    key={`${hour.time}-${idx}`}
                                                    className="min-w-[4.5rem] flex-shrink-0 rounded-xl border border-white/5 bg-white/5 p-2 text-center"
                                                >
                                                    <p className="text-[11px] text-slate-400">
                                                        {formatClock(hour.time)}
                                                    </p>
                                                    <Icon
                                                        className={`mx-auto mt-1 h-5 w-5 ${tone}`}
                                                        strokeWidth={1.75}
                                                        aria-hidden
                                                    />
                                                    <p className="mt-1 font-heading text-sm font-semibold tabular-nums text-white">
                                                        {Math.round(hour.temperature_c)}°
                                                    </p>
                                                    <p className="inline-flex items-center justify-center gap-0.5 text-[10px] tabular-nums text-sky-300">
                                                        <CloudRain
                                                            className="h-2.5 w-2.5 shrink-0 text-sky-400/90"
                                                            aria-hidden
                                                        />
                                                        <span className="sr-only">
                                                            Probabilidad de lluvia{" "}
                                                        </span>
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
                            ) : (
                                <p className="text-sm text-slate-500">
                                    No hay franjas horarias para este día.
                                </p>
                            )}
                        </section>
                    </div>
                )}
            </div>
        </div>
    );
}
