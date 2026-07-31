import React from "react";
import {
    formatLongDateLabelMadrid,
    todayYmdInMadrid,
    toYmdInMadrid,
} from "../../lib/madridTime";
import StudentClassCard, { isVipLesson, splitDayLabel } from "./StudentClassCard";

/**
 * Listado de clases por día + filtros de modalidad (panel derecho Academia alumno).
 */
export default function StudentClassFeed({
    modalityFilter,
    visibleModalityFilters = [],
    onModalityFilterChange,
    onRequestPrivate = null,
    vipCalendarNotice = false,
    isTenDayView = false,
    effectiveFeedDate,
    rangeEndDate,
    dayKeys = [],
    visibleDayKeys = [],
    feedByDay = {},
    highlightDay = null,
    registerDayRef,
    remainingDayCount = 0,
    onLoadMoreDays,
    onExpandToTenDays,
    onCollapseToSingleDay,
    enrollmentPolicy = {},
    myEnrollmentStatusByLesson = {},
    myEnrollmentHasProofByLesson = {},
    myEnrollmentAdminNotesByLesson = {},
    isVipUser = false,
    isAuthenticated = false,
    processingId = null,
    onVipEnroll,
    onReserve,
    onOpenGroupBooking,
}) {
    const tenDayControl = (() => {
        if (modalityFilter === "vip") return null;

        if (isTenDayView) {
            return (
                <div className="mt-4 flex justify-center">
                    <button
                        type="button"
                        onClick={onCollapseToSingleDay}
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
                    onClick={onExpandToTenDays}
                    className="rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-200 transition hover:bg-orange-500/20"
                >
                    Ver clases de los próximos 10 días
                </button>
            </div>
        );
    })();

    const loadMore = remainingDayCount > 0 ? (
        <div className="flex justify-center pt-2">
            <button
                type="button"
                onClick={onLoadMoreDays}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600/50 bg-slate-800/70 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-500/30 hover:bg-slate-800 hover:text-white"
            >
                Ver más días
                <span className="text-xs font-normal text-slate-400">
                    ({remainingDayCount} restantes)
                </span>
            </button>
        </div>
    ) : null;

    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-inner">
            <div className="space-y-3">
                <div>
                    <h2 className="font-heading text-base font-bold tracking-tight text-white sm:text-lg">
                        Clases disponibles
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-400">
                        Filtra el listado o reserva una particular.
                    </p>
                </div>

                {/* Toolbar: filtros (segmented) + acción particular — compacta, dos roles visuales */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div
                        className="inline-flex min-w-0 flex-1 flex-wrap items-center gap-1.5"
                        role="group"
                        aria-label="Filtrar clases"
                    >
                        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                            Filtrar
                        </span>
                        <div className="inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-700/80 bg-slate-950/90 p-0.5">
                            {visibleModalityFilters.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => onModalityFilterChange?.(f.id)}
                                    aria-pressed={modalityFilter === f.id}
                                    className={[
                                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors",
                                        modalityFilter === f.id
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200",
                                    ].join(" ")}
                                >
                                    {f.dot ? (
                                        <span
                                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${f.dot}`}
                                            aria-hidden
                                        />
                                    ) : null}
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {typeof onRequestPrivate === "function" ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onRequestPrivate();
                            }}
                            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-100 transition hover:border-amber-300/50 hover:bg-amber-500/25"
                        >
                            Reservar particular
                        </button>
                    ) : null}
                </div>
            </div>

            {modalityFilter === "vip" && (
                <p className="mt-3 text-xs text-slate-400">
                    Mostrando clases VIP desde hoy en adelante.
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
            {vipCalendarNotice && modalityFilter === "vip" && (
                <p className="mt-2 text-xs text-amber-300">
                    El filtro VIP ignora el día del calendario. Cambia a "Todas" para ver un día
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
                        {tenDayControl}
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
                                return visibleDayKeys.map((dayStr) => {
                                    const { weekday, dateLine } = splitDayLabel(dayStr);
                                    const isHot = highlightDay === dayStr;
                                    const lessons = feedByDay[dayStr] || [];

                                    return (
                                        <section
                                            key={dayStr}
                                            ref={(el) => registerDayRef?.(dayStr, el)}
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
                                                        isHot ? "bg-cyan-400" : "bg-slate-500",
                                                    ].join(" ")}
                                                />
                                            </div>

                                            <header className="mb-2.5 flex items-center justify-between gap-2 border-b border-white/[0.06] pb-2">
                                                <h3
                                                    className={[
                                                        "min-w-0 truncate text-[11px] font-semibold capitalize leading-tight text-slate-200 sm:text-xs",
                                                        isHot ? "text-cyan-50" : "",
                                                    ].join(" ")}
                                                >
                                                    {weekday ? (
                                                        <span className="font-bold uppercase tracking-[0.12em] text-cyan-400/90">
                                                            {weekday}
                                                        </span>
                                                    ) : null}
                                                    {weekday && dateLine ? (
                                                        <span className="mx-1.5 text-slate-600">·</span>
                                                    ) : null}
                                                    <span className="text-white/90">
                                                        {dateLine || dayStr}
                                                    </span>
                                                </h3>
                                                <span className="shrink-0 rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-slate-400 ring-1 ring-white/5">
                                                    {lessons.length}{" "}
                                                    {lessons.length === 1 ? "sesión" : "sesiones"}
                                                </span>
                                            </header>

                                            <div className="space-y-3">
                                                {lessons.map((l, idx) => {
                                                    const modality =
                                                        l.modality ||
                                                        (l.is_private ? "particular" : "grupal");
                                                    const isClosed =
                                                        modality === "particular" &&
                                                        Number(l.total_students || 0) >= 6;
                                                    const isFutureOrToday =
                                                        toYmdInMadrid(l.starts_at) >=
                                                        todayYmdInMadrid();
                                                    const maxSlots = Number(l.max_slots ?? 0);
                                                    const totalStudents = Number(
                                                        l.total_students ?? 0,
                                                    );
                                                    const enrollCutoffMinutes = Number(
                                                        enrollmentPolicy?.enroll_cutoff_minutes ?? 30,
                                                    );
                                                    const minutesUntilStart = l.starts_at
                                                        ? Math.floor(
                                                              (new Date(l.starts_at).getTime() -
                                                                  Date.now()) /
                                                                  60000,
                                                          )
                                                        : 0;
                                                    const withinEnrollWindow =
                                                        minutesUntilStart >= enrollCutoffMinutes;
                                                    const enrollmentStatus =
                                                        myEnrollmentStatusByLesson?.[l.id] ?? null;
                                                    const hasActiveEnrollment = [
                                                        "pending",
                                                        "pending_extra_monitor",
                                                        "confirmed",
                                                        "enrolled",
                                                        "attended",
                                                    ].includes(enrollmentStatus);
                                                    const canReserveGroup =
                                                        modality === "grupal" &&
                                                        isFutureOrToday &&
                                                        withinEnrollWindow &&
                                                        !hasActiveEnrollment;
                                                    const canReserveWeekly =
                                                        isAuthenticated &&
                                                        modality === "semanal" &&
                                                        isFutureOrToday &&
                                                        withinEnrollWindow &&
                                                        !hasActiveEnrollment;
                                                    const canReserveGroupOrWeekly =
                                                        canReserveGroup || canReserveWeekly;
                                                    const showLoginToReserve =
                                                        !isAuthenticated &&
                                                        modality === "semanal" &&
                                                        isFutureOrToday &&
                                                        withinEnrollWindow;
                                                    const canVipEnroll =
                                                        (modality === "vip" || isVipLesson(l)) &&
                                                        isVipUser &&
                                                        isFutureOrToday &&
                                                        withinEnrollWindow &&
                                                        !hasActiveEnrollment;
                                                    const batchId = l.batch_id || null;
                                                    const isWeekly =
                                                        modality === "semanal" && !!batchId;
                                                    const prevSameBatch =
                                                        isWeekly &&
                                                        prevLesson &&
                                                        prevLesson.batch_id === batchId &&
                                                        prevLesson.modality === "semanal";
                                                    const next = lessons[idx + 1];
                                                    const nextSameBatch =
                                                        isWeekly &&
                                                        next &&
                                                        next.batch_id === batchId &&
                                                        (next.modality ||
                                                            (next.is_private
                                                                ? "particular"
                                                                : "grupal")) === "semanal";

                                                    if (isWeekly && batchId) {
                                                        batchIndex[batchId] =
                                                            (batchIndex[batchId] || 0) + 1;
                                                    }
                                                    const dayIndex =
                                                        isWeekly && batchId
                                                            ? batchIndex[batchId]
                                                            : null;

                                                    prevLesson = l;

                                                    return (
                                                        <div
                                                            key={l.id}
                                                            className={prevSameBatch ? "-mt-px" : ""}
                                                        >
                                                            <StudentClassCard
                                                                lesson={l}
                                                                isClosed={isClosed}
                                                                weeklyDayIndex={dayIndex}
                                                                weeklyJoinTop={!!prevSameBatch}
                                                                weeklyJoinBottom={!!nextSameBatch}
                                                                enrollmentStatus={enrollmentStatus}
                                                                enrollmentHasProof={
                                                                    !!myEnrollmentHasProofByLesson?.[
                                                                        l.id
                                                                    ]
                                                                }
                                                                enrollmentAdminNotes={
                                                                    myEnrollmentAdminNotesByLesson?.[
                                                                        l.id
                                                                    ] ?? null
                                                                }
                                                                canReserve={canReserveGroupOrWeekly}
                                                                showLoginToReserve={showLoginToReserve}
                                                                canVipEnroll={canVipEnroll}
                                                                onVipEnroll={onVipEnroll}
                                                                onReserve={onReserve}
                                                                onOpenGroupBooking={onOpenGroupBooking}
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
                            {loadMore}
                        </div>
                        {tenDayControl}
                    </div>
                )}
            </div>
        </div>
    );
}
