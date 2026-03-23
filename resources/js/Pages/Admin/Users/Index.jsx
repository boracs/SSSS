import { Head, router, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

export default function AdminUsersIndex({ users = [], filters = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || "");
    const [vip, setVip] = useState(filters.vip || "all");

    const applyFilters = () => {
        router.get(route("admin.users.index"), { search, vip }, { preserveState: true, preserveScroll: true });
    };

    const toggleVip = (id) => {
        router.patch(route("admin.users.toggle-vip", id), {}, { preserveScroll: true });
    };

    const toast = flash?.success || flash?.error;

    const rows = useMemo(() => users, [users]);

    return (
        <>
            <Head title="Admin · Usuarios" />
            <div className="mx-auto max-w-6xl p-6 space-y-6">
                <h1 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h1>

                {toast ? (
                    <div className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                        {toast}
                    </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-white p-4 grid gap-3 sm:grid-cols-4">
                    <input
                        className="rounded-lg border border-slate-300 px-3 py-2 sm:col-span-2"
                        placeholder="Buscar por nombre o email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <select className="rounded-lg border border-slate-300 px-3 py-2" value={vip} onChange={(e) => setVip(e.target.value)}>
                        <option value="all">Todos</option>
                        <option value="vip">Solo VIP</option>
                        <option value="non_vip">Solo No VIP</option>
                    </select>
                    <button type="button" onClick={applyFilters} className="rounded-lg bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
                        Filtrar
                    </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700">
                            <tr>
                                <th className="px-3 py-2 text-left">Usuario</th>
                                <th className="px-3 py-2 text-left">Email</th>
                                <th className="px-3 py-2 text-left">Rol</th>
                                <th className="px-3 py-2 text-left">VIP</th>
                                <th className="px-3 py-2 text-left">Acción</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((u) => (
                                <tr key={u.id} className="border-t border-slate-100">
                                    <td className="px-3 py-2">{`${u.nombre ?? ""} ${u.apellido ?? ""}`.trim() || "—"}</td>
                                    <td className="px-3 py-2">{u.email}</td>
                                    <td className="px-3 py-2 uppercase">{u.role ?? "user"}</td>
                                    <td className="px-3 py-2">
                                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${u.is_vip ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                                            {u.is_vip ? "VIP" : "No VIP"}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <button
                                            type="button"
                                            onClick={() => toggleVip(u.id)}
                                            className={`rounded-md px-3 py-1 text-white ${u.is_vip ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                        >
                                            {u.is_vip ? "Desactivar VIP" : "Activar VIP"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No hay usuarios para los filtros seleccionados.</td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

