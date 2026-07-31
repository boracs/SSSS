import React, { useRef, useState } from "react";
import { formatMonthYearMadridFromYearMonth } from "../../lib/madridTime";

function ym(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function startOfMonth(d) {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d, n) {
    return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addDaysToYmd(ymdStr, days) {
    const [y, m, d] = String(ymdStr || "")
        .split("-")
        .map(Number);
    if (!y || !m || !d) return ymdStr;
    const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    base.setUTCDate(base.getUTCDate() + Number(days || 0));
    return `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
}

function buildFilteredDayStats(dayStats, modalityFilter, todayStr) {
    const out = {};

    for (const [dateStr, stats] of Object.entries(dayStats || {})) {
        if (dateStr < todayStr) {
            out[dateStr] = {
                count_by_type: { particular: 0, grupal: 0, semanal: 0 },
                is_vip: false,
                items: [],
                total: 0,
            };
            continue;
        }

        let items = Array.isArray(stats?.items) ? stats.items : [];

        if (modalityFilter === "grupal") {
            items = items.filter((p) => p.t === "grupal" && !p.vip);
        } else if (modalityFilter === "semanal") {
            items = items.filter((p) => p.t === "semanal");
        } else if (modalityFilter === "vip") {
            items = items.filter((p) => p.vip || p.t === "vip");
        } else {
            items = items.filter((p) => p.t !== "particular");
        }

        out[dateStr] = {
            count_by_type: {
                particular: 0,
                grupal: items.filter((p) => p.t === "grupal" && !p.vip).length,
                semanal: items.filter((p) => p.t === "semanal").length,
            },
            is_vip: items.some((p) => p.vip || p.t === "vip"),
            items,
            total: items.length,
        };
    }

    return out;
}

export default function StudentCalendar({
    monthDate,
    selectedDate,
    onSelectDay,
    onNavigateMonth,
    dayStats = {},
    mySignalsByDate = {},
    todayStr,
    modalityFilter = "all",
}) {
    const wrapRef = useRef(null);
    const [hover, setHover] = useState(null);

    const hideTooltip = () => setHover(null);

    const showTooltip = (dateStr, anchorEl, mode = "cell") => {
        const stats = dayStats?.[dateStr];
        const items = stats?.items || [];
        const hasAny = (stats?.total || 0) > 0;
        if (!hasAny) return;

        const anchorRect = anchorEl?.getBoundingClientRect?.();
        const wrapRect = wrapRef.current?.getBoundingClientRect?.();
        if (!anchorRect || !wrapRect) return;

        const raw = mode === "overflow" ? items.slice(3) : items;
        const list = raw.slice(0, 8);

        // Posicionamiento (clamp) para no cortar en bordes.
        const tooltipW = 220;
        const tooltipH = 34 + list.length * 18;
        const gap = 10;

        let left =
            anchorRect.left -
            wrapRect.left +
            anchorRect.width / 2 -
            tooltipW / 2;
        left = Math.max(8, Math.min(left, wrapRect.width - tooltipW - 8));

        let top = anchorRect.top - wrapRect.top - tooltipH - gap;
        const placeBelow = top < 8;
        if (placeBelow) top = anchorRect.bottom - wrapRect.top + gap;

        setHover({
            dateStr,
            mode,
            list,
            left,
            top,
            placeBelow,
        });
    };
    const monthStart = startOfMonth(monthDate);
    const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
    );
    const firstDow = (monthStart.getDay() + 6) % 7; // lunes=0
    const totalCells = Math.ceil((firstDow + monthEnd.getDate()) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstDow + 1;
        const inMonth = dayNum >= 1 && dayNum <= monthEnd.getDate();
        const d = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            dayNum,
        );
        const key = ymd(d);
        const stats = dayStats[key] || null;
        cells.push({ key, inMonth, dayNum, dateStr: key, stats });
    }

    const title = formatMonthYearMadridFromYearMonth(
        monthStart.getFullYear(),
        monthStart.getMonth() + 1,
    );
    const week = ["L", "M", "X", "J", "V", "S", "D"];

    const labelFor = (p) => {
        const base =
            p.t === "particular"
                ? "Particular"
                : p.t === "semanal"
                  ? "Semanal"
                  : "Grupal";
        const level =
            p.level === "avanzado"
                ? "Avanzado"
                : p.level === "intermedio"
                  ? "Intermedio"
                  : "Iniciación";
        return p.vip ? `${level} (VIP)` : base;
    };

    const dotClass = (p) => {
        if (p.vip) return "bg-rose-500 ring-1 ring-rose-700/50";
        if (p.t === "particular") return "bg-red-500";
        if (p.t === "semanal") return "bg-sky-500";
        return "bg-emerald-500";
    };

    const isConsecutive = (a, b) => {
        if (!a || !b) return false;
        const da = new Date(a + "T12:00:00");
        const db = new Date(b + "T12:00:00");
        const diff = (db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24);
        return diff === 1;
    };

    return (
        <div
            ref={wrapRef}
            className="relative rounded-2xl border border-amber-500/20 bg-slate-900/90 p-4 shadow-lg shadow-black/20"
        >
            {hover && (
                <div
                    className="pointer-events-none absolute z-[200] w-[220px] rounded-lg bg-gray-900/95 p-3 text-white shadow-lg backdrop-blur-sm"
                    style={{ left: hover.left, top: hover.top }}
                    role="tooltip"
                >
                    <div
                        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-gray-900/95 ${hover.placeBelow ? "-top-1" : "-bottom-1"}`}
                        aria-hidden
                    />
                    <div className="space-y-1">
                        {hover.list.map((p, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 text-xs leading-none"
                            >
                                <span
                                    className={`h-2 w-2 rounded-full ${dotClass(p)}`}
                                />
                                <span className="font-semibold tabular-nums">
                                    {p.time}
                                </span>
                                <span className="text-white/90">
                                    - {labelFor(p)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => onNavigateMonth(-1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-200 transition-all duration-300 hover:bg-slate-800"
                    aria-label="Mes anterior"
                >
                    ←
                </button>
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-300">
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={() => onNavigateMonth(1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-200 transition-all duration-300 hover:bg-slate-800"
                    aria-label="Mes siguiente"
                >
                    →
                </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-xs font-bold uppercase tracking-widest text-slate-500">
                {week.map((w) => (
                    <div key={w} className="text-center">
                        {w}
                    </div>
                ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
                {cells.map((c, idx) => {
                    const selected = c.dateStr === selectedDate;
                    const isPast =
                        c.inMonth && todayStr && c.dateStr < todayStr;
                    const disabled = !c.inMonth || isPast;

                    const items = c.stats?.items || [];
                    const total = c.stats?.total || 0;
                    const pills = items.slice(0, 3);
                    const overflow = total > 3 ? total - 3 : 0;

                    const showGrupalDot =
                        modalityFilter === "all" || modalityFilter === "grupal";
                    const showSemanalDot =
                        modalityFilter === "all" || modalityFilter === "semanal";
                    const showVipDot =
                        modalityFilter === "all" || modalityFilter === "vip";

                    const hasWeekly =
                        (c.stats?.count_by_type?.semanal || 0) > 0;
                    const prev = cells[idx - 1];
                    const next = cells[idx + 1];
                    const connectLeft =
                        hasWeekly &&
                        idx % 7 !== 0 &&
                        (prev?.stats?.count_by_type?.semanal || 0) > 0 &&
                        isConsecutive(prev?.dateStr, c.dateStr);
                    const connectRight =
                        hasWeekly &&
                        idx % 7 !== 6 &&
                        (next?.stats?.count_by_type?.semanal || 0) > 0 &&
                        isConsecutive(c.dateStr, next?.dateStr);

                    const pillClass = (t, vip) => {
                        if (vip) return "bg-rose-500 ring-1 ring-rose-700/50";
                        if (t === "particular") return "bg-red-500";
                        if (t === "semanal") return "bg-sky-500";
                        return "bg-emerald-500"; // grupal
                    };

                    return (
                        <button
                            key={c.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                if (!disabled) onSelectDay(c.dateStr);
                            }}
                            onMouseEnter={(e) => {
                                if (!disabled) {
                                    showTooltip(c.dateStr, e.currentTarget, "cell");
                                }
                            }}
                            onMouseLeave={hideTooltip}
                            onFocus={(e) => {
                                if (!disabled) {
                                    showTooltip(c.dateStr, e.currentTarget, "cell");
                                }
                            }}
                            onBlur={hideTooltip}
                            className={[
                                "relative h-11 rounded-xl border text-sm font-medium transition-all duration-300 ease-in-out",
                                disabled
                                    ? isPast
                                        ? "cursor-not-allowed border-slate-900/80 bg-slate-950/50 text-slate-600"
                                        : "border-slate-900 text-slate-700"
                                    : "cursor-pointer border-slate-800 text-slate-200 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-800/80",
                                selected && !isPast
                                    ? "bg-teal-600 text-white ring-4 ring-teal-500/25 shadow-[0_8px_20px_rgba(20,184,166,0.35)]"
                                    : !disabled
                                      ? "bg-slate-900"
                                      : "",
                            ].join(" ")}
                        >
                            <span className="absolute left-2 top-2 text-xs">
                                {c.inMonth ? c.dayNum : ""}
                            </span>
                            {/* Estado alumno (solicitud/pago) */}
                            {(() => {
                                const sig = mySignalsByDate?.[c.dateStr];
                                if (!sig) return null;
                                if (sig.rejected) {
                                    return (
                                        <span
                                            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500"
                                            title="Pago rechazado"
                                        />
                                    );
                                }
                                if (sig.verifying) {
                                    return (
                                        <span
                                            className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-[#00D1FF]"
                                            title="Verificando tu pago..."
                                        />
                                    );
                                }
                                if (sig.pending) {
                                    return (
                                        <span
                                            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400"
                                            title="Solicitud enviada / Pendiente de pago"
                                        />
                                    );
                                }
                                return null;
                            })()}
                            <div className="absolute bottom-1.5 left-2 right-2 flex items-end gap-1">
                                {!isPast ? (
                                    <>
                                        <div className="flex w-full items-center justify-between sm:hidden">
                                            {showGrupalDot &&
                                                c.stats?.count_by_type?.grupal > 0 && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                )}
                                            {showSemanalDot &&
                                                c.stats?.count_by_type?.semanal > 0 && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                                )}
                                            {showVipDot && c.stats?.is_vip && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-1 ring-rose-700/50" />
                                            )}
                                        </div>
                                        <div className="hidden w-full items-center justify-center gap-1.5 sm:flex">
                                            {showGrupalDot &&
                                                c.stats?.count_by_type?.grupal > 0 && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                )}
                                            {showSemanalDot &&
                                                c.stats?.count_by_type?.semanal > 0 && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                                                )}
                                            {showVipDot && c.stats?.is_vip && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 ring-1 ring-rose-700/50" />
                                            )}
                                            {overflow > 0 && (
                                                <span
                                                    className="ml-1 cursor-pointer text-[9px] font-semibold text-slate-400"
                                                    onMouseEnter={(e) => {
                                                        e.stopPropagation();
                                                        showTooltip(
                                                            c.dateStr,
                                                            e.currentTarget.closest(
                                                                "button",
                                                            ),
                                                            "overflow",
                                                        );
                                                    }}
                                                >
                                                    +{overflow}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                ) : null}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export { ym, ymd, startOfMonth, addMonths, addDaysToYmd, buildFilteredDayStats };
