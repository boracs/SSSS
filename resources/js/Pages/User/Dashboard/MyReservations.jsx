import React, { useMemo, useState, useEffect } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { AcademicCapIcon, BuildingStorefrontIcon, StarIcon, ClockIcon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";

const TAB_CLASSES = "classes";
const TAB_RENTALS = "rentals";
const TAB_BONOS = "bonos";

function badgeByStatus(row) {
    if (row?.payment_status === "confirmed" || row?.status === "confirmed") {
        return { label: "Confirmado", cls: "bg-emerald-100 text-emerald-700" };
    }
    if (row?.payment_status === "submitted") {
        return { label: "Validando Pago", cls: "bg-amber-100 text-amber-700" };
    }
    if (row?.payment_status === "pending" || row?.status === "pending") {
        return { label: "Pendiente de Pago", cls: "bg-rose-100 text-rose-700" };
    }
    if (row?.status === "cancelled") {
        return { label: "Cancelada", cls: "bg-slate-200 text-slate-700" };
    }
    return { label: row?.status || "—", cls: "bg-slate-100 text-slate-700" };
}

function formatCountdown(isoDate) {
    if (!isoDate) return null;
    const end = new Date(isoDate).getTime() + 30 * 60 * 1000;
    const now = Date.now();
    const diff = end - now;
    if (diff <= 0) return "Reserva Expirada";
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")} min`;
}

function BonoWallet({ performanceData }) {
    const active = performanceData?.activeBono;
    const total = Number(active?.num_classes || 0);
    const remaining = Number(active?.remaining || 0);
    const spent = Math.max(0, total - remaining);
    const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((spent * 100) / total))) : 0;
    const radius = 44;
    const c = 2 * Math.PI * radius;
    const offset = c - (pct / 100) * c;
    const stats = performanceData?.stats || {};

    return (
        <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-sky-500/25 via-white/60 to-indigo-500/25 p-5 shadow-xl backdrop-blur-md">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-300/30 blur-2xl" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">Elite Surf Club Wallet</p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">{active?.name || "Sin bono activo"}</h3>
                    <p className="mt-1 text-sm text-slate-600">{performanceData?.prediction || "Sin predicción disponible."}</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="relative h-28 w-28">
                    <svg viewBox="0 0 120 120" className="h-28 w-28">
                        <circle cx="60" cy="60" r={radius} stroke="#cbd5e1" strokeWidth="10" fill="none" />
                        <circle
                            cx="60"
                            cy="60"
                            r={radius}
                            stroke="#0ea5e9"
                            strokeWidth="10"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={c}
                            strokeDashoffset={offset}
                            transform="rotate(-90 60 60)"
                            className="transition-all duration-700"
                        />
                    </svg>
                    <div className="absolute inset-0 grid place-items-center text-center">
                        <p className="text-xl font-bold text-slate-900">{remaining}</p>
                    </div>
                    </div>
                    <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">Unidades restantes</p>
                </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-slate-500">Total Surfeado</p>
                    <p className="font-semibold text-slate-900">{Number(stats.total_surfed_hours || 0).toFixed(1)} h</p>
                </div>
                <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-slate-500">Ratio Solo/Grupal</p>
                    <p className="font-semibold text-slate-900">{Number(stats.solo_ratio_percent || 0)}% solo</p>
                </div>
                <div className="rounded-xl bg-white/60 p-3">
                    <p className="text-xs text-slate-500">Progreso de Nivel</p>
                    <p className="font-semibold text-slate-900">{stats.level_progress || "Iniciación"}</p>
                </div>
            </div>
        </div>
    );
}

