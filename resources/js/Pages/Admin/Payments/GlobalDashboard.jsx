import React, { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { EnvelopeIcon } from "@heroicons/react/24/outline";

const TAB_CLASSES = "classes";
const TAB_RENTALS = "rentals";
const TAB_BONOS = "bonos";

const STATUS_OPTIONS = [
    { id: "all", label: "Todos" },
    { id: "submitted", label: "Pendientes de Validar" },
    { id: "pending", label: "Pendientes de Pago" },
    { id: "confirmed", label: "Confirmados" },
];

function statusLabel(status) {
    if (status === "confirmed") return "Confirmado";
    if (status === "submitted") return "Enviado";
    if (status === "pending") return "Pendiente";
    return String(status || "—");
}

const BONO_STATUS_OPTIONS = [
    { id: "all", label: "Todos" },
    { id: "pending_validation", label: "Pendientes de Validar" },
    { id: "pending_payment", label: "Pendientes de Pago" },
    { id: "confirmed", label: "Confirmados" },
];

function WhatsAppIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M12 2a10 10 0 0 0-8.7 14.95L2 22l5.2-1.36A10 10 0 1 0 12 2Zm0 18a7.9 7.9 0 0 1-4.02-1.1l-.29-.17-3.08.8.82-3-.19-.31A8 8 0 1 1 12 20Zm4.28-5.9c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.91-1.18-.7-.63-1.17-1.4-1.31-1.64-.14-.24-.01-.37.11-.49.1-.1.24-.26.36-.39.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.68 2.56 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
        </svg>
    );
}

