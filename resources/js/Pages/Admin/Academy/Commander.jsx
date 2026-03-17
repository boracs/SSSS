import React, { useState, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import Breadcrumbs from "../../../components/Breadcrumbs";

const STALE_HOURS = 48;
function isStale(createdAt) {
    if (!createdAt) return false;
    const d = new Date(createdAt);
    return (Date.now() - d.getTime()) > STALE_HOURS * 60 * 60 * 1000;
}

const LEVEL_OPTIONS = [
    { value: "iniciacion", label: "Iniciación" },
    { value: "pro", label: "Pro" },
];

export default function Commander({ lessons = [], selectedDate, staff = [] }) {
    const [date, setDate] = useState(selectedDate);
    const [showNewLesson, setShowNewLesson] = useState(false);
    const [staleSelected, setStaleSelected] = useState([]);
    const [newLesson, setNewLesson] = useState({
        startTime: "10:00",
        endTime: "11:30",
        level: "iniciacion",
        max_slots: 6,
    });
    const { flash } = usePage().props;

    const go = (d) => {
        setDate(d);
        router.get(route("admin.academy.index"), { date: d });
    };

    const toggleOptimal = (lesson) => {
        router.post(route("admin.academy.lessons.optimal-waves", lesson.id));
    };
    const triggerSurfTrip = (lesson) => {
        if (!confirm("¿Activar Surf-Trip? La clase pasará a Playa Secundaria (Furgoneta).")) return;
        router.post(route("admin.academy.lessons.surf-trip", lesson.id));
    };
    const cancelMalMar = (lesson) => {
        if (!confirm("¿Cancelar clase por Mal Mar? Se devolverán los créditos a los alumnos.")) return;
        router.post(route("admin.academy.lessons.cancel-mal-mar", lesson.id));
    };

    const submitNewLesson = (e) => {
        e.preventDefault();
        const starts_at = `${date}T${newLesson.startTime}:00`;
        const ends_at = `${date}T${newLesson.endTime}:00`;
        router.post(route("admin.academy.lessons.store"), {
            starts_at,
            ends_at,
            level: newLesson.level,
            max_slots: Number(newLesson.max_slots),
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setShowNewLesson(false);
                setNewLesson({ startTime: "10:00", endTime: "11:30", level: "iniciacion", max_slots: 6 });
            },
        });
    };

    const assignStaff = (lessonId, role, userId) => {
        router.post(route("admin.academy.staff.assign"), {
            lesson_id: lessonId,
            role,
            user_id: userId || null,
        }, { preserveScroll: true });
    };

    const confirmEnrollment = (enrollmentId) => {
        router.post(route("admin.academy.enrollments.confirm", enrollmentId), {}, { preserveScroll: true });
    };

    const bulkDeleteStale = () => {
        if (staleSelected.length === 0) return;
        router.post(route("admin.academy.enrollments.bulk-delete-stale"), { ids: staleSelected }, { preserveScroll: true, onSuccess: () => setStaleSelected([]) });
    };

    const staleEnrollments = useMemo(() => {
        const out = [];
        lessons.forEach((l) => {
            (l.enrollments || []).forEach((e) => {
                if (e.status === "pending" && isStale(e.created_at)) out.push(e);
            });
        });
        return out;
    }, [lessons]);

    const toggleStale = (id) => {
        setStaleSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const getStaffForRole = (lesson, role) => {
        const s = lesson.staff?.find((x) => x.role === role);
        return s?.user?.id ?? "";
    };

    return (
        <>
            <Head title="Consola Comandante · Academia" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
                <Breadcrumbs
                    items={[
                        { label: "Admin", href: route("Pag_principal") },
                        { label: "Academia", href: route("admin.academy.index") },
                        { label: "Consola" },
                    ]}
                    className="mb-4"
                />
                <h1 className="font-heading text-2xl font-bold tracking-tight text-brand-deep">
                    Consola del Comandante
                </h1>
                <p className="mt-1 text-sm text-slate-600">
                    Gestiona el día: olas óptimas, Surf-Trip, staff y cancelaciones.
                </p>

                {flash?.success && (
                    <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                        {flash.success}
                    </div>
                )}

                {staleEnrollments.length > 0 && (
                    <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                        <p className="text-sm font-semibold text-rose-800">Solicitudes pendientes &gt;48h</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                            {staleEnrollments.map((e) => (
                                <label key={e.id} className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-sm">
                                    <input
                                        type="checkbox"
                                        checked={staleSelected.includes(e.id)}
                                        onChange={() => toggleStale(e.id)}
                                        className="rounded border-slate-300"
                                    />
                                    <span className="text-sm text-rose-900">
                                        #{e.id} · {e.user?.nombre ?? "Cliente"} · {e.created_at ? new Date(e.created_at).toLocaleString("es-ES") : "—"}
                                    </span>
                                </label>
                            ))}
                            <button
                                type="button"
                                onClick={bulkDeleteStale}
                                disabled={staleSelected.length === 0}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                Eliminar seleccionados ({staleSelected.length})
                            </button>
                        </div>
                    </div>
                )}

                <div className="mt-6 flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700">Fecha</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => go(e.target.value)}
                            className="input-focus-ring mt-1 rounded-xl px-4 py-2"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowNewLesson(!showNewLesson)}
                        className="btn-primary"
                    >
                        {showNewLesson ? "Cerrar" : "+ Nueva clase"}
                    </button>
                </div>

                {showNewLesson && (
                    <form onSubmit={submitNewLesson} className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="font-heading text-lg font-bold text-brand-deep">Nueva clase</h2>
                        <p className="mt-1 text-sm text-slate-600">Se usará la fecha seleccionada arriba.</p>
                        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Hora inicio</label>
                                <input
                                    type="time"
                                    value={newLesson.startTime}
                                    onChange={(e) => setNewLesson((s) => ({ ...s, startTime: e.target.value }))}
                                    className="input-focus-ring mt-1 w-full rounded-xl px-4 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Hora fin</label>
                                <input
                                    type="time"
                                    value={newLesson.endTime}
                                    onChange={(e) => setNewLesson((s) => ({ ...s, endTime: e.target.value }))}
                                    className="input-focus-ring mt-1 w-full rounded-xl px-4 py-2"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nivel</label>
                                <select
                                    value={newLesson.level}
                                    onChange={(e) => setNewLesson((s) => ({ ...s, level: e.target.value }))}
                                    className="input-focus-ring mt-1 w-full rounded-xl px-4 py-2"
                                >
                                    {LEVEL_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Plazas máx.</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={12}
                                    value={newLesson.max_slots}
                                    onChange={(e) => setNewLesson((s) => ({ ...s, max_slots: e.target.value }))}
                                    className="input-focus-ring mt-1 w-full rounded-xl px-4 py-2"
                                />
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="submit" className="btn-primary">
                                Crear clase
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowNewLesson(false)}
                                className="btn-secondary"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 space-y-6">
                    {lessons.length === 0 ? (
                        <p className="text-slate-500">No hay clases este día.</p>
                    ) : (
                        lessons.map((lesson) => (
                            <div
                                key={lesson.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm backdrop-blur-sm transition-all duration-300"
                            >
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <span className="text-sm font-medium text-slate-500">
                                            {new Date(lesson.starts_at).toLocaleTimeString("es-ES", {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                            {lesson.level}
                                        </span>
                                        {lesson.is_optimal_waves && (
                                            <span className="ml-2 rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs font-medium text-brand-deep">
                                                Olas óptimas
                                            </span>
                                        )}
                                        {lesson.is_surf_trip && (
                                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                Surf-Trip
                                            </span>
                                        )}
                                        <p className="mt-1 text-sm text-slate-600">{lesson.location}</p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {lesson.enrollments?.length ?? 0} / {lesson.max_slots} plazas
                                        </p>
                                        {(lesson.enrollments?.length ?? 0) > 0 && (
                                            <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Inscripciones</p>
                                                {lesson.enrollments.map((e) => {
                                                    const stale = e.status === "pending" && isStale(e.created_at);
                                                    const hasProof = !!e.has_proof;
                                                    return (
                                                        <div
                                                            key={e.id}
                                                            className={`flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm ${stale ? "bg-rose-100 text-rose-900" : e.status === "expired" ? "bg-slate-100 text-slate-600" : hasProof ? "bg-sky-50 text-slate-800 ring-1 ring-sky-200/60 shadow-sm" : "bg-slate-50 text-slate-700"}`}
                                                        >
                                                            <span className="flex items-center gap-1.5">
                                                                {hasProof && (
                                                                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-sky-700">
                                                                        Pago subido
                                                                    </span>
                                                                )}
                                                                {lesson.is_private ? "Cliente" : (e.user?.nombre ?? "—")}
                                                                {hasProof && (
                                                                    <a
                                                                        href={route("admin.academy.enrollments.proof", e.id)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex rounded p-1 text-sky-600 hover:bg-sky-100"
                                                                        title="Ver comprobante"
                                                                    >
                                                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                                        </svg>
                                                                    </a>
                                                                )}
                                                            </span>
                                                            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-slate-200 text-slate-700">{e.status}</span>
                                                            <span className="text-xs opacity-80">{e.created_at ? new Date(e.created_at).toLocaleString("es-ES") : ""}</span>
                                                            {e.status === "pending" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => confirmEnrollment(e.id)}
                                                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-all ${hasProof ? "bg-emerald-600 ring-2 ring-emerald-400 ring-offset-1 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                                                >
                                                                    Confirmar
                                                                </button>
                                                            )}
                                                            {e.status === "expired" && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => router.post(route("admin.academy.enrollments.reactivate", e.id), {}, { preserveScroll: true })}
                                                                    className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-medium text-white hover:bg-amber-600"
                                                                >
                                                                    Reactivar 1h extra
                                                                </button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleOptimal(lesson)}
                                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-300 hover:bg-slate-50"
                                        >
                                            {lesson.is_optimal_waves ? "Quitar óptimas" : "Olas óptimas"}
                                        </button>
                                        {!lesson.is_surf_trip && (
                                            <button
                                                type="button"
                                                onClick={() => triggerSurfTrip(lesson)}
                                                className="rounded-xl bg-brand-accent px-3 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-brand-accent/90"
                                            >
                                                Trigger Surf-Trip
                                            </button>
                                        )}
                                        {lesson.status === "scheduled" && (
                                            <button
                                                type="button"
                                                onClick={() => cancelMalMar(lesson)}
                                                className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 transition-all duration-300 hover:bg-rose-200"
                                            >
                                                Cancelar (Mal mar)
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Asignación Monitor / Fotógrafo */}
                                {lesson.status === "scheduled" && (
                                    <div className="mt-4 border-t border-slate-100 pt-4">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            Staff
                                        </p>
                                        <div className="flex flex-wrap gap-4">
                                            <div className="min-w-[160px]">
                                                <label className="block text-xs font-medium text-slate-600">Monitor</label>
                                                <select
                                                    value={getStaffForRole(lesson, "monitor")}
                                                    onChange={(e) => assignStaff(lesson.id, "monitor", e.target.value)}
                                                    className="input-focus-ring mt-1 w-full rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <option value="">— Sin asignar</option>
                                                    {staff.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.nombre || s.email}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="min-w-[160px]">
                                                <label className="block text-xs font-medium text-slate-600">Fotógrafo</label>
                                                <select
                                                    value={getStaffForRole(lesson, "fotografo")}
                                                    onChange={(e) => assignStaff(lesson.id, "fotografo", e.target.value)}
                                                    className="input-focus-ring mt-1 w-full rounded-lg px-3 py-2 text-sm"
                                                >
                                                    <option value="">— Sin asignar</option>
                                                    {staff.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.nombre || s.email}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
