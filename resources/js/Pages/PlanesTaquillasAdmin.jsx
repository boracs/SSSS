import React, { useMemo, useState } from "react";
import { Head, router, Link } from "@inertiajs/react";
import Layout1 from "@/layouts/Layout1";
import { FaWhatsapp } from "react-icons/fa";
import {
    useFloating,
    offset,
    flip,
    shift,
    useHover,
    useDismiss,
    useRole,
    useInteractions,
    useFocus,
    autoUpdate,
} from "@floating-ui/react";

function fmtDate(v) {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("es-ES");
}

function buildWaLink(user) {
    const phoneRaw = String(user?.telefono || "").replace(/\D/g, "");
    if (!phoneRaw) return null;
    const phone = phoneRaw.startsWith("34") ? phoneRaw : `34${phoneRaw}`;
    const due = user?.fecha_fin ? fmtDate(user.fecha_fin) : "sin fecha";
    const msg = user?.estado === "vencido"
        ? `Hola ${user.nombre} ${user.apellido}, tu taquilla en la escuela ha vencido el ${due}. ¿Quieres renovarla?`
        : "Hola, hemos recibido tu comprobante, lo validamos ahora mismo.";
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function ExtraDaysBadge({ days }) {
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "top",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });
    const hover = useHover(context);
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "tooltip" });
    const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

    if (!days || days <= 0) return null;

    return (
        <>
            <button
                ref={refs.setReference}
                type="button"
                className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-100 px-1.5 text-[11px] font-bold text-sky-700"
                {...getReferenceProps()}
            >
                +{days}
            </button>
            {open ? (
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="z-50 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl"
                    {...getFloatingProps()}
                >
                    {days} dias precomprados acumulados
                </div>
            ) : null}
        </>
    );
}

function InactivePlanWarningTooltip() {
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "top",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });
    const hover = useHover(context);
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "tooltip" });
    const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

    return (
        <>
            <button
                ref={refs.setReference}
                type="button"
                className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700"
                {...getReferenceProps()}
            >
                ⚠
            </button>
            {open ? (
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="z-50 max-w-xs rounded-lg bg-slate-900 px-2.5 py-2 text-xs font-medium text-white shadow-xl"
                    {...getFloatingProps()}
                >
                    Este usuario esta usando un plan que ha sido desactivado. En la proxima renovacion debera cambiar a un plan vigente.
                </div>
            ) : null}
        </>
    );
}

function paymentStatusPill(status) {
    if (status === "confirmed") return "bg-emerald-100 text-emerald-700";
    if (status === "submitted") return "bg-sky-100 text-sky-700";
    return "bg-amber-100 text-amber-700";
}

function paymentStatusLabel(status) {
    if (status === "confirmed") return "Confirmado";
    if (status === "submitted") return "En revision";
    return "Pendiente";
}

