import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "react-toastify";
import Layout1 from "../../../layouts/Layout1";
import Breadcrumbs from "../../../components/Breadcrumbs";
import EmptyState from "../../../components/EmptyState";
import SafeImage from "../../../components/SafeImage";

const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";
const cardClass =
    "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-5 shadow-xl shadow-black/20 backdrop-blur-sm";
const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-500 hover:to-teal-500 disabled:opacity-60";
const btnSecondary =
    "inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800";

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

function parseFirstImage(imageUrl) {
    if (!imageUrl) return null;
    try {
        const parsed = JSON.parse(imageUrl);
        if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    } catch {
        // ignore
    }
    return imageUrl;
}

function imageSrc(pathOrUrl) {
    if (!pathOrUrl) return "/img/placeholder.svg";
    if (String(pathOrUrl).startsWith("http")) return pathOrUrl;
    return `/storage/${String(pathOrUrl).replace(/^\/+/, "")}`;
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2).replace(".", ",")} €`;
}

function Badge({ children, tone = "slate" }) {
    const tones = {
        slate: "bg-slate-900/35 text-slate-100 ring-slate-600/30",
        green: "bg-emerald-900/35 text-emerald-100 ring-emerald-600/30",
        red: "bg-rose-900/35 text-rose-100 ring-rose-600/30",
        indigo: "bg-indigo-900/35 text-indigo-100 ring-indigo-600/30",
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

function ChevronIcon({ open, className = "h-4 w-4" }) {
    return (
        <svg
            className={`${className} transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
        >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}

function PowerIcon({ className = "h-4 w-4" }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
            />
        </svg>
    );
}

