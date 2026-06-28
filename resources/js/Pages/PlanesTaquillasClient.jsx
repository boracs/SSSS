import { useEffect, useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import {
    Bath,
    CheckCircle2,
    Dumbbell,
    ExternalLink,
    Lock,
    Percent,
    Shirt,
    Sparkles,
    Waves,
    Wrench,
} from "lucide-react";
import ManualPaymentInstructionsModal from "@/components/ManualPaymentInstructionsModal";
import { formatEur } from "@/utils/money";

const MICRO_SERVICIOS_URL = "/nosotros#micro-servicios-club";

const CLUB_AMENITIES = [
    { icon: Shirt, label: "2 trajes de neopreno", detail: "Secado rápido en instalaciones del club" },
    { icon: Waves, label: "2 tablas en rack", detail: "Almacenamiento seguro a pie de playa" },
    { icon: Lock, label: "1 taquilla privada", detail: "Tu espacio personal antes y después de surfear" },
    { icon: Bath, label: "Baños y duchas", detail: "Acceso a instalaciones del local" },
    { icon: Dumbbell, label: "Zona de calentamiento", detail: "TRX, foam rollers y preparación pre-sesión" },
    { icon: Percent, label: "Megadescuentos en tienda", detail: "Hasta 50% en artículos para socios" },
    { icon: Wrench, label: "Reparación de tablas", detail: "Servicio automatizado con seguimiento semanal" },
    { icon: Sparkles, label: "+14 micro-servicios", detail: "WiFi, cafetera, frigorífico, cargadores y más" },
];

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
    const [payModal, setPayModal] = useState(null);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);

    useEffect(() => {
        if (!flash?.success) return;
        setToast(flash.success);
        const t = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(t);
    }, [flash?.success]);

    useEffect(() => {
        if (!flash?.error) return;
        setToast(flash.error);
        const t = window.setTimeout(() => setToast(null), 4200);
        return () => window.clearTimeout(t);
    }, [flash?.error]);

    const dueDateRaw = userData?.vencimiento_cuota || userData?.ultimo_plan_fin || null;
    const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
    const today = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysToDue = dueDate
        ? Math.ceil(
              (dueDate.setHours(0, 0, 0, 0) -
                  new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
                  msPerDay,
          )
        : null;
    const daysDebt = typeof daysToDue === "number" && daysToDue < 0 ? Math.abs(daysToDue) : 0;

    const statusLabel = useMemo(() => {
        if (dueDate && daysDebt === 0) return { text: "ACTIVA", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" };
        return { text: "VENCIDA", cls: "bg-rose-500/15 text-rose-300 ring-rose-400/30" };
    }, [dueDate, daysDebt]);

    const pendingRows = (userData?.historial_pagos || []).filter((p) => p.status === "pending");
    const allPaymentRows = useMemo(() => userData?.historial_pagos || [], [userData?.historial_pagos]);
    const selectedPlan = useMemo(() => planes.find((p) => String(p.id) === String(planId)), [planes, planId]);

    const pendingTarget = useMemo(() => {
        if (payModal?.kind !== "pending") return null;
        return pendingRows.find((r) => r.id === payModal.pagoId) || null;
    }, [payModal, pendingRows]);

    const submitTaquillaPayment = async ({ proofFile, paymentMethod }) => {
        if (!payModal || paymentSubmitting) throw new Error("busy");
        setPaymentSubmitting(true);
        try {
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
                        onFinish: () => setPaymentSubmitting(false),
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
                        onFinish: () => setPaymentSubmitting(false),
                    },
                );
            });
        } catch (err) {
            setPaymentSubmitting(false);
            throw err;
        }
    };

    const totalPrimaryLine = useMemo(() => {
        if (payModal?.kind === "renew" && selectedPlan) {
            return `Total a pagar: ${formatEur(selectedPlan.precio_total)}`;
        }
        if (
            payModal?.kind === "pending" &&
            pendingTarget?.monto_pagado != null &&
            Number(pendingTarget.monto_pagado) > 0
        ) {
            return `Importe: ${formatEur(pendingTarget.monto_pagado)}`;
        }
        return null;
    }, [payModal, selectedPlan, pendingTarget]);

    const secondaryNote =
        payModal?.kind === "pending"
            ? "Este pago sigue pendiente de verificación. Sube el comprobante para que el equipo lo valide."
            : "Tu renovación quedará pendiente hasta que el administrador confirme el pago.";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2a33] to-slate-950 text-white">
            <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
                {/* Hero */}
                <header className="rounded-3xl border border-cyan-900/40 bg-[#0f5f74]/30 p-6 sm:p-8">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/80">Club de socios S4</p>
                    <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Planes y cuotas</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
                        Ser socio no es solo pagar una cuota: es acceder a un ecosistema completo a pie de Zurriola.
                        Elige el plan que mejor encaje con tu rutina y disfruta de taquilla, material, instalaciones
                        premium y ventajas exclusivas en la tienda.
                    </p>
                    <Link
                        href={MICRO_SERVICIOS_URL}
                        className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
                    >
                        Ver más micro-servicios del club
                        <ExternalLink className="h-4 w-4" />
                    </Link>
                </header>

                {/* Estado taquilla */}
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tu membresía</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusLabel.cls}`}>
                            {statusLabel.text}
                        </span>
                        <span className="text-sm text-slate-300">Taquilla #{userData?.numero_taquilla || "—"}</span>
                        <span className="text-sm text-slate-300">Vence: {fmt(dueDateRaw)}</span>
                        {daysDebt > 0 ? (
                            <span className="text-sm font-semibold text-rose-400">Debe {daysDebt} días</span>
                        ) : null}
                    </div>
                    {userData?.plan_vigente?.nombre ? (
                        <p className="mt-2 text-sm text-cyan-200/90">
                            Plan vigente: <strong className="text-white">{userData.plan_vigente.nombre}</strong>
                        </p>
                    ) : null}
                </section>

                {/* Qué incluye todos los planes */}
                <section>
                    <h2 className="text-lg font-bold text-white sm:text-xl">Qué incluye tu plan de socio</h2>
                    <p className="mt-1 text-sm text-slate-400">
                        Todos los planes desbloquean el pack completo del club. La diferencia está en la duración y el precio.
                    </p>
                    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {CLUB_AMENITIES.map(({ icon: Icon, label, detail }) => (
                            <div
                                key={label}
                                className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                            >
                                <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                                <div>
                                    <p className="text-sm font-semibold text-white">{label}</p>
                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-center">
                        <Link
                            href={MICRO_SERVICIOS_URL}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline"
                        >
                            Ver más sobre instalaciones y micro-servicios
                            <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </section>

                {/* Planes */}
                <section className="space-y-5">
                    <div>
                        <h2 className="text-lg font-bold text-white sm:text-xl">Elige tu plan</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Selecciona un plan y continúa con las instrucciones de pago para enviar tu justificante.
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {planes.map((p) => {
                            const selected = String(planId) === String(p.id);
                            return (
                                <article
                                    key={p.id}
                                    className={`flex flex-col rounded-2xl border p-5 transition ${
                                        selected
                                            ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-950/30"
                                            : "border-white/10 bg-white/5 hover:border-white/20"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">
                                                {p.periodo_label}
                                            </p>
                                            <h3 className="text-base font-bold leading-snug text-white">{p.nombre}</h3>
                                        </div>
                                        {p.es_vip ? (
                                            <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-200">
                                                VIP
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-3 text-3xl font-extrabold text-emerald-300">
                                        {formatEur(p.precio_total)}
                                    </p>
                                    <p className="text-sm text-slate-400">{p.periodo_sub}</p>
                                    {p.descripcion ? (
                                        <p className="mt-2 text-xs leading-relaxed text-slate-500">{p.descripcion}</p>
                                    ) : null}

                                    <ul className="mt-4 flex-1 space-y-2 border-t border-white/10 pt-4">
                                        {(p.beneficios || []).map((beneficio) => (
                                            <li key={beneficio} className="flex items-start gap-2 text-xs text-slate-300">
                                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                                {beneficio}
                                            </li>
                                        ))}
                                    </ul>

                                    <div className="mt-4 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setPlanId(String(p.id))}
                                            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                                                selected
                                                    ? "bg-cyan-500 text-white"
                                                    : "bg-white/10 text-white hover:bg-white/15"
                                            }`}
                                        >
                                            {selected ? "Plan seleccionado" : "Seleccionar plan"}
                                        </button>
                                        <Link
                                            href={MICRO_SERVICIOS_URL}
                                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-cyan-200/90 transition hover:bg-white/5"
                                        >
                                            Ver más
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        disabled={!planId || paymentSubmitting}
                        onClick={() => setPayModal({ kind: "renew" })}
                        className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[280px]"
                    >
                        {paymentSubmitting
                            ? "Enviando..."
                            : planId
                              ? "Instrucciones de pago y justificante"
                              : "Selecciona un plan para continuar"}
                    </button>
                </section>

                {/* Historial */}
                <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Pagos registrados</h2>
                    {allPaymentRows.length === 0 ? (
                        <p className="mt-3 text-sm text-slate-500">Aún no tienes pagos registrados.</p>
                    ) : (
                        <div className="mt-4 overflow-auto rounded-xl border border-white/10">
                            <table className="min-w-full text-xs sm:text-sm">
                                <thead className="bg-white/5 text-slate-300">
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
                                        <tr key={r.id} className="border-t border-white/5">
                                            <td className="px-3 py-2 font-medium text-white">{r.plan?.nombre || "Plan"}</td>
                                            <td className="px-3 py-2 text-slate-300">
                                                {fmt(r.periodo_inicio)} – {fmt(r.periodo_fin)}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusPill(r.status)}`}
                                                >
                                                    {paymentStatusLabel(r.status)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-slate-200">
                                                        {paymentMethodLabel(r)}
                                                    </span>
                                                    {paymentMethodLabel(r) === "Transferencia" ? (
                                                        r.proof_url ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setProofModalUrl(r.proof_url)}
                                                                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-white/15"
                                                            >
                                                                Justificante
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">Sin justificante</span>
                                                        )
                                                    ) : null}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${r.is_checked ? "bg-emerald-500/15 text-emerald-300" : "bg-rose-500/15 text-rose-300"}`}
                                                >
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
                onClose={() => !paymentSubmitting && setPayModal(null)}
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
                            <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                                Referencia (opcional)
                            </label>
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
                <div className="fixed right-4 top-24 z-50 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-xl">
                    {toast}
                </div>
            ) : null}

            {proofModalUrl ? (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-900/70 p-4"
                    onClick={() => setProofModalUrl(null)}
                >
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
        </div>
    );
}
