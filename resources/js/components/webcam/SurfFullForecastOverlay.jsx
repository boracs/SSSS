import React, { useEffect } from "react";
import {
    ArrowUp,
    CalendarRange,
    Droplets,
    Loader2,
    TrendingDown,
    TrendingUp,
    Waves,
    Wind,
    X,
} from "lucide-react";
import { ForecastSlider } from "./SurfForecastTable";
import { weatherIconFor } from "./WeatherDetailPanel";
import { surfBriefOverrideMeta } from "./surfBriefOverride";
import { LevelStarsStack } from "./LevelStars";
import SurfForecastSheetFooter from "./SurfForecastSheetFooter";

/**
 * Panel "Ver resumen por día": bottom-sheet con slider horizontal de días
 * (sin scroll vertical). Fusiona oleaje (`surfForecast.days`) + tiempo
 * (`weatherDaily`) + estrellas por nivel (Ini / Int / Ava) del mejor momento.
 * Footer compartido: Ver parte de hoy + Ver webcam.
 */

function DirectionArrow({ degrees, className = "" }) {
    if (degrees === null || degrees === undefined) return null;
    return (
        <ArrowUp
            className={className}
            style={{ transform: `rotate(${degrees + 180}deg)` }}
            aria-hidden
        />
    );
}

