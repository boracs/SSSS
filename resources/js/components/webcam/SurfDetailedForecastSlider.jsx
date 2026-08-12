import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    CalendarRange,
    CloudRain,
    Droplets,
    Loader2,
    Sunrise,
    Sunset,
    X,
} from "lucide-react";
import { ForecastSlider, ENERGY_TONE_PILL, DirectionArrow } from "./SurfForecastTable";
import { formatClock, weatherIconMeta } from "./WeatherDetailPanel";
import { LevelStarsStack } from "./LevelStars";
import SurfForecastSheetFooter from "./SurfForecastSheetFooter";
import { windArrowClass, windValueClass } from "./windArrowTone";

/**
 * Slider "forecast al detalle": bottom-sheet al ras inferior.
 * Footer compartido: Ver parte de hoy (modal) + Ver webcam.
 * Cards uniformes; separador entre días; overlay de día activo centrado.
 */

function SlotColumn({ slot }) {
    const weatherMeta =
        slot.weatherCode !== null && slot.weatherCode !== undefined
            ? weatherIconMeta(slot.weatherCode)
            : null;
    const WeatherIcon = weatherMeta?.icon ?? null;
    const weatherTone = weatherMeta?.tone ?? "text-amber-300";
    const starsIni = slot.qualityStarsIniciacion ?? 1;
    const starsInt = slot.qualityStarsIntermedio ?? slot.qualityStars ?? 1;
    const starsAva = slot.qualityStarsAvanzado ?? 1;

    return (
        <div className="relative flex w-[6.5rem] flex-shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/90 px-2.5 py-3 sm:w-[8rem] sm:gap-2 sm:px-3 sm:py-3.5">
            <p className="w-full border-b border-white/15 pb-1.5 text-center text-sm font-bold tabular-nums tracking-wide text-slate-50 sm:pb-2 sm:text-base">
                {slot.hourLabel}
            </p>

            <div className="text-base font-semibold tabular-nums text-cyan-200 sm:text-lg">
                <span>{slot.waveHeightM.toFixed(2)}</span>
                <span className="ml-0.5 text-[0.7em] font-semibold text-cyan-200/85">m</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 sm:text-sm">
                <DirectionArrow
                    degrees={slot.waveDirectionDeg}
                    className="h-4 w-4 text-cyan-400/80 sm:h-5 sm:w-5"
                />
                {slot.wavePeriodS}s
            </div>

            <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 sm:px-3 sm:text-sm ${ENERGY_TONE_PILL[slot.energyTone] ?? ""}`}
            >
                {slot.energyKj}
            </span>

            <div className="flex items-center gap-1 text-sm sm:text-base">
                <DirectionArrow
                    degrees={slot.windDirectionDeg}
                    className={`h-4 w-4 shrink-0 sm:h-5 sm:w-5 ${windArrowClass(slot.windState, slot.windSpeedKmh, slot.windDirectionDeg)}`}
                />
                <span
                    className={`tabular-nums font-semibold ${windValueClass(slot.windState, slot.windSpeedKmh, slot.windDirectionDeg)}`}
                    title={slot.windStateLabel || undefined}
                >
                    {slot.windSpeedKmh}
                    <span className="ml-0.5 text-[0.7em] font-medium opacity-80">km/h</span>
                </span>
            </div>

            <LevelStarsStack
                iniciacion={starsIni}
                intermedio={starsInt}
                avanzado={starsAva}
                size="xl"
                className="mt-0.5 w-full"
            />

            <div className="mt-1 w-full border-t border-white/5 pt-2 text-center">
                {WeatherIcon ? (
                    <>
                        <WeatherIcon
                            className={`mx-auto h-6 w-6 sm:h-7 sm:w-7 ${weatherTone}`}
                            strokeWidth={1.75}
                            aria-hidden
                        />
                        <p className="text-sm font-semibold tabular-nums text-white sm:text-base">
                            {Math.round(slot.tempC)}°
                        </p>
                        <p
                            className="inline-flex items-center justify-center gap-0.5 text-xs tabular-nums text-sky-300 sm:text-sm"
                            title="Probabilidad de lluvia"
                        >
                            <CloudRain
                                className="h-3 w-3 shrink-0 text-sky-400/90 sm:h-3.5 sm:w-3.5"
                                aria-hidden
                            />
                            <span className="sr-only">Probabilidad de lluvia </span>
                            {Math.round(slot.precipProbabilityPct ?? 0)}%
                        </p>
                    </>
                ) : (
                    <p className="text-xs text-slate-600">Sin tiempo</p>
                )}
            </div>
        </div>
    );
}

/** Hueco + línea vertical cyan/rose suave entre días (no rojo de error). */
function DaySeparator() {
    return (
        <div
            className="flex w-5 flex-shrink-0 flex-col items-center self-stretch sm:w-7"
            aria-hidden
        >
            <div className="my-1 w-px flex-1 rounded-full bg-gradient-to-b from-transparent via-cyan-400/70 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.35)] sm:w-[2px]" />
            <div className="h-1.5 w-1.5 rounded-full bg-rose-400/70 ring-2 ring-rose-400/20 sm:h-2 sm:w-2" />
            <div className="my-1 w-px flex-1 rounded-full bg-gradient-to-b from-transparent via-rose-400/55 to-transparent sm:w-[2px]" />
        </div>
    );
}

function DayBlock({ day, dayRef }) {
    return (
        <div
            ref={dayRef}
            data-day-block={day.date}
            className="flex flex-shrink-0 flex-col gap-2 px-1.5 py-2 sm:gap-2.5 sm:px-2 sm:py-2.5"
        >
            {/* Label del día vive en el overlay sticky; aquí solo meteo del día */}
            <div className="flex min-h-[1.125rem] flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 sm:min-h-[1.25rem] sm:gap-x-3 sm:text-[11px]">
                {day.sunrise ? (
                    <span className="flex items-center gap-1">
                        <Sunrise className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        {formatClock(day.sunrise)}
                    </span>
                ) : null}
                {day.sunset ? (
                    <span className="flex items-center gap-1">
                        <Sunset className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        {formatClock(day.sunset)}
                    </span>
                ) : null}
                {Array.isArray(day.tideEvents) && day.tideEvents.length > 0 ? (
                    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 sm:gap-x-2">
                        <Droplets className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        {day.tideEvents.map((event, idx) => {
                            const isHigh = event.type === "alta";
                            return (
                                <span
                                    key={`${event.hourLabel}-${idx}`}
                                    className={`tabular-nums ${isHigh ? "text-cyan-300/90" : "text-slate-400"}`}
                                >
                                    {isHigh ? "Alta" : "Baja"} {event.hourLabel}
                                </span>
                            );
                        })}
                        {(day.tideRiseM !== null && day.tideRiseM !== undefined) ||
                        (day.tideFallM !== null && day.tideFallM !== undefined) ? (
                            <span className="text-slate-600">·</span>
                        ) : null}
                        {day.tideRiseM !== null && day.tideRiseM !== undefined ? (
                            <span className="text-emerald-300/80">+{day.tideRiseM.toFixed(2)}m</span>
                        ) : null}
                        {day.tideFallM !== null && day.tideFallM !== undefined ? (
                            <span className="text-rose-300/80">−{day.tideFallM.toFixed(2)}m</span>
                        ) : null}
                    </span>
                ) : (day.tideRiseM !== null && day.tideRiseM !== undefined) ||
                  (day.tideFallM !== null && day.tideFallM !== undefined) ? (
                    <span className="flex items-center gap-1">
                        <Droplets className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                        {day.tideRiseM !== null && day.tideRiseM !== undefined ? (
                            <span className="text-emerald-300/80">+{day.tideRiseM.toFixed(2)}m</span>
                        ) : null}
                        {day.tideFallM !== null && day.tideFallM !== undefined ? (
                            <span className="text-rose-300/80">−{day.tideFallM.toFixed(2)}m</span>
                        ) : null}
                    </span>
                ) : null}
            </div>

            <div className="flex items-stretch gap-2.5 sm:gap-3">
                {day.slots.map((slot) => (
                    <SlotColumn key={slot.time} slot={slot} />
                ))}
            </div>
        </div>
    );
}

/**
 * Overlay: día cuyo bloque contiene el centro del scroller.
 * El label permanece centrado en pantalla; cambia al cruzar al siguiente día.
 */
function ActiveDayOverlay({ label }) {
    return (
        <div className="pointer-events-none relative z-20 mb-1.5 flex h-8 items-center justify-center sm:h-9">
            <div
                key={label}
                className="inline-flex max-w-[92%] items-center gap-1.5 rounded-full border border-cyan-400/35 bg-slate-950/90 px-3.5 py-1.5 text-xs font-semibold capitalize tracking-wide text-cyan-100 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur-md animate-[fadeDay_280ms_ease-out] sm:px-4 sm:text-sm"
            >
                <CalendarRange className="h-3.5 w-3.5 shrink-0 text-cyan-300/90 sm:h-4 sm:w-4" aria-hidden />
                <span className="truncate">{label}</span>
            </div>
            <style>{`
                @keyframes fadeDay {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default function SurfDetailedForecastSlider({
    panelId,
    open,
    days = [],
    loading = false,
    error = "",
    weatherOk = true,
    weatherMessage = "",
    onClose,
    webcamAnchorId = "webcam-directo",
    brief = null,
}) {
    const scrollerRef = useRef(null);
    const dayElsRef = useRef([]);
    const [activeDayIndex, setActiveDayIndex] = useState(0);

    const setDayRef = useCallback((index) => (node) => {
        dayElsRef.current[index] = node;
    }, []);

    const syncActiveDay = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller || !days.length) return;

        const viewportCenter = scroller.scrollLeft + scroller.clientWidth / 2;
        const scrollerLeft = scroller.getBoundingClientRect().left;

        let bestIndex = 0;
        let bestScore = -1;

        dayElsRef.current.forEach((el, index) => {
            if (!el || index >= days.length) return;
            const rect = el.getBoundingClientRect();
            const left = scroller.scrollLeft + (rect.left - scrollerLeft);
            const right = left + rect.width;
            const overlapLeft = Math.max(left, scroller.scrollLeft);
            const overlapRight = Math.min(right, scroller.scrollLeft + scroller.clientWidth);
            const visible = Math.max(0, overlapRight - overlapLeft);

            // Prioriza el bloque que contiene el centro; si no, el más visible.
            const containsCenter = viewportCenter >= left && viewportCenter < right;
            const score = containsCenter ? visible + scroller.clientWidth : visible;

            if (score > bestScore) {
                bestScore = score;
                bestIndex = index;
            }
        });

        setActiveDayIndex((prev) => (prev === bestIndex ? prev : bestIndex));
    }, [days.length]);

    useEffect(() => {
        if (!open) return undefined;

        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open || !days.length) return undefined;

        dayElsRef.current = dayElsRef.current.slice(0, days.length);
        const id = window.requestAnimationFrame(() => syncActiveDay());
        window.addEventListener("resize", syncActiveDay);

        return () => {
            window.cancelAnimationFrame(id);
            window.removeEventListener("resize", syncActiveDay);
        };
    }, [open, days, syncActiveDay]);

    const activeLabel = days[activeDayIndex]?.dayLabel || days[0]?.dayLabel || "";

    return (
        <div
            id={panelId}
            role="dialog"
            aria-modal="false"
            aria-label="Forecast al detalle: oleaje y tiempo cada 2 horas"
            aria-hidden={!open}
            className={`fixed inset-x-0 bottom-0 z-[530] flex max-h-[min(90dvh,48rem)] transform flex-col rounded-t-2xl border-t border-cyan-500/25 bg-slate-950/95 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md transition-transform duration-500 ease-in-out sm:max-h-[min(72vh,44rem)] sm:rounded-t-3xl ${
                open
                    ? "translate-x-0"
                    : "pointer-events-none translate-x-full"
            }`}
            style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
            <div className="relative flex shrink-0 items-center justify-center border-b border-white/10 px-12 py-2.5 sm:px-14 sm:py-3">
                <div className="flex min-w-0 max-w-full items-center justify-center gap-3 sm:gap-5">
                    <div className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-cyan-200 sm:gap-2 sm:text-xs">
                        <CalendarRange className="h-3.5 w-3.5 shrink-0 text-cyan-300/90 sm:h-4 sm:w-4" aria-hidden />
                        <span className="truncate">Forecast al detalle</span>
                    </div>
                    {days.length > 0 ? (
                        <span
                            className="shrink-0 text-xs font-semibold normal-case tracking-normal text-slate-300 tabular-nums sm:text-sm"
                            aria-label={`Día ${activeDayIndex + 1} de ${days.length}`}
                        >
                            Día {activeDayIndex + 1}/{days.length}
                        </span>
                    ) : null}
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Cerrar forecast al detalle"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white sm:right-4 sm:p-2"
                >
                    <X className="h-4 w-4" aria-hidden />
                </button>
            </div>

            <div className="overflow-x-hidden overflow-y-hidden px-2 py-1.5 sm:px-5 sm:py-2">
                {loading ? (
                    <p className="mb-2 flex items-center gap-2 text-xs text-cyan-200/80">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                        Cargando oleaje y tiempo cada 2h…
                    </p>
                ) : null}

                {!loading && error ? <p className="text-xs text-rose-300">{error}</p> : null}

                {!loading && !error && !weatherOk && weatherMessage ? (
                    <p className="mb-2 text-[11px] text-amber-200/80">{weatherMessage}</p>
                ) : null}

                {!loading && !error && days.length > 0 ? (
                    <>
                        <p className="mb-1 px-0.5 text-[11px] leading-snug text-slate-500 sm:text-xs">
                            Estrellas: verde iniciación · azul intermedio · rojo avanzado (orientativo)
                        </p>
                        <ActiveDayOverlay label={activeLabel} />
                        <ForecastSlider scrollerRef={scrollerRef} onScroll={syncActiveDay}>
                            <div className="flex items-stretch gap-0 pb-1">
                                {days.map((day, index) => (
                                    <React.Fragment key={day.date}>
                                        {index > 0 ? <DaySeparator /> : null}
                                        <DayBlock day={day} dayRef={setDayRef(index)} />
                                    </React.Fragment>
                                ))}
                            </div>
                        </ForecastSlider>
                    </>
                ) : null}
            </div>

            <SurfForecastSheetFooter
                brief={brief}
                webcamAnchorId={webcamAnchorId}
                sheetOpen={open}
            />
        </div>
    );
}
