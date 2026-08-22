import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    ArrowRight,
    ArrowUp,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Clock,
    CloudSun,
    Gauge,
    TrendingDown,
    TrendingUp,
    Waves,
    Wind,
} from "lucide-react";
import SurfBriefParteToday from "./SurfBriefParteToday";
import { DEFAULT_METRIC_HELP, splitHelpParagraphs } from "./surfMetricHelp";

const TONE_TEXT = {
    green: "text-emerald-300",
    yellow: "text-amber-300",
    red: "text-rose-300",
};

/** Escala energía/kJ: toneKey viene del backend (`energyTone`). Solo clases Tailwind. */
export const ENERGY_TONE_PILL = {
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

export function DirectionArrow({ degrees, className = "" }) {
    if (degrees === null || degrees === undefined) return null;
    return (
        <ArrowUp
            className={className}
            style={{ transform: `rotate(${degrees + 180}deg)` }}
            aria-hidden
        />
    );
}

function HelpText({ text }) {
    const parts = splitHelpParagraphs(text);

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
        <span ref={wrapRef} className="block w-full min-w-0">
            <button
                ref={buttonRef}
                type="button"
                className={`group inline-flex w-full min-w-0 items-center text-left transition ${
                    compact ? "gap-1" : "gap-1.5"
                }`}
                aria-label={`Qué es ${label}. Pulsa para ver la explicación.`}
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
                <Icon
                    className={`shrink-0 text-cyan-400 ${
                        compact ? "h-3 w-3 md:h-3.5 md:w-3.5" : "h-3.5 w-3.5"
                    }`}
                    aria-hidden="true"
                />
                <span
                    className={`min-w-0 flex-1 truncate font-medium tracking-tight underline decoration-cyan-400/40 underline-offset-2 transition group-hover:text-cyan-100 group-hover:decoration-cyan-300 ${
                        open ? "text-cyan-100 decoration-cyan-300" : "text-slate-400"
                    }`}
                >
                    {displayLabel}
                </span>
                <span
                    className={`ml-auto inline-flex shrink-0 items-center justify-center rounded-full border font-semibold leading-none transition ${
                        compact
                            ? "h-4 w-4 text-[9px] md:h-[1.125rem] md:w-[1.125rem] md:text-[10px]"
                            : "h-[1.125rem] w-[1.125rem] text-[10px]"
                    } ${
                        open
                            ? "border-cyan-300 bg-cyan-500/30 text-cyan-50"
                            : "border-cyan-400/55 bg-cyan-500/15 text-cyan-200 group-hover:border-cyan-300 group-hover:bg-cyan-500/25 group-hover:text-cyan-50"
                    }`}
                    aria-hidden="true"
                >
                    ?
                </span>
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
            <p className={compact ? "text-[8px] text-slate-500 md:text-[11px]" : "text-xs text-slate-500 md:text-[11px]"}>
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
                                compact ? "text-[8px] md:text-[11px]" : "text-xs md:text-[11px]"
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
                            <span className={`font-medium ${isHigh ? "text-cyan-200/90" : "text-slate-400"}`}>
                                {isHigh ? "Alta" : "Baja"}
                            </span>
                            <span className="font-semibold tabular-nums text-slate-100">{event.hourLabel}</span>
                            <span className="font-medium tabular-nums text-slate-500">
                                {Number(event.heightM).toFixed(2)}m
                                {event.deltaM != null && Number.isFinite(Number(event.deltaM)) ? (
                                    <span className="text-slate-600">
                                        {" "}
                                        ({Number(event.deltaM) > 0 ? "+" : ""}
                                        {Number(event.deltaM).toFixed(2)}m)
                                    </span>
                                ) : null}
                            </span>
                        </div>
                    );
                })}
            </div>

            {(riseM !== null && riseM !== undefined) || (fallM !== null && fallM !== undefined) ? (
                <div
                    className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-t border-white/10 font-medium uppercase tracking-wide md:gap-x-3 ${
                        compact ? "pt-1 text-[7px] md:pt-1.5 md:text-[10px]" : "pt-1.5 text-[11px] md:text-[10px]"
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

/**
 * Slider horizontal: drag-to-scroll, flechas y difuminado en bordes.
 * Sin escala/fisheye — cards uniformes. Reutilizado por la tabla 9 días
 * y por {@see ./SurfDetailedForecastSlider}.
 *
 * @param {((el: HTMLElement | null) => void) | { current: HTMLElement | null }} [scrollerRef]
 * @param {(event: Event) => void} [onScroll]
 */
export function ForecastSlider({ children, scrollerRef: scrollerRefProp = null, onScroll = null }) {
    const scrollerRef = useRef(null);
    const onScrollRef = useRef(onScroll);
    onScrollRef.current = onScroll;
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

    const assignScrollerRef = useCallback(
        (node) => {
            scrollerRef.current = node;
            if (typeof scrollerRefProp === "function") {
                scrollerRefProp(node);
            } else if (scrollerRefProp && typeof scrollerRefProp === "object") {
                scrollerRefProp.current = node;
            }
        },
        [scrollerRefProp]
    );

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

        const handleScroll = (event) => {
            updateEdges();
            onScrollRef.current?.(event);
        };

        updateEdges();
        el.addEventListener("scroll", handleScroll, { passive: true });
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
            el.removeEventListener("scroll", handleScroll);
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
                ref={assignScrollerRef}
                className={`forecast-slider-scroll overflow-x-auto rounded-2xl border border-white/10 select-none ${
                    dragging ? "cursor-grabbing" : "cursor-grab"
                }`}
                style={{
                    scrollBehavior: dragging ? "auto" : "smooth",
                    touchAction: "pan-x",
                }}
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
    summarySections = null,
    summaryStatus = null,
    summaryMessage = null,
    updatedAtHuman,
    signal = null,
    reactions = null,
    onOpenFullForecast = null,
    onOpenDetailedTimeline = null,
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

    // Sticky métricas / día: compact ~3.5rem; cómodo ~5rem; md+ 9rem (w-36)
    const labelSticky = compact
        ? "sticky left-0 w-14 min-w-[3.5rem] md:w-36 md:min-w-[9rem]"
        : "sticky left-0 w-20 min-w-[5rem] md:w-36 md:min-w-[9rem]";
    const dayStickyLeft = compact ? "left-14 md:left-36" : "left-20 md:left-36";
    const cellPad = compact
        ? "px-0.5 py-1.5 md:px-3 md:py-3"
        : "px-1.5 py-2 md:px-3 md:py-3";
    const slotMin = compact
        ? "min-w-[1.55rem] md:min-w-[3.25rem]"
        : "min-w-[2.5rem] md:min-w-[3.25rem]";
    const tableMin = compact
        ? "min-w-[500px] md:min-w-[920px]"
        : "min-w-[720px] md:min-w-[920px]";
    const labelPad = compact ? "p-1 md:p-3" : "p-2.5 md:p-3";
    // Móvil: Compacto un pelín más denso; Cómodo más legible. md+ igual en ambos.
    const metricText = compact ? "text-[9px] md:text-xs" : "text-[12px] md:text-xs";
    const valueText = compact
        ? "text-[10px] font-semibold tabular-nums md:text-sm"
        : "text-[13px] font-semibold tabular-nums md:text-sm";
    const tableText = compact ? "text-[10px] md:text-sm" : "text-[13px] md:text-sm";
    const dayHeadText = compact
        ? "text-[9px] md:text-xs"
        : "text-[11px] md:text-xs";
    const hourHeadText = compact
        ? "text-[8px] md:text-[11px]"
        : "text-[11px] md:text-[11px]";
    const labelHeadText = compact
        ? "text-[9px] md:text-[11px]"
        : "text-[11px] md:text-[11px]";
    const iconSm = compact ? "h-2.5 w-2.5 md:h-4 md:w-4" : "h-3.5 w-3.5 md:h-4 md:w-4";

    return (
        <div className="rounded-3xl border border-cyan-500/20 bg-slate-900/60 p-3 shadow-xl backdrop-blur-sm sm:p-5 md:p-7">
            <div className="mb-3 flex flex-col gap-3 sm:mb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                <div className="flex min-w-0 flex-col gap-2">
                    <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-200 sm:px-3 sm:text-xs">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">Previsión {days.length} días · Zurriola</span>
                    </div>
                    {updatedAtHuman ? (
                        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-200">
                            <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                            Parte actualizado {updatedAtHuman}
                        </span>
                    ) : null}
                </div>

                <div className="flex w-full shrink-0 flex-col items-stretch gap-2 sm:w-auto sm:items-end">
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                        <button
                            type="button"
                            onClick={() => onOpenDetailedTimeline?.()}
                            title="Oleaje, sol, temperatura y probabilidad de lluvia cada 2 horas"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-500 sm:w-auto sm:px-3.5 sm:text-sm"
                        >
                            <CloudSun className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                            <span className="truncate">Ver forecast ampliado</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onOpenFullForecast?.()}
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-cyan-500 sm:w-auto sm:px-4 sm:text-sm"
                        >
                            <span className="truncate">Ver resumen por día</span>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden="true" />
                        </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 md:hidden">
                        <div
                            className="inline-flex rounded-lg border border-white/10 bg-slate-950/70 p-0.5"
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
                    </div>
                </div>
            </div>

            <ForecastSlider>
                <table className={`w-full border-collapse ${tableMin} ${tableText}`}>
                    <thead>
                        <tr>
                            <th
                                className={`${labelSticky} z-30 bg-slate-950 ${labelPad} text-left font-medium uppercase tracking-wide text-slate-500 ${labelHeadText}`}
                            >
                                &nbsp;
                            </th>
                            {days.map((day) => (
                                <th
                                    key={day.date}
                                    colSpan={day.slots.length}
                                    className={`sticky top-0 z-20 border-l border-white/10 bg-slate-950 ${dayStickyLeft} px-1 py-1.5 text-center font-semibold capitalize tracking-tight text-cyan-200/90 shadow-[0_1px_0_rgba(255,255,255,0.08)] md:px-3 md:py-2 ${dayHeadText}`}
                                >
                                    {day.dayLabel}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th
                                className={`${labelSticky} z-30 bg-slate-950 ${labelPad} text-left font-medium uppercase tracking-wide text-slate-500 ${labelHeadText}`}
                            >
                                Hora
                            </th>
                            {days.map((day) =>
                                day.slots.map((slot, idx) => (
                                    <th
                                        key={`${day.date}-${slot.time}`}
                                        className={`bg-slate-950/90 ${cellPad} ${slotMin} text-center font-medium tabular-nums text-slate-500 ${hourHeadText} ${
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
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText}`}>
                                <MetricInfo label="Oleaje" icon={Waves} help={help.oleaje} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <div className={`flex items-center justify-center gap-0.5 md:gap-1.5 ${valueText}`}>
                                        <DirectionArrow degrees={slot.waveDirectionDeg} className={`${iconSm} text-cyan-300`} />
                                        <span className="text-white">{slot.waveHeightM}m</span>
                                    </div>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText}`}>
                                <MetricInfo label="Periodo" icon={Clock} help={help.periodo} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <span className={`text-white ${valueText}`}>{slot.wavePeriodS}s</span>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText}`}>
                                <MetricInfo label="Energía/kJ" icon={Gauge} help={help.energia} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <span
                                        className={`inline-flex rounded-full font-semibold tabular-nums ring-1 ${
                                            compact
                                                ? "px-1 py-0 text-[8px] md:px-2.5 md:py-0.5 md:text-[12px]"
                                                : "px-1.5 py-0.5 text-[11px] md:px-2.5 md:py-0.5 md:text-[12px]"
                                        } ${ENERGY_TONE_PILL[slot.energyTone] || ENERGY_TONE_PILL.e0}`}
                                    >
                                        {slot.energyKj}
                                    </span>
                                )}
                            />
                        </tr>
                        <tr>
                            <td className={`${labelSticky} z-20 bg-slate-900 ${labelPad} ${metricText}`}>
                                <MetricInfo label="Viento" icon={Wind} help={help.viento} compact={compact} />
                            </td>
                            <SlotCells
                                days={days}
                                cellClass={`${cellPad} ${slotMin}`}
                                render={(slot) => (
                                    <div
                                        className={`flex items-center justify-center gap-0.5 md:gap-1 ${valueText} ${
                                            TONE_TEXT[slot.windTone] || TONE_TEXT.green
                                        }`}
                                    >
                                        <DirectionArrow degrees={slot.windDirectionDeg} className={iconSm} />
                                        <span>{slot.windSpeedKmh}</span>
                                        <span
                                            className={`font-normal opacity-60 ${
                                                compact ? "text-[7px] md:text-[10px]" : "text-[9px] md:text-[10px]"
                                            }`}
                                        >
                                            km/h
                                        </span>
                                    </div>
                                )}
                            />
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td
                                className={`${labelSticky} z-20 bg-slate-950 ${labelPad} font-medium uppercase tracking-wide text-slate-500 ${labelHeadText}`}
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

            <SurfBriefParteToday
                summary={summary}
                summarySections={summarySections}
                summaryStatus={summaryStatus}
                summaryMessage={summaryMessage}
                updatedAtHuman={updatedAtHuman}
                signal={signal}
                reactions={reactions}
            />
        </div>
    );
}
