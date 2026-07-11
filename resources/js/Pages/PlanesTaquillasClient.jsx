import { useEffect, useMemo, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import {
    Bath,
    CheckCircle2,
    ExternalLink,
    KeyRound,
    Lock,
    Mail,
    MessageCircle,
    Percent,
    Shirt,
    Waves,
    Wrench,
} from "lucide-react";
import { formatEur } from "@/utils/money";

const MICRO_SERVICIOS_URL = "/nosotros#micro-servicios-club";

const CLUB_AMENITIES = [
    { icon: Lock, label: "1 taquilla privada", detail: "Espacio seguro a pie de playa" },
    { icon: Waves, label: "2 tablas en rack", detail: "Almacenamiento a pie de Zurriola" },
    { icon: Shirt, label: "2 trajes en secadero", detail: "Secado rápido en instalaciones del club" },
    { icon: Bath, label: "Baños, duchas y calentamiento", detail: "TRX, foam rollers y zona pre-sesión" },
    { icon: Percent, label: "Descuentos en tienda", detail: "Hasta 45% para socios · 50% con plan VIP anual" },
    { icon: Wrench, label: "Reparación y micro-servicios", detail: "Taller de tablas + WiFi, cafetera, cargadores y más" },
];

function fmt(v) {
    if (!v) return "-";
    return new Date(v).toLocaleDateString("es-ES");
}

function fmtPeriod(start, end) {
    if (!start && !end) return "—";
    const opts = { day: "numeric", month: "numeric", year: "2-digit" };
    const a = start ? new Date(start).toLocaleDateString("es-ES", opts) : "—";
    const b = end ? new Date(end).toLocaleDateString("es-ES", opts) : "—";
    return `${a} – ${b}`;
}

function startOfDay(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function daysInclusive(startStr, endStr) {
    const start = startOfDay(new Date(startStr));
    const end = startOfDay(new Date(endStr));
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.round((end - start) / msPerDay) + 1);
}

function paymentPeriodKind(row) {
    if (row?.status !== "confirmed" || !row?.periodo_inicio || !row?.periodo_fin) return null;
    const today = startOfDay(new Date());
    const start = startOfDay(new Date(row.periodo_inicio));
    const end = startOfDay(new Date(row.periodo_fin));
    if (today >= start && today <= end) return "active";
    if (today > end) return "expired";
    return "future";
}

function PlanProgressBar({ mode, daysRemaining, daysOverdue, totalDays, queuedPlans = [] }) {
    const queuedDays = queuedPlans.reduce(
        (sum, row) => sum + daysInclusive(row.periodo_inicio, row.periodo_fin),
        0,
    );

    if (mode === "active" && queuedDays > 0) {
        const totalCoverage = daysRemaining + queuedDays;
        const activePct = totalCoverage > 0 ? (daysRemaining / totalCoverage) * 100 : 0;
        const queuedPct = totalCoverage > 0 ? (queuedDays / totalCoverage) * 100 : 0;
        const dayParts = [
            daysRemaining,
            ...queuedPlans.map((row) => daysInclusive(row.periodo_inicio, row.periodo_fin)),
        ];

        return (
            <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px]">
                    <span className="font-semibold text-emerald-300">
                        Quedan {dayParts.join(" + ")} {totalCoverage === 1 ? "día" : "días"}
                    </span>
                    <span className="text-slate-500">
                        {daysRemaining} en curso · {queuedDays} preparados
                    </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${activePct}%` }}
                        title={`Plan activo: ${daysRemaining} días`}
                    />
                    <div
                        className="h-full bg-gradient-to-r from-cyan-500/90 to-cyan-300/80 transition-all duration-500"
                        style={{ width: `${queuedPct}%` }}
                        title={`Plan preparado: ${queuedDays} días`}
                    />
                </div>
            </div>
        );
    }

    if (mode === "active") {
        const pct = totalDays > 0 ? Math.min(100, Math.max(0, Math.round((daysRemaining / totalDays) * 100))) : 0;
        return (
            <div>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px]">
                    <span className="font-semibold text-emerald-300">
                        Quedan {daysRemaining} {daysRemaining === 1 ? "día" : "días"}
                    </span>
                    <span className="text-slate-500">
                        Periodo de {totalDays} {totalDays === 1 ? "día" : "días"}
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-rose-300">
                    {daysOverdue > 0
                        ? `${daysOverdue} ${daysOverdue === 1 ? "día" : "días"} pendientes de pago`
                        : "Cuota vencida — renueva tu plan"}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 animate-pulse" />
            </div>
        </div>
    );
}

function periodKindForRow(row) {
    const confirmedKind = paymentPeriodKind(row);
    if (confirmedKind) return confirmedKind;
    if (row?.status === "pending") return "pending";
    if (row?.status === "rejected") return "rejected";
    return "other";
}

function periodStatusBadge(kind, row) {
    if (kind === "active") {
        return { label: "En vigor", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25" };
    }
    if (kind === "future") {
        return { label: "Preparado", cls: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/25" };
    }
    if (kind === "expired") {
        return { label: "Finalizado", cls: "bg-slate-700/80 text-slate-300 ring-white/10" };
    }
    if (kind === "pending") {
        return { label: "Pendiente", cls: "bg-amber-500/15 text-amber-200 ring-amber-400/25" };
    }
    if (kind === "rejected") {
        return { label: "Rechazado", cls: "bg-rose-500/15 text-rose-300 ring-rose-400/25" };
    }
    return { label: "Confirmado", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/25" };
}

function PlanTimelineRow({ row, kind, onProofClick, compact = false }) {
    const badge = periodStatusBadge(kind, row);
    const rowTint =
        kind === "active"
            ? "bg-emerald-500/[0.07]"
            : kind === "future"
              ? "bg-cyan-500/[0.07]"
              : kind === "expired"
                ? "bg-transparent opacity-80"
                : "bg-transparent";

    return (
        <div
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-white/5 px-2 py-1.5 text-[11px] last:border-0 sm:grid-cols-[minmax(0,1.2fr)_4.5rem_9rem_auto] sm:gap-2 sm:px-2.5 sm:py-1.5 sm:text-xs ${rowTint} ${compact ? "py-1" : ""}`}
        >
            <p className="truncate font-medium text-white">{row.plan?.nombre || "Plan"}</p>
            <p className="text-right font-medium tabular-nums text-slate-300">
                {row.monto_pagado != null ? formatEur(row.monto_pagado) : "—"}
            </p>
            <p className="hidden tabular-nums text-slate-400 sm:block">
                {fmtPeriod(row.periodo_inicio, row.periodo_fin)}
            </p>
            <div className="flex items-center justify-end gap-1.5">
                <span
                    className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 sm:text-[10px] ${badge.cls}`}
                >
                    {badge.label}
                </span>
                {paymentMethodLabel(row) === "Transferencia" && row.proof_url ? (
                    <button
                        type="button"
                        onClick={() => onProofClick(row.proof_url)}
                        className="shrink-0 text-[9px] font-semibold text-cyan-400 hover:underline sm:text-[10px]"
                        title="Ver justificante"
                    >
                        PDF
                    </button>
                ) : null}
            </div>
            <p className="col-span-2 tabular-nums text-[10px] text-slate-500 sm:hidden">
                {fmtPeriod(row.periodo_inicio, row.periodo_fin)}
            </p>
        </div>
    );
}

function PlanTimelineSection({
    rows,
    activePayment,
    activeProgress,
    queuedPayments,
    daysDebt,
    onProofClick,
}) {
    const [showAllExpired, setShowAllExpired] = useState(false);

    const { displayRows, hiddenExpiredCount } = useMemo(() => {
        const head = rows.filter(({ kind }) => kind !== "expired");
        const expired = rows.filter(({ kind }) => kind === "expired");
        const maxExpired = 2;
        const visibleExpired = showAllExpired ? expired : expired.slice(0, maxExpired);
        return {
            displayRows: [...head, ...visibleExpired],
            hiddenExpiredCount: showAllExpired ? 0 : Math.max(0, expired.length - maxExpired),
        };
    }, [rows, showAllExpired]);

    if (rows.length === 0) {
        return <p className="text-xs text-slate-500">Aún no tienes planes ni pagos registrados.</p>;
    }

    return (
        <div className="space-y-2">
            {activePayment && activeProgress ? (
                <PlanProgressBar
                    mode="active"
                    daysRemaining={activeProgress.daysRemaining}
                    totalDays={activeProgress.totalDays}
                    queuedPlans={queuedPayments}
                />
            ) : daysDebt > 0 ? (
                <PlanProgressBar mode="overdue" daysOverdue={daysDebt} />
            ) : null}

            <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/40">
                <div className="hidden border-b border-white/5 bg-white/[0.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:grid sm:grid-cols-[minmax(0,1.2fr)_4.5rem_9rem_auto] sm:gap-2">
                    <span>Plan</span>
                    <span className="text-right">Importe</span>
                    <span>Periodo</span>
                    <span className="text-right">Estado</span>
                </div>
                {displayRows.map(({ row, kind }) => (
                    <PlanTimelineRow
                        key={row.id}
                        row={row}
                        kind={kind}
                        onProofClick={onProofClick}
                        compact={kind === "expired"}
                    />
                ))}
            </div>
            {hiddenExpiredCount > 0 ? (
                <button
                    type="button"
                    onClick={() => setShowAllExpired(true)}
                    className="text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-cyan-300 hover:underline"
                >
                    Ver {hiddenExpiredCount} finalizado{hiddenExpiredCount === 1 ? "" : "s"} más
                </button>
            ) : null}
            {showAllExpired && rows.filter(({ kind }) => kind === "expired").length > 2 ? (
                <button
                    type="button"
                    onClick={() => setShowAllExpired(false)}
                    className="text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-cyan-300 hover:underline"
                >
                    Ocultar finalizados antiguos
                </button>
            ) : null}
        </div>
    );
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
    const today = startOfDay(new Date());
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysToDue = dueDateRaw
        ? Math.ceil((startOfDay(new Date(dueDateRaw)).getTime() - today.getTime()) / msPerDay)
        : null;
    const daysDebt = typeof daysToDue === "number" && daysToDue < 0 ? Math.abs(daysToDue) : 0;
    const isMembershipActive = typeof daysToDue === "number" && daysToDue >= 0;

    const statusLabel = useMemo(() => {
        if (isMembershipActive) return { text: "ACTIVA", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" };
        return { text: "VENCIDA", cls: "bg-rose-500/15 text-rose-300 ring-rose-400/30" };
    }, [isMembershipActive]);

    const pendingRows = (userData?.historial_pagos || []).filter((p) => p.status === "pending");
    const allPaymentRows = useMemo(() => userData?.historial_pagos || [], [userData?.historial_pagos]);

    const { activePayment, queuedPayments } = useMemo(() => {
        let active = null;
        const queued = [];

        for (const row of allPaymentRows) {
            const kind = paymentPeriodKind(row);
            if (kind === "active") {
                if (
                    !active ||
                    startOfDay(new Date(row.periodo_fin)).getTime() >
                        startOfDay(new Date(active.periodo_fin)).getTime()
                ) {
                    active = row;
                }
            } else if (kind === "future") {
                queued.push(row);
            }
        }

        queued.sort(
            (a, b) => startOfDay(new Date(a.periodo_inicio)).getTime() - startOfDay(new Date(b.periodo_inicio)).getTime(),
        );

        return { activePayment: active, queuedPayments: queued };
    }, [allPaymentRows]);

    const activeProgress = useMemo(() => {
        if (!activePayment) return null;
        const totalDays = daysInclusive(activePayment.periodo_inicio, activePayment.periodo_fin);
        const end = startOfDay(new Date(activePayment.periodo_fin));
        const daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / msPerDay) + 1);
        return { totalDays, daysRemaining };
    }, [activePayment, today, msPerDay]);

    const planTimelineRows = useMemo(() => {
        // Arriba → abajo: preparado (futuro), en vigor, finalizados (más recientes justo debajo del activo).
        const kindOrder = { future: 0, active: 1, pending: 2, expired: 3, rejected: 4, other: 5 };
        return allPaymentRows
            .map((row) => ({ row, kind: periodKindForRow(row) }))
            .sort((a, b) => {
                const orderDiff = (kindOrder[a.kind] ?? 9) - (kindOrder[b.kind] ?? 9);
                if (orderDiff !== 0) return orderDiff;

                if (a.kind === "expired") {
                    return (
                        startOfDay(new Date(b.row.periodo_fin || 0)).getTime() -
                        startOfDay(new Date(a.row.periodo_fin || 0)).getTime()
                    );
                }

                if (a.kind === "future") {
                    return (
                        startOfDay(new Date(a.row.periodo_inicio || 0)).getTime() -
                        startOfDay(new Date(b.row.periodo_inicio || 0)).getTime()
                    );
                }

                return (
                    startOfDay(new Date(b.row.periodo_inicio || 0)).getTime() -
                    startOfDay(new Date(a.row.periodo_inicio || 0)).getTime()
                );
            });
    }, [allPaymentRows]);

    const selectedPlan = useMemo(() => planes.find((p) => String(p.id) === String(planId)), [planes, planId]);
    const hasLocker = Boolean(userData?.numero_taquilla);

    const whatsappLockerUrl = useMemo(() => {
        if (!whatsappHelpUrl) return null;
        const text = encodeURIComponent(
            "Hola, me gustaría solicitar una taquilla en el club para poder contratar un plan de socio.",
        );
        const base = whatsappHelpUrl.includes("?") ? whatsappHelpUrl.split("?")[0] : whatsappHelpUrl;
        return `${base}?text=${text}`;
    }, [whatsappHelpUrl]);

    const pendingTarget = useMemo(() => {
        if (payModal?.kind !== "pending") return null;
        return pendingRows.find((r) => r.id === payModal.pagoId) || null;
    }, [payModal, pendingRows]);

    const iniciarPagoTaquilla = () => {
        if (!payModal || paymentSubmitting) return;
        setPaymentSubmitting(true);

        if (payModal.kind === "renew") {
            if (!planId) {
                setPaymentSubmitting(false);
                return;
            }
            router.post(
                route("taquillas.pago.client"),
                {
                    plan_id: planId,
                    referencia_pago_externa: renewalRef.trim() || undefined,
                },
                {
                    preserveScroll: true,
                    onError: () => setPaymentSubmitting(false),
                    onFinish: () => setPaymentSubmitting(false),
                },
            );
            return;
        }

        router.post(
            route("taquillas.pago.pay", payModal.pagoId),
            {},
            {
                preserveScroll: true,
                onError: () => setPaymentSubmitting(false),
                onFinish: () => setPaymentSubmitting(false),
            },
        );
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
            ? "Completa el pago pendiente con tarjeta. Se activará automáticamente al confirmarse."
            : "Serás redirigido a Stripe. Tu plan se activará al confirmar el pago.";

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2a33] to-slate-950 text-white">
            <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
                {/* Hero compacto */}
                <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-cyan-900/40 bg-[#0f5f74]/30 px-4 py-4 sm:px-5">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-200/80">
                            Club de socios S4
                        </p>
                        <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight sm:text-3xl">Planes y cuotas</h1>
                        <p className="mt-1 max-w-2xl text-xs leading-snug text-slate-300 sm:text-sm">
                            Gestiona tu cuota, renueva tu plan y consulta el historial de pagos.
                        </p>
                    </div>
                    <Link
                        href={MICRO_SERVICIOS_URL}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15"
                    >
                        Micro-servicios
                        <ExternalLink className="h-3 w-3" />
                    </Link>
                </header>

                {/* Planes y pagos */}
                {hasLocker ? (
                    <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm sm:p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Tus planes y pagos
                                </h2>
                                <p className="text-[10px] text-slate-500">
                                    Preparado → en vigor → finalizados
                                    {userData?.numero_taquilla ? (
                                        <span className="text-slate-400">
                                            {" "}
                                            · Taquilla #{userData.numero_taquilla}
                                        </span>
                                    ) : null}
                                </p>
                            </div>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusLabel.cls}`}>
                                {statusLabel.text}
                            </span>
                        </div>
                        <PlanTimelineSection
                            rows={planTimelineRows}
                            activePayment={activePayment}
                            activeProgress={activeProgress}
                            queuedPayments={queuedPayments}
                            daysDebt={daysDebt}
                            onProofClick={setProofModalUrl}
                        />
                    </section>
                ) : null}

                {/* Estado taquilla */}
                <section className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm sm:p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Tu membresía</p>
                    {hasLocker ? (
                        <>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                                <span>Vence: {fmt(dueDateRaw)}</span>
                                {daysDebt > 0 ? (
                                    <span className="font-semibold text-rose-400">Debe {daysDebt} días</span>
                                ) : null}
                                {userData?.plan_vigente?.nombre ? (
                                    <span className="text-cyan-200/90">
                                        Plan: <strong className="text-white">{userData.plan_vigente.nombre}</strong>
                                    </span>
                                ) : null}
                            </div>
                            <Link
                                href={route("emergency-key.show")}
                                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-1.5 text-xs font-semibold text-orange-100 transition hover:border-orange-400/50"
                            >
                                <KeyRound className="h-3.5 w-3.5 shrink-0" />
                                Me quedé sin llave
                            </Link>
                        </>
                    ) : (
                        <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                            <div className="flex items-start gap-3">
                                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                                <div>
                                    <p className="text-sm font-semibold text-amber-100">Sin taquilla asignada</p>
                                    <p className="mt-1 text-sm leading-relaxed text-amber-200/85">
                                        Registrarte no implica tener taquilla. El equipo debe asignártela desde el gestor
                                        interno antes de que puedas contratar o renovar un plan.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
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
                        <h2 className="text-lg font-bold text-white sm:text-xl">Elige y renueva tu plan</h2>
                        {hasLocker ? (
                            <p className="mt-1 text-sm text-slate-400">
                                Selecciona un plan para renovar tu cuota y continúa con las instrucciones de pago para
                                enviar tu justificante. Si tu plan actual aún no ha caducado, no te preocupes: el nuevo
                                periodo solo empezará a consumirse cuando termine el que tienes en vigor.
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-slate-400">
                                Consulta las tarifas disponibles. Para contratar un plan necesitas una taquilla asignada
                                por el administrador.
                            </p>
                        )}
                    </div>

                    {!hasLocker ? (
                        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 sm:p-6">
                            <p className="text-sm font-semibold text-amber-100">
                                Para seleccionar un plan debes tener una taquilla asignada
                            </p>
                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                                Escríbenos por WhatsApp o usa el formulario de contacto y te ayudamos a gestionar la
                                asignación con el equipo del club.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                {whatsappLockerUrl ? (
                                    <a
                                        href={whatsappLockerUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        WhatsApp
                                    </a>
                                ) : null}
                                <Link
                                    href={route("contacto")}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
                                >
                                    <Mail className="h-4 w-4" />
                                    Formulario de contacto
                                </Link>
                            </div>
                        </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {planes.map((p) => {
                            const selected = hasLocker && String(planId) === String(p.id);
                            const hasExtras = (p.beneficios || []).length > 0;
                            return (
                                <article
                                    key={p.id}
                                    className={`flex flex-col rounded-xl border p-3 transition sm:rounded-2xl sm:p-5 ${
                                        selected
                                            ? "border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-950/30"
                                            : "border-white/10 bg-white/5 hover:border-white/20"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/80 sm:text-[10px]">
                                                    {p.periodo_label}
                                                </p>
                                                {p.es_vip ? (
                                                    <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-200">
                                                        VIP
                                                    </span>
                                                ) : null}
                                            </div>
                                            <h3 className="text-sm font-bold leading-snug text-white sm:text-base">
                                                {p.nombre}
                                            </h3>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="text-xl font-extrabold tabular-nums text-emerald-300 sm:text-3xl">
                                                {formatEur(p.precio_total)}
                                            </p>
                                            <p className="text-[10px] text-slate-400 sm:text-sm">{p.periodo_sub}</p>
                                        </div>
                                    </div>

                                    {hasExtras ? (
                                        <ul className="mt-2 flex-1 space-y-1 border-t border-white/10 pt-2 sm:mt-4 sm:space-y-2 sm:pt-4">
                                            <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/70 sm:text-[10px]">
                                                Exclusivo de este plan
                                            </p>
                                            {p.beneficios.map((beneficio) => (
                                                <li
                                                    key={beneficio}
                                                    className="flex items-start gap-1.5 text-[11px] text-slate-300 sm:gap-2 sm:text-xs"
                                                >
                                                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-400 sm:h-3.5 sm:w-3.5" />
                                                    {beneficio}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="mt-2 hidden flex-1 text-[11px] leading-snug text-slate-500 sm:mt-4 sm:block sm:border-t sm:border-white/10 sm:pt-4 sm:text-xs">
                                            Incluye el pack completo del club indicado arriba.
                                        </p>
                                    )}

                                    <div className="mt-2 flex flex-row gap-2 sm:mt-4 sm:flex-col">
                                        {hasLocker ? (
                                            <button
                                                type="button"
                                                onClick={() => setPlanId(String(p.id))}
                                                className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-xs font-bold transition sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm ${
                                                    selected
                                                        ? "bg-cyan-500 text-white"
                                                        : "bg-white/10 text-white hover:bg-white/15"
                                                }`}
                                            >
                                                {selected ? "Seleccionado" : "Renovar"}
                                            </button>
                                        ) : null}
                                        <Link
                                            href={MICRO_SERVICIOS_URL}
                                            className="inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-white/10 px-2.5 py-2 text-[11px] font-semibold text-cyan-200/90 transition hover:bg-white/5 sm:rounded-xl sm:px-3 sm:text-xs"
                                        >
                                            Ver más
                                            <ExternalLink className="h-3 w-3" />
                                        </Link>
                                    </div>
                                </article>
                            );
                        })}
                    </div>

                    {hasLocker ? (
                        <button
                            type="button"
                            disabled={!planId || paymentSubmitting}
                            onClick={() => setPayModal({ kind: "renew" })}
                            className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 px-4 py-3 text-sm font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[280px]"
                        >
                            {paymentSubmitting
                                ? "Preparando pago…"
                                : planId
                                  ? "Pagar renovación con tarjeta"
                                  : "Selecciona un plan para renovar"}
                        </button>
                    ) : null}
                </section>
            </div>

            {payModal != null ? (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => !paymentSubmitting && setPayModal(null)}
                    />
                    <div className="relative w-full max-w-sm rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900 to-slate-800 p-7 shadow-2xl text-white">
                        <h2 className="text-xl font-bold">Confirmar pago</h2>
                        {totalPrimaryLine ? (
                            <p className="mt-3 text-lg font-bold text-emerald-400">{totalPrimaryLine}</p>
                        ) : null}
                        <p className="mt-2 text-sm text-white/70">{secondaryNote}</p>
                        {payModal.kind === "renew" ? (
                            <div className="mt-4">
                                <label className="text-xs font-semibold uppercase tracking-wide text-white/70">
                                    Referencia (opcional)
                                </label>
                                <input
                                    value={renewalRef}
                                    onChange={(e) => setRenewalRef(e.target.value)}
                                    placeholder="Concepto o referencia"
                                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                                />
                            </div>
                        ) : null}
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={iniciarPagoTaquilla}
                                disabled={paymentSubmitting}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:opacity-60"
                            >
                                {paymentSubmitting ? "Preparando…" : "Pagar con tarjeta"}
                            </button>
                            <button
                                type="button"
                                onClick={() => !paymentSubmitting && setPayModal(null)}
                                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

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
