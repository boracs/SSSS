import React, { useMemo } from "react";
import { Head, Link } from "@inertiajs/react";
import EmptyState from "../../../components/EmptyState";
import SafeImage from "../../../components/SafeImage";

function imageUrlFor(surfboard) {
    if (surfboard.first_image_url) return surfboard.first_image_url;
    if (!surfboard.image_url) return null;
    try {
        const parsed = JSON.parse(surfboard.image_url);
        if (Array.isArray(parsed) && parsed[0]) return `/storage/${String(parsed[0]).replace(/^\/+/, "")}`;
    } catch {
        // ignore
    }
    const p = surfboard.image_url;
    return String(p).startsWith("http") ? p : `/storage/${String(p).replace(/^\/+/, "")}`;
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2).replace(".", ",")} €`;
}

export default function Index({ surfboards, category }) {
    const counts = useMemo(() => {
        const all = surfboards || [];
        const soft = all.filter((s) => s.category === "soft").length;
        const hard = all.filter((s) => s.category === "hard").length;
        return { all: all.length, soft, hard };
    }, [surfboards]);

    const activeCategory = category || "all";
    const list = surfboards || [];

    return (
        <>
            <Head title="Tablas de alquiler" />
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-brand-primary">
                            Tablas de alquiler
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Consulta disponibilidad y reserva en segundos.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={route("rentals.surfboards.index")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition-colors ${
                                activeCategory === "all"
                                    ? "bg-brand-primary text-white ring-brand-primary"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                        >
                            Todas ({counts.all})
                        </Link>
                        <Link
                            href={route("rentals.surfboards.index.category", "soft")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition-colors ${
                                activeCategory === "soft"
                                    ? "bg-brand-primary text-white ring-brand-primary"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                        >
                            Softboards ({counts.soft})
                        </Link>
                        <Link
                            href={route("rentals.surfboards.index.category", "hard")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition-colors ${
                                activeCategory === "hard"
                                    ? "bg-brand-primary text-white ring-brand-primary"
                                    : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                        >
                            Hardboards ({counts.hard})
                        </Link>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {list.map((s) => {
                        const name = s.name || `Tabla #${s.id}`;
                        const imgUrl = imageUrlFor(s);
                        return (
                            <Link
                                key={s.id}
                                href={route("rentals.surfboards.show", s.id)}
                                className="group overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-md hover:ring-slate-300/80"
                            >
                                <div className="aspect-[4/5] overflow-hidden rounded-t-2xl bg-slate-100">
                                    <SafeImage
                                        src={imgUrl}
                                        alt={s.image_alt || name}
                                        className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
                                        placeholderClassName="rounded-t-2xl"
                                    />
                                </div>
                                <div className="p-4 sm:p-5">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <h2 className="font-heading truncate text-lg font-bold tracking-tight text-slate-800">
                                                {name}
                                            </h2>
                                            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                                                {s.category === "soft" ? "Softboard" : "Hardboard"}
                                            </p>
                                        </div>
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-300/60 animate-pulse-soft">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            Disponible
                                        </span>
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center rounded-full bg-brand-deep/10 px-3 py-1.5 text-sm font-semibold text-brand-deep ring-1 ring-inset ring-brand-deep/20">
                                            24h {formatMoney(s.price_schema?.price_24h)}
                                        </span>
                                        <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
                                            Semana {formatMoney(s.price_schema?.price_week)}
                                        </span>
                                    </div>

                                    <p className="mt-4 inline-flex items-center text-sm font-medium text-brand-accent transition-all duration-300 ease-in-out group-hover:translate-x-0.5">
                                        Ver calendario y reservar
                                        <span className="ml-1">→</span>
                                    </p>
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {list.length === 0 && (
                    <div className="mt-8">
                        <EmptyState
                            title="No hay tablas en este momento"
                            description="No hay tablas activas para esta categoría. Prueba con otra o vuelve más tarde."
                            action={
                                <Link
                                    href={route("rentals.surfboards.index")}
                                    className="inline-flex items-center rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-primary/90"
                                >
                                    Ver todas las categorías
                                </Link>
                            }
                        />
                    </div>
                )}
            </div>
        </>
    );
}
