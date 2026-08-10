import React, { Suspense, lazy, useMemo, useState, useEffect, useRef } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import SurfTripFab from "../../components/SurfTripFab";
import AcademyFlowSteps from "./AcademyFlowSteps";
import StudentCalendar, {
    ymd,
    startOfMonth,
    addMonths,
    addDaysToYmd,
    buildFilteredDayStats,
} from "./StudentCalendar";
import { isVipLesson } from "./StudentClassCard";
import StudentClassFeed from "./StudentClassFeed";
import { todayYmdInMadrid, toYmdInMadrid } from "../../lib/madridTime";

const PaymentModal = lazy(() => import("../../components/PaymentModal"));
const StudentBookingModal = lazy(() => import("./StudentBookingModal"));
const PrivateLessonRequestModal = lazy(() => import("./PrivateLessonRequestModal"));

const MODALITY_FILTER_OPTIONS = [
    { id: "all", label: "Todas", dot: null },
    { id: "grupal", label: "Grupales", dot: "bg-emerald-500" },
    { id: "semanal", label: "Semanales", dot: "bg-sky-500" },
    { id: "vip", label: "VIP", dot: "bg-rose-500 ring-1 ring-rose-700/50" },
];

const FUTURE_DAYS_BATCH = 10;
const INITIAL_VISIBLE_DAYS = 3;
const DAYS_LOAD_STEP = 3;

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
    const [mobileCalendarOpen, setMobileCalendarOpen] = useState(true);
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

    // Deep-link: /academia?particular=1 → abre reserva con horarios (no la página de info).
    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get("particular") !== "1") return;
            setShowPrivateModal(true);
            params.delete("particular");
            const qs = params.toString();
            const next = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
            window.history.replaceState({}, "", next);
        } catch {
            /* ignore */
        }
    }, []);

    const openPrivateBooking = () => setShowPrivateModal(true);

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
        const modality =
            lesson.modality || (lesson.is_private ? "particular" : "grupal");
        if (!currentUser && modality !== "grupal") {
            router.visit(route("login"));
            return;
        }
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
            guest_email: payload?.guest_email ?? null,
            guest_phone: payload?.guest_phone ?? null,
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

    const navigateMonth = (dir) => {
        const next = addMonths(monthDate, dir);
        const nextMonthStr = ymd(next);
        setMonth(nextMonthStr);
    };

    const flowStep = flash?.success
        ? 3
        : bookingModalLesson || paymentModalLesson || showPrivateModal
          ? 2
          : 1;

    return (
        <Layout1>
            <Head title="Academia · Clases" />
            <div className="min-h-screen bg-slate-950 px-4 pb-10 pt-24 sm:px-6 lg:px-8">
                <div className="mx-auto w-full max-w-7xl">
                    {/* Cabecera */}
                    <div className="mb-4 text-center">
                        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-s4-cyan">
                            Academia · San Sebastian Surf School
                        </p>
                        <h1 className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Clases de surf
                        </h1>
                        {isVipUser ? (
                            <p className="mt-2 text-sm text-slate-400">
                                Tu saldo VIP:{" "}
                                <strong className="text-lg font-bold text-s4-cyan">
                                    {creditsBalance} créditos
                                </strong>
                            </p>
                        ) : currentUser ? (
                            <p className="mx-auto mt-2 max-w-xl text-left text-sm leading-relaxed text-slate-300 sm:text-center">
                                Elige una clase grupal, apúntate y confirma el pago. También puedes
                                solicitar una particular.
                            </p>
                        ) : (
                            <ul className="mx-auto mt-3 max-w-xl space-y-2 text-left text-sm leading-relaxed text-slate-300">
                                <li>
                                    <span className="font-semibold text-white">Sin cuenta</span>
                                    {" "}puedes ver y reservar clases{" "}
                                    <span className="font-medium text-white">grupales</span> o una{" "}
                                    <span className="font-medium text-white">particular</span>{" "}
                                    (señal online).
                                </li>
                                <li>
                                    <span className="font-semibold text-white">Con cuenta</span>
                                    {" "}puedes apuntarte también a clases{" "}
                                    <span className="font-medium text-white">semanales</span>.
                                </li>
                                <li>
                                    <span className="font-semibold text-white">
                                        Con cuenta y agregado como VIP por el administrador
                                    </span>
                                    {" "}puedes ver el calendario VIP y usar créditos de bono.
                                </li>
                            </ul>
                        )}
                    </div>

                    <AcademyFlowSteps activeStep={flowStep} />

                    {isVipUser ? (
                        <div className="mb-4 text-center">
                            <Link
                                href={route("bonos.index")}
                                className="text-xs font-semibold text-teal-300/90 underline-offset-2 hover:text-teal-200 hover:underline"
                            >
                                Recargar créditos VIP
                            </Link>
                        </div>
                    ) : null}

                    {flash?.success && (
                        <div
                            className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-200"
                            role="status"
                        >
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300/90">
                                Paso 3 · Confirmación
                            </p>
                            <p className="mt-1">{flash.success}</p>
                        </div>
                    )}
                    {flash?.error && (
                        <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-center text-sm font-medium text-rose-200">
                            {flash.error}
                        </div>
                    )}

                    {/* Panel de reserva */}
                    <div className="rounded-2xl border border-s4/30 bg-gradient-to-br from-gray-950 via-gray-900 to-s4-deep/40 p-[1px] shadow-xl shadow-black/30">
                        <div className="rounded-2xl bg-gray-950/95 p-4 sm:p-6">
                            <div className="mx-auto flex w-full flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
                                <aside className="w-full shrink-0 lg:w-[340px]">
                                    <div className="mb-2 flex items-center justify-between gap-2 lg:hidden">
                                        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                                            Calendario
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setMobileCalendarOpen((v) => !v)}
                                            aria-expanded={mobileCalendarOpen}
                                            aria-label={
                                                mobileCalendarOpen
                                                    ? "Ocultar calendario"
                                                    : "Mostrar calendario"
                                            }
                                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-slate-900/90 text-s4-cyan transition hover:bg-slate-800"
                                        >
                                            <svg
                                                className={[
                                                    "h-4 w-4 transition-transform duration-200",
                                                    mobileCalendarOpen ? "" : "rotate-180",
                                                ].join(" ")}
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                aria-hidden
                                            >
                                                <path d="M18 15l-6-6-6 6" />
                                            </svg>
                                        </button>
                                    </div>
                                    <div
                                        className={[
                                            "lg:sticky lg:top-24",
                                            mobileCalendarOpen ? "block" : "hidden lg:block",
                                        ].join(" ")}
                                    >
                                        <StudentCalendar
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
                                                // Sin scroll: el listado debajo ya filtra al día elegido.
                                            }}
                                            onNavigateMonth={navigateMonth}
                                            dayStats={filteredDayStats}
                                            mySignalsByDate={mySignalsByDate}
                                            todayStr={todayStr}
                                            modalityFilter={modalityFilter}
                                        />
                                    </div>
                                </aside>

                                <main className="min-w-0 w-full flex-1">
                                    <StudentClassFeed
                                        modalityFilter={modalityFilter}
                                        visibleModalityFilters={visibleModalityFilters}
                                        onModalityFilterChange={(id) => {
                                            setModalityFilter(id);
                                            if (id === "vip") {
                                                setVipCalendarNotice(false);
                                                return;
                                            }
                                            setFutureDaysWindow(0);
                                            setVipCalendarNotice(false);
                                        }}
                                        onRequestPrivate={openPrivateBooking}
                                        vipCalendarNotice={vipCalendarNotice}
                                        isTenDayView={isTenDayView}
                                        effectiveFeedDate={effectiveFeedDate}
                                        rangeEndDate={rangeEndDate}
                                        dayKeys={dayKeys}
                                        visibleDayKeys={visibleDayKeys}
                                        feedByDay={feedByDay}
                                        highlightDay={highlightDay}
                                        registerDayRef={(dayStr, el) => {
                                            if (el) dayRefMap.current[dayStr] = el;
                                        }}
                                        remainingDayCount={remainingDayCount}
                                        onLoadMoreDays={() =>
                                            setVisibleDaysCount((count) =>
                                                Math.min(count + DAYS_LOAD_STEP, dayKeys.length),
                                            )
                                        }
                                        onExpandToTenDays={expandToTenDays}
                                        onCollapseToSingleDay={collapseToSingleDay}
                                        enrollmentPolicy={enrollmentPolicy}
                                        myEnrollmentStatusByLesson={myEnrollmentStatusByLesson}
                                        myEnrollmentHasProofByLesson={myEnrollmentHasProofByLesson}
                                        myEnrollmentAdminNotesByLesson={myEnrollmentAdminNotesByLesson}
                                        isVipUser={isVipUser}
                                        isAuthenticated={!!currentUser}
                                        processingId={processingId}
                                        onVipEnroll={submitVipEnroll}
                                        onReserve={submitGroupBooking}
                                        onOpenGroupBooking={(lesson) => {
                                            const modality =
                                                lesson?.modality ||
                                                (lesson?.is_private ? "particular" : "grupal");
                                            if (!currentUser && modality !== "grupal") {
                                                router.visit(route("login"));
                                                return;
                                            }
                                            setBookingModalLesson(lesson);
                                        }}
                                    />
                                </main>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {pendingSurfTripLesson && (
                <SurfTripFab lesson={pendingSurfTripLesson} />
            )}
            <Suspense fallback={null}>
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
            </Suspense>

            <Suspense fallback={null}>
                <StudentBookingModal
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
            </Suspense>

            {showPrivateModal ? (
                <Suspense fallback={null}>
                    <PrivateLessonRequestModal
                        open={showPrivateModal}
                        onClose={() => setShowPrivateModal(false)}
                        initialDate={date}
                        todayStr={todayStr}
                        onContinueToPayment={({
                            date: d,
                            start,
                            duration_minutes,
                            participants,
                            price_cents,
                            deposit_cents,
                            guest_first_name,
                            guest_last_name,
                            guest_email,
                            guest_phone,
                        }) => {
                            setPaymentModalLesson({
                                id: "PRIVATE_FLOW",
                                date: d,
                                start,
                                duration_minutes,
                                price: (Number(price_cents) || 0) / 100,
                                deposit_cents: Number(deposit_cents) || 0,
                                starts_at: `${d}T${start}`,
                                currency: "EUR",
                                participants: Array.isArray(participants) ? participants : [],
                                guest_first_name,
                                guest_last_name,
                                guest_email,
                                guest_phone,
                            });
                            setGroupLessonRequestPayload(null);
                            setShowPrivateModal(false);
                        }}
                    />
                </Suspense>
            ) : null}
        </Layout1>
    );
}
