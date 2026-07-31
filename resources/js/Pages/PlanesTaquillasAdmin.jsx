import React, { useState } from "react";
import { Head, router } from "@inertiajs/react";
import Layout1 from "@/layouts/Layout1";
import Breadcrumbs from "@/components/Breadcrumbs";

const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";

export default function PlanesTaquillasAdmin({ planes = [], flash = {} }) {
    const [form, setForm] = useState({
        nombre: "",
        precio_total: "",
        duracion_meses: 1,
        visible: true,
    });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(flash?.success || flash?.error || null);

    const submitPlan = (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        router.post(route("taquilla.planes.store"), form, {
            preserveScroll: true,
            onSuccess: () => {
                setToast("Plan guardado correctamente.");
                setForm({ nombre: "", precio_total: "", duracion_meses: 1, visible: true });
                setTimeout(() => setToast(null), 2500);
            },
            onFinish: () => setLoading(false),
        });
    };

    const togglePlan = (plan) => {
        router.patch(
            route("taquilla.planes.toggle-active", plan.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setToast(`Plan ${plan.nombre} ${plan.activo ? "desactivado" : "activado"} correctamente.`);
                    router.reload({ only: ["planes", "flash"], preserveScroll: true });
                    setTimeout(() => setToast(null), 2200);
                },
                onError: () => {
                    setToast("No se pudo actualizar el estado del plan.");
                    setTimeout(() => setToast(null), 2200);
                },
            },
        );
    };

    return (
        <Layout1>
            <Head title="Taquillas · Planes" />
            <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-orange-500/10 blur-[90px]" />
                </div>

                <div className="relative mx-auto max-w-7xl space-y-6">
                    <header>
                        <Breadcrumbs
                            items={[
                                { label: "Admin", href: route("Pag_principal") },
                                { label: "Taquillas" },
                                { label: "Planes" },
                            ]}
                            variant="dark"
                            className="mb-3 hidden sm:flex"
                        />
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                            Admin · Taquillas
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Planes de Taquillas
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                            Crea, activa o desactiva los planes de cuota que ven los socios.
                        </p>
                    </header>

                    <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/20 sm:p-5">
                        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
                            Nuevo plan
                        </h2>
                        <form
                            onSubmit={submitPlan}
                            className="grid grid-cols-1 gap-3 md:grid-cols-5"
                        >
                            <input
                                value={form.nombre}
                                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                                placeholder="Nombre"
                                className={inputClass}
                                required
                            />
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.precio_total}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, precio_total: e.target.value }))
                                }
                                placeholder="Precio €"
                                className={inputClass}
                                required
                            />
                            <input
                                type="number"
                                min="1"
                                max="36"
                                value={form.duracion_meses}
                                onChange={(e) =>
                                    setForm((p) => ({
                                        ...p,
                                        duracion_meses: Number(e.target.value),
                                    }))
                                }
                                placeholder="Meses"
                                className={inputClass}
                                required
                            />
                            <label className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-slate-200">
                                <input
                                    type="checkbox"
                                    checked={form.visible}
                                    onChange={(e) =>
                                        setForm((p) => ({ ...p, visible: e.target.checked }))
                                    }
                                    className="h-4 w-4 rounded border-slate-500 bg-slate-900 text-cyan-500 accent-cyan-500 focus:ring-2 focus:ring-cyan-500/40"
                                />
                                <span className="text-sm font-semibold">Visible</span>
                            </label>
                            <button
                                type="submit"
                                disabled={loading}
                                className="rounded-xl bg-cyan-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:opacity-60"
                            >
                                {loading ? "Guardando…" : "Guardar plan"}
                            </button>
                        </form>
                    </section>

                    <section>
                        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                            Planes configurados
                        </h2>
                        {planes.length === 0 ? (
                            <p className="rounded-2xl border border-white/10 bg-slate-900/50 px-4 py-8 text-center text-sm text-slate-400">
                                Aún no hay planes. Crea el primero arriba.
                            </p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {planes.map((p) => (
                                    <article
                                        key={p.id}
                                        className={`rounded-2xl border p-4 transition ${
                                            p.activo
                                                ? "border-white/10 bg-slate-900/70"
                                                : "border-white/5 bg-slate-900/40 opacity-70"
                                        }`}
                                    >
                                        <p className="text-lg font-bold text-white">{p.nombre}</p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            {Number(p.precio_total).toFixed(2)} € ·{" "}
                                            {Math.round(Number(p.duracion_dias || 0) / 30)} meses
                                        </p>
                                        <div className="mt-4 flex items-center justify-between gap-2">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                                                    p.activo
                                                        ? "bg-emerald-900/35 text-emerald-100 ring-emerald-600/30"
                                                        : "bg-slate-800 text-slate-300 ring-slate-600/40"
                                                }`}
                                            >
                                                {p.activo ? "Activo" : "Desactivado"}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => togglePlan(p)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition ${
                                                    p.activo
                                                        ? "bg-rose-600 hover:bg-rose-500"
                                                        : "bg-emerald-600 hover:bg-emerald-500"
                                                }`}
                                            >
                                                {p.activo ? "Desactivar" : "Activar"}
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {toast ? (
                <div className="fixed right-4 top-24 z-50 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10">
                    {toast}
                </div>
            ) : null}
        </Layout1>
    );
}
