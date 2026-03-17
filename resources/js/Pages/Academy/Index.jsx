import React, { useMemo, useState, useEffect } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import SurfTripFab from "../../components/SurfTripFab";
import PaymentModal from "../../components/PaymentModal";

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-3 shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
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

function LessonCard({ lesson, isEnrolled, enrollmentStatus, creditsBalance, onShowPayment, hasProof = false }) {
    const startsAt = new Date(lesson.starts_at);
    const timeStr = startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const hasFotografo = !!lesson.fotografo;
    const occupied = lesson.party_size_total ?? lesson.enrolled_count;
    const maxSlots = lesson.max_slots ?? 0;
    const isPrivate = !!lesson.is_private;
    const isFullByStaff = !!lesson.is_full_by_staff;

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-sm transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]">
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

function CalendarCommander({ monthDate, selectedDate, onSelectDay, onNavigateMonth, dayMeta }) {
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
        const meta = dayMeta[key] || {};
        cells.push({ key, inMonth, dayNum, dateStr: key, meta });
    }

    const title = monthStart.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const week = ["L", "M", "X", "J", "V", "S", "D"];

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
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
                {cells.map((c) => {
                    const selected = c.dateStr === selectedDate;
                    const disabled = !c.inMonth;

                    // Indicadores
                    const showBlue = !!c.meta.hasAvailable;
                    const showAmber = !!c.meta.hasMyRequest;
                    const showFull = !!c.meta.isFullByStaff;

                    return (
                        <button
                            key={c.key}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelectDay(c.dateStr)}
                            className={[
                                "relative h-11 rounded-xl text-sm font-medium transition-all duration-300",
                                disabled ? "text-slate-300" : "text-slate-700 hover:bg-slate-50",
                                selected ? "bg-brand-deep text-white shadow-md" : "bg-white ring-1 ring-slate-200/70",
                            ].join(" ")}
                        >
                            <span className="absolute left-2 top-2 text-xs">{c.inMonth ? c.dayNum : ""}</span>
                            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5">
                                {showBlue && <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : "bg-sky-500"}`} />}
                                {showAmber && <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : "bg-amber-500"}`} />}
                                {showFull && <span className={`h-1.5 w-1.5 rounded-full ${selected ? "bg-white" : "bg-slate-400"}`} />}
                            </span>
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

function ClassStackCard({ lesson }) {
    const startsAt = new Date(lesson.starts_at);
    const timeStr = startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const levelLabel = lesson.level === "pro" ? "Pro" : "Iniciación";
    const locationLabel = lesson.location || "Zurriola";
    const description = lesson.description?.trim() || DESCRIPTION_FALLBACK;
    const price = lesson.price != null ? Number(lesson.price) : null;
    const currency = lesson.currency || "EUR";
    const isPrivate = !!lesson.is_private;

    return (
        <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_6px_24px_rgba(0,0,0,0.1)] transition-all duration-300 hover:border-sky-200 hover:shadow-[0_10px_40px_rgba(0,0,0,0.15)]">
            <div className="-mx-3 -mt-3 mb-2 flex flex-wrap items-start justify-between gap-2 rounded-t-xl border-b border-slate-100 bg-slate-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                    <span className="font-semibold text-slate-800">{timeStr}</span>
                    <span className="text-slate-400">|</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                        {isPrivate ? "Privada" : levelLabel}
                    </span>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">{locationLabel}</span>
                </div>
                {price != null && (
                    <span className="text-sm font-bold text-brand-deep">
                        {price.toFixed(0)}€
                    </span>
                )}
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {description}
            </p>
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
            </div>
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
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-700">
                    Class-Stack · {pretty}
                </h2>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
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
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <h2 className="font-heading text-sm font-bold uppercase tracking-wider text-slate-700">
                Class-Stack · {pretty}
            </h2>
            <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
                {lessons.map((l) => (
                    <ClassStackCard key={l.id} lesson={l} />
                ))}
            </div>
        </div>
    );
}