function AttendanceHeatmap({ attendanceMap = [], performanceMonth = null, keepHistoryLoaded = false }) {
    const [direction, setDirection] = useState(1);
    const [selectedDate, setSelectedDate] = useState(null);
    const [touchX, setTouchX] = useState(null);
    const [isLoadingMonth, setIsLoadingMonth] = useState(false);
    const initialMonth = performanceMonth || new Date().toISOString().slice(0, 7);
    const [monthCursor, setMonthCursor] = useState(initialMonth);
    const [loadedMonths, setLoadedMonths] = useState(() => new Set([initialMonth]));

    const parsedMonth = useMemo(() => {
        const [y, m] = monthCursor.split("-").map((x) => Number(x));
        return new Date(y, m - 1, 1);
    }, [monthCursor]);

    const monthLabel = parsedMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const firstDayMondayBased = (parsedMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, 0).getDate();

    const mapByDate = useMemo(() => {
        const out = {};
        attendanceMap.forEach((r) => { out[r.date] = r; });
        return out;
    }, [attendanceMap]);

    const days = useMemo(() => {
        const cells = [];
        const prevMonthDays = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), 0).getDate();

        for (let i = 0; i < firstDayMondayBased; i += 1) {
            const day = prevMonthDays - firstDayMondayBased + i + 1;
            const d = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() - 1, day);
            const iso = d.toISOString().slice(0, 10);
            cells.push({ iso, dayNumber: day, isCurrentMonth: false, data: mapByDate[iso] || null });
        }
        for (let d = 1; d <= daysInMonth; d += 1) {
            const date = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth(), d);
            const iso = date.toISOString().slice(0, 10);
            cells.push({ iso, dayNumber: d, isCurrentMonth: true, data: mapByDate[iso] || null });
        }
        while (cells.length < 42) {
            const nextDay = cells.length - (firstDayMondayBased + daysInMonth) + 1;
            const d = new Date(parsedMonth.getFullYear(), parsedMonth.getMonth() + 1, nextDay);
            const iso = d.toISOString().slice(0, 10);
            cells.push({ iso, dayNumber: nextDay, isCurrentMonth: false, data: mapByDate[iso] || null });
        }
        return cells;
    }, [parsedMonth, firstDayMondayBased, daysInMonth, mapByDate]);

    useEffect(() => {
        const monthRows = days.filter((d) => d.isCurrentMonth && d.data);
        if (monthRows.length > 0) {
            const latest = monthRows[monthRows.length - 1];
            setSelectedDate((prev) => (prev && monthRows.some((r) => r.iso === prev) ? prev : latest.iso));
        } else {
            setSelectedDate(null);
        }
    }, [days]);

    useEffect(() => {
        if (loadedMonths.has(monthCursor)) return;
        setIsLoadingMonth(true);
        router.get(
            route("my-reservations.index", { bono_month: monthCursor, load_history: keepHistoryLoaded ? 1 : 0 }),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ["performanceData"],
                onFinish: () => {
                    setLoadedMonths((prev) => new Set([...prev, monthCursor]));
                    setIsLoadingMonth(false);
                },
            }
        );
    }, [monthCursor, loadedMonths]);

    const selectedData = selectedDate ? mapByDate[selectedDate] || null : null;
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
    currentWeekStart.setHours(0, 0, 0, 0);
    const currentWeekEnd = new Date(currentWeekStart);
    currentWeekEnd.setDate(currentWeekStart.getDate() + 6);

    const goMonth = (delta) => {
        setDirection(delta > 0 ? 1 : -1);
        const d = new Date(parsedMonth);
        d.setMonth(d.getMonth() + delta);
        setMonthCursor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    };

    const onTouchStart = (e) => setTouchX(e.touches?.[0]?.clientX ?? null);
    const onTouchEnd = (e) => {
        if (touchX === null) return;
        const endX = e.changedTouches?.[0]?.clientX ?? touchX;
        const diff = endX - touchX;
        if (Math.abs(diff) > 40) goMonth(diff < 0 ? 1 : -1);
        setTouchX(null);
    };

    const cellCls = (c) => {
        const base = "relative h-10 rounded-lg border transition-all duration-200";
        const outside = !c.isCurrentMonth ? "opacity-10" : "";
        const selected = selectedDate === c.iso ? "ring-2 ring-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.45)]" : "";
        const hasData = !!c.data;
        const heat = !hasData
            ? "bg-slate-100 border-slate-200"
            : Number(c.data.uc_cost) === 2
                ? "bg-[#EF4444] border-[#EF4444]"
                : "bg-[#FACC15] border-[#FACC15]";
        const day = new Date(c.iso);
        const pulse = c.data && day >= currentWeekStart && day <= currentWeekEnd ? "animate-pulse" : "";
        return `${base} ${outside} ${selected} ${heat} ${pulse}`;
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
            <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => goMonth(-1)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700">◀</button>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.p
                        key={monthCursor}
                        initial={{ x: direction > 0 ? 24 : -24, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: direction > 0 ? -24 : 24, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-sm font-semibold capitalize text-slate-900"
                    >
                        {monthLabel}
                    </motion.p>
                </AnimatePresence>
                <button type="button" onClick={() => goMonth(1)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm text-slate-700">▶</button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
                {days.map((c) => (
                    <button key={c.iso} type="button" onClick={() => c.isCurrentMonth && setSelectedDate(c.iso)} className={cellCls(c)}>
                        <span className={`absolute left-1.5 top-1 text-[11px] tabular-nums ${c.data ? "text-white" : "text-slate-500/70"}`}>
                            {c.dayNumber}
                        </span>
                    </button>
                ))}
            </div>

            <div className="mt-4 rounded-2xl border border-white/40 bg-white/60 p-4 backdrop-blur-xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={selectedDate || "empty"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {isLoadingMonth ? (
                            <p className="text-sm text-slate-600">Cargando actividad del mes...</p>
                        ) : selectedData ? (
                            <>
                                <p className="font-semibold text-slate-900">{selectedData.lesson?.title || "Sesión"}</p>
                                <p className="text-sm text-slate-600">
                                    {selectedData.lesson?.starts_at ? new Date(selectedData.lesson.starts_at).toLocaleString("es-ES") : "Sin hora"} · {selectedData.lesson?.spot || "Spot por confirmar"}
                                </p>
                                <p className="text-sm text-slate-600">Nivel: {selectedData.lesson?.level || "iniciacion"}</p>
                                <div className="mt-2">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Crew</p>
                                    {Array.isArray(selectedData.crew) && selectedData.crew.length > 0 ? (
                                        <p className="text-sm text-slate-700">
                                            {selectedData.crew.map((c) => c.name).join(", ")}
                                        </p>
                                    ) : (
                                        <p className="text-sm text-slate-600">Solo tú</p>
                                    )}
                                </div>
                                {selectedData.lesson?.monitor_note ? (
                                    <p className="mt-2 rounded-lg bg-sky-50 p-2 text-xs text-sky-800">Progreso: {selectedData.lesson.monitor_note}</p>
                                ) : null}
                            </>
                        ) : (
                            <p className="text-sm text-slate-600">Día libre. ¡Buen momento para estirar o revisar la previsión de olas!</p>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}

export default function MyReservations({ classRows = [], rentalRows = [], bonoRows = [], performanceData = null }) {
    const { props } = usePage();
    const isVip = props?.auth?.user?.is_vip === true || String(props?.auth?.user?.is_vip) === "1";
    const [tab, setTab] = useState(TAB_CLASSES);
    const [tick, setTick] = useState(Date.now());
    const [proofModal, setProofModal] = useState(null); // { type, id }
    const [proofFile, setProofFile] = useState(null);
    const [cancelModal, setCancelModal] = useState(null); // { type, id }
    const [processing, setProcessing] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(!!performanceData?.history_loaded);

    useEffect(() => {
        setHistoryLoaded(!!performanceData?.history_loaded);
    }, [performanceData?.history_loaded]);

    useEffect(() => {
        const id = setInterval(() => setTick(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const activeRows = useMemo(() => {
        void tick;
        if (tab === TAB_CLASSES) return classRows;
        if (tab === TAB_RENTALS) return rentalRows;
        return bonoRows;
    }, [tab, classRows, rentalRows, bonoRows, tick]);

    const { upcomingRows, historyRows } = useMemo(() => {
        const now = Date.now();
        const rows = activeRows || [];
        const upcoming = [];
        const history = [];
        rows.forEach((row) => {
            const rawDate = row?.start_time || row?.end_time || row?.created_at || null;
            const ts = rawDate ? new Date(rawDate).getTime() : null;
            if (ts !== null && Number.isFinite(ts) && ts >= now) {
                upcoming.push(row);
            } else {
                history.push(row);
            }
        });
        return { upcomingRows: upcoming, historyRows: history };
    }, [activeRows]);

    const submitProof = () => {
        if (!proofModal?.id || !proofFile || processing) return;
        setProcessing(true);
        const routeName = proofModal.type === "class"
            ? "my-reservations.class.upload-proof"
            : "my-reservations.rental.upload-proof";
        router.post(
            route(routeName, proofModal.id),
            { proof: proofFile, payment_method: "transferencia" },
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    setProofModal(null);
                    setProofFile(null);
                },
                onFinish: () => setProcessing(false),
            }
        );
    };

    const cancelReservation = () => {
        if (!cancelModal?.id || processing) return;
        setProcessing(true);
        const routeName = cancelModal.type === "class"
            ? "my-reservations.class.cancel"
            : "my-reservations.rental.cancel";
        router.post(route(routeName, cancelModal.id), {}, {
            preserveScroll: true,
            onSuccess: () => setCancelModal(null),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <>
            <Head title="Mis Reservas" />
            <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-5">
                <h1 className="text-2xl font-bold text-slate-900">Mis Reservas</h1>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTab(TAB_CLASSES)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_CLASSES ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>Clases</button>
                    <button type="button" onClick={() => setTab(TAB_RENTALS)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_RENTALS ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>Alquileres</button>
                    <button type="button" onClick={() => setTab(TAB_BONOS)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_BONOS ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>Mis Bonos</button>
                </div>

                {tab === TAB_BONOS && !isVip ? (
                    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white shadow-xl">
                        <p className="text-xs uppercase tracking-wider text-slate-300">VIP Performance</p>
                        <h2 className="mt-1 text-2xl font-bold">Desbloquea tu Dashboard de Rendimiento</h2>
                        <p className="mt-2 text-slate-200">Hazte VIP para ver métricas avanzadas, mapa de actividad y predicción de uso de bono.</p>
                        <Link href={route("bonos.index")} className="mt-5 inline-flex rounded-xl bg-amber-400 px-4 py-2 font-semibold text-slate-900 hover:bg-amber-300">
                            Quiero ser VIP
                        </Link>
                    </div>
                ) : tab === TAB_BONOS ? (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <BonoWallet performanceData={performanceData || {}} />
                        <AttendanceHeatmap
                            attendanceMap={performanceData?.attendanceMap || []}
                            performanceMonth={performanceData?.month || null}
                            keepHistoryLoaded={historyLoaded}
                        />
                        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Historial de Consumo UC</p>
                            {!historyLoaded ? (
                                <div className="mt-4 flex justify-center">
                                    <button
                                        type="button"
                                        title="Carga tu registro detallado de sesiones pasadas"
                                        onClick={() => {
                                            if (historyLoading) return;
                                            setHistoryLoading(true);
                                            router.reload({
                                                only: ["performanceData"],
                                                data: { bono_month: performanceData?.month || new Date().toISOString().slice(0, 7), load_history: 1 },
                                                preserveState: true,
                                                preserveScroll: true,
                                                onFinish: () => {
                                                    setHistoryLoading(false);
                                                    setHistoryLoaded(true);
                                                },
                                            });
                                        }}
                                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
                                    >
                                        {historyLoading ? (
                                            <span className="inline-flex items-center gap-2">
                                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                                                Cargando...
                                            </span>
                                        ) : "📂 Ver Historial Completo de Clases"}
                                    </button>
                                </div>
                            ) : (
                                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="mt-3 overflow-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Fecha</th>
                                                <th className="px-3 py-2 text-left">Clase</th>
                                                <th className="px-3 py-2 text-left">UC</th>
                                                <th className="px-3 py-2 text-left">Restante</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(performanceData?.history || []).map((h) => (
                                                <tr key={h.id} className="border-t border-slate-100">
                                                    <td className="px-3 py-2">{h.lesson?.starts_at ? new Date(h.lesson.starts_at).toLocaleDateString("es-ES") : "—"}</td>
                                                    <td className="px-3 py-2">{h.lesson?.title || "Sesión"}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${Number(h.uc_cost) === 2 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                                                            {Number(h.uc_cost) === 2 ? "2 UC Premium" : "1 UC Standard"}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2">{h.remaining_after}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </motion.div>
                            )}
                        </div>
                    </div>
                ) : activeRows.length === 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                        <p className="text-slate-700">Aún no tienes reservas aquí. ¡El mar te espera! 🌊</p>
                        <div className="mt-4 flex justify-center gap-3">
                            <Link href={route("academy.lessons.index")} className="rounded-lg bg-sky-600 px-4 py-2 text-white">Ver clases</Link>
                            <Link href={route("tienda")} className="rounded-lg bg-slate-800 px-4 py-2 text-white">Ir a tienda</Link>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-7">
                        <section className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Tus Próximas Citas</p>
                            {upcomingRows.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                                    <p>No tienes próximas reservas en esta sección.</p>
                                    <div className="mt-3">
                                        <Link href={tab === TAB_RENTALS ? route("rentals.surfboards.index") : route("academy.lessons.index")} className="inline-flex rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
                                            {tab === TAB_RENTALS ? "Reservar alquiler" : "Reservar clase"}
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-4">
                                    {upcomingRows.map((row) => {
                                        const badge = badgeByStatus(row);
                                        const countdown = row.payment_status === "pending" ? formatCountdown(row.created_at) : null;
                                        const expired = countdown === "Reserva Expirada";
                                        const isClass = tab === TAB_CLASSES;
                                        const isRental = tab === TAB_RENTALS;
                                        const isBono = tab === TAB_BONOS;
                                        return (
                                            <article key={`${tab}-upcoming-${row.id}`} className={`rounded-xl border bg-white p-4 transition-all duration-300 ${expired ? "border-slate-300 shadow-none" : "border-slate-200 shadow-sm hover:scale-[1.01] hover:shadow-md"}`}>
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            {isClass ? <AcademicCapIcon className="h-5 w-5 text-sky-600" /> : null}
                                                            {isRental ? <BuildingStorefrontIcon className="h-5 w-5 text-indigo-600" /> : null}
                                                            {isBono ? <StarIcon className="h-5 w-5 text-amber-500" /> : null}
                                                            <h2 className="text-base font-semibold text-slate-900">{row.title}</h2>
                                                        </div>
                                                        <p className="text-sm text-slate-600">
                                                            {row.start_time ? new Date(row.start_time).toLocaleString("es-ES") : "Sin fecha"}
                                                        </p>
                                                        {isClass ? (
                                                            <p className="text-sm text-slate-600">{row.level || "Iniciación"} · {row.modality || "grupal"} · {row.location || "Zurriola"}</p>
                                                        ) : null}
                                                        {isBono ? (
                                                            <p className="text-sm text-slate-600">{row.clases_restantes}/{row.num_clases} clases restantes · {Number(row.price || 0).toFixed(2)} €</p>
                                                        ) : null}
                                                    </div>
                                                    <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${badge.cls}`}>
                                                        {expired ? "Reserva Expirada" : badge.label}
                                                    </span>
                                                </div>

                                                {countdown ? (
                                                    <div className={`mt-3 rounded-lg border p-3 text-sm transition-all duration-300 ${expired ? "border-slate-300 bg-slate-50 text-slate-600" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                                                        <div className="inline-flex items-center gap-2">
                                                            <ClockIcon className="h-4 w-4" />
                                                            <span className="font-semibold">{countdown}</span>
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <div className="mt-4 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                                                    {(isClass || isRental) && row.payment_status === "pending" && !expired ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setProofModal({ type: isClass ? "class" : "rental", id: row.id })}
                                                            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 sm:w-auto"
                                                        >
                                                            Subir Justificante
                                                        </button>
                                                    ) : null}
                                                    {(isClass || isRental) && row.payment_status === "pending" && expired ? (
                                                        <span className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 sm:w-auto">
                                                            Sesión expirada por falta de pago
                                                        </span>
                                                    ) : null}

                                                    {(isClass || isRental) ? (
                                                        row.can_cancel ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setCancelModal({ type: isClass ? "class" : "rental", id: row.id })}
                                                                className="w-full rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto"
                                                            >
                                                                Cancelar Reserva
                                                            </button>
                                                        ) : (
                                                            <span className="w-full rounded-lg bg-slate-100 px-4 py-2 text-sm text-slate-600 sm:w-auto">
                                                                {row.cancel_block_reason || "Fuera de plazo de cancelación (requiere 24h de antelación)"}
                                                            </span>
                                                        )
                                                    ) : null}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <section className="space-y-3">
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Historial / Pasadas</p>
                            {historyRows.length === 0 ? (
                                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                                    Sin historial todavía en esta sección.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-3">
                                    {historyRows.map((row) => {
                                        const badge = badgeByStatus(row);
                                        const isClass = tab === TAB_CLASSES;
                                        const isRental = tab === TAB_RENTALS;
                                        const isBono = tab === TAB_BONOS;
                                        return (
                                            <article key={`${tab}-history-${row.id}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-70 grayscale transition-all">
                                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            {isClass ? <AcademicCapIcon className="h-5 w-5 text-slate-500" /> : null}
                                                            {isRental ? <BuildingStorefrontIcon className="h-5 w-5 text-slate-500" /> : null}
                                                            {isBono ? <StarIcon className="h-5 w-5 text-slate-500" /> : null}
                                                            <h2 className="text-base font-semibold text-slate-700">{row.title}</h2>
                                                        </div>
                                                        <p className="text-sm text-slate-500">
                                                            {row.start_time ? new Date(row.start_time).toLocaleString("es-ES") : "Sin fecha"}
                                                        </p>
                                                    </div>
                                                    <span className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-semibold ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            {proofModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" onClick={() => setProofModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-lg font-bold text-slate-900">Subir justificante</p>
                        <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif,.pdf" onChange={(e) => setProofFile(e.target.files?.[0] || null)} className="w-full rounded-lg border border-slate-300 p-2" />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setProofModal(null)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-slate-700">Cancelar</button>
                            <button type="button" onClick={submitProof} disabled={!proofFile || processing} className="rounded-lg bg-sky-600 px-3 py-1.5 text-white disabled:opacity-60">
                                {processing ? "Subiendo..." : "Subir"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {cancelModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" onClick={() => setCancelModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-lg font-bold text-slate-900">¿Estás seguro? Esta acción es irreversible.</p>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setCancelModal(null)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-slate-700">Volver</button>
                            <button type="button" onClick={cancelReservation} disabled={processing} className="rounded-lg bg-rose-600 px-3 py-1.5 text-white disabled:opacity-60">
                                {processing ? "Cancelando..." : "Confirmar cancelación"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

