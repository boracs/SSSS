import React, { useState } from "react";
import { router } from "@inertiajs/react";
import AdminPageShell from "@/components/admin/ui/AdminPageShell";
import AdminCard from "@/components/admin/ui/AdminCard";
import AdminStatusBadge from "@/components/admin/ui/AdminStatusBadge";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminFormField from "@/components/admin/ui/AdminFormField";
import AdminToast from "@/components/admin/ui/AdminToast";

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
        <AdminPageShell
            headTitle="Planes taquillas"
            activeTab="taquillas"
            breadcrumbs={[
                { label: "Admin", href: route("Pag_principal") },
                { label: "Servicios", href: route("admin.catalog.index") },
                { label: "Taquillas" },
            ]}
            eyebrow="Admin · Taquillas"
            title="Planes taquillas"
            description="Planes de cuota que ven los socios. Crear, editar y activar/desactivar."
            toast={<AdminToast message={toast} onDismiss={() => setToast(null)} />}
        >
            <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 shadow-xl shadow-black/20 sm:p-5">
                <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-400">
                    Nuevo plan
                </h2>
                <form onSubmit={submitPlan} className="grid grid-cols-1 gap-3 md:grid-cols-5">
                    <AdminFormField
                        inputProps={{
                            value: form.nombre,
                            onChange: (e) => setForm((p) => ({ ...p, nombre: e.target.value })),
                            placeholder: "Nombre",
                            required: true,
                        }}
                    />
                    <AdminFormField
                        type="number"
                        inputProps={{
                            step: "0.01",
                            min: "0",
                            value: form.precio_total,
                            onChange: (e) =>
                                setForm((p) => ({ ...p, precio_total: e.target.value })),
                            placeholder: "Precio €",
                            required: true,
                        }}
                    />
                    <AdminFormField
                        type="number"
                        inputProps={{
                            min: "1",
                            max: "36",
                            value: form.duracion_meses,
                            onChange: (e) =>
                                setForm((p) => ({
                                    ...p,
                                    duracion_meses: Number(e.target.value),
                                })),
                            placeholder: "Meses",
                            required: true,
                        }}
                    />
                    <AdminFormField
                        type="checkbox"
                        label="Visible"
                        inputProps={{
                            checked: form.visible,
                            onChange: (e) => setForm((p) => ({ ...p, visible: e.target.checked })),
                        }}
                    />
                    <AdminButton type="submit" disabled={loading}>
                        {loading ? "Guardando…" : "Guardar plan"}
                    </AdminButton>
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
                            <AdminCard key={p.id} muted={!p.activo}>
                                <p className="text-lg font-bold text-white">{p.nombre}</p>
                                <p className="mt-1 text-sm text-slate-400">
                                    {Number(p.precio_total).toFixed(2)} €{" "}
                                    · {Math.round(Number(p.duracion_dias || 0) / 30)} meses
                                </p>
                                <div className="mt-4 flex items-center justify-between gap-2">
                                    <AdminStatusBadge variant={p.activo ? "success" : "neutral"}>
                                        {p.activo ? "Activo" : "Desactivado"}
                                    </AdminStatusBadge>
                                    <AdminButton
                                        variant={p.activo ? "danger" : "success"}
                                        className="px-3 py-1.5 text-xs"
                                        onClick={() => togglePlan(p)}
                                    >
                                        {p.activo ? "Desactivar" : "Activar"}
                                    </AdminButton>
                                </div>
                            </AdminCard>
                        ))}
                    </div>
                )}
            </section>
        </AdminPageShell>
    );
}
