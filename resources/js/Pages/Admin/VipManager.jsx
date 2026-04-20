import { Head, router, useForm } from "@inertiajs/react";
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import {
    formatDateTimeMadrid,
    formatMonthYearMadridFromYearMonth,
    formatTimeMadrid,
    isPastCalendarDayMadrid,
    todayYmdInMadrid,
    toYmdInMadrid,
} from "../../lib/madridTime";

export default function VipManager({ month, lessons = [], staff = [] }) {
    const [monthCursor, setMonthCursor] = useState(month || todayYmdInMadrid().slice(0, 7));
    const [selectedDate, setSelectedDate] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [staffPool, setStaffPool] = useState({ available: staff || [], occupied: [] });
    const [loadingMonth, setLoadingMonth] = useState(false);
    const [pendingDeleteLesson, setPendingDeleteLesson] = useState(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [timeNotice, setTimeNotice] = useState("");
    const [availabilityError, setAvailabilityError] = useState("");

    const form = useForm({
        date: "",
        time: "",
        duration_minutes: 90,
        level: "iniciacion",
        monitor_id: "",
        has_photographer: false,
        photographer_id: "",
        location: "Zurriola",
        max_capacity: 12,
    });

    const [year, monthNum] = useMemo(() => {
        const p = monthCursor.split("-").map((n) => Number(n));
        return [p[0] || 1970, p[1] || 1];
    }, [monthCursor]);

    const monthLabel = useMemo(() => formatMonthYearMadridFromYearMonth(year, monthNum), [year, monthNum]);

    const firstDayMondayBased = useMemo(() => {
        const d = new Date(Date.UTC(year, monthNum - 1, 1, 12, 0, 0));
        return (d.getUTCDay() + 6) % 7;
    }, [year, monthNum]);

    const daysInMonth = useMemo(
        () => new Date(Date.UTC(year, monthNum, 0, 12, 0, 0)).getUTCDate(),
        [year, monthNum],
    );

    const lessonsByDate = useMemo(() => {
        const out = {};
        for (const lesson of lessons) {
            if (!lesson?.starts_at) continue;
            const key = toYmdInMadrid(lesson.starts_at);
            if (!out[key]) out[key] = [];
            out[key].push(lesson);
        }
        Object.keys(out).forEach((k) => {
            out[k].sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
        });
        return out;
    }, [lessons]);

    const cells = useMemo(() => {
        const list = [];
        const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
        const prevYear = monthNum === 1 ? year - 1 : year;
        const prevMonthDays = new Date(Date.UTC(prevYear, prevMonth, 0, 12, 0, 0)).getUTCDate();

        for (let i = 0; i < firstDayMondayBased; i += 1) {
            const day = prevMonthDays - firstDayMondayBased + i + 1;
            const iso = `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            list.push({ iso, dayNumber: day, current: false, entries: lessonsByDate[iso] || [] });
        }
        for (let d = 1; d <= daysInMonth; d += 1) {
            const iso = `${year}-${String(monthNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            list.push({ iso, dayNumber: d, current: true, entries: lessonsByDate[iso] || [] });
        }
        let nextY = year;
        let nextM = monthNum + 1;
        if (nextM > 12) {
            nextM = 1;
            nextY += 1;
        }
        let nd = 1;
        while (list.length < 42) {
            const iso = `${nextY}-${String(nextM).padStart(2, "0")}-${String(nd).padStart(2, "0")}`;
            list.push({ iso, dayNumber: nd, current: false, entries: lessonsByDate[iso] || [] });
            nd += 1;
        }
        return list;
    }, [year, monthNum, firstDayMondayBased, daysInMonth, lessonsByDate]);

    const goMonth = (delta) => {
        let y = year;
        let m = monthNum + delta;
        while (m > 12) {
            m -= 12;
            y += 1;
        }
        while (m < 1) {
            m += 12;
            y -= 1;
        }
        const next = `${y}-${String(m).padStart(2, "0")}`;
        setMonthCursor(next);
        router.get(route("admin.vip-manager.index"), { month: next }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            onStart: () => setLoadingMonth(true),
            onFinish: () => setLoadingMonth(false),
        });
    };

    const submit = (e) => {
        e.preventDefault();
        const minDurationOk = Number(form.data.duration_minutes || 90) >= 60;
        if (!minDurationOk) return;
        if (editingLessonId) {
            form.patch(route("admin.vip-manager.lessons.update", editingLessonId), {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingLessonId(null);
                    setAvailability(null);
                    setDrawerOpen(false);
                },
            });
            return;
        }
        form.post(route("admin.vip-manager.lessons.store"), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset("time", "monitor_id", "photographer_id");
                setAvailability(null);
                setDrawerOpen(false);
            },
        });
    };

    const enterEditMode = (entry) => {
        const start = entry?.starts_at ? new Date(entry.starts_at) : null;
        if (!start) return;
        const date = toYmdInMadrid(start);
        const time = formatTimeMadrid(start);
        const end = entry?.ends_at ? new Date(entry.ends_at) : null;
        const durationMinutes = end ? Math.max(30, Math.round((end.getTime() - start.getTime()) / 60000)) : 90;
        setEditingLessonId(Number(entry.id));
        setSelectedDate(date);
        setDrawerOpen(true);
        form.setData({
            date,
            time,
            duration_minutes: [60, 90].includes(durationMinutes) ? durationMinutes : 90,
            level: entry?.level || "iniciacion",
            monitor_id: entry?.monitor_id ? String(entry.monitor_id) : "",
            has_photographer: Boolean(entry?.has_photographer),
            photographer_id: entry?.photographer_id ? String(entry.photographer_id) : "",
            location: entry?.location || "Zurriola",
            max_capacity: Number(entry?.max_capacity || 12),
        });
        checkAvailability(date, time, Number(entry.id));
    };

    const cancelEditMode = () => {
        setEditingLessonId(null);
        setAvailability(null);
        setDrawerOpen(false);
    };

    const isPastEntry = (entry) => {
        const startsAt = entry?.starts_at ? new Date(entry.starts_at) : null;
        return startsAt ? startsAt.getTime() < Date.now() : false;
    };

    const pillContainerClass = (entry) => {
        const cap = Math.max(1, Number(entry?.max_capacity ?? 0));
        const base = "relative z-10 overflow-visible rounded-xl border border-white/10 bg-gradient-to-b from-gray-800 to-gray-900 px-3 py-1.5 pr-16 pb-6 ring-1 ring-white/5 shadow-sm transition-all duration-200 ease-in-out hover:border-white/20";
        const capAlert = cap === 6 ? "border-amber-500/70" : "border-gray-700";
        const historical = isPastEntry(entry) ? "opacity-60" : "";
        return `${base} ${capAlert} ${historical}`;
    };

    const levelBadgeClass = (level) => {
        const v = String(level || "").toLowerCase();
        if (v === "avanzado") return "bg-rose-500/10 text-rose-400 border-rose-500/20";
        if (v === "intermedio") return "bg-sky-500/10 text-sky-400 border-sky-500/20";
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    };

    const levelDotClass = (level) => {
        const v = String(level || "").toLowerCase();
        if (v === "avanzado") return "bg-red-500";
        if (v === "intermedio") return "bg-sky-500";
        return "bg-emerald-500";
    };

    const roundQuarter = (hhmm) => {
        if (!hhmm || !hhmm.includes(":")) return hhmm;
        const [hRaw, mRaw] = hhmm.split(":").map((n) => Number(n));
        if (Number.isNaN(hRaw) || Number.isNaN(mRaw)) return hhmm;
        let total = (hRaw * 60) + mRaw;
        const rounded = Math.round(total / 15) * 15;
        total = Math.max(0, Math.min((23 * 60) + 45, rounded));
        const h = Math.floor(total / 60);
        const m = total % 60;
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    };

    const getDurationValidationMessage = () => {
        if (!form.data.time) return "";
        const duration = Number(form.data.duration_minutes || 90);
        const minDuration = 60;
        if (duration >= minDuration) return "";
        return "La duración mínima de una sesión es de 1 hora.";
    };

    const hasAvailability = availability && Number.isFinite(Number(availability?.max_capacity));
    const resolvedMaxCapacity = hasAvailability ? Number(availability.max_capacity) : null;

    const checkAvailability = async (dateValue, timeValue, excludeLessonId = 0, overrides = {}) => {
        if (!dateValue || !timeValue) return;
        setCheckingAvailability(true);
        setAvailabilityError("");
        try {
            const durationMinutes = Number(overrides.duration_minutes ?? form.data.duration_minutes ?? 90);
            const url = route("admin.vip-manager.check-availability", {
                date: dateValue,
                time: timeValue,
                duration_minutes: durationMinutes,
                exclude_lesson_id: excludeLessonId || undefined,
            });
            const res = await fetch(url, { headers: { Accept: "application/json", "X-Requested-With": "XMLHttpRequest" } });
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                setAvailabilityError("Respuesta no válida del servidor al comprobar disponibilidad.");
                setAvailability(null);
                return;
            }
            const data = await res.json();
            console.log("[VIP check-availability] Monitores ocupados detectados:", Number(data?.peak_monitors_used ?? -1), data);
            setAvailability(data);
            setStaffPool(data?.staff || { available: [], occupied: [] });
            form.setData("max_capacity", Number(data?.max_capacity ?? 12));
            if (!res.ok) {
                setAvailabilityError(data?.message || "No se pudo comprobar la disponibilidad.");
            }
        } finally {
            setCheckingAvailability(false);
        }
    };

    const openCreateDrawer = (iso) => {
        if (isPastCalendarDayMadrid(iso)) return;
        setSelectedDate(iso);
        setEditingLessonId(null);
        setAvailability(null);
        setStaffPool({ available: staff || [], occupied: [] });
        form.setData({
            date: iso,
            time: "",
            duration_minutes: 90,
            level: "iniciacion",
            monitor_id: "",
            has_photographer: false,
            photographer_id: "",
            location: "Zurriola",
            max_capacity: 12,
        });
        setDrawerOpen(true);
    };

    const requestDeleteLesson = (entry) => {
        setPendingDeleteLesson(entry || null);
    };

    const cancelDeleteLesson = () => {
        if (deleteProcessing) return;
        setPendingDeleteLesson(null);
    };

    const confirmDeleteLesson = () => {
        const lessonId = Number(pendingDeleteLesson?.id || 0);
        if (lessonId <= 0 || deleteProcessing) return;
        setDeleteProcessing(true);
        router.delete(route("admin.vip-manager.lessons.destroy", lessonId), {
            preserveScroll: true,
            onFinish: () => {
                setDeleteProcessing(false);
                setPendingDeleteLesson(null);
            },
        });
    };

    return (
        <>
            <Head title="Admin · Gestor VIP" />
            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Gestor VIP</h1>
                        <p className="text-sm text-gray-500">Calendario mensual y creación inteligente de clases VIP.</p>
                    </div>
                </div>

                <section className="rounded-xl border border-white/5 bg-gray-900 p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <button type="button" onClick={() => goMonth(-1)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gray-800 text-base font-semibold text-gray-300 transition-all duration-200 ease-in-out hover:text-white hover:bg-white/10">
                            ◀
                        </button>
                        <p className="text-sm font-semibold capitalize text-white">{monthLabel}</p>
                        <button type="button" onClick={() => goMonth(1)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-gray-800 text-base font-semibold text-gray-300 transition-all duration-200 ease-in-out hover:text-white hover:bg-white/10">
                            ▶
                        </button>
                    </div>

                    <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        {["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d}>{d}</span>)}
                    </div>
                    <div className={`grid grid-cols-7 gap-2 transition-opacity ${loadingMonth ? "opacity-60" : "opacity-100"}`}>
                        {cells.map((cell) => {
                            const isPast = cell.current && isPastCalendarDayMadrid(cell.iso);
                            const isTodayCell = cell.iso === todayYmdInMadrid();
                            const canCreateHere = cell.current && !isPast;
                            return (
                            <div
                                key={cell.iso}
                                onClick={() => canCreateHere && openCreateDrawer(cell.iso)}
                                onKeyDown={(e) => {
                                    if (!canCreateHere) return;
                                    if (e.key !== "Enter" && e.key !== " ") return;
                                    e.preventDefault();
                                    openCreateDrawer(cell.iso);
                                }}
                                role={canCreateHere ? "button" : "group"}
                                tabIndex={canCreateHere ? 0 : -1}
                                title={isPast ? "Este día ya pasó: no se pueden crear nuevas clases VIP." : undefined}
                                className={`group relative rounded-xl border p-1.5 text-left transition-all duration-200 ease-in-out ${
                                    !cell.current
                                        ? "border-gray-800 bg-gray-900/70 opacity-45"
                                        : isPast
                                            ? "cursor-not-allowed border-gray-800 bg-gray-900/85 text-gray-500 opacity-40 bg-stripes-subtle"
                                            : "cursor-pointer border-gray-800 bg-gray-900 hover:bg-white/[0.02] hover:border-white/10"
                                } ${selectedDate === cell.iso ? "ring-2 ring-indigo-400" : ""} ${
                                    isTodayCell ? "ring-2 ring-inset ring-blue-500" : ""
                                }`}
                            >
                                <span
                                    className={`absolute right-7 top-1 rounded px-1 text-[11px] font-semibold ${
                                        isPast ? "bg-gray-900 text-gray-500" : "bg-gray-800 text-gray-200"
                                    }`}
                                >
                                    {cell.dayNumber}
                                </span>
                                {isTodayCell ? <span className="absolute right-5 top-2 h-1.5 w-1.5 rounded-full bg-blue-500" /> : null}
                                {isPast ? (
                                    <span className="pointer-events-none absolute left-1 top-1 max-w-[calc(100%-3rem)] truncate text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                                        Pasado
                                    </span>
                                ) : null}
                                {canCreateHere ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openCreateDrawer(cell.iso);
                                        }}
                                        className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded bg-gray-700/80 text-[11px] font-bold text-gray-300 opacity-0 ring-1 ring-gray-600 transition-all duration-200 ease-in-out hover:bg-gray-600 hover:text-white group-hover:opacity-100"
                                        aria-label={`Crear clase VIP el ${cell.iso}`}
                                    >
                                        +
                                    </button>
                                ) : null}
                                <div className="mt-5 space-y-1">
                                    {cell.entries.map((entry) => (
                                        <div
                                            key={entry.id}
                                            className={`group/pill ${pillContainerClass(entry)}`}
                                        >
                                            <div className="absolute bottom-1 right-2 inline-flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        enterEditMode(entry);
                                                    }}
                                                    className="rounded p-0.5 text-gray-300 shadow-sm ring-1 ring-indigo-700/40 transition-all duration-200 ease-in-out hover:bg-indigo-700/40 hover:text-white"
                                                    aria-label="Editar clase"
                                                >
                                                    <PencilIcon className="h-3 w-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        requestDeleteLesson(entry);
                                                    }}
                                                    className="rounded p-0.5 text-gray-300 ring-1 ring-rose-500/40 transition-all duration-200 ease-in-out hover:bg-rose-700/20 hover:text-white"
                                                    aria-label="Eliminar clase"
                                                >
                                                    <TrashIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <span className="flex items-center gap-2">
                                                <span className="text-[11px] font-extrabold text-gray-100">{formatTimeMadrid(entry.starts_at)}</span>
                                                <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${levelBadgeClass(entry.level)}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${levelDotClass(entry.level)}`} />
                                                    {entry.level}
                                                </span>
                                                <span className="group/info relative inline-flex items-center">
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-gray-300 ring-1 ring-gray-600 transition-all duration-200 ease-in-out hover:bg-gray-600 hover:text-white">
                                                        <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden />
                                                    </span>
                                                    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-xl border border-white/10 bg-gradient-to-b from-gray-800 to-gray-900 p-3 text-[11px] leading-relaxed text-gray-200 opacity-0 shadow-2xl ring-1 ring-white/10 transition-opacity duration-200 group-hover/pill:opacity-100 group-hover/info:opacity-100">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <span className="block"><span className="font-bold text-white">Monitor:</span> {entry.monitor_name || "Sin asignar"}</span>
                                                            <span className="text-[10px] text-gray-400">{entry.occupancy}/{entry.max_capacity}</span>
                                                        </div>
                                                        <span className="mt-1 block"><span className="font-bold text-white">Fotógrafo:</span> {entry.photographer_name || "No"}</span>
                                                        <div className="mt-2">
                                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-400">Alumnos</span>
                                                            {entry.students && entry.students.length > 0 ? (
                                                                <ul className="mt-1 max-h-28 overflow-auto pr-1 text-[11px] text-gray-200">
                                                                    {entry.students.map((name, idx) => (
                                                                        <li key={`${entry.id}-stu-${idx}`} className="flex gap-2">
                                                                            <span className="mt-[2px] text-gray-500">•</span>
                                                                            <span className="min-w-0 break-words">{name}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <span className="mt-1 block text-gray-400">Sin inscritos</span>
                                                            )}
                                                        </div>
                                                        {Number(entry.max_capacity) === 6 ? (
                                                            <span className="mt-2 block rounded-md border border-amber-700/40 bg-amber-900/20 px-2 py-1 text-amber-200">
                                                                <span className="font-bold">Aviso:</span> Monitor ocupado en otra sesión.
                                                            </span>
                                                        ) : null}
                                                        <span className="absolute bottom-[-4px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="absolute bottom-1 left-2 inline-flex items-center gap-1 text-[10px] font-semibold text-gray-300">
                                                <UserIcon className="h-3 w-3 text-gray-400" aria-hidden />
                                                {entry.occupancy}/{entry.max_capacity}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            );
                        })}
                    </div>
                </section>
            </div>
            {pendingDeleteLesson ? (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-gray-950/70"
                        onClick={cancelDeleteLesson}
                        aria-label="Cerrar modal de cancelación"
                    />
                    <div className="relative z-10 w-full max-w-lg rounded-xl border border-white/5 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-2xl ring-1 ring-white/10">
                        <h3 className="text-lg font-bold text-gray-100">Eliminar clase VIP</h3>
                        <p className="mt-1 text-sm text-gray-400">
                            Esta acción eliminará la clase y revertirá el consumo de créditos de los alumnos inscritos.
                        </p>
                        <div className="mt-4 rounded-xl border border-gray-700 bg-gray-900 p-3 text-sm text-gray-300">
                            <p><span className="font-semibold">Hora:</span> {pendingDeleteLesson?.starts_at ? formatDateTimeMadrid(pendingDeleteLesson.starts_at) : "—"}</p>
                            <p><span className="font-semibold">Nivel:</span> {pendingDeleteLesson?.level || "—"}</p>
                            <p><span className="font-semibold">Ocupación:</span> {pendingDeleteLesson?.occupancy ?? 0}/{pendingDeleteLesson?.max_capacity ?? 0}</p>
                            <p><span className="font-semibold">Monitor:</span> {pendingDeleteLesson?.monitor_name || "Sin asignar"}</p>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={cancelDeleteLesson}
                                disabled={deleteProcessing}
                                className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 transition-all duration-200 ease-in-out hover:bg-gray-700 disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteLesson}
                                disabled={deleteProcessing}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-rose-700 disabled:opacity-60"
                            >
                                {deleteProcessing ? "Eliminando..." : "Eliminar clase"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {drawerOpen ? (
                <div className="fixed inset-0 z-[1100] flex">
                    <button type="button" className="flex-1 bg-gray-950/70 backdrop-blur-md" onClick={cancelEditMode} aria-label="Cerrar panel" />
                    <aside className="h-full w-full max-w-md overflow-y-auto border-l border-white/5 bg-gradient-to-b from-gray-800 to-gray-900 p-4 shadow-2xl ring-1 ring-white/10">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-100">
                                {editingLessonId ? `Editar clase VIP #${editingLessonId}` : `Crear clase VIP · ${selectedDate || ""}`}
                            </h2>
                            <button type="button" onClick={cancelEditMode} className="rounded-md p-1 text-gray-300 hover:bg-gray-700">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form className="grid grid-cols-1 gap-4" onSubmit={submit}>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Hora</label>
                                <input
                                    type="time"
                                    value={form.data.time}
                                    onChange={(e) => {
                                        const raw = e.target.value;
                                        form.setData("time", raw);
                                        if (!raw) {
                                            setAvailability(null);
                                            return;
                                        }
                                        checkAvailability(form.data.date, raw, editingLessonId || 0);
                                    }}
                                    onBlur={(e) => {
                                        const raw = e.target.value;
                                        if (!raw) return;
                                        const rounded = roundQuarter(raw);
                                        if (raw !== rounded) {
                                            setTimeNotice(`Hora ajustada a intervalo de 15 minutos: ${raw} → ${rounded}`);
                                            form.setData("time", rounded);
                                            checkAvailability(form.data.date, rounded, editingLessonId || 0);
                                            return;
                                        }
                                        setTimeNotice("");
                                    }}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Duración</label>
                                <select
                                    value={String(form.data.duration_minutes || 90)}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        form.setData("duration_minutes", Number(v));
                                        setAvailabilityError("");
                                        if (form.data.time) {
                                            checkAvailability(form.data.date, form.data.time, editingLessonId || 0, {
                                                duration_minutes: Number(v),
                                            });
                                        }
                                    }}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="60">1 hora</option>
                                    <option value="90">1,5 horas</option>
                                </select>
                            </div>
                            {timeNotice ? (
                                <div className="rounded-xl border border-amber-700 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
                                    {timeNotice}
                                </div>
                            ) : null}
                            {availabilityError && !availabilityError.toLowerCase().includes("duración mínima") ? (
                                <div className="rounded-xl border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-200">
                                    {availabilityError}
                                </div>
                            ) : null}
                            {getDurationValidationMessage() ? (
                                <div className="rounded-xl border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-200">
                                    {getDurationValidationMessage()}
                                </div>
                            ) : null}
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Nivel</label>
                                <select value={form.data.level} onChange={(e) => form.setData("level", e.target.value)} className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                    <option value="iniciacion">Iniciación</option>
                                    <option value="intermedio">Intermedio</option>
                                    <option value="avanzado">Avanzado</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Monitor</label>
                                <select value={form.data.monitor_id} onChange={(e) => form.setData("monitor_id", e.target.value)} className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                                    <option value="">Sin asignar</option>
                                    {staffPool.available.map((s) => <option key={`a-${s.id}`} value={s.id}>{s.name}</option>)}
                                    {staffPool.occupied.map((s) => <option key={`o-${s.id}`} value={s.id} disabled>{s.name} (ocupado)</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                                    <input type="checkbox" checked={form.data.has_photographer} onChange={(e) => form.setData("has_photographer", e.target.checked)} />
                                    ¿Fotógrafo?
                                </label>
                                <select
                                    value={form.data.photographer_id}
                                    disabled={!form.data.has_photographer}
                                    onChange={(e) => form.setData("photographer_id", e.target.value)}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 disabled:bg-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                >
                                    <option value="">Sin asignar</option>
                                    {staffPool.available.map((s) => <option key={`pa-${s.id}`} value={s.id}>{s.name}</option>)}
                                    {staffPool.occupied.map((s) => <option key={`po-${s.id}`} value={s.id} disabled>{s.name} (ocupado)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Ubicación</label>
                                <input
                                    type="text"
                                    value={form.data.location}
                                    onChange={(e) => form.setData("location", e.target.value)}
                                    className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                />
                            </div>
                            <div className={`rounded-xl border px-3 py-2 text-sm ${
                                !form.data.time
                                    ? "border-gray-700 bg-gray-900 text-gray-300"
                                    : !hasAvailability
                                        ? "border-gray-700 bg-gray-900 text-gray-300"
                                        : resolvedMaxCapacity === 12
                                            ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
                                            : resolvedMaxCapacity === 6
                                                ? "border-amber-700 bg-amber-900/20 text-amber-200"
                                                : "border-rose-700 bg-rose-900/20 text-rose-200"
                            }`}>
                                {!form.data.time
                                    ? "Selecciona una hora para calcular la capacidad por ocupación de monitores."
                                    : checkingAvailability
                                        ? "Calculando capacidad por ocupación de monitores..."
                                        : !hasAvailability
                                            ? "Ajusta hora y duración para calcular disponibilidad real."
                                            : (resolvedMaxCapacity === 0
                                                ? (availabilityError || "No quedan monitores disponibles en este horario (se requiere disponibilidad 15 min antes y 15 min después).")
                                                : `Capacidad detectada: ${resolvedMaxCapacity} alumnos por ocupación de monitores`)}
                            </div>
                            {hasAvailability && form.data.time ? (
                                <div className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300">
                                    Ventana operativa calculada:{" "}
                                    <span className="font-semibold">
                                        {availability?.range_start
                                            ? formatDateTimeMadrid(availability.range_start, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
                                            : "—"}
                                    </span>
                                    {" - "}
                                    <span className="font-semibold">
                                        {availability?.range_end
                                            ? formatDateTimeMadrid(availability.range_end, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
                                            : "—"}
                                    </span>
                                </div>
                            ) : null}
                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={
                                        form.processing
                                        || (form.data.time && hasAvailability && resolvedMaxCapacity === 0)
                                        || (() => {
                                            return !!getDurationValidationMessage();
                                        })()
                                    }
                                    className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-sky-700 disabled:opacity-60"
                                >
                                    {form.processing ? "Guardando..." : (editingLessonId ? "Guardar modificación" : "Crear clase VIP")}
                                </button>
                            </div>
                        </form>
                    </aside>
                </div>
            ) : null}
        </>
    );
}

