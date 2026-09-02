import { useEffect, useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import PageShell from "@/layouts/PageShell";
import {
    Bath,
    CheckCircle2,
    ChevronRight,
    ExternalLink,
    Lock,
    Mail,
    MessageCircle,
    Percent,
    CreditCard,
    Shirt,
    Sparkles,
    TriangleAlert,
    Waves,
    Wrench,
} from "lucide-react";
import { formatEur } from "@/utils/money";
import StoreFiscalInvoiceActions from "@/components/StoreFiscalInvoiceActions";

const MICRO_SERVICIOS_URL = "/nosotros#micro-servicios-club";

/** Misma rejilla en cabecera y filas: Plan | Importe | Periodo | Estado */
const PLAN_TIMELINE_GRID =
    "sm:grid-cols-[minmax(0,1.1fr)_6.5rem_9.5rem_minmax(10.5rem,1.15fr)] sm:gap-x-3";

const CLUB_AMENITIES = [
    { icon: Lock, label: "1 taquilla privada" },
    { icon: Waves, label: "2 tablas en rack" },
    { icon: Shirt, label: "2 trajes en secadero" },
    { icon: Bath, label: "Baños, duchas y calentamiento" },
    { icon: Percent, label: "Descuentos en tienda" },
    { icon: Wrench, label: "Reparación y micro-servicios" },
];

/** Alineado con la lista completa en PlanesTaquillasPublic / nosotros */
const CLUB_MICRO_SERVICES_TOTAL = 18;

function showMonthlyEquivalent(plan) {
    return Number(plan?.duracion_dias || 0) > 30;
}

function isAnnualPlan(plan) {
    return Number(plan?.duracion_dias || 0) >= 360;
}

function ClubBenefitsSection() {
    return (
        <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-cyan-50/30 p-5 shadow-sm sm:p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-700">
                Instalaciones S4 · Zurriola
            </p>
            <h2 className="font-heading mt-1 text-lg font-bold text-slate-900 sm:text-xl">
                Qué incluye tu plan de socio
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                Lo esencial de tu cuota a pie de playa. Pulsa <strong className="text-slate-800">+{CLUB_MICRO_SERVICES_TOTAL}</strong>{" "}
                para ver el resto de micro-servicios del club.
            </p>

            <div className="mt-4 flex items-stretch gap-2 sm:items-center sm:gap-3">
                <div className="min-w-0 flex-1 overflow-hidden rounded-2xl [mask-image:linear-gradient(to_right,black_84%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,black_84%,transparent_100%)]">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        {CLUB_AMENITIES.map(({ icon: Icon, label }) => (
                            <div
                                key={label}
                                className="flex min-h-[3.5rem] items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-2.5 py-2.5 shadow-sm"
                            >
                                <Icon className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                                <p className="text-[11px] font-semibold leading-snug text-slate-800 sm:text-xs">{label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <Link
                    href={MICRO_SERVICIOS_URL}
                    className="group flex min-h-[3.5rem] shrink-0 flex-col items-center justify-center gap-0.5 rounded-xl border border-cyan-200 bg-white px-2.5 py-2.5 text-center shadow-md shadow-cyan-100/50 transition hover:border-cyan-400 hover:bg-cyan-50/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s4-cyan focus-visible:ring-offset-2 sm:min-h-0 sm:px-3 sm:py-3.5"
                    aria-label={`Ver los ${CLUB_MICRO_SERVICES_TOTAL} micro-servicios del club`}
                >
                    <Sparkles className="h-4 w-4 text-cyan-600 transition group-hover:scale-110" aria-hidden />
                    <span className="text-base font-extrabold leading-none tabular-nums text-cyan-700 sm:text-lg">
                        +{CLUB_MICRO_SERVICES_TOTAL}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-cyan-700">
                        Ver listado
                    </span>
                    <ChevronRight
                        className="mt-0.5 h-3 w-3 text-cyan-500 opacity-0 transition group-hover:opacity-100 sm:hidden"
                        aria-hidden
                    />
                </Link>
            </div>
        </section>
    );
}

function RenewalPlansSection({
    planes,
    hasLocker,
    isMembershipActive,
    hasOnlineMonthly,
    hadMonthlyPlan,
    whatsappLockerUrl,
    whatsappRenewalUrl,
    planId,
    setPlanId,
    paymentSubmitting,
    onPayClick,
    lastPaidPlanId = null,
}) {
    const renewalIntro = !hasLocker ? (
        <p className="mt-1 text-sm text-slate-600">
            Consulta las tarifas disponibles. Para contratar un plan necesitas una taquilla asignada por el
            administrador.
        </p>
    ) : isMembershipActive ? (
        <p className="mt-1 text-sm text-slate-600">
            Selecciona un plan para renovar tu cuota y completa el pago con tarjeta de forma segura. Si tu plan actual
            aún no ha caducado, no te preocupes: el nuevo periodo solo empezará a consumirse cuando termine el que
            tienes en vigor.
        </p>
    ) : (
        <p className="mt-1 text-sm text-slate-600">
            Elige el plan que prefieras y paga con tarjeta. Si ya tienes periodo en cola, el nuevo solo se consumirá
            cuando toque.
        </p>
    );

    return (
        <section id="renovar-plan" className="space-y-5 scroll-mt-6">
            <div>
                <h2 className="font-heading text-lg font-bold text-slate-900 sm:text-xl">Elige y renueva tu plan</h2>
                {renewalIntro}
            </div>

            {!hasOnlineMonthly && hadMonthlyPlan ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Plan mensual no disponible online</p>
                    <p className="mt-1 text-sm leading-relaxed text-amber-900/90">
                        Si quieres renovar mes a mes, escríbenos por WhatsApp o pásate por recepción. También puedes
                        elegir trimestral, semestral o anual y pagar aquí con tarjeta.
                    </p>
                    {whatsappRenewalUrl ? (
                        <a
                            href={whatsappRenewalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-500"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Renovar mensual por WhatsApp
                        </a>
                    ) : null}
                </div>
            ) : null}

            {!hasLocker ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
                    <p className="text-sm font-semibold text-amber-900">
                        Para seleccionar un plan debes tener una taquilla asignada
                    </p>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-700">
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
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                        >
                            <Mail className="h-4 w-4" />
                            Formulario de contacto
                        </Link>
                    </div>
                </div>
            ) : null}

            <div
                className={`grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 ${
                    planes.length >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"
                }`}
            >
                {planes.map((p) => {
                    const selected = hasLocker && String(planId) === String(p.id);
                    const hasExtras = (p.beneficios || []).length > 0;
                    const bestValue = isAnnualPlan(p);
                    return (
                        <article
                            key={p.id}
                            className={`flex flex-col rounded-xl border p-3 transition sm:rounded-2xl sm:p-5 ${
                                selected
                                    ? "border-cyan-500 bg-cyan-50 shadow-md shadow-cyan-100"
                                    : bestValue
                                      ? "border-amber-300 bg-white shadow-sm ring-1 ring-amber-200 hover:border-amber-400"
                                      : "border-slate-200 bg-white shadow-sm hover:border-slate-300"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                        <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-700 sm:text-[10px]">
                                            {p.periodo_label}
                                        </p>
                                        {bestValue ? (
                                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-800">
                                                Mejor precio/mes
                                            </span>
                                        ) : null}
                                        {p.es_vip ? (
                                            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800">
                                                VIP
                                            </span>
                                        ) : null}
                                        {lastPaidPlanId != null && String(p.id) === String(lastPaidPlanId) ? (
                                            <span className="rounded-full bg-cyan-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-cyan-900">
                                                Tu plan anterior
                                            </span>
                                        ) : null}
                                    </div>
                                    <h3 className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                                        {p.nombre}
                                    </h3>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="text-xl font-extrabold tabular-nums text-emerald-600 sm:text-3xl">
                                        {formatEur(p.precio_total)}
                                    </p>
                                    <p className="text-[10px] text-slate-500 sm:text-sm">{p.periodo_sub}</p>
                                    {showMonthlyEquivalent(p) ? (
                                        <p className="mt-0.5 text-[10px] font-semibold text-emerald-700 sm:text-xs">
                                            {formatEur(p.precio_mensual_equivalente)}/mes
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            {hasExtras ? (
                                <ul className="mt-2 flex-1 space-y-1 border-t border-slate-200 pt-2 sm:mt-4 sm:space-y-2 sm:pt-4">
                                    <p className="text-[9px] font-bold uppercase tracking-wider text-cyan-700 sm:text-[10px]">
                                        Exclusivo de este plan
                                    </p>
                                    {p.beneficios.map((beneficio) => (
                                        <li
                                            key={beneficio}
                                            className="flex items-start gap-1.5 text-[11px] text-slate-600 sm:gap-2 sm:text-xs"
                                        >
                                            <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-amber-500 sm:h-3.5 sm:w-3.5" />
                                            {beneficio}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="mt-2 hidden flex-1 text-[11px] leading-snug text-slate-500 sm:mt-4 sm:block sm:border-t sm:border-slate-200 sm:pt-4 sm:text-xs">
                                    Incluye el pack completo del club indicado arriba.
                                </p>
                            )}

                            {hasLocker ? (
                                <div className="mt-2 sm:mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setPlanId(String(p.id))}
                                        className={`w-full rounded-lg px-3 py-2 text-xs font-bold transition sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm ${
                                            selected
                                                ? "bg-cyan-600 text-white hover:bg-cyan-500"
                                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        }`}
                                    >
                                        {selected ? "Seleccionado" : "Renovar"}
                                    </button>
                                </div>
                            ) : null}
                        </article>
                    );
                })}
            </div>

            {hasLocker ? (
                <button
                    type="button"
                    disabled={!planId || paymentSubmitting}
                    onClick={onPayClick}
                    className="w-full rounded-xl bg-gradient-to-r from-pink-500 to-amber-400 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[280px]"
                >
                    {paymentSubmitting
                        ? "Preparando pago…"
                        : planId
                          ? "Pagar renovación con tarjeta"
                          : "Selecciona un plan para renovar"}
                </button>
            ) : null}
        </section>
    );
}

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
                    <span className="font-semibold text-emerald-700">
                        Quedan {dayParts.join(" + ")} {totalCoverage === 1 ? "día" : "días"}
                    </span>
                    <span className="text-slate-500">
                        {daysRemaining} en curso · {queuedDays} preparados
                    </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-slate-200">
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
                    <span className="font-semibold text-emerald-700">
                        Quedan {daysRemaining} {daysRemaining === 1 ? "día" : "días"}
                    </span>
                    <span className="text-slate-500">
                        Periodo de {totalDays} {totalDays === 1 ? "día" : "días"}
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
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
                <span className="font-semibold text-rose-700">
                    {daysOverdue > 0
                        ? `${daysOverdue} ${daysOverdue === 1 ? "día" : "días"} pendientes de pago`
                        : "Cuota vencida — renueva tu plan"}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
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
        return { label: "En vigor", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
    }
    if (kind === "future") {
        return { label: "Preparado", cls: "bg-cyan-50 text-cyan-700 ring-cyan-200" };
    }
    if (kind === "expired") {
        return { label: "Finalizado", cls: "bg-slate-100 text-slate-600 ring-slate-200" };
    }
    if (kind === "pending") {
        return { label: "Pendiente", cls: "bg-amber-50 text-amber-700 ring-amber-200" };
    }
    if (kind === "rejected") {
        return { label: "Rechazado", cls: "bg-rose-50 text-rose-700 ring-rose-200" };
    }
    return { label: "Confirmado", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
}

function PlanTimelineRow({ row, kind, onProofClick, compact = false }) {
    const badge = periodStatusBadge(kind, row);
    const rowTint =
        kind === "active"
            ? "bg-emerald-50/80"
            : kind === "future"
              ? "bg-cyan-50/80"
              : kind === "expired"
                ? "bg-transparent opacity-80"
                : "bg-transparent";

    return (
        <div
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 border-b border-slate-100 px-2 py-1.5 text-[11px] last:border-0 ${PLAN_TIMELINE_GRID} sm:px-2.5 sm:py-1.5 sm:text-xs ${rowTint} ${compact ? "py-1" : ""}`}
        >
            <p className="min-w-0 truncate font-medium text-slate-900">{row.plan?.nombre || "Plan"}</p>
            <p className="text-right font-semibold tabular-nums tracking-tight text-slate-900 whitespace-nowrap">
                {row.monto_pagado != null ? formatEur(row.monto_pagado) : "—"}
            </p>
            <p className="hidden tabular-nums text-slate-600 whitespace-nowrap sm:block">
                {fmtPeriod(row.periodo_inicio, row.periodo_fin)}
            </p>
            <div className="flex min-w-0 flex-col items-stretch gap-1">
                <div className="flex items-center justify-end">
                    <span
                        className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ring-1 sm:text-[10px] ${badge.cls}`}
                    >
                        {badge.label}
                    </span>
                </div>
                {row.status === "confirmed" ? (
                    <StoreFiscalInvoiceActions
                        detailUrl={row.fiscal_invoice_url}
                        pdfUrl={
                            row.fiscal_invoice_pdf_url
                            || (row.proof_is_stripe_receipt ? row.proof_url : null)
                        }
                        onPdfClick={
                            !row.fiscal_invoice_pdf_url && row.proof_url && !row.proof_is_stripe_receipt
                                ? () => onProofClick(row.proof_url)
                                : undefined
                        }
                        ready={Boolean(row.fiscal_invoice_ready)}
                        tone="light"
                        spread
                        compact
                        alwaysShow
                    />
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

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <div
                    className={`hidden border-b border-slate-100 bg-slate-50 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:grid ${PLAN_TIMELINE_GRID}`}
                >
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
                    className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-cyan-600 hover:underline"
                >
                    Ver {hiddenExpiredCount} finalizado{hiddenExpiredCount === 1 ? "" : "s"} más
                </button>
            ) : null}
            {showAllExpired && rows.filter(({ kind }) => kind === "expired").length > 2 ? (
                <button
                    type="button"
                    onClick={() => setShowAllExpired(false)}
                    className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-cyan-600 hover:underline"
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
    if (method === "card") return "Tarjeta";
    if (method === "datafono") return "Datáfono";
    if (method === "tienda") return "Cortesía";
    return "Pendiente";
}

function buildPaymentConceptPreview({ memberName, planName, lockerNumber }) {
    const name = String(memberName || "").trim() || "Socio S4";
    const plan = String(planName || "").trim() || "Plan taquilla";
    let concept = `${name} — ${plan}`;
    if (lockerNumber != null && lockerNumber !== "") {
        const withLocker = `${concept} · T#${lockerNumber}`;
        if (withLocker.length <= 255) {
            concept = withLocker;
        }
    }
    return concept;
}

function PaymentSummaryRow({ label, value, highlight = false }) {
    if (!value) {
        return null;
    }
    return (
        <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-0.5">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className={`text-sm leading-snug ${highlight ? "font-medium text-cyan-700" : "text-slate-900"}`}>
                {value}
            </dd>
        </div>
    );
}

export default function PlanesTaquillasClient({
    planes = [],
    userData = {},
    whatsappHelpUrl = null,
}) {
    const { flash } = usePage().props;
    const [planId, setPlanId] = useState("");
    const [toast, setToast] = useState(null);
    const [proofModalUrl, setProofModalUrl] = useState(null);
    const [payModal, setPayModal] = useState(null);
    const [paymentSubmitting, setPaymentSubmitting] = useState(false);
    const [bajaModalOpen, setBajaModalOpen] = useState(false);
    const [bajaSubmitting, setBajaSubmitting] = useState(false);

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
        if (isMembershipActive) return { text: "ACTIVA", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
        return { text: "VENCIDA", cls: "bg-rose-50 text-rose-700 ring-rose-200" };
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
    const bajaSolicitadaAt = userData?.baja_solicitada_at || null;

    const hasOnlineMonthly = useMemo(
        () => planes.some((p) => Number(p.duracion_dias || 0) <= 30),
        [planes],
    );

    const hadMonthlyPlan = useMemo(() => {
        const names = [
            userData?.plan_vigente?.nombre,
            ...(userData?.historial_pagos || []).map((p) => p.plan?.nombre),
        ].filter(Boolean);

        return names.some((name) => /mensual/i.test(String(name)));
    }, [userData]);

    const lastPaidPlanId = useMemo(() => {
        let bestId = null;
        let bestEnd = 0;

        for (const row of allPaymentRows) {
            if (row.status !== "confirmed" || row.plan?.id == null) continue;
            const end = row.periodo_fin ? startOfDay(new Date(row.periodo_fin)).getTime() : 0;
            if (end >= bestEnd) {
                bestEnd = end;
                bestId = row.plan.id;
            }
        }

        return bestId;
    }, [allPaymentRows]);

    useEffect(() => {
        if (planId || !hasLocker || planes.length === 0) return;

        if (lastPaidPlanId != null && planes.some((p) => String(p.id) === String(lastPaidPlanId))) {
            setPlanId(String(lastPaidPlanId));
            return;
        }

        const monthly = planes.find((p) => Number(p.duracion_dias || 0) <= 30);
        if (monthly) {
            setPlanId(String(monthly.id));
        }
    }, [hasLocker, planes, planId, lastPaidPlanId]);

    const confirmarComunicarBaja = () => {
        if (bajaSubmitting) return;
        setBajaSubmitting(true);
        router.post(
            route("taquillas.comunicar-baja"),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBajaSubmitting(false);
                    setBajaModalOpen(false);
                },
            },
        );
    };

    const whatsappLockerUrl = useMemo(() => {
        if (!whatsappHelpUrl) return null;
        const text = encodeURIComponent(
            "Hola, me gustaría solicitar una taquilla en el club para poder contratar un plan de socio.",
        );
        const base = whatsappHelpUrl.includes("?") ? whatsappHelpUrl.split("?")[0] : whatsappHelpUrl;
        return `${base}?text=${text}`;
    }, [whatsappHelpUrl]);

    const whatsappRenewalUrl = useMemo(() => {
        if (!whatsappHelpUrl) return null;
        const locker = userData?.numero_taquilla ? ` (taquilla n.º ${userData.numero_taquilla})` : "";
        const text = encodeURIComponent(
            `Hola, quiero renovar mi plan mensual de taquilla${locker}. ¿Me ayudáis con el pago?`,
        );
        const base = whatsappHelpUrl.includes("?") ? whatsappHelpUrl.split("?")[0] : whatsappHelpUrl;
        return `${base}?text=${text}`;
    }, [whatsappHelpUrl, userData?.numero_taquilla]);

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
                { plan_id: planId },
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
            return formatEur(selectedPlan.precio_total);
        }
        if (
            payModal?.kind === "pending" &&
            pendingTarget?.monto_pagado != null &&
            Number(pendingTarget.monto_pagado) > 0
        ) {
            return formatEur(pendingTarget.monto_pagado);
        }
        return null;
    }, [payModal, selectedPlan, pendingTarget]);

    const paymentConcept = useMemo(() => {
        if (payModal?.kind === "renew" && selectedPlan) {
            return buildPaymentConceptPreview({
                memberName: userData?.nombre_completo,
                planName: selectedPlan.nombre,
                lockerNumber: userData?.numero_taquilla,
            });
        }
        if (payModal?.kind === "pending" && pendingTarget) {
            if (pendingTarget.referencia_pago_externa) {
                return pendingTarget.referencia_pago_externa;
            }
            return buildPaymentConceptPreview({
                memberName: userData?.nombre_completo,
                planName: pendingTarget.plan?.nombre,
                lockerNumber: userData?.numero_taquilla,
            });
        }
        return null;
    }, [payModal, selectedPlan, pendingTarget, userData]);

    const secondaryNote =
        payModal?.kind === "pending"
            ? "Al confirmar el pago en Stripe, tu cuota quedará activa de forma automática."
            : "Al confirmar el pago en Stripe, tu plan se renovará de forma automática.";

    const renewalSection = (
        <RenewalPlansSection
            planes={planes}
            hasLocker={hasLocker}
            isMembershipActive={isMembershipActive}
            hasOnlineMonthly={hasOnlineMonthly}
            hadMonthlyPlan={hadMonthlyPlan}
            whatsappLockerUrl={whatsappLockerUrl}
            whatsappRenewalUrl={whatsappRenewalUrl}
            planId={planId}
            setPlanId={setPlanId}
            paymentSubmitting={paymentSubmitting}
            onPayClick={() => setPayModal({ kind: "renew" })}
            lastPaidPlanId={lastPaidPlanId}
        />
    );

    return (
        <PageShell variant="light">
            <Head title="Planes y cuotas" />

            <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
                {/* Hero compacto */}
                <header className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-700">
                            Club de socios S4
                        </p>
                        <h1 className="font-heading mt-0.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                            Planes y cuotas
                        </h1>
                        {hasLocker && !isMembershipActive ? (
                            <p className="mt-2 text-sm text-rose-700">
                                {daysDebt > 0 ? (
                                    <>
                                        Llevas {daysDebt} {daysDebt === 1 ? "día" : "días"} sin cuota al día.{" "}
                                    </>
                                ) : (
                                    <>Tu cuota no está al día. </>
                                )}
                                <a
                                    href="#renovar-plan"
                                    className="font-semibold text-rose-900 underline decoration-rose-300 underline-offset-2 hover:decoration-rose-500"
                                >
                                    Renueva tu plan
                                </a>{" "}
                                para recuperar taquilla, descuentos en tienda y llave de emergencia.
                            </p>
                        ) : hasLocker ? (
                            <p className="mt-2 text-sm text-slate-600">
                                Gestiona tu membresía, pagos y renovación en un solo sitio.
                            </p>
                        ) : null}
                    </div>
                </header>

                {/* Planes y pagos */}
                {hasLocker ? (
                    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h2 className="flex flex-wrap items-baseline gap-x-2 text-xs font-bold uppercase tracking-wider text-slate-600">
                                Tus planes y pagos
                                {userData?.numero_taquilla ? (
                                    <span className="font-semibold normal-case tracking-normal text-slate-700">
                                        taquilla n.º {userData.numero_taquilla}
                                    </span>
                                ) : null}
                            </h2>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${statusLabel.cls}`}
                                >
                                    {statusLabel.text}
                                </span>
                                {!isMembershipActive ? (
                                    <a
                                        href="#renovar-plan"
                                        className="inline-flex items-center gap-0.5 text-[11px] font-bold text-cyan-700 hover:text-cyan-900"
                                    >
                                        Renovar
                                        <ChevronRight className="h-3 w-3" aria-hidden />
                                    </a>
                                ) : null}
                            </div>
                        </div>
                        <PlanTimelineSection
                            rows={planTimelineRows}
                            activePayment={activePayment}
                            activeProgress={activeProgress}
                            queuedPayments={queuedPayments}
                            daysDebt={daysDebt}
                            onProofClick={setProofModalUrl}
                        />
                        <div className="mt-3 border-t border-slate-100 pt-3">
                            {bajaSolicitadaAt ? (
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Baja comunicada el {fmt(bajaSolicitadaAt)}. El equipo del club se
                                    pondrá en contacto contigo.
                                </p>
                            ) : (
                                <div className="flex flex-wrap items-center gap-3">
                                    <p className="text-xs leading-relaxed text-slate-600">
                                        ¿Estás pensando en dejar el local?
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setBajaModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                                    >
                                        <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                                        Comunicar baja
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>
                ) : (
                    <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-3">
                            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold text-amber-900">Sin taquilla asignada</p>
                                <p className="mt-1 text-sm leading-relaxed text-amber-800">
                                    Registrarte no implica tener taquilla. El equipo debe asignártela desde el gestor
                                    interno antes de que puedas contratar o renovar un plan.
                                </p>
                            </div>
                        </div>
                    </section>
                )}

                {hasLocker && !isMembershipActive ? renewalSection : null}

                {!hasLocker || isMembershipActive ? <ClubBenefitsSection /> : null}

                {!hasLocker || isMembershipActive ? renewalSection : null}

                {hasLocker && !isMembershipActive ? <ClubBenefitsSection /> : null}
            </div>

            {payModal != null ? (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => !paymentSubmitting && setPayModal(null)}
                        aria-hidden="true"
                    />
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="pay-modal-title"
                    >
                        <div className="h-1 bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400" />

                        <div className="p-6 sm:p-7">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 ring-1 ring-violet-200">
                                    <CreditCard className="h-5 w-5 text-violet-600" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h2 id="pay-modal-title" className="text-lg font-bold tracking-tight text-slate-900">
                                        Confirmar pago
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">Pasarela segura · Stripe</p>
                                </div>
                            </div>

                            {totalPrimaryLine ? (
                                <p className="mt-5 text-3xl font-extrabold tabular-nums tracking-tight text-emerald-600">
                                    {totalPrimaryLine}
                                </p>
                            ) : null}

                            <dl className="mt-5 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                {payModal.kind === "renew" && selectedPlan ? (
                                    <>
                                        <PaymentSummaryRow label="Plan" value={selectedPlan.nombre} />
                                        <PaymentSummaryRow label="Socio" value={userData?.nombre_completo} />
                                        {userData?.numero_taquilla ? (
                                            <PaymentSummaryRow
                                                label="Taquilla"
                                                value={`#${userData.numero_taquilla}`}
                                            />
                                        ) : null}
                                        <PaymentSummaryRow label="Concepto" value={paymentConcept} highlight />
                                    </>
                                ) : null}
                                {payModal.kind === "pending" && pendingTarget ? (
                                    <>
                                        <PaymentSummaryRow
                                            label="Plan"
                                            value={pendingTarget.plan?.nombre || "Cuota pendiente"}
                                        />
                                        <PaymentSummaryRow label="Socio" value={userData?.nombre_completo} />
                                        <PaymentSummaryRow label="Concepto" value={paymentConcept} highlight />
                                    </>
                                ) : null}
                            </dl>

                            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-600">
                                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-600" aria-hidden="true" />
                                <span>{secondaryNote}</span>
                            </p>

                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => !paymentSubmitting && setPayModal(null)}
                                    disabled={paymentSubmitting}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={iniciarPagoTaquilla}
                                    disabled={paymentSubmitting}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {paymentSubmitting ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                            Preparando…
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="h-4 w-4" aria-hidden="true" />
                                            Pagar con tarjeta
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {bajaModalOpen ? (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => !bajaSubmitting && setBajaModalOpen(false)}
                        aria-hidden="true"
                    />
                    <div
                        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="baja-modal-title"
                    >
                        <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300" />
                        <div className="p-6 sm:p-7">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-200">
                                    <TriangleAlert className="h-5 w-5 text-rose-600" aria-hidden="true" />
                                </div>
                                <div className="min-w-0">
                                    <h2
                                        id="baja-modal-title"
                                        className="text-lg font-bold tracking-tight text-slate-900"
                                    >
                                        Comunicar baja de tu taquilla
                                    </h2>
                                    <p className="mt-0.5 text-xs text-slate-500">Aviso al club · sin cancelación automática</p>
                                </div>
                            </div>
                            <p className="mt-5 text-sm leading-relaxed text-slate-700">
                                Vamos a avisar al equipo del club de que quieres dejar tu taquilla #
                                {userData?.numero_taquilla ?? "—"}. Tu taquilla seguirá activa con
                                normalidad hasta que el club gestione la baja contigo; no se cancela
                                nada automáticamente al confirmar esto.
                            </p>
                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:gap-3">
                                <button
                                    type="button"
                                    onClick={() => !bajaSubmitting && setBajaModalOpen(false)}
                                    disabled={bajaSubmitting}
                                    className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-1"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmarComunicarBaja}
                                    disabled={bajaSubmitting}
                                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {bajaSubmitting ? "Enviando…" : "Sí, comunicar baja"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {toast ? (
                <div className="fixed right-4 top-24 z-50 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl">
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
        </PageShell>
    );
}
