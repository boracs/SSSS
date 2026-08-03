import React, { useMemo, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { toast } from "react-toastify";
import Layout1 from "../../../layouts/Layout1";
import BackButton from "../../../components/BackButton";
import Breadcrumbs from "../../../components/Breadcrumbs";
import { BOARD_CATEGORIES } from "../../../lib/surfboardCategories";

const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400";
const cardClass =
    "rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 to-slate-950/90 p-6 shadow-xl shadow-black/20 backdrop-blur-sm";
const btnPrimary =
    "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-cyan-500 hover:to-teal-500 disabled:opacity-60";
const btnSecondary =
    "inline-flex items-center justify-center rounded-xl border border-white/10 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800";

function buildSchemaOptions(priceSchemas) {
    return (priceSchemas || []).map((s) => ({
        value: String(s.id),
        label: s.name,
    }));
}

export default function Create({ priceSchemas }) {
    const options = useMemo(() => buildSchemaOptions(priceSchemas), [priceSchemas]);
    const flash = usePage().props.flash || {};
    const [preview, setPreview] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: "",
        category: "soft",
        is_active: true,
        price_schema_id: options?.[0]?.value ? Number(options[0].value) : "",
        description: "",
        altura: "",
        ancho: "",
        grosor: "",
        volumen: "",
        image_url: "",
        image_alt: "",
        image: null,
    });

    const submit = (e) => {
        e.preventDefault();
        post(route("admin.surfboards.store"), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                toast.success("Tabla creada correctamente.");
                reset();
                setPreview(null);
            },
            onError: () => toast.error("Revisa los campos marcados."),
        });
    };

    const breadcrumbs = [
        { label: "Admin", href: route("Pag_principal") },
        { label: "Alquileres", href: route("admin.surfboards.index") },
        { label: "Tablas", href: route("admin.surfboards.index") },
        { label: "Nueva tabla" },
    ];

    return (
        <>
            <Head title="Nueva tabla" />
            <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
                </div>

                <div className="relative mx-auto max-w-4xl space-y-5">
                    <Breadcrumbs items={breadcrumbs} variant="dark" className="mb-1 hidden sm:flex" />

                    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                                Admin · Alquileres
                            </p>
                            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                                Crear tabla
                            </h1>
                            <p className="mt-2 text-sm text-slate-400">
                                Define categoría, estado, esquema de precios e imagen.
                            </p>
                        </div>
                        <BackButton href={route("admin.surfboards.index")}>Volver a listado</BackButton>
                    </header>

                    {flash.success ? (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200">
                            {flash.success}
                        </div>
                    ) : null}

                    <form onSubmit={submit} className={`${cardClass} space-y-5`}>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block">
                                <span className={labelClass}>Nombre (opcional)</span>
                                <input
                                    value={data.name}
                                    onChange={(e) => setData("name", e.target.value)}
                                    className={inputClass}
                                    placeholder="Ej. Tabla 1"
                                />
                                {errors.name ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.name}</div>
                                ) : null}
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
                                    {BOARD_CATEGORIES.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                                {errors.category ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.category}</div>
                                ) : null}
                            </label>

                            <label className="block">
                                <span className={labelClass}>Estado</span>
                                <div className="mt-2 flex items-center gap-3">
                                    <input
                                        id="is_active"
                                        type="checkbox"
                                        checked={!!data.is_active}
                                        onChange={(e) => setData("is_active", e.target.checked)}
                                        className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-500 focus:ring-cyan-500/30"
                                    />
                                    <label htmlFor="is_active" className="text-sm text-slate-300">
                                        Activa para reservas
                                    </label>
                                </div>
                                {errors.is_active ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.is_active}</div>
                                ) : null}
                            </label>
                        </div>

                        <label className="block">
                            <span className={labelClass}>Descripción</span>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData("description", e.target.value)}
                                rows={4}
                                className={inputClass}
                                placeholder="Notas internas o detalles de la tabla…"
                            />
                            {errors.description ? (
                                <div className="mt-1 text-xs text-rose-400">{errors.description}</div>
                            ) : null}
                        </label>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <label className="block">
                                <span className={labelClass}>Altura</span>
                                <input
                                    value={data.altura}
                                    onChange={(e) => setData("altura", e.target.value)}
                                    className={inputClass}
                                    placeholder='Ej. 6"2'
                                />
                                {errors.altura ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.altura}</div>
                                ) : null}
                            </label>
                            <label className="block">
                                <span className={labelClass}>Ancho</span>
                                <input
                                    value={data.ancho}
                                    onChange={(e) => setData("ancho", e.target.value)}
                                    className={inputClass}
                                    placeholder='Ej. 20"'
                                />
                                {errors.ancho ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.ancho}</div>
                                ) : null}
                            </label>
                            <label className="block">
                                <span className={labelClass}>Grosor</span>
                                <input
                                    value={data.grosor}
                                    onChange={(e) => setData("grosor", e.target.value)}
                                    className={inputClass}
                                    placeholder='Ej. 2"5/8'
                                />
                                {errors.grosor ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.grosor}</div>
                                ) : null}
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
                                {errors.volumen ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.volumen}</div>
                                ) : null}
                            </label>
                        </div>

                        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                            <label className="block">
                                <span className={labelClass}>Imagen (subir archivo)</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setData("image", file);
                                        setPreview(file ? URL.createObjectURL(file) : null);
                                    }}
                                    className="mt-1 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-200 hover:file:bg-slate-700"
                                />
                                {errors.image ? (
                                    <div className="mt-1 text-xs text-rose-400">{errors.image}</div>
                                ) : null}
                                <div className="mt-2 text-xs text-slate-500">
                                    Si subes archivo, se guardará en `storage/app/public/surfboards`.
                                </div>
                            </label>

                            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-3">
                                <div className="text-xs font-semibold text-slate-400">Previsualización</div>
                                <div className="mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-slate-950 ring-1 ring-white/10">
                                    <img
                                        src={preview || "/img/placeholder.svg"}
                                        alt="preview"
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            </div>
                        </div>

                        <label className="block">
                            <span className={labelClass}>Imagen por URL (opcional)</span>
                            <input
                                value={data.image_url}
                                onChange={(e) => setData("image_url", e.target.value)}
                                className={inputClass}
                                placeholder="https://… o JSON ['path1','path2']"
                            />
                            {errors.image_url ? (
                                <div className="mt-1 text-xs text-rose-400">{errors.image_url}</div>
                            ) : null}
                        </label>

                        <label className="block">
                            <span className={labelClass}>Texto alternativo imagen (SEO)</span>
                            <input
                                value={data.image_alt}
                                onChange={(e) => setData("image_alt", e.target.value)}
                                className={inputClass}
                                placeholder="Ej. Tabla soft 6 pies vista frontal"
                            />
                            {errors.image_alt ? (
                                <div className="mt-1 text-xs text-rose-400">{errors.image_alt}</div>
                            ) : null}
                        </label>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <Link href={route("admin.surfboards.index")} className={btnSecondary}>
                                Cancelar
                            </Link>
                            <button type="submit" disabled={processing} className={btnPrimary}>
                                {processing ? "Guardando…" : "Crear"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

Create.layout = (page) => <Layout1>{page}</Layout1>;
