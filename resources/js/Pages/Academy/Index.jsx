import React, { useMemo, useState, useEffect, useRef } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import SurfTripFab from "../../components/SurfTripFab";
import PaymentModal from "../../components/PaymentModal";

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-xl border border-slate-100 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
            <div className="h-4 w-20 rounded-full bg-slate-200" />
            <div className="mt-2 h-5 w-3/4 rounded bg-slate-200" />
            <div className="mt-2 flex gap-1.5">
                <div className="h-7 w-7 rounded-full bg-slate-200" />
                <div className="h-7 w-7 rounded-full bg-slate-200" />
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200" />
        </div>
    );
}

function PersonSlotIcon({ filled, title }) {
    return (
        <span className={filled ? "text-brand-accent" : "text-slate-400"} title={title}>
            <svg className="h-4 w-4" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={filled ? 0 : 1.5} viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
        </span>
    );
}

function BookingModal({ open, lesson, onClose, onConfirm, processing = false }) {
    const [quantity, setQuantity] = useState(1);
    const [ageBracket, setAgeBracket] = useState("adult");

    useEffect(() => {
        if (!open) return;
        setQuantity(1);
        setAgeBracket("adult");
    }, [open, lesson?.id]);

    if (!open || !lesson) return null;

    const total = Number(lesson.total_students || 0);
    const maxSlots = Number(lesson.max_slots || 6);
    const available = Math.max(0, maxSlots - total);
    const overBy = quantity > available;
    const requestExtra = overBy;

    const hasAdults = !!lesson?.age_mix?.has_adults;
    const hasChildren = !!lesson?.age_mix?.has_children;
    const ageConflict = ageBracket !== "family" && ((ageBracket === "children" && hasAdults) || (ageBracket === "adult" && hasChildren));

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60" onClick={onClose} aria-hidden />
            <div className="relative w-full max-w-lg rounded-2xl border border-white/20 bg-white p-5 shadow-xl">
                <h3 className="font-heading text-lg font-bold text-brand-deep">Reserva grupal</h3>
                <p className="mt-1 text-sm text-slate-600">Configura tu grupo antes de pagar.</p>

                <div className="mt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Cantidad (1-6)</label>
                    <input
                        type="number"
                        min={1}
                        max={6}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(6, Number(e.target.value || 1))))}
                        className="input-focus-ring mt-2 w-full rounded-xl px-4 py-2.5 text-sm"
                    />
                </div>

                <div className="mt-4">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">Rango de Edad del Grupo</label>
                    <select
                        value={ageBracket}
                        onChange={(e) => setAgeBracket(e.target.value)}
                        className="input-focus-ring mt-2 w-full rounded-xl px-4 py-2.5 text-sm"
                    >
                        <option value="children">👦 Niños (7-11 años)</option>
                        <option value="adult">🏄‍♂️ Adultos / Jóvenes (+12 años)</option>
                        <option value="family">👨‍👩‍👧‍👦 Familia (Mezcla - Clase Especial)</option>
                    </select>
                </div>

                {ageConflict && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                        Este grupo ya cuenta con alumnos de otra franja. Por seguridad y autonomía, te sugerimos buscar una sesión compatible o contactarnos.
                    </div>
                )}

                {requestExtra && (
                    <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
                        ¡Sois un gran grupo! Superamos el límite de 6 alumnos por monitor. Si confirmas, solicitaremos un segundo monitor de refuerzo para vuestra seguridad. El precio no cambia y la calidad mejora.
                    </div>
                )}

                <p className="mt-3 text-xs text-slate-500">
                    El precio se mantiene, pero al ser un grupo mayor, el servicio mejorará con atención personalizada de dos monitores tras nuestra confirmación.
                </p>

                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                    <button
                        type="button"
                        disabled={processing || ageConflict}
                        onClick={() => onConfirm({ quantity, ageBracket, requestExtra })}
                        className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                        {processing ? "Procesando..." : (requestExtra ? "Solicitar Ampliación de Monitor" : "Reservar y pagar")}
                    </button>
                </div>
            </div>
        </div>
    );
}

