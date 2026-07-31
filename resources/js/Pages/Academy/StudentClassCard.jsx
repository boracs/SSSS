import React from "react";
import { Link } from "@inertiajs/react";
import { formatCompactDayPartsMadrid, formatTimeMadrid } from "../../lib/madridTime";

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
    particular: { label: "Particular", chip: "border-violet-500/25 bg-violet-500/10 text-violet-200" },
    grupal: { label: "Grupal", chip: "border-indigo-500/25 bg-indigo-500/10 text-indigo-200" },
    semanal: { label: "Semanal", chip: "border-cyan-500/25 bg-cyan-500/10 text-cyan-200" },
    vip: { label: "VIP", chip: "border-rose-500/25 bg-rose-500/10 text-rose-200" },
};

function splitDayLabel(dayStr) {
    return formatCompactDayPartsMadrid(dayStr);
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

export default function StudentClassCard({
    lesson,
    isClosed = false,
    weeklyDayIndex = null,
    weeklyJoinTop = false,
    weeklyJoinBottom = false,
    enrollmentStatus = null,
    enrollmentHasProof = false,
    enrollmentAdminNotes = null,
    canReserve = false,
    showLoginToReserve = false,
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
    const isPrivate = !!lesson.is_private;
    const level = lesson.level || "iniciacion";
    const modality = lesson.modality || (isPrivate ? "particular" : "grupal");
    const modalityMeta = ModalityMap[modality] || ModalityMap.grupal;
    const levelStyle = LevelStyleMap[level] || LevelStyleMap.iniciacion;
    const levelAccent = LevelAccentMap[level] || LevelAccentMap.iniciacion;
    const maxSlots = Number(lesson.max_slots ?? 6);
    const totalStudents = Number(lesson.total_students ?? 0);
    const confirmedCount = Number(lesson.confirmed_count ?? 0);
    const fillRatio = maxSlots > 0 ? Math.min(1, totalStudents / maxSlots) : 0;
    const slotsLabel = maxSlots > 0 ? `${totalStudents}/${maxSlots}` : `${totalStudents}`;
    const canOfferReinforcement =
        (modality === "grupal" || modality === "semanal") &&
        totalStudents >= maxSlots;
    const showCta = canReserve || showLoginToReserve || canVipEnroll;

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

            <div className="space-y-2 p-3 pl-4">
                {/* Fila 1: hora · chips · precio */}
                <div className="flex items-center gap-2">
                    <div className="flex shrink-0 items-center rounded-md border border-white/10 bg-slate-950/70 px-2 py-1">
                        <span className="text-sm font-bold tabular-nums leading-none text-white">
                            {timeStr}
                        </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                        <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${levelStyle}`}
                        >
                            {levelLabel(level)}
                        </span>
                        <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${modalityMeta.chip}`}
                        >
                            {modalityMeta.label}
                        </span>
                        {modality === "semanal" &&
                        weeklyDayIndex != null &&
                        weeklyDayIndex > 1 ? (
                            <span className="rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 ring-1 ring-cyan-500/25">
                                Día {weeklyDayIndex}
                            </span>
                        ) : null}
                        {isClosed ? (
                            <span className="rounded-full bg-slate-700/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-200">
                                Cerrado
                            </span>
                        ) : null}
                        {canOfferReinforcement ? (
                            <span className="text-[10px] font-semibold text-rose-300/90">
                                Refuerzo
                            </span>
                        ) : null}
                    </div>
                    {price != null ? (
                        <div className="shrink-0 tabular-nums text-base font-bold text-white">
                            {price.toFixed(0)}
                            <span className="ml-0.5 text-xs font-semibold text-slate-400">€</span>
                        </div>
                    ) : null}
                </div>

                {/* Fila 2: ubicación + título en una línea */}
                <p className="truncate text-xs text-slate-400">
                    <span className="text-slate-500">{locationLabel}</span>
                    <span className="mx-1.5 text-slate-600">·</span>
                    <span className="text-slate-300">{description}</span>
                </p>

                {enrollmentStatus === "cancelled" && enrollmentAdminNotes ? (
                    <div className="rounded-lg border border-rose-500/30 bg-rose-950/40 px-2.5 py-1.5 text-xs font-medium text-rose-200">
                        Pago rechazado: {enrollmentAdminNotes}
                    </div>
                ) : null}
                {enrollmentStatus === "pending_extra_monitor" ? (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-950/40 px-2.5 py-1.5 text-xs font-medium text-amber-200">
                        Pendiente de cupo extra (admin).
                    </div>
                ) : null}
                {enrollmentStatus === "pending" && enrollmentHasProof ? (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-950/40 px-2.5 py-1.5 text-xs font-medium text-sky-200">
                        Verificando tu pago…
                    </div>
                ) : null}

                {/* Fila 3: plazas + barra | CTA */}
                <div className="flex items-end gap-3">
                    <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-baseline justify-between gap-2">
                            <span className="text-[11px] font-semibold tabular-nums text-slate-300">
                                {slotsLabel}
                                <span className="ml-1 font-normal text-slate-500">plazas</span>
                            </span>
                        </div>
                        <div className="h-1 overflow-hidden rounded-full bg-slate-800/80">
                            <div
                                className={`h-full rounded-full bg-gradient-to-r ${levelAccent} transition-all`}
                                style={{
                                    width: `${Math.max(fillRatio * 100, confirmedCount > 0 ? 8 : 0)}%`,
                                }}
                            />
                        </div>
                    </div>

                    {showCta ? (
                        <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:flex-row sm:items-center">
                            {canReserve ? (
                                <button
                                    type="button"
                                    onClick={() => onOpenGroupBooking?.(lesson)}
                                    disabled={isProcessing}
                                    className="s4-btn s4-btn-primary s4-btn--sm disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isProcessing ? "…" : "Apuntarme"}
                                </button>
                            ) : null}
                            {showLoginToReserve && !canReserve ? (
                                <Link
                                    href={route("login")}
                                    className="s4-btn s4-btn-secondary s4-btn--sm"
                                >
                                    Inicia sesión
                                </Link>
                            ) : null}
                            {canVipEnroll ? (
                                <button
                                    type="button"
                                    onClick={() => onVipEnroll?.(lesson)}
                                    disabled={isProcessing}
                                    className="rounded-lg bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                                >
                                    {isProcessing ? "…" : "Con bono VIP"}
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>
        </article>
    );
}

export { isVipLesson, splitDayLabel, levelLabel };
