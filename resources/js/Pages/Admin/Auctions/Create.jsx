import React from "react";
import { Head, router } from "@inertiajs/react";
import Layout1 from "../../../layouts/Layout1";
import { ArrowLeft, Loader2, Save } from "lucide-react";

function Field({ label, error, children }) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</label>
            {children}
            {error ? <p className="mt-1 text-xs text-rose-400">{error}</p> : null}
        </div>
    );
}

const inputCls =
    "h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20";

export default function AdminAuctionsCreate({ statuses = [], categories = [] }) {
    const [processing, setProcessing] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    const [data, setData] = React.useState({
        title: "",
        description: "",
        category: "surfboard",
        starting_price: "",
        min_increment: "5",
        reserve_price: "",
        status: "draft",
        starts_at: "",
        ends_at: "",
        images: [],
    });

    const set = (key, value) => setData((prev) => ({ ...prev, [key]: value }));

    const submit = (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append("title", data.title);
        fd.append("description", data.description);
        fd.append("category", data.category);
        fd.append("starting_price", data.starting_price);
        fd.append("min_increment", data.min_increment || "5");
        if (data.reserve_price) fd.append("reserve_price", data.reserve_price);
        fd.append("status", data.status);
        if (data.starts_at) fd.append("starts_at", data.starts_at);
        if (data.ends_at) fd.append("ends_at", data.ends_at);
        data.images.forEach((f) => fd.append("images[]", f));

        setProcessing(true);
        router.post(route("admin.auctions.store"), fd, {
            forceFormData: true,
            onError: (errs) => setErrors(errs),
            onFinish: () => setProcessing(false),
        });
    };

    return (
        <Layout1>
            <Head title="Nueva subasta" />
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-extrabold text-white">Nueva subasta</h1>
                    <button
                        type="button"
                        onClick={() => router.get(route("admin.auctions.index"))}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300"
                    >
                        <ArrowLeft className="h-4 w-4" /> Volver
                    </button>
                </div>

                <form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-6">
                    <Field label="Título *" error={errors.title}>
                        <input className={inputCls} value={data.title} onChange={(e) => set("title", e.target.value)} required />
                    </Field>
                    <Field label="Descripción" error={errors.description}>
                        <textarea
                            className={`${inputCls} min-h-[100px] py-2`}
                            value={data.description}
                            onChange={(e) => set("description", e.target.value)}
                        />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Categoría *" error={errors.category}>
                            <select className={inputCls} value={data.category} onChange={(e) => set("category", e.target.value)}>
                                {categories.map((c) => (
                                    <option key={c.value} value={c.value}>{c.label}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Estado inicial *" error={errors.status}>
                            <select className={inputCls} value={data.status} onChange={(e) => set("status", e.target.value)}>
                                {statuses.map((s) => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                        <Field label="Precio salida (€) *" error={errors.starting_price}>
                            <input type="number" step="0.01" min="1" className={inputCls} value={data.starting_price} onChange={(e) => set("starting_price", e.target.value)} required />
                        </Field>
                        <Field label="Incremento mín. (€)" error={errors.min_increment}>
                            <input type="number" step="0.01" min="1" className={inputCls} value={data.min_increment} onChange={(e) => set("min_increment", e.target.value)} />
                        </Field>
                        <Field label="Precio reserva (€)" error={errors.reserve_price}>
                            <input type="number" step="0.01" min="0" className={inputCls} value={data.reserve_price} onChange={(e) => set("reserve_price", e.target.value)} />
                        </Field>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Inicio" error={errors.starts_at}>
                            <input type="datetime-local" className={inputCls} value={data.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
                        </Field>
                        <Field label="Cierre" error={errors.ends_at}>
                            <input type="datetime-local" className={inputCls} value={data.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
                        </Field>
                    </div>
                    <Field label="Imágenes" error={errors.images}>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-orange-500/20 file:px-3 file:py-2 file:text-orange-200"
                            onChange={(e) => set("images", Array.from(e.target.files || []))}
                        />
                    </Field>
                    <button
                        type="submit"
                        disabled={processing}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 py-3 text-sm font-bold text-slate-900 disabled:opacity-60"
                    >
                        {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Crear subasta
                    </button>
                </form>
            </div>
        </Layout1>
    );
}
