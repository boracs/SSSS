import React, { useMemo, useState, useEffect, useRef } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import SurfTripFab from "../../components/SurfTripFab";
import PaymentModal from "../../components/PaymentModal";
import {
    formatLongDateLabelMadrid,
    formatMonthYearMadridFromYearMonth,
    formatTimeMadrid,
    todayYmdInMadrid,
    toYmdInMadrid,
} from "../../lib/madridTime";

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-xl border border-gray-700 bg-gray-800 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
            <div className="h-4 w-20 rounded-full bg-gray-700" />
            <div className="mt-2 h-5 w-3/4 rounded bg-gray-700" />
            <div className="mt-2 flex gap-1.5">
                <div className="h-7 w-7 rounded-full bg-gray-700" />
                <div className="h-7 w-7 rounded-full bg-gray-700" />
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-700" />
        </div>
    );
}

function emptyParticipant() {
    return { first_name: "", last_name: "" };
}

function BookingModal({
    open,
    lesson,
    onClose,
    onConfirm,
    processing = false,
    bookerFirstName = "",
    bookerLastName = "",
}) {
    const [participants, setParticipants] = useState([emptyParticipant()]);
    const [ageBracket, setAgeBracket] = useState("adult");

    useEffect(() => {
        if (!open) return;
        setParticipants([
            {
                first_name: String(bookerFirstName || "").trim(),
                last_name: String(bookerLastName || "").trim(),
            },
        ]);
        setAgeBracket("adult");
    }, [open, lesson?.id, bookerFirstName, bookerLastName]);

    if (!open || !lesson) return null;

    const quantity = participants.length;
    const total = Number(lesson.total_students || 0);
    const maxSlots = Number(lesson.max_slots || 6);
    const standardCap = 6;
    const wouldExceedStandard = total + quantity > standardCap;
    const requestExtra = wouldExceedStandard;

    const hasAdults = !!lesson?.age_mix?.has_adults;
    const hasChildren = !!lesson?.age_mix?.has_children;
    const ageConflict =
        ageBracket !== "family" &&
        ((ageBracket === "children" && hasAdults) ||
            (ageBracket === "adult" && hasChildren));

    const participantsValid = participants.every(
        (p) =>
            String(p.first_name || "").trim() !== "" &&
            String(p.last_name || "").trim() !== "",
    );

    const addParticipant = () => {
        if (participants.length >= 6) return;
        setParticipants((prev) => [...prev, emptyParticipant()]);
    };

    const removeParticipant = (index) => {
        if (participants.length <= 1) return;
        setParticipants((prev) => prev.filter((_, i) => i !== index));
    };

    const updateParticipant = (index, field, value) => {
        setParticipants((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row,
            ),
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-brand-deep/70 backdrop-blur-md"
                onClick={onClose}
                aria-hidden
            />
            <div className="relative max-h-[92vh] w-full max-w-[80vw] overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-[#0d234d] to-[#0f2d5c] p-5 shadow-2xl lg:p-7 xl:max-w-[1200px]">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h3 className="font-heading text-xl font-bold tracking-tight text-white">
                            Reserva grupal
                        </h3>
                        <p className="mt-1 text-sm text-white/80">
                            Añade a cada persona del grupo. Un solo pago cubre
                            todas las plazas (Stripe).
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Cerrar"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6">
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
                                Datos del grupo
                            </div>
                            <div className="mt-3 space-y-4">
                                <div>
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-xs font-semibold uppercase tracking-wide text-white/80">
                                            Personas del grupo ({quantity}/6)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addParticipant}
                                            disabled={participants.length >= 6}
                                            className="text-xs font-semibold text-sky-200 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                        >
                                            + Añadir
                                        </button>
                                    </div>
                                    <p className="mt-1 text-[11px] text-white/60">
                                        Tú realizas un único pago por todo el
                                        grupo.
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {participants.map((row, idx) => (
                                            <div
                                                key={`participant-${idx}`}
                                                className="rounded-xl border border-white/10 bg-[#0f1b34]/80 p-3"
                                            >
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Nombre"
                                                        value={row.first_name}
                                                        onChange={(e) =>
                                                            updateParticipant(
                                                                idx,
                                                                "first_name",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="input-focus-ring w-full rounded-lg border border-white/20 bg-[#0a1428] px-3 py-2 text-sm text-white placeholder:text-white/40"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder="Apellidos"
                                                        value={row.last_name}
                                                        onChange={(e) =>
                                                            updateParticipant(
                                                                idx,
                                                                "last_name",
                                                                e.target.value,
                                                            )
                                                        }
                                                        className="input-focus-ring w-full rounded-lg border border-white/20 bg-[#0a1428] px-3 py-2 text-sm text-white placeholder:text-white/40"
                                                    />
                                                </div>
                                                {participants.length > 1 ? (
                                                    <div className="mt-2 flex justify-end">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeParticipant(
                                                                    idx,
                                                                )
                                                            }
                                                            className="text-xs font-semibold text-rose-200 hover:text-rose-100"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </div>
                                                ) : null}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wide text-white/80">
                                        Rango de Edad del Grupo
                                    </label>
                                    <select
                                        value={ageBracket}
                                        onChange={(e) =>
                                            setAgeBracket(e.target.value)
                                        }
                                        className="input-focus-ring mt-2 w-full rounded-xl border border-white/20 bg-[#0f1b34] px-4 py-2.5 text-sm text-white"
                                    >
                                        <option value="children">
                                            👦 Niños (7-11 años)
                                        </option>
                                        <option value="adult">
                                            🏄‍♂️ Adultos / Jóvenes (+12 años)
                                        </option>
                                        <option value="family">
                                            👨‍👩‍👧‍👦 Familia (Mezcla - Clase Especial)
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-sm text-white/90">
                            <div className="text-xs font-semibold uppercase tracking-wider text-white/80">
                                Condiciones
                            </div>
                            <p className="mt-3">
                                El precio se mantiene, pero al ser un grupo
                                mayor, el servicio mejorará con atención
                                personalizada de dos monitores tras nuestra
                                confirmación.
                            </p>
                        </div>

                        {ageConflict && (
                            <div className="rounded-2xl border border-amber-300/50 bg-amber-500/15 px-4 py-3 text-xs font-medium text-amber-100">
                                Este grupo ya cuenta con alumnos de otra franja.
                                Por seguridad y autonomía, te sugerimos buscar
                                una sesión compatible o contactarnos.
                            </div>
                        )}

                        {requestExtra && (
                            <div className="rounded-2xl border border-sky-300/50 bg-sky-500/15 px-4 py-3 text-xs font-medium text-sky-100">
                                Superáis las {standardCap} plazas estándar por monitor.
                                La solicitud quedará pendiente hasta que un administrador
                                confirme que hay cupo y monitor disponible.
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/20"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={processing || ageConflict || !participantsValid}
                        onClick={() =>
                            onConfirm({
                                quantity,
                                ageBracket,
                                requestExtra,
                                participants: participants.map((p) => ({
                                    first_name: String(p.first_name || "").trim(),
                                    last_name: String(p.last_name || "").trim(),
                                })),
                            })
                        }
                        className="inline-flex min-w-[190px] items-center justify-center rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing
                            ? "Procesando..."
                            : requestExtra
                              ? "Solicitar permiso admin"
                              : "Continuar al pago"}
                    </button>
                </div>
            </div>
        </div>
    );
}

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

const MODALITY_FILTER_OPTIONS = [
    { id: "all", label: "Todas", dot: null },
    { id: "grupal", label: "Grupales", dot: "bg-emerald-500" },
    { id: "semanal", label: "Semanales", dot: "bg-sky-500" },
    { id: "vip", label: "VIP", dot: "bg-rose-500 ring-1 ring-rose-700/50" },
];

const FUTURE_DAYS_BATCH = 10;
const INITIAL_VISIBLE_DAYS = 3;
const DAYS_LOAD_STEP = 3;

function CalendarCommander({
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

            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-400">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 ring-1 ring-slate-700/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    Solicitud enviada
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 ring-1 ring-slate-700/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#00D1FF]" />
                    Verificando pago
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 ring-1 ring-slate-700/80">
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                    Pago rechazado
                </span>
            </div>
        </div>
    );
}

const DESCRIPTION_FALLBACK =
    "Sesión técnica de surf sin descripción adicional.";

const LevelStyleMap = {
    iniciacion:
        "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
    intermedio: "border border-sky-500/25 bg-sky-500/10 text-sky-300",
    avanzado: "border border-rose-500/25 bg-rose-500/10 text-rose-300",
};

const LevelAccentMap = {
    iniciacion: "from-emerald-400 to-emerald-600",
    intermedio: "from-sky-400 to-cyan-500",
    avanzado: "from-rose-400 to-orange-500",
};

const ModalityMap = {
    particular: { icon: "🔒", label: "Privada (1-6 pax)", chip: "border-violet-500/25 bg-violet-500/10 text-violet-200" },
    grupal: { icon: "👥", label: "Clase Abierta", chip: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200" },
    semanal: { icon: "🗓️", label: "Curso Semanal", chip: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200" },
    vip: { icon: "⭐", label: "VIP", chip: "border-rose-500/25 bg-rose-500/10 text-rose-200" },
};

function splitDayLabel(dayStr) {
    const long = formatLongDateLabelMadrid(dayStr);
    const commaIdx = long.indexOf(",");
    if (commaIdx === -1) {
        return { weekday: "", dateLine: long };
    }
    return {
        weekday: long.slice(0, commaIdx).trim(),
        dateLine: long.slice(commaIdx + 1).trim(),
    };
}

function levelLabel(level) {
    if (level === "avanzado") return "Avanzado";
    if (level === "intermedio") return "Intermedio";
    return "Iniciación";
}

function isVipLesson(lesson) {
    if (!lesson) return false;
    return (
        lesson.is_vip === true ||
        String(lesson.is_vip) === "1" ||
        lesson.vip === true ||
        String(lesson.vip) === "1" ||
        String(lesson.modality || "").toLowerCase() === "vip" ||
        String(lesson.level || "").toLowerCase() === "vip"
    );
}

function ClassStackCard({
    lesson,
    isClosed = false,
    weeklyDayIndex = null,
    weeklyJoinTop = false,
    weeklyJoinBottom = false,
    enrollmentStatus = null,
    enrollmentHasProof = false,
    enrollmentAdminNotes = null,
    canReserve = false,
    onReserve = null,
    canVipEnroll = false,
    onVipEnroll = null,
    isProcessing = false,
    onOpenGroupBooking = null,
}) {
    const startsAt = new Date(lesson.starts_at);
    const timeStr = formatTimeMadrid(startsAt);
    const locationLabel = lesson.location || "Zurriola";
    const description = lesson.description?.trim() || DESCRIPTION_FALLBACK;
    const price = lesson.price != null ? Number(lesson.price) : null;
    const currency = lesson.currency || "EUR";
    const isPrivate = !!lesson.is_private;
    const level = lesson.level || "iniciacion";
    const modality = lesson.modality || (isPrivate ? "particular" : "grupal");
    const modalityMeta = ModalityMap[modality] || ModalityMap.grupal;
    const levelStyle = LevelStyleMap[level] || LevelStyleMap.iniciacion;
    const levelAccent = LevelAccentMap[level] || LevelAccentMap.iniciacion;
    const maxSlots = Number(lesson.max_slots ?? 6);
    const totalStudents = Number(lesson.total_students ?? 0);
    const confirmedCount = Number(lesson.confirmed_count ?? 0);
    const pendingCount = Number(lesson.pending_count ?? 0);
    const fillRatio = maxSlots > 0 ? Math.min(1, totalStudents / maxSlots) : 0;
    const canOfferReinforcement =
        (modality === "grupal" || modality === "semanal") &&
        totalStudents >= maxSlots;

    return (
        <article
            className={[
                "group relative overflow-hidden rounded-xl border border-white/[0.07] bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950/95 shadow-sm transition-all duration-300",
                isClosed
                    ? "opacity-75"
                    : "hover:border-white/12 hover:shadow-md hover:shadow-cyan-950/25",
                weeklyJoinTop ? "rounded-t-none border-t-0" : "",
                weeklyJoinBottom ? "rounded-b-none border-b-0" : "",
                modality === "semanal" && (weeklyJoinTop || weeklyJoinBottom)
                    ? "ring-1 ring-inset ring-cyan-500/20"
                    : "",
            ].join(" ")}
        >
            <div
                className={`absolute inset-y-0 left-0 w-1 bg-gradient-to-b ${levelAccent}`}
                aria-hidden
            />

            <div className="p-4 pl-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                        <div className="flex shrink-0 flex-col items-center rounded-lg border border-white/10 bg-slate-950/70 px-3 py-1.5">
                            <span className="text-lg font-bold tabular-nums leading-none tracking-tight text-white">
                                {timeStr}
                            </span>
                        </div>
                        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                            <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${levelStyle}`}
                            >
                                {levelLabel(level)}
                            </span>
                            <span
                                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${modalityMeta.chip}`}
                            >
                                {modalityMeta.icon} {modalityMeta.label}
                            </span>
                        </div>
                    </div>
                    {price != null && (
                        <div className="shrink-0 text-right">
                            <span className="text-xl font-bold tabular-nums text-white">
                                {price.toFixed(0)}
                                <span className="ml-0.5 text-sm font-semibold text-slate-400">€</span>
                            </span>
                        </div>
                    )}
                </div>

                <p className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="inline-block h-1 w-1 rounded-full bg-slate-600" aria-hidden />
                    {locationLabel}
                </p>

            {modality === "semanal" &&
                weeklyDayIndex != null &&
                weeklyDayIndex > 1 && (
                    <div className="mt-2 inline-flex rounded-md bg-cyan-500/10 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 ring-1 ring-cyan-500/25">
                        Día {weeklyDayIndex} del curso semanal
                    </div>
                )}
            {isClosed && (
                <div className="mt-2 inline-flex rounded-full bg-slate-700/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-200">
                    Grupo cerrado
                </div>
            )}
            <p className="mt-2.5 text-sm leading-relaxed text-slate-300/90">
                {description}
            </p>
            {enrollmentStatus === "cancelled" && enrollmentAdminNotes && (
                <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-950/40 px-3 py-2 text-sm font-medium text-rose-200">
                    Pago rechazado: {enrollmentAdminNotes}
                </div>
            )}
            {enrollmentStatus === "pending_extra_monitor" && (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200">
                    Solicitud enviada: un administrador debe habilitar tu cupo (supera las 6 plazas estándar).
                </div>
            )}
            {enrollmentStatus === "pending" && enrollmentHasProof && (
                <div className="mt-3 rounded-lg border border-sky-500/30 bg-sky-950/40 px-3 py-2 text-sm font-medium text-sky-200">
                    Verificando tu pago...
                </div>
            )}

                <div className="mt-4 border-t border-white/[0.06] pt-3">
                    <div className="mb-2 h-1 overflow-hidden rounded-full bg-slate-800/80">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${levelAccent} transition-all`}
                            style={{ width: `${Math.max(fillRatio * 100, confirmedCount > 0 ? 8 : 0)}%` }}
                        />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                            <span className="inline-flex items-center gap-1.5 text-emerald-300/90">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                Confirmados {confirmedCount}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-amber-300/80">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                Pendientes {pendingCount}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-slate-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-400/80" />
                                {totalStudents}/{maxSlots || "—"} plazas
                            </span>
                            {canOfferReinforcement && (
                                <span className="inline-flex items-center gap-1 text-rose-300/90">
                                    🔥 Refuerzo disponible
                                </span>
                            )}
                        </div>
            {canReserve && (
                    <button
                        type="button"
                        onClick={() => onOpenGroupBooking?.(lesson)}
                        disabled={isProcessing}
                        className={[
                            "w-full shrink-0 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-cyan-950/30 transition-all duration-200 hover:from-cyan-500 hover:to-sky-500 sm:w-auto",
                            "disabled:cursor-not-allowed disabled:opacity-70",
                        ].join(" ")}
                    >
                        {isProcessing ? (
                            <span className="inline-flex items-center justify-center gap-2">
                                <svg
                                    className="h-4 w-4 animate-spin text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                    />
                                </svg>
                                Procesando...
                            </span>
                        ) : (
                            "Reservar plaza"
                        )}
                    </button>
            )}
            {canVipEnroll && (
                    <button
                        type="button"
                        onClick={() => onVipEnroll?.(lesson)}
                        disabled={isProcessing}
                        className={[
                            "w-full shrink-0 rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-violet-950/30 transition-all duration-200 hover:from-violet-500 hover:to-fuchsia-500 sm:w-auto",
                            "disabled:cursor-not-allowed disabled:opacity-70",
                        ].join(" ")}
                    >
                        {isProcessing ? "Procesando..." : "Apuntarme con bono VIP"}
                    </button>
            )}
                    </div>
                </div>
            </div>
        </article>
    );
}

function ClassStack({ dateStr, lessons, onRequestEmptyDay, onCreateClassUrl }) {
    const pretty = formatLongDateLabelMadrid(dateStr);

    if (!lessons || lessons.length === 0) {
        return (
            <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-gray-300">
                    Class-Stack · {pretty}
                </h2>
                <div className="mt-4 rounded-2xl border border-gray-700 bg-gray-900 p-6 text-center">
                    <p className="text-sm font-medium text-gray-300">
                        No hay clases programadas para este día.
                    </p>
                    {onCreateClassUrl ? (
                        <Link
                            href={onCreateClassUrl}
                            className="btn-primary mt-4 inline-block"
                        >
                            Abrir nueva clase
                        </Link>
                    ) : (
                        <button
                            type="button"
                            onClick={onRequestEmptyDay}
                            className="btn-primary mt-4"
                        >
                            Solicitar una clase aquí
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4 shadow-xl">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-gray-300">
                Class-Stack · {pretty}
            </h2>
            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="rounded-xl bg-gray-900 p-3">
                    {lessons.map((l) => (
                        <div key={l.id} className="mb-4 last:mb-0">
                            <ClassStackCard lesson={l} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function AcademyIndex({
    selectedDate,
    calendarMonth,
    rangeStart,
    rangeEnd,
    dayStats = {},
    lessonsFeed = [],
    canSeeVip = false,
    optimalDates = [],
    creditsBalance = 0,
    enrollmentPolicy = {
        enroll_cutoff_minutes: 30,
        cancel_cutoff_hours: 4,
        standard_monitor_capacity: 6,
    },
    myEnrollmentLessonIds = [],
    myEnrollmentStatusByLesson = {},
    myEnrollmentExpiresAtByLesson = {},
    myEnrollmentHasProofByLesson = {},
    myEnrollmentIdByLesson = {},
    myEnrollmentAdminNotesByLesson = {},
    pendingSurfTripLesson = null,
    paymentBizumNumber = "[BIZUM_NUMBER]",
    paymentIban = "[IBAN]",
    whatsappHelpUrl = null,
}) {
    const [date, setDate] = useState(() => {
        const today = todayYmdInMadrid();
        const initial = selectedDate || today;
        return initial < today ? today : initial;
    });
    const [month, setMonth] = useState(calendarMonth || selectedDate);
    const [paymentModalLesson, setPaymentModalLesson] = useState(null);
    const [groupLessonRequestPayload, setGroupLessonRequestPayload] =
        useState(null);
    const [bookingModalLesson, setBookingModalLesson] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const pageProps = usePage().props;
    const { flash, auth } = pageProps;
    const currentUser = auth?.user || null;
    const isAdmin =
        !!currentUser &&
        (String(currentUser.role) === "admin" ||
            currentUser.is_admin === true ||
            String(currentUser.is_admin) === "1");
    const isVipUser =
        !!currentUser &&
        (currentUser.is_vip === true ||
            String(currentUser.is_vip) === "1" ||
            String(currentUser.role) === "vip" ||
            String(currentUser.role_id) === "vip" ||
            Number(currentUser.role_id) === 3);

    const feedLessons = useMemo(
        () => (Array.isArray(lessonsFeed) ? lessonsFeed : []),
        [lessonsFeed],
    );

    // Oferta pública: exclusión total de particulares.
    const visibleFeedLessons = useMemo(() => {
        return feedLessons.filter((l) => {
            if (isAdmin) return true;
            const modality =
                l.modality || (l.is_private ? "particular" : "grupal");
            if (isVipUser) {
                return (
                    modality === "grupal" ||
                    modality === "semanal" ||
                    modality === "vip"
                );
            }
            return modality === "grupal" || modality === "semanal";
        });
    }, [feedLessons, isAdmin, isVipUser]);

    const mySignalsByDate = useMemo(() => {
        const out = {};
        for (const l of feedLessons) {
            const st = myEnrollmentStatusByLesson?.[l.id];
            if (!st) continue;
            const d = l.date;
            if (!d) continue;
            const hasProof = !!myEnrollmentHasProofByLesson?.[l.id];
            const notes = myEnrollmentAdminNotesByLesson?.[l.id] || null;
            if (!out[d])
                out[d] = { pending: false, verifying: false, rejected: false };
            if (st === "pending" && hasProof) out[d].verifying = true;
            else if (st === "pending" || st === "pending_extra_monitor") out[d].pending = true;
            else if (st === "cancelled" && notes) out[d].rejected = true;
        }
        return out;
    }, [
        feedLessons,
        myEnrollmentStatusByLesson,
        myEnrollmentHasProofByLesson,
        myEnrollmentAdminNotesByLesson,
    ]);
    const [modalityFilter, setModalityFilter] = useState("all"); // all | grupal | semanal | vip
    const [futureDaysWindow, setFutureDaysWindow] = useState(0);
    const [vipCalendarNotice, setVipCalendarNotice] = useState(false);
    const todayStr = todayYmdInMadrid();

    const filteredDayStats = useMemo(
        () => buildFilteredDayStats(dayStats, modalityFilter, todayStr),
        [dayStats, modalityFilter, todayStr],
    );

    const visibleModalityFilters = useMemo(
        () =>
            MODALITY_FILTER_OPTIONS.filter(
                (f) => f.id !== "vip" || isVipUser || isAdmin,
            ),
        [isVipUser, isAdmin],
    );

    useEffect(() => {
        if (date < todayStr) {
            setDate(todayStr);
        }
    }, [date, todayStr]);

    const filteredFeedLessons = useMemo(() => {
        const base = visibleFeedLessons;

        if (modalityFilter === "vip") {
            return base.filter((l) => {
                const d =
                    l.date || (l.starts_at ? toYmdInMadrid(l.starts_at) : null);
                return !!d && d >= todayStr && isVipLesson(l);
            });
        }

        const effectiveDate = date < todayStr ? todayStr : date;
        const end = addDaysToYmd(effectiveDate, futureDaysWindow);
        return base.filter((l) => {
            const modality =
                l.modality || (l.is_private ? "particular" : "grupal");
            const d =
                l.date || (l.starts_at ? toYmdInMadrid(l.starts_at) : null);
            if (!d) return false;
            if (d < todayStr) return false;
            if (d < effectiveDate || d > end) return false;
            if (modalityFilter === "all") return true;
            return modality === modalityFilter;
        });
    }, [visibleFeedLessons, modalityFilter, date, futureDaysWindow, todayStr]);

    const [showPrivateModal, setShowPrivateModal] = useState(false);
    const [privateDate, setPrivateDate] = useState(() => {
        const today = todayYmdInMadrid();
        const initial = selectedDate || today;
        return initial < today ? today : initial;
    });
    const [privateDurationMode, setPrivateDurationMode] = useState("preset");
    const [privateDurationMinutes, setPrivateDurationMinutes] = useState(90);
    const [privateManualMinutes, setPrivateManualMinutes] = useState(90);
    const [privateSlots, setPrivateSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedPrivateSlot, setSelectedPrivateSlot] = useState(null);
    const [privateSlotsExpanded, setPrivateSlotsExpanded] = useState(false);

    const privateEffectiveDurationMinutes = useMemo(
        () =>
            privateDurationMode === "manual"
                ? Math.max(30, Number(privateManualMinutes || 90))
                : Number(privateDurationMinutes || 90),
        [privateDurationMode, privateManualMinutes, privateDurationMinutes],
    );

    const privateDurationLabel = useMemo(() => {
        const m = privateEffectiveDurationMinutes;
        if (m === 60) return "1 hora";
        if (m === 90) return "1,5 horas";
        if (m === 120) return "2 horas";
        return `${m} min`;
    }, [privateEffectiveDurationMinutes]);

    useEffect(() => {
        if (!showPrivateModal) {
            setPrivateSlotsExpanded(false);
        }
    }, [showPrivateModal]);

    const [miniMonth, setMiniMonth] = useState(() => selectedDate);
    const miniMonthStart = useMemo(
        () => startOfMonth(new Date((miniMonth || selectedDate) + "T12:00:00")),
        [miniMonth, selectedDate],
    );
    const miniMonthEnd = useMemo(
        () =>
            new Date(
                miniMonthStart.getFullYear(),
                miniMonthStart.getMonth() + 1,
                0,
            ),
        [miniMonthStart],
    );
    const miniFirstDow = useMemo(
        () => (miniMonthStart.getDay() + 6) % 7,
        [miniMonthStart],
    ); // lunes=0
    const miniTotalCells = useMemo(
        () => Math.ceil((miniFirstDow + miniMonthEnd.getDate()) / 7) * 7,
        [miniFirstDow, miniMonthEnd],
    );
    const miniCells = useMemo(() => {
        const out = [];
        for (let i = 0; i < miniTotalCells; i++) {
            const dayNum = i - miniFirstDow + 1;
            const inMonth = dayNum >= 1 && dayNum <= miniMonthEnd.getDate();
            const d = new Date(
                miniMonthStart.getFullYear(),
                miniMonthStart.getMonth(),
                dayNum,
            );
            out.push({ key: ymd(d), inMonth, dayNum });
        }
        return out;
    }, [miniTotalCells, miniFirstDow, miniMonthStart, miniMonthEnd]);

    const loadPrivateSlots = async (d, durationOverride = null) => {
        setLoadingSlots(true);
        setSelectedPrivateSlot(null);
        try {
            const durationMinutes =
                durationOverride ?? privateEffectiveDurationMinutes;
            const res = await fetch(
                route("academy.private.availability", {
                    date: d,
                    duration_minutes: durationMinutes,
                }),
                { headers: { Accept: "application/json" } },
            );
            const json = await res.json();
            setPrivateSlots(Array.isArray(json.slots) ? json.slots : []);
        } catch (e) {
            setPrivateSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    const feedByDay = useMemo(() => {
        const out = {};
        for (const l of filteredFeedLessons) {
            const d =
                l.date ||
                (l.starts_at ? String(l.starts_at).slice(0, 10) : null);
            if (!d) continue;
            if (!out[d]) out[d] = [];
            out[d].push(l);
        }
        return out;
    }, [filteredFeedLessons]);

    const dayKeys = useMemo(() => Object.keys(feedByDay).sort(), [feedByDay]);
    const [visibleDaysCount, setVisibleDaysCount] = useState(INITIAL_VISIBLE_DAYS);
    const dayRefMap = useRef({});
    const [highlightDay, setHighlightDay] = useState(null);

    const visibleDayKeys = useMemo(
        () => dayKeys.slice(0, visibleDaysCount),
        [dayKeys, visibleDaysCount],
    );
    const remainingDayCount = Math.max(0, dayKeys.length - visibleDayKeys.length);

    useEffect(() => {
        setVisibleDaysCount(INITIAL_VISIBLE_DAYS);
    }, [date, modalityFilter, futureDaysWindow]);

    useEffect(() => {
        if (modalityFilter === "vip") return;
        const target = date < todayStr ? todayStr : date;
        const idx = dayKeys.indexOf(target);
        if (idx >= 0) {
            setVisibleDaysCount((prev) => Math.max(prev, idx + 1));
        }
    }, [date, todayStr, dayKeys, modalityFilter]);
    const submitVipEnroll = (lesson) => {
        if (!lesson?.id) return;
        setProcessingId(lesson.id);
        router.post(route("lessons.enroll", lesson.id), {}, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
        });
    };

    const submitGroupBooking = (lesson, payload) => {
        if (!lesson?.id) return;
        setProcessingId(lesson.id);
        const enrolledStatus = myEnrollmentStatusByLesson?.[lesson.id];
        if (enrolledStatus === "pending" || enrolledStatus === "confirmed") {
            setGroupLessonRequestPayload(null);
            setPaymentModalLesson(lesson);
            setBookingModalLesson(null);
            setProcessingId(null);
            return;
        }
        setGroupLessonRequestPayload({
            quantity: payload?.quantity ?? payload?.participants?.length ?? 1,
            age_bracket: payload?.ageBracket ?? "adult",
            request_extra_monitor: !!payload?.requestExtra,
            participants: payload?.participants ?? [],
        });
        setPaymentModalLesson(lesson);
        setBookingModalLesson(null);
        setProcessingId(null);
    };

    const monthDate = useMemo(
        () => startOfMonth(new Date((month || selectedDate) + "T12:00:00")),
        [month, selectedDate],
    );

    const scrollToDay = (dayStr) => {
        const el = dayRefMap.current?.[dayStr];
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightDay(dayStr);
        window.clearTimeout(scrollToDay._t);
        scrollToDay._t = window.setTimeout(() => setHighlightDay(null), 1400);
    };

    const effectiveFeedDate = date < todayStr ? todayStr : date;
    const rangeEndDate = addDaysToYmd(effectiveFeedDate, futureDaysWindow);
    const isTenDayView = futureDaysWindow >= FUTURE_DAYS_BATCH;

    const expandToTenDays = () => {
        setFutureDaysWindow(FUTURE_DAYS_BATCH);
    };

    const collapseToSingleDay = () => {
        setFutureDaysWindow(0);
        requestAnimationFrame(() => scrollToDay(effectiveFeedDate));
    };

    const renderLoadMoreDays = () => {
        if (remainingDayCount <= 0) return null;

        return (
            <div className="flex justify-center pt-2">
                <button
                    type="button"
                    onClick={() =>
                        setVisibleDaysCount((count) =>
                            Math.min(count + DAYS_LOAD_STEP, dayKeys.length),
                        )
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/30 hover:bg-slate-800 hover:text-white"
                >
                    Ver más días
                    <span className="text-xs font-normal text-slate-400">
                        ({remainingDayCount} restantes)
                    </span>
                </button>
            </div>
        );
    };

    const renderTenDayRangeControl = () => {
        if (modalityFilter === "vip") return null;

        if (isTenDayView) {
            return (
                <div className="mt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={collapseToSingleDay}
                        className="rounded-xl border border-slate-600/50 bg-slate-800/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
                    >
                        Ver solo {formatLongDateLabelMadrid(effectiveFeedDate)}
                    </button>
                </div>
            );
        }

        return (
            <div className="mt-4 flex justify-center">
                <button
                    type="button"
                    onClick={expandToTenDays}
                    className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20"
                >
                    Ver clases de los próximos 10 días
                </button>
            </div>
        );
    };

    const navigateMonth = (dir) => {
        const next = addMonths(monthDate, dir);
        const nextMonthStr = ymd(next);
        setMonth(nextMonthStr);
        // No recargar datos; solo navegación visual del calendario.
    };

    return (
        <Layout1>
            <Head title="Academia · Clases" />
            <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-24 sm:px-6">
                <div className="mx-auto w-full max-w-5xl">
                    {/* Cabecera centrada */}
                    <div className="mb-8 text-center">
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-400">
                            Academia · San Sebastian Surf School
                        </p>
                        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Clases de surf
                        </h1>
                        {isVipUser ? (
                            <p className="mt-2 text-sm text-slate-400">
                                Tu saldo VIP:{" "}
                                <strong className="text-lg font-bold text-teal-300">
                                    {creditsBalance} créditos
                                </strong>
                            </p>
                        ) : (
                            <p className="mt-2 max-w-xl mx-auto text-sm text-slate-500">
                                Reserva clases grupales con pago directo. Los bonos de créditos
                                son solo para{" "}
                                <span className="font-medium text-teal-300/90">miembros VIP</span>.
                            </p>
                        )}
                    </div>

                    {/* Acciones principales */}
                    <div className="mb-6 flex flex-col items-center gap-4">
                        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowPrivateModal(true);
                                    loadPrivateSlots(privateDate);
                                }}
                                className="rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:from-amber-400 hover:to-orange-400"
                            >
                                Solicitar clase particular
                            </button>
                            <div className="flex flex-col items-center gap-1.5 text-center sm:items-center">
                                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-400/85">
                                    {isVipUser ? "Área VIP · bonos" : "¿Eres VIP?"}
                                </span>
                                <Link
                                    href={route("bonos.index")}
                                    className="inline-flex rounded-xl border border-teal-500/30 bg-teal-500/10 px-5 py-3 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/20"
                                >
                                    {isVipUser ? "Recargar créditos" : "Ver bonos y activación"}
                                </Link>
                                <span className="max-w-[14rem] text-[11px] leading-snug text-slate-500">
                                    {isVipUser
                                        ? "Compra y gestiona packs de clases con tu cuenta VIP."
                                        : "Consulta precios y cómo activar el acceso VIP."}
                                </span>
                            </div>
                        </div>
                        <p className="text-center text-xs text-slate-500">
                            Las clases particulares no aparecen en la oferta pública.
                        </p>
                    </div>

                    {flash?.success && (
                        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-200">
                            {flash.success}
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm font-medium text-rose-200">
                            {flash.error}
                        </div>
                    )}

                    {/* Panel de reserva centrado */}
                    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-gray-950 via-gray-900 to-teal-950/40 p-[1px] shadow-xl shadow-black/30">
                        <div className="rounded-2xl bg-gray-950/95 p-4 sm:p-6">
                            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 lg:flex-row lg:items-start lg:justify-center">
                                <aside className="w-full shrink-0 lg:max-w-[300px]">
                                    <div className="lg:sticky lg:top-24">
                                        <CalendarCommander
                                            monthDate={monthDate}
                                            selectedDate={date}
                                            onSelectDay={(d) => {
                                                if (d < todayStr) return;
                                                if (modalityFilter === "vip") {
                                                    setVipCalendarNotice(true);
                                                    return;
                                                }
                                                setVipCalendarNotice(false);
                                                setDate(d);
                                                setFutureDaysWindow(0);
                                                scrollToDay(d);
                                            }}
                                            onNavigateMonth={navigateMonth}
                                            dayStats={filteredDayStats}
                                            mySignalsByDate={mySignalsByDate}
                                            todayStr={todayStr}
                                            modalityFilter={modalityFilter}
                                        />
                                    </div>
                                </aside>

                                <main className="min-w-0 w-full flex-1 lg:max-w-[560px]">
                                    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-inner">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-amber-200/90">
                                                    Clases disponibles
                                                </h2>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Elige día en el calendario y
                                                    reserva tu plaza.
                                                </p>
                                            </div>
                                            <div className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-700/80 bg-slate-950/80 p-1">
                                                {visibleModalityFilters.map((f) => (
                                                    <button
                                                        key={f.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setModalityFilter(f.id);
                                                            if (f.id === "vip") {
                                                                setVipCalendarNotice(false);
                                                                return;
                                                            }
                                                            setFutureDaysWindow(0);
                                                            setVipCalendarNotice(false);
                                                        }}
                                                        className={[
                                                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200",
                                                            modalityFilter === f.id
                                                                ? "bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/40"
                                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                                                        ].join(" ")}
                                                    >
                                                        {f.dot ? (
                                                            <span
                                                                className={`h-2 w-2 shrink-0 rounded-full ${f.dot}`}
                                                                aria-hidden
                                                            />
                                                        ) : null}
                                                        {f.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        {modalityFilter === "vip" && (
                                            <p className="mt-3 text-xs text-slate-400">
                                                Mostrando clases VIP desde hoy
                                                en adelante.
                                            </p>
                                        )}
                                        {modalityFilter !== "vip" && isTenDayView && (
                                            <p className="mt-3 text-xs text-amber-200/80">
                                                Mostrando clases del{" "}
                                                <span className="font-semibold text-amber-100">
                                                    {formatLongDateLabelMadrid(effectiveFeedDate)}
                                                </span>{" "}
                                                al{" "}
                                                <span className="font-semibold text-amber-100">
                                                    {formatLongDateLabelMadrid(rangeEndDate)}
                                                </span>
                                                .
                                            </p>
                                        )}
                                        {vipCalendarNotice &&
                                            modalityFilter === "vip" && (
                                                <p className="mt-2 text-xs text-amber-300">
                                                    El filtro VIP ignora el día
                                                    del calendario. Cambia a
                                                    "Todas" para ver un día
                                                    concreto.
                                                </p>
                                            )}
                                        <div className="mt-4">
                                            {dayKeys.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-6 py-10 text-center">
                                                    <p className="text-sm font-medium text-slate-300">
                                                        {isTenDayView
                                                            ? "No hay clases disponibles en los próximos 10 días desde esta fecha."
                                                            : "No hay clases disponibles para este día."}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {isTenDayView
                                                            ? "Prueba otra fecha en el calendario o cambia el filtro de modalidad."
                                                            : "Amplía el rango o prueba otra fecha en el calendario."}
                                                    </p>
                                                    {renderTenDayRangeControl()}
                                                </div>
                                            ) : (
                                                <div className="relative rounded-2xl border border-white/[0.06] bg-slate-950/40 p-4 sm:p-5">
                                                    <div
                                                        className="pointer-events-none absolute inset-0 rounded-2xl opacity-[0.35]"
                                                        style={{
                                                            backgroundImage:
                                                                "repeating-linear-gradient(-45deg, transparent, transparent 12px, rgba(148,163,184,0.03) 12px, rgba(148,163,184,0.03) 13px)",
                                                        }}
                                                        aria-hidden
                                                    />
                                                    <div className="relative space-y-8">
                                                    {(() => {
                                                        const batchIndex = {};
                                                        let prevLesson = null;
                                                        return visibleDayKeys.map(
                                                            (dayStr) => {
                                                                const { weekday, dateLine } =
                                                                    splitDayLabel(dayStr);
                                                                const isHot =
                                                                    highlightDay ===
                                                                    dayStr;
                                                                const lessons =
                                                                    feedByDay[
                                                                        dayStr
                                                                    ] || [];

                                                                return (
                                                                    <section
                                                                        key={
                                                                            dayStr
                                                                        }
                                                                        ref={(
                                                                            el,
                                                                        ) => {
                                                                            if (
                                                                                el
                                                                            )
                                                                                dayRefMap.current[
                                                                                    dayStr
                                                                                ] =
                                                                                    el;
                                                                        }}
                                                                        className="relative scroll-mt-6 pl-8 last:pb-0"
                                                                    >
                                                                        <div
                                                                            className="absolute bottom-0 left-[13px] top-10 w-px bg-gradient-to-b from-cyan-500/35 via-slate-600/40 to-transparent last:hidden"
                                                                            aria-hidden
                                                                        />
                                                                        <div
                                                                            className={[
                                                                                "absolute left-0 top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 bg-slate-950 transition-all",
                                                                                isHot
                                                                                    ? "border-cyan-400 shadow-md shadow-cyan-500/30"
                                                                                    : "border-slate-600/80",
                                                                            ].join(" ")}
                                                                            aria-hidden
                                                                        >
                                                                            <span
                                                                                className={[
                                                                                    "h-2 w-2 rounded-full",
                                                                                    isHot
                                                                                        ? "bg-cyan-400"
                                                                                        : "bg-slate-500",
                                                                                ].join(" ")}
                                                                            />
                                                                        </div>

                                                                        <header className="mb-4 border-b border-white/[0.06] pb-3">
                                                                            {weekday ? (
                                                                                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400/90">
                                                                                    {weekday}
                                                                                </p>
                                                                            ) : null}
                                                                            <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-2">
                                                                                <h3
                                                                                    className={[
                                                                                        "text-sm font-bold capitalize text-white sm:text-base",
                                                                                        isHot
                                                                                            ? "text-cyan-50"
                                                                                            : "",
                                                                                    ].join(" ")}
                                                                                >
                                                                                    {dateLine || dayStr}
                                                                                </h3>
                                                                                <span className="rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-400 ring-1 ring-white/5">
                                                                                    {lessons.length}{" "}
                                                                                    {lessons.length === 1
                                                                                        ? "sesión"
                                                                                        : "sesiones"}
                                                                                </span>
                                                                            </div>
                                                                        </header>

                                                                        <div className="space-y-3">
                                                                            {lessons.map(
                                                                                (
                                                                                    l,
                                                                                    idx,
                                                                                ) => {
                                                                                    const modality =
                                                                                        l.modality ||
                                                                                        (l.is_private
                                                                                            ? "particular"
                                                                                            : "grupal");
                                                                                    const isClosed =
                                                                                        modality ===
                                                                                            "particular" &&
                                                                                        Number(
                                                                                            l.total_students ||
                                                                                                0,
                                                                                        ) >=
                                                                                            6;
                                                                                    const isFutureOrToday =
                                                                                        toYmdInMadrid(
                                                                                            l.starts_at,
                                                                                        ) >=
                                                                                        todayYmdInMadrid();
                                                                                    const maxSlots =
                                                                                        Number(
                                                                                            l.max_slots ??
                                                                                                0,
                                                                                        );
                                                                                    const totalStudents =
                                                                                        Number(
                                                                                            l.total_students ??
                                                                                                0,
                                                                                        );
                                                                                    const hasFreeSlots =
                                                                                        maxSlots >
                                                                                        0
                                                                                            ? totalStudents <
                                                                                              maxSlots
                                                                                            : true;
                                                                                    const enrollCutoffMinutes =
                                                                                        Number(enrollmentPolicy?.enroll_cutoff_minutes ?? 30);
                                                                                    const minutesUntilStart = l.starts_at
                                                                                        ? Math.floor(
                                                                                              (new Date(l.starts_at).getTime() - Date.now()) / 60000,
                                                                                          )
                                                                                        : 0;
                                                                                    const withinEnrollWindow =
                                                                                        minutesUntilStart >= enrollCutoffMinutes;
                                                                                    const enrollmentStatus =
                                                                                        myEnrollmentStatusByLesson?.[
                                                                                            l
                                                                                                .id
                                                                                        ] ??
                                                                                        null;
                                                                                    const hasActiveEnrollment = [
                                                                                        "pending",
                                                                                        "pending_extra_monitor",
                                                                                        "confirmed",
                                                                                        "enrolled",
                                                                                        "attended",
                                                                                    ].includes(enrollmentStatus);
                                                                                    const isActiveEnrollment =
                                                                                        enrollmentStatus ===
                                                                                            "pending" ||
                                                                                        enrollmentStatus ===
                                                                                            "confirmed";
                                                                                    const canReserveGroupOrWeekly =
                                                                                        (modality ===
                                                                                            "grupal" ||
                                                                                            modality ===
                                                                                                "semanal") &&
                                                                                        isFutureOrToday &&
                                                                                        withinEnrollWindow &&
                                                                                        !hasActiveEnrollment;
                                                                                    const canReserve =
                                                                                        canReserveGroupOrWeekly;
                                                                                    const canVipEnroll =
                                                                                        (modality === "vip" ||
                                                                                            isVipLesson(l)) &&
                                                                                        isVipUser &&
                                                                                        isFutureOrToday &&
                                                                                        withinEnrollWindow &&
                                                                                        !hasActiveEnrollment;
                                                                                    const batchId =
                                                                                        l.batch_id ||
                                                                                        null;
                                                                                    const isWeekly =
                                                                                        modality ===
                                                                                            "semanal" &&
                                                                                        !!batchId;
                                                                                    const prevSameBatch =
                                                                                        isWeekly &&
                                                                                        prevLesson &&
                                                                                        prevLesson.batch_id ===
                                                                                            batchId &&
                                                                                        prevLesson.modality ===
                                                                                            "semanal";

                                                                                    const next =
                                                                                        lessons[
                                                                                            idx +
                                                                                                1
                                                                                        ];
                                                                                    const nextSameBatch =
                                                                                        isWeekly &&
                                                                                        next &&
                                                                                        next.batch_id ===
                                                                                            batchId &&
                                                                                        (next.modality ||
                                                                                            (next.is_private
                                                                                                ? "particular"
                                                                                                : "grupal")) ===
                                                                                            "semanal";

                                                                                    if (
                                                                                        isWeekly &&
                                                                                        batchId
                                                                                    ) {
                                                                                        batchIndex[
                                                                                            batchId
                                                                                        ] =
                                                                                            (batchIndex[
                                                                                                batchId
                                                                                            ] ||
                                                                                                0) +
                                                                                            1;
                                                                                    }
                                                                                    const dayIndex =
                                                                                        isWeekly &&
                                                                                        batchId
                                                                                            ? batchIndex[
                                                                                                  batchId
                                                                                              ]
                                                                                            : null;

                                                                                    prevLesson =
                                                                                        l;

                                                                                    return (
                                                                                        <div
                                                                                            key={
                                                                                                l.id
                                                                                            }
                                                                                            className={
                                                                                                prevSameBatch
                                                                                                    ? "-mt-px"
                                                                                                    : ""
                                                                                            }
                                                                                        >
                                                                                            <ClassStackCard
                                                                                                lesson={
                                                                                                    l
                                                                                                }
                                                                                                isClosed={
                                                                                                    isClosed
                                                                                                }
                                                                                                weeklyDayIndex={
                                                                                                    dayIndex
                                                                                                }
                                                                                                weeklyJoinTop={
                                                                                                    !!prevSameBatch
                                                                                                }
                                                                                                weeklyJoinBottom={
                                                                                                    !!nextSameBatch
                                                                                                }
                                                                                                enrollmentStatus={
                                                                                                    enrollmentStatus
                                                                                                }
                                                                                                enrollmentHasProof={
                                                                                                    !!myEnrollmentHasProofByLesson?.[
                                                                                                        l
                                                                                                            .id
                                                                                                    ]
                                                                                                }
                                                                                                enrollmentAdminNotes={
                                                                                                    myEnrollmentAdminNotesByLesson?.[
                                                                                                        l
                                                                                                            .id
                                                                                                    ] ??
                                                                                                    null
                                                                                                }
                                                                                                canReserve={
                                                                                                    canReserve
                                                                                                }
                                                                                                canVipEnroll={
                                                                                                    canVipEnroll
                                                                                                }
                                                                                                onVipEnroll={
                                                                                                    submitVipEnroll
                                                                                                }
                                                                                                onReserve={
                                                                                                    submitGroupBooking
                                                                                                }
                                                                                                onOpenGroupBooking={
                                                                                                    setBookingModalLesson
                                                                                                }
                                                                                                isProcessing={
                                                                                                    processingId ===
                                                                                                    l.id
                                                                                                }
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                },
                                                                            )}
                                                                        </div>
                                                                    </section>
                                                                );
                                                            },
                                                        );
                                                    })()}
                                                    {renderLoadMoreDays()}
                                                    </div>
                                                    {renderTenDayRangeControl()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </main>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {pendingSurfTripLesson && (
                <SurfTripFab lesson={pendingSurfTripLesson} />
            )}
            <PaymentModal
                open={!!paymentModalLesson}
                onClose={() => {
                    setPaymentModalLesson(null);
                    setGroupLessonRequestPayload(null);
                }}
                lesson={paymentModalLesson}
                expiresAt={
                    paymentModalLesson &&
                    paymentModalLesson.id !== "PRIVATE_FLOW" &&
                    !myEnrollmentHasProofByLesson[paymentModalLesson.id]
                        ? myEnrollmentExpiresAtByLesson[paymentModalLesson.id]
                        : null
                }
                hasProof={
                    !!(
                        paymentModalLesson &&
                        paymentModalLesson.id !== "PRIVATE_FLOW" &&
                        myEnrollmentHasProofByLesson[paymentModalLesson.id]
                    )
                }
                enrollmentId={
                    paymentModalLesson &&
                    paymentModalLesson.id !== "PRIVATE_FLOW"
                        ? myEnrollmentIdByLesson[paymentModalLesson.id]
                        : null
                }
                bizumNumber={paymentBizumNumber}
                iban={paymentIban}
                whatsappHelpUrl={whatsappHelpUrl}
                isAdmin={isAdmin}
                currentUserId={currentUser?.id ?? null}
                groupLessonRequestPayload={groupLessonRequestPayload}
                onSuccessAction={() => {
                    setGroupLessonRequestPayload(null);
                    router.reload({
                        only: [
                            "lessonsFeed",
                            "myEnrollmentStatusByLesson",
                            "myEnrollmentHasProofByLesson",
                            "myEnrollmentExpiresAtByLesson",
                            "myEnrollmentIdByLesson",
                            "auth",
                        ],
                    });
                }}
            />

            <BookingModal
                open={!!bookingModalLesson}
                lesson={bookingModalLesson}
                bookerFirstName={auth?.user?.nombre ?? ""}
                bookerLastName={auth?.user?.apellido ?? ""}
                onClose={() => setBookingModalLesson(null)}
                processing={
                    bookingModalLesson
                        ? processingId === bookingModalLesson.id
                        : false
                }
                onConfirm={(payload) => {
                    if (!bookingModalLesson) return;
                    submitGroupBooking(bookingModalLesson, payload);
                }}
            />

            {showPrivateModal && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-gray-950/70"
                        onClick={() => setShowPrivateModal(false)}
                        aria-hidden
                    />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-heading text-lg font-bold text-gray-100">
                                    Solicitar clase particular
                                </h3>
                                <p className="mt-1 text-sm text-gray-400">
                                    Elige fecha, duración y un tramo libre con
                                    monitor disponible (hasta las 22:00).
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPrivateModal(false)}
                                className="rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700"
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold text-gray-300">
                                    Fecha
                                </label>
                                <div className="mt-2 rounded-2xl border border-gray-700 bg-gray-900 p-3">
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMiniMonth(
                                                    ymd(
                                                        addMonths(
                                                            miniMonthStart,
                                                            -1,
                                                        ),
                                                    ),
                                                )
                                            }
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-100 hover:bg-gray-700 transition-all duration-200 ease-in-out"
                                            aria-label="Mes anterior"
                                        >
                                            ←
                                        </button>
                                        <div className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                                            {formatMonthYearMadridFromYearMonth(
                                                miniMonthStart.getFullYear(),
                                                miniMonthStart.getMonth() + 1,
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setMiniMonth(
                                                    ymd(
                                                        addMonths(
                                                            miniMonthStart,
                                                            1,
                                                        ),
                                                    ),
                                                )
                                            }
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-100 hover:bg-gray-700 transition-all duration-200 ease-in-out"
                                            aria-label="Mes siguiente"
                                        >
                                            →
                                        </button>
                                    </div>
                                    <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] font-bold text-gray-400">
                                        {[
                                            "L",
                                            "M",
                                            "X",
                                            "J",
                                            "V",
                                            "S",
                                            "D",
                                        ].map((w) => (
                                            <div
                                                key={w}
                                                className="text-center"
                                            >
                                                {w}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-2 grid grid-cols-7 gap-1">
                                        {miniCells.map((c) => {
                                            const disabled =
                                                !c.inMonth || c.key < todayStr;
                                            const selected =
                                                c.key === privateDate;
                                            return (
                                                <button
                                                    key={c.key}
                                                    type="button"
                                                    disabled={disabled}
                                                    onClick={() => {
                                                        setPrivateDate(c.key);
                                                        loadPrivateSlots(c.key);
                                                    }}
                                                    className={[
                                                        "h-10 rounded-xl text-xs font-semibold transition-all duration-200 ease-in-out",
                                                        disabled
                                                            ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                                                            : "bg-gray-800 text-gray-200 hover:-translate-y-0.5 hover:shadow-sm",
                                                        selected
                                                            ? "bg-[#00D1FF] text-slate-900 shadow-[0_10px_25px_rgba(0,209,255,0.25)]"
                                                            : "ring-1 ring-gray-600/70",
                                                    ].join(" ")}
                                                >
                                                    {c.inMonth ? c.dayNum : ""}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-400">
                                        Seleccionado:{" "}
                                        <span className="font-semibold text-gray-200">
                                            {privateDate}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-300">
                                    Horario disponible
                                </label>
                                <div className="mt-2 rounded-2xl border border-gray-700 bg-gray-900 p-3">
                                    <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        <select
                                            value={
                                                privateDurationMode === "manual"
                                                    ? "manual"
                                                    : String(
                                                          privateDurationMinutes,
                                                      )
                                            }
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                if (v === "manual") {
                                                    setPrivateDurationMode(
                                                        "manual",
                                                    );
                                                    setPrivateSlotsExpanded(
                                                        false,
                                                    );
                                                    loadPrivateSlots(
                                                        privateDate,
                                                        Math.max(
                                                            30,
                                                            Number(
                                                                privateManualMinutes ||
                                                                    90,
                                                            ),
                                                        ),
                                                    );
                                                } else {
                                                    const minutes = Number(v);
                                                    setPrivateDurationMode(
                                                        "preset",
                                                    );
                                                    setPrivateDurationMinutes(
                                                        minutes,
                                                    );
                                                    setPrivateSlotsExpanded(
                                                        false,
                                                    );
                                                    loadPrivateSlots(
                                                        privateDate,
                                                        minutes,
                                                    );
                                                }
                                            }}
                                            className="input-focus-ring w-full rounded-xl px-3 py-2 text-sm"
                                        >
                                            <option value="60">1 hora</option>
                                            <option value="90">
                                                1,5 horas
                                            </option>
                                            <option value="120">2 horas</option>
                                            <option value="manual">
                                                Manual
                                            </option>
                                        </select>
                                        {privateDurationMode === "manual" ? (
                                            <select
                                                value={privateManualMinutes}
                                                onChange={(e) => {
                                                    const minutes = Number(
                                                        e.target.value || 90,
                                                    );
                                                    setPrivateManualMinutes(
                                                        minutes,
                                                    );
                                                    setPrivateSlotsExpanded(
                                                        false,
                                                    );
                                                    loadPrivateSlots(
                                                        privateDate,
                                                        Math.max(30, minutes),
                                                    );
                                                }}
                                                className="input-focus-ring w-full rounded-xl px-3 py-2 text-sm"
                                            >
                                                {Array.from(
                                                    { length: 18 },
                                                    (_, i) => 45 + i * 15,
                                                ).map((m) => (
                                                    <option key={m} value={m}>
                                                        {m} min
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="hidden items-center rounded-xl border border-gray-700/80 bg-gray-800/60 px-3 py-2 text-xs text-gray-400 sm:flex">
                                                Tramos de {privateDurationLabel}
                                            </div>
                                        )}
                                    </div>

                                    {selectedPrivateSlot &&
                                    !privateSlotsExpanded ? (
                                        <p className="mb-2 text-xs text-cyan-300">
                                            Seleccionado:{" "}
                                            <span className="font-semibold text-cyan-200">
                                                {selectedPrivateSlot.start} a{" "}
                                                {selectedPrivateSlot.end}
                                            </span>{" "}
                                            ({privateDurationLabel})
                                        </p>
                                    ) : null}

                                    {loadingSlots ? (
                                        <p className="text-sm text-gray-300">
                                            Cargando disponibilidad…
                                        </p>
                                    ) : privateSlots.length === 0 ? (
                                        <p className="text-sm text-gray-300">
                                            No hay huecos disponibles para ese
                                            día.
                                        </p>
                                    ) : (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPrivateSlotsExpanded(
                                                        (open) => !open,
                                                    )
                                                }
                                                className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-600/80 bg-gray-800 px-3 py-2.5 text-sm font-semibold text-gray-100 transition hover:border-cyan-500/40 hover:bg-gray-700/80"
                                                aria-expanded={
                                                    privateSlotsExpanded
                                                }
                                            >
                                                <span>
                                                    {privateSlotsExpanded
                                                        ? "Ocultar horarios"
                                                        : "Ver horarios disponibles"}
                                                    {!privateSlotsExpanded ? (
                                                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                                                            (
                                                            {
                                                                privateSlots.length
                                                            }{" "}
                                                            tramos ·{" "}
                                                            {
                                                                privateDurationLabel
                                                            }
                                                            )
                                                        </span>
                                                    ) : null}
                                                </span>
                                                <span
                                                    className={`text-xs text-gray-400 transition-transform ${privateSlotsExpanded ? "rotate-180" : ""}`}
                                                    aria-hidden
                                                >
                                                    ▼
                                                </span>
                                            </button>

                                            {privateSlotsExpanded ? (
                                                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-700/70 bg-gray-950/40 p-1.5 sm:max-h-52">
                                                    <div className="flex flex-col gap-1">
                                                        {privateSlots.map((s) => {
                                                            const key = `${s.start}-${s.end}`;
                                                            const active =
                                                                selectedPrivateSlot?.start === s.start;
                                                            return (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedPrivateSlot(s);
                                                                        setPrivateSlotsExpanded(false);
                                                                    }}
                                                                    className={[
                                                                        "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-all duration-200 ease-in-out",
                                                                        active
                                                                            ? "bg-[#00D1FF] text-slate-900 shadow-[0_4px_12px_rgba(0,209,255,0.2)]"
                                                                            : "bg-gray-800/90 text-gray-200 ring-1 ring-gray-600/80 hover:bg-gray-700/90",
                                                                    ].join(" ")}
                                                                >
                                                                    <span>
                                                                        {s.start} a {s.end}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : null}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={() => setShowPrivateModal(false)}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!selectedPrivateSlot}
                                onClick={() => {
                                    const durationMinutes =
                                        privateEffectiveDurationMinutes;
                                    const start = selectedPrivateSlot.start;
                                    setPaymentModalLesson({
                                        id: "PRIVATE_FLOW",
                                        date: privateDate,
                                        start,
                                        duration_minutes: durationMinutes,
                                        price: 0,
                                        starts_at: `${privateDate}T${start}`,
                                        currency: "EUR",
                                    });
                                    setGroupLessonRequestPayload(null);
                                    setShowPrivateModal(false);
                                }}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Continuar al pago
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout1>
    );
}