function LessonCard({ lesson, isEnrolled, enrollmentStatus, creditsBalance, onShowPayment, hasProof = false }) {
    const startsAt = new Date(lesson.starts_at);
    const timeStr = startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const hasFotografo = !!lesson.fotografo;
    const occupied = lesson.party_size_total ?? lesson.enrolled_count;
    const maxSlots = lesson.max_slots ?? 0;
    const isPrivate = !!lesson.is_private;
    const isFullByStaff = !!lesson.is_full_by_staff;

    return (
        <article className="cursor-pointer rounded-xl border border-slate-200/60 bg-slate-50/50 p-3 backdrop-blur-sm transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:bg-white hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-1">
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        lesson.level === "pro"
                            ? "bg-gradient-to-r from-brand-deep/90 to-brand-accent/80 text-white"
                            : "bg-slate-100 text-slate-700"
                    }`}
                >
                    {lesson.level === "pro" ? "Pro" : "Iniciación"}
                </span>
                <span className="text-xs font-medium text-slate-500">{timeStr}</span>
            </div>

            <p className="mt-2 font-heading text-base font-bold tracking-tight text-brand-deep">
                {isPrivate ? "CLASE PRIVADA" : (lesson.title || `Clase ${timeStr}`)}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">{lesson.location}</p>

            <div className="mt-2 flex items-center gap-1.5">
                {lesson.monitor && (
                    <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-deep/10 text-xs font-bold text-brand-deep"
                        title={`Monitor: ${lesson.monitor.nombre}`}
                    >
                        {(lesson.monitor.nombre || "M").charAt(0)}
                    </span>
                )}
                {hasFotografo ? (
                    <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent"
                        title={`Fotógrafo: ${lesson.fotografo.nombre}`}
                    >
                        <CameraIcon className="h-3.5 w-3.5" />
                    </span>
                ) : (
                    <span
                        className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-500"
                        title="Sesión sin fotos"
                    >
                        <CameraSlashIcon className="h-3.5 w-3.5" />
                        <span className="text-[10px]">Sin fotos</span>
                    </span>
                )}
                {maxSlots > 0 && (
                    <span className="ml-auto flex items-center gap-0.5" title={`${occupied} de ${maxSlots} plazas`}>
                        {Array.from({ length: maxSlots }, (_, i) => (
                            <PersonSlotIcon key={i} filled={i < occupied} title={i < occupied ? "Ocupada" : "Libre"} />
                        ))}
                    </span>
                )}
            </div>

            <div className="mt-3 flex gap-2">
                {isEnrolled ? (
                    <>
                        {(enrollmentStatus === "pending" || enrollmentStatus === "confirmed") && (
                            <div className={`flex-1 rounded-xl px-3 py-2 text-center ${
                                enrollmentStatus === "pending" && hasProof
                                    ? "bg-sky-50 text-sky-700 ring-1 ring-sky-200/70"
                                    : enrollmentStatus === "pending"
                                      ? "bg-amber-50 text-amber-800"
                                      : "bg-amber-50 text-amber-800"
                            }`}>
                                <span className="text-sm font-medium">
                                    {enrollmentStatus === "pending" && hasProof
                                        ? "Validando tu pago..."
                                        : enrollmentStatus === "pending"
                                          ? "Pendiente de pago"
                                          : "Confirmada (pendiente de clase)"}
                                </span>
                                {enrollmentStatus === "pending" && hasProof && (
                                    <p className="mt-1 text-xs font-normal text-sky-600/90">
                                        Estamos en ello; puede tardar un rato según el momento. Gracias por tu paciencia.
                                    </p>
                                )}
                            </div>
                        )}
                        {enrollmentStatus === "pending" && onShowPayment && (
                            <button
                                type="button"
                                onClick={() => onShowPayment(lesson)}
                                className="btn-secondary flex-1 text-sm"
                            >
                                Ver instrucciones de pago
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => router.post(route("academy.lessons.cancel", lesson.id))}
                            className="btn-secondary flex-1 text-sm"
                        >
                            {enrollmentStatus === "pending" || enrollmentStatus === "confirmed" ? "Cancelar solicitud" : "Cancelar inscripción"}
                        </button>
                    </>
                ) : occupied < maxSlots && !isFullByStaff ? (
                    <button
                        type="button"
                        onClick={() => router.post(route("academy.lessons.request", lesson.id), { party_size: 1 })}
                        className="btn-primary flex-1 text-sm"
                    >
                        Solicitar clase
                    </button>
                ) : (
                    <span className="text-sm text-slate-500">
                        {isFullByStaff ? "Completo (staff)" : "Clase completa"}
                    </span>
                )}
            </div>
        </article>
    );
}

function CameraIcon({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" />
        </svg>
    );
}
function CameraSlashIcon({ className }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
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

function CalendarCommander({ monthDate, selectedDate, onSelectDay, onNavigateMonth, dayStats = {}, mySignalsByDate = {} }) {
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

        let left = (anchorRect.left - wrapRect.left) + (anchorRect.width / 2) - (tooltipW / 2);
        left = Math.max(8, Math.min(left, wrapRect.width - tooltipW - 8));

        let top = (anchorRect.top - wrapRect.top) - tooltipH - gap;
        const placeBelow = top < 8;
        if (placeBelow) top = (anchorRect.bottom - wrapRect.top) + gap;

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
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
    const firstDow = (monthStart.getDay() + 6) % 7; // lunes=0
    const totalCells = Math.ceil((firstDow + monthEnd.getDate()) / 7) * 7;

    const cells = [];
    for (let i = 0; i < totalCells; i++) {
        const dayNum = i - firstDow + 1;
        const inMonth = dayNum >= 1 && dayNum <= monthEnd.getDate();
        const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayNum);
        const key = ymd(d);
        const stats = dayStats[key] || null;
        cells.push({ key, inMonth, dayNum, dateStr: key, stats });
    }

    const title = monthStart.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const week = ["L", "M", "X", "J", "V", "S", "D"];

    const labelFor = (p) => {
        const base = p.t === "particular" ? "Particular" : p.t === "semanal" ? "Semanal" : "Grupal";
        const level = p.level === "avanzado" ? "Avanzado" : p.level === "intermedio" ? "Intermedio" : "Iniciación";
        return p.vip ? `${level} (VIP)` : base;
    };

    const dotClass = (p) => {
        if (p.vip) return "bg-amber-400 ring-1 ring-amber-600/50";
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
        <div ref={wrapRef} className="relative rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {hover && (
                <div
                    className="pointer-events-none absolute z-[200] w-[220px] rounded-lg bg-slate-900/90 p-3 text-white shadow-lg backdrop-blur-sm"
                    style={{ left: hover.left, top: hover.top }}
                    role="tooltip"
                >
                    <div
                        className={`absolute left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-900/90 ${hover.placeBelow ? "-top-1" : "-bottom-1"}`}
                        aria-hidden
                    />
                    <div className="space-y-1">
                        {hover.list.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs leading-none">
                                <span className={`h-2 w-2 rounded-full ${dotClass(p)}`} />
                                <span className="font-semibold tabular-nums">{p.time}</span>
                                <span className="text-white/90">- {labelFor(p)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={() => onNavigateMonth(-1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-all duration-300"
                    aria-label="Mes anterior"
                >
                    ←
                </button>
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-600">
                    {title}
                </h2>
                <button
                    type="button"
                    onClick={() => onNavigateMonth(1)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-slate-100 transition-all duration-300"
                    aria-label="Mes siguiente"
                >
                    →
                </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-xs font-semibold text-slate-500">
                {week.map((w) => (
                    <div key={w} className="text-center">{w}</div>
                ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1">
                {cells.map((c, idx) => {
                    const selected = c.dateStr === selectedDate;
                    const disabled = !c.inMonth;

                    const items = c.stats?.items || [];
                    const total = c.stats?.total || 0;
                    const pills = items.slice(0, 3);
                    const overflow = total > 3 ? total - 3 : 0;

                    const hasWeekly = (c.stats?.count_by_type?.semanal || 0) > 0;
                    const prev = cells[idx - 1];
                    const next = cells[idx + 1];
                    const connectLeft = hasWeekly && idx % 7 !== 0 && (prev?.stats?.count_by_type?.semanal || 0) > 0 && isConsecutive(prev?.dateStr, c.dateStr);
                    const connectRight = hasWeekly && idx % 7 !== 6 && (next?.stats?.count_by_type?.semanal || 0) > 0 && isConsecutive(c.dateStr, next?.dateStr);

                    const pillClass = (t, vip) => {
                        if (vip) return "bg-amber-400 ring-1 ring-amber-600/50";
                        if (t === "particular") return "bg-red-500";
                        if (t === "semanal") return "bg-sky-500";
                        return "bg-emerald-500"; // grupal
                    };

                    return (
                        <button
                            key={c.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelectDay(c.dateStr)}
                            onMouseEnter={(e) => showTooltip(c.dateStr, e.currentTarget, "cell")}
                            onMouseLeave={hideTooltip}
                            onFocus={(e) => showTooltip(c.dateStr, e.currentTarget, "cell")}
                            onBlur={hideTooltip}
                            className={[
                                "relative h-11 rounded-xl text-sm font-medium transition-all duration-200 ease-in-out",
                                disabled ? "text-slate-300" : "cursor-pointer text-slate-700 hover:scale-[1.05] hover:bg-white hover:shadow-md",
                                selected
                                    ? "bg-[#00D1FF] text-slate-900 ring-2 ring-white/60 shadow-[0_10px_25px_rgba(0,209,255,0.4)]"
                                    : "bg-slate-50 border border-slate-100 hover:border-slate-200",
                            ].join(" ")}
                        >
                            <span className="absolute left-2 top-2 text-xs">{c.inMonth ? c.dayNum : ""}</span>
                            {/* Estado alumno (solicitud/pago) */}
                            {(() => {
                                const sig = mySignalsByDate?.[c.dateStr];
                                if (!sig) return null;
                                if (sig.rejected) {
                                    return <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" title="Pago rechazado" />;
                                }
                                if (sig.verifying) {
                                    return <span className="absolute right-2 top-2 h-2 w-2 animate-pulse rounded-full bg-[#00D1FF]" title="Verificando tu pago..." />;
                                }
                                if (sig.pending) {
                                    return <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-amber-400" title="Solicitud enviada / Pendiente de pago" />;
                                }
                                return null;
                            })()}
                            <div className="absolute bottom-1.5 left-2 right-2 flex items-end gap-1">
                                {/* Mobile (<640): un punto por tipo */}
                                <div className="flex w-full items-center justify-between sm:hidden">
                                    {c.stats?.count_by_type?.particular > 0 && <span className="h-1.5 w-1.5 rounded-full bg-red-500" />}
                                    {c.stats?.count_by_type?.grupal > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                                    {c.stats?.count_by_type?.semanal > 0 && <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />}
                                    {c.stats?.is_vip && <span className="h-1.5 w-1.5 rounded-full bg-amber-400 ring-1 ring-amber-600/50" />}
                                </div>
                                {/* Desktop: micro-pills (alto sagrado) */}
                                <div className="relative hidden w-full items-end gap-1 sm:flex">
                                    {/* Bridge semanal por debajo */}
                                    {hasWeekly && (
                                        <span
                                            className={[
                                                "absolute -bottom-[2px] h-[3px] rounded-full bg-sky-500",
                                                connectLeft ? "-left-1" : "left-0.5",
                                                connectRight ? "-right-1" : "right-0.5",
                                            ].join(" ")}
                                            aria-hidden
                                        />
                                    )}
                                    {pills.map((p, pIdx) => (
                                        <span key={pIdx} className={`relative z-10 h-[3px] flex-1 rounded-full ${pillClass(p.t, p.vip)}`} />
                                    ))}
                                    {overflow > 0 && (
                                        <span
                                            className="ml-auto cursor-pointer text-[9px] font-semibold text-slate-400"
                                            onMouseEnter={(e) => {
                                                e.stopPropagation();
                                                showTooltip(c.dateStr, e.currentTarget.closest("button"), "overflow");
                                            }}
                                        >
                                            +{overflow}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    <span className="h-2 w-2 rounded-full bg-sky-500" /> Disponible
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    <span className="h-2 w-2 rounded-full bg-amber-500" /> Solicitud enviada
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">
                    <span className="h-2 w-2 rounded-full bg-slate-400" /> Completo (staff)
                </span>
            </div>
        </div>
    );
}

const DESCRIPTION_FALLBACK = "Sesión técnica de surf sin descripción adicional.";

const LevelStyleMap = {
    iniciacion: "bg-emerald-100 text-emerald-700",
    intermedio: "bg-sky-100 text-sky-700",
    avanzado: "bg-rose-100 text-rose-700",
};

const ModalityMap = {
    particular: { icon: "🔒", label: "Privada (1-6 pax)" },
    grupal: { icon: "👥", label: "Clase Abierta" },
    semanal: { icon: "🗓️", label: "Curso Semanal" },
};

function levelLabel(level) {
    if (level === "avanzado") return "Avanzado";
    if (level === "intermedio") return "Intermedio";
    return "Iniciación";
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
    isProcessing = false,
    onOpenGroupBooking = null,
}) {
    const startsAt = new Date(lesson.starts_at);
    const timeStr = startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const locationLabel = lesson.location || "Zurriola";
    const description = lesson.description?.trim() || DESCRIPTION_FALLBACK;
    const price = lesson.price != null ? Number(lesson.price) : null;
    const currency = lesson.currency || "EUR";
    const isPrivate = !!lesson.is_private;
    const level = lesson.level || "iniciacion";
    const modality = lesson.modality || (isPrivate ? "particular" : "grupal");
    const modalityMeta = ModalityMap[modality] || ModalityMap.grupal;
    const levelStyle = LevelStyleMap[level] || LevelStyleMap.iniciacion;
    const maxSlots = Number(lesson.max_slots ?? 6);
    const totalStudents = Number(lesson.total_students ?? 0);
    const canOfferReinforcement = (modality === "grupal" || modality === "semanal") && totalStudents >= maxSlots;

    return (
        <article
            className={[
                "rounded-xl border border-slate-200/60 p-3 transition-all duration-200 ease-in-out",
                isClosed ? "bg-slate-100 text-slate-500 opacity-90" : "cursor-pointer bg-white hover:-translate-y-0.5 hover:shadow-md",
                weeklyJoinTop ? "rounded-t-none" : "",
                weeklyJoinBottom ? "rounded-b-none" : "",
                (modality === "semanal" && (weeklyJoinTop || weeklyJoinBottom)) ? "border-l-4 border-l-sky-400" : "",
            ].join(" ")}
        >
            <div className="-mx-3 -mt-3 mb-2 flex flex-wrap items-start justify-between gap-2 rounded-t-xl border-b border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="font-semibold text-slate-900">{timeStr}</span>
                    <span className="text-slate-400">|</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${levelStyle}`}>
                        {levelLabel(level)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {modalityMeta.icon} {modalityMeta.label}
                    </span>
                    <span className="text-slate-500">· {locationLabel}</span>
                </div>
                {price != null && (
                    <span className="text-sm font-bold text-slate-900">
                        {price.toFixed(0)}€
                    </span>
                )}
            </div>
            {modality === "semanal" && weeklyDayIndex != null && weeklyDayIndex > 1 && (
                <div className="-mt-1 mb-2 text-[11px] font-semibold text-sky-700">
                    Día {weeklyDayIndex} del Curso Semanal
                </div>
            )}
            {isClosed && (
                <div className="-mt-1 mb-2 inline-flex rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    GRUPO CERRADO
                </div>
            )}
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {description}
            </p>
            {enrollmentStatus === "cancelled" && enrollmentAdminNotes && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
                    Pago rechazado: {enrollmentAdminNotes}
                </div>
            )}
            {enrollmentStatus === "pending" && enrollmentHasProof && (
                <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
                    Verificando tu pago...
                </div>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    Confirmados {lesson.confirmed_count ?? 0}
                </span>
                <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Pendientes {lesson.pending_count ?? 0}
                </span>
                <span className="inline-flex items-center rounded-full bg-sky-500/10 px-2 py-0.5 text-xs font-medium text-sky-700">
                    Total {lesson.total_students ?? 0}
                </span>
                {canOfferReinforcement && (
                    <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                        🔥 ¡Casi lleno! Refuerzo disponible
                    </span>
                )}
            </div>
            {canReserve && (
                <div className="mt-3">
                    <button
                        type="button"
                        onClick={() => onOpenGroupBooking?.(lesson)}
                        disabled={isProcessing}
                        className={[
                            "w-full rounded-lg bg-sky-600 px-4 py-2 font-bold text-white transition-colors hover:bg-sky-700",
                            "disabled:opacity-70 disabled:cursor-not-allowed hover:disabled:bg-sky-600",
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
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                                </svg>
                                Procesando...
                            </span>
                        ) : (
                            "Reservar Plaza"
                        )}
                    </button>
                </div>
            )}
        </article>
    );
}

