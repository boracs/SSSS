import React, { useMemo, useState } from "react";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { toast } from "react-toastify";
import AuthenticatedLayout from "../../../layouts/AuthenticatedLayout";
import BackButton from "../../../components/BackButton";
import Breadcrumbs from "../../../components/Breadcrumbs";

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
            <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
                <Breadcrumbs items={breadcrumbs} className="mb-4" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="font-heading text-2xl font-bold tracking-tight text-brand-primary">
                            Crear tabla
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Define categoría, estado, esquema de precios e imagen.
                        </p>
                    </div>
                    <BackButton href={route("admin.surfboards.index")}>
                        Volver a listado
                    </BackButton>
                </div>

                {flash.success ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {flash.success}
                    </div>
                ) : null}

                <form
                    onSubmit={submit}
                    className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                                Nombre (opcional)
                            </span>
                            <input
                                value={data.name}
                                onChange={(e) => setData("name", e.target.value)}
                                className="input-focus-ring mt-1 w-full px-4 py-2"
                                placeholder="Ej. Tabla 1"
                            />
                            {errors.name ? (
                                <div className="mt-1 text-xs text-rose-600">
                                    {errors.name}
                                </div>
                            ) : null}
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                                Esquema de precios
                            </span>
                            <select
                                value={data.price_schema_id}
                                onChange={(e) =>
                                    setData("price_schema_id", Number(e.target.value))
                                }
                                className="input-focus-ring mt-1 w-full px-4 py-2"
                            >
                                {options.map((o) => (
                                    <option key={o.value} value={o.value}>
                                        {o.label}
                                    </option>
                                ))}
                            </select>
                            {errors.price_schema_id ? (
                                <div className="mt-1 text-xs text-rose-600">
                                    {errors.price_schema_id}
                                </div>
                            ) : null}
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                                Categoría
                            </span>
                            <select
                                value={data.category}
                                onChange={(e) => setData("category", e.target.value)}
                                className="input-focus-ring mt-1 w-full px-4 py-2"
                            >
                                <option value="soft">Softboards</option>
                                <option value="hard">Hardboards</option>
                            </select>
                            {errors.category ? (
                                <div className="mt-1 text-xs text-rose-600">
                                    {errors.category}
                                </div>
                            ) : null}
                        </label>

                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                                Estado
                            </span>
                            <div className="mt-2 flex items-center gap-3">
                                <input
                                    id="is_active"
                                    type="checkbox"
                                    checked={!!data.is_active}
                                    onChange={(e) => setData("is_active", e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-300 text-ocean-accent focus:ring-ocean-accent/30"
                                />
                                <label htmlFor="is_active" className="text-sm text-slate-700">
                                    Activa para reservas
                                </label>
                            </div>
                            {errors.is_active ? (
                                <div className="mt-1 text-xs text-rose-600">
                                    {errors.is_active}
                                </div>
                            ) : null}
                        </label>
                    </div>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">
                            Descripción
                        </span>
                        <textarea
                            value={data.description}
                            onChange={(e) => setData("description", e.target.value)}
                            rows={4}
                            className="input-focus-ring mt-1 w-full px-4 py-2"
                            placeholder="Notas internas o detalles de la tabla…"
                        />
                        {errors.description ? (
                            <div className="mt-1 text-xs text-rose-600">
                                {errors.description}
                            </div>
                        ) : null}
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">Altura</span>
                            <input
                                value={data.altura}
                                onChange={(e) => setData("altura", e.target.value)}
                                className="input-focus-ring mt-1 w-full px-4 py-2"
                                placeholder='Ej. 6"2'
                            />
                            {errors.altura ? <div className="mt-1 text-xs text-rose-600">{errors.altura}</div> : null}
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">Ancho</span>
                            <input
                                value={data.ancho}
                                onChange={(e) => setData("ancho", e.target.value)}
                                className="input-focus-ring mt-1 w-full px-4 py-2"
                                placeholder='Ej. 20"'
                            />
                            {errors.ancho ? <div className="mt-1 text-xs text-rose-600">{errors.ancho}</div> : null}
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">Grosor</span>
                            <input
                                value={data.grosor}
                                onChange={(e) => setData("grosor", e.target.value)}
                                className="input-focus-ring mt-1 w-full px-4 py-2"
                                placeholder='Ej. 2"5/8'
                            />
                            {errors.grosor ? <div className="mt-1 text-xs text-rose-600">{errors.grosor}</div> : null}
                        </label>
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">Volumen (L)</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={data.volumen}
                                onChange={(e) => setData("volumen", e.target.value)}
                                className="input-focus-ring mt-1 w-full px-4 py-2"
                                placeholder="Ej. 34.5"
                            />
                            {errors.volumen ? <div className="mt-1 text-xs text-rose-600">{errors.volumen}</div> : null}
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                        <label className="block">
                            <span className="text-sm font-semibold text-slate-700">
                                Imagen (subir archivo)
                            </span>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setData("image", file);
                                    setPreview(file ? URL.createObjectURL(file) : null);
                                }}
                                className="mt-1 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                            />
                            {errors.image ? (
                                <div className="mt-1 text-xs text-rose-600">
                                    {errors.image}
                                </div>
                            ) : null}
                            <div className="mt-2 text-xs text-slate-500">
                                Si subes archivo, se guardará en `storage/app/public/surfboards`.
                            </div>
                        </label>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                            <div className="text-xs font-semibold text-slate-600">
                                Previsualización
                            </div>
                            <div className="mt-2 aspect-[4/3] overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                                <img
                                    src={preview || "/img/placeholder.svg"}
                                    alt="preview"
                                    className="h-full w-full object-cover"
                                />
                            </div>
                        </div>
                    </div>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">
                            Imagen por URL (opcional)
                        </span>
                        <input
                            value={data.image_url}
                            onChange={(e) => setData("image_url", e.target.value)}
                            className="input-focus-ring mt-1 w-full px-4 py-2"
                            placeholder="https://… o JSON ['path1','path2']"
                        />
                        {errors.image_url ? (
                            <div className="mt-1 text-xs text-rose-600">
                                {errors.image_url}
                            </div>
                        ) : null}
                    </label>

                    <label className="block">
                        <span className="text-sm font-semibold text-slate-700">
                            Texto alternativo imagen (SEO)
                        </span>
                        <input
                            value={data.image_alt}
                            onChange={(e) => setData("image_alt", e.target.value)}
                            className="input-focus-ring mt-1 w-full px-4 py-2"
                            placeholder="Ej. Tabla soft 6 pies vista frontal"
                        />
                        {errors.image_alt ? (
                            <div className="mt-1 text-xs text-rose-600">
                                {errors.image_alt}
                            </div>
                        ) : null}
                    </label>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Link
                            href={route("admin.surfboards.index")}
                            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </Link>
                        <button
                            type="submit"
                            disabled={processing}
                            className="inline-flex items-center justify-center rounded-xl bg-brand-action px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-action/90 disabled:opacity-60"
                        >
                            {processing ? "Guardando…" : "Crear"}
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
}

Create.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

