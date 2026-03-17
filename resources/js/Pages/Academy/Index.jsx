import React, { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import SurfTripFab from "../../components/SurfTripFab";

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
            <div className="h-5 w-24 rounded-full bg-slate-200" />
            <div className="mt-4 h-6 w-3/4 rounded bg-slate-200" />
            <div className="mt-3 flex gap-2">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <div className="h-8 w-8 rounded-full bg-slate-200" />
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-slate-200" />
        </div>
    );
}

function LessonCard({ lesson, isEnrolled, creditsBalance }) {
    const startsAt = new Date(lesson.starts_at);
    const timeStr = startsAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    const hasFotografo = !!lesson.fotografo;
    const occupied = lesson.enrolled_count;
    const maxSlots = lesson.max_slots;
    const progress = maxSlots ? (occupied / maxSlots) * 100 : 0;

    return (
        <article className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm backdrop-blur-sm transition-all duration-300 hover:shadow-md">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        lesson.level === "pro"
                            ? "bg-gradient-to-r from-brand-deep/90 to-brand-accent/80 text-white"
                            : "bg-slate-100 text-slate-700"
                    }`}
                >
                    {lesson.level === "pro" ? "Pro" : "Iniciación"}
                </span>
                <span className="text-sm font-medium text-slate-500">{timeStr}</span>
            </div>

            <p className="mt-3 font-heading text-lg font-bold tracking-tight text-brand-deep">
                {lesson.title || `Clase ${timeStr}`}
            </p>
            <p className="mt-1 text-sm text-slate-600">{lesson.location}</p>

            <div className="mt-4 flex items-center gap-2">
                {lesson.monitor && (
                    <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-deep/10 text-xs font-bold text-brand-deep"
                        title={`Monitor: ${lesson.monitor.nombre}`}
                    >
                        {(lesson.monitor.nombre || "M").charAt(0)}
                    </span>
                )}
                {hasFotografo ? (
                    <span
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-accent/20 text-brand-accent"
                        title={`Fotógrafo: ${lesson.fotografo.nombre}`}
                    >
                        <CameraIcon className="h-4 w-4" />
                    </span>
                ) : (
                    <span
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500"
                        title="Sesión sin fotos"
                    >
                        <CameraSlashIcon className="h-4 w-4" />
                        Sesión sin fotos
                    </span>
                )}
            </div>

            <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                    <span>Plazas</span>
                    <span>
                        {occupied} de {maxSlots}
                    </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                        className="h-full rounded-full bg-brand-accent transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            <div className="mt-4 flex gap-2">
                {isEnrolled ? (
                    <button
                        type="button"
                        onClick={() => router.post(route("academy.lessons.cancel", lesson.id))}
                        className="btn-secondary flex-1 text-sm"
                    >
                        Cancelar inscripción
                    </button>
                ) : creditsBalance >= 2 && occupied < maxSlots ? (
                    <button
                        type="button"
                        onClick={() => router.post(route("academy.lessons.enroll", lesson.id))}
                        className="btn-primary flex-1 text-sm"
                    >
                        Inscribirme
                    </button>
                ) : (
                    <span className="text-sm text-slate-500">
                        {creditsBalance < 2 ? "Créditos insuficientes" : "Clase completa"}
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

function DayPicker({ selectedDate, optimalDates, onSelect, loading }) {
    const days = [];
    const start = new Date(selectedDate);
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 2);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const isOptimal = optimalDates.includes(dateStr);
        const isSelected = dateStr === selectedDate;
        const isPast = d < today;
        days.push({ date: new Date(d), dateStr, isOptimal, isSelected, isPast });
    }

    return (
        <div className="flex gap-1 overflow-x-auto pb-2 md:flex-col md:overflow-visible">
            {days.slice(0, 14).map(({ dateStr, isOptimal, isSelected, isPast }) => (
                <button
                    key={dateStr}
                    type="button"
                    disabled={loading || isPast}
                    onClick={() => onSelect(dateStr)}
                    className={`flex-shrink-0 rounded-xl px-3 py-2 text-center text-sm font-medium transition-all duration-300 md:py-2.5 ${
                        isSelected
                            ? "bg-brand-deep text-white shadow-md"
                            : isOptimal
                              ? "bg-brand-accent/20 text-brand-deep ring-2 ring-brand-accent/50"
                              : isPast
                                ? "bg-slate-100 text-slate-400"
                                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-accent/50"
                    }`}
                >
                    {new Date(dateStr + "T12:00:00").toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                    })}
                </button>
            ))}
        </div>
    );
}

export default function AcademyIndex({ lessons = [], selectedDate, optimalDates = [], creditsBalance = 0, myEnrollmentLessonIds = [] }) {
    const [date, setDate] = useState(selectedDate);
    const [loading, setLoading] = useState(false);
    const { flash } = usePage().props;

    const go = (d) => {
        setLoading(true);
        setDate(d);
        router.get(route("academy.lessons.index"), { date: d }, { preserveState: true, onFinish: () => setLoading(false) });
    };

    const enrolledIds = new Set(myEnrollmentLessonIds);

    return (
        <Layout1>
            <Head title="Academia · Clases" />
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
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
                        <div className="sticky top-24 rounded-2xl border border-slate-200/60 bg-white/80 p-4 shadow-sm backdrop-blur-md">
                            <h2 className="mb-3 font-heading text-sm font-bold uppercase tracking-wider text-slate-600">
                                Día
                            </h2>
                            <DayPicker
                                selectedDate={date}
                                optimalDates={optimalDates}
                                onSelect={go}
                                loading={loading}
                            />
                            {optimalDates.length > 0 && (
                                <p className="mt-3 text-xs text-slate-500">
                                    Días con aura cian tienen olas óptimas.
                                </p>
                            )}
                        </div>
                    </aside>

                    <main className="flex-1 lg:w-[70%]">
                        <h2 className="mb-4 font-heading text-sm font-bold uppercase tracking-wider text-slate-600">
                            Clases del día
                        </h2>
                        {loading ? (
                            <div className="space-y-4">
                                <SkeletonCard />
                                <SkeletonCard />
                                <SkeletonCard />
                            </div>
                        ) : lessons.length === 0 ? (
                            <div className="rounded-2xl border border-slate-200/60 bg-white p-8 text-center text-slate-500">
                                No hay clases este día.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {lessons.map((lesson) => (
                                    <LessonCard
                                        key={lesson.id}
                                        lesson={lesson}
                                        isEnrolled={enrolledIds.has(lesson.id)}
                                        creditsBalance={creditsBalance}
                                    />
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
            {pendingSurfTripLesson && <SurfTripFab lesson={pendingSurfTripLesson} />}
        </Layout1>
    );
}
