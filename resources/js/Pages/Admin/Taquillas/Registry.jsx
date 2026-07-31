import React, { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Mail, Users } from "lucide-react";
import Breadcrumbs from "../../../components/Breadcrumbs";
import WhatsAppIcon from "../../../components/icons/WhatsAppIcon";
import { SortableTh, compareRows as compareRowsByValue } from "../../../components/SortableTable";
import { whatsappUrlFromPhone } from "../../../lib/whatsapp";

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
    if (typeof amount !== "number" || Number.isNaN(amount)) return "—";
    return `${Number(amount).toFixed(2)} €`;
}

function paidAtLabel(row) {
    return row?.paid_at_human || row?.created_at_human || fmtDate(row?.periodo_inicio) || "—";
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

function taquillaAvailabilityFromSingleDate(vencimiento) {
    const days = taquillaDaysRemainingFromDate(vencimiento);
    const vence = fmtDate(vencimiento);
    if (days === null) return "no tenemos fecha de vencimiento registrada para tu taquilla";
    if (days < 0) {
        const abs = Math.abs(days);
        return `tu taquilla venció hace ${abs} día${abs === 1 ? "" : "s"} (el ${vence})`;
    }
    if (days === 0) return `tu taquilla vence hoy (${vence})`;
    return `te quedan ${days} día${days === 1 ? "" : "s"} de taquilla disponibles (hasta el ${vence})`;
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
    if (total === 0) return `tu taquilla vence hoy (${hasta})`;
    if (prepaid > 0 && typeof current === "number" && current >= 0) {
        return `te quedan ${total} días de taquilla en total (${current} del periodo actual + ${prepaid} ya pagados por adelantado), con cobertura hasta el ${hasta}`;
    }
    return `te quedan ${total} días de taquilla disponibles (hasta el ${hasta})`;
}

function buildTaquillaContactMessage(row, adminName) {
    const nombre = firstName(row?.user);
    const admin = adminName || "el equipo de Mas Que Surf";
    const locker = row?.numeroTaquilla ? ` nº ${row.numeroTaquilla}` : "";
    const plan = shortPlanName(row?.plan);
    const importe = formatAmountEuros(row?.amount);
    const fecha = paidAtLabel(row);
    const disponibilidad = taquillaAvailabilityLabel(row);
    const estado = statusLabel(row?.status);

    const subject = "Tu taquilla en Mas Que Surf — registro de pago";
    const body = `Buenos días, ${nombre}.

Soy ${admin}, del equipo de Mas Que Surf. Te escribo sobre el pago de tu taquilla${locker}.

Estado: ${estado}.
Importe: ${importe} · Fecha: ${fecha} · Plan: ${plan}.
Actualmente, ${disponibilidad}.

Cualquier duda, aquí nos tienes. ¡Gracias, ${nombre}!

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

Te escribo porque vemos que tu taquilla${locker} lleva unos días pendientes de renovar.

Para nosotros, a nivel organizativo, ayuda mucho mantener las cuotas al día. Si puedes actualizarla cuanto antes, te lo agradecemos.

Un saludo,
${admin}`;
        return { subject, body };
    }

    const disponibilidad = taquillaAvailabilityLabel(u);
    const estado = u?.up_to_date ? "al día y activa" : "próxima a vencer — conviene planificar la renovación";
    const subject = "Tu taquilla en Mas Que Surf — estado de la cuota";
    const body = `Buenos días, ${nombre}.

Soy ${admin}, del equipo de Mas Que Surf. Te escribo para comentarte el estado de tu taquilla${locker}.

El estado actual es ${estado}.
Actualmente, ${disponibilidad}.

Si quieres renovar o tienes cualquier duda, aquí nos tienes. ¡Gracias, ${nombre}!

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

function buildTaquillaWhatsappLink(row, adminName) {
    const { body } = buildTaquillaContactMessage(row, adminName);
    return whatsappUrlFromPhone(row?.phone, body);
}

function buildTaquillaMailtoLink(row, adminName) {
    const email = String(row?.email || "").trim();
    if (!email) return null;
    const { subject, body } = buildTaquillaContactMessage(row, adminName);
    return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function buildLockerWhatsappLink(u, adminName) {
    const { body } = buildLockerUserContactMessage(u, adminName);
    return whatsappUrlFromPhone(u?.phone, body);
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
            return row?.paid_at || row?.created_at
                ? new Date(row.paid_at || row.created_at).getTime()
                : 0;
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
    return compareRowsByValue(a, b, key, dir, rowSortValue);
}

const TAB_PAGOS = "pagos";
const TAB_REASIGNAR = "reasignar";

function SectionTabs({ active, onChange, pagosCount, sociosCount }) {
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
                <span className="block">Registro de pagos</span>
                <span className={`text-[10px] sm:text-xs ${active === TAB_PAGOS ? "text-sky-100" : "text-gray-500"}`}>
                    {pagosCount} registros
                </span>
            </button>
            <button
                type="button"
                onClick={() => onChange(TAB_REASIGNAR)}
                className={`rounded-lg px-2 py-2.5 text-left text-xs font-semibold transition sm:px-3 sm:text-sm ${
                    active === TAB_REASIGNAR
                        ? "bg-sky-600 text-white shadow-sm"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
            >
                <span className="block">Reasignar</span>
                <span className={`text-[10px] sm:text-xs ${active === TAB_REASIGNAR ? "text-sky-100" : "text-gray-500"}`}>
                    {sociosCount} socios · cambio rápido de taquilla
                </span>
            </button>
        </div>
    );
}

