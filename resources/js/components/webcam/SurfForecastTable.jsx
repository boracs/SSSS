import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ArrowUp,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    Gauge,
    Info,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Waves,
    Wind,
} from "lucide-react";
import SurfBriefReactions from "./SurfBriefReactions";

const TONE_TEXT = {
    green: "text-emerald-300",
    yellow: "text-amber-300",
    red: "text-rose-300",
};

const TONE_PILL = {
    green: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
    yellow: "bg-amber-500/20 text-amber-200 ring-amber-400/40",
    red: "bg-rose-500/20 text-rose-200 ring-rose-400/40",
};

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

const DEFAULT_METRIC_HELP = {
    oleaje:
        "Qué es: altura de la ola (metros) y dirección (flecha = de dónde viene el mar).\n\nEn Zurriola (abre al NW): si el swell llega de NW entra de lleno y se nota más tamaño. Si viene rotado (S u otras), gran parte de la energía se pierde y la playa queda más pequeña de lo que sugiere el número.",
    periodo:
        "Qué es: segundos entre una ola y la siguiente.\n\nEn Zurriola: 6–9 s mar de viento (fofas); 10–13 s óptimo (mar de fondo ordenado); ≥14 s mucha energía de fondo y más riesgo de cerrazón en arena de verano.",
    energia:
        "Qué es: energía en kJ (E = Hs² × periodo, Hs en pies, preferimos swell).\n\nUmbrales S4: <50 kJ intermedio escaso / avanzado no merece la pena; ~70–80 kJ avanzado ya posible; ≥100 kJ pueden surfear todos (para avanzado: ola pequeña y técnica).",
    viento:
        "Qué es: km/h + flecha (de dónde sopla).\n\nZurriola: sur = offshore (limpia); norte = onshore (pica). Colores: verde flojo, amarillo medio, rojo fuerte.",
    marea:
        "Bajo cada día: ~2 altas y ~2 bajas con flecha, hora y altura. Entre paréntesis (+/− Xm) cuánto subió o bajó desde el extremo anterior.\n\nCoeficientes del día: Sube +Xm (media de llenados) y Baja −Xm (media de vaciados). Con poca energía cualquier marea; con más fuerza, media-alta o espigón.",
};

function HelpText({ text }) {
    const parts = String(text)
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

    return (
        <span className="block space-y-2">
            {parts.map((line, idx) => (
                <span key={idx} className="block">
                    {line}
                </span>
            ))}
        </span>
    );
}

const METRIC_HELP_OPEN_EVENT = "surf-metric-help-open";