function ClassStack({ dateStr, lessons, onRequestEmptyDay, onCreateClassUrl }) {
    const pretty = new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    if (!lessons || lessons.length === 0) {
        return (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-700">
                    Class-Stack · {pretty}
                </h2>
                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center">
                    <p className="text-sm font-medium text-slate-600">
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
                        <button type="button" onClick={onRequestEmptyDay} className="btn-primary mt-4">
                            Solicitar una clase aquí
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-700">
                Class-Stack · {pretty}
            </h2>
            <div className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
                <div className="rounded-xl bg-slate-50 p-3">
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
    const [date, setDate] = useState(selectedDate);
    const [month, setMonth] = useState(calendarMonth || selectedDate);
    const [paymentModalLesson, setPaymentModalLesson] = useState(null);
    const [bookingModalLesson, setBookingModalLesson] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const pageProps = usePage().props;
    const { flash, auth } = pageProps;
    const currentUser = auth?.user || null;
    const isAdmin = !!currentUser && (
        String(currentUser.role) === "admin" ||
        currentUser.is_admin === true ||
        String(currentUser.is_admin) === "1"
    );

    const feedLessons = useMemo(() => (Array.isArray(lessonsFeed) ? lessonsFeed : []), [lessonsFeed]);

    // Oferta pública: ocultar particulares salvo que el alumno tenga una inscripción propia en esa clase.
    const visibleFeedLessons = useMemo(() => {
        return feedLessons.filter((l) => {
            const modality = l.modality || (l.is_private ? "particular" : "grupal");
            if (modality !== "particular") return true;
            return !!myEnrollmentStatusByLesson?.[l.id];
        });
    }, [feedLessons, myEnrollmentStatusByLesson]);

    const mySignalsByDate = useMemo(() => {
        const out = {};
        for (const l of feedLessons) {
            const st = myEnrollmentStatusByLesson?.[l.id];
            if (!st) continue;
            const d = l.date;
            if (!d) continue;
            const hasProof = !!myEnrollmentHasProofByLesson?.[l.id];
            const notes = myEnrollmentAdminNotesByLesson?.[l.id] || null;
            if (!out[d]) out[d] = { pending: false, verifying: false, rejected: false };
            if (st === "pending" && hasProof) out[d].verifying = true;
            else if (st === "pending") out[d].pending = true;
            else if (st === "cancelled" && notes) out[d].rejected = true;
        }
        return out;
    }, [feedLessons, myEnrollmentStatusByLesson, myEnrollmentHasProofByLesson, myEnrollmentAdminNotesByLesson]);
    const [modalityFilter, setModalityFilter] = useState("all"); // all | particular | grupal | semanal

    const filteredFeedLessons = useMemo(() => {
        const base = visibleFeedLessons;
        if (modalityFilter === "all") return base;
        return base.filter((l) => (l.modality || (l.is_private ? "particular" : "grupal")) === modalityFilter);
    }, [visibleFeedLessons, modalityFilter]);

    const [showPrivateModal, setShowPrivateModal] = useState(false);
    const [privateDate, setPrivateDate] = useState(() => selectedDate);
    const [privateSlots, setPrivateSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedPrivateSlot, setSelectedPrivateSlot] = useState(null);

    const [miniMonth, setMiniMonth] = useState(() => selectedDate);
    const todayStr = new Date().toISOString().slice(0, 10);
    const miniMonthStart = useMemo(() => startOfMonth(new Date((miniMonth || selectedDate) + "T12:00:00")), [miniMonth, selectedDate]);
    const miniMonthEnd = useMemo(() => new Date(miniMonthStart.getFullYear(), miniMonthStart.getMonth() + 1, 0), [miniMonthStart]);
    const miniFirstDow = useMemo(() => (miniMonthStart.getDay() + 6) % 7, [miniMonthStart]); // lunes=0
    const miniTotalCells = useMemo(() => Math.ceil((miniFirstDow + miniMonthEnd.getDate()) / 7) * 7, [miniFirstDow, miniMonthEnd]);
    const miniCells = useMemo(() => {
        const out = [];
        for (let i = 0; i < miniTotalCells; i++) {
            const dayNum = i - miniFirstDow + 1;
            const inMonth = dayNum >= 1 && dayNum <= miniMonthEnd.getDate();
            const d = new Date(miniMonthStart.getFullYear(), miniMonthStart.getMonth(), dayNum);
            out.push({ key: ymd(d), inMonth, dayNum });
        }
        return out;
    }, [miniTotalCells, miniFirstDow, miniMonthStart, miniMonthEnd]);

    const loadPrivateSlots = async (d) => {
        setLoadingSlots(true);
        setSelectedPrivateSlot(null);
        try {
            const res = await fetch(route("academy.private.availability", { date: d }), { headers: { Accept: "application/json" } });
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
            const d = l.date || (l.starts_at ? String(l.starts_at).slice(0, 10) : null);
            if (!d) continue;
            if (!out[d]) out[d] = [];
            out[d].push(l);
        }
        return out;
    }, [filteredFeedLessons]);

    const dayKeys = useMemo(() => Object.keys(feedByDay).sort(), [feedByDay]);
    const feedWrapRef = useRef(null);
    const dayRefMap = useRef({});
    const [highlightDay, setHighlightDay] = useState(null);
    const todayDateOnly = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const submitGroupBooking = (lesson, payload) => {
        if (!lesson?.id) return;
        setProcessingId(lesson.id);
        const enrolledStatus = myEnrollmentStatusByLesson?.[lesson.id];
        if (enrolledStatus === "pending" || enrolledStatus === "confirmed") {
            setPaymentModalLesson(lesson);
            setBookingModalLesson(null);
            setProcessingId(null);
            return;
        }
        router.post(
            route("academy.lessons.request", lesson.id),
            {
                quantity: payload?.quantity ?? 1,
                age_bracket: payload?.ageBracket ?? "adult",
                request_extra_monitor: !!payload?.requestExtra,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setPaymentModalLesson(lesson);
                    setBookingModalLesson(null);
                    router.reload({
                        only: [
                            "lessonsFeed",
                            "myEnrollmentStatusByLesson",
                            "myEnrollmentHasProofByLesson",
                            "myEnrollmentExpiresAtByLesson",
                            "myEnrollmentIdByLesson",
                            "auth",
                        ],
                        onFinish: () => setProcessingId(null),
                    });
                    setProcessingId(null);
                },
                onError: () => setProcessingId(null),
            }
        );
    };

    useEffect(() => {
        const id = flash?.payment_lesson_id;
        if (!id) return;
        const lesson = feedLessons.find((l) => l.id === id);
        if (lesson) setPaymentModalLesson(lesson);
    }, [flash?.payment_lesson_id, feedLessons]);

    const monthDate = useMemo(() => startOfMonth(new Date((month || selectedDate) + "T12:00:00")), [month, selectedDate]);

    const scrollToDay = (dayStr) => {
        const el = dayRefMap.current?.[dayStr];
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        setHighlightDay(dayStr);
        window.clearTimeout(scrollToDay._t);
        scrollToDay._t = window.setTimeout(() => setHighlightDay(null), 1400);
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
            <div className="mx-auto max-w-7xl px-4 pt-28 pb-6 sm:px-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="font-heading text-2xl font-bold tracking-tight text-brand-deep">
                            Clases de surf
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Tu saldo: <strong className="text-brand-deep">{creditsBalance} créditos</strong>
                        </p>
                    </div>
                    <Link
                        href={route("academy.lessons.index")}
                        className="btn-secondary text-sm"
                    >
                        Recargar
                    </Link>
                </div>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setShowPrivateModal(true);
                            loadPrivateSlots(privateDate);
                        }}
                        className="rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-300 px-5 py-3 text-sm font-extrabold text-slate-900 shadow-md transition-all duration-200 ease-in-out hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        Solicitar Clase Particular
                    </button>
                    <p className="text-sm text-slate-600">
                        Clases particulares no se muestran en la oferta pública.
                    </p>
                </div>

                {flash?.success && (
                    <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-4 rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800">
                        {flash.error}
                    </div>
                )}

                <div className="flex flex-col gap-8 lg:flex-row">
                    <aside className="w-full lg:w-[30%]">
                        <div className="sticky top-28">
                            <CalendarCommander
                                monthDate={monthDate}
                                selectedDate={date}
                                onSelectDay={(d) => {
                                    setDate(d);
                                    scrollToDay(d);
                                }}
                                onNavigateMonth={navigateMonth}
                                dayStats={dayStats}
                                mySignalsByDate={mySignalsByDate}
                            />
                        </div>
                    </aside>

                    <main className="flex-1 lg:w-[70%]">
                        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xl">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-700">
                                    Class-Stack
                                </h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        { id: "all", label: "Todas" },
                                        { id: "particular", label: "Particulares" },
                                        { id: "grupal", label: "Grupales" },
                                        { id: "semanal", label: "Semanales" },
                                    ].map((f) => (
                                        <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => setModalityFilter(f.id)}
                                            className={[
                                                "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ease-in-out",
                                                modalityFilter === f.id
                                                    ? "bg-[#00D1FF] text-slate-900 shadow-[0_10px_25px_rgba(0,209,255,0.25)]"
                                                    : "bg-slate-100 text-slate-600 hover:-translate-y-0.5 hover:bg-white hover:shadow-sm",
                                            ].join(" ")}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div ref={feedWrapRef} className="mt-4 max-h-[70vh] overflow-y-auto pr-1">
                                {dayKeys.length === 0 ? (
                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-6 text-center text-slate-600">
                                        No hay clases futuras programadas.
                                    </div>
                                ) : (
                                    <div className="rounded-xl bg-slate-50 p-3">
                                        {(() => {
                                            const batchIndex = {};
                                            let prevLesson = null;
                                            return dayKeys.map((dayStr) => {
                                                const pretty = new Date(dayStr + "T12:00:00").toLocaleDateString("es-ES", {
                                                    weekday: "long",
                                                    day: "numeric",
                                                    month: "long",
                                                    year: "numeric",
                                                }).toUpperCase();
                                                const isHot = highlightDay === dayStr;
                                                const lessons = feedByDay[dayStr] || [];

                                                return (
                                                    <section
                                                        key={dayStr}
                                                        ref={(el) => {
                                                            if (el) dayRefMap.current[dayStr] = el;
                                                        }}
                                                        className="mb-6 last:mb-0 scroll-mt-4"
                                                    >
                                                        <div className="sticky top-0 z-10 -mx-3 mb-3 border-b border-slate-200 bg-slate-50/95 px-3 py-2 backdrop-blur">
                                                            <div
                                                                className={[
                                                                    "inline-flex rounded-lg px-2 py-1 text-xs font-extrabold tracking-wider text-slate-800 transition-all duration-200",
                                                                    isHot ? "ring-2 ring-brand-accent/50 bg-white shadow-sm" : "bg-white/70 ring-1 ring-slate-200/60",
                                                                ].join(" ")}
                                                            >
                                                                {pretty}
                                                            </div>
                                                        </div>
                                                        <div className="space-y-0">
                                                            {lessons.map((l, idx) => {
                                                                const modality = l.modality || (l.is_private ? "particular" : "grupal");
                                                                const isClosed = modality === "particular" && Number(l.total_students || 0) >= 6;
                                                                const startsAt = new Date(l.starts_at);
                                                                const dateFloor = new Date(startsAt);
                                                                dateFloor.setHours(0, 0, 0, 0);
                                                                const isFutureOrToday = dateFloor.getTime() >= todayDateOnly.getTime();
                                                                const maxSlots = Number(l.max_slots ?? 0);
                                                                const totalStudents = Number(l.total_students ?? 0);
                                                                const hasFreeSlots = maxSlots > 0 ? totalStudents < maxSlots : true;
                                                                const enrollmentStatus = myEnrollmentStatusByLesson?.[l.id] ?? null;
                                                                const isActiveEnrollment = enrollmentStatus === "pending" || enrollmentStatus === "confirmed";
                                                                const canReserveGroupOrWeekly = (modality === "grupal" || modality === "semanal") && isFutureOrToday;
                                                                const canReserve = canReserveGroupOrWeekly;
                                                                const batchId = l.batch_id || null;
                                                                const isWeekly = modality === "semanal" && !!batchId;
                                                                const prevSameBatch = isWeekly && prevLesson && (prevLesson.batch_id === batchId) && (prevLesson.modality === "semanal");

                                                                const next = lessons[idx + 1];
                                                                const nextSameBatch = isWeekly && next && (next.batch_id === batchId) && ((next.modality || (next.is_private ? "particular" : "grupal")) === "semanal");

                                                                if (isWeekly && batchId) {
                                                                    batchIndex[batchId] = (batchIndex[batchId] || 0) + 1;
                                                                }
                                                                const dayIndex = (isWeekly && batchId) ? batchIndex[batchId] : null;

                                                                prevLesson = l;

                                                                return (
                                                                    <div key={l.id} className={prevSameBatch ? "mb-0" : "mb-4"} >
                                                                        <ClassStackCard
                                                                            lesson={l}
                                                                            isClosed={isClosed}
                                                                            weeklyDayIndex={dayIndex}
                                                                            weeklyJoinTop={!!prevSameBatch}
                                                                            weeklyJoinBottom={!!nextSameBatch}
                                                                            enrollmentStatus={enrollmentStatus}
                                                                            enrollmentHasProof={!!myEnrollmentHasProofByLesson?.[l.id]}
                                                                            enrollmentAdminNotes={myEnrollmentAdminNotesByLesson?.[l.id] ?? null}
                                                                            canReserve={canReserve}
                                                                            onReserve={submitGroupBooking}
                                                                            onOpenGroupBooking={setBookingModalLesson}
                                                                            isProcessing={processingId === l.id}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </section>
                                                );
                                            });
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
            {pendingSurfTripLesson && <SurfTripFab lesson={pendingSurfTripLesson} />}
            <PaymentModal
                open={!!paymentModalLesson}
                onClose={() => setPaymentModalLesson(null)}
                lesson={paymentModalLesson}
                expiresAt={paymentModalLesson && !myEnrollmentHasProofByLesson[paymentModalLesson.id] ? myEnrollmentExpiresAtByLesson[paymentModalLesson.id] : null}
                hasProof={!!(paymentModalLesson && myEnrollmentHasProofByLesson[paymentModalLesson.id])}
                enrollmentId={paymentModalLesson ? myEnrollmentIdByLesson[paymentModalLesson.id] : null}
                bizumNumber={paymentBizumNumber}
                iban={paymentIban}
                whatsappHelpUrl={whatsappHelpUrl}
                isAdmin={isAdmin}
                currentUserId={currentUser?.id ?? null}
                onSuccessAction={() => {
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
                onClose={() => setBookingModalLesson(null)}
                processing={bookingModalLesson ? processingId === bookingModalLesson.id : false}
                onConfirm={(payload) => {
                    if (!bookingModalLesson) return;
                    submitGroupBooking(bookingModalLesson, payload);
                }}
            />

            {showPrivateModal && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60" onClick={() => setShowPrivateModal(false)} aria-hidden />
                    <div className="relative w-full max-w-2xl rounded-2xl border border-white/20 bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="font-heading text-lg font-bold text-brand-deep">Solicitar clase particular</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    Elige fecha y un tramo de 1.5h con al menos 1 monitor libre.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPrivateModal(false)}
                                className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
                            >
                                Cerrar
                            </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700">Fecha</label>
                                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    <div className="flex items-center justify-between">
                                        <button
                                            type="button"
                                            onClick={() => setMiniMonth(ymd(addMonths(miniMonthStart, -1)))}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white transition-all duration-200 ease-in-out"
                                            aria-label="Mes anterior"
                                        >
                                            ←
                                        </button>
                                        <div className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
                                            {miniMonthStart.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setMiniMonth(ymd(addMonths(miniMonthStart, 1)))}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white transition-all duration-200 ease-in-out"
                                            aria-label="Mes siguiente"
                                        >
                                            →
                                        </button>
                                    </div>
                                    <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] font-bold text-slate-500">
                                        {["L", "M", "X", "J", "V", "S", "D"].map((w) => (
                                            <div key={w} className="text-center">{w}</div>
                                        ))}
                                    </div>
                                    <div className="mt-2 grid grid-cols-7 gap-1">
                                        {miniCells.map((c) => {
                                            const disabled = !c.inMonth || c.key < todayStr;
                                            const selected = c.key === privateDate;
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
                                                        disabled ? "bg-slate-100 text-slate-300 cursor-not-allowed" : "bg-white text-slate-700 hover:-translate-y-0.5 hover:shadow-sm",
                                                        selected ? "bg-[#00D1FF] text-slate-900 shadow-[0_10px_25px_rgba(0,209,255,0.25)]" : "ring-1 ring-slate-200/70",
                                                    ].join(" ")}
                                                >
                                                    {c.inMonth ? c.dayNum : ""}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <p className="mt-2 text-xs text-slate-600">
                                        Seleccionado: <span className="font-semibold text-slate-800">{privateDate}</span>
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700">Horario (1.5h)</label>
                                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                                    {loadingSlots ? (
                                        <p className="text-sm text-slate-600">Cargando disponibilidad…</p>
                                    ) : privateSlots.length === 0 ? (
                                        <p className="text-sm text-slate-600">No hay huecos disponibles para ese día.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {privateSlots.map((s) => {
                                                const key = `${s.start}-${s.end}`;
                                                const active = selectedPrivateSlot?.start === s.start;
                                                return (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        onClick={() => setSelectedPrivateSlot(s)}
                                                        className={[
                                                            "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ease-in-out",
                                                            active ? "bg-[#00D1FF] text-slate-900" : "bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:shadow-sm",
                                                        ].join(" ")}
                                                    >
                                                        {s.start}–{s.end}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap justify-end gap-2">
                            <button type="button" className="btn-secondary" onClick={() => setShowPrivateModal(false)}>
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={!selectedPrivateSlot}
                                onClick={() => {
                                    router.post(route("academy.private.request"), { date: privateDate, start: selectedPrivateSlot.start }, { preserveScroll: true });
                                    setShowPrivateModal(false);
                                }}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout1>
    );
}
