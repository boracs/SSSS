import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Eye, EyeOff, Mail, Pencil, Users } from "lucide-react";
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
    const method = String(row?.payment_method || "").toLowerCase();
    if (row?.status === "rejected") return "failed";
    if (method === "card" || row?.is_stripe_card) return "online";
    if (method === "datafono") return "datafono";
    if (method === "tienda") return "metalico";
    if (method === "domiciliado") return "domiciliado";
    if (method === "transferencia" || method === "bizum") return "transferencia";
    return "unassigned";
}

const MANUAL_PAYMENT_OPTIONS = [
    { id: "online", label: "Online" },
    { id: "transferencia", label: "Transferencia" },
    { id: "datafono", label: "Datafono" },
    { id: "metalico", label: "Cortesía" },
    { id: "domiciliado", label: "Domiciliado" },
    { id: "failed", label: "Fallido" },
];

function paymentMethodLabel(state) {
    const labels = {
        online: "Online",
        transferencia: "Transferencia",
        datafono: "Datafono",
        metalico: "Cortesía",
        domiciliado: "Domiciliado",
        failed: "Fallido",
        unassigned: "Sin asignar",
    };
    return labels[state] || "Sin asignar";
}

function paymentMethodBadgeClass(state) {
    if (state === "online") return "bg-violet-900/40 text-violet-100 ring-violet-500/30";
    if (state === "transferencia") return "bg-sky-900/35 text-sky-100 ring-sky-600/30";
    if (state === "datafono") return "bg-indigo-900/35 text-indigo-100 ring-indigo-600/30";
    if (state === "metalico") return "bg-emerald-900/35 text-emerald-100 ring-emerald-600/30";
    if (state === "domiciliado") return "bg-cyan-900/35 text-cyan-100 ring-cyan-600/30";
    if (state === "failed") return "bg-rose-900/40 text-rose-100 ring-rose-500/35";
    return "bg-gray-800/80 text-gray-400 ring-gray-600/40";
}

function statusLabel(status) {
    if (status === "confirmed") return "Pagado";
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

function WhatsAppIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
            <path d="M12 2a10 10 0 0 0-8.7 14.95L2 22l5.2-1.36A10 10 0 1 0 12 2Zm0 18a7.9 7.9 0 0 1-4.02-1.1l-.29-.17-3.08.8.82-3-.19-.31A8 8 0 1 1 12 20Zm4.28-5.9c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1-.37-1.91-1.18-.7-.63-1.17-1.4-1.31-1.64-.14-.24-.01-.37.11-.49.1-.1.24-.26.36-.39.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.68 2.56 4.08 3.6.57.25 1.02.4 1.37.52.58.18 1.1.15 1.52.09.46-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z" />
        </svg>
    );
}

function firstName(fullName) {
    return String(fullName || "cliente").trim().split(/\s+/)[0] || "cliente";
}

function adminDisplayName(authUser) {
    const nombre = String(authUser?.nombre || "").trim();
    const apellido = String(authUser?.apellido || "").trim();
    const full = `${nombre} ${apellido}`.trim();
    return full || String(authUser?.name || "el equipo de Mas Que Surf").trim();
}

function formatAmountEuros(amount) {
    if (typeof amount !== "number" || Number.isNaN(amount)) {
        return "pendiente de confirmar";
    }
    return `${Number(amount).toFixed(2)} €`;
}

