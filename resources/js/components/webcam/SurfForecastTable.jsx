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
import { surfBriefOverrideMeta } from "./surfBriefOverride";

const TONE_TEXT = {
    green: "text-emerald-300",
    yellow: "text-amber-300",
    red: "text-rose-300",
};

/** Escala energía/kJ: toneKey viene del backend (`energyTone`). Solo clases Tailwind. */
const ENERGY_TONE_PILL = {
    e0: "bg-transparent text-slate-400 ring-transparent",
    e1: "bg-emerald-500/10 text-emerald-200/80 ring-emerald-400/15",
    e2: "bg-emerald-500/15 text-emerald-200/90 ring-emerald-400/25",
    e3: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/30",
    e4: "bg-emerald-500/30 text-emerald-100 ring-emerald-400/40",
    e5: "bg-emerald-500/40 text-emerald-50 ring-emerald-300/45",
    e6: "bg-emerald-500/50 text-emerald-50 ring-emerald-300/55",
    e7: "bg-emerald-400/55 text-white ring-emerald-200/50",
    e8: "bg-lime-400/45 text-lime-50 ring-lime-200/55",
    e9: "bg-lime-400/35 text-amber-100 ring-amber-300/40",
    e10: "bg-amber-400/30 text-amber-100 ring-amber-300/45",
    e11: "bg-amber-400/45 text-amber-50 ring-amber-200/50",
    e12: "bg-orange-500/45 text-orange-50 ring-orange-300/50",
    e13: "bg-rose-500/45 text-rose-50 ring-rose-300/50",
    e14: "bg-rose-600/65 text-white ring-rose-200/60",
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
        "Qué es: índice de punch del oleaje (convención tipo apps), sobre Open-Meteo — no es un dato oficial de Surf-Forecast.\n\nFórmula: kJ ≈ factor × 0.5 × H² × T (H en pies; factor S4 ≈ 2.4). Usamos ola combinada (wave).\n\nUmbrales S4 (orientativos): <50 intermedio escaso / avanzado no merece la pena; ~70–80 avanzado ya posible; ≥100 pueden surfear todos.\n\nEl color del valor indica intensidad relativa del oleaje (kJ).",
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

function MetricInfo({ label, icon: Icon, help, compact = false }) {
    const [open, setOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 320 });
    const wrapRef = useRef(null);
    const buttonRef = useRef(null);
    const panelRef = useRef(null);
    const closeTimerRef = useRef(null);
    const instanceId = useId();
    const panelId = `${instanceId}-panel`;
    const helpText = help || "";
    const displayLabel = compact && label.startsWith("Energía") ? "Energía" : label;

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
        <span ref={wrapRef} className={`inline-flex min-w-0 items-center ${compact ? "gap-0.5 md:gap-1.5" : "gap-1 md:gap-1.5"}`}>
            <Icon className={`shrink-0 text-cyan-400 ${compact ? "h-3 w-3 md:h-3.5 md:w-3.5" : "h-3.5 w-3.5"}`} />
            <span className="min-w-0 truncate">{displayLabel}</span>
            <button
                ref={buttonRef}
                type="button"
                className={`inline-flex shrink-0 items-center justify-center rounded-full border transition ${
                    compact ? "h-3.5 w-3.5 md:h-4 md:w-4" : "h-4 w-4"
                } ${
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
                <Info className={compact ? "h-2 w-2 md:h-2.5 md:w-2.5" : "h-2.5 w-2.5"} strokeWidth={2.5} />
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

function TideDayCell({ events, riseM, fallM, compact }) {
    if (!events?.length) {
        return (
            <p className={compact ? "text-[9px] text-slate-500 md:text-[11px]" : "text-[11px] text-slate-500"}>
                Sin datos de marea
            </p>
        );
    }

    return (
        <div className={`flex flex-col items-stretch py-0.5 ${compact ? "gap-1 md:gap-2" : "gap-2"}`}>
            <div className={`grid grid-cols-2 ${compact ? "gap-x-1.5 gap-y-1 md:gap-x-3 md:gap-y-1.5" : "gap-x-3 gap-y-1.5"}`}>
                {events.map((event, idx) => {
                    const isHigh = event.type === "alta";
                    return (
                        <div
                            key={`${event.hourLabel}-${idx}`}
                            className={`inline-flex min-w-0 items-center justify-center gap-0.5 whitespace-nowrap md:gap-1 ${
                                compact ? "text-[9px] md:text-[11px]" : "text-[11px]"
                            }`}
                        >
                            {isHigh ? (
                                <TrendingUp
                                    className={`shrink-0 text-cyan-300 ${compact ? "h-2.5 w-2.5 md:h-3 md:w-3" : "h-3 w-3"}`}
                                    aria-hidden
                                />
                            ) : (
                                <TrendingDown
                                    className={`shrink-0 text-slate-400 ${compact ? "h-2.5 w-2.5 md:h-3 md:w-3" : "h-3 w-3"}`}
                                    aria-hidden
                                />
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
                <div
                    className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t border-white/10 font-semibold uppercase tracking-wide md:gap-x-3 ${
                        compact ? "pt-1 text-[8px] md:pt-1.5 md:text-[10px]" : "pt-1.5 text-[10px]"
                    }`}
                >
                    {riseM !== null && riseM !== undefined ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-300 md:gap-1">
                            <TrendingUp className={compact ? "h-2.5 w-2.5 md:h-3 md:w-3" : "h-3 w-3"} />
                            Sube +{riseM}m
                        </span>
                    ) : null}
                    {fallM !== null && fallM !== undefined ? (
                        <span className="inline-flex items-center gap-0.5 text-rose-300 md:gap-1">
                            <TrendingDown className={compact ? "h-2.5 w-2.5 md:h-3 md:w-3" : "h-3 w-3"} />
                            Baja −{fallM}m
                        </span>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

function SlotCells({ days, render, cellClass }) {
    return days.map((day) =>
        day.slots.map((slot, idx) => (
            <td
                key={`${day.date}-${slot.time}`}
                className={`text-center ${cellClass} ${idx === 0 ? "border-l border-white/10" : ""}`}
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
                className="absolute left-1 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/90 text-cyan-100 shadow-lg backdrop-blur-sm transition hover:border-cyan-300/60 hover:bg-slate-900 hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:left-2 sm:h-10 sm:w-10"
            >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
                type="button"
                onClick={() => scrollByPage(1)}
                disabled={!canRight}
                aria-label="Desplazar previsión a la derecha"
                className="absolute right-1 top-1/2 z-40 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-400/30 bg-slate-950/90 text-cyan-100 shadow-lg backdrop-blur-sm transition hover:border-cyan-300/60 hover:bg-slate-900 hover:text-white disabled:pointer-events-none disabled:opacity-0 sm:right-2 sm:h-10 sm:w-10"
            >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
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
    summaryStatus = null,
    summaryMessage = null,
    updatedAtHuman,
    signal = null,
    reactions = null,
}) {
    /** Solo afecta densidad en <md; en desktop se fuerza legibilidad vía clases md: */
    const [mobileDensity, setMobileDensity] = useState("compact");
    const [isMdUp, setIsMdUp] = useState(() =>
        typeof window !== "undefined" && window.matchMedia
            ? window.matchMedia("(min-width: 768px)").matches
            : false
    );

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return undefined;
        const mq = window.matchMedia("(min-width: 768px)");
        const sync = () => setIsMdUp(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    if (!days?.length) {
        return null;
    }

    const compact = !isMdUp && mobileDensity === "compact";
    const help = {
        ...DEFAULT_METRIC_HELP,
        ...(metricHelp && typeof metricHelp === "object" ? metricHelp : {}),
    };

    const signalMeta = signal?.status ? surfBriefOverrideMeta(signal.status) : null;

    // Sticky métricas / día: compact ~3.5rem; cómodo ~5rem; md+ 9rem (w-36)
    const labelSticky = compact
        ? "sticky left-0 w-14 min-w-[3.5rem] md:w-36 md:min-w-[9rem]"
        : "sticky left-0 w-20 min-w-[5rem] md:w-36 md:min-w-[9rem]";
    const dayStickyLeft = compact ? "left-14 md:left-36" : "left-20 md:left-36";
    const cellPad = compact
        ? "px-0.5 py-1.5 md:px-3 md:py-3"
        : "px-1.5 py-2 md:px-3 md:py-3";
    const slotMin = compact
        ? "min-w-[1.65rem] md:min-w-[3.25rem]"
        : "min-w-[2.35rem] md:min-w-[3.25rem]";
    const tableMin = compact
        ? "min-w-[520px] md:min-w-[920px]"
        : "min-w-[680px] md:min-w-[920px]";
    const labelPad = compact ? "p-1.5 md:p-3" : "p-2 md:p-3";
    const metricText = compact ? "text-[10px] md:text-xs" : "text-[11px] md:text-xs";
    const valueText = compact ? "text-[11px] md:text-sm" : "text-xs md:text-sm";
    const iconSm = compact ? "h-3 w-3 md:h-4 md:w-4" : "h-3.5 w-3.5 md:h-4 md:w-4";

    return (
        <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-3 shadow-xl backdrop-blur-sm sm:p-5 md:p-7">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3 sm:mb-4">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Previsión {days.length} días · Zurriola
                    </div>
                    <p className="mt-2 text-xs text-slate-400 sm:text-sm">
                        Flechas o desliza · pulsa la <span className="text-cyan-300">i</span> para el criterio del spot
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <div
                        className="inline-flex rounded-lg border border-white/10 bg-slate-950/70 p-0.5 md:hidden"
                        role="group"
                        aria-label="Densidad de la previsión"
                    >
                        <button
                            type="button"
                            aria-pressed={compact}
                            onClick={() => setMobileDensity("compact")}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                                compact
                                    ? "bg-cyan-500/25 text-cyan-100"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            Compacto
                        </button>
                        <button
                            type="button"
                            aria-pressed={!compact}
                            onClick={() => setMobileDensity("comfy")}
                            className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                                !compact
                                    ? "bg-cyan-500/25 text-cyan-100"
                                    : "text-slate-400 hover:text-slate-200"
                            }`}
                        >
                            Cómodo
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500">Horas de luz · cada 3h</p>
                </div>
            </div>

            <ForecastSlider>
                <table className={`w-full border-collapse ${tableMin} ${compact ? "text-[11px] md:text-sm" : "text-xs md:text-sm"}`}>
                    <thead>
                        <tr>
                            <th
                                className={`${labelSticky} z-30 bg-slate-950 ${labelPad} text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 md:text-[11px]`}
                            >
                                &nbsp;
                            </th>
                            {days.map((day) => (
                                <th
                                    key={day.date}
                                    colSpan={day.slots.length}
                                    className={`sticky top-0 z-20 border-l border-white/10 bg-slate-950 ${dayStickyLeft} px-1 py-1.5 text-center text-[10px] font-bold capitalize text-cyan-200 shadow-[0_1px_0_rgba(255,255,255,0.08)] md:px-3 md:py-2 md:text-xs`}
                                >
                                    {day.dayLabel}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th
                                className={`${labelSticky} z-30 bg-slate-950 ${labelPad} text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500 md:text-[11px]`}
                            >
                                Hora
                            </th>
                            {days.map((day) =>
                                day.slots.map((slot, idx) => (
                                    <th
                                        key={`${day.date}-${slot.time}`}
                                        className={`bg-slate-950/90 ${cellPad} ${slotMin} text-center text-[9px] font-semibold tabular-nums text-slate-400 md:text-[11px] ${
                                            idx === 0 ? "border-l border-white/10" : ""
                                        }`}
                                    >
                                        {slot.hourLabel}
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        <tr>
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText} font-semibold text-slate-300`}>
                                <MetricInfo label="Oleaje" icon={Waves} help={help.oleaje} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <div className={`flex items-center justify-center gap-0.5 md:gap-1.5 ${valueText}`}>
                                        <DirectionArrow degrees={slot.waveDirectionDeg} className={`${iconSm} text-cyan-300`} />
                                        <span className="font-bold tabular-nums text-white">{slot.waveHeightM}m</span>
                                    </div>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText} font-semibold text-slate-300`}>
                                <MetricInfo label="Periodo" icon={Clock} help={help.periodo} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <span className={`font-bold tabular-nums text-white ${valueText}`}>{slot.wavePeriodS}s</span>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText} font-semibold text-slate-300`}>
                                <MetricInfo label="Energía/kJ" icon={Gauge} help={help.energia} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <span
                                        className={`inline-flex rounded-full font-bold ring-1 ${
                                            compact
                                                ? "px-1 py-0 text-[9px] md:px-2.5 md:py-0.5 md:text-[12px]"
                                                : "px-1.5 py-0.5 text-[10px] md:px-2.5 md:text-[12px]"
                                        } ${ENERGY_TONE_PILL[slot.energyTone] || ENERGY_TONE_PILL.e0}`}
                                    >
                                        {slot.energyKj}
                                    </span>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText} font-semibold text-slate-300`}>
                                <MetricInfo label="Viento" icon={Wind} help={help.viento} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <div
                                        className={`flex items-center justify-center gap-0.5 font-bold md:gap-1 ${valueText} ${
                                            TONE_TEXT[slot.windTone] || TONE_TEXT.green
                                        }`}
                                    >
                                        <DirectionArrow degrees={slot.windDirectionDeg} className={iconSm} />
                                        <span className="tabular-nums">{slot.windSpeedKmh}</span>
                                        <span className="text-[8px] font-medium opacity-70 md:text-[10px]">km/h</span>
                                    </div>
                                )}
                            />
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td
                                className={`${labelSticky} z-20 bg-slate-950 ${labelPad} text-[9px] font-semibold uppercase tracking-wide text-slate-500 md:text-[11px]`}
                            >
                                <MetricInfo label="Marea" icon={TrendingUp} help={help.marea} compact={compact} />
                            </td>
                            {days.map((day) => (
                                <td
                                    key={`tide-${day.date}`}
                                    colSpan={day.slots.length}
                                    className={`border-l border-t border-white/10 bg-slate-950/60 text-center ${
                                        compact ? "px-1 py-2 md:px-3 md:py-3" : "px-2 py-2.5 md:px-3 md:py-3"
                                    }`}
                                >
                                    <TideDayCell
                                        events={day.tideEvents}
                                        riseM={day.tideRiseM}
                                        fallM={day.tideFallM}
                                        compact={compact}
                                    />
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </ForecastSlider>

            {summary ? (
                <div className={`mt-4 rounded-2xl border p-4 shadow-lg sm:mt-5 sm:p-5 md:p-6 ${signalMeta ? signalMeta.tableWrap : "border-transparent bg-white"}`}>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#0f5f74]">
                            <Sparkles className="h-3.5 w-3.5" />
                            Parte S4 · Hoy
                        </div>
                        {signalMeta ? (
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${signalMeta.tableBadge}`}>
                                {signalMeta.badge}
                                {signal?.is_manual ? (
                                    <span className="ml-1.5 opacity-80">· S4</span>
                                ) : null}
                            </span>
                        ) : null}
                    </div>

                    {signal?.note ? (
                        <p className="mb-3 rounded-xl bg-black/5 px-3 py-2 text-sm text-slate-800">{signal.note}</p>
                    ) : null}

                    <p className="text-sm font-semibold leading-relaxed text-slate-900 sm:text-base">{summary}</p>
                    <p className="mt-3 text-[11px] text-slate-500">
                        Actualizado {updatedAtHuman?.split(" ")[1] || "—"} · Confirma con la webcam arriba antes de entrar
                    </p>
                    <SurfBriefReactions initial={reactions} />
                </div>
            ) : (
                <div className="mt-4 rounded-2xl border border-cyan-500/20 bg-slate-950/50 p-4 sm:mt-5 sm:p-5 md:p-6">
                    <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-300/90">
                        <Sparkles className="h-3.5 w-3.5" />
                        Parte S4 · Hoy
                    </div>
                    <p className="mt-3 text-sm font-medium text-slate-200">
                        {summaryStatus === "generating"
                            ? summaryMessage || "Generando el parte de hoy…"
                            : "El parte de hoy aún no está disponible."}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">
                        {summaryStatus === "generating"
                            ? "Recarga la página en unos segundos. Si sigue vacío, ejecuta el comando de generación (ver docs)."
                            : "Consulta la webcam o regenera el parte si eres admin."}
                    </p>
                </div>
            )}
        </div>
    );
}