export default function GlobalDashboard({ lessonRows = [], rentalRows = [], bonoRows = [], bonoPacks = [], filters = {}, counts = {} }) {
    const [tab, setTab] = useState(TAB_CLASSES);
    const [status, setStatus] = useState(filters.status || "all");
    const [bonoStatus, setBonoStatus] = useState(filters.bono_status || "all");
    const [bonoPackId, setBonoPackId] = useState(filters.bono_pack_id || "all");
    const [classModality, setClassModality] = useState("all");
    const [proofModal, setProofModal] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { entity: 'class'|'rental'|'bono', type: 'confirm'|'reject', row }
    const [rejectReason, setRejectReason] = useState("");
    const [processingAction, setProcessingAction] = useState(false);
    const [toast, setToast] = useState(null);
    const [localBonoRows, setLocalBonoRows] = useState(bonoRows);
    const [contactModal, setContactModal] = useState(null); // { channel, row }

    useEffect(() => {
        setLocalBonoRows(bonoRows);
    }, [bonoRows]);

    const activeRows = useMemo(() => {
        if (tab === TAB_CLASSES) {
            return lessonRows.filter((r) => classModality === "all" ? true : r.modality === classModality);
        }
        if (tab === TAB_RENTALS) return rentalRows;
        return localBonoRows;
    }, [tab, lessonRows, rentalRows, localBonoRows, classModality]);

    const reloadStatus = (next) => {
        setStatus(next);
        router.get(
            route("admin.payments.global"),
            { status: next, bono_status: bonoStatus, bono_pack_id: bonoPackId === "all" ? null : bonoPackId },
            { preserveState: true, preserveScroll: true }
        );
    };

    const reloadBonoFilters = (nextStatus, nextPackId) => {
        setBonoStatus(nextStatus);
        setBonoPackId(nextPackId);
        router.get(
            route("admin.payments.global"),
            { status, bono_status: nextStatus, bono_pack_id: nextPackId === "all" ? null : nextPackId },
            { preserveState: true, preserveScroll: true }
        );
    };

    const approveClass = (row) => {
        if (!row?.id || processingAction) return;
        setProcessingAction(true);
        router.post(route("admin.academy.enrollments.confirm", row.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setToast(`Pago confirmado para ${row.user}.`);
                setPendingAction(null);
                setTimeout(() => setToast(null), 2800);
                router.reload({ only: ["lessonRows", "counts", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const rejectClass = (row) => {
        if (!row?.id || processingAction) return;
        setProcessingAction(true);
        router.post(route("admin.academy.enrollments.reject", row.id), { admin_notes: rejectReason.trim() || "Rechazado desde panel unificado." }, {
            preserveScroll: true,
            onSuccess: () => {
                setToast(`Pago rechazado para ${row.user}.`);
                setPendingAction(null);
                setRejectReason("");
                setTimeout(() => setToast(null), 2800);
                router.reload({ only: ["lessonRows", "counts", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const approveRental = (row) => {
        if (!row?.id || processingAction) return;
        setProcessingAction(true);
        router.post(route("admin.bookings.approve-proof", row.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setToast(`Pago confirmado para ${row.user}.`);
                setPendingAction(null);
                setTimeout(() => setToast(null), 2800);
                router.reload({ only: ["rentalRows", "counts", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const rejectRental = (row) => {
        if (!row?.id || processingAction) return;
        setProcessingAction(true);
        router.post(route("admin.bookings.reject-proof", row.id), { admin_notes: rejectReason.trim() || "Rechazado desde panel unificado." }, {
            preserveScroll: true,
            onSuccess: () => {
                setToast(`Pago rechazado para ${row.user}.`);
                setPendingAction(null);
                setRejectReason("");
                setTimeout(() => setToast(null), 2800);
                router.reload({ only: ["rentalRows", "counts", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const approveBono = (row) => {
        if (!row?.id || processingAction) return;
        setProcessingAction(true);
        router.post(route("admin.payment-validation.confirm", row.id), {}, {
            preserveScroll: true,
            onSuccess: () => {
                setLocalBonoRows((prev) => prev.filter((r) => r.id !== row.id));
                setToast(`Pago confirmado para ${row.user}. Clases activadas correctamente.`);
                setPendingAction(null);
                setTimeout(() => setToast(null), 3200);
                router.reload({ only: ["bonoRows", "counts", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const rejectBono = (row) => {
        if (!row?.id || processingAction) return;
        setProcessingAction(true);
        router.post(route("admin.payment-validation.reject", row.id), { reason: rejectReason.trim() || null }, {
            preserveScroll: true,
            onSuccess: () => {
                setLocalBonoRows((prev) => prev.filter((r) => r.id !== row.id));
                setToast(`Pago rechazado para ${row.user}. Estado actualizado.`);
                setPendingAction(null);
                setRejectReason("");
                setTimeout(() => setToast(null), 3200);
                router.reload({ only: ["bonoRows", "counts", "adminStats"], preserveState: true, preserveScroll: true });
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const confirmPendingAction = () => {
        if (!pendingAction?.row) return;
        if (pendingAction.entity === "class") return approveClass(pendingAction.row);
        if (pendingAction.entity === "rental") return approveRental(pendingAction.row);
        return approveBono(pendingAction.row);
    };

    const rejectPendingAction = () => {
        if (!pendingAction?.row) return;
        if (pendingAction.entity === "class") return rejectClass(pendingAction.row);
        if (pendingAction.entity === "rental") return rejectRental(pendingAction.row);
        return rejectBono(pendingAction.row);
    };

    const getServiceType = (row) => {
        if (row?.pack || row?.pack_id) return "bono";
        if (row?.rental_name) return "alquiler";
        return "clase";
    };

    const getServiceDetail = (type, row) => {
        if (type === "bono") return row?.pack ? `Bono ${row.pack}` : "Bono VIP";
        if (type === "alquiler") return row?.rental_name || "Alquiler de tablas";
        return row?.lesson_name ? `Clase: ${row.lesson_name}` : "Clase de surf";
    };

    const generateMessage = (type, action, data) => {
        const name = data?.user_name || data?.user || "Cliente";
        const detail = getServiceDetail(type, data);
        if (action === "approved") {
            return {
                subject: "¡Buenas noticias! Tu reserva en Mas Que Surf ha sido confirmada 🏄‍♂️",
                body:
`Hola ${name}:
Nos alegra informarte de que tu pago/reserva de ${detail} ha sido confirmado con éxito.
Ya tienes todo listo para disfrutar con nosotros. Si tienes dudas, responde a este mensaje. ¡Nos vemos en el agua!`,
            };
        }
        return {
            subject: "Actualización sobre tu solicitud en Mas Que Surf",
            body:
`Hola ${name}:
Te escribo porque ha habido un pequeño inconveniente al procesar tu pago de ${detail}.
Por favor, ponte en contacto con nosotros lo antes posible para que podamos solucionarlo y asegurar tu plaza. ¡Gracias!`,
        };
    };

    const buildWhatsappLink = (row, action) => {
        const raw = String(row?.phone || "").replace(/\D/g, "");
        if (!raw) return null;
        const phone = raw.startsWith("34") ? raw : `34${raw}`;
        const type = getServiceType(row);
        const msg = generateMessage(type, action, row);
        return `https://wa.me/${phone}?text=${encodeURIComponent(`${msg.subject}\n\n${msg.body}`)}`;
    };

    const buildMailtoLink = (row, action) => {
        const email = String(row?.email || "").trim();
        if (!email) return null;
        const type = getServiceType(row);
        const msg = generateMessage(type, action, row);
        return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`;
    };

    const classCount = lessonRows.filter((r) => classModality === "all" ? true : r.modality === classModality).length;
    const rentalCount = rentalRows.length;
    const bonoCount = bonoRows.length;

    const tabBadge = {
        classes: classCount,
        rentals: rentalCount,
        bonos: bonoCount,
    };

    return (
        <>
            <Head title="Pagos · Dashboard Global" />
            <div className="mx-auto max-w-7xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-slate-900">Pagos · Dashboard Global</h1>
                    <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold text-white">
                        Pendientes: {tabBadge.classes + tabBadge.rentals + tabBadge.bonos}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTab(TAB_CLASSES)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_CLASSES ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                        Clases ({tabBadge.classes})
                    </button>
                    <button type="button" onClick={() => setTab(TAB_RENTALS)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_RENTALS ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                        Alquileres ({tabBadge.rentals})
                    </button>
                    <button type="button" onClick={() => setTab(TAB_BONOS)} className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === TAB_BONOS ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700"}`}>
                        Bonos VIP ({tabBadge.bonos})
                    </button>
                </div>

                {tab !== TAB_BONOS ? (
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => reloadStatus(s.id)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${status === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                {tab === TAB_BONOS ? (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {BONO_STATUS_OPTIONS.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => reloadBonoFilters(s.id, bonoPackId)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${bonoStatus === s.id ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}
                                >
                                    {s.label}
                                    {typeof counts?.bonos?.[s.id] === "number" ? ` (${counts.bonos[s.id]})` : ""}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => reloadBonoFilters(bonoStatus, "all")}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${bonoPackId === "all" ? "bg-brand-deep text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                Todos los bonos
                            </button>
                            {bonoPacks.map((pack) => (
                                <button
                                    key={pack.id}
                                    type="button"
                                    onClick={() => reloadBonoFilters(bonoStatus, pack.id)}
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(bonoPackId) === Number(pack.id) ? "bg-brand-deep text-white" : "bg-slate-100 text-slate-700"}`}
                                >
                                    {pack.nombre}
                                </button>
                            ))}
                        </div>
                    </>
                ) : null}

                {tab === TAB_CLASSES ? (
                    <div className="flex flex-wrap gap-2">
                        {[
                            { id: "all", label: "Todas" },
                            { id: "particular", label: "Particulares" },
                            { id: "semanal", label: "Semanales" },
                            { id: "grupal", label: "Grupales" },
                        ].map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setClassModality(m.id)}
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${classModality === m.id ? "bg-brand-deep text-white" : "bg-slate-100 text-slate-700"}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="max-h-[68vh] overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-slate-50 text-slate-700">
                                <tr>
                                    <th className="px-4 py-3 text-left">Usuario</th>
                                    <th className="px-4 py-3 text-left">Detalle</th>
                                    <th className="px-4 py-3 text-left">Fecha</th>
                                    <th className="px-4 py-3 text-left">Importe</th>
                                    <th className="px-4 py-3 text-left">Estado</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Sin resultados para este filtro.</td>
                                    </tr>
                                ) : activeRows.map((row) => (
                                    <tr key={row.id} className="border-t border-slate-100">
                                        <td className="px-4 py-3">{row.user}</td>
                                        <td className="px-4 py-3">
                                            {tab === TAB_CLASSES ? `${row.lesson_name || "Clase"} · ${row.modality || "grupal"}` : null}
                                            {tab === TAB_RENTALS ? (row.rental_name || "Alquiler") : null}
                                            {tab === TAB_BONOS ? `${row.pack || "Bono"} (${row.num_clases || 0} clases)` : null}
                                        </td>
                                        <td className="px-4 py-3">{row.created_at_human || row.date_human || "—"}</td>
                                        <td className="px-4 py-3 font-semibold">{Number(row.amount || 0).toFixed(2)} €</td>
                                        <td className="px-4 py-3">{statusLabel(row.status)}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                {row.proof_url ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setProofModal(row.proof_url)}
                                                        className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                                                            tab === TAB_BONOS && bonoStatus === "pending_validation"
                                                                ? "bg-sky-600 text-white hover:bg-sky-700"
                                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                        }`}
                                                    >
                                                        Ver comprobante
                                                    </button>
                                                ) : null}
                                                {(row.phone || row.email) ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setContactModal({ channel: "whatsapp", row })}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white shadow transition-all hover:scale-105 hover:bg-emerald-600"
                                                            title="Contactar por WhatsApp"
                                                        >
                                                            <WhatsAppIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setContactModal({ channel: "email", row })}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-600 text-white shadow transition-all hover:scale-105 hover:bg-sky-700"
                                                            title="Enviar Email"
                                                        >
                                                            <EnvelopeIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                ) : null}
                                                {tab === TAB_CLASSES ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "class", type: "confirm", row })}
                                                            disabled={processingAction}
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "confirm" ? "..." : "Aprobar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "class", type: "reject", row })}
                                                            disabled={processingAction}
                                                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "reject" ? "..." : "Rechazar"}
                                                        </button>
                                                    </>
                                                ) : null}
                                                {tab === TAB_RENTALS ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "rental", type: "confirm", row })}
                                                            disabled={processingAction}
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "confirm" ? "..." : "Aprobar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "rental", type: "reject", row })}
                                                            disabled={processingAction}
                                                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "reject" ? "..." : "Rechazar"}
                                                        </button>
                                                    </>
                                                ) : null}
                                                {tab === TAB_BONOS ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "bono", type: "confirm", row })}
                                                            disabled={processingAction}
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "confirm" ? "..." : "Confirmar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "bono", type: "reject", row })}
                                                            disabled={processingAction}
                                                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "reject" ? "..." : "Rechazar"}
                                                        </button>
                                                    </>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {proofModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setProofModal(null)}>
                    <div className="w-full max-w-5xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-3 flex justify-end">
                            <button type="button" className="rounded-md bg-slate-200 px-3 py-1 text-slate-700" onClick={() => setProofModal(null)}>Cerrar</button>
                        </div>
                        <iframe title="Comprobante" src={proofModal} className="h-[75vh] w-full rounded-lg" />
                    </div>
                </div>
            ) : null}

            {pendingAction ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setPendingAction(null)}>
                    <div className="w-full max-w-lg rounded-2xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                        {pendingAction.type === "confirm" ? (
                            <>
                                <p className="text-lg font-bold text-slate-900">Confirmar validación de pago</p>
                                <p className="text-sm text-slate-700">
                                    ¿Estás seguro de que quieres validar el pago de <strong>{pendingAction.row?.user}</strong> por{" "}
                                    <strong>
                                        {pendingAction.entity === "bono"
                                            ? (pendingAction.row?.pack || "Bono VIP")
                                            : pendingAction.entity === "rental"
                                                ? (pendingAction.row?.rental_name || "Alquiler")
                                                : (pendingAction.row?.lesson_name || "Clase")}
                                    </strong>
                                    ? Esto actualizará su estado a confirmado.
                                </p>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setPendingAction(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                                    <button type="button" onClick={confirmPendingAction} disabled={processingAction} className="rounded-lg bg-emerald-600 px-3 py-1 text-white disabled:opacity-60">
                                        {processingAction ? "Procesando..." : "Confirmar"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold text-slate-900">
                                    Rechazar pago de {pendingAction.entity === "bono" ? "bono" : pendingAction.entity === "rental" ? "alquiler" : "clase"}
                                </p>
                                <p className="text-sm text-slate-700">¿Deseas rechazar este pago? Introduce el motivo (opcional) para informar al cliente.</p>
                                <textarea
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    rows={4}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setPendingAction(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                                    <button type="button" onClick={rejectPendingAction} disabled={processingAction} className="rounded-lg bg-rose-600 px-3 py-1 text-white disabled:opacity-60">
                                        {processingAction ? "Procesando..." : "Confirmar rechazo"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : null}
            {contactModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setContactModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-lg font-bold text-slate-900">{contactModal.channel === "whatsapp" ? "Contactar por WhatsApp" : "Enviar Email"}</p>
                        <p className="text-sm text-slate-600">Selecciona tipo de notificación para {contactModal.row?.user_name || contactModal.row?.user}.</p>
                        <div className="grid grid-cols-1 gap-2">
                            <a
                                href={contactModal.channel === "whatsapp" ? (buildWhatsappLink(contactModal.row, "approved") || "#") : (buildMailtoLink(contactModal.row, "approved") || "#")}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-700"
                            >
                                Mensaje de confirmación
                            </a>
                            <a
                                href={contactModal.channel === "whatsapp" ? (buildWhatsappLink(contactModal.row, "issue") || "#") : (buildMailtoLink(contactModal.row, "issue") || "#")}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg bg-amber-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-amber-700"
                            >
                                Mensaje de incidencia
                            </a>
                        </div>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setContactModal(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cerrar</button>
                        </div>
                    </div>
                </div>
            ) : null}
            {toast ? (
                <div className="fixed right-4 top-24 z-50 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-xl">
                    {toast}
                </div>
            ) : null}
        </>
    );
}