export default function PlanesTaquillasAdmin({ planes = [], usuarios = [], flash = {} }) {
    const [form, setForm] = useState({ nombre: "", precio_total: "", duracion_meses: 1, visible: true });
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState(flash?.success || flash?.error || null);
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [historyByUser, setHistoryByUser] = useState({});
    const [loadingHistoryUserId, setLoadingHistoryUserId] = useState(null);
    const [proofModalUrl, setProofModalUrl] = useState(null);

    const users = useMemo(() => (usuarios || []).map((u) => {
        const duracion = Number(u?.plan_vigente?.duracion_dias || 0);
        const restantes = Number(u?.dias_restantes ?? 0);
        const pct = duracion > 0 ? Math.max(0, Math.min(100, Math.round(((duracion - Math.max(restantes, 0)) * 100) / duracion))) : 0;
        let bar = "bg-emerald-500";
        if (restantes < 0) bar = "bg-rose-500";
        else if (restantes <= 7) bar = "bg-orange-500";
        return { ...u, pct, bar };
    }), [usuarios]);

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
        router.patch(route("taquilla.planes.toggle-active", plan.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setToast(`Plan ${plan.nombre} ${plan.activo ? "desactivado" : "activado"} correctamente.`);
                router.reload({ only: ["planes", "usuarios", "flash"], preserveScroll: true });
                setTimeout(() => setToast(null), 2200);
            },
            onError: () => {
                setToast("No se pudo actualizar el estado del plan.");
                setTimeout(() => setToast(null), 2200);
            },
        });
    };

    const openUserHistory = async (userId) => {
        if (!userId) return;
        if (expandedUserId === userId) {
            setExpandedUserId(null);
            return;
        }
        setExpandedUserId(userId);
        if (historyByUser[userId]) return;

        setLoadingHistoryUserId(userId);
        try {
            const url = route("taquilla.users.payments", userId);
            const res = window?.axios?.get ? await window.axios.get(url) : await fetch(url).then((r) => r.json());
            const rows = res?.data?.rows ?? res?.rows ?? [];
            setHistoryByUser((prev) => ({ ...prev, [userId]: rows }));
        } catch (e) {
            setToast("No se pudo cargar el historial de pagos.");
            setTimeout(() => setToast(null), 2500);
        } finally {
            setLoadingHistoryUserId(null);
        }
    };

    return (
        <Layout1>
            <Head title="Admin · Taquillas 360" />
            <div className="mx-auto max-w-7xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Panel Taquillas · Control 360°</h1>
                    <Link href={route("taquilla.pagos.queue")} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Pagos por Verificar</Link>
                </div>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Gestor de Planes</h2>
                    <form onSubmit={submitPlan} className="grid grid-cols-1 gap-3 md:grid-cols-5">
                        <input value={form.nombre} onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Nombre" className="rounded-lg border border-slate-300 px-3 py-2" required />
                        <input type="number" step="0.01" min="0" value={form.precio_total} onChange={(e) => setForm((p) => ({ ...p, precio_total: e.target.value }))} placeholder="Precio €" className="rounded-lg border border-slate-300 px-3 py-2" required />
                        <input type="number" min="1" max="36" value={form.duracion_meses} onChange={(e) => setForm((p) => ({ ...p, duracion_meses: Number(e.target.value) }))} placeholder="Meses" className="rounded-lg border border-slate-300 px-3 py-2" required />
                        <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                            <input type="checkbox" checked={form.visible} onChange={(e) => setForm((p) => ({ ...p, visible: e.target.checked }))} />
                            Visible
                        </label>
                        <button type="submit" disabled={loading} className="rounded-lg bg-sky-600 px-3 py-2 font-semibold text-white disabled:opacity-60">
                            {loading ? "Guardando..." : "Guardar plan"}
                        </button>
                    </form>
                    <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                        {planes.map((p) => (
                            <div key={p.id} className={`rounded-xl border p-3 transition-all ${p.activo ? "border-slate-200 bg-white" : "border-slate-300 bg-slate-50 opacity-70 grayscale-[0.35]"}`}>
                                <p className="font-semibold text-slate-900">{p.nombre}</p>
                                <p className="text-sm text-slate-600">{Number(p.precio_total).toFixed(2)} € · {Math.round(Number(p.duracion_dias || 0) / 30)} meses</p>
                                <div className="mt-2 flex items-center justify-between">
                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${p.activo ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>{p.activo ? "Activo" : "Desactivado"}</span>
                                    <button
                                        type="button"
                                        onClick={() => togglePlan(p)}
                                        className={`rounded-lg px-3 py-1 text-xs font-semibold text-white ${p.activo ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                    >
                                        {p.activo ? "Desactivar" : "Activar"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Usuarios y vigencia</h2>
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-3 py-2 text-left">Usuario</th>
                                    <th className="px-3 py-2 text-left">Taquilla</th>
                                    <th className="px-3 py-2 text-left">Plan</th>
                                    <th className="px-3 py-2 text-left">Último pago</th>
                                    <th className="px-3 py-2 text-left">Vence</th>
                                    <th className="px-3 py-2 text-left">Progreso</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const isOpen = expandedUserId === u.id;
                                    const historyRows = historyByUser[u.id] || [];
                                    const isLoading = loadingHistoryUserId === u.id;
                                    const waUrl = buildWaLink(u);
                                    return (
                                        <React.Fragment key={u.id}>
                                            <tr
                                                className="cursor-pointer border-t border-slate-100 hover:bg-slate-50"
                                                onClick={() => openUserHistory(u.id)}
                                            >
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {waUrl ? (
                                                            <a
                                                                href={waUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                                aria-label="Abrir WhatsApp"
                                                                title="Abrir WhatsApp"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <FaWhatsapp className="h-4 w-4 text-[#25D366]" />
                                                            </a>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                                                                sin telefono
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openUserHistory(u.id);
                                                            }}
                                                            className="font-semibold text-slate-900 underline decoration-dotted"
                                                        >
                                                            {u.nombre} {u.apellido}
                                                        </button>
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-500">{u.email || "sin email"}</p>
                                                </td>
                                                <td className="px-3 py-2">{u.numeroTaquilla ?? "-"}</td>
                                                <td className="px-3 py-2">
                                                    <div className="inline-flex items-center">
                                                        <span>{u.plan_vigente?.nombre || "-"}</span>
                                                        {u.plan_vigente && u.plan_vigente.activo === false ? <InactivePlanWarningTooltip /> : null}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">{fmtDate(u.ultimo_pago)}</td>
                                                <td className="px-3 py-2">
                                                    <div className="inline-flex items-center">
                                                        <span>{fmtDate(u.fecha_fin)}</span>
                                                        <ExtraDaysBadge days={Number(u.prepaid_extra_days || 0)} />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="h-2 w-48 rounded-full bg-slate-200">
                                                        <div className={`h-2 rounded-full ${u.bar}`} style={{ width: `${u.pct}%` }} />
                                                    </div>
                                                    <p className="mt-1 text-xs text-slate-500">{u.dias_restantes > 0 ? `${u.dias_restantes} dias restantes` : u.dias_restantes === 0 ? "Vence hoy" : "Vencido"}</p>
                                                </td>
                                            </tr>

                                            {isOpen ? (
                                                <tr className="bg-slate-50/80">
                                                    <td colSpan={6} className="px-4 py-3">
                                                        {isLoading ? (
                                                            <div className="py-4 text-sm text-slate-500">Cargando historial de pagos...</div>
                                                        ) : historyRows.length === 0 ? (
                                                            <div className="py-4 text-sm text-slate-500">Sin pagos registrados para este usuario.</div>
                                                        ) : (
                                                            <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
                                                                <table className="min-w-full text-xs sm:text-sm">
                                                                    <thead className="bg-slate-100 text-slate-700">
                                                                        <tr>
                                                                            <th className="px-3 py-2 text-left">Plan</th>
                                                                            <th className="px-3 py-2 text-left">Periodo</th>
                                                                            <th className="px-3 py-2 text-left">Estado</th>
                                                                            <th className="px-3 py-2 text-right">Ver comprobante</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {historyRows.map((row) => (
                                                                            <tr key={row.id} className="border-t border-slate-100">
                                                                                <td className="px-3 py-2">{row.plan}</td>
                                                                                <td className="px-3 py-2">{fmtDate(row.periodo_inicio)} - {fmtDate(row.periodo_fin)}</td>
                                                                                <td className="px-3 py-2">
                                                                                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusPill(row.status)}`}>
                                                                                        {paymentStatusLabel(row.status)}
                                                                                    </span>
                                                                                </td>
                                                                                <td className="px-3 py-2 text-right">
                                                                                    {row.proof_url ? (
                                                                                        <button
                                                                                            type="button"
                                                                                            className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                                                            onClick={() => setProofModalUrl(row.proof_url)}
                                                                                        >
                                                                                            Ver
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span className="text-xs text-slate-400">-</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {proofModalUrl ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setProofModalUrl(null)}>
                    <div className="w-full max-w-5xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex justify-end">
                            <button type="button" className="rounded-md bg-slate-200 px-3 py-1 text-slate-700" onClick={() => setProofModalUrl(null)}>Cerrar</button>
                        </div>
                        <iframe title="Comprobante de pago" src={proofModalUrl} className="h-[75vh] w-full rounded-lg" />
                    </div>
                </div>
            ) : null}

            {toast ? (
                <div className="fixed right-4 top-24 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
                    {toast}
                </div>
            ) : null}
        </Layout1>
    );
}