export default function AcademyIndex({
    selectedDate,
    calendarMonth,
    rangeStart,
    rangeEnd,
    lessonsByDate = {},
    optimalDates = [],
    creditsBalance = 0,
    myEnrollmentLessonIds = [],
    myEnrollmentStatusByLesson = {},
    myEnrollmentExpiresAtByLesson = {},
    myEnrollmentHasProofByLesson = {},
    myEnrollmentIdByLesson = {},
    pendingSurfTripLesson = null,
    paymentBizumNumber = "[BIZUM_NUMBER]",
    paymentIban = "[IBAN]",
    whatsappHelpUrl = null,
}) {
    const [date, setDate] = useState(selectedDate);
    const [month, setMonth] = useState(calendarMonth || selectedDate);
    const [loading, setLoading] = useState(false);
    const [paymentModalLesson, setPaymentModalLesson] = useState(null);
    const { flash } = usePage().props;

    const allLessonsFlat = useMemo(() => {
        const out = [];
        Object.values(lessonsByDate || {}).forEach((list) => {
            if (Array.isArray(list)) list.forEach((l) => out.push(l));
        });
        return out;
    }, [lessonsByDate]);

    useEffect(() => {
        const id = flash?.payment_lesson_id;
        if (!id) return;
        const lesson = allLessonsFlat.find((l) => l.id === id);
        if (lesson) setPaymentModalLesson(lesson);
    }, [flash?.payment_lesson_id, allLessonsFlat]);

    const go = (d, nextMonth = month) => {
        setLoading(true);
        setDate(d);
        router.get(
            route("academy.lessons.index"),
            { date: d, month: nextMonth },
            { preserveState: true, onFinish: () => setLoading(false) }
        );
    };

    const enrolledIds = new Set(myEnrollmentLessonIds);
    const monthDate = useMemo(() => startOfMonth(new Date((month || selectedDate) + "T12:00:00")), [month, selectedDate]);

    const dayMeta = useMemo(() => {
        const meta = {};
        Object.entries(lessonsByDate || {}).forEach(([day, list]) => {
            const lessons = Array.isArray(list) ? list : [];
            const hasAvailable = lessons.some((l) => !l.is_full_by_staff);
            const isFullByStaff = lessons.some((l) => !!l.is_full_by_staff);

            const hasMyRequest = lessons.some((l) => {
                const st = myEnrollmentStatusByLesson?.[l.id];
                return st === "pending" || st === "confirmed";
            });
            meta[day] = { hasAvailable, hasMyRequest, isFullByStaff };
        });
        return meta;
    }, [lessonsByDate, myEnrollmentStatusByLesson]);

    const selectedLessons = (lessonsByDate && lessonsByDate[date]) ? lessonsByDate[date] : [];

    const navigateMonth = (dir) => {
        const next = addMonths(monthDate, dir);
        const nextMonthStr = ymd(next);
        setMonth(nextMonthStr);
        // Mantener el día seleccionado si cae fuera de mes, lo forzamos al día 1 del mes nuevo
        const nextSelected = (ym(new Date(date + "T12:00:00")) === ym(next)) ? date : nextMonthStr;
        go(nextSelected, nextMonthStr);
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

                <div className="flex flex-col gap-6 lg:flex-row">
                    <aside className="w-full lg:w-[30%]">
                        <div className="sticky top-28">
                            <CalendarCommander
                                monthDate={monthDate}
                                selectedDate={date}
                                onSelectDay={(d) => go(d, ymd(monthDate))}
                                onNavigateMonth={navigateMonth}
                                dayMeta={dayMeta}
                            />
                        </div>
                    </aside>

                    <main className="flex-1 lg:w-[70%]">
                        <ClassStack
                            dateStr={date}
                            lessons={selectedLessons}
                            onRequestEmptyDay={() => router.visit(route("servicios.surf"))}
                            onCreateClassUrl={route("admin.academy.index") + "?date=" + encodeURIComponent(date)}
                        />

                        <div className="mt-6">
                            <h2 className="mt-8 mb-4 font-heading text-sm font-extrabold uppercase tracking-wider text-slate-800">
                                Solicitudes y clases
                            </h2>
                            {loading ? (
                                <div className="space-y-4">
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            ) : selectedLessons.length === 0 ? (
                                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500 shadow-[0_6px_24px_rgba(0,0,0,0.1)]">
                                    No hay clases este día.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedLessons.map((lesson) => (
                                        <LessonCard
                                            key={lesson.id}
                                            lesson={lesson}
                                            isEnrolled={enrolledIds.has(lesson.id)}
                                            enrollmentStatus={myEnrollmentStatusByLesson[lesson.id] ?? null}
                                            creditsBalance={creditsBalance}
                                            onShowPayment={setPaymentModalLesson}
                                            hasProof={!!myEnrollmentHasProofByLesson[lesson.id]}
                                        />
                                    ))}
                                </div>
                            )}
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
            />
        </Layout1>
    );
}
