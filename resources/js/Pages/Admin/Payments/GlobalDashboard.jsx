import React, { useEffect, useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { CreditCard, FileText, FileX, Mail, MessageSquare } from "lucide-react";

const TAB_CLASSES = "classes";
const TAB_RENTALS = "rentals";
const TAB_BONOS = "bonos";

const STATUS_OPTIONS = [
    { id: "all", label: "Todos" },
    { id: "pending", label: "Pendientes" },
    { id: "confirmed", label: "Confirmados" },
    { id: "rejected", label: "Rechazados" },
];

const LEGACY_MANUAL_METHODS = new Set(["bizum", "transferencia", "tienda"]);

function isStripeAutomatedFlow(row) {
    if (row?.is_stripe_automated === true || row?.payment_method === "card") {
        return true;
    }
    if (row?.status !== "pending") {
        return false;
    }
    if (row?.entity === "bono") {
        return !row?.has_proof && !row?.proof_url;
    }
    if (row?.proof_url || LEGACY_MANUAL_METHODS.has(row?.payment_method)) {
        return false;
    }
    return true;
}

function showManualValidationActions(row) {
    if (row?.status !== "pending" || isStripeAutomatedFlow(row)) {
        return false;
    }
    if (row?.entity === "bono") {
        return Boolean(row?.has_proof || row?.proof_url);
    }
    return Boolean(row?.proof_url) || LEGACY_MANUAL_METHODS.has(row?.payment_method);
}

function statusLabel(status) {
    if (status === "confirmed") return "Confirmado";
    if (status === "rejected") return "Rechazado";
    if (status === "pending") return "Pendiente";
    return String(status || "—");
}

function paymentStatusBadgeClass(status) {
    if (status === "confirmed") return "bg-emerald-900/35 text-emerald-100 ring-1 ring-emerald-600/30";
    if (status === "rejected") return "bg-rose-900/40 text-rose-100 ring-1 ring-rose-500/35";
    if (status === "pending") return "bg-amber-900/35 text-amber-100 ring-1 ring-amber-600/25";
    return "bg-gray-800 text-gray-200 ring-1 ring-gray-600/40";
}

function isRowNew(row) {
    return Boolean(row?.is_new);
}

const BONO_STATUS_OPTIONS = [
    { id: "all", label: "Todos" },
    { id: "pending_validation", label: "Pendientes de Validar" },
    { id: "pending_payment", label: "Pendientes de Pago" },
    { id: "confirmed", label: "Confirmados" },
    { id: "rejected", label: "Rechazados" },
];

function WhatsAppIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M12 2a10 10 0 0 0-8.7 14.95L2 22l5.2-1.36A10 10 0 1 0 12 2Zm0 18a7.9 7.9 0 0 1-4.02-1.1l-.29-.17-3.08.8.82-3-.19-.31A8 8 0 1 1 12 20Zm4.28-5.9c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.91-1.18-.7-.63-1.17-1.4-1.31-1.64-.14-.24-.01-.37.11-.49.1-.1.24-.26.36-.39.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.68 2.56 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
        </svg>
    );
}

function rowPaymentConfirmed(row) {
    return row?.status === "confirmed";
}

function rowPaymentRejected(row) {
    return row?.status === "rejected";
}

function rowHasRefundFlow(row) {
    if (row?.entity === "class") {
        return CANCELLED_ENROLLMENT.has(String(row?.enrollment_status || "")) && Boolean(row?.refund_status);
    }
    if (row?.entity === "rental") {
        const rentalCancelled = row?.booking_status === "cancelled";
        return rentalCancelled && Boolean(row?.refund_status);
    }
    return false;
}

function refundLabel(value) {
    return value === "completed" ? "Dev. realizada" : "Dev. pend";
}

function canManageRefund(row) {
    return rowHasRefundFlow(row);
}

const CANCELLED_ENROLLMENT = new Set([
    "cancelled",
    "cancelled_free",
    "cancelled_late_lost",
    "cancelled_late_rescued",
    "refunded",
]);

function hasCancellationJustification(row) {
    const notes = String(row?.admin_notes || "").trim();
    if (!notes) return false;
    if (row?.entity === "rental" && row?.booking_status === "cancelled") return true;
    if (row?.entity === "class" && CANCELLED_ENROLLMENT.has(String(row?.enrollment_status || ""))) return true;
    return false;
}

