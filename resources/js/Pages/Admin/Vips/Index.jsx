import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { useCallback, useMemo, useState } from "react";

const partial = { preserveState: true, preserveScroll: true, only: ["vips", "counts", "filters"] };

function healthBadge(health) {
    if (health === "active") {
        return { label: "Activo", className: "bg-emerald-100 text-emerald-800 ring-emerald-600/20" };
    }
    if (health === "drifting") {
        return { label: "En riesgo", className: "bg-amber-100 text-amber-900 ring-amber-600/20" };
    }
    return { label: "Inactivo", className: "bg-rose-100 text-rose-800 ring-rose-700/20" };
}

export default function AdminVipsIndex({ vips = [], counts = {}, filters = {} }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || "");
    const [filterBusy, setFilterBusy] = useState(false);
    const [noteUserId, setNoteUserId] = useState(null);

    const visitFilters = useCallback((query) => {
        router.get(
            route("admin.vips.index"),
            {
                health: filters.health || "all",
                renewal_only: filters.renewal_only ? 1 : 0,
                search: filters.search || "",
                ...query,
            },
            {
                ...partial,
                onStart: () => setFilterBusy(true),
                onFinish: () => setFilterBusy(false),
            }
        );
    }, [filters.health, filters.renewal_only, filters.search]);

    const form = useForm({
        user_id: "",
        body: "",
        is_visible_to_student: true,
        reservation_type: "",
        reservation_id: "",
    });

    const openNote = (userId) => {
        setNoteUserId(userId);
        form.setData({
            user_id: String(userId),
            body: "",
            is_visible_to_student: true,
            reservation_type: "",
            reservation_id: "",
        });
    };

    const closeNote = () => {
        setNoteUserId(null);
        form.reset();
    };

    const submitNote = (e) => {
        e.preventDefault();
        form.post(route("admin.vips.attendance-notes.store"), {
            preserveScroll: true,
            only: ["vips", "counts", "filters", "flash"],
            onSuccess: () => closeNote(),
        });
    };

    const rows = useMemo(() => vips || [], [vips]);
    const toast = flash?.success || flash?.error;
    const healthFilter = filters.health || "all";
    const renewalOnly = !!filters.renewal_only;

    const emptyInactive =
        healthFilter === "inactive" && rows.length === 0;

    return (
        <>
            <Head title="Admin · CRM VIP Fidelización" />
            <div className="mx-auto max-w-7xl space-y-6 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">CRM VIP · Fidelización</h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Salud del alumno según última clase con pago confirmado, alertas de bono y notas de evolución.
                        </p>
                    </div>
                    <Link
                        href={route("admin.users.index")}
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        Lista usuarios (activar VIP)
                    </Link>
                </div>

                {toast ? (
                    <div
                        className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${
                            flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                        }`}
                    >
                        {toast}
                    </div>
                ) : null}

                <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-sky-50 to-indigo-50 p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-sky-900">Alertas de renovación</p>
                    <p className="mt-1 text-3xl font-extrabold text-sky-950">{counts.needsRenewal ?? 0}</p>
                    <p className="text-sm text-sky-800">VIP con bono confirmado y ≤ 3 clases restantes.</p>
                    <button
                        type="button"
                        disabled={filterBusy}
                        onClick={() => visitFilters({ renewal_only: renewalOnly ? 0 : 1 })}
                        className="mt-3 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
                    >
                        {renewalOnly ? "Quitar filtro renovación" : "Ver solo estos alumnos"}
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {[
                        { key: "all", label: "Todos" },
                        { key: "active", label: `Activos (${counts.health?.active ?? 0})` },
                        { key: "drifting", label: `En riesgo (${counts.health?.drifting ?? 0})` },
                        { key: "inactive", label: `Inactivos (${counts.health?.inactive ?? 0})` },
                    ].map((chip) => (
                        <button
                            key={chip.key}
                            type="button"
                            disabled={filterBusy}
                            onClick={() => visitFilters({ health: chip.key })}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                                healthFilter === chip.key
                                    ? "bg-slate-900 text-white ring-slate-900"
                                    : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                            } disabled:opacity-50`}
                        >
                            {chip.label}
                        </button>
                    ))}
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_auto]">
                    <input
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Buscar por nombre o email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                        type="button"
                        disabled={filterBusy}
                        onClick={() => visitFilters({ search })}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                        Buscar
                    </button>
                </div>

                {emptyInactive ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center text-lg font-semibold text-emerald-900">
                        ¡Felicidades! Todos tus alumnos están activos 🏄‍♂️
                    </div>
                ) : null}

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Alumno</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Salud</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Última clase (confirmada)</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Clases rest. (mín.)</th>
                                <th className="px-4 py-3 text-left font-semibold text-slate-700">Última nota</th>
                                <th className="px-4 py-3 text-right font-semibold text-slate-700">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {rows.map((row) => {
                                const hb = healthBadge(row.health);
                                return (
                                    <tr key={row.id} className="hover:bg-slate-50/80">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-slate-900">
                                                {`${row.nombre ?? ""} ${row.apellido ?? ""}`.trim() || "—"}
                                            </div>
                                            <div className="text-xs text-slate-500">{row.email}</div>
                                            {row.needs_renewal ? (
                                                <span className="mt-1 inline-flex rounded-md bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                                                    Renovar bono
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${hb.className}`}>
                                                {hb.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">
                                            {row.last_confirmed_reservation_at
                                                ? new Date(row.last_confirmed_reservation_at).toLocaleString()
                                                : "—"}
                                            {row.days_since_activity != null ? (
                                                <div className="text-xs text-slate-500">Hace {row.days_since_activity} días</div>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-slate-700">{row.min_remaining_classes ?? "—"}</td>
                                        <td className="max-w-xs px-4 py-3 text-slate-600">
                                            {row.latest_note ? (
                                                <>
                                                    <div className="line-clamp-2 whitespace-pre-wrap">{row.latest_note.body}</div>
                                                    <div className="mt-1 text-xs text-slate-400">
                                                        {row.latest_note.is_visible_to_student ? "Visible alumno" : "Solo interna"}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-slate-400">Sin notas</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <a
                                                    href={row.whatsapp_action_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                                                >
                                                    WhatsApp
                                                </a>
                                                <Link
                                                    href={`${route("admin.vips.analysis", row.id)}?from=vips&target_user_id=${row.id}`}
                                                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm ring-1 ring-sky-600/25 hover:bg-sky-600"
                                                    title="Modo análisis: calendario, wallet y feedback"
                                                >
                                                    <ChartBarIcon className="h-4 w-4 shrink-0 opacity-95" aria-hidden />
                                                    <span className="hidden min-[380px]:inline">🔍 Analizar Progreso</span>
                                                    <span className="min-[380px]:hidden">Analizar</span>
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => openNote(row.id)}
                                                    className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                                                >
                                                    Nota
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && !emptyInactive ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                                        No hay alumnos VIP para estos filtros.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>
            </div>

            {noteUserId ? (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
                    <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
                        <h2 className="text-lg font-bold text-slate-900">Nueva nota de evolución</h2>
                        <p className="mt-1 text-sm text-slate-600">Texto plano; se sanitiza en servidor contra XSS.</p>
                        <form className="mt-4 space-y-4" onSubmit={submitNote}>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nota</label>
                                <textarea
                                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                                    rows={4}
                                    value={form.data.body}
                                    onChange={(e) => form.setData("body", e.target.value)}
                                    required
                                />
                                {form.errors.body ? <p className="mt-1 text-xs text-rose-600">{form.errors.body}</p> : null}
                            </div>
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                                <input
                                    type="checkbox"
                                    checked={form.data.is_visible_to_student}
                                    onChange={(e) => form.setData("is_visible_to_student", e.target.checked)}
                                />
                                Visible para el alumno
                            </label>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeNote}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50"
                                >
                                    {form.processing ? "Guardando…" : "Guardar"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </>
    );
}