function taquillaDaysRemainingFromDate(vencimiento) {
    if (!vencimiento) return null;
    const end = new Date(vencimiento);
    if (Number.isNaN(end.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function taquillaAvailabilityLabel(data) {
    const total = data?.taquilla_total_days_remaining;
    const prepaid = Number(data?.taquilla_prepaid_extra_days || 0);
    const current = data?.taquilla_current_days_remaining;
    const finalExpires = data?.taquilla_final_expires_at;
    const fallbackDate = data?.vencimiento_usuario || data?.expires_at;

    if (total === null || total === undefined) {
        return taquillaAvailabilityFromSingleDate(fallbackDate);
    }

    const hasta = finalExpires ? fmtDate(finalExpires) : "—";

    if (total < 0) {
        const abs = Math.abs(total);
        return `tu taquilla venció hace ${abs} día${abs === 1 ? "" : "s"}`;
    }

    if (total === 0) {
        return `tu taquilla vence hoy (${hasta})`;
    }

    if (prepaid > 0 && typeof current === "number" && current >= 0) {
        return `te quedan ${total} días de taquilla en total (${current} del periodo actual + ${prepaid} ya pagados por adelantado), con cobertura hasta el ${hasta}`;
    }

    return `te quedan ${total} días de taquilla disponibles (hasta el ${hasta})`;
}

function taquillaAvailabilityFromSingleDate(vencimiento) {
    const days = taquillaDaysRemainingFromDate(vencimiento);
    const vence = fmtDate(vencimiento);
    if (days === null) {
        return "no tenemos fecha de vencimiento registrada para tu taquilla";
    }
    if (days < 0) {
        const abs = Math.abs(days);
        return `tu taquilla venció hace ${abs} día${abs === 1 ? "" : "s"} (el ${vence})`;
    }
    if (days === 0) {
        return `tu taquilla vence hoy (${vence})`;
    }
    return `te quedan ${days} día${days === 1 ? "" : "s"} de taquilla disponibles (hasta el ${vence})`;
}

function paymentStatusFriendly(row) {
    const method = paymentMethodLabel(pagoUi(row));
    if (row?.status === "confirmed") {
        return `confirmado (método: ${method})`;
    }
    if (row?.status === "rejected") {
        return "rechazado — nos gustaría ayudarte a resolverlo cuanto antes";
    }
    return `pendiente de confirmación (método: ${method})`;
}

function buildTaquillaContactMessage(row, adminName) {
    const nombre = firstName(row?.user);
    const admin = adminName || "el equipo de Mas Que Surf";
    const locker = row?.numeroTaquilla ? ` nº ${row.numeroTaquilla}` : "";
    const plan = shortPlanName(row?.plan);
    const estado = paymentStatusFriendly(row);
    const importe = formatAmountEuros(row?.amount);
    const fecha = row?.created_at_human || fmtDate(row?.periodo_inicio) || "aún sin fecha de registro";
    const disponibilidad = taquillaAvailabilityLabel(row);

    const subject = "Tu taquilla en Mas Que Surf — estado del pago";

    const body = `Buenos días, ${nombre}.

Soy ${admin}, del equipo de Mas Que Surf. Te escribo simplemente para comentarte, con total tranquilidad, el estado del pago de tu taquilla${locker}.

El estado actual es ${estado}.
El importe registrado es de ${importe}, a fecha de ${fecha} (plan: ${plan}).
Actualmente, ${disponibilidad}.

Cualquier duda que tengas, aquí nos tienes. ¡Gracias, ${nombre}!

Un saludo,
${admin}
Mas Que Surf`;

    return { subject, body };
}

function buildLockerUserContactMessage(u, adminName) {
    const nombre = firstName(u?.name);
    const admin = adminName || "el equipo de Mas Que Surf";
    const locker = u?.locker ? ` nº ${u.locker}` : "";
    const daysRemaining = typeof u?.days_remaining === "number" ? u.days_remaining : null;
    const hasPendingDays = daysRemaining !== null && daysRemaining < 0;
    const isOverdue = Boolean(u?.is_expired) || hasPendingDays;

    if (isOverdue || u?.up_to_date === false) {
        const subject = "Tu taquilla en Mas Que Surf — renovación de cuota";
        const body = `Hola ${nombre}, soy ${admin}.

Te escribo porque vemos que tu taquilla${locker ? locker : ""} lleva unos días pendientes de renovar. No es porque desconfiemos de ti para nada — de verdad.

Para nosotros, a nivel organizativo, es un lío andar pagando facturas con retraso o metiendo bonos y cuotas ya vencidos en el sistema (IVA, facturas, cuadre de caja…). Nos echarías un cable si pudieses actualizar la cuota cuanto antes.

No queremos presionar; solo intentamos evitar ese desorden interno. Gracias por tu paciencia.

Un saludo,
${nombre}`;

        return { subject, body };
    }

    const disponibilidad = taquillaAvailabilityLabel(u);

    let estado;
    if (u?.up_to_date) {
        estado = "al día y activa";
    } else {
        estado = "próxima a vencer — conviene planificar la renovación";
    }

    const subject = "Tu taquilla en Mas Que Surf — estado de la cuota";

    const body = `Buenos días, ${nombre}.

Soy ${admin}, del equipo de Mas Que Surf. Te escribo para comentarte el estado de tu taquilla${locker}.

El estado actual es ${estado}.
Actualmente, ${disponibilidad}.

Si quieres renovar o tienes cualquier duda sobre los pagos, aquí nos tienes. ¡Gracias, ${nombre}!

Un saludo,
${admin}
Mas Que Surf`;

    return { subject, body };
}

function lockerUserSortValue(u, key) {
    switch (key) {
        case "locker":
            return Number(u?.locker) || 999999;
        case "remaining":
            return typeof u?.days_remaining === "number" ? u.days_remaining : 999999;
        default:
            return 0;
    }
}

function compareLockerUsers(a, b, key, dir) {
    const va = lockerUserSortValue(a, key);
    const vb = lockerUserSortValue(b, key);
    const cmp = va - vb;
    return dir === "asc" ? cmp : -cmp;
}

function lockerDaysLabel(daysRemaining) {
    if (typeof daysRemaining !== "number") return "—";
    if (daysRemaining < 0) {
        const abs = Math.abs(daysRemaining);
        return `-${abs} día${abs === 1 ? "" : "s"}`;
    }
    return `${daysRemaining} día${daysRemaining === 1 ? "" : "s"}`;
}

function phoneToWaDigits(phone) {
    const raw = String(phone || "").replace(/\D/g, "");
    if (!raw) return null;
    return raw.startsWith("34") ? raw : `34${raw}`;
}

function buildTaquillaWhatsappLink(row, adminName) {
    const phone = phoneToWaDigits(row?.phone);
    if (!phone) return null;
    const { body } = buildTaquillaContactMessage(row, adminName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
}

function buildTaquillaMailtoLink(row, adminName) {
    const email = String(row?.email || "").trim();
    if (!email) return null;
    const { subject, body } = buildTaquillaContactMessage(row, adminName);
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildLockerWhatsappLink(u, adminName) {
    const phone = phoneToWaDigits(u?.phone);
    if (!phone) return null;
    const { body } = buildLockerUserContactMessage(u, adminName);
    return `https://wa.me/${phone}?text=${encodeURIComponent(body)}`;
}

function buildLockerMailtoLink(u, adminName) {
    const email = String(u?.email || "").trim();
    if (!email) return null;
    const { subject, body } = buildLockerUserContactMessage(u, adminName);
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const COLUMN_DEFAULT_SORT_DIR = {
    user: "asc",
    locker: "asc",
    plan: "asc",
    date: "desc",
    amount: "asc",
    method: "asc",
    status: "asc",
};

function rowSortValue(row, key) {
    switch (key) {
        case "user":
            return String(row?.user || "").toLowerCase();
        case "locker":
            return Number(row?.numeroTaquilla) || 999999;
        case "plan":
            return shortPlanName(row?.plan).toLowerCase();
        case "date":
            return row?.created_at ? new Date(row.created_at).getTime() : 0;
        case "amount":
            return typeof row?.amount === "number" ? row.amount : -1;
        case "method":
            return paymentMethodLabel(pagoUi(row)).toLowerCase();
        case "status":
            return statusLabel(row?.status).toLowerCase();
        default:
            return "";
    }
}

function compareRows(a, b, key, dir) {
    const va = rowSortValue(a, key);
    const vb = rowSortValue(b, key);
    let cmp = 0;
    if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
    } else {
        cmp = String(va).localeCompare(String(vb), "es");
    }
    return dir === "asc" ? cmp : -cmp;
}

const TAB_PAGOS = "pagos";
const TAB_SOCIOS = "socios";

function SectionTabs({ active, onChange, pagosCount, sociosCount, overdueCount }) {
    return (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-700 bg-gray-900/80 p-1">
            <button
                type="button"
                onClick={() => onChange(TAB_PAGOS)}
                className={`rounded-lg px-2 py-2.5 text-left text-xs font-semibold transition sm:px-3 sm:text-sm ${
                    active === TAB_PAGOS
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
                <span className="block">Pagos por verificar</span>
                <span className={`text-[10px] sm:text-xs ${active === TAB_PAGOS ? "text-sky-100" : "text-gray-500"}`}>
                    {pagosCount} registros
                </span>
            </button>
            <button
                type="button"
                onClick={() => onChange(TAB_SOCIOS)}
                className={`rounded-lg px-2 py-2.5 text-left text-xs font-semibold transition sm:px-3 sm:text-sm ${
                    active === TAB_SOCIOS
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
                <span className="block">Socios con taquilla</span>
                <span className={`text-[10px] sm:text-xs ${active === TAB_SOCIOS ? "text-sky-100" : "text-gray-500"}`}>
                    {sociosCount} socios
                    {overdueCount > 0 ? (
                        <span className={active === TAB_SOCIOS ? "text-amber-200" : "text-amber-400"}>
                            {" "}· {overdueCount} pendientes
                        </span>
                    ) : null}
                </span>
            </button>
        </div>
    );
}

function PaymentMobileCard({
    row,
    adminName,
    processingId,
    isUnreviewed,
    onReview,
    onMethodEdit,
    onFailedReasonView,
}) {
    const pagoState = pagoUi(row);
    const waLink = buildTaquillaWhatsappLink(row, adminName);
    const mailLink = buildTaquillaMailtoLink(row, adminName);

    return (
        <article className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{row.user || "—"}</p>
                    <p className="truncate text-xs text-gray-400">{row.email || "sin email"}</p>
                </div>
                {isUnreviewed ? (
                    <button
                        type="button"
                        onClick={() => onReview(row)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-500/50 bg-amber-900/30 text-amber-300"
                        aria-label="Sin revisar"
                    >
                        <Eye className="h-4 w-4" />
                    </button>
                ) : (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center text-gray-500" aria-hidden="true">
                        <EyeOff className="h-4 w-4" />
                    </span>
                )}
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-300">
                <p><span className="text-gray-500">Taquilla</span> <strong className="text-white">#{row.numeroTaquilla ?? "—"}</strong></p>
                <p><span className="text-gray-500">Plan</span> {shortPlanName(row.plan)}</p>
                <p><span className="text-gray-500">Fecha</span> {row.created_at_human || "—"}</p>
                <p>
                    <span className="text-gray-500">Importe</span>{" "}
                    <strong className="text-white">
                        {typeof row.amount === "number" ? `${Number(row.amount).toFixed(2)} €` : "—"}
                    </strong>
                </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(row.status)}`}>
                    {statusLabel(row.status)}
                </span>
                <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ${paymentMethodBadgeClass(pagoState)}`}>
                    {paymentMethodLabel(pagoState)}
                </span>
                <button
                    type="button"
                    onClick={() => onMethodEdit(row)}
                    disabled={processingId === `state-${row.id}`}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-700 text-gray-200 ring-1 ring-gray-500/50"
                    aria-label="Editar método"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
                {pagoState === "failed" && String(row.admin_notes || "").trim() ? (
                    <button
                        type="button"
                        onClick={() => onFailedReasonView(row)}
                        className="text-xs text-rose-300 underline"
                    >
                        Ver motivo
                    </button>
                ) : null}
            </div>

            <div className="mt-3 flex justify-end gap-2 border-t border-gray-700/80 pt-3">
                {waLink ? (
                    <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white" aria-label="WhatsApp">
                        <WhatsAppIcon className="h-4 w-4" />
                    </a>
                ) : null}
                {mailLink ? (
                    <a href={mailLink} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white" aria-label="Email">
                        <Mail className="h-4 w-4" />
                    </a>
                ) : null}
            </div>
        </article>
    );
}

function LockerUserMobileCard({ u, adminName, onReassign, onViewPayments }) {
    const daysRemaining = typeof u.days_remaining === "number" ? u.days_remaining : null;
    const isNegative = daysRemaining !== null && daysRemaining < 0;
    const barPct = Math.max(0, Math.min(100, Number(u.progress || 0)));
    const waLink = buildLockerWhatsappLink(u, adminName);
    const mailLink = buildLockerMailtoLink(u, adminName);

    return (
        <article className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{u.name}</p>
                    <p className="truncate text-xs text-gray-400">{u.email || "sin email"}</p>
                </div>
                <button
                    type="button"
                    onClick={() => onReassign(u)}
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        u.up_to_date && !isNegative
                            ? "bg-emerald-900/35 text-emerald-100 ring-1 ring-emerald-600/30"
                            : "bg-amber-900/35 text-amber-100 ring-1 ring-amber-600/25"
                    }`}
                >
                    #{u.locker}
                </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-300">
                <span>Vence: {fmtDate(u.expires_at)}</span>
                <span className={isNegative ? "font-semibold text-rose-300" : ""}>
                    Quedan: {lockerDaysLabel(daysRemaining)}
                </span>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-gray-700">
                <div
                    className={`h-1.5 rounded-full ${isNegative ? "bg-rose-500" : "bg-emerald-500"}`}
                    style={{ width: `${isNegative ? 100 : barPct}%` }}
                />
            </div>
            <div className="mt-3 flex justify-end gap-2 border-t border-gray-700/80 pt-3">
                <button
                    type="button"
                    onClick={() => onViewPayments(u)}
                    className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-200"
                >
                    Pagos
                </button>
                {waLink ? (
                    <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white" aria-label="WhatsApp">
                        <WhatsAppIcon className="h-4 w-4" />
                    </a>
                ) : null}
                {mailLink ? (
                    <a href={mailLink} className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500 text-white" aria-label="Email">
                        <Mail className="h-4 w-4" />
                    </a>
                ) : null}
            </div>
        </article>
    );
}

function SortableTh({ label, sortKey, activeKey, activeDir, onSort, className = "px-4 py-3 text-left" }) {
    const active = activeKey === sortKey;
    return (
        <th className={className}>
            <button
                type="button"
                onClick={() => onSort(sortKey)}
                className="group inline-flex items-center gap-1 rounded-md text-left font-medium text-gray-200 transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60"
                title={`Ordenar por ${label}`}
            >
                <span>{label}</span>
                <span className="inline-flex flex-col leading-none" aria-hidden="true">
                    <ChevronUp
                        className={`h-3 w-3 -mb-0.5 ${active && activeDir === "asc" ? "text-sky-400" : "text-gray-500 group-hover:text-gray-300"}`}
                    />
                    <ChevronDown
                        className={`h-3 w-3 ${active && activeDir === "desc" ? "text-sky-400" : "text-gray-500 group-hover:text-gray-300"}`}
                    />
                </span>
            </button>
        </th>
    );
}

function planSummaryChipClass(label) {
    const map = {
        anuales: "border-violet-500/35 bg-gradient-to-br from-violet-500/25 to-purple-900/20 text-violet-50 shadow-[0_0_20px_rgba(139,92,246,0.12)]",
        semestrales: "border-indigo-500/35 bg-gradient-to-br from-indigo-500/25 to-blue-900/20 text-indigo-50 shadow-[0_0_20px_rgba(99,102,241,0.12)]",
        trimestrales: "border-cyan-500/35 bg-gradient-to-br from-cyan-500/25 to-sky-900/20 text-cyan-50 shadow-[0_0_20px_rgba(6,182,212,0.12)]",
        bimestrales: "border-teal-500/35 bg-gradient-to-br from-teal-500/25 to-emerald-900/20 text-teal-50 shadow-[0_0_20px_rgba(20,184,166,0.1)]",
        mensuales: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/25 to-green-900/20 text-emerald-50 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
    };
    return map[label] || "border-gray-600/40 bg-gradient-to-br from-gray-700/40 to-gray-900/30 text-gray-100";
}

function ActivePlanSummary({ summary, compact = false }) {
    const items = summary?.items || [];
    if (items.length === 0) return null;

    if (compact) {
        return (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-700/60 bg-gray-800/50 px-3 py-2">
                <span className="text-xs font-semibold text-gray-300">
                    {summary.total} socios activos
                </span>
                {items.map((item) => (
                    <span
                        key={item.label}
                        className={`rounded-lg border px-2 py-0.5 text-[11px] font-semibold ${planSummaryChipClass(item.label)}`}
                    >
                        {item.count} {item.label}
                    </span>
                ))}
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full overflow-hidden rounded-2xl border border-gray-700/80 bg-gradient-to-br from-gray-800/90 via-gray-900/95 to-slate-950 p-4 shadow-xl shadow-black/20 lg:max-w-2xl"
        >
            <div
                className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-sky-500/10 blur-3xl"
                aria-hidden="true"
            />
            <div
                className="pointer-events-none absolute -bottom-12 left-1/3 h-28 w-28 rounded-full bg-violet-500/10 blur-3xl"
                aria-hidden="true"
            />

            <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-200">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold tracking-tight text-white">Socios con cuota activa</p>
                        <p className="text-[11px] text-gray-400">
                            A fecha de hoy
                            {summary?.as_of_human ? (
                                <span className="text-gray-500"> · {summary.as_of_human}</span>
                            ) : null}
                        </p>
                    </div>
                </div>

                {typeof summary?.total === "number" ? (
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-center">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Total</p>
                        <p className="text-lg font-black leading-none text-white">{summary.total}</p>
                    </div>
                ) : null}
            </div>

            <div className="relative mt-4 flex flex-wrap gap-2">
                {items.map((item, index) => (
                    <motion.div
                        key={item.label}
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05, duration: 0.2 }}
                        className={`flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 ${planSummaryChipClass(item.label)}`}
                    >
                        <span className="text-2xl font-black leading-none tabular-nums">{item.count}</span>
                        <span className="text-xs font-semibold capitalize leading-tight">{item.label}</span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
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
    const authUser = usePage().props.auth?.user;
    const adminName = useMemo(() => adminDisplayName(authUser), [authUser]);
    const filterPillBase = "rounded-full px-3 py-1 text-xs font-semibold transition-colors";
    const filterPillActive = "bg-sky-600 text-white";
    const filterPillIdle = "bg-sky-900/40 text-sky-100 hover:bg-sky-800/50";
    const [search, setSearch] = useState(pagos?.filters?.search || "");
    const [status, setStatus] = useState(pagos?.filters?.status || "all");
    const [prioritizeUnreviewed, setPrioritizeUnreviewed] = useState(false);
    const [sortKey, setSortKey] = useState("date");
    const [sortDir, setSortDir] = useState("desc");
    const [showAllLockerUsers, setShowAllLockerUsers] = useState(false);
    const [lockerSortKey, setLockerSortKey] = useState("locker");
    const [lockerSortDir, setLockerSortDir] = useState("asc");
    const [activeSection, setActiveSection] = useState(TAB_PAGOS);
    const [processingId, setProcessingId] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [reassigning, setReassigning] = useState(null); // { user_id, name, locker_number }
    const [toast, setToast] = useState(null);
    const [reviewModal, setReviewModal] = useState(null); // row
    const [processingReviewId, setProcessingReviewId] = useState(null);
    const [failedReasonModal, setFailedReasonModal] = useState(null); // { row, reason }
    const [failedReasonViewModal, setFailedReasonViewModal] = useState(null); // row
    const [methodEditModal, setMethodEditModal] = useState(null); // row
    const [focusedUserPayments, setFocusedUserPayments] = useState(null); // { id, name }

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDir(COLUMN_DEFAULT_SORT_DIR[key] || "asc");
    };

    const toggleLockerSort = (key) => {
        if (lockerSortKey === key) {
            setLockerSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }
        setLockerSortKey(key);
        setLockerSortDir(key === "remaining" ? "asc" : "asc");
    };

    const allLockerUsers = useMemo(() => {
        const base = [...(pagos?.lockerUsers || [])];
        base.sort((a, b) => compareLockerUsers(a, b, lockerSortKey, lockerSortDir));
        return base;
    }, [pagos?.lockerUsers, lockerSortKey, lockerSortDir]);

    const visibleLockerUsers = useMemo(() => {
        if (showAllLockerUsers) return allLockerUsers;
        return allLockerUsers.slice(0, 10);
    }, [allLockerUsers, showAllLockerUsers]);

    const lockerUsersTotal = allLockerUsers.length;

    const overdueLockerCount = useMemo(
        () => allLockerUsers.filter(
            (u) => (typeof u.days_remaining === "number" && u.days_remaining < 0)
                || Boolean(u.is_expired)
                || u.up_to_date === false,
        ).length,
        [allLockerUsers],
    );

    const rows = useMemo(() => {
        const base = [...(pagos?.rows || [])];
        base.sort((a, b) => {
            if (prioritizeUnreviewed) {
                const unreviewedDiff = Number(Boolean(b?.is_new)) - Number(Boolean(a?.is_new));
                if (unreviewedDiff !== 0) return unreviewedDiff;
            }
            if (sortKey) {
                return compareRows(a, b, sortKey, sortDir);
            }
            return 0;
        });
        return base;
    }, [pagos?.rows, prioritizeUnreviewed, sortKey, sortDir]);
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

    const applyManualPaymentMethod = (row, nextState) => {
        if (!row?.id) return;
        if (nextState === "failed") {
            setMethodEditModal(null);
            setFailedReasonModal({
                row,
                reason: row.status === "rejected" ? String(row.admin_notes || "") : "",
            });
            return;
        }
        updatePagoState(row, nextState);
        setMethodEditModal(null);
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
                setToast({ type: "success", message: "Pago marcado como revisado." });
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
            <div className="mx-auto flex h-[calc(100dvh-3.25rem)] max-w-7xl flex-col gap-2 overflow-hidden p-3 text-gray-200 sm:gap-3 sm:p-4 md:gap-3 md:p-5 lg:h-[calc(100dvh-4rem)]">
                <header className="shrink-0 space-y-2">
                    <Breadcrumbs
                        items={[
                            { label: "Admin", href: route("Pag_principal") },
                            { label: "Taquillas", href: route("taquilla.index.admin") },
                            { label: "Pagos por verificar" },
                        ]}
                        variant="dark"
                        className="mb-0 hidden sm:flex"
                    />
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <h1 className="text-lg font-bold leading-tight text-white sm:text-xl lg:text-2xl">
                            {focusedUserPayments?.name
                                ? `Pagos de ${focusedUserPayments.name}`
                                : "Pagos por verificar · Taquillas"}
                        </h1>
                        {!focusedUserPayments ? (
                            <>
                                <div className="lg:hidden">
                                    <ActivePlanSummary summary={pagos?.activePlanSummary} compact />
                                </div>
                                <div className="hidden lg:block lg:max-w-2xl">
                                    <ActivePlanSummary summary={pagos?.activePlanSummary} />
                                </div>
                            </>
                        ) : null}
                    </div>
                </header>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyFilters({ search: e.currentTarget.value })}
                        placeholder="Buscar nombre, email, taquilla…"
                        className="min-w-0 flex-1 rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-gray-100 outline-none transition focus:border-sky-500 sm:max-w-xs"
                    />
                    <button type="button" onClick={() => applyFilters()} className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500">Buscar</button>
                    {focusedUserPayments ? (
                        <button
                            type="button"
                            onClick={() => setFocusedUserPayments(null)}
                            className="rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700"
                        >
                            Ver todos
                        </button>
                    ) : null}
                </div>

                {!focusedUserPayments ? (
                    <SectionTabs
                        active={activeSection}
                        onChange={setActiveSection}
                        pagosCount={counts.all || 0}
                        sociosCount={lockerUsersTotal}
                        overdueCount={overdueLockerCount}
                    />
                ) : null}

                {activeSection === TAB_PAGOS || focusedUserPayments ? (
                    <>
                        <div className="flex shrink-0 gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {statusOptions.map((s) => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        setStatus(s.id);
                                        applyFilters({ status: s.id });
                                    }}
                                    className={`shrink-0 ${filterPillBase} ${status === s.id ? filterPillActive : filterPillIdle}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900">
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                                <div className="space-y-2 p-2 md:hidden">
                                    {tableLoading ? (
                                        Array.from({ length: 4 }).map((_, i) => (
                                            <div key={`sk-m-${i}`} className="h-28 animate-pulse rounded-xl bg-gray-800" />
                                        ))
                                    ) : visibleRows.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-gray-400">Sin registros para estos filtros.</p>
                                    ) : visibleRows.map((row) => (
                                        <PaymentMobileCard
                                            key={row.id}
                                            row={row}
                                            adminName={adminName}
                                            processingId={processingId}
                                            isUnreviewed={isRowUnreviewed(row)}
                                            onReview={setReviewModal}
                                            onMethodEdit={setMethodEditModal}
                                            onFailedReasonView={setFailedReasonViewModal}
                                        />
                                    ))}
                                </div>

                                <table className="hidden min-w-full text-sm md:table">
                            <thead className="sticky top-0 bg-gray-800 text-gray-200">
                                <tr>
                                    <th className="w-10 px-2 py-3 text-left" aria-label="Ordenar por sin revisar">
                                        <button
                                            type="button"
                                            onClick={() => setPrioritizeUnreviewed((prev) => !prev)}
                                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition ${
                                                prioritizeUnreviewed
                                                    ? "border-amber-400/60 bg-amber-900/25 text-amber-200"
                                                    : "border-gray-600 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                                            }`}
                                            title={prioritizeUnreviewed ? "Quitar prioridad de sin revisar" : "Priorizar pagos sin revisar"}
                                            aria-label="Ordenar por pagos sin revisar"
                                        >
                                            {prioritizeUnreviewed ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                        </button>
                                    </th>
                                    <SortableTh label="Usuario" sortKey="user" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                    <SortableTh label="Taquilla" sortKey="locker" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                    <SortableTh label="Plan" sortKey="plan" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                    <SortableTh label="Fecha" sortKey="date" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                    <SortableTh label="Importe" sortKey="amount" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                    <SortableTh label="Método" sortKey="method" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                    <SortableTh label="Estado" sortKey="status" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                    <th className="px-4 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tableLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={`skeleton-${i}`} className="border-t border-gray-700 animate-pulse">
                                            <td className="px-2 py-3"><div className="h-3 w-4 rounded bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="h-3 w-32 rounded bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="h-3 w-10 rounded bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="h-3 w-16 rounded bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="h-3 w-24 rounded bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="h-3 w-14 rounded bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="h-6 w-24 rounded-full bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="h-6 w-20 rounded-full bg-gray-700" /></td>
                                            <td className="px-4 py-3"><div className="ml-auto h-7 w-16 rounded bg-gray-700" /></td>
                                        </tr>
                                    ))
                                ) : visibleRows.length === 0 ? (
                                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-400">Sin registros para estos filtros.</td></tr>
                                ) : visibleRows.map((row) => {
                                    const pagoState = pagoUi(row);
                                    const waLink = buildTaquillaWhatsappLink(row, adminName);
                                    const mailLink = buildTaquillaMailtoLink(row, adminName);
                                    return (
                                        <tr
                                            key={row.id}
                                            className="border-t border-gray-700 text-gray-100"
                                        >
                                            <td className="px-2 py-3">
                                                {isRowUnreviewed(row) ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setReviewModal(row);
                                                        }}
                                                        className="mx-auto flex h-7 w-7 items-center justify-center rounded-full border border-amber-500/50 bg-amber-900/30 text-amber-300 shadow-[0_0_0_2px_rgba(245,158,11,0.15)] transition hover:bg-amber-900/50 hover:text-amber-100"
                                                        title="Sin revisar — pulsa para marcar como visto"
                                                        aria-label="Pago sin revisar"
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <span
                                                        className="mx-auto flex h-7 w-7 items-center justify-center rounded-full text-gray-500"
                                                        title="Revisado"
                                                        aria-label="Pago revisado"
                                                    >
                                                        <EyeOff className="h-4 w-4" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-semibold text-gray-100">{row.user || "—"}</p>
                                                <p className="text-xs text-gray-400">{row.email || "sin email"}</p>
                                            </td>
                                            <td className="px-4 py-3 font-semibold text-white">{row.numeroTaquilla ?? "—"}</td>
                                            <td className="px-4 py-3 text-gray-200">{shortPlanName(row.plan)}</td>
                                            <td className="px-4 py-3 text-gray-300">{row.created_at_human || "—"}</td>
                                            <td className="px-4 py-3 font-semibold text-white">
                                                {typeof row.amount === "number" ? `${Number(row.amount).toFixed(2)} €` : "—"}
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex h-7 items-center gap-1.5">
                                                        <span
                                                            className={`inline-flex h-7 w-[7.75rem] shrink-0 items-center justify-center rounded-lg px-2 text-xs font-semibold ring-1 ${paymentMethodBadgeClass(pagoState)}`}
                                                            title={pagoState === "online" ? "Pago online (tarjeta en web)" : undefined}
                                                        >
                                                            {paymentMethodLabel(pagoState)}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setMethodEditModal(row);
                                                            }}
                                                            disabled={processingId === `state-${row.id}`}
                                                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-700 text-gray-200 ring-1 ring-gray-500/50 transition hover:bg-gray-600 hover:text-white disabled:opacity-50"
                                                            title="Editar método de pago"
                                                            aria-label="Editar método de pago"
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                    {row.referencia_pago_externa ? (
                                                        <p className="max-w-[10.5rem] truncate pl-0.5 text-[10px] text-gray-500" title={row.referencia_pago_externa}>
                                                            {row.referencia_pago_externa}
                                                        </p>
                                                    ) : (
                                                        <span className="block h-[14px]" aria-hidden="true" />
                                                    )}
                                                    {pagoState === "failed" && String(row.admin_notes || "").trim() ? (
                                                        <button
                                                            type="button"
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                setFailedReasonViewModal(row);
                                                            }}
                                                            className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-rose-200 ring-1 ring-gray-500/50 hover:bg-gray-600"
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
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(row.status)}`}>
                                                    {statusLabel(row.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex justify-end gap-2">
                                                    {waLink ? (
                                                        <a
                                                            href={waLink}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow transition-all hover:scale-105 hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300/70"
                                                            title="Contactar por WhatsApp"
                                                            aria-label="Contactar por WhatsApp"
                                                        >
                                                            <WhatsAppIcon className="h-3.5 w-3.5" />
                                                        </a>
                                                    ) : null}
                                                    {mailLink ? (
                                                        <a
                                                            href={mailLink}
                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow transition-all hover:scale-105 hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300/70"
                                                            title="Enviar email"
                                                            aria-label="Enviar email"
                                                        >
                                                            <Mail className="h-3.5 w-3.5" />
                                                        </a>
                                                    ) : null}
                                                    {!waLink && !mailLink ? (
                                                        <span className="text-xs text-gray-500">—</span>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                            </div>
                        </div>
                    </>
                ) : null}

                {activeSection === TAB_SOCIOS && !focusedUserPayments ? (
                    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 p-3 sm:p-4">
                        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                            <p className="text-xs text-gray-400">
                                {showAllLockerUsers
                                    ? `${lockerUsersTotal} socios`
                                    : `Mostrando ${Math.min(10, lockerUsersTotal)} de ${lockerUsersTotal}`}
                            </p>
                            {lockerUsersTotal > 10 ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAllLockerUsers((prev) => !prev)}
                                    className="rounded-lg border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs font-semibold text-gray-200 hover:bg-gray-700"
                                >
                                    {showAllLockerUsers ? "Ver menos" : "Ver todos"}
                                </button>
                            ) : null}
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                            <div className="space-y-2 md:hidden">
                                {visibleLockerUsers.length === 0 ? (
                                    <p className="py-8 text-center text-sm text-gray-400">Sin socios con taquilla.</p>
                                ) : visibleLockerUsers.map((u) => (
                                    <LockerUserMobileCard
                                        key={u.id}
                                        u={u}
                                        adminName={adminName}
                                        onReassign={(user) => setReassigning({
                                            user_id: user.id,
                                            name: user.name,
                                            locker_number: Number(user.locker),
                                        })}
                                        onViewPayments={(user) => {
                                            setFocusedUserPayments({ id: user.id, name: user.name || "Usuario" });
                                            setActiveSection(TAB_PAGOS);
                                        }}
                                    />
                                ))}
                            </div>

                            <table className="hidden min-w-full text-sm md:table">
                            <thead className="bg-gray-800 text-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left">Usuario</th>
                                    <SortableTh
                                        label="Taquilla"
                                        sortKey="locker"
                                        activeKey={lockerSortKey}
                                        activeDir={lockerSortDir}
                                        onSort={toggleLockerSort}
                                    />
                                    <th className="px-4 py-3 text-left">Vence</th>
                                    <SortableTh
                                        label="Quedan"
                                        sortKey="remaining"
                                        activeKey={lockerSortKey}
                                        activeDir={lockerSortDir}
                                        onSort={toggleLockerSort}
                                    />
                                    <th className="px-4 py-3 text-right">Contacto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleLockerUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                                            Sin socios con taquilla asignada.
                                        </td>
                                    </tr>
                                ) : visibleLockerUsers.map((u) => {
                                    const daysRemaining = typeof u.days_remaining === "number" ? u.days_remaining : null;
                                    const isNegative = daysRemaining !== null && daysRemaining < 0;
                                    const barPct = Math.max(0, Math.min(100, Number(u.progress || 0)));

                                    return (
                                    <tr key={u.id} className="border-t border-gray-700 text-gray-100">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-gray-100">{u.name}</p>
                                            <p className="text-xs text-gray-400">{u.email || "sin email"}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                type="button"
                                                onClick={() => setReassigning({ user_id: u.id, name: u.name, locker_number: Number(u.locker) })}
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${u.up_to_date && !isNegative ? "bg-emerald-900/35 text-emerald-100 ring-1 ring-emerald-600/30" : "bg-amber-900/35 text-amber-100 ring-1 ring-amber-600/25"}`}
                                            >
                                                #{u.locker}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">{fmtDate(u.expires_at)}</td>
                                        <td className="px-4 py-3">
                                            <div className={`mb-1 text-xs font-semibold ${isNegative ? "text-rose-300" : "text-gray-300"}`}>
                                                {lockerDaysLabel(daysRemaining)}
                                            </div>
                                            <div className="h-2 w-40 rounded-full bg-gray-700">
                                                <div
                                                    className={`h-2 rounded-full ${isNegative ? "bg-rose-500" : "bg-emerald-500"}`}
                                                    style={{ width: `${isNegative ? 100 : barPct}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setFocusedUserPayments({ id: u.id, name: u.name || "Usuario" });
                                                    }}
                                                    className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-200 hover:bg-gray-700"
                                                >
                                                    Ver pagos
                                                </button>
                                                {u.phone ? (
                                                    <a
                                                        href={buildLockerWhatsappLink(u, adminName) || "#"}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow transition-all hover:scale-105 hover:bg-emerald-500"
                                                        title="Contactar por WhatsApp"
                                                        aria-label="WhatsApp"
                                                    >
                                                        <WhatsAppIcon className="h-3.5 w-3.5" />
                                                    </a>
                                                ) : <span className="text-xs text-gray-500">sin tel.</span>}
                                                {u.email ? (
                                                    <a
                                                        href={buildLockerMailtoLink(u, adminName) || "#"}
                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow transition-all hover:scale-105 hover:bg-sky-400"
                                                        title="Enviar email"
                                                        aria-label="Enviar email"
                                                    >
                                                        <Mail className="h-3.5 w-3.5" />
                                                    </a>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                ) : null}
            </div>

            <ModalShell open={!!reviewModal} onClose={() => setReviewModal(null)} maxWidth="max-w-md">
                <div className="space-y-3">
                    <p className="text-lg font-bold text-slate-900">Marcar como revisado</p>
                    <p className="text-sm text-slate-700">
                        ¿Confirmas que ya has revisado el pago de <strong>{reviewModal?.user || "este usuario"}</strong>?
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
                            {processingReviewId ? "Procesando..." : "Marcar revisado"}
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
            <ModalShell open={!!methodEditModal} onClose={() => setMethodEditModal(null)} maxWidth="max-w-sm">
                <div className="space-y-4">
                    <div>
                        <p className="text-lg font-bold text-slate-900">Método de pago</p>
                        <p className="text-sm text-slate-600">
                            {methodEditModal?.user || "Usuario"} · selecciona cómo se cobró
                        </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                        {MANUAL_PAYMENT_OPTIONS.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => applyManualPaymentMethod(methodEditModal, opt.id)}
                                disabled={processingId === `state-${methodEditModal?.id}`}
                                className={`rounded-xl px-3 py-2.5 text-left text-sm font-semibold ring-1 transition disabled:opacity-60 ${
                                    pagoUi(methodEditModal) === opt.id
                                        ? opt.id === "online"
                                            ? "bg-violet-50 text-violet-800 ring-violet-300"
                                            : "bg-sky-50 text-sky-800 ring-sky-300"
                                        : opt.id === "failed"
                                            ? "bg-white text-rose-700 ring-rose-200 hover:bg-rose-50"
                                            : opt.id === "online"
                                                ? "bg-white text-violet-700 ring-violet-200 hover:bg-violet-50"
                                                : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setMethodEditModal(null)}
                            className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700"
                        >
                            Cancelar
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

