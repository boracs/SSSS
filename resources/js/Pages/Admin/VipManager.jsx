import { Head, router, useForm } from "@inertiajs/react";
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, UserIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

function toYmd(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

export default function VipManager({ month, lessons = [], staff = [] }) {
    const [monthCursor, setMonthCursor] = useState(month || toYmd(new Date()).slice(0, 7));
    const [selectedDate, setSelectedDate] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [editingLessonId, setEditingLessonId] = useState(null);
    const [staffPool, setStaffPool] = useState({ available: staff || [], occupied: [] });
    const [replicateProcessing, setReplicateProcessing] = useState(false);
    const [loadingMonth, setLoadingMonth] = useState(false);
    const [pendingDeleteLesson, setPendingDeleteLesson] = useState(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);

    const form = useForm({
        date: "",
        time: "",
        level: "iniciacion",
        monitor_id: "",
        has_photographer: false,
        photographer_id: "",
        location: "Zurriola",
        max_capacity: 12,
    });

    const monthDate = useMemo(() => {
        const [y, m] = monthCursor.split("-").map((n) => Number(n));
        return new Date(y, m - 1, 1);
    }, [monthCursor]);

    const monthLabel = monthDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
    const firstDayMondayBased = (monthDate.getDay() + 6) % 7;
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    const lessonsByDate = useMemo(() => {
        const out = {};
        for (const lesson of lessons) {
            const d = lesson?.starts_at ? new Date(lesson.starts_at) : null;
            if (!d) continue;
            const key = toYmd(d);
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
        const prevMonthDays = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0).getDate();
        for (let i = 0; i < firstDayMondayBased; i += 1) {
            const day = prevMonthDays - firstDayMondayBased + i + 1;
            const d = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, day);
            const iso = toYmd(d);
            list.push({ iso, dayNumber: day, current: false, entries: lessonsByDate[iso] || [] });
        }
        for (let d = 1; d <= daysInMonth; d += 1) {
            const dt = new Date(monthDate.getFullYear(), monthDate.getMonth(), d);
            const iso = toYmd(dt);
            list.push({ iso, dayNumber: d, current: true, entries: lessonsByDate[iso] || [] });
        }
        while (list.length < 42) {
            const nextDay = list.length - (firstDayMondayBased + daysInMonth) + 1;
            const d = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, nextDay);
            const iso = toYmd(d);
            list.push({ iso, dayNumber: nextDay, current: false, entries: lessonsByDate[iso] || [] });
        }
        return list;
    }, [daysInMonth, firstDayMondayBased, lessonsByDate, monthDate]);

    const goMonth = (delta) => {
        const d = new Date(monthDate);
        d.setMonth(d.getMonth() + delta);
        const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
        const date = toYmd(start);
        const time = start.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: false });
        setEditingLessonId(Number(entry.id));
        setSelectedDate(date);
        setDrawerOpen(true);
        form.setData({
            date,
            time,
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
        const base = "relative z-10 overflow-visible rounded border bg-slate-50 px-3 py-1.5 pr-16 pb-6 shadow-sm transition-all duration-200 ease-in-out hover:border-rose-400 hover:shadow-md";
        const capAlert = cap === 6 ? "border-amber-300" : "border-slate-300";
        const historical = isPastEntry(entry) ? "opacity-60" : "";
        return `${base} ${capAlert} ${historical}`;
    };

    const levelBadgeClass = (level) => {
        const v = String(level || "").toLowerCase();
        if (v === "avanzado") return "bg-red-100 text-red-800 border-red-200";
        if (v === "intermedio") return "bg-sky-100 text-sky-800 border-sky-200";
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
    };

    const levelDotClass = (level) => {
        const v = String(level || "").toLowerCase();
        if (v === "avanzado") return "bg-red-500";
        if (v === "intermedio") return "bg-sky-500";
        return "bg-emerald-500";
    };

    const checkAvailability = async (dateValue, timeValue, excludeLessonId = 0) => {
        if (!dateValue || !timeValue) return;
        setCheckingAvailability(true);
        try {
            const url = route("admin.vip-manager.check-availability", { date: dateValue, time: timeValue, exclude_lesson_id: excludeLessonId || undefined });
            const res = await fetch(url, { headers: { Accept: "application/json" } });
            const data = await res.json();
            setAvailability(data);
            setStaffPool(data?.staff || { available: [], occupied: [] });
            form.setData("max_capacity", Number(data?.max_capacity ?? 12));
        } finally {
            setCheckingAvailability(false);
        }
    };

    const openCreateDrawer = (iso) => {
        setSelectedDate(iso);
        setEditingLessonId(null);
        setAvailability(null);
        setStaffPool({ available: staff || [], occupied: [] });
        form.setData({
            date: iso,
            time: "",
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

    const replicatePreviousWeek = async () => {
        setReplicateProcessing(true);
        try {
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") || "";
            await fetch(route("admin.vip-manager.replicate-previous-week"), {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRF-TOKEN": csrf,
                },
            });
            router.reload({ only: ["month", "lessons", "staff"] });
        } finally {
            setReplicateProcessing(false);
        }
    };

    return (
        <>
            <Head title="Admin · Gestor VIP" />
            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Gestor VIP</h1>
                        <p className="text-sm text-slate-600">Calendario mensual y creación inteligente de clases VIP.</p>
                    </div>
                    <button
                        type="button"
                        onClick={replicatePreviousWeek}
                        disabled={replicateProcessing}
                        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                    >
                        {replicateProcessing ? "Replicando..." : "Replicar semana anterior"}
                    </button>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                        <button type="button" onClick={() => goMonth(-1)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                            ◀
                        </button>
                        <p className="text-sm font-semibold capitalize text-slate-900">{monthLabel}</p>
                        <button type="button" onClick={() => goMonth(1)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                            ▶
                        </button>
                    </div>

                    <div className="mb-2 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        {["L", "M", "X", "J", "V", "S", "D"].map((d) => <span key={d}>{d}</span>)}
                    </div>
                    <div className={`grid grid-cols-7 gap-2 transition-opacity ${loadingMonth ? "opacity-60" : "opacity-100"}`}>
                        {cells.map((cell) => (
                            <div
                                key={cell.iso}
                                onClick={() => cell.current && openCreateDrawer(cell.iso)}
                                onKeyDown={(e) => {
                                    if (!cell.current) return;
                                    if (e.key !== "Enter" && e.key !== " ") return;
                                    e.preventDefault();
                                    openCreateDrawer(cell.iso);
                                }}
                                role="button"
                                tabIndex={cell.current ? 0 : -1}
                                className={`group relative rounded-lg border p-1.5 text-left transition ${
                                    cell.current ? "bg-white border-slate-300" : "bg-slate-50 border-slate-200 opacity-45"
                                } ${selectedDate === cell.iso ? "ring-2 ring-indigo-400" : ""} ${
                                    cell.iso === toYmd(new Date()) ? "ring-2 ring-inset ring-blue-500 bg-blue-50/30" : ""
                                }`}
                            >
                                <span className="absolute right-7 top-1 rounded bg-white/85 px-1 text-[11px] font-semibold text-slate-700">{cell.dayNumber}</span>
                                {cell.current ? (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openCreateDrawer(cell.iso);
                                        }}
                                        className="absolute right-1 top-1 inline-flex h-4 w-4 items-center justify-center rounded bg-white/80 text-[11px] font-bold text-slate-700 opacity-0 ring-1 ring-slate-300 transition-opacity hover:bg-white group-hover:opacity-100"
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
                                                    className="rounded bg-indigo-600 p-0.5 text-white shadow-sm ring-1 ring-indigo-700/40 hover:bg-indigo-700"
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
                                                    className="rounded bg-white/90 p-0.5 text-rose-700 ring-1 ring-rose-300 hover:bg-white"
                                                    aria-label="Eliminar clase"
                                                >
                                                    <TrashIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <span className="flex items-center gap-2">
                                                <span className="text-[11px] font-extrabold text-slate-900">{new Date(entry.starts_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</span>
                                                <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${levelBadgeClass(entry.level)}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${levelDotClass(entry.level)}`} />
                                                    {entry.level}
                                                </span>
                                                <span className="group/info relative inline-flex items-center">
                                                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 ring-1 ring-slate-200 hover:bg-white">
                                                        <EllipsisHorizontalIcon className="h-4 w-4" aria-hidden />
                                                    </span>
                                                    <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[11px] leading-relaxed text-slate-100 opacity-0 shadow-2xl transition-opacity duration-200 group-hover/pill:opacity-100 group-hover/info:opacity-100">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <span className="block"><span className="font-bold text-white">Monitor:</span> {entry.monitor_name || "Sin asignar"}</span>
                                                            <span className="text-[10px] text-slate-300">{entry.occupancy}/{entry.max_capacity}</span>
                                                        </div>
                                                        <span className="mt-1 block"><span className="font-bold text-white">Fotógrafo:</span> {entry.photographer_name || "No"}</span>
                                                        <div className="mt-2">
                                                            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-300">Alumnos</span>
                                                            {entry.students && entry.students.length > 0 ? (
                                                                <ul className="mt-1 max-h-28 overflow-auto pr-1 text-[11px] text-slate-100">
                                                                    {entry.students.map((name, idx) => (
                                                                        <li key={`${entry.id}-stu-${idx}`} className="flex gap-2">
                                                                            <span className="mt-[2px] text-slate-400">•</span>
                                                                            <span className="min-w-0 break-words">{name}</span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            ) : (
                                                                <span className="mt-1 block text-slate-300">Sin inscritos</span>
                                                            )}
                                                        </div>
                                                        {Number(entry.max_capacity) === 6 ? (
                                                            <span className="mt-2 block rounded-md border border-amber-700/40 bg-amber-900/20 px-2 py-1 text-amber-200">
                                                                <span className="font-bold">Aviso:</span> Monitor ocupado en otra sesión.
                                                            </span>
                                                        ) : null}
                                                        <span className="absolute bottom-[-4px] left-1/2 h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="absolute bottom-1 left-2 inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                                                <UserIcon className="h-3 w-3 text-slate-500" aria-hidden />
                                                {entry.occupancy}/{entry.max_capacity}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
            {pendingDeleteLesson ? (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={cancelDeleteLesson}
                        aria-label="Cerrar modal de cancelación"
                    />
                    <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <h3 className="text-lg font-bold text-slate-900">Eliminar clase VIP</h3>
                        <p className="mt-1 text-sm text-slate-600">
                            Esta acción eliminará la clase y revertirá el consumo de créditos de los alumnos inscritos.
                        </p>
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            <p><span className="font-semibold">Hora:</span> {pendingDeleteLesson?.starts_at ? new Date(pendingDeleteLesson.starts_at).toLocaleString("es-ES") : "—"}</p>
                            <p><span className="font-semibold">Nivel:</span> {pendingDeleteLesson?.level || "—"}</p>
                            <p><span className="font-semibold">Ocupación:</span> {pendingDeleteLesson?.occupancy ?? 0}/{pendingDeleteLesson?.max_capacity ?? 0}</p>
                            <p><span className="font-semibold">Monitor:</span> {pendingDeleteLesson?.monitor_name || "Sin asignar"}</p>
                        </div>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={cancelDeleteLesson}
                                disabled={deleteProcessing}
                                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteLesson}
                                disabled={deleteProcessing}
                                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                            >
                                {deleteProcessing ? "Eliminando..." : "Eliminar clase"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {drawerOpen ? (
                <div className="fixed inset-0 z-[1100] flex">
                    <button type="button" className="flex-1 bg-slate-900/10" onClick={cancelEditMode} aria-label="Cerrar panel" />
                    <aside className="h-full w-full max-w-md overflow-y-auto border-l border-slate-200 bg-white p-4 shadow-2xl">
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">
                                {editingLessonId ? `Editar clase VIP #${editingLessonId}` : `Crear clase VIP · ${selectedDate || ""}`}
                            </h2>
                            <button type="button" onClick={cancelEditMode} className="rounded-md p-1 text-slate-600 hover:bg-slate-100">
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>
                        <form className="grid grid-cols-1 gap-4" onSubmit={submit}>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Hora</label>
                                <input
                                    type="time"
                                    value={form.data.time}
                                    onChange={(e) => {
                                        const v = e.target.value;
                                        form.setData("time", v);
                                        checkAvailability(form.data.date, v, editingLessonId || 0);
                                    }}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    required
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Nivel</label>
                                <select value={form.data.level} onChange={(e) => form.setData("level", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                    <option value="iniciacion">Iniciación</option>
                                    <option value="intermedio">Intermedio</option>
                                    <option value="avanzado">Avanzado</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Monitor</label>
                                <select value={form.data.monitor_id} onChange={(e) => form.setData("monitor_id", e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                                    <option value="">Sin asignar</option>
                                    {staffPool.available.map((s) => <option key={`a-${s.id}`} value={s.id}>{s.name}</option>)}
                                    {staffPool.occupied.map((s) => <option key={`o-${s.id}`} value={s.id} disabled>{s.name} (ocupado)</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <input type="checkbox" checked={form.data.has_photographer} onChange={(e) => form.setData("has_photographer", e.target.checked)} />
                                    ¿Fotógrafo?
                                </label>
                                <select
                                    value={form.data.photographer_id}
                                    disabled={!form.data.has_photographer}
                                    onChange={(e) => form.setData("photographer_id", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                                >
                                    <option value="">Sin asignar</option>
                                    {staffPool.available.map((s) => <option key={`pa-${s.id}`} value={s.id}>{s.name}</option>)}
                                    {staffPool.occupied.map((s) => <option key={`po-${s.id}`} value={s.id} disabled>{s.name} (ocupado)</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">Ubicación</label>
                                <input
                                    type="text"
                                    value={form.data.location}
                                    onChange={(e) => form.setData("location", e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                />
                            </div>
                            <div className={`rounded-lg border px-3 py-2 text-sm ${
                                Number(availability?.max_capacity ?? form.data.max_capacity) === 12
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                                    : Number(availability?.max_capacity ?? form.data.max_capacity) === 6
                                        ? "border-amber-200 bg-amber-50 text-amber-900"
                                        : "border-rose-200 bg-rose-50 text-rose-900"
                            }`}>
                                {checkingAvailability
                                    ? "Calculando capacidad por ocupación de monitores..."
                                    : (Number(availability?.max_capacity ?? form.data.max_capacity) === 0
                                        ? "No quedan monitores disponibles en este horario (se requiere disponibilidad 15 min antes y 15 min después)."
                                        : `Capacidad detectada: ${Number(availability?.max_capacity ?? form.data.max_capacity)} alumnos por ocupación de monitores`)}
                            </div>
                            <div className="flex justify-end">
                                <button type="submit" disabled={form.processing || Number(availability?.max_capacity ?? form.data.max_capacity) === 0} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
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