function SurfboardInlineEditor({ detail }) {
    const surfboard = detail.surfboard;
    const priceSchemas = detail.priceSchemas || [];
    const options = useMemo(
        () =>
            priceSchemas.map((s) => ({
                value: String(s.id),
                label: s.name,
            })),
        [priceSchemas],
    );

    const originalFirst = parseFirstImage(surfboard?.image_url);
    const [preview, setPreview] = useState(null);

    const { data, setData, post, processing, errors } = useForm({
        _method: "put",
        name: surfboard?.name || "",
        category: surfboard?.category || "soft",
        is_active: !!surfboard?.is_active,
        price_schema_id: surfboard?.price_schema_id || options?.[0]?.value || "",
        description: surfboard?.description || "",
        altura: surfboard?.altura || "",
        ancho: surfboard?.ancho || "",
        grosor: surfboard?.grosor || "",
        volumen: surfboard?.volumen ?? "",
        image_url: surfboard?.image_url || "",
        image_alt: surfboard?.image_alt || "",
        image: null,
    });

    useEffect(() => {
        return () => {
            if (preview) URL.revokeObjectURL(preview);
        };
    }, [preview]);

    const submit = (e) => {
        e.preventDefault();
        e.stopPropagation();
        post(route("admin.surfboards.update", surfboard.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => toast.success("Tabla actualizada correctamente."),
            onError: () => toast.error("Revisa los campos marcados."),
        });
    };

    return (
        <form onSubmit={submit} className="space-y-4 border-t border-white/10 bg-slate-950/60 px-4 py-4 sm:px-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                    <span className={labelClass}>Nombre (opcional)</span>
                    <input
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        className={inputClass}
                    />
                    {errors.name ? <div className="mt-1 text-xs text-rose-400">{errors.name}</div> : null}
                </label>

                <label className="block">
                    <span className={labelClass}>Esquema de precios</span>
                    <select
                        value={data.price_schema_id}
                        onChange={(e) => setData("price_schema_id", Number(e.target.value))}
                        className={inputClass}
                    >
                        {options.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                    {errors.price_schema_id ? (
                        <div className="mt-1 text-xs text-rose-400">{errors.price_schema_id}</div>
                    ) : null}
                </label>

                <label className="block">
                    <span className={labelClass}>Categoría</span>
                    <select
                        value={data.category}
                        onChange={(e) => setData("category", e.target.value)}
                        className={inputClass}
                    >
                        <option value="soft">Softboards</option>
                        <option value="hard">Hardboards</option>
                    </select>
                    {errors.category ? <div className="mt-1 text-xs text-rose-400">{errors.category}</div> : null}
                </label>

                <label className="block">
                    <span className={labelClass}>Estado</span>
                    <div className="mt-2 flex items-center gap-3">
                        <input
                            id={`is_active_${surfboard.id}`}
                            type="checkbox"
                            checked={!!data.is_active}
                            onChange={(e) => setData("is_active", e.target.checked)}
                            className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30"
                        />
                        <label htmlFor={`is_active_${surfboard.id}`} className="text-sm text-slate-300">
                            Activa para reservas
                        </label>
                    </div>
                    {errors.is_active ? <div className="mt-1 text-xs text-rose-400">{errors.is_active}</div> : null}
                </label>
            </div>

            <label className="block">
                <span className={labelClass}>Descripción</span>
                <textarea
                    value={data.description}
                    onChange={(e) => setData("description", e.target.value)}
                    rows={3}
                    className={inputClass}
                />
                {errors.description ? (
                    <div className="mt-1 text-xs text-rose-400">{errors.description}</div>
                ) : null}
            </label>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <label className="block">
                    <span className={labelClass}>Altura</span>
                    <input
                        value={data.altura}
                        onChange={(e) => setData("altura", e.target.value)}
                        className={inputClass}
                        placeholder='Ej. 6"2'
                    />
                </label>
                <label className="block">
                    <span className={labelClass}>Ancho</span>
                    <input
                        value={data.ancho}
                        onChange={(e) => setData("ancho", e.target.value)}
                        className={inputClass}
                        placeholder='Ej. 20"'
                    />
                </label>
                <label className="block">
                    <span className={labelClass}>Grosor</span>
                    <input
                        value={data.grosor}
                        onChange={(e) => setData("grosor", e.target.value)}
                        className={inputClass}
                        placeholder='Ej. 2"5/8'
                    />
                </label>
                <label className="block">
                    <span className={labelClass}>Volumen (L)</span>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={data.volumen}
                        onChange={(e) => setData("volumen", e.target.value)}
                        className={inputClass}
                        placeholder="Ej. 34.5"
                    />
                </label>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                <label className="block">
                    <span className={labelClass}>Cambiar imagen (subir archivo)</span>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setData("image", file);
                            setPreview((prev) => {
                                if (prev) URL.revokeObjectURL(prev);
                                return file ? URL.createObjectURL(file) : null;
                            });
                        }}
                        className="mt-1 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
                    />
                    {errors.image ? <div className="mt-1 text-xs text-rose-400">{errors.image}</div> : null}
                </label>

                <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                    <div className="text-xs font-semibold text-slate-400">Vista previa</div>
                    <div className="mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/10">
                        <img
                            src={preview || imageSrc(originalFirst) || "/img/placeholder.svg"}
                            alt="preview"
                            className="h-full w-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = "/img/placeholder.svg";
                            }}
                        />
                    </div>
                </div>
            </div>

            <label className="block">
                <span className={labelClass}>Imagen por URL/JSON (opcional)</span>
                <input
                    value={data.image_url || ""}
                    onChange={(e) => setData("image_url", e.target.value)}
                    className={inputClass}
                    placeholder="https://… o JSON ['path1','path2']"
                />
                {errors.image_url ? <div className="mt-1 text-xs text-rose-400">{errors.image_url}</div> : null}
            </label>

            <label className="block">
                <span className={labelClass}>Texto alternativo imagen (SEO)</span>
                <input
                    value={data.image_alt || ""}
                    onChange={(e) => setData("image_alt", e.target.value)}
                    className={inputClass}
                    placeholder="Ej. Tabla soft 6 pies vista frontal"
                />
                {errors.image_alt ? <div className="mt-1 text-xs text-rose-400">{errors.image_alt}</div> : null}
            </label>

            <div className="flex justify-end pt-1">
                <button type="submit" disabled={processing} className={btnPrimary}>
                    {processing ? "Guardando…" : "Guardar cambios"}
                </button>
            </div>
        </form>
    );
}

