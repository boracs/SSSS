import React from "react";
import { useForm, router } from "@inertiajs/react";
import Layout1 from "../../../layouts/Layout1";
import { ArrowLeft, Save, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
    { value: "available", label: "Disponible" },
    { value: "reserved",  label: "Reservada"  },
    { value: "sold",      label: "Vendida"    },
];

function Field({ label, error, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
            {children}
            {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
        </div>
    );
}

function Input({ className = "", ...props }) {
    return (
        <input
            className={`h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 ${className}`}
            {...props}
        />
    );
}

function Select({ className = "", children, ...props }) {
    return (
        <select
            className={`h-10 w-full rounded-xl border border-white/10 bg-slate-800 px-3 text-sm text-white outline-none transition focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

export default function AdminSecondHandEdit({ board, boardTypes = [] }) {
    const { data, setData, post, processing, errors } = useForm({
        _method:            "PUT",
        name:               board.name        ?? "",
        brand:              board.brand       ?? "",
        model:              board.model       ?? "",
        board_type:         board.board_type  ?? "",
        description:        board.description ?? "",
        height:             board.height      ?? "",
        width:              board.width       ?? "",
        thickness:          board.thickness   ?? "",
        volume:             board.volume      ?? "",
        purchase_price_eur: board.purchase_price ? (board.purchase_price / 100).toFixed(2) : "",
        sale_price_eur:     board.sale_price     ? (board.sale_price     / 100).toFixed(2) : "",
        discount_pct:       board.discount_pct ?? "0",
        status:             board.status      ?? "available",
        purchased_at:       "",
        sold_at:            board.sold_at     ?? "",
        images:             [],
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append("_method", "PUT");
        fd.append("name",           data.name);
        fd.append("brand",          data.brand);
        if (data.model)      fd.append("model",      data.model);
        if (data.board_type) fd.append("board_type", data.board_type);
        fd.append("description",    data.description);
        fd.append("height",         data.height);
        fd.append("width",          data.width);
        fd.append("thickness",      data.thickness);
        fd.append("volume",         data.volume);
        fd.append("purchase_price", Math.round(parseFloat(data.purchase_price_eur) * 100) || 0);
        fd.append("sale_price",     Math.round(parseFloat(data.sale_price_eur)     * 100) || 0);
        fd.append("discount_pct",   data.discount_pct);
        fd.append("status",         data.status);
        if (data.purchased_at) fd.append("purchased_at", data.purchased_at);
        if (data.sold_at)      fd.append("sold_at",      data.sold_at);
        data.images.forEach((f) => fd.append("images[]", f));

        router.post(route("admin.second-hand.update", board.id), fd, {
            forceFormData: true,
            onError: () => {},
        });
    };

    return (
        <Layout1>
            <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">

                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        {board.brand && (
                            <p className="text-xs font-bold uppercase tracking-wider text-orange-400">{board.brand}</p>
                        )}
                        <h1 className="text-2xl font-extrabold text-white">{board.name}</h1>
                        <p className="mt-0.5 text-xs text-slate-500">Ref. #SH-{board.id}</p>
                    </div>
                    <button type="button"
                        onClick={() => router.get(route("admin.second-hand.index"))}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/10">
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </button>
                </div>

                {board.images && board.images.length > 0 && (
                    <div className="mb-5 flex items-center gap-2 overflow-x-auto pb-1">
                        {board.images.map((src, i) => (
                            <img key={i} src={src} alt={`img-${i}`}
                                className="h-20 w-20 shrink-0 rounded-xl border border-white/10 object-cover" />
                        ))}
                        <p className="ml-2 shrink-0 text-xs text-slate-500">Sube nuevas para reemplazar.</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Field label="Nombre *" error={errors.name}>
                                <Input type="text" value={data.name} onChange={(e) => setData("name", e.target.value)} required />
                            </Field>
                            <Field label="Marca" error={errors.brand}>
                                <Input type="text" value={data.brand} onChange={(e) => setData("brand", e.target.value)} />
                            </Field>
                            <Field label="Modelo" error={errors.model}>
                                <Input type="text" value={data.model} onChange={(e) => setData("model", e.target.value)} />
                            </Field>
                            <Field label="Tipo de tabla" error={errors.board_type}>
                                <Select value={data.board_type} onChange={(e) => setData("board_type", e.target.value)}>
                                    <option value="">Sin especificar</option>
                                    {boardTypes.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </Select>
                            </Field>
                        </div>

                        <Field label="Descripcion / Estado fisico" error={errors.description}>
                            <textarea value={data.description} onChange={(e) => setData("description", e.target.value)}
                                rows={3}
                                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-orange-400/60 focus:ring-2 focus:ring-orange-500/20" />
                        </Field>

                        <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Dimensiones</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            <Field label="Largo (ft) *" error={errors.height}>
                                <Input type="number" step="0.01" value={data.height} onChange={(e) => setData("height", e.target.value)} required />
                            </Field>
                            <Field label="Ancho (in) *" error={errors.width}>
                                <Input type="number" step="0.01" value={data.width} onChange={(e) => setData("width", e.target.value)} required />
                            </Field>
                            <Field label="Grosor (in) *" error={errors.thickness}>
                                <Input type="number" step="0.01" value={data.thickness} onChange={(e) => setData("thickness", e.target.value)} required />
                            </Field>
                            <Field label="Volumen (L) *" error={errors.volume}>
                                <Input type="number" step="0.1" value={data.volume} onChange={(e) => setData("volume", e.target.value)} required />
                            </Field>
                        </div>

                        <p className="text-xs font-bold uppercase tracking-wider text-orange-400">Precios</p>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field label="Precio compra (EUR) *" error={errors.purchase_price}>
                                <Input type="number" step="0.01" value={data.purchase_price_eur}
                                    onChange={(e) => setData("purchase_price_eur", e.target.value)} required />
                            </Field>
                            <Field label="Precio venta (EUR) *" error={errors.sale_price}>
                                <Input type="number" step="0.01" value={data.sale_price_eur}
                                    onChange={(e) => setData("sale_price_eur", e.target.value)} required />
                            </Field>
                            <Field label="Descuento %" error={errors.discount_pct}>
                                <Input type="number" min="0" max="100" value={data.discount_pct}
                                    onChange={(e) => setData("discount_pct", e.target.value)} />
                            </Field>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <Field label="Estado *" error={errors.status}>
                                <Select value={data.status} onChange={(e) => setData("status", e.target.value)}>
                                    {STATUS_OPTIONS.map((s) => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </Select>
                            </Field>
                            <Field label="Fecha de compra" error={errors.purchased_at}>
                                <Input type="date" value={data.purchased_at} onChange={(e) => setData("purchased_at", e.target.value)} />
                            </Field>
                            <Field label="Fecha de venta" error={errors.sold_at}>
                                <Input type="date" value={data.sold_at} onChange={(e) => setData("sold_at", e.target.value)} />
                            </Field>
                        </div>

                        <Field label="Reemplazar imagenes (opcional)" error={errors["images.0"]}>
                            <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp"
                                onChange={(e) => setData("images", Array.from(e.target.files))}
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500 file:px-3 file:py-1 file:text-xs file:font-bold file:text-white" />
                            <p className="mt-1 text-xs text-slate-500">Si subes nuevas imagenes se eliminaran las anteriores.</p>
                        </Field>
                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                        <button type="button" onClick={() => router.get(route("admin.second-hand.index"))}
                            className="rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-white/10">
                            Cancelar
                        </button>
                        <button type="submit" disabled={processing}
                            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600 disabled:opacity-70">
                            {processing
                                ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                                : <><Save className="h-4 w-4" /> Guardar cambios</>
                            }
                        </button>
                    </div>
                </form>
            </div>
        </Layout1>
    );
}