function MetricInfo({ label, icon: Icon, help }) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 320 });
    const wrapRef = useRef(null);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const closeTimerRef = useRef(null);
    const instanceId = useId();
    const panelId = `${instanceId}-panel`;
    const helpText = help || "";

    const clearCloseTimer = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
    };

    const openPanel = () => {
        clearCloseTimer();
        window.dispatchEvent(new CustomEvent(METRIC_HELP_OPEN_EVENT, { detail: { id: instanceId } }));
        setOpen(true);
    };

    const closePanel = () => {
        clearCloseTimer();
        setOpen(false);
    };

    const scheduleClose = () => {
        clearCloseTimer();
        closeTimerRef.current = setTimeout(() => setOpen(false), 120);
    };

    useEffect(() => () => clearCloseTimer(), []);

    useEffect(() => {
        const onOtherOpen = (event) => {
            if (event.detail?.id !== instanceId) {
                clearCloseTimer();
                setOpen(false);
            }
        };
        window.addEventListener(METRIC_HELP_OPEN_EVENT, onOtherOpen);
        return () => window.removeEventListener(METRIC_HELP_OPEN_EVENT, onOtherOpen);
    }, [instanceId]);

    useLayoutEffect(() => {
        if (!open || !buttonRef.current) return undefined;

        const place = () => {
            const rect = buttonRef.current.getBoundingClientRect();
            const panelWidth = Math.min(380, window.innerWidth - 24);
            let left = rect.right + 12;
            let top = rect.top;

            if (left + panelWidth > window.innerWidth - 12) {
                left = Math.max(12, rect.left - panelWidth - 12);
            }
            if (top + 320 > window.innerHeight - 12) {
                top = Math.max(12, window.innerHeight - 332);
            }

            setCoords({ top, left, width: panelWidth });
        };

        place();
        window.addEventListener("scroll", place, true);
        window.addEventListener("resize", place);
        return () => {
            window.removeEventListener("scroll", place, true);
            window.removeEventListener("resize", place);
        };
    }, [open, helpText]);

    useEffect(() => {
        if (!open) return undefined;

        const onPointerDown = (event) => {
            const inTrigger = wrapRef.current?.contains(event.target);
            const inPanel = panelRef.current?.contains(event.target);
            if (!inTrigger && !inPanel) closePanel();
        };
        const onKeyDown = (event) => {
            if (event.key === "Escape") closePanel();
        };

        document.addEventListener("pointerdown", onPointerDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("pointerdown", onPointerDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    return (
        <span ref={wrapRef} className="inline-flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-cyan-400" />
            <span>{label}</span>
            <button
                ref={buttonRef}
                type="button"
                className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                    open
                        ? "border-cyan-300 bg-cyan-500/25 text-cyan-100"
                        : "border-cyan-400/40 text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/15 hover:text-cyan-100"
                }`}
                aria-label={`Qué es ${label}`}
                aria-expanded={open}
                aria-controls={panelId}
                onMouseEnter={openPanel}
                onMouseLeave={scheduleClose}
                onFocus={openPanel}
                onBlur={scheduleClose}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (open) {
                        closePanel();
                    } else {
                        openPanel();
                    }
                }}
            >
                <Info className="h-2.5 w-2.5" strokeWidth={2.5} />
            </button>
            {open && helpText
                ? createPortal(
                      <div
                          ref={panelRef}
                          id={panelId}
                          role="tooltip"
                          className="fixed z-[200] max-h-[70vh] overflow-y-auto rounded-xl border border-cyan-400/50 bg-slate-950 p-4 text-left text-[12px] font-normal leading-relaxed text-slate-100 shadow-2xl"
                          style={{ top: coords.top, left: coords.left, width: coords.width }}
                          onMouseEnter={openPanel}
                          onMouseLeave={scheduleClose}
                      >
                          <span className="mb-2 block text-[10px] font-bold uppercase tracking-wide text-cyan-300">
                              {label}
                          </span>
                          <HelpText text={helpText} />
                      </div>,
                      document.body
                  )
                : null}
        </span>
    );
}

function TideDayCell({ events, riseM, fallM }) {
    if (!events?.length) {
        return <p className="text-[11px] text-slate-500">Sin datos de marea</p>;
    }

    return (
        <div className="flex flex-col items-stretch gap-2 py-0.5">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                {events.map((event, idx) => {
                    const isHigh = event.type === "alta";
                    return (
                        <div
                            key={`${event.hourLabel}-${idx}`}
                            className="inline-flex min-w-0 items-center justify-center gap-1 whitespace-nowrap text-[11px]"
                        >
                            {isHigh ? (
                                <TrendingUp className="h-3 w-3 shrink-0 text-cyan-300" aria-hidden />
                            ) : (
                                <TrendingDown className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                            )}
                            <span className={`font-semibold ${isHigh ? "text-cyan-100" : "text-slate-300"}`}>
                                {isHigh ? "Alta" : "Baja"}
                            </span>
                            <span className="tabular-nums text-slate-200">{event.hourLabel}</span>
                            <span className="tabular-nums text-slate-500">
                                {event.heightM > 0 ? "+" : ""}
                                {event.heightM}m
                            </span>
                        </div>
                    );
                })}
            </div>

            {(riseM !== null && riseM !== undefined) || (fallM !== null && fallM !== undefined) ? (
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 border-t border-white/10 pt-1.5 text-[10px] font-semibold uppercase tracking-wide">
                    {riseM !== null && riseM !== undefined ? (
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                            <TrendingUp className="h-3 w-3" />
                            Sube +{riseM}m
                        </span>
                    ) : null}
                    {fallM !== null && fallM !== undefined ? (
                        <span className="inline-flex items-center gap-1 text-rose-300">
                            <TrendingDown className="h-3 w-3" />
                            Baja −{fallM}m
                        </span>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function SlotCells({ days, render }) {
    return days.map((day) =>
        day.slots.map((slot, idx) => (
            <td
                key={`${day.date}-${slot.time}`}
                className={`px-3 py-3 text-center ${idx === 0 ? "border-l border-white/10" : ""}`}
            >
                {render(slot)}
            </td>
        ))
    );
}

function ForecastSlider({ children }) {
    const scrollerRef = useRef(null);
    const dragRef = useRef({
        active: false,
        moved: false,
        startX: 0,
        startScroll: 0,
        pointerId: null,
    });
    const [canLeft, setCanLeft] = useState(false);
    const [canRight, setCanRight] = useState(false);
    const [dragging, setDragging] = useState(false);

    const updateEdges = () => {
        const el = scrollerRef.current;
        if (!el) return;
        const max = el.scrollWidth - el.clientWidth;
        setCanLeft(el.scrollLeft > 4);
        setCanRight(el.scrollLeft < max - 4);
    };

    useEffect(() => {
        const el = scrollerRef.current;
        if (!el) return undefined;

        updateEdges();
        el.addEventListener("scroll", updateEdges, { passive: true });
        window.addEventListener("resize", updateEdges);

        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateEdges) : null;
        observer?.observe(el);

        const isInteractive = (target) =>
            target instanceof Element && Boolean(target.closest("button, a, input, textarea, [role='tooltip']"));

        const onPointerDown = (event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if (isInteractive(event.target)) return;

            const drag = dragRef.current;
            drag.active = true;
            drag.moved = false;
            drag.startX = event.clientX;
            drag.startScroll = el.scrollLeft;
            drag.pointerId = event.pointerId;
            el.setPointerCapture(event.pointerId);
            setDragging(true);
        };

        const onPointerMove = (event) => {
            const drag = dragRef.current;
            if (!drag.active || drag.pointerId !== event.pointerId) return;

            const dx = event.clientX - drag.startX;
            if (Math.abs(dx) > 3) {
                drag.moved = true;
            }
            el.scrollLeft = drag.startScroll - dx;
            event.preventDefault();
        };

        const endDrag = (event) => {
            const drag = dragRef.current;
            if (!drag.active || (event.pointerId != null && drag.pointerId !== event.pointerId)) return;

            drag.active = false;
            drag.pointerId = null;
            setDragging(false);
            updateEdges();
        };

        const onClickCapture = (event) => {
            if (dragRef.current.moved) {
                event.preventDefault();
                event.stopPropagation();
                dragRef.current.moved = false;
            }
        };

        el.addEventListener("pointerdown", onPointerDown);
        el.addEventListener("pointermove", onPointerMove);
        el.addEventListener("pointerup", endDrag);
        el.addEventListener("pointercancel", endDrag);
        el.addEventListener("click", onClickCapture, true);

        return () => {
            el.removeEventListener("scroll", updateEdges);
            window.removeEventListener("resize", updateEdges);
            observer?.disconnect();
            el.removeEventListener("pointerdown", onPointerDown);
            el.removeEventListener("pointermove", onPointerMove);
            el.removeEventListener("pointerup", endDrag);
            el.removeEventListener("pointercancel", endDrag);
            el.removeEventListener("click", onClickCapture, true);
        };
    }, []);

    const scrollByPage = (direction) => {
        const el = scrollerRef.current;
        if (!el) return;
        const amount = Math.max(220, Math.round(el.clientWidth * 0.55));
        el.scrollBy({ left: direction * amount, behavior: "smooth" });
    };

    return (
        <div className="relative">
            <div
                className={`pointer-events-none absolute inset-y-0 left-0 z-30 w-10 rounded-l-2xl bg-gradient-to-r from-slate-950/90 to-transparent transition-opacity ${
                    canLeft ? "opacity-100" : "opacity-0"
                }`}
            />
            <div
                className={`pointer-events-none absolute inset-y-0 right-0 z-30 w-10 rounded-r-2xl bg-gradient-to-l from-slate-950/90 to-transparent transition-opacity ${
                    canRight ? "opacity-100" : "opacity-0"
                }`}
            />

            <button
                type="button"
                onClick={() => scrollByPage(-1)}
                disabled={!canLeft}
                aria-label="Desplazar previsión a la izquierda"
                className="absolute left-2 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/90 text-cyan-100 shadow-lg backdrop-blur-sm transition hover:border-cyan-300/60 hover:bg-slate-900 hover:text-white disabled:pointer-events-none disabled:opacity-0"
            >
                <ChevronLeft className="h-5 w-5" />
            </button>
            <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={!canRight}
                aria-label="Desplazar previsión a la derecha"
                className="absolute right-2 top-1/2 z-40 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/90 text-cyan-100 shadow-lg backdrop-blur-sm transition hover:border-cyan-300/60 hover:bg-slate-900 hover:text-white disabled:pointer-events-none disabled:opacity-0"
            >
                <ChevronRight className="h-5 w-5" />
            </button>

            <div
                ref={scrollerRef}
                className={`forecast-slider-scroll overflow-x-auto rounded-2xl border border-white/10 select-none ${
                    dragging ? "cursor-grabbing" : "cursor-grab"
                }`}
                style={{ scrollBehavior: dragging ? "auto" : "smooth", touchAction: "pan-y" }}
            >
                {children}
            </div>

            <style>{`
                .forecast-slider-scroll {
                    scrollbar-width: none;
                    -ms-overflow-style: none;
                }
                .forecast-slider-scroll::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}

export default function SurfForecastTable({
    days,
    metricHelp = {},
    summary,
    updatedAtHuman,
    level,
    override,
    reactions = null,
}) {
    if (!days?.length) {
        return null;
    }

    const help = {
        ...DEFAULT_METRIC_HELP,
        ...(metricHelp && typeof metricHelp === "object" ? metricHelp : {}),
    };

    const overrideTone = override
        ? {
              closed: { wrap: "border-rose-300 bg-rose-50", badge: "bg-rose-600 text-white", label: "Cerrado por la escuela" },
              caution: { wrap: "border-amber-300 bg-amber-50", badge: "bg-amber-600 text-white", label: "Precaución" },
              good: { wrap: "border-emerald-300 bg-emerald-50", badge: "bg-emerald-600 text-white", label: "Confirmado por la escuela" },
          }[override.status]
        : null;

    const levelTone = {
        iniciacion: "bg-emerald-100 text-emerald-800 ring-emerald-200",
        intermedio: "bg-sky-100 text-sky-800 ring-sky-200",
        avanzado: "bg-amber-100 text-amber-900 ring-amber-200",
        no_recomendado: "bg-rose-100 text-rose-800 ring-rose-200",
    }[level?.value] || "bg-slate-100 text-slate-700 ring-slate-200";

    return (
        <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-5 shadow-xl backdrop-blur-sm sm:p-7">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Previsión {days.length} días · Zurriola
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                        Usa las flechas laterales para deslizar · pulsa la <span className="text-cyan-300">i</span> para el criterio del spot
                    </p>
                </div>
                <p className="text-[11px] text-slate-500">Horas de luz · cada 3h</p>
            </div>

            <ForecastSlider>
                <table className="w-full min-w-[920px] border-collapse text-sm">
                    <thead>
                        <tr>
                            <th className="sticky left-0 z-10 w-36 bg-slate-950 p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                &nbsp;
                            </th>
                            {days.map((day) => (
                                <th
                                    key={day.date}
                                    colSpan={day.slots.length}
                                    className="border-l border-white/10 bg-slate-950 px-3 py-2 text-center text-xs font-bold capitalize text-cyan-200"
                                >
                                    {day.dayLabel}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th className="sticky left-0 z-10 w-36 bg-slate-950 p-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Hora
                            </th>
                            {days.map((day) =>
                                day.slots.map((slot, idx) => (
                                    <th
                                        key={`${day.date}-${slot.time}`}
                                        className={`bg-slate-950/80 px-3 py-2 text-center text-[11px] font-semibold text-slate-400 ${idx === 0 ? "border-l border-white/10" : ""}`}
                                    >
                                        {slot.hourLabel}
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <tr>
                            <td className="sticky left-0 z-20 w-36 bg-slate-900 p-3 text-xs font-semibold text-slate-300">
                                <MetricInfo label="Oleaje" icon={Waves} help={help.oleaje} />
                            </td>
                            <SlotCells
                                days={days}
                                render={(slot) => (
                                    <div className="flex items-center justify-center gap-1.5">
                                        <DirectionArrow degrees={slot.waveDirectionDeg} className="h-4 w-4 text-cyan-300" />
                                        <span className="font-bold text-white">{slot.waveHeightM}m</span>
                                    </div>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className="sticky left-0 z-20 w-36 bg-slate-900 p-3 text-xs font-semibold text-slate-300">
                                <MetricInfo label="Periodo" icon={Clock} help={help.periodo} />
                            </td>
                            <SlotCells
                                days={days}
                                render={(slot) => (
                                    <span className="font-bold text-white">{slot.wavePeriodS}s</span>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className="sticky left-0 z-20 w-36 bg-slate-900 p-3 text-xs font-semibold text-slate-300">
                                <MetricInfo label="Energía/kJ" icon={Gauge} help={help.energia} />
                            </td>
                            <SlotCells
                                days={days}
                                render={(slot) => (
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[12px] font-bold ring-1 ${TONE_PILL[slot.energyTone] || TONE_PILL.green}`}>
                                        {slot.energyKj}
                                    </span>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className="sticky left-0 z-20 w-36 bg-slate-900 p-3 text-xs font-semibold text-slate-300">
                                <MetricInfo label="Viento" icon={Wind} help={help.viento} />
                            </td>
                            <SlotCells
                                days={days}
                                render={(slot) => (
                                    <div className={`flex items-center justify-center gap-1 font-bold ${TONE_TEXT[slot.windTone] || TONE_TEXT.green}`}>
                                        <DirectionArrow degrees={slot.windDirectionDeg} className="h-4 w-4" />
                                        <span>{slot.windSpeedKmh}</span>
                                        <span className="text-[10px] font-medium opacity-70">km/h</span>
                                    </div>
                                )}
                            />
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="sticky left-0 z-20 w-36 bg-slate-950 p-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                <MetricInfo label="Marea" icon={TrendingUp} help={help.marea} />
                            </td>
                            {days.map((day) => (
                                <td
                                    key={`tide-${day.date}`}
                                    colSpan={day.slots.length}
                                    className="border-l border-t border-white/10 bg-slate-950/60 px-3 py-3 text-center"
                                >
                                    <TideDayCell
                                        events={day.tideEvents}
                                        riseM={day.tideRiseM}
                                        fallM={day.tideFallM}
                                    />
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </ForecastSlider>

            {summary ? (
                <div className={`mt-5 rounded-2xl border p-5 shadow-lg sm:p-6 ${overrideTone ? overrideTone.wrap : "border-transparent bg-white"}`}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0f5f74]">
                            <Sparkles className="h-3.5 w-3.5" />
                            Parte S4 · Hoy
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {overrideTone ? (
                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${overrideTone.badge}`}>
                                    {overrideTone.label}
                                </span>
                            ) : null}
                            {level?.label ? (
                                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${levelTone}`}>
                                    {level.label}
                                </span>
                            ) : null}
                        </div>
                    </div>

                    {override?.note ? (
                        <p className="mb-3 rounded-xl bg-black/5 px-3 py-2 text-sm text-slate-800">{override.note}</p>
                    ) : null}

                    <p className="text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">{summary}</p>
                    <p className="mt-3 text-[11px] text-slate-500">
                        Actualizado {updatedAtHuman?.split(" ")[1] || "—"} · Confirma con la webcam arriba antes de entrar
                    </p>
                    <SurfBriefReactions initial={reactions} />
                </div>
            ) : null}
        </div>
    );
}
