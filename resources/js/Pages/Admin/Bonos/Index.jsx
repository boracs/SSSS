import { Head, router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function AdminBonosIndex({ packs = [], vipUsers = [] }) {
    const { flash } = usePage().props;
    const [form, setForm] = useState({
        nombre: "",
        num_clases: 5,
        precio: 0,
        activo: true,
    });
    const [assignForm, setAssignForm] = useState({ user_id: "", pack_id: "", admin_notes: "Asignación manual por admin" });

    const submit = (e) => {
        e.preventDefault();
        router.post(route("admin.bonos.store"), form);
    };

    const togglePack = (pack) => {
        router.patch(route("admin.bonos.toggle-active", pack.id));
    };

    const activePacks = useMemo(() => (packs || []).filter((p) => !!p.activo), [packs]);

    const assignManual = (e) => {
        e.preventDefault();
        router.post(route("admin.bonos.assign-manual"), assignForm, {
            onSuccess: () => setAssignForm({ user_id: "", pack_id: "", admin_notes: "Asignación manual por admin" }),
        });
    };

    const toast = flash?.success || flash?.error;

    return (
        <>
            <Head title="Admin · Bonos" />
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Packs Bono</h1>
                {toast ? (
                    <div className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                        {toast}
                    </div>
                ) : null}

                <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-4 grid gap-3 sm:grid-cols-4">
                    <input className="rounded-lg border border-slate-300 px-3 py-2" placeholder="Nombre" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
                    <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" min="1" value={form.num_clases} onChange={(e) => setForm((f) => ({ ...f, num_clases: Number(e.target.value) }))} />
                    <input className="rounded-lg border border-slate-300 px-3 py-2" type="number" step="0.01" min="0" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: Number(e.target.value) }))} />
                    <button className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700" type="submit">Crear Pack</button>
                </form>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-3 py-2 text-left">Nombre</th>
                                <th className="px-3 py-2 text-left">Clases</th>
                                <th className="px-3 py-2 text-left">Precio</th>
                                <th className="px-3 py-2 text-left">Activo</th>
                                <th className="px-3 py-2 text-left">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packs.map((pack) => (
                                <tr key={pack.id} className={`border-t border-slate-100 transition-all ${pack.activo ? "" : "bg-slate-50 text-slate-400 opacity-50"}`}>
                                    <td className="px-3 py-2">{pack.nombre}</td>
                                    <td className="px-3 py-2">{pack.num_clases}</td>
                                    <td className="px-3 py-2">{`${Number(pack.precio).toFixed(2)} €`}</td>
                                    <td className="px-3 py-2">{pack.activo ? "Sí" : "No"}</td>
                                    <td className="px-3 py-2">
                                        <button
                                            onClick={() => togglePack(pack)}
                                            className={`rounded-md px-3 py-1 text-white ${pack.activo ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                            type="button"
                                        >
                                            {pack.activo ? "Desactivar" : "Activar"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                    <h2 className="text-lg font-semibold text-slate-900">Asignar Bono Manual</h2>
                    <form onSubmit={assignManual} className="grid gap-3 sm:grid-cols-3">
                        <select
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            value={assignForm.user_id}
                            onChange={(e) => setAssignForm((f) => ({ ...f, user_id: e.target.value }))}
                            required
                        >
                            <option value="">Selecciona usuario VIP</option>
                            {vipUsers.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {`${u.nombre ?? ""} ${u.apellido ?? ""}`.trim()} - {u.email}
                                </option>
                            ))}
                        </select>
                        <select
                            className="rounded-lg border border-slate-300 px-3 py-2"
                            value={assignForm.pack_id}
                            onChange={(e) => setAssignForm((f) => ({ ...f, pack_id: e.target.value }))}
                            required
                        >
                            <option value="">Selecciona pack</option>
                            {activePacks.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.nombre} ({p.num_clases} clases)
                                </option>
                            ))}
                        </select>
                        <button className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700" type="submit">
                            Asignar y Confirmar
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}