function PaymentMobileCard({ row, adminName, onOpenProof }) {
    const pagoState = pagoUi(row);
    const waLink = buildTaquillaWhatsappLink(row, adminName);
    const mailLink = buildTaquillaMailtoLink(row, adminName);

    return (
        <article className="rounded-xl border border-gray-700 bg-gray-800/60 p-3">
            <div className="min-w-0">
                <p className="truncate font-semibold text-white">{row.user || "—"}</p>
                <p className="truncate text-xs text-gray-400">{row.email || "sin email"}</p>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-300">
                <p>
                    <span className="text-gray-500">Taquilla</span>{" "}
                    <strong className="text-white">#{row.numeroTaquilla ?? "—"}</strong>
                </p>
                <p>
                    <span className="text-gray-500">Plan</span> {shortPlanName(row.plan)}
                </p>
                <p>
                    <span className="text-gray-500">Fecha</span> {paidAtLabel(row)}
                </p>
                <p>
                    <span className="text-gray-500">Importe</span>{" "}
                    <strong className="text-white">{formatAmountEuros(row.amount)}</strong>
                </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(row.status)}`}>
                    {statusLabel(row.status)}
                </span>
                <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ${paymentMethodBadgeClass(pagoState)}`}>
                    {paymentMethodLabel(pagoState)}
                </span>
                {row.proof_url ? (
                    <button
                        type="button"
                        onClick={() => onOpenProof(row)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-sky-300 underline-offset-2 hover:underline"
                    >
                        Recibo <ExternalLink className="h-3 w-3" />
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
                    className="shrink-0 rounded-full bg-sky-900/40 px-2.5 py-1 text-xs font-semibold text-sky-100 ring-1 ring-sky-600/30"
                >
                    #{u.locker}
                </button>
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

function planSummaryChipClass(label) {
    const map = {
        anuales: "border-violet-500/35 bg-gradient-to-br from-violet-500/25 to-purple-900/20 text-violet-50",
        semestrales: "border-indigo-500/35 bg-gradient-to-br from-indigo-500/25 to-blue-900/20 text-indigo-50",
        trimestrales: "border-cyan-500/35 bg-gradient-to-br from-cyan-500/25 to-sky-900/20 text-cyan-50",
        bimestrales: "border-teal-500/35 bg-gradient-to-br from-teal-500/25 to-emerald-900/20 text-teal-50",
        mensuales: "border-emerald-500/35 bg-gradient-to-br from-emerald-500/25 to-green-900/20 text-emerald-50",
    };
    return map[label] || "border-gray-600/40 bg-gradient-to-br from-gray-700/40 to-gray-900/30 text-gray-100";
}

function ActivePlanSummary({ summary, compact = false }) {
    const items = summary?.items || [];
    if (items.length === 0) return null;

    if (compact) {
        return (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-700/60 bg-gray-800/50 px-3 py-2">
                <span className="text-xs font-semibold text-gray-300">{summary.total} socios activos</span>
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
            <div className="relative flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/15 text-sky-200">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-sm font-bold tracking-tight text-white">Socios con cuota activa</p>
                        <p className="text-[11px] text-gray-400">
                            A fecha de hoy
                            {summary?.as_of_human ? <span className="text-gray-500"> · {summary.as_of_human}</span> : null}
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

export default function Registry({ pagos }) {
    const authUser = usePage().props.auth?.user;
    const adminName = useMemo(() => adminDisplayName(authUser), [authUser]);
    const filterPillBase = "rounded-full px-3 py-1 text-xs font-semibold transition-colors";
    const filterPillActive = "bg-sky-600 text-white";
    const filterPillIdle = "bg-sky-900/40 text-sky-100 hover:bg-sky-800/50";

    const [search, setSearch] = useState(pagos?.filters?.search || "");
    const [status, setStatus] = useState(pagos?.filters?.status || "all");
    const [sortKey, setSortKey] = useState("date");
    const [sortDir, setSortDir] = useState("desc");
    const [showAllLockerUsers, setShowAllLockerUsers] = useState(false);
    const [lockerSortKey, setLockerSortKey] = useState("locker");
    const [lockerSortDir, setLockerSortDir] = useState("asc");
    const [activeSection, setActiveSection] = useState(TAB_PAGOS);
    const [processingId, setProcessingId] = useState(null);
    const [tableLoading, setTableLoading] = useState(false);
    const [reassigning, setReassigning] = useState(null);
    const [toast, setToast] = useState(null);
    const [proofModal, setProofModal] = useState(null);
    const [focusedUserPayments, setFocusedUserPayments] = useState(null);

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
        setLockerSortDir("asc");
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

    const rows = useMemo(() => {
        const base = [...(pagos?.rows || [])];
        base.sort((a, b) => compareRows(a, b, sortKey, sortDir));
        return base;
    }, [pagos?.rows, sortKey, sortDir]);

    const visibleRows = useMemo(() => {
        if (!focusedUserPayments?.id) return rows;
        return rows.filter((row) => Number(row?.user_id) === Number(focusedUserPayments.id));
    }, [rows, focusedUserPayments]);

    const counts = pagos?.counts || {};

    const applyFilters = (next = {}) => {
        const q = {
            status: next.status ?? status,
            search: next.search ?? search,
        };
        setTableLoading(true);
        router.get(route("taquilla.pagos.registro"), q, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
            only: ["pagos"],
            onFinish: () => setTableLoading(false),
        });
    };

    const statusOptions = useMemo(
        () => [
            { id: "all", label: `Todos (${counts.all || 0})` },
            { id: "confirmed", label: `Pagados (${counts.confirmed || 0})` },
            { id: "pending", label: `Pendientes (${counts.pending || 0})` },
            { id: "rejected", label: `Rechazados (${counts.rejected || 0})` },
        ],
        [counts],
    );

    const lockerOccupiedSet = useMemo(
        () => new Set((pagos?.lockerGrid?.occupied || []).map(Number)),
        [pagos?.lockerGrid],
    );
    const lockerMax = Number(pagos?.lockerGrid?.max || 60);
    const lockerCells = useMemo(() => Array.from({ length: lockerMax }, (_, i) => i + 1), [lockerMax]);

    const openProof = (row) => {
        if (!row?.proof_url) return;
        if (row.proof_is_stripe_receipt) {
            window.open(row.proof_url, "_blank", "noopener,noreferrer");
            return;
        }
        setProofModal(row);
    };

    const saveReassign = () => {
        if (!reassigning?.user_id || !reassigning?.locker_number) return;
        setProcessingId(`reassign-${reassigning.user_id}`);
        router.post(
            route("taquilla.users.reassign", reassigning.user_id),
            { locker_number: reassigning.locker_number },
            {
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
            },
        );
    };

    return (
        <>
            <Head title="Taquillas · Registro de Pagos" />
            <div className="mx-auto flex h-[calc(100dvh-3.25rem)] max-w-7xl flex-col gap-2 overflow-hidden p-3 text-gray-200 sm:gap-3 sm:p-4 md:gap-3 md:p-5 lg:h-[calc(100dvh-4rem)]">
                <header className="shrink-0 space-y-2">
                    <Breadcrumbs
                        items={[
                            { label: "Admin", href: route("Pag_principal") },
                            { label: "Taquillas", href: route("taquilla.index.admin") },
                            { label: "Registro de Pagos" },
                        ]}
                        variant="dark"
                        className="mb-0 hidden sm:flex"
                    />
                    <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                        <h1 className="text-lg font-bold leading-tight text-white sm:text-xl lg:text-2xl">
                            {focusedUserPayments?.name
                                ? `Pagos de ${focusedUserPayments.name}`
                                : "Registro de Pagos · Taquillas"}
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
                        onKeyDown={(e) => {
                            if (e.key === "Enter") applyFilters({ search });
                        }}
                        placeholder="Buscar por nombre o nº taquilla…"
                        className="min-w-0 flex-1 rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 sm:max-w-xs"
                    />
                    <button
                        type="button"
                        onClick={() => applyFilters({ search })}
                        className="rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-500"
                    >
                        Buscar
                    </button>
                    {focusedUserPayments ? (
                        <button
                            type="button"
                            onClick={() => setFocusedUserPayments(null)}
                            className="rounded-xl border border-gray-600 bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-200"
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
                    />
                ) : null}

                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                    {activeSection === TAB_PAGOS || focusedUserPayments ? (
                        <>
                            {!focusedUserPayments ? (
                                <div className="flex shrink-0 flex-wrap gap-1.5">
                                    {statusOptions.map((opt) => (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                setStatus(opt.id);
                                                applyFilters({ status: opt.id });
                                            }}
                                            className={`${filterPillBase} ${status === opt.id ? filterPillActive : filterPillIdle}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            ) : null}

                            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-gray-700 bg-gray-900">
                                {tableLoading ? (
                                    <div className="absolute inset-0 z-10 grid place-items-center bg-gray-950/50">
                                        <p className="text-sm text-gray-300">Cargando…</p>
                                    </div>
                                ) : null}

                                <div className="h-full overflow-y-auto overscroll-contain p-2 sm:p-3 md:hidden">
                                    {visibleRows.length === 0 ? (
                                        <p className="py-10 text-center text-sm text-gray-400">Sin pagos en el registro.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {visibleRows.map((row) => (
                                                <PaymentMobileCard
                                                    key={row.id}
                                                    row={row}
                                                    adminName={adminName}
                                                    onOpenProof={openProof}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="hidden h-full overflow-auto md:block">
                                    <table className="min-w-full text-sm">
                                        <thead className="sticky top-0 z-[1] bg-gray-800 text-gray-200">
                                            <tr>
                                                <SortableTh label="Usuario" sortKey="user" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                                <SortableTh label="Taquilla" sortKey="locker" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                                <SortableTh label="Plan" sortKey="plan" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                                <SortableTh label="Fecha" sortKey="date" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                                <SortableTh label="Importe" sortKey="amount" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                                <SortableTh label="Método" sortKey="method" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                                <SortableTh label="Estado" sortKey="status" activeKey={sortKey} activeDir={sortDir} onSort={toggleSort} />
                                                <th className="px-4 py-3 text-right">Contacto</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {visibleRows.length === 0 ? (
                                                <tr>
                                                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                                                        Sin pagos en el registro.
                                                    </td>
                                                </tr>
                                            ) : (
                                                visibleRows.map((row) => {
                                                    const pagoState = pagoUi(row);
                                                    const waLink = buildTaquillaWhatsappLink(row, adminName);
                                                    const mailLink = buildTaquillaMailtoLink(row, adminName);
                                                    return (
                                                        <tr key={row.id} className="border-t border-gray-700 text-gray-100">
                                                            <td className="px-4 py-3">
                                                                <p className="font-semibold text-gray-100">{row.user || "—"}</p>
                                                                <p className="text-xs text-gray-400">{row.email || "sin email"}</p>
                                                            </td>
                                                            <td className="px-4 py-3">#{row.numeroTaquilla ?? "—"}</td>
                                                            <td className="px-4 py-3">{shortPlanName(row.plan)}</td>
                                                            <td className="px-4 py-3 whitespace-nowrap">{paidAtLabel(row)}</td>
                                                            <td className="px-4 py-3 font-semibold">{formatAmountEuros(row.amount)}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span className={`inline-flex rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ${paymentMethodBadgeClass(pagoState)}`}>
                                                                        {paymentMethodLabel(pagoState)}
                                                                    </span>
                                                                    {row.proof_url ? (
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => openProof(row)}
                                                                            className="text-xs font-semibold text-sky-300 underline-offset-2 hover:underline"
                                                                        >
                                                                            Recibo
                                                                        </button>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${paymentStatusBadgeClass(row.status)}`}>
                                                                    {statusLabel(row.status)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex justify-end gap-2">
                                                                    {waLink ? (
                                                                        <a
                                                                            href={waLink}
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow transition-all hover:scale-105 hover:bg-emerald-500"
                                                                            title="Contactar por WhatsApp"
                                                                            aria-label="WhatsApp"
                                                                        >
                                                                            <WhatsAppIcon className="h-3.5 w-3.5" />
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-xs text-gray-500">sin tel.</span>
                                                                    )}
                                                                    {mailLink ? (
                                                                        <a
                                                                            href={mailLink}
                                                                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow transition-all hover:scale-105 hover:bg-sky-400"
                                                                            title="Enviar email"
                                                                            aria-label="Email"
                                                                        >
                                                                            <Mail className="h-3.5 w-3.5" />
                                                                        </a>
                                                                    ) : null}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    ) : null}

                    {activeSection === TAB_REASIGNAR && !focusedUserPayments ? (
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 p-3 sm:p-4">
                            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
                                <p className="text-xs text-gray-400">
                                    Reasignación rápida ·{" "}
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
                                    ) : (
                                        visibleLockerUsers.map((u) => (
                                            <LockerUserMobileCard
                                                key={u.id}
                                                u={u}
                                                adminName={adminName}
                                                onReassign={(user) =>
                                                    setReassigning({
                                                        user_id: user.id,
                                                        name: user.name,
                                                        locker_number: Number(user.locker),
                                                    })
                                                }
                                                onViewPayments={(user) => {
                                                    setFocusedUserPayments({ id: user.id, name: user.name || "Usuario" });
                                                    setActiveSection(TAB_PAGOS);
                                                }}
                                            />
                                        ))
                                    )}
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
                                            <th className="px-4 py-3 text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleLockerUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                                                    Sin socios con taquilla asignada.
                                                </td>
                                            </tr>
                                        ) : (
                                            visibleLockerUsers.map((u) => (
                                                <tr key={u.id} className="border-t border-gray-700 text-gray-100">
                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-gray-100">{u.name}</p>
                                                        <p className="text-xs text-gray-400">{u.email || "sin email"}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setReassigning({
                                                                    user_id: u.id,
                                                                    name: u.name,
                                                                    locker_number: Number(u.locker),
                                                                })
                                                            }
                                                            className="inline-flex rounded-full bg-sky-900/40 px-3 py-1 text-xs font-semibold text-sky-100 ring-1 ring-sky-600/30"
                                                        >
                                                            #{u.locker}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFocusedUserPayments({
                                                                        id: u.id,
                                                                        name: u.name || "Usuario",
                                                                    });
                                                                    setActiveSection(TAB_PAGOS);
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
                                                            ) : (
                                                                <span className="text-xs text-gray-500">sin tel.</span>
                                                            )}
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
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <ModalShell open={!!proofModal} onClose={() => setProofModal(null)} maxWidth="max-w-3xl">
                <div className="space-y-3">
                    <p className="text-lg font-bold text-slate-900">Recibo / justificante</p>
                    <p className="text-sm text-slate-600">
                        {proofModal?.user || "Usuario"} · {formatAmountEuros(proofModal?.amount)}
                    </p>
                    {proofModal?.proof_url ? (
                        <iframe title="Justificante de pago" src={proofModal.proof_url} className="h-[65vh] w-full rounded-lg border border-slate-200" />
                    ) : null}
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setProofModal(null)}
                            className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700"
                        >
                            Cerrar
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
                        <button type="button" onClick={() => setReassigning(null)} className="rounded-lg bg-slate-200 px-3 py-1 text-slate-700">
                            Cancelar
                        </button>
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
                <div
                    className={`fixed right-4 top-24 z-[70] rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-xl ${
                        toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"
                    }`}
                >
                    {toast.message}
                </div>
            ) : null}
        </>
    );
}