function DayFusionCard({ day, weatherDay }) {
    const meta =
        surfBriefOverrideMeta(day.bestSignal) ??
        surfBriefOverrideMeta("closed");
    const bestSlot =
        day.slots?.find((slot) => slot.time === day.bestSlotTime) ??
        day.slots?.[0] ??
        null;
    const WeatherIcon = weatherDay
        ? weatherIconFor(weatherDay.weather_code)
        : null;
    const starsIni = day.qualityStarsIniciacion ?? 1;
    const starsInt = day.qualityStarsIntermedio ?? day.qualityStars ?? 1;
    const starsAva = day.qualityStarsAvanzado ?? 1;

    return (
        <div className="flex min-h-[22rem] w-[10.5rem] shrink-0 flex-col rounded-2xl border border-white/10 bg-slate-900/80 px-3 py-3.5 sm:min-h-[24rem] sm:w-[11.5rem] sm:px-3.5 sm:py-4">
            <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-slate-200 capitalize sm:text-xs">
                {day.dayLabel}
            </p>

            <div className="mt-2 w-full px-0.5">
                <LevelStarsStack
                    iniciacion={starsIni}
                    intermedio={starsInt}
                    avanzado={starsAva}
                    size="md"
                    className="gap-0.5"
                />
            </div>

            <span
                className={`mx-auto mt-2 inline-flex w-fit max-w-full truncate rounded-full px-2 py-0.5 text-center text-[10px] font-bold ${meta?.tableBadge ?? ""}`}
            >
                {meta?.buttonTitle ?? "Sin datos"}
            </span>

            {bestSlot ? (
                <div className="mt-4 flex flex-1 flex-col items-center gap-2 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">
                        Mejor momento
                    </p>
                    <p className="text-sm font-bold tabular-nums text-white">
                        {bestSlot.hourLabel}
                    </p>
                    <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1 text-sm font-semibold text-cyan-200">
                            <Waves className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {bestSlot.waveHeightM.toFixed(2)} m
                            <DirectionArrow
                                degrees={bestSlot.waveDirectionDeg}
                                className="h-3 w-3 text-cyan-400/70"
                            />
                        </div>
                        <span className="text-[11px] text-slate-500">
                            {bestSlot.wavePeriodS}s
                        </span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-xs text-slate-300">
                        <span className="flex items-center gap-1">
                            <Wind className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {bestSlot.windSpeedKmh} km/h
                        </span>
                        <span className="px-0.5 text-[10px] leading-snug text-slate-500">
                            {bestSlot.windStateLabel}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="flex-1" />
            )}

            {Array.isArray(day.tideEvents) && day.tideEvents.length > 0 ? (
                <div className="mt-3 flex w-full flex-col items-center gap-1 text-[11px]">
                    <Droplets className="h-3 w-3 text-slate-500" aria-hidden />
                    <ul className="flex w-full flex-col gap-0.5">
                        {day.tideEvents.map((event, idx) => {
                            const isHigh = event.type === "alta";
                            return (
                                <li
                                    key={`${event.hourLabel}-${idx}`}
                                    className="flex items-center justify-center gap-1.5 tabular-nums"
                                >
                                    {isHigh ? (
                                        <TrendingUp className="h-3 w-3 shrink-0 text-cyan-300" aria-hidden />
                                    ) : (
                                        <TrendingDown className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                                    )}
                                    <span className={isHigh ? "text-cyan-200/90" : "text-slate-400"}>
                                        {isHigh ? "Alta" : "Baja"}
                                    </span>
                                    <span className="font-semibold text-slate-100">{event.hourLabel}</span>
                                    <span className="text-slate-500">
                                        {Number(event.heightM).toFixed(2)}m
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                    {(day.tideRiseM !== null && day.tideRiseM !== undefined) ||
                    (day.tideFallM !== null && day.tideFallM !== undefined) ? (
                        <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t border-white/10 pt-1 text-[10px]">
                            {day.tideRiseM !== null && day.tideRiseM !== undefined ? (
                                <span className="text-emerald-300/80">
                                    Sube +{day.tideRiseM.toFixed(2)}m
                                </span>
                            ) : null}
                            {day.tideFallM !== null && day.tideFallM !== undefined ? (
                                <span className="text-rose-300/80">
                                    Baja −{day.tideFallM.toFixed(2)}m
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : (day.tideRiseM !== null && day.tideRiseM !== undefined) ||
              (day.tideFallM !== null && day.tideFallM !== undefined) ? (
                <div className="mt-3 flex flex-col items-center gap-0.5 text-[11px] text-slate-500">
                    <Droplets className="h-3 w-3" aria-hidden />
                    {day.tideRiseM !== null && day.tideRiseM !== undefined ? (
                        <span className="text-emerald-300/80">
                            Sube +{day.tideRiseM.toFixed(2)}m
                        </span>
                    ) : null}
                    {day.tideFallM !== null && day.tideFallM !== undefined ? (
                        <span className="text-rose-300/80">
                            Baja −{day.tideFallM.toFixed(2)}m
                        </span>
                    ) : null}
                </div>
            ) : null}

            <div className="mt-3 border-t border-white/5 pt-3">
                {weatherDay ? (
                    <div className="flex flex-col items-center gap-1.5 text-center">
                        <div className="flex items-center gap-1.5">
                            {WeatherIcon ? (
                                <WeatherIcon
                                    className="h-4 w-4 text-amber-300"
                                    aria-hidden
                                />
                            ) : null}
                            <span className="text-sm font-semibold tabular-nums text-white">
                                {Math.round(weatherDay.temp_max_c)}° /{" "}
                                {Math.round(weatherDay.temp_min_c)}°
                            </span>
                        </div>
                        <span className="text-[11px] tabular-nums text-sky-300">
                            {Math.round(
                                weatherDay.precip_probability_max_pct ?? 0,
                            )}
                            % lluvia
                        </span>
                    </div>
                ) : (
                    <p className="text-center text-[11px] text-slate-500">
                        Sin tiempo
                    </p>
                )}
            </div>
        </div>
    );
}

export default function SurfFullForecastOverlay({
    panelId,
    open,
    days = [],
    weatherDaily = [],
    weatherLoading = false,
    weatherError = "",
    onClose,
    brief = null,
    webcamAnchorId = "webcam-directo",
}) {
    const weatherByDate = new Map(weatherDaily.map((day) => [day.date, day]));

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    return (
        <>
            <div
                className={`fixed inset-0 z-[520] bg-slate-950/70 transition-opacity duration-500 ${
                    open
                        ? "opacity-100"
                        : "pointer-events-none opacity-0"
                }`}
                onClick={onClose}
                aria-hidden="true"
            />

            <div
                id={panelId}
                role="dialog"
                aria-modal="true"
                aria-label="Resumen por día: oleaje y tiempo, todos los días"
                aria-hidden={!open}
                className={`fixed inset-x-0 bottom-0 z-[530] flex h-[min(72dvh,36rem)] max-h-[40rem] transform flex-col rounded-t-3xl border-t border-cyan-500/25 bg-slate-950/95 shadow-2xl backdrop-blur-md transition-transform duration-500 ease-in-out sm:h-[min(68vh,38rem)] ${
                    open
                        ? "translate-x-0"
                        : "translate-x-full pointer-events-none"
                }`}
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
            >
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
                    <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <CalendarRange
                            className="h-3.5 w-3.5 shrink-0"
                            aria-hidden
                        />
                        <span className="truncate">
                            Resumen por día · Oleaje + Tiempo
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar forecast completo"
                        className="shrink-0 rounded-full border border-white/10 p-2 text-slate-400 transition hover:bg-white/5 hover:text-white"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
                    {weatherLoading ? (
                        <p className="mb-2 flex shrink-0 items-center gap-2 text-xs text-amber-200/80">
                            <Loader2
                                className="h-3.5 w-3.5 animate-spin"
                                aria-hidden
                            />
                            Cargando el tiempo atmosférico…
                        </p>
                    ) : null}

                    {!weatherLoading && weatherError ? (
                        <p className="mb-2 shrink-0 text-xs text-rose-300">
                            Tiempo no disponible ({weatherError}). Se muestra
                            solo el oleaje.
                        </p>
                    ) : null}

                    {days.length > 0 ? (
                        <div className="flex min-h-0 flex-1 flex-col">
                            <p className="mb-2 shrink-0 text-[10px] leading-snug text-slate-500">
                                Estrellas: verde iniciación · azul intermedio · rojo avanzado (orientativo)
                            </p>
                            <div className="min-h-0 flex-1">
                                <ForecastSlider>
                                    <div className="flex items-stretch gap-3 pb-1 pr-2 sm:gap-3.5">
                                        {days.map((day) => (
                                            <DayFusionCard
                                                key={day.date}
                                                day={day}
                                                weatherDay={
                                                    weatherByDate.get(day.date) ??
                                                    null
                                                }
                                            />
                                        ))}
                                    </div>
                                </ForecastSlider>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">
                            Sin días de previsión.
                        </p>
                    )}
                </div>

                <SurfForecastSheetFooter
                    brief={brief}
                    webcamAnchorId={webcamAnchorId}
                    sheetOpen={open}
                />
            </div>
        </>
    );
}