function buildRejectMessageTemplate(entity, row, whatsappDisplay) {
    const name = String(row?.user || row?.user_name || "cliente").trim();
    const wa = String(whatsappDisplay || "").trim() || "nuestro WhatsApp de contacto";
    const service =
        entity === "rental" ? "reserva de alquiler" : entity === "bono" ? "proceso de alta del bono VIP" : "clase";
    return `Hola ${name},\n\nPor ______________ hemos tenido que suspender la ${service}. Sentimos mucho las molestias.\n\nPara más información puede contactarnos por WhatsApp: ${wa}.`;
}

export default function GlobalDashboard({ payments = [], bonoPacks = [], filters = {}, counts = {} }) {
    const filterPillBase = "rounded-full px-3 py-1 text-xs font-semibold transition-colors";
    const filterPillBaseLg = "rounded-full px-4 py-2 text-sm font-semibold transition-colors";
    const filterPillActive = "bg-sky-600 text-white";
    const filterPillIdle = "bg-sky-900/40 text-sky-100 hover:bg-sky-800/50";
    const [tab, setTab] = useState(TAB_CLASSES);
    const [status, setStatus] = useState(filters.status || "all");
    const [bonoStatus, setBonoStatus] = useState(filters.bono_status || "all");
    const [bonoPackId, setBonoPackId] = useState(filters.bono_pack_id || "all");
    const [startDate, setStartDate] = useState(filters.start_date || "");
    const [endDate, setEndDate] = useState(filters.end_date || "");
    const [classModality, setClassModality] = useState("all");
    const [onlyPendingRefunds, setOnlyPendingRefunds] = useState(false);
    const [prioritizeUnreviewed, setPrioritizeUnreviewed] = useState(false);
    const [proofModal, setProofModal] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { entity: 'class'|'rental'|'bono', type: 'confirm'|'reject', row }
    const [rejectReason, setRejectReason] = useState("");
    const [processingAction, setProcessingAction] = useState(false);
    const [processingRefundKey, setProcessingRefundKey] = useState("");
    const [processingReview, setProcessingReview] = useState(false);
    const [toast, setToast] = useState(null);
    const [contactModal, setContactModal] = useState(null); // { channel, row }
    const [reviewModal, setReviewModal] = useState(null); // { entity, row }
    const [notesModal, setNotesModal] = useState(null); // { title, text }

    const academyWhatsappDisplay = usePage().props.academyWhatsappDisplay ?? "";

    const openRejectModal = (entity, row) => {
        setRejectReason(buildRejectMessageTemplate(entity, row, academyWhatsappDisplay));
        setPendingAction({ entity, type: "reject", row });
    };

    const closePendingModal = () => {
        setPendingAction(null);
        setRejectReason("");
    };

    useEffect(() => {
        setStatus(filters.status || "all");
        setBonoStatus(filters.bono_status || "all");
        setBonoPackId(filters.bono_pack_id || "all");
        setStartDate(filters.start_date || "");
        setEndDate(filters.end_date || "");
    }, [filters.status, filters.bono_status, filters.bono_pack_id, filters.start_date, filters.end_date]);

    const activeRows = useMemo(() => {
        let rows;
        if (tab === TAB_CLASSES) {
            rows = payments
                .filter((r) => r.entity === "class")
                .filter((r) => (classModality === "all" ? true : r.modality === classModality));
        } else if (tab === TAB_RENTALS) {
            rows = payments.filter((r) => r.entity === "rental");
        } else {
            rows = payments.filter((r) => r.entity === "bono");
        }

        let filteredRows = rows;
        if (onlyPendingRefunds && tab !== TAB_BONOS) {
            filteredRows = rows.filter((r) => rowHasRefundFlow(r) && r.refund_status === "pending");
        }

        if (!prioritizeUnreviewed) {
            return filteredRows;
        }

        return [...filteredRows].sort((a, b) => Number(Boolean(b?.is_new)) - Number(Boolean(a?.is_new)));
    }, [tab, payments, classModality, onlyPendingRefunds, prioritizeUnreviewed]);

    const applyFilters = ({ nextStatus = status, nextBonoStatus = bonoStatus, nextBonoPackId = bonoPackId, nextStartDate = startDate, nextEndDate = endDate } = {}) => {
        router.get(
            route("admin.payments.global"),
            {
                status: nextStatus,
                bono_status: nextBonoStatus,
                bono_pack_id: nextBonoPackId === "all" ? null : nextBonoPackId,
                start_date: nextStartDate || null,
                end_date: nextEndDate || null,
            },
            { preserveState: true, preserveScroll: true }
        );
    };

    const reloadStatus = (next) => {
        setStatus(next);
        applyFilters({ nextStatus: next });
    };

    const reloadBonoFilters = (nextStatus, nextPackId) => {
        setBonoStatus(nextStatus);
        setBonoPackId(nextPackId);
        applyFilters({ nextBonoStatus: nextStatus, nextBonoPackId: nextPackId });
    };

    const onChangeStartDate = (event) => {
        const next = event.target.value;
        setStartDate(next);
        applyFilters({ nextStartDate: next });
    };

    const onChangeEndDate = (event) => {
        const next = event.target.value;
        setEndDate(next);
        applyFilters({ nextEndDate: next });
    };

    const clearDateFilters = () => {
        setStartDate("");
        setEndDate("");
        applyFilters({ nextStartDate: "", nextEndDate: "" });
    };

    const showFlashToast = (page, successMessage, durationMs = 2800) => {
        const err = page?.props?.flash?.error;
        if (err) {
            setToast({ message: String(err), variant: "error" });
            setTimeout(() => setToast(null), 4200);
            return false;
        }
        setToast({ message: successMessage, variant: "success" });
        setTimeout(() => setToast(null), durationMs);
        return true;
    };

    const updateRefundStatus = (row, nextStatus) => {
        if (!row?.id || !rowHasRefundFlow(row)) return;
        const key = `${row.entity}-${row.id}`;
        setProcessingRefundKey(key);
        router.patch(route("admin.payments.refund-status"), {
            entity: row.entity,
            id: row.id,
            refund_status: nextStatus,
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const ok = showFlashToast(page, "Estado de devolución actualizado.", 2200);
                if (ok) {
                    router.reload({ only: ["payments", "counts", "adminStats"], preserveState: true, preserveScroll: true });
                }
            },
            onFinish: () => setProcessingRefundKey(""),
        });
    };

    const approveClass = (row) => {
        if (!row?.id || processingAction) return;
        if (rowPaymentConfirmed(row)) return;
        setProcessingAction(true);
        router.post(route("admin.academy.enrollments.confirm", row.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const ok = showFlashToast(page, `Pago confirmado para ${row.user}.`);
                closePendingModal();
                if (ok) {
                    router.reload({ only: ["payments", "counts", "adminStats"], preserveState: true, preserveScroll: true });
                }
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const rejectClass = (row) => {
        if (!row?.id || processingAction) return;
        if (rowPaymentRejected(row)) return;
        setProcessingAction(true);
        router.post(route("admin.academy.enrollments.reject", row.id), { admin_notes: rejectReason.trim() || "Rechazado desde panel unificado." }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const ok = showFlashToast(page, `Pago rechazado para ${row.user}.`);
                closePendingModal();
                if (ok) {
                    router.reload({ only: ["payments", "counts", "adminStats"], preserveState: true, preserveScroll: true });
                }
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const approveRental = (row) => {
        if (!row?.id || processingAction) return;
        if (rowPaymentConfirmed(row)) return;
        setProcessingAction(true);
        router.post(route("admin.bookings.approve-proof", row.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const ok = showFlashToast(page, `Pago confirmado para ${row.user}.`);
                closePendingModal();
                if (ok) {
                    router.reload({ only: ["payments", "counts", "adminStats"], preserveState: true, preserveScroll: true });
                }
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const rejectRental = (row) => {
        if (!row?.id || processingAction) return;
        if (rowPaymentRejected(row)) return;
        setProcessingAction(true);
        router.post(route("admin.bookings.reject-proof", row.id), { admin_notes: rejectReason.trim() || "Rechazado desde panel unificado." }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const ok = showFlashToast(page, `Pago rechazado para ${row.user}.`);
                closePendingModal();
                if (ok) {
                    router.reload({ only: ["payments", "counts", "adminStats"], preserveState: true, preserveScroll: true });
                }
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const approveBono = (row) => {
        if (!row?.id || processingAction) return;
        if (rowPaymentConfirmed(row)) return;
        setProcessingAction(true);
        router.post(route("admin.payment-validation.confirm", row.id), {}, {
            preserveScroll: true,
            onSuccess: (page) => {
                const ok = showFlashToast(page, `Pago confirmado para ${row.user}. Clases activadas correctamente.`, 3200);
                closePendingModal();
                if (ok) {
                    router.reload({ only: ["payments", "counts", "adminStats"], preserveState: true, preserveScroll: true });
                }
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const rejectBono = (row) => {
        if (!row?.id || processingAction) return;
        if (rowPaymentRejected(row)) return;
        setProcessingAction(true);
        router.post(route("admin.payment-validation.reject", row.id), { reason: rejectReason.trim() || "Rechazado desde panel unificado." }, {
            preserveScroll: true,
            onSuccess: (page) => {
                const ok = showFlashToast(page, `Pago rechazado para ${row.user}. Estado actualizado.`, 3200);
                closePendingModal();
                if (ok) {
                    router.reload({ only: ["payments", "counts", "adminStats"], preserveState: true, preserveScroll: true });
                }
            },
            onFinish: () => setProcessingAction(false),
        });
    };

    const confirmPendingAction = () => {
        if (!pendingAction?.row) return;
        if (rowPaymentConfirmed(pendingAction.row)) return;
        if (pendingAction.entity === "class") return approveClass(pendingAction.row);
        if (pendingAction.entity === "rental") return approveRental(pendingAction.row);
        return approveBono(pendingAction.row);
    };

    const rejectPendingAction = () => {
        if (!pendingAction?.row) return;
        if (rowPaymentRejected(pendingAction.row)) return;
        if (pendingAction.entity === "class") return rejectClass(pendingAction.row);
        if (pendingAction.entity === "rental") return rejectRental(pendingAction.row);
        return rejectBono(pendingAction.row);
    };

    const openReviewModal = (row) => {
        if (!isRowNew(row)) return;
        setReviewModal({ entity: row.entity, row });
    };

    const confirmMarkReviewed = () => {
        if (!reviewModal?.row?.id || !reviewModal?.entity || processingReview) return;
        setProcessingReview(true);
        router.patch(route("admin.payments.reviewed"), {
            entity: reviewModal.entity,
            id: reviewModal.row.id,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setReviewModal(null);
                setToast({ message: "Marca de pendiente retirada.", variant: "success" });
                setTimeout(() => setToast(null), 2200);
                router.reload({ only: ["adminStats", "payments"], preserveState: true, preserveScroll: true });
            },
            onFinish: () => setProcessingReview(false),
        });
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

    const classCount = payments
        .filter((r) => r.entity === "class")
        .filter((r) => (classModality === "all" ? true : r.modality === classModality))
        .length;
    const rentalCount = payments.filter((r) => r.entity === "rental").length;
    const bonoCount = payments.filter((r) => r.entity === "bono").length;

    const tabBadge = {
        classes: classCount,
        rentals: rentalCount,
        bonos: bonoCount,
    };

    return (
        <>
            <Head title="Pagos · Dashboard Global" />
            <div className="mx-auto max-w-7xl space-y-5 p-6 text-gray-200">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold text-white">Pagos · Dashboard Global</h1>
                    <span className="rounded-full bg-red-900/50 px-3 py-1 text-xs font-bold text-red-200 ring-1 ring-red-500/40">
                        Pendientes: {tabBadge.classes + tabBadge.rentals + tabBadge.bonos}
                    </span>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setTab(TAB_CLASSES)} className={`${filterPillBaseLg} ${tab === TAB_CLASSES ? filterPillActive : filterPillIdle}`}>
                        Clases ({tabBadge.classes})
                    </button>
                    <button type="button" onClick={() => setTab(TAB_RENTALS)} className={`${filterPillBaseLg} ${tab === TAB_RENTALS ? filterPillActive : filterPillIdle}`}>
                        Alquileres ({tabBadge.rentals})
                    </button>
                    <button type="button" onClick={() => setTab(TAB_BONOS)} className={`${filterPillBaseLg} ${tab === TAB_BONOS ? filterPillActive : filterPillIdle}`}>
                        Bonos VIP ({tabBadge.bonos})
                    </button>
                    {tab !== TAB_BONOS ? (
                        <button
                            type="button"
                            onClick={() => setOnlyPendingRefunds((prev) => !prev)}
                            className={`${filterPillBaseLg} ${onlyPendingRefunds ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-100 hover:bg-gray-700"}`}
                        >
                            {onlyPendingRefunds ? "Solo dev. pendientes (ON)" : "Solo dev. pendientes"}
                        </button>
                    ) : null}
                </div>

                {tab !== TAB_BONOS ? (
                    <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => (
                            <button
                                key={s.id}
                                type="button"
                                onClick={() => reloadStatus(s.id)}
                                className={`${filterPillBase} ${status === s.id ? filterPillActive : filterPillIdle}`}
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
                                    className={`${filterPillBase} ${bonoStatus === s.id ? filterPillActive : filterPillIdle}`}
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
                                className={`${filterPillBase} ${bonoPackId === "all" ? filterPillActive : filterPillIdle}`}
                            >
                                Todos los bonos
                            </button>
                            {bonoPacks.map((pack) => (
                                <button
                                    key={pack.id}
                                    type="button"
                                    onClick={() => reloadBonoFilters(bonoStatus, pack.id)}
                                    className={`${filterPillBase} ${Number(bonoPackId) === Number(pack.id) ? filterPillActive : filterPillIdle}`}
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
                                className={`${filterPillBase} ${classModality === m.id ? filterPillActive : filterPillIdle}`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-700 bg-gray-900/70 p-3">
                    <div className="min-w-[180px]">
                        <label htmlFor="start-date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
                            Inicio
                        </label>
                        <input
                            id="start-date"
                            type="date"
                            value={startDate}
                            onChange={onChangeStartDate}
                            className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-sky-500"
                        />
                    </div>
                    <div className="min-w-[180px]">
                        <label htmlFor="end-date" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
                            Fin
                        </label>
                        <input
                            id="end-date"
                            type="date"
                            value={endDate}
                            onChange={onChangeEndDate}
                            className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-sky-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={clearDateFilters}
                        className="rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700"
                    >
                        Limpiar filtros
                    </button>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-900">
                    <div className="max-h-[68vh] overflow-auto">
                        <table className="min-w-full text-sm">
                            <thead className="sticky top-0 bg-gray-800 text-gray-200">
                                <tr>
                                    <th className="w-10 px-2 py-3 text-left" aria-label="Orden por pendientes">
                                        <button
                                            type="button"
                                            onClick={() => setPrioritizeUnreviewed((prev) => !prev)}
                                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
                                                prioritizeUnreviewed
                                                    ? "border-red-400/60 bg-red-900/20 text-red-200"
                                                    : "border-gray-600 bg-gray-800 text-gray-300 hover:bg-gray-700"
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
                                    <th className="px-4 py-3 text-left">Usuario</th>
                                    <th className="px-4 py-3 text-left">Detalle</th>
                                    <th className="px-4 py-3 text-left">Fecha</th>
                                    <th className="px-4 py-3 text-left">Importe</th>
                                    <th className="px-4 py-3 text-left">Estado</th>
                                    <th className="px-4 py-3 text-left">Devolución</th>
                                    <th className="px-4 py-3 text-left">Justificante</th>
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="px-4 py-8 text-center text-gray-400">Sin resultados para este filtro.</td>
                                    </tr>
                                ) : activeRows.map((row) => (
                                    <tr
                                        key={row.id}
                                        className="border-t border-gray-700 text-gray-100"
                                    >
                                        <td className="px-2 py-3">
                                            {isRowNew(row) ? (
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        openReviewModal(row);
                                                    }}
                                                    className="mx-auto block rounded-full"
                                                    title="Pago nuevo pendiente de revisión"
                                                    aria-label="Pago nuevo"
                                                >
                                                    <span className="block h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.25)]" />
                                                </button>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-gray-100">{row.user}</td>
                                        <td className="px-4 py-3 text-gray-200">
                                            {tab === TAB_CLASSES ? `${row.lesson_name || "Clase"} · ${row.modality || "grupal"}` : null}
                                            {tab === TAB_RENTALS ? (row.rental_name || "Alquiler") : null}
                                            {tab === TAB_BONOS ? `${row.pack || "Bono"} (${row.num_clases || 0} clases)` : null}
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">{row.created_at_human || row.date_human || "—"}</td>
                                        <td className="px-4 py-3 font-semibold text-white">
                                            <span>{Number(row.amount || 0).toFixed(2)} €</span>
                                            {tab === TAB_RENTALS && Number(row.deposit_amount || 0) > 0 ? (
                                                <span className="mt-0.5 block text-xs font-normal text-gray-400">
                                                    Señal {Number(row.deposit_amount || 0).toFixed(2)} €
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-3 text-gray-200">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(row.status)}`}>
                                                    {statusLabel(row.status)}
                                                </span>
                                                {(hasCancellationJustification(row) || row.status === "rejected") && String(row.admin_notes || "").trim() ? (
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setNotesModal({
                                                                title: hasCancellationJustification(row)
                                                                    ? "Justificación de la cancelación"
                                                                    : "Motivo del rechazo",
                                                                text: String(row.admin_notes).trim(),
                                                            });
                                                        }}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-amber-100 ring-1 ring-gray-500/50 hover:bg-gray-600"
                                                        title={hasCancellationJustification(row) ? "Ver justificación" : "Ver motivo del rechazo"}
                                                        aria-label={hasCancellationJustification(row) ? "Ver justificación de la cancelación" : "Ver motivo del rechazo"}
                                                    >
                                                        <MessageSquare className="h-4 w-4" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-200" onClick={(event) => event.stopPropagation()}>
                                            {canManageRefund(row) ? (
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.refund_status === "completed" ? "bg-emerald-900/35 text-emerald-100 ring-1 ring-emerald-600/30" : "bg-amber-900/35 text-amber-100 ring-1 ring-amber-600/25"}`}>
                                                        {refundLabel(row.refund_status)}
                                                    </span>
                                                    <select
                                                        value={row.refund_status}
                                                        onChange={(event) => updateRefundStatus(row, event.target.value)}
                                                        disabled={processingRefundKey === `${row.entity}-${row.id}`}
                                                        className="rounded-md border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-gray-100 disabled:opacity-60"
                                                    >
                                                        <option value="pending">Pendiente.dev</option>
                                                        <option value="completed">Dev. realizada</option>
                                                    </select>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-500">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-gray-200" onClick={(event) => event.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (row.proof_url) setProofModal(row.proof_url);
                                                }}
                                                disabled={!row.proof_url}
                                                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ring-1 transition ${
                                                    row.proof_url
                                                        ? "bg-gray-700 text-sky-100 ring-gray-500/50 hover:bg-gray-600"
                                                        : "cursor-not-allowed bg-gray-800 text-gray-500 ring-gray-700/70"
                                                }`}
                                                title={row.proof_url ? "Ver comprobante" : "Sin comprobante subido"}
                                                aria-label={row.proof_url ? "Ver comprobante" : "Sin comprobante subido"}
                                            >
                                                {row.proof_url ? <FileText className="h-4 w-4" /> : <FileX className="h-4 w-4" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                                            <div className="flex justify-end gap-2">
                                                {(row.phone || row.email) ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setContactModal({ channel: "whatsapp", row })}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow transition-all hover:scale-105 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/70"
                                                            title="Contactar por WhatsApp"
                                                        >
                                                            <WhatsAppIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setContactModal({ channel: "email", row })}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow transition-all hover:scale-105 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                                                            title="Enviar Email"
                                                        >
                                                            <Mail className="h-3.5 w-3.5" />
                                                        </button>
                                                    </>
                                                ) : null}
                                                {isStripeAutomatedFlow(row) && row.status === "pending" ? (
                                                    <span
                                                        className="inline-flex items-center gap-1 rounded-lg bg-violet-900/40 px-2.5 py-1 text-xs font-semibold text-violet-100 ring-1 ring-violet-500/30"
                                                        title="Confirmación automática vía webhook Stripe"
                                                    >
                                                        <CreditCard className="h-3.5 w-3.5" />
                                                        Stripe
                                                    </span>
                                                ) : null}
                                                {showManualValidationActions(row) && tab === TAB_CLASSES ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "class", type: "confirm", row })}
                                                            disabled={processingAction || rowPaymentConfirmed(row)}
                                                            title={rowPaymentConfirmed(row) ? "El pago ya está confirmado" : undefined}
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "confirm" ? "..." : "Aprobar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openRejectModal("class", row)}
                                                            disabled={processingAction || rowPaymentRejected(row)}
                                                            title={rowPaymentRejected(row) ? "El pago ya está rechazado" : undefined}
                                                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "reject" ? "..." : "Rechazar"}
                                                        </button>
                                                    </>
                                                ) : null}
                                                {showManualValidationActions(row) && tab === TAB_RENTALS ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "rental", type: "confirm", row })}
                                                            disabled={processingAction || rowPaymentConfirmed(row)}
                                                            title={rowPaymentConfirmed(row) ? "El pago ya está confirmado" : undefined}
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "confirm" ? "..." : "Aprobar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openRejectModal("rental", row)}
                                                            disabled={processingAction || rowPaymentRejected(row)}
                                                            title={rowPaymentRejected(row) ? "El pago ya está rechazado" : undefined}
                                                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "reject" ? "..." : "Rechazar"}
                                                        </button>
                                                    </>
                                                ) : null}
                                                {showManualValidationActions(row) && tab === TAB_BONOS ? (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPendingAction({ entity: "bono", type: "confirm", row })}
                                                            disabled={processingAction || rowPaymentConfirmed(row)}
                                                            title={rowPaymentConfirmed(row) ? "El bono ya está confirmado" : undefined}
                                                            className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                                                        >
                                                            {processingAction && pendingAction?.row?.id === row.id && pendingAction?.type === "confirm" ? "..." : "Confirmar"}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => openRejectModal("bono", row)}
                                                            disabled={processingAction || rowPaymentRejected(row)}
                                                            title={rowPaymentRejected(row) ? "El bono ya está rechazado" : undefined}
                                                            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
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
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={closePendingModal}>
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
                                    <button type="button" onClick={closePendingModal} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                                    <button
                                        type="button"
                                        onClick={confirmPendingAction}
                                        disabled={processingAction || rowPaymentConfirmed(pendingAction.row)}
                                        className="rounded-lg bg-emerald-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        {processingAction ? "Procesando..." : "Confirmar"}
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-lg font-bold text-slate-900">
                                    Rechazar pago de {pendingAction.entity === "bono" ? "bono" : pendingAction.entity === "rental" ? "alquiler" : "clase"}
                                </p>
                                <p className="text-sm text-slate-700">¿Deseas rechazar este pago? Puedes editar el texto (se ha rellenado una plantilla con el nombre y el contacto).</p>
                                <textarea
                                    className="w-full rounded-xl border border-slate-300 px-3 py-2"
                                    rows={6}
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                />
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={closePendingModal} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">Cancelar</button>
                                    <button
                                        type="button"
                                        onClick={rejectPendingAction}
                                        disabled={processingAction || rowPaymentRejected(pendingAction.row)}
                                        className="rounded-lg bg-rose-600 px-3 py-1 text-white disabled:cursor-not-allowed disabled:opacity-40"
                                    >
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
                <div
                    className={`fixed right-4 top-24 z-50 max-w-sm rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${
                        toast.variant === "error" ? "bg-rose-600" : "bg-emerald-600"
                    }`}
                >
                    {toast.message}
                </div>
            ) : null}
            {notesModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setNotesModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-lg font-bold text-slate-900">{notesModal.title}</p>
                        <p className="whitespace-pre-wrap text-sm text-slate-700">{notesModal.text}</p>
                        <div className="flex justify-end">
                            <button type="button" onClick={() => setNotesModal(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {reviewModal ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setReviewModal(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-white p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <p className="text-lg font-bold text-slate-900">Retirar marca de pendiente</p>
                        <p className="text-sm text-slate-700">
                            ¿Desea retirar la marca de pendiente para <strong>{reviewModal.row?.user || "este pago"}</strong>?
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setReviewModal(null)}
                                disabled={processingReview}
                                className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700 disabled:opacity-60"
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={confirmMarkReviewed}
                                disabled={processingReview}
                                className="rounded-lg bg-emerald-600 px-3 py-1 text-white disabled:opacity-60"
                            >
                                {processingReview ? "Procesando..." : "Sí"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </>
    );
}

