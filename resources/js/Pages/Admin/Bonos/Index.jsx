import { Head, router, usePage } from "@inertiajs/react";
import { useState } from "react";

export default function AdminBonosIndex({ packs = [], vipUsers = [] }) {
    const { flash } = usePage().props;
    const [form, setForm] = useState({
        nombre: "",
        num_clases: 5,
        precio: 0,
        activo: true,
    });
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ nombre: "", num_clases: 0, precio: 0, activo: true });
    const [assignForm, setAssignForm] = useState({ user_id: "", pack_id: "", admin_notes: "Asignación manual por admin" });

    const submit = (e) => {
        e.preventDefault();
        router.post(route("admin.bonos.store"), form);
    };

    const updatePack = (pack, patch) => {
        router.put(route("admin.bonos.update", pack.id), { ...pack, ...patch });
    };

    const startEdit = (pack) => {
        setEditingId(pack.id);
        setEditForm({
            nombre: pack.nombre ?? "",
            num_clases: Number(pack.num_clases ?? 0),
            precio: Number(pack.precio ?? 0),
            activo: !!pack.activo,
        });
    };

    const saveEdit = (packId) => {
        router.put(route("admin.bonos.update", packId), editForm, {
            onSuccess: () => setEditingId(null),
        });
    };

    const removePack = (pack) => {
        if (!confirm(`Eliminar pack "${pack.nombre}"?`)) return;
        router.delete(route("admin.bonos.destroy", pack.id));
    };

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
                                <tr key={pack.id} className="border-t border-slate-100">
                                    <td className="px-3 py-2">
                                        {editingId === pack.id ? (
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" value={editForm.nombre} onChange={(e) => setEditForm((f) => ({ ...f, nombre: e.target.value }))} />
                                        ) : pack.nombre}
                                    </td>
                                    <td className="px-3 py-2">
                                        {editingId === pack.id ? (
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" type="number" min="1" value={editForm.num_clases} onChange={(e) => setEditForm((f) => ({ ...f, num_clases: Number(e.target.value) }))} />
                                        ) : pack.num_clases}
                                    </td>
                                    <td className="px-3 py-2">
                                        {editingId === pack.id ? (
                                            <input className="w-full rounded border border-slate-300 px-2 py-1" type="number" step="0.01" min="0" value={editForm.precio} onChange={(e) => setEditForm((f) => ({ ...f, precio: Number(e.target.value) }))} />
                                        ) : `${Number(pack.precio).toFixed(2)} €`}
                                    </td>
                                    <td className="px-3 py-2">
                                        {editingId === pack.id ? (
                                            <label className="inline-flex items-center gap-2">
                                                <input type="checkbox" checked={editForm.activo} onChange={(e) => setEditForm((f) => ({ ...f, activo: e.target.checked }))} />
                                                <span>{editForm.activo ? "Sí" : "No"}</span>
                                            </label>
                                        ) : (pack.activo ? "Sí" : "No")}
                                    </td>
                                    <td className="px-3 py-2 flex gap-2">
                                        {editingId === pack.id ? (
                                            <>
                                                <button onClick={() => saveEdit(pack.id)} className="rounded-md bg-emerald-600 px-3 py-1 text-white" type="button">Guardar</button>
                                                <button onClick={() => setEditingId(null)} className="rounded-md bg-slate-200 px-3 py-1 text-slate-700" type="button">Cancelar</button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => updatePack(pack, { activo: !pack.activo })}
                                                    className="rounded-md bg-amber-500 px-3 py-1 text-white"
                                                    type="button"
                                                >
                                                    {pack.activo ? "Desactivar" : "Activar"}
                                                </button>
                                                <button onClick={() => startEdit(pack)} className="rounded-md bg-sky-600 px-3 py-1 text-white" type="button">Editar</button>
                                            </>
                                        )}
                                        <button onClick={() => removePack(pack)} className="rounded-md bg-rose-600 px-3 py-1 text-white" type="button">Eliminar</button>
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
                            {packs.map((p) => (
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

