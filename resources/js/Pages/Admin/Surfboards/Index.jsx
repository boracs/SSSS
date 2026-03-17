import React, { useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "../../../layouts/AuthenticatedLayout";
import Breadcrumbs from "../../../components/Breadcrumbs";
import EmptyState from "../../../components/EmptyState";
import SafeImage from "../../../components/SafeImage";
import { toast } from "react-toastify";

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

function Badge({ children, tone = "slate" }) {
    const tones = {
        slate: "bg-slate-200/90 text-slate-800 ring-slate-300",
        green: "bg-emerald-400/20 text-emerald-800 ring-emerald-400/50",
        red: "bg-rose-400/20 text-rose-800 ring-rose-400/50",
        indigo: "bg-indigo-400/20 text-indigo-800 ring-indigo-400/50",
    };
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ring-1 ring-inset ${
                tones[tone] || tones.slate
            }`}
        >
            {children}
        </span>
    );
}

export default function Index({ surfboards }) {
    const flash = usePage().props.flash || {};
    const [q, setQ] = useState("");
    const [category, setCategory] = useState("all");
    const [active, setActive] = useState("all");

    const stats = useMemo(() => {
        const all = surfboards || [];
        const total = all.length;
        const activeCount = all.filter((s) => !!s.is_active).length;
        const inactiveCount = total - activeCount;
        const soft = all.filter((s) => s.category === "soft").length;
        const hard = all.filter((s) => s.category === "hard").length;
        return { total, activeCount, inactiveCount, soft, hard };
    }, [surfboards]);

    const filtered = useMemo(() => {
        const query = String(q || "").trim().toLowerCase();
        return (surfboards || [])
            .filter((s) => {
                if (category === "all") return true;
                return s.category === category;
            })
            .filter((s) => {
                if (active === "all") return true;
                return active === "active" ? !!s.is_active : !s.is_active;
            })
            .filter((s) => {
                if (!query) return true;
                const name = String(s.name || "").toLowerCase();
                return (
                    name.includes(query) ||
                    String(s.id).includes(query) ||
                    String(s.price_schema?.name || "")
                        .toLowerCase()
                        .includes(query)
                );
            });
    }, [surfboards, q, category, active]);

    const breadcrumbs = [
        { label: "Admin", href: route("Pag_principal") },
        { label: "Alquileres", href: route("admin.surfboards.index") },
        { label: "Tablas" },
    ];

    return (
        <>
            <Head title="Gestor de tablas (alquiler)" />
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <Breadcrumbs items={breadcrumbs} className="mb-4" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-brand-primary">
                            Tablas de alquiler
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            CRUD de inventario de tablas y su esquema de precios.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link
                            href={route("rentals.surfboards.index")}
                            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                        >
                            Ver catálogo público
                        </Link>
                        <Link
                            href={route("admin.surfboards.create")}
                            className="inline-flex items-center justify-center rounded-xl bg-brand-action px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-action/90"
                        >
                            Nueva tabla
                        </Link>
                    </div>
                </div>

                {flash.success ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                ) : null}

                <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
                    <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Resumen
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                                <div className="text-xs font-semibold text-slate-500">
                                    Total
                                </div>
                                <div className="mt-1 text-2xl font-extrabold text-slate-900">
                                    {stats.total}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-200">
                                <div className="text-xs font-semibold text-emerald-700">
                                    Activas
                                </div>
                                <div className="mt-1 text-2xl font-extrabold text-emerald-800">
                                    {stats.activeCount}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-rose-50 p-3 ring-1 ring-inset ring-rose-200">
                                <div className="text-xs font-semibold text-rose-700">
                                    Inactivas
                                </div>
                                <div className="mt-1 text-2xl font-extrabold text-rose-800">
                                    {stats.inactiveCount}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-indigo-50 p-3 ring-1 ring-inset ring-indigo-200">
                                <div className="text-xs font-semibold text-indigo-700">
                                    Soft/Hard
                                </div>
                                <div className="mt-1 text-sm font-bold text-indigo-800">
                                    {stats.soft} / {stats.hard}
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 space-y-3">
                            <label className="block">
                                <span className="text-sm font-semibold text-slate-700">
                                    Buscar
                                </span>
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    className="input-focus-ring mt-1 w-full px-4 py-2"
                                    placeholder="Nombre, ID o esquema…"
                                />
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                <label className="block">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Categoría
                                    </span>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="input-focus-ring mt-1 w-full px-4 py-2"
                                    >
                                        <option value="all">Todas</option>
                                        <option value="soft">Soft</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-sm font-semibold text-slate-700">
                                        Estado
                                    </span>
                                    <select
                                        value={active}
                                        onChange={(e) => setActive(e.target.value)}
                                        className="input-focus-ring mt-1 w-full px-4 py-2"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="active">Activas</option>
                                        <option value="inactive">Inactivas</option>
                                    </select>
                                </label>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setQ("");
                                    setCategory("all");
                                    setActive("all");
                                }}
                                className="w-full rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-primary/90"
                            >
                                Limpiar filtros
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="grid grid-cols-12 gap-0 border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-600">
                        <div className="col-span-3">Tabla</div>
                        <div className="col-span-2">Categoría</div>
                        <div className="col-span-2">Estado</div>
                        <div className="col-span-2">Esquema</div>
                        <div className="col-span-2">Precio 24h</div>
                        <div className="col-span-1 text-right">Acciones</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {filtered.map((s) => {
                            const displayName = s.name || `Tabla #${s.id}`;
                            return (
                                <div
                                    key={s.id}
                                    className="group grid grid-cols-12 items-center gap-0 px-4 py-3 transition-all duration-300 ease-in-out hover:bg-slate-50/80"
                                >
                                    <div className="col-span-3 flex items-center gap-3">
                                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-100 transition-all duration-300 ease-in-out group-hover:ring-2 group-hover:ring-slate-300">
                                            <SafeImage
                                                src={imageUrlFor(s)}
                                                alt={s.image_alt || displayName}
                                                className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                                                placeholderClassName="rounded-lg"
                                            />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-heading text-sm font-bold tracking-tight text-slate-900">
                                                {displayName}
                                            </div>
                                            <div className="truncate text-xs font-medium text-slate-500">
                                                ID {s.id}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="col-span-2">
                                        <Badge tone="indigo">
                                            {String(s.category).toUpperCase()}
                                        </Badge>
                                    </div>

                                    <div className="col-span-2">
                                        {s.is_active ? (
                                            <Badge tone="green">Activa</Badge>
                                        ) : (
                                            <Badge tone="red">Inactiva</Badge>
                                        )}
                                    </div>

                                    <div className="col-span-2 truncate text-sm font-medium text-slate-700">
                                        {s.price_schema?.name || "—"}
                                    </div>

                                    <div className="col-span-2 text-sm font-semibold text-slate-800">
                                        {formatMoney(s.price_schema?.price_24h)}
                                    </div>

                                    <div className="col-span-1 flex justify-end gap-1">
                                        <Link
                                            href={route("admin.surfboards.edit", s.id)}
                                            preserveScroll
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-300 ease-in-out hover:bg-slate-200 hover:text-brand-primary"
                                            title="Editar"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!window.confirm(`¿Eliminar "${displayName}"? Esta acción no se puede deshacer.`)) {
                                                    toast.info("Eliminación cancelada.");
                                                    return;
                                                }
                                                router.delete(route("admin.surfboards.destroy", s.id), {
                                                    preserveScroll: true,
                                                    onSuccess: () => toast.success("Tabla eliminada."),
                                                });
                                            }}
                                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-all duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-700"
                                            title="Eliminar"
                                        >
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {filtered.length === 0 ? (
                            <div className="p-8">
                                <EmptyState
                                    title="Sin resultados"
                                    description="No hay tablas que coincidan con los filtros o la búsqueda. Prueba a limpiar filtros."
                                    action={
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setQ("");
                                                setCategory("all");
                                                setActive("all");
                                            }}
                                            className="inline-flex items-center rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-primary/90"
                                        >
                                            Limpiar filtros
                                        </button>
                                    }
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
                </div>
            </div>
        </>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

