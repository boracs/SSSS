import { useEffect, useMemo, useState } from "react";
import Layout1 from "@/layouts/Layout1";
import { router, usePage } from "@inertiajs/react";
import ManualPaymentInstructionsModal from "@/components/ManualPaymentInstructionsModal";

function fmt(v) {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("es-ES");
}

function paymentMethodLabel(row) {
    if (row?.status === "rejected") return "Fallido";
    if (row?.status === "pending") return "Pendiente";
    const method = String(row?.payment_method || "").toLowerCase();
    if (method === "transferencia" || method === "bizum") return "Transferencia";
    if (method === "tienda") return "Cortesía";
    if (method === "domiciliado") return "Domiciliado";
    return "Pendiente";
}

function paymentStatusPill(status) {
    if (status === "confirmed") return "bg-emerald-100 text-emerald-700";
    if (status === "rejected") return "bg-rose-100 text-rose-700";
    return "bg-amber-100 text-amber-700";
}

function paymentStatusLabel(status) {
    if (status === "confirmed") return "Confirmado";
    if (status === "rejected") return "Rechazado";
    return "Pendiente";
}

export default function PlanesTaquillasClient({
    planes = [],
    userData = {},
    paymentIban = "[IBAN]",
    paymentBizumNumber = "[BIZUM_NUMBER]",
    whatsappHelpUrl = null,
}) {
    const { flash } = usePage().props;
    const [planId, setPlanId] = useState("");
    const [renewalRef, setRenewalRef] = useState("");
    const [toast, setToast] = useState(null);
    const [proofModalUrl, setProofModalUrl] = useState(null);
    /** null | { kind: 'renew' } | { kind: 'pending', pagoId: number } */
    const [payModal, setPayModal] = useState(null);

    useEffect(() => {
        if (!flash?.success) return;
        setToast(flash.success);
        const t = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(t);
    }, [flash?.success]);

    const dueDateRaw = userData?.vencimiento_cuota || userData?.ultimo_plan_fin || null;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysToDue = dueDate ? Math.ceil((dueDate.setHours(0, 0, 0, 0) - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / msPerDay) : null;
    const daysDebt = typeof daysToDue === "number" && daysToDue < 0 ? Math.abs(daysToDue) : 0;

    const statusLabel = useMemo(() => {
        if (dueDate && daysDebt === 0) return { text: "ACTIVA", cls: "bg-emerald-100 text-emerald-700" };
        return { text: "VENCIDA", cls: "bg-rose-100 text-rose-700" };
    }, [dueDate, daysDebt]);

    const pendingRows = (userData?.historial_pagos || []).filter((p) => p.status === "pending");
    const allPaymentRows = useMemo(
        () => (userData?.historial_pagos || []),
        [userData?.historial_pagos],
    );

    const selectedPlan = useMemo(() => planes.find((p) => String(p.id) === String(planId)), [planes, planId]);

    const pendingTarget = useMemo(() => {
        if (payModal?.kind !== "pending") return null;
        return pendingRows.find((r) => r.id === payModal.pagoId) || null;
    }, [payModal, pendingRows]);

    const submitTaquillaPayment = async ({ proofFile, paymentMethod }) => {
        if (!payModal) throw new Error("modal");
        if (payModal.kind === "renew") {
            if (!planId) throw new Error("plan");
            const fd = new FormData();
            fd.append("plan_id", planId);
            if (renewalRef.trim()) fd.append("referencia_pago_externa", renewalRef.trim());
            fd.append("proof", proofFile);
            fd.append("payment_method", paymentMethod);
            await new Promise((resolve, reject) => {
                router.post(route("taquillas.pago.client"), fd, {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => resolve(),
                    onError: () => reject(new Error("renew")),
                });
            });
            return;
        }
        await new Promise((resolve, reject) => {
            router.post(
                route("taquillas.pago.upload-proof", payModal.pagoId),
                { proof: proofFile, payment_method: paymentMethod },
                {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => resolve(),
                    onError: () => reject(new Error("proof")),
                },
            );
        });
    };

    const totalPrimaryLine = useMemo(() => {
        if (payModal?.kind === "renew" && selectedPlan) {
            return `Total a pagar: ${Number(selectedPlan.precio_total).toFixed(2).replace(".", ",")} €`;
        }
        if (payModal?.kind === "pending" && pendingTarget?.monto_pagado != null && Number(pendingTarget.monto_pagado) > 0) {
            return `Importe: ${Number(pendingTarget.monto_pagado).toFixed(2).replace(".", ",")} €`;
        }
        return null;
    }, [payModal, selectedPlan, pendingTarget]);

    const secondaryNote =
        payModal?.kind === "pending"
            ? "Este pago sigue pendiente de verificación. Sube el comprobante para que el equipo lo valide."
            : "Tu renovación quedará pendiente hasta que el administrador confirme el pago.";

    return (
        <Layout1>
            <div className="mx-auto max-w-6xl space-y-6 p-6">
                <h1 className="text-2xl font-bold text-slate-900">Portal de Taquilla</h1>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm text-slate-500">Estado de tu taquilla</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusLabel.cls}`}>{statusLabel.text}</span>
                        <span className="text-sm text-slate-600">Taquilla #{userData?.numero_taquilla || "-"}</span>
                        <span className="text-sm text-slate-600">Vence: {fmt(dueDateRaw)}</span>
                        {daysDebt > 0 ? <span className="text-sm font-semibold text-rose-600">Debe {daysDebt} días</span> : null}
                    </div>
                    <div className="mt-3 max-w-md">
                        <div className="h-2 w-full rounded-full bg-slate-200">
                            <div
                                className={`h-2 rounded-full ${daysDebt > 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                                style={{ width: `${Math.max(8, Math.min(100, daysDebt > 0 ? daysDebt : Math.max(0, Number(userData?.dias_restantes || 0))))}%` }}
                            />
                        </div>
                        <p className={`mt-1 text-xs ${daysDebt > 0 ? "text-rose-600" : "text-slate-500"}`}>
                            {daysDebt > 0 ? `Venció el ${fmt(dueDateRaw)} · ${daysDebt} días a deber` : "Plan vigente"}
                        </p>
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Renovar (Locker Plans)</h2>
                    <p className="text-sm text-slate-600">Elige un plan y abre las instrucciones de pago para enviar el justificante en el mismo paso.</p>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {planes.map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => setPlanId(String(p.id))}
                                className={`rounded-2xl border p-4 text-left shadow-sm transition ${String(planId) === String(p.id) ? "border-sky-500 bg-sky-50" : "border-slate-200 bg-white hover:shadow-md"}`}
                            >
                                <p className="font-semibold text-slate-900">{p.nombre}</p>
                                <p className="text-sm text-slate-600">{Number(p.precio_total).toFixed(2)} €</p>
                                <p className="text-xs text-slate-500">{Math.round(Number(p.duracion_dias || 0) / 30)} meses</p>
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        disabled={!planId}
                        onClick={() => setPayModal({ kind: "renew" })}
                        className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {planId ? "Instrucciones de pago y justificante" : "Selecciona un plan"}
                    </button>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-slate-500">Pagos registrados</h2>
                    {allPaymentRows.length === 0 ? (
                        <p className="text-sm text-slate-500">Aún no tienes pagos registrados.</p>
                    ) : (
                        <div className="overflow-auto rounded-xl border border-slate-200">
                            <table className="min-w-full text-xs sm:text-sm">
                                <thead className="bg-slate-100 text-slate-700">
                                    <tr>
                                        <th className="px-3 py-2 text-left">Plan</th>
                                        <th className="px-3 py-2 text-left">Periodo</th>
                                        <th className="px-3 py-2 text-left">Estado</th>
                                        <th className="px-3 py-2 text-left">Pago</th>
                                        <th className="px-3 py-2 text-left">Comprobado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {allPaymentRows.map((r) => (
                                        <tr key={r.id} className="border-t border-slate-100">
                                            <td className="px-3 py-2 font-medium text-slate-900">{r.plan?.nombre || "Plan"}</td>
                                            <td className="px-3 py-2 font-medium text-slate-900">{fmt(r.periodo_inicio)} - {fmt(r.periodo_fin)}</td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusPill(r.status)}`}>
                                                    {paymentStatusLabel(r.status)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-800">{paymentMethodLabel(r)}</span>
                                                    {paymentMethodLabel(r) === "Transferencia" ? (
                                                        r.proof_url ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setProofModalUrl(r.proof_url)}
                                                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                                            >
                                                                Justificante
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Sin justificante</span>
                                                        )
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${r.is_checked ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                                                    {r.is_checked ? "Sí" : "No"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            <ManualPaymentInstructionsModal
                open={payModal != null}
                onClose={() => setPayModal(null)}
                bizumNumber={paymentBizumNumber}
                iban={paymentIban}
                whatsappHelpUrl={whatsappHelpUrl}
                showDepositNotice={false}
                useReservationStepsHeading={false}
                totalPrimaryLine={totalPrimaryLine}
                secondaryNote={secondaryNote}
                uploadIntro="Sube tu comprobante en imagen (incluida captura/foto de móvil) o en PDF. Tamaño máximo permitido: 10 MB."
                extraFormSlot={
                    payModal?.kind === "renew" ? (
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wide text-white/70">Referencia (opcional)</label>
                            <input
                                value={renewalRef}
                                onChange={(e) => setRenewalRef(e.target.value)}
                                placeholder="Concepto o referencia del ingreso"
                                className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                            />
                        </div>
                    ) : null
                }
                onSubmit={submitTaquillaPayment}
                onAfterSuccessSubmit={() => {
                    setPlanId("");
                    setRenewalRef("");
                    router.reload({ only: ["userData", "planes", "flash"] });
                }}
                successSubtitle="Gracias. Validaremos el comprobante lo antes posible."
                whatsappMessageBuilder={() =>
                    payModal?.kind === "pending"
                        ? "Hola, necesito ayuda para subir el justificante de un pago de taquilla pendiente."
                        : "Hola, tengo una duda con el pago de renovación de mi taquilla."
                }
            />

            {toast ? (
                <div className="fixed right-4 top-24 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">{toast}</div>
            ) : null}

            {proofModalUrl ? (
                <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4" onClick={() => setProofModalUrl(null)}>
                    <div className="w-full max-w-5xl rounded-2xl bg-white p-4" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-2 flex justify-end">
                            <button
                                type="button"
                                className="rounded-md bg-slate-200 px-3 py-1 text-slate-700 hover:bg-slate-300"
                                onClick={() => setProofModalUrl(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <iframe title="Justificante de pago" src={proofModalUrl} className="h-[75vh] w-full rounded-lg" />
                    </div>
                </div>
            ) : null}
        </Layout1>
    );
}
