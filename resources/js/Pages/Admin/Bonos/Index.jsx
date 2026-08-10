import { router, usePage } from "@inertiajs/react";
import { useState } from "react";
import AdminPageShell from "@/components/admin/ui/AdminPageShell";
import AdminCard from "@/components/admin/ui/AdminCard";
import AdminTable from "@/components/admin/ui/AdminTable";
import AdminStatusBadge from "@/components/admin/ui/AdminStatusBadge";
import AdminButton from "@/components/admin/ui/AdminButton";
import AdminFormField from "@/components/admin/ui/AdminFormField";
import AdminToast from "@/components/admin/ui/AdminToast";

export default function AdminBonosIndex({ packs = [] }) {
    const { flash } = usePage().props;
    const emptyForm = { nombre: "", num_clases: "", precio: "", activo: true };
    const [form, setForm] = useState(emptyForm);

    const submit = (e) => {
        e.preventDefault();
        router.post(
            route("admin.bonos.store"),
            {
                ...form,
                num_clases: Number(form.num_clases),
                precio: Number(form.precio),
            },
            {
                onSuccess: () => setForm(emptyForm),
            },
        );
    };

    const togglePack = (pack) => {
        router.patch(route("admin.bonos.toggle-active", pack.id));
    };

    const toast = flash?.success || flash?.error;

    return (
        <AdminPageShell
            headTitle="Admin · Bonos"
            activeTab="bonos"
            breadcrumbs={[
                { label: "Admin", href: route("Pag_principal") },
                { label: "Servicios", href: route("admin.catalog.index") },
                { label: "Bonos VIP" },
            ]}
            eyebrow="Admin · Bonos VIP"
            title="Gestión de Packs Bono"
            description="Packs de clases que ven los socios VIP. La asignación a un socio se hace siempre desde Pagos → datáfono (cobro → asignar)."
            toast={<AdminToast message={toast} variant={flash?.success ? "success" : "error"} />}
        >
            <AdminCard>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                    Nuevo pack
                </h2>
                <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
                    <AdminFormField
                        inputProps={{
                            required: true,
                            placeholder: "Nombre del pack",
                            value: form.nombre,
                            onChange: (e) => setForm((f) => ({ ...f, nombre: e.target.value })),
                        }}
                    />
                    <AdminFormField
                        type="number"
                        inputProps={{
                            required: true,
                            min: "1",
                            placeholder: "Cantidad de clases",
                            value: form.num_clases,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, num_clases: e.target.value })),
                        }}
                    />
                    <AdminFormField
                        type="number"
                        inputProps={{
                            required: true,
                            step: "0.01",
                            min: "0",
                            placeholder: "Precio (€)",
                            value: form.precio,
                            onChange: (e) =>
                                setForm((f) => ({ ...f, precio: e.target.value })),
                        }}
                    />
                    <AdminButton type="submit">Crear Pack</AdminButton>
                </form>
            </AdminCard>

            <AdminTable
                columns={[
                    { key: "nombre", label: "Nombre" },
                    { key: "num_clases", label: "Clases" },
                    { key: "precio", label: "Precio" },
                    { key: "activo", label: "Activo" },
                    { key: "acciones", label: "Acciones", align: "right" },
                ]}
                rows={packs}
                emptyMessage="Aún no hay packs de bono creados."
                renderCell={(pack, col) => {
                    if (col.key === "precio") return `${Number(pack.precio).toFixed(2)} €`;
                    if (col.key === "activo") {
                        return (
                            <AdminStatusBadge variant={pack.activo ? "success" : "neutral"}>
                                {pack.activo ? "Activo" : "Inactivo"}
                            </AdminStatusBadge>
                        );
                    }
                    if (col.key === "acciones") {
                        return (
                            <AdminButton
                                variant={pack.activo ? "danger" : "success"}
                                className="px-3 py-1.5 text-xs"
                                onClick={() => togglePack(pack)}
                            >
                                {pack.activo ? "Desactivar" : "Activar"}
                            </AdminButton>
                        );
                    }
                    return pack[col.key];
                }}
            />
        </AdminPageShell>
    );
}