export default function Index({ surfboards }) {
    const flash = usePage().props.flash || {};
    const [q, setQ] = useState("");
    const [category, setCategory] = useState("all");
    const [active, setActive] = useState("all");
    const [expandedId, setExpandedId] = useState(null);
    const [detailCache, setDetailCache] = useState({});
    const [loadingId, setLoadingId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

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

    const fetchDetail = async (id) => {
        if (detailCache[id]) return detailCache[id];
        setLoadingId(id);
        try {
            const res = await fetch(route("admin.surfboards.detalle", id), {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
            });
            if (!res.ok) throw new Error("No se pudo cargar el detalle");
            const json = await res.json();
            setDetailCache((prev) => ({ ...prev, [id]: json }));
            return json;
        } catch {
            toast.error("No se pudo cargar el detalle de la tabla.");
            setExpandedId(null);
            return null;
        } finally {
            setLoadingId(null);
        }
    };

    const toggleExpand = async (id) => {
        if (expandedId === id) {
            setExpandedId(null);
            return;
        }
        setExpandedId(id);
        await fetchDetail(id);
    };

    const toggleActive = (s) => {
        const next = !s.is_active;
        setTogglingId(s.id);
        router.put(
            route("admin.surfboards.update", s.id),
            { is_active: next ? 1 : 0 },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(next ? "Tabla activada." : "Tabla desactivada.");
                    setDetailCache((prev) => {
                        if (!prev[s.id]) return prev;
                        return {
                            ...prev,
                            [s.id]: {
                                ...prev[s.id],
                                surfboard: {
                                    ...prev[s.id].surfboard,
                                    is_active: next,
                                },
                            },
                        };
                    });
                },
                onError: () => toast.error("No se pudo cambiar el estado."),
                onFinish: () => setTogglingId(null),
            },
        );
    };

    const breadcrumbs = [
        { label: "Admin", href: route("Pag_principal") },
        { label: "Alquileres", href: route("admin.surfboards.index") },
        { label: "Tablas" },
    ];

    const clearFilters = () => {
        setQ("");
        setCategory("all");
        setActive("all");
    };

    return (
        <>
            <Head title="Gestor de tablas (alquiler)" />
            <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
                </div>

                <div className="relative mx-auto max-w-7xl space-y-5">
                    <Breadcrumbs items={breadcrumbs} variant="dark" className="mb-1 hidden sm:flex" />

                    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                                Admin · Alquileres
                            </p>
                            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                                Tablas de alquiler
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-400">
                                Inventario de tablas: edita en el listado y activa/desactiva sin salir.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href={route("rentals.surfboards.index")} className={btnSecondary}>
                                Ver catálogo público
                            </Link>
                            <Link href={route("admin.surfboards.create")} className={btnPrimary}>
                                Nueva tabla
                            </Link>
                        </div>
                    </header>

                    {flash.success ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                            {flash.success}
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        <div className={`${cardClass} lg:col-span-4`}>
                            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Resumen
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                                <div className="rounded-2xl border border-slate-500/25 bg-slate-950/30 p-3">
                                    <div className="text-xs font-semibold text-slate-400">Total</div>
                                    <div className="mt-1 text-2xl font-extrabold text-slate-300">{stats.total}</div>
                                </div>
                                <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/30 p-3">
                                    <div className="text-xs font-semibold text-emerald-400/80">Activas</div>
                                    <div className="mt-1 text-2xl font-extrabold text-emerald-300">
                                        {stats.activeCount}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-rose-500/25 bg-rose-950/30 p-3">
                                    <div className="text-xs font-semibold text-rose-400/80">Inactivas</div>
                                    <div className="mt-1 text-2xl font-extrabold text-rose-300">
                                        {stats.inactiveCount}
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/30 p-3">
                                    <div className="text-xs font-semibold text-indigo-400/80">Soft/Hard</div>
                                    <div className="mt-1 text-sm font-bold text-indigo-300">
                                        {stats.soft} / {stats.hard}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 space-y-3">
                                <label className="block">
                                    <span className={labelClass}>Buscar</span>
                                    <input
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        className={inputClass}
                                        placeholder="Nombre, ID o esquema…"
                                    />
                                </label>

                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className={labelClass}>Categoría</span>
                                        <select
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="all">Todas</option>
                                            <option value="soft">Soft</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </label>

                                    <label className="block">
                                        <span className={labelClass}>Estado</span>
                                        <select
                                            value={active}
                                            onChange={(e) => setActive(e.target.value)}
                                            className={inputClass}
                                        >
                                            <option value="all">Todos</option>
                                            <option value="active">Activas</option>
                                            <option value="inactive">Inactivas</option>
                                        </select>
                                    </label>
                                </div>

                                <button type="button" onClick={clearFilters} className={`${btnSecondary} w-full`}>
                                    Limpiar filtros
                                </button>
                            </div>
                        </div>

                        <div className={`overflow-hidden ${cardClass} !p-0 lg:col-span-8`}>
                            <div className="grid grid-cols-12 gap-0 border-b border-white/10 bg-slate-900/60 px-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <div className="col-span-3 pl-8">Tabla</div>
                                <div className="col-span-2">Categoría</div>
                                <div className="col-span-2">Estado</div>
                                <div className="col-span-2">Esquema</div>
                                <div className="col-span-2">Precio 24h</div>
                                <div className="col-span-1 text-right">Acciones</div>
                            </div>

                            <div className="divide-y divide-white/5">
                                {filtered.map((s, index) => {
                                    const displayName = s.name || `Tabla #${s.id}`;
                                    const isExpanded = expandedId === s.id;
                                    const rowBase = index % 2 === 0 ? "bg-slate-950/40" : "bg-slate-900/40";

                                    return (
                                        <div key={s.id} className={rowBase}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => toggleExpand(s.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        toggleExpand(s.id);
                                                    }
                                                }}
                                                className={`group grid cursor-pointer grid-cols-12 items-center gap-0 px-4 py-3 transition-all duration-300 ease-in-out hover:bg-slate-800/50 ${
                                                    isExpanded ? "bg-cyan-500/10" : ""
                                                }`}
                                            >
                                                <div className="col-span-3 flex items-center gap-2 sm:gap-3">
                                                    <button
                                                        type="button"
                                                        aria-expanded={isExpanded}
                                                        aria-label={isExpanded ? "Cerrar detalle" : "Abrir detalle"}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleExpand(s.id);
                                                        }}
                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
                                                    >
                                                        <ChevronIcon open={isExpanded} />
                                                    </button>
                                                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-slate-800 transition-all duration-300 ease-in-out group-hover:ring-2 group-hover:ring-cyan-500/40">
                                                        <SafeImage
                                                            src={imageUrlFor(s)}
                                                            alt={s.image_alt || displayName}
                                                            className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                                                            placeholderClassName="rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="truncate font-heading text-sm font-bold tracking-tight text-white">
                                                            {displayName}
                                                        </div>
                                                        <div className="truncate text-xs font-medium text-slate-500">
                                                            ID {s.id}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <Badge tone="indigo">{String(s.category).toUpperCase()}</Badge>
                                                </div>

                                                <div className="col-span-2">
                                                    {s.is_active ? (
                                                        <Badge tone="green">Activa</Badge>
                                                    ) : (
                                                        <Badge tone="red">Inactiva</Badge>
                                                    )}
                                                </div>

                                                <div className="col-span-2 truncate text-sm font-medium text-slate-300">
                                                    {s.price_schema?.name || "—"}
                                                </div>

                                                <div className="col-span-2 text-sm font-semibold text-slate-200">
                                                    {formatMoney(s.price_schema?.price_24h)}
                                                </div>

                                                <div
                                                    className="col-span-1 flex justify-end gap-1"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={togglingId === s.id}
                                                        onClick={() => toggleActive(s)}
                                                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300 ease-in-out disabled:opacity-50 ${
                                                            s.is_active
                                                                ? "text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300"
                                                                : "text-slate-500 hover:bg-rose-500/15 hover:text-rose-300"
                                                        }`}
                                                        title={s.is_active ? "Desactivar" : "Activar"}
                                                        aria-label={s.is_active ? "Desactivar tabla" : "Activar tabla"}
                                                    >
                                                        <PowerIcon />
                                                    </button>
                                                </div>
                                            </div>

                                            <AnimatePresence initial={false}>
                                                {isExpanded ? (
                                                    <motion.div
                                                        key={`panel-${s.id}`}
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.22, ease: "easeInOut" }}
                                                        className="overflow-hidden"
                                                    >
                                                        {loadingId === s.id && !detailCache[s.id] ? (
                                                            <div className="border-t border-white/10 px-4 py-6 text-sm text-slate-400">
                                                                Cargando…
                                                            </div>
                                                        ) : detailCache[s.id] ? (
                                                            <SurfboardInlineEditor
                                                                key={s.id}
                                                                detail={detailCache[s.id]}
                                                            />
                                                        ) : null}
                                                    </motion.div>
                                                ) : null}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}

                                {filtered.length === 0 ? (
                                    <div className="p-8">
                                        <EmptyState
                                            title="Sin resultados"
                                            description="No hay tablas que coincidan con los filtros o la búsqueda. Prueba a limpiar filtros."
                                            className="!border-white/10 !bg-slate-900/60 !shadow-none [&_h3]:!text-white [&_p]:!text-slate-400 [&_div.mb-4]:!bg-slate-800 [&_div.mb-4]:!text-slate-400"
                                            action={
                                                <button type="button" onClick={clearFilters} className={btnSecondary}>
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
            </div>
        </>
    );
}

Index.layout = (page) => <Layout1>{page}</Layout1>;
