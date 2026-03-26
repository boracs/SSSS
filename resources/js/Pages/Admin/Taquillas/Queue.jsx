import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";

function fmtDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleDateString("es-ES");
}

function shortPlanName(plan) {
    const raw = String(plan || "").toLowerCase();
    if (raw.includes("anual") || raw.includes("365")) return "1 año";
    if (raw.includes("semestral") || raw.includes("180")) return "6 meses";
    if (raw.includes("trimestral") || raw.includes("90")) return "3 meses";
    if (raw.includes("bimestral") || raw.includes("60")) return "2 meses";
    if (raw.includes("mensual") || raw.includes("30")) return "1 mes";
    return plan || "—";
}

function statusUi(row) {
    if (row.status === "confirmed") {
        return { label: "Confirmado", cls: "bg-emerald-100 text-emerald-700" };
    }
    if (row.status === "submitted") {
        return { label: "En revisión", cls: "bg-sky-100 text-sky-700 animate-pulse" };
    }
    return { label: "Pendiente", cls: "bg-amber-100 text-amber-700" };
}

function ModalShell({ open, onClose, children, maxWidth = "max-w-lg" }) {
    return (
        <AnimatePresence>
            {open ? (
                <motion.div
                    key="overlay"
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4"
                    onClick={onClose}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className={`w-full ${maxWidth} rounded-2xl bg-white p-5 shadow-2xl`}
                        onClick={(e) => e.stopPropagation()}
                        initial={{ opacity: 0, y: 12, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            ) : null}
        </AnimatePresence>
    );
}

export default function Queue({ pagos }) {
    const [search, setSearch] = useState(pagos?.filters?.search || "");
    const [status, setStatus] = useState(pagos?.filters?.status || "all");
    const [pendingReview, setPendingReview] = useState(!!pagos?.filters?.pending_review);
    const [proofModal, setProofModal] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [rejecting, setRejecting] = useState(null); // { id, notes }
    const [tableLoading, setTableLoading] = useState(false);
    const [approving, setApproving] = useState(null); // { row, locker_number }
    const [reassigning, setReassigning] = useState(null); // { user_id, name, locker_number }
    const [approveConfirming, setApproveConfirming] = useState(null); // row
    const [toast, setToast] = useState(null);

    const rows = pagos?.rows || [];
    const counts = pagos?.counts || {};

    const applyFilters = (next = {}) => {
        const q = {
            status: next.status ?? status,
            search: next.search ?? search,
            pending_review: (next.pendingReview ?? pendingReview) ? 1 : 0,
        };
        setTableLoading(true);
        router.get(route("taquilla.pagos.queue"), q, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ["pagos"],
            onFinish: () => setTableLoading(false),
        });
    };

    const doApprove = (id, lockerNumber = null) => {
        setProcessingId(`approve-${id}`);
        router.post(route("taquilla.pagos.confirm", id), { locker_number: lockerNumber || null }, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
            onSuccess: () => {
                setToast({ type: "success", message: "Pago aprobado correctamente." });
                setTimeout(() => setToast(null), 2200);
                router.reload({ only: ["pagos"], preserveScroll: true, preserveState: true });
            },
            onError: () => {
                setToast({ type: "error", message: "No se pudo aprobar el pago." });
                setTimeout(() => setToast(null), 2200);
            },
        });
    };

    const doReject = () => {
        if (!rejecting?.id) return;
        setProcessingId(`reject-${rejecting.id}`);
        router.post(route("taquilla.pagos.reject", rejecting.id), { admin_notes: rejecting.notes || null }, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
            onSuccess: () => {
                setRejecting(null);
                setToast({ type: "success", message: "Pago rechazado correctamente." });
                setTimeout(() => setToast(null), 2200);
                router.reload({ only: ["pagos"], preserveScroll: true, preserveState: true });
            },
            onError: () => {
                setToast({ type: "error", message: "No se pudo rechazar el pago." });
                setTimeout(() => setToast(null), 2200);
            },
        });
    };

    const statusOptions = useMemo(() => ([
        { id: "all", label: `Todos (${counts.all || 0})` },
        { id: "pending", label: `Pendientes (${counts.pending || 0})` },
        { id: "submitted", label: `En revisión (${counts.submitted || 0})` },
        { id: "confirmed", label: `Confirmados (${counts.confirmed || 0})` },
    ]), [counts]);

    const lockerOccupiedSet = useMemo(() => new Set((pagos?.lockerGrid?.occupied || []).map(Number)), [pagos?.lockerGrid]);
    const lockerMax = Number(pagos?.lockerGrid?.max || 60);
    const lockerCells = useMemo(() => Array.from({ length: lockerMax }, (_, i) => i + 1), [lockerMax]);

    const userStatusBadge = (u) => {
        if (u?.plan_status === "up_to_date") return "bg-emerald-100 text-emerald-700";
        if (u?.plan_status === "outdated") return "bg-amber-100 text-amber-700";
        return "bg-rose-100 text-rose-700";
    };

    const openApproveFlow = (row) => {
        if (row?.numeroTaquilla) {
            setApproveConfirming(row);
            return;
        }
        setApproving({ row, locker_number: null });
    };

    const saveReassign = () => {
        if (!reassigning?.user_id || !reassigning?.locker_number) return;
        setProcessingId(`reassign-${reassigning.user_id}`);
        router.post(route("taquilla.users.reassign", reassigning.user_id), { locker_number: reassigning.locker_number }, {
            preserveScroll: true,
            onSuccess: () => {
                setReassigning(null);
                setToast({ type: "success", message: "Taquilla reasignada correctamente." });
                setTimeout(() => setToast(null), 2200);
                router.reload({ only: ["pagos"], preserveState: true, preserveScroll: true });
            },
            onError: () => {
                setToast({ type: "error", message: "No se pudo reasignar la taquilla." });
                setTimeout(() => setToast(null), 2200);
            },
            onFinish: () => setProcessingId(null),
        });
    };

    return (
        <>
            <Head title="Taquillas · Cola de Pagos" />
            <div className="mx-auto max-w-7xl p-6 space-y-4">
                <h1 className="text-2xl font-bold text-slate-900">Pagos por Verificar · Taquillas</h1>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyFilters({ search: e.currentTarget.value })}
                        placeholder="Buscar por nombre o email..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-80"
                    />
                    <button type="button" onClick={() => applyFilters()} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Buscar</button>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <input
                            type="checkbox"
                            checked={pendingReview}
                            onChange={(e) => {
                                setPendingReview(e.target.checked);
                                applyFilters({ pendingReview: e.target.checked });
                            }}
                        />
                        Solo Pendientes de Revisar
                    </label>
                </div>

                <div className="flex flex-wrap gap-2">
                    {statusOptions.map((s) => (
                        <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                                setStatus(s.id);
                                applyFilters({ status: s.id });
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${status === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="max-h-[70vh] overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50/95 text-slate-700 backdrop-blur">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Usuario</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Taquilla</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Plan</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Fechas</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Estado</th>
                                    <th className="px-3 py-2 text-right text-xs uppercase tracking-wide">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`skeleton-${i}`} className="border-t border-slate-100 animate-pulse">
                                            <td className="px-3 py-3"><div className="h-3 w-32 rounded bg-slate-200" /></td>
                                            <td className="px-3 py-3"><div className="h-3 w-14 rounded bg-slate-200" /></td>
                                            <td className="px-3 py-3"><div className="h-3 w-24 rounded bg-slate-200" /></td>
                                            <td className="px-3 py-3"><div className="h-3 w-28 rounded bg-slate-200" /></td>
                                            <td className="px-3 py-3"><div className="h-6 w-28 rounded-full bg-slate-200" /></td>
                                            <td className="px-3 py-3"><div className="ml-auto h-8 w-44 rounded bg-slate-200" /></td>
                                        </tr>
                                    ))
                                ) : rows.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Sin registros para estos filtros.</td></tr>
                                ) : rows.map((row) => {
                                    const badge = statusUi(row);
                                    return (
                                        <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                                            <td className="px-3 py-2.5">
                                                <p className="font-semibold text-slate-900">{row.user || "—"}</p>
                                                <p className="text-xs text-slate-500">{row.email || "sin email"}</p>
                                            </td>
                                            <td className="px-3 py-2.5">{row.numeroTaquilla ?? "—"}</td>
                                            <td className="px-3 py-2.5 font-medium text-slate-700">{shortPlanName(row.plan)}</td>
                                            <td className="px-3 py-2.5">
                                                <p>{fmtDate(row.periodo_inicio)} - {fmtDate(row.periodo_fin)}</p>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex justify-end gap-2">
                                                    {row.proof_url ? (
                                                        <button type="button" onClick={() => setProofModal(row.proof_url)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                                                            Ver comprobante
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        disabled={processingId === `approve-${row.id}`}
                                                        onClick={() => openApproveFlow(row)}
                                                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm disabled:opacity-60"
                                                    >
                                                        {processingId === `approve-${row.id}` ? "..." : "Aprobar"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRejecting({ id: row.id, notes: "" })}
                                                        className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white shadow-sm"
                                                    >
                                                        Rechazar
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">Usuarios con Taquilla</h2>
                    <div className="overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-3 py-2 text-left">Usuario</th>
                                    <th className="px-3 py-2 text-left">Taquilla</th>
                                    <th className="px-3 py-2 text-left">Vence</th>
                                    <th className="px-3 py-2 text-left">Progreso</th>
                                    <th className="px-3 py-2 text-right">Contacto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(pagos?.lockerUsers || []).map((u) => (
                                    <tr key={u.id} className="border-t border-slate-100">
                                        <td className="px-3 py-2">
                                            <p className="font-semibold text-slate-900">{u.name}</p>
                                            <p className="text-xs text-slate-500">{u.email || "sin email"}</p>
                                        </td>
                                        <td className="px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => setReassigning({ user_id: u.id, name: u.name, locker_number: Number(u.locker) })}
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${u.up_to_date ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                                            >
                                                #{u.locker}
                                            </button>
                                        </td>
                                        <td className="px-3 py-2">{fmtDate(u.expires_at)}</td>
                                        <td className="px-3 py-2">
                                            <div className="h-2 w-40 rounded-full bg-slate-200">
                                                <div className={`h-2 rounded-full ${u.up_to_date ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${Math.max(0, Math.min(100, Number(u.progress || 0)))}%` }} />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearch(u.name || "");
                                                        applyFilters({ search: u.name || "" });
                                                    }}
                                                    className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                >
                                                    Ver pagos
                                                </button>
                                                {u.phone ? (
                                                    <a
                                                        href={`https://wa.me/${String(u.phone).replace(/\D/g, "").startsWith("34") ? String(u.phone).replace(/\D/g, "") : `34${String(u.phone).replace(/\D/g, "")}`}?text=${encodeURIComponent(u.up_to_date ? `Hola ${u.name}, hemos recibido tu comprobante, lo validamos ahora mismo.` : `Hola ${u.name}, tu taquilla en la escuela ha vencido el ${fmtDate(u.expires_at)}. ¿Quieres renovarla?`)}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white"
                                                    >
                                                        WhatsApp
                                                    </a>
                                                ) : <span className="text-xs text-slate-500">sin teléfono</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ModalShell open={!!proofModal} onClose={() => setProofModal(null)} maxWidth="max-w-5xl">
                <div>
                        <div className="mb-2 flex justify-end">
                            <button type="button" className="rounded-md bg-slate-200 px-3 py-1 text-slate-700" onClick={() => setProofModal(null)}>Cerrar</button>
                        </div>
                        <iframe title="Comprobante taquilla" src={proofModal} className="h-[75vh] w-full rounded-lg" />
                </div>
            </ModalShell>

            <ModalShell open={!!rejecting} onClose={() => setRejecting(null)}>
                <div className="space-y-3">
                        <p className="text-lg font-bold text-slate-900">Confirmar rechazo</p>
                        <p className="text-sm text-slate-700">¿Seguro que quieres rechazar este pago? Puedes añadir un motivo para auditoría.</p>
                        <textarea
                            className="w-full rounded-xl border border-slate-300 px-3 py-2"
                            rows={4}
                            value={rejecting?.notes || ""}
                            onChange={(e) => setRejecting((prev) => ({ ...prev, notes: e.target.value }))}
                            placeholder="Ej: Imagen no legible"
                        />
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setRejecting(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                            <button
                                type="button"
                                disabled={processingId === `reject-${rejecting?.id}`}
                                onClick={doReject}
                                className="rounded-lg bg-rose-600 px-3 py-1 text-white disabled:opacity-60"
                            >
                                {processingId === `reject-${rejecting?.id}` ? "..." : "Confirmar rechazo"}
                            </button>
                        </div>
                </div>
            </ModalShell>
            <ModalShell open={!!approveConfirming} onClose={() => setApproveConfirming(null)} maxWidth="max-w-md">
                <div className="space-y-3">
                        <p className="text-lg font-bold text-slate-900">Confirmar aprobación</p>
                        <p className="text-sm text-slate-700">
                            Vas a aprobar el pago de <span className="font-semibold">{approveConfirming?.user || "usuario"}</span>.
                            Esta acción actualizará su estado de pago.
                        </p>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setApproveConfirming(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                            <button
                                type="button"
                                disabled={processingId === `approve-${approveConfirming?.id}`}
                                onClick={() => {
                                    if (!approveConfirming?.id) return;
                                    doApprove(approveConfirming.id);
                                    setApproveConfirming(null);
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-white disabled:opacity-60"
                            >
                                {processingId === `approve-${approveConfirming?.id}` ? "..." : "Confirmar"}
                            </button>
                        </div>
                </div>
            </ModalShell>
            <ModalShell open={!!approving} onClose={() => setApproving(null)} maxWidth="max-w-2xl">
                <div className="space-y-4">
                        <p className="text-lg font-bold text-slate-900">Aprobar pago y asignar taquilla</p>
                        <div className="rounded-xl border border-slate-200 p-3">
                            <p className="font-semibold text-slate-900">{approving?.row?.user || "Usuario"}</p>
                            <p className="text-xs text-slate-500">{approving?.row?.email || "sin email"}</p>
                            <p className="mt-2 text-xs text-slate-600">Sin taquilla actual: debes seleccionar una libre.</p>
                        </div>
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                            {lockerCells.map((n) => {
                                const occupied = lockerOccupiedSet.has(Number(n));
                                const selected = Number(approving?.locker_number) === Number(n);
                                return (
                                    <button
                                        key={`approve-locker-${n}`}
                                        type="button"
                                        disabled={occupied}
                                        onClick={() => setApproving((prev) => ({ ...prev, locker_number: n }))}
                                        className={`h-9 rounded-md text-xs font-semibold ${
                                            occupied
                                                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                                                : selected
                                                    ? "bg-sky-600 text-white"
                                                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                        }`}
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setApproving(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                            <button
                                type="button"
                                disabled={!approving?.locker_number || processingId === `approve-${approving?.row?.id}`}
                                onClick={() => {
                                    if (!approving?.row?.id) return;
                                    doApprove(approving.row.id, approving?.locker_number);
                                    setApproving(null);
                                }}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-white disabled:opacity-50"
                            >
                                Aprobar
                            </button>
                        </div>
                </div>
            </ModalShell>
            <ModalShell open={!!reassigning} onClose={() => setReassigning(null)} maxWidth="max-w-2xl">
                <div className="space-y-4">
                        <p className="text-lg font-bold text-slate-900">Reasignar Taquilla · {reassigning?.name}</p>
                        <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
                            {lockerCells.map((n) => {
                                const occupied = lockerOccupiedSet.has(Number(n)) && Number(reassigning?.locker_number) !== Number(n);
                                const selected = Number(reassigning?.locker_number) === Number(n);
                                return (
                                    <button
                                        key={`reassign-locker-${n}`}
                                        type="button"
                                        disabled={occupied}
                                        onClick={() => setReassigning((prev) => ({ ...prev, locker_number: n }))}
                                        className={`h-9 rounded-md text-xs font-semibold ${
                                            occupied
                                                ? "cursor-not-allowed bg-slate-200 text-slate-400"
                                                : selected
                                                    ? "bg-sky-600 text-white"
                                                    : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                        }`}
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setReassigning(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                            <button
                                type="button"
                                disabled={!reassigning?.locker_number || processingId === `reassign-${reassigning?.user_id}`}
                                onClick={saveReassign}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-white disabled:opacity-50"
                            >
                                Guardar cambio
                            </button>
                        </div>
                </div>
            </ModalShell>
            {toast ? (
                <div className={`fixed right-4 top-24 z-[70] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`}>
                    {toast.message}
                </div>
            ) : null}
        </>
    );
}

