import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import { DocumentMinusIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import Breadcrumbs from "../../../components/Breadcrumbs";

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

function pagoUi(row) {
    const method = String(row?.payment_method || "");
    if (row?.status === "rejected") return "failed";
    if (row?.status === "confirmed") {
        if (method === "tienda") return "metalico";
        if (method === "domiciliado") return "domiciliado";
        return "transferencia";
    }
    return "pending";
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
    const filterPillBase = "rounded-full px-3 py-1 text-xs font-semibold transition-colors";
    const filterPillActive = "bg-sky-600 text-white";
    const filterPillIdle = "bg-sky-900/40 text-sky-100 hover:bg-sky-800/50";
    const [search, setSearch] = useState(pagos?.filters?.search || "");
    const [status, setStatus] = useState(pagos?.filters?.status || "all");
    const [pendingReview, setPendingReview] = useState(!!pagos?.filters?.pending_review);
    const [prioritizeUnreviewed, setPrioritizeUnreviewed] = useState(false);
    const [proofModal, setProofModal] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [reassigning, setReassigning] = useState(null); // { user_id, name, locker_number }
    const [toast, setToast] = useState(null);
    const [reviewModal, setReviewModal] = useState(null); // row
    const [processingReviewId, setProcessingReviewId] = useState(null);
    const [failedReasonModal, setFailedReasonModal] = useState(null); // { row, reason }
    const [failedReasonViewModal, setFailedReasonViewModal] = useState(null); // row
    const [focusedUserPayments, setFocusedUserPayments] = useState(null); // { id, name }

    const rows = useMemo(() => {
        const base = pagos?.rows || [];
        if (!prioritizeUnreviewed) return base;
        return [...base].sort((a, b) => Number(Boolean(b?.is_new)) - Number(Boolean(a?.is_new)));
    }, [pagos?.rows, prioritizeUnreviewed]);
    const visibleRows = useMemo(() => {
        if (!focusedUserPayments?.id) return rows;
        return rows.filter((row) => Number(row?.user_id) === Number(focusedUserPayments.id));
    }, [rows, focusedUserPayments]);
    const counts = pagos?.counts || {};
    const isRowUnreviewed = (row) => Boolean(row?.is_new);

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

    const updatePagoState = (row, nextState, failureReason = "") => {
        if (!row?.id) return;
        setProcessingId(`state-${row.id}`);
        router.patch(route("taquilla.pagos.payment-state", row.id), { pago_state: nextState, failure_reason: failureReason || null }, {
            preserveScroll: true,
            onFinish: () => setProcessingId(null),
            onSuccess: (page) => {
                const err = page?.props?.flash?.error;
                if (err) {
                    setToast({ type: "error", message: String(err) });
                    setTimeout(() => setToast(null), 4200);
                    return;
                }
                setToast({ type: "success", message: "Pago actualizado." });
                setTimeout(() => setToast(null), 1800);
                router.reload({ only: ["pagos", "adminStats"], preserveScroll: true, preserveState: true });
            },
            onError: () => {
                setToast({ type: "error", message: "No se pudo actualizar el pago." });
                setTimeout(() => setToast(null), 2200);
            },
        });
    };

    const submitFailedReason = () => {
        if (!failedReasonModal?.row?.id) return;
        const reason = String(failedReasonModal.reason || "").trim();
        if (!reason) {
            setToast({ type: "error", message: "Debes indicar el motivo del fallo." });
            setTimeout(() => setToast(null), 2200);
            return;
        }
        updatePagoState(failedReasonModal.row, "failed", reason);
        setFailedReasonModal(null);
    };

    const setComprobado = (row, value) => {
        if (!row?.id) return;
        const nextChecked = value === "yes";
        if (Boolean(row?.is_checked) === nextChecked) return;
        setProcessingId(`check-${row.id}`);
        router.patch(route("taquilla.pagos.checked-state", row.id), { is_checked: nextChecked }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const err = page?.props?.flash?.error;
                if (err) {
                    setToast({ type: "error", message: String(err) });
                    setTimeout(() => setToast(null), 4200);
                    return;
                }
                setToast({ type: "success", message: "Comprobación actualizada." });
                setTimeout(() => setToast(null), 1800);
                router.reload({ only: ["pagos", "adminStats"], preserveScroll: true, preserveState: true });
            },
            onError: () => {
                setToast({ type: "error", message: "No se pudo actualizar la comprobación." });
                setTimeout(() => setToast(null), 2200);
            },
            onFinish: () => setProcessingId(null),
        });
    };

    const statusOptions = useMemo(() => ([
        { id: "all", label: `Todos (${counts.all || 0})` },
        { id: "pending", label: `Pendientes (${counts.pending || 0})` },
        { id: "confirmed", label: `Confirmados (${counts.confirmed || 0})` },
        { id: "rejected", label: `Rechazados (${counts.rejected || 0})` },
    ]), [counts]);

    const lockerOccupiedSet = useMemo(() => new Set((pagos?.lockerGrid?.occupied || []).map(Number)), [pagos?.lockerGrid]);
    const lockerMax = Number(pagos?.lockerGrid?.max || 60);
    const lockerCells = useMemo(() => Array.from({ length: lockerMax }, (_, i) => i + 1), [lockerMax]);

    const userStatusBadge = (u) => {
        if (u?.plan_status === "up_to_date") return "bg-emerald-100 text-emerald-700";
        if (u?.plan_status === "outdated") return "bg-amber-100 text-amber-700";
        return "bg-rose-100 text-rose-700";
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
                router.reload({ only: ["pagos", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onError: () => {
                setToast({ type: "error", message: "No se pudo reasignar la taquilla." });
                setTimeout(() => setToast(null), 2200);
            },
            onFinish: () => setProcessingId(null),
        });
    };

    const markAsReviewed = () => {
        if (!reviewModal?.id || processingReviewId) return;
        setProcessingReviewId(reviewModal.id);
        router.patch(route("taquilla.pagos.reviewed", reviewModal.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewModal(null);
                setToast({ type: "success", message: "Marca de pendiente retirada." });
                setTimeout(() => setToast(null), 2200);
                router.reload({ only: ["pagos", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onError: () => {
                setToast({ type: "error", message: "No se pudo retirar la marca de pendiente." });
                setTimeout(() => setToast(null), 2200);
            },
            onFinish: () => setProcessingReviewId(null),
        });
    };

    return (
        <>
            <Head title="Taquillas · Cola de Pagos" />
            <div className="mx-auto max-w-7xl p-6 space-y-4">
                <Breadcrumbs
                    items={[
                        { label: "Admin", href: route("Pag_principal") },
                        { label: "Taquillas", href: route("taquilla.index.admin") },
                        { label: "Pagos por verificar" },
                    ]}
                    variant="dark"
                    className="mb-1"
                />
                <h1 className="text-2xl font-bold text-gray-100">
                    {focusedUserPayments?.name
                        ? `PAGOS DE "${focusedUserPayments.name}"`
                        : "Pagos por Verificar · Taquillas"}
                </h1>

                <div className="flex flex-wrap items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyFilters({ search: e.currentTarget.value })}
                        placeholder="Buscar por nombre o email..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:w-80"
                    />
                    <button type="button" onClick={() => applyFilters()} className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white">Buscar</button>
                    {focusedUserPayments ? (
                        <button
                            type="button"
                            onClick={() => setFocusedUserPayments(null)}
                            className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                        >
                            Ver todos los pagos
                        </button>
                    ) : null}
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
                            className={`${filterPillBase} ${status === s.id ? filterPillActive : filterPillIdle}`}
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
                                    <th className="w-10 px-2 py-2 text-left text-xs uppercase tracking-wide" aria-label="Orden por pendientes">
                                        <button
                                            type="button"
                                            onClick={() => setPrioritizeUnreviewed((prev) => !prev)}
                                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
                                                prioritizeUnreviewed
                                                    ? "border-red-400/60 bg-red-900/20 text-red-200"
                                                    : "border-slate-300 bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            }`}
                                            title={prioritizeUnreviewed ? "Quitar prioridad de pendientes" : "Priorizar pendientes (círculo rojo)"}
                                            aria-label="Ordenar por pagos pendientes de revisión"
                                        >
                                            <span className="relative inline-flex items-center justify-center">
                                                <span className="text-xs">↕</span>
                                                <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-red-500" />
                                            </span>
                                        </button>
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Usuario</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Taquilla</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Plan</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Justificante</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Pago</th>
                                    <th className="px-3 py-2 text-left text-xs uppercase tracking-wide">Comprobado</th>
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
                                ) : visibleRows.length === 0 ? (
                                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">Sin registros para estos filtros.</td></tr>
                                ) : visibleRows.map((row) => {
                                    const pagoState = pagoUi(row);
                                    return (
                                        <tr
                                            key={row.id}
                                            className="border-t border-slate-100 hover:bg-slate-50/60"
                                        >
                                            <td className="px-2 py-2.5">
                                                {isRowUnreviewed(row) ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setReviewModal(row);
                                                        }}
                                                        className="mx-auto block rounded-full"
                                                        title="Pago no revisado"
                                                        aria-label="Pago no revisado"
                                                    >
                                                        <span className="block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.25)]" />
                                                    </button>
                                                ) : null}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <p className="font-semibold text-slate-900">{row.user || "—"}</p>
                                                <p className="text-xs text-slate-500">{row.email || "sin email"}</p>
                                            </td>
                                            <td className="px-3 py-2.5 font-bold text-slate-900">{row.numeroTaquilla ?? "—"}</td>
                                            <td className="px-3 py-2.5 font-bold text-slate-900">{shortPlanName(row.plan)}</td>
                                            <td className="px-3 py-2.5 font-bold text-slate-900">
                                                <p>{row.proof_uploaded_at_human || row.created_at_human || "—"}</p>
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="inline-flex items-center gap-1.5">
                                                    <select
                                                        value={pagoState}
                                                        onChange={(e) => {
                                                            const next = e.target.value;
                                                            if (next === "failed") {
                                                                setFailedReasonModal({
                                                                    row,
                                                                    reason: row.status === "rejected" ? String(row.admin_notes || "") : "",
                                                                });
                                                                return;
                                                            }
                                                            updatePagoState(row, next);
                                                        }}
                                                        disabled={processingId === `state-${row.id}`}
                                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-60"
                                                    >
                                                        <option value="pending">Pend</option>
                                                        <option value="transferencia">Transf</option>
                                                        <option value="metalico">Cortesía</option>
                                                        <option value="domiciliado">Dom</option>
                                                        <option value="failed">Fallido</option>
                                                    </select>
                                                    {pagoState === "failed" && String(row.admin_notes || "").trim() ? (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setFailedReasonViewModal(row);
                                                            }}
                                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                            title="Ver motivo del pago fallido"
                                                            aria-label="Ver motivo del pago fallido"
                                                        >
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M6 19l-1.5 2 .5-2A4 4 0 0 1 1 15V7a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H6Z" />
                                                            </svg>
                                                        </button>
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={row.is_checked ? "yes" : "no"}
                                                        onChange={(e) => setComprobado(row, e.target.value)}
                                                        disabled={processingId === `check-${row.id}`}
                                                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                                                            row.is_checked
                                                                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                                                : "border-rose-300 bg-rose-100 text-rose-700"
                                                        }`}
                                                    >
                                                        <option value="yes">Sí</option>
                                                        <option value="no">No</option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (row.proof_url) setProofModal(row.proof_url);
                                                        }}
                                                        disabled={!row.proof_url}
                                                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 transition ${
                                                            row.proof_url
                                                                ? "bg-slate-100 text-slate-700 ring-slate-300 hover:bg-slate-200"
                                                                : "cursor-not-allowed bg-slate-100 text-slate-400 ring-slate-200"
                                                        }`}
                                                        title={row.proof_url ? "Ver comprobante" : "Sin comprobante subido"}
                                                        aria-label={row.proof_url ? "Ver comprobante" : "Sin comprobante subido"}
                                                    >
                                                        {row.proof_url ? <DocumentTextIcon className="h-4 w-4" /> : <DocumentMinusIcon className="h-4 w-4" />}
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
                                            <div className={`mb-1 text-xs font-semibold ${u.is_expired ? "text-rose-600" : "text-slate-600"}`}>
                                                {typeof u.days_remaining === "number"
                                                    ? `${u.days_remaining} días`
                                                    : "—"}
                                            </div>
                                            <div className="h-2 w-40 rounded-full bg-slate-200">
                                                <div
                                                    className={`h-2 rounded-full ${u.is_expired ? "bg-rose-500" : "bg-emerald-500"}`}
                                                    style={{ width: `${Math.max(0, Math.min(100, Number(u.progress || 0)))}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFocusedUserPayments({ id: u.id, name: u.name || "Usuario" });
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
            <ModalShell open={!!reviewModal} onClose={() => setReviewModal(null)} maxWidth="max-w-md">
                <div className="space-y-3">
                    <p className="text-lg font-bold text-slate-900">Retirar marca de pendiente</p>
                    <p className="text-sm text-slate-700">
                        ¿Desea retirar la marca de pendiente para <strong>{reviewModal?.user || "este pago"}</strong>?
                    </p>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setReviewModal(null)}
                            disabled={!!processingReviewId}
                            className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700 disabled:opacity-60"
                        >
                            No
                        </button>
                        <button
                            type="button"
                            onClick={markAsReviewed}
                            disabled={!!processingReviewId}
                            className="rounded-lg bg-emerald-600 px-3 py-1 text-white disabled:opacity-60"
                        >
                            {processingReviewId ? "Procesando..." : "Sí"}
                        </button>
                    </div>
                </div>
            </ModalShell>

            <ModalShell open={!!failedReasonViewModal} onClose={() => setFailedReasonViewModal(null)} maxWidth="max-w-md">
                <div className="space-y-3">
                    <p className="text-lg font-bold text-slate-900">Motivo del pago fallido</p>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        {failedReasonViewModal?.admin_notes?.trim() || "Sin nota adicional."}
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setFailedReasonViewModal(null)}
                            className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </ModalShell>
            <ModalShell open={!!failedReasonModal} onClose={() => setFailedReasonModal(null)} maxWidth="max-w-md">
                <div className="space-y-3">
                    <p className="text-lg font-bold text-slate-900">Marcar pago como fallido</p>
                    <p className="text-sm text-slate-700">Indica el motivo del fallo (ej: no se ve reflejado en banco, domiciliación fallida, etc.).</p>
                    <textarea
                        className="w-full rounded-xl border border-slate-300 px-3 py-2"
                        rows={4}
                        value={failedReasonModal?.reason || ""}
                        onChange={(e) => setFailedReasonModal((prev) => ({ ...prev, reason: e.target.value }))}
                        placeholder="Motivo del pago fallido"
                    />
                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setFailedReasonModal(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                        <button
                            type="button"
                            onClick={submitFailedReason}
                            disabled={processingId === `state-${failedReasonModal?.row?.id}`}
                            className="rounded-lg bg-rose-600 px-3 py-1 text-white disabled:opacity-60"
                        >
                            Guardar
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

