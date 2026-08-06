import React, { useEffect, useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import { LogOut, TriangleAlert } from "lucide-react";
import Layout1 from "@/layouts/Layout1";
import Breadcrumbs from "@/components/Breadcrumbs";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { SortableTh, compareRows } from "@/components/SortableTable";
import { whatsappUrlFromPhone } from "@/lib/whatsapp";
import {
    useFloating,
    offset,
    flip,
    shift,
    useHover,
    useDismiss,
    useRole,
    useInteractions,
    useFocus,
    autoUpdate,
} from "@floating-ui/react";

/** Días de aviso previo (WhatsApp urgente + umbral naranja de baja). */
const NOTICE_DAYS = 10;
/** Umbral crítico: aviso de baja + cuota a menos de estos días → icono rojo. */
const BAJA_CRITICAL_DAYS = 3;

const COLUMN_DEFAULT_SORT_DIR = {
    user: "asc",
    locker: "asc",
    progreso: "asc",
    baja: "desc",
};

const MOBILE_SORT_OPTIONS = [
    { value: "progreso:asc", label: "Más urgentes primero" },
    { value: "baja:desc", label: "Avisos de baja primero" },
    { value: "user:asc", label: "Nombre A-Z" },
    { value: "user:desc", label: "Nombre Z-A" },
    { value: "locker:asc", label: "Taquilla ↑" },
    { value: "locker:desc", label: "Taquilla ↓" },
];

function rowSortValue(row, key) {
    switch (key) {
        case "user":
            return `${row?.nombre || ""} ${row?.apellido || ""}`
                .trim()
                .toLowerCase();
        case "locker": {
            const n = Number(row?.numeroTaquilla);
            return Number.isFinite(n) && n > 0 ? n : 999999;
        }
        case "progreso": {
            // Asc = más urgentes primero: menos días restantes (más negativos = lleva más vencido).
            // Sin fecha/plan → máxima urgencia.
            const d = row?.dias_restantes;
            if (d === null || d === undefined || d === "") {
                return Number.NEGATIVE_INFINITY;
            }
            const n = Number(d);
            return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
        }
        case "baja": {
            // Marcados primero (desc); entre ellos, más urgentes por días de cuota.
            if (!row?.baja_solicitada_at) return 0;
            const d = row?.dias_restantes;
            if (d === null || d === undefined || d === "") {
                return 2_000_000;
            }
            const n = Number(d);
            if (!Number.isFinite(n)) return 2_000_000;
            // Más negativo (lleva más vencido) → mayor score en desc.
            return 1_000_000 - n;
        }
        default:
            return "";
    }
}

function fmtDate(v) {
    if (!v) return "—";
    return new Date(v).toLocaleDateString("es-ES");
}

function daysSinceLabel(isoDate) {
    if (!isoDate) return "";
    const ts = Date.parse(isoDate);
    if (!Number.isFinite(ts)) return "";
    const days = Math.max(
        0,
        Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24)),
    );
    if (days === 0) return "hoy";
    if (days === 1) return "hace 1 día";
    return `hace ${days} días`;
}

/**
 * Urgencia visual del aviso de baja según vencimiento de la cuota.
 * @returns {"yellow"|"orange"|"red"|null}
 */
function bajaUrgencyLevel(user) {
    if (!user?.baja_solicitada_at) return null;
    const d = Number(user?.dias_restantes);
    const expired =
        user?.estado === "vencido" ||
        user?.estado === "sin plan" ||
        !Number.isFinite(d) ||
        d < 0;

    if (expired || d < BAJA_CRITICAL_DAYS) return "red";
    if (d <= NOTICE_DAYS) return "orange";
    return "yellow";
}

function clientRenewUrl() {
    if (typeof window === "undefined") return "/taquilla/planes";
    return `${window.location.origin}/taquilla/planes`;
}

function planDurationLabel(user) {
    const planName = String(user?.plan_vigente?.nombre || "").trim();
    const days = Number(user?.plan_vigente?.duracion_dias || 0);
    const fromName = (() => {
        const raw = planName.toLowerCase();
        if (raw.includes("anual") || raw.includes("365")) return "12 meses";
        if (raw.includes("semestral") || raw.includes("180")) return "6 meses";
        if (raw.includes("trimestral") || raw.includes("90")) return "3 meses";
        if (raw.includes("bimestral") || raw.includes("60")) return "2 meses";
        if (raw.includes("mensual") || raw.includes("30")) return "1 mes";
        return "";
    })();
    if (fromName) return fromName;
    if (Number.isFinite(days) && days > 0) {
        const months = Math.max(1, Math.round(days / 30));
        return months === 1 ? "1 mes" : `${months} meses`;
    }
    return planName || "sin duración registrada";
}

function buildWaLink(user) {
    const fullName =
        `${user?.nombre || ""} ${user?.apellido || ""}`.trim() || "hola";
    const firstName = `${user?.nombre || ""}`.trim() || fullName;
    const locker = user?.numeroTaquilla
        ? `#${user.numeroTaquilla}`
        : "sin número";
    const lastPay = user?.ultimo_pago
        ? fmtDate(user.ultimo_pago)
        : "sin registro";
    const due = user?.fecha_fin ? fmtDate(user.fecha_fin) : "sin fecha";
    const duration = planDurationLabel(user);
    const planName = String(user?.plan_vigente?.nombre || "").trim();
    const planLine = planName ? `${duration} (${planName})` : duration;
    const neverPaid = user?.estado === "sin plan";
    const expired = user?.estado === "vencido";
    const daysLeft = Number(user?.dias_restantes);
    const renewUrl = clientRenewUrl();

    let intro;
    if (neverPaid) {
        intro = `Hola ${firstName}, te escribimos desde Mas Que Surf porque no encontramos ningún pago registrado para tu taquilla.`;
    } else if (expired) {
        intro = `Hola ${firstName}, te escribimos desde Mas Que Surf porque tu taquilla ha vencido el ${due}.`;
    } else if (Number.isFinite(daysLeft) && daysLeft <= NOTICE_DAYS) {
        intro = `Hola ${firstName}, te escribimos desde Mas Que Surf porque tu taquilla vence en breve, el ${due} (quedan ${daysLeft} días).`;
    } else {
        intro = `Hola ${firstName}, te escribimos desde Mas Que Surf sobre la vigencia de tu taquilla.`;
    }

    const msg = `${intro}

• Socio/a: ${fullName}
• Taquilla: ${locker}
• Último pago: ${lastPay}
• Caduca el: ${due}
• Duración del plan: ${planLine}

Si quieres renovar, por favor hazlo antes de que se venza el plazo para evitar complicaciones administrativas y posibles problemas que te podrían acarrear (cancelación de la llave, bloqueo de venta de material, reserva de bonos…), ya que todo esto está automatizado con la aplicación.

Puedes renovar tú mismo/a aquí: ${renewUrl}

Un saludo,
Mas Que Surf`;

    return whatsappUrlFromPhone(user?.telefono, msg);
}

function ExtraDaysBadge({ days }) {
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "top",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });
    const hover = useHover(context);
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "tooltip" });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        focus,
        dismiss,
        role,
    ]);

    if (!days || days <= 0) return null;

    return (
        <>
            <button
                ref={refs.setReference}
                type="button"
                className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-700/50 px-1.5 text-[10px] font-semibold tabular-nums text-slate-300 ring-1 ring-white/10"
                {...getReferenceProps()}
            >
                +{days}
            </button>
            {open ? (
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="z-50 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl ring-1 ring-white/10"
                    {...getFloatingProps()}
                >
                    {days} días precomprados acumulados
                </div>
            ) : null}
        </>
    );
}

function InactivePlanWarningTooltip() {
    const [open, setOpen] = useState(false);
    const { refs, floatingStyles, context } = useFloating({
        open,
        onOpenChange: setOpen,
        placement: "top",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });
    const hover = useHover(context);
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "tooltip" });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        focus,
        dismiss,
        role,
    ]);

    return (
        <>
            <button
                ref={refs.setReference}
                type="button"
                className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[11px] font-bold text-amber-200 ring-1 ring-amber-500/30"
                {...getReferenceProps()}
            >
                !
            </button>
            {open ? (
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="z-50 max-w-xs rounded-lg bg-slate-800 px-2.5 py-2 text-xs font-medium text-white shadow-xl ring-1 ring-white/10"
                    {...getFloatingProps()}
                >
                    Este usuario está usando un plan desactivado. En la próxima
                    renovación deberá cambiar a un plan vigente.
                </div>
            ) : null}
        </>
    );
}

function BajaNoticeButton({ user, onToggle, size = "md" }) {
    const [open, setOpen] = useState(false);
    const markedAt = user?.baja_solicitada_at || null;
    const isMarked = Boolean(markedAt);
    const urgency = bajaUrgencyLevel(user);
    const since = isMarked ? daysSinceLabel(markedAt) : "";
    const fecha = isMarked ? fmtDate(markedAt) : "";
    const due = user?.fecha_fin ? fmtDate(user.fecha_fin) : "sin fecha";
    const daysLeft = Number(user?.dias_restantes);
    const neverPaid = user?.estado === "sin plan";
    const expired =
        user?.estado === "vencido" ||
        neverPaid ||
        !Number.isFinite(daysLeft) ||
        daysLeft < 0;

    const { refs, floatingStyles, context } = useFloating({
        open: isMarked ? open : false,
        onOpenChange: setOpen,
        placement: "top",
        middleware: [offset(8), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });
    const hover = useHover(context, { enabled: isMarked });
    const focus = useFocus(context, { enabled: isMarked });
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: "tooltip" });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        focus,
        dismiss,
        role,
    ]);

    const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";
    const iconClass = size === "sm" ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]";

    // Estilo admin: chip suave + icono outline (sin relleno grueso).
    const colorClass = !isMarked
        ? "border border-transparent text-slate-500/70 hover:border-sky-400/35 hover:bg-sky-500/10 hover:text-sky-300"
        : urgency === "red"
          ? "border border-rose-500/40 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300"
          : urgency === "orange"
            ? "border border-orange-500/40 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 hover:text-orange-300"
            : "border border-amber-400/35 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 hover:text-amber-200";

    const title = !isMarked
        ? "Marcar aviso de baja"
        : `Avisó su baja ${since} (${fecha})`;

    const urgencyHint =
        urgency === "red"
            ? neverPaid
                ? "No hay ningún pago registrado para esta taquilla."
                : expired
                  ? `Cuota ya vencida (vence/venció el ${due}).`
                  : `Quedan menos de ${BAJA_CRITICAL_DAYS} días para el vencimiento (${due}).`
            : urgency === "orange"
              ? `Vence pronto: ${daysLeft} días restantes (${due}).`
              : `Cuota con margen: ${daysLeft} días restantes (${due}).`;

    return (
        <>
            <button
                ref={refs.setReference}
                type="button"
                className={`inline-flex ${sizeClass} items-center justify-center rounded-lg transition ${colorClass}`}
                aria-label={title}
                title={title}
                {...getReferenceProps({
                    onClick(e) {
                        e.stopPropagation();
                        onToggle?.(user);
                    },
                })}
            >
                <TriangleAlert className={iconClass} strokeWidth={isMarked ? 2.25 : 1.75} />
            </button>
            {isMarked && open ? (
                <div
                    ref={refs.setFloating}
                    style={floatingStyles}
                    className="z-50 max-w-xs rounded-lg bg-slate-800 px-2.5 py-2 text-xs font-medium text-white shadow-xl ring-1 ring-white/10"
                    {...getFloatingProps()}
                >
                    Avisó su baja {since} ({fecha})
                    <span
                        className={`mt-1 block font-semibold ${
                            urgency === "red"
                                ? "text-rose-300"
                                : urgency === "orange"
                                  ? "text-orange-300"
                                  : "text-amber-200"
                        }`}
                    >
                        {urgencyHint}
                    </span>
                </div>
            ) : null}
        </>
    );
}

function BajaLiberarButton({ user, onLiberar, size = "md" }) {
    if (!user?.baja_solicitada_at) return null;

    const sizeClass = size === "sm" ? "h-8 w-8" : "h-9 w-9";
    const iconClass = size === "sm" ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]";

    return (
        <button
            type="button"
            className={`inline-flex ${sizeClass} items-center justify-center rounded-lg border border-slate-500/30 bg-slate-800/60 text-slate-300 transition hover:border-rose-400/45 hover:bg-rose-500/15 hover:text-rose-300`}
            aria-label="Confirmar baja y liberar taquilla"
            title="Confirmar baja y liberar taquilla"
            onClick={(e) => {
                e.stopPropagation();
                onLiberar?.(user);
            }}
        >
            <LogOut className={iconClass} strokeWidth={2} />
        </button>
    );
}

function paymentStatusPill(status) {
    if (status === "confirmed")
        return "bg-emerald-900/35 text-emerald-100 ring-1 ring-emerald-600/30";
    if (status === "rejected")
        return "bg-rose-900/40 text-rose-100 ring-1 ring-rose-500/35";
    return "bg-amber-900/35 text-amber-100 ring-1 ring-amber-600/25";
}

function paymentStatusLabel(status) {
    if (status === "confirmed") return "Pagado";
    if (status === "rejected") return "No válido";
    return "Por revisar";
}

/** Método de pago (columna independiente del estado; el estado ya lo indica su propia pill). */
function paymentMethodLabel(row) {
    const method = String(row?.payment_method || "").toLowerCase();
    if (method === "card") return "Online";
    if (method === "transferencia" || method === "bizum")
        return "Transferencia";
    if (method === "tienda") return "Cortesía";
    if (method === "domiciliado") return "Domiciliado";
    return "—";
}

/** Acorta "Taquilla Anual" → "Anual" (contexto ya es taquillas). */
function planShortName(nombre) {
    if (!nombre) return "—";
    const s = String(nombre).trim();
    const stripped = s.replace(/^taquilla\s+/i, "").trim();
    return stripped || s;
}

/**
 * Urgencia visual de la fila (semáforo).
 * Prioriza dias_restantes sobre estado para evitar rojo con "N días restantes".
 * @returns {"ok"|"soon"|"expired"}
 */
function rowUrgency(u) {
    const raw = u?.dias_restantes;
    if (raw !== null && raw !== undefined && raw !== "") {
        const d = Number(raw);
        if (Number.isFinite(d)) {
            if (d < 0) return "expired";
            if (d <= 7) return "soon";
            return "ok";
        }
    }
    if (u?.estado === "vencido" || u?.estado === "sin plan") return "expired";
    return "ok";
}

function enrichUser(u) {
    const duracion = Number(u?.plan_vigente?.duracion_dias || 0);
    const raw = u?.dias_restantes;
    const restantes = Number(raw);
    const urgency = rowUrgency(u);
    // Escala = duración del plan (fallback 90 si no hay plan).
    const scale = duracion > 0 ? duracion : 90;

    let pct = 0;
    if (raw !== null && raw !== undefined && raw !== "" && Number.isFinite(restantes)) {
        if (restantes > 0) {
            // Días que quedan → más días = barra más larga.
            pct = Math.round((restantes / scale) * 100);
        } else if (restantes < 0) {
            // Días de retraso → más atraso = barra más larga (tope 100%).
            pct = Math.round((Math.abs(restantes) / scale) * 100);
        }
        // restantes === 0 → Vence hoy → barra vacía.
        pct = Math.max(0, Math.min(100, pct));
        // Mínimo visible si hay al menos 1 día (restante o de atraso).
        if (restantes !== 0 && pct < 3) pct = 3;
    }

    let bar = "bg-emerald-700/50";
    if (urgency === "expired") bar = "bg-rose-400/55";
    else if (urgency === "soon") bar = "bg-orange-400/60";
    return { ...u, pct, bar, urgency };
}

function daysLabel(u) {
    const d = u.dias_restantes;
    if (d === null || d === undefined) {
        // Con backend actualizado, este caso solo ocurre para estado 'sin plan'
        // (nunca hubo un pago confirmado). 'vencido'/'activo' siempre traen días.
        return "Sin plan";
    }
    if (d > 0) return `${d} días restantes`;
    if (d === 0) return "Vence hoy";
    const overdue = Math.abs(Number(d));
    if (!Number.isFinite(overdue) || overdue <= 0) return "Vencido";
    return overdue === 1 ? "Vencido hace 1 día" : `Vencido hace ${overdue} días`;
}

function daysLabelClass(urgency) {
    if (urgency === "expired") return "text-xs font-medium text-rose-300";
    if (urgency === "soon") return "text-xs font-medium text-orange-300";
    return "text-xs text-emerald-400/80";
}

function rowUrgencyClass(urgency) {
    if (urgency === "expired") {
        return "bg-rose-500/[0.05] shadow-[inset_3px_0_0_0_rgba(251,113,133,0.55)]";
    }
    if (urgency === "soon") {
        return "bg-orange-500/[0.06] shadow-[inset_3px_0_0_0_rgba(251,146,60,0.50)]";
    }
    return "bg-emerald-500/[0.04] shadow-[inset_3px_0_0_0_rgba(52,211,153,0.35)]";
}

function cardUrgencyClass(urgency) {
    if (urgency === "expired") {
        return "border-l-[3px] border-l-rose-400/60 bg-rose-500/[0.05]";
    }
    if (urgency === "soon") {
        return "border-l-[3px] border-l-orange-400/55 bg-orange-500/[0.06]";
    }
    return "border-l-[3px] border-l-emerald-500/35 bg-emerald-500/[0.04]";
}

const WA_BTN_CLASS =
    "inline-flex h-8 w-8 items-center justify-center rounded-full border border-emerald-500/25 bg-transparent text-emerald-400/75 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-300";

function ProgressMeter({ user, barWidthClass = "w-40" }) {
    const urgency = user.urgency || "ok";
    const neverPaid = user.estado === "sin plan";
    return (
        <div>
            <div
                className={`h-1 ${barWidthClass} max-w-full rounded-full bg-slate-800/90`}
            >
                <div
                    className={`h-1 rounded-full transition-[width] ${user.bar}`}
                    style={{ width: `${user.pct}%` }}
                    title={
                        neverPaid
                            ? "Sin pagos registrados"
                            : urgency === "expired"
                              ? "Proporcional a días de retraso"
                              : "Proporcional a días restantes"
                    }
                />
            </div>
            <p className={`mt-1 ${daysLabelClass(urgency)}`}>{daysLabel(user)}</p>
        </div>
    );
}

export default function Vigencia({ usuarios = [], flash = {} }) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState("progreso");
    const [sortDir, setSortDir] = useState("asc");
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [historyByUser, setHistoryByUser] = useState({});
    const [loadingHistoryUserId, setLoadingHistoryUserId] = useState(null);
    const [proofModalUrl, setProofModalUrl] = useState(null);
    const [toast, setToast] = useState(flash?.success || flash?.error || null);
    const [bajaConfirmUser, setBajaConfirmUser] = useState(null);
    const [liberarConfirmUser, setLiberarConfirmUser] = useState(null);
    const [bajaBusy, setBajaBusy] = useState(false);

    // Recibo Stripe: página alojada por Stripe, bloquea iframe (X-Frame-Options).
    // Justificante manual: sí se puede embeber en el modal.
    const openProof = (row) => {
        if (!row?.proof_url) return;
        if (row.proof_is_stripe_receipt) {
            window.open(row.proof_url, "_blank", "noopener,noreferrer");
            return;
        }
        setProofModalUrl(row.proof_url);
    };

    const users = useMemo(() => (usuarios || []).map(enrichUser), [usuarios]);

    useEffect(() => {
        const message = flash?.success || flash?.error;
        if (!message) return;
        setToast(message);
        const timer = window.setTimeout(() => setToast(null), 4000);
        return () => window.clearTimeout(timer);
    }, [flash?.success, flash?.error]);

    const confirmBajaToggle = () => {
        if (!bajaConfirmUser || bajaBusy) return;
        setBajaBusy(true);
        router.patch(
            route("taquilla.usuarios.baja-solicitada", bajaConfirmUser.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBajaBusy(false);
                    setBajaConfirmUser(null);
                },
            },
        );
    };

    const confirmLiberarBaja = () => {
        if (!liberarConfirmUser || bajaBusy) return;
        setBajaBusy(true);
        router.patch(
            route("taquilla.usuarios.confirmar-baja", liberarConfirmUser.id),
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setBajaBusy(false);
                    setLiberarConfirmUser(null);
                },
            },
        );
    };

    const toggleSort = (key) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
            return;
        }
        setSortKey(key);
        setSortDir(COLUMN_DEFAULT_SORT_DIR[key] || "asc");
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        const base = !q
            ? [...users]
            : users.filter((u) => {
                  const full =
                      `${u.nombre || ""} ${u.apellido || ""}`.toLowerCase();
                  return (
                      full.includes(q) ||
                      String(u.email || "")
                          .toLowerCase()
                          .includes(q) ||
                      String(u.numeroTaquilla ?? "").includes(q)
                  );
              });
        base.sort((a, b) => compareRows(a, b, sortKey, sortDir, rowSortValue));
        return base;
    }, [users, search, sortKey, sortDir]);

    const mobileSortValue = `${sortKey}:${sortDir}`;

    const handleMobileSortChange = (value) => {
        const [key, dir] = String(value).split(":");
        if (!key || (dir !== "asc" && dir !== "desc")) return;
        setSortKey(key);
        setSortDir(dir);
    };

    const openUserHistory = async (userId) => {
        if (!userId) return;
        if (expandedUserId === userId) {
            setExpandedUserId(null);
            return;
        }
        setExpandedUserId(userId);
        if (historyByUser[userId]) return;

        setLoadingHistoryUserId(userId);
        try {
            const url = route("taquilla.users.payments", userId);
            const res = window?.axios?.get
                ? await window.axios.get(url)
                : await fetch(url).then((r) => r.json());
            const rows = res?.data?.rows ?? res?.rows ?? [];
            setHistoryByUser((prev) => ({ ...prev, [userId]: rows }));
        } catch {
            setToast("No se pudo cargar el historial de pagos.");
            setTimeout(() => setToast(null), 2500);
        } finally {
            setLoadingHistoryUserId(null);
        }
    };

    return (
        <Layout1>
            <Head title="Taquillas · Vigencia" />
            <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-teal-500/10 blur-[100px]" />
                    <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
                </div>

                <div className="relative mx-auto max-w-7xl space-y-5">
                    <header>
                        <Breadcrumbs
                            items={[
                                {
                                    label: "Admin",
                                    href: route("Pag_principal"),
                                },
                                {
                                    label: "Taquillas",
                                    href: route("taquilla.index.admin"),
                                },
                                { label: "Vigencia" },
                            ]}
                            variant="dark"
                            className="mb-3 hidden sm:flex"
                        />
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                            Admin · Taquillas
                        </p>
                        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                            Vigencia
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-400">
                            Estado de cuota de socios con taquilla. Pulsa un
                            usuario para ver su historial de pagos.
                        </p>
                    </header>

                    <div className="flex flex-wrap items-center gap-2">
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por nombre o nº taquilla…"
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:max-w-sm"
                        />
                        <label className="flex items-center gap-2 md:hidden">
                            <span className="sr-only">Ordenar</span>
                            <select
                                value={
                                    MOBILE_SORT_OPTIONS.some(
                                        (o) => o.value === mobileSortValue,
                                    )
                                        ? mobileSortValue
                                        : "progreso:asc"
                                }
                                onChange={(e) =>
                                    handleMobileSortChange(e.target.value)
                                }
                                className="rounded-xl border border-white/10 bg-slate-950/80 px-2.5 py-2.5 text-xs font-semibold text-slate-100 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                                aria-label="Ordenar socios"
                            >
                                {MOBILE_SORT_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <p className="text-xs text-slate-500">
                            {filtered.length} socios
                        </p>
                    </div>

                    {/* Móvil */}
                    <div className="space-y-2 md:hidden">
                        {filtered.length === 0 ? (
                            <p className="rounded-2xl border border-white/10 bg-slate-900/50 py-10 text-center text-sm text-slate-400">
                                Sin socios con taquilla.
                            </p>
                        ) : (
                            filtered.map((u) => {
                                const waUrl = buildWaLink(u);
                                const isOpen = expandedUserId === u.id;
                                const historyRows = historyByUser[u.id] || [];
                                const isLoading = loadingHistoryUserId === u.id;
                                return (
                                    <article
                                        key={u.id}
                                        className={`rounded-xl border border-white/10 bg-slate-900/70 p-2.5 ${cardUrgencyClass(u.urgency)}`}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openUserHistory(u.id)
                                                }
                                                className="min-w-0 flex-1 text-left"
                                            >
                                                <div className="flex min-w-0 items-center gap-2">
                                                    <p className="truncate font-semibold text-white">
                                                        {u.nombre} {u.apellido}
                                                    </p>
                                                    <span className="shrink-0 rounded-full bg-slate-800/80 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-300 ring-1 ring-white/10">
                                                        #
                                                        {u.numeroTaquilla ??
                                                            "—"}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    {u.email || "sin email"}
                                                </p>
                                            </button>
                                            {/* Slots fijos: aviso | liberar | WhatsApp */}
                                            <div className="flex shrink-0 items-center gap-1">
                                                <div className="flex h-8 w-8 items-center justify-center">
                                                    <BajaNoticeButton
                                                        user={u}
                                                        onToggle={
                                                            setBajaConfirmUser
                                                        }
                                                        size="sm"
                                                    />
                                                </div>
                                                <div className="flex h-8 w-8 items-center justify-center">
                                                    {u.baja_solicitada_at ? (
                                                        <BajaLiberarButton
                                                            user={u}
                                                            onLiberar={
                                                                setLiberarConfirmUser
                                                            }
                                                            size="sm"
                                                        />
                                                    ) : (
                                                        <span
                                                            className="h-8 w-8"
                                                            aria-hidden
                                                        />
                                                    )}
                                                </div>
                                                <div className="flex h-8 w-8 items-center justify-center">
                                                    {waUrl ? (
                                                        <a
                                                            href={waUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className={
                                                                WA_BTN_CLASS
                                                            }
                                                            aria-label="WhatsApp"
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
                                                        >
                                                            <WhatsAppIcon className="h-4 w-4" />
                                                        </a>
                                                    ) : (
                                                        <span
                                                            className="h-8 w-8"
                                                            aria-hidden
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-slate-400">
                                            <p>
                                                <span className="text-slate-500">
                                                    Plan
                                                </span>{" "}
                                                <span className="text-slate-300">
                                                    {planShortName(
                                                        u.plan_vigente?.nombre,
                                                    )}
                                                </span>
                                                {u.plan_vigente &&
                                                u.plan_vigente.activo ===
                                                    false ? (
                                                    <InactivePlanWarningTooltip />
                                                ) : null}
                                            </p>
                                            <p>
                                                <span className="text-slate-500">
                                                    Vence
                                                </span>{" "}
                                                <span className="tabular-nums text-slate-300">
                                                    {fmtDate(u.fecha_fin)}
                                                </span>
                                                <ExtraDaysBadge
                                                    days={Number(
                                                        u.prepaid_extra_days ||
                                                            0,
                                                    )}
                                                />
                                            </p>
                                            <p>
                                                <span className="text-slate-500">
                                                    Último pago
                                                </span>{" "}
                                                <span className="tabular-nums text-slate-300">
                                                    {fmtDate(u.ultimo_pago)}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="mt-2">
                                            <ProgressMeter
                                                user={u}
                                                barWidthClass="w-full"
                                            />
                                        </div>
                                        {isOpen ? (
                                            <div className="mt-3 border-t border-white/10 pt-3">
                                                {isLoading ? (
                                                    <p className="text-sm text-slate-400">
                                                        Cargando historial…
                                                    </p>
                                                ) : historyRows.length === 0 ? (
                                                    <p className="text-sm text-slate-400">
                                                        Sin pagos registrados.
                                                    </p>
                                                ) : (
                                                    <ul className="space-y-2">
                                                        {historyRows.map(
                                                            (row) => (
                                                                <li
                                                                    key={row.id}
                                                                    className="rounded-xl border border-white/5 bg-slate-950/50 px-3 py-2 text-xs text-slate-300"
                                                                >
                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                        <span className="font-semibold text-white">
                                                                            {
                                                                                row.plan
                                                                            }
                                                                        </span>
                                                                        <span
                                                                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${paymentStatusPill(row.status)}`}
                                                                        >
                                                                            {paymentStatusLabel(
                                                                                row.status,
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-1 text-slate-400">
                                                                        {fmtDate(
                                                                            row.periodo_inicio,
                                                                        )}{" "}
                                                                        –{" "}
                                                                        {fmtDate(
                                                                            row.periodo_fin,
                                                                        )}{" "}
                                                                        ·{" "}
                                                                        {paymentMethodLabel(
                                                                            row,
                                                                        )}
                                                                    </p>
                                                                    {row.proof_url ? (
                                                                        <button
                                                                            type="button"
                                                                            className="mt-1 text-cyan-300 underline-offset-2 hover:underline"
                                                                            onClick={() =>
                                                                                openProof(
                                                                                    row,
                                                                                )
                                                                            }
                                                                        >
                                                                            Ver
                                                                            recibo
                                                                        </button>
                                                                    ) : null}
                                                                </li>
                                                            ),
                                                        )}
                                                    </ul>
                                                )}
                                            </div>
                                        ) : null}
                                    </article>
                                );
                            })
                        )}
                    </div>

                    {/* Escritorio */}
                    <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 md:block">
                        <div className="overflow-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-slate-800/80 text-slate-400">
                                    <tr>
                                        <SortableTh
                                            label="Usuario"
                                            sortKey="user"
                                            activeKey={sortKey}
                                            activeDir={sortDir}
                                            onSort={toggleSort}
                                            className="px-3 py-2 text-left text-xs tracking-wide"
                                        />
                                        <SortableTh
                                            label="Taquilla"
                                            sortKey="locker"
                                            activeKey={sortKey}
                                            activeDir={sortDir}
                                            onSort={toggleSort}
                                            className="px-3 py-2 text-left text-xs tracking-wide"
                                        />
                                        <th className="px-3 py-2 text-left text-xs font-medium tracking-wide text-slate-400">
                                            Plan
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium tracking-wide text-slate-400">
                                            Último pago
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium tracking-wide text-slate-400">
                                            Vence
                                        </th>
                                        <SortableTh
                                            label="Progreso"
                                            sortKey="progreso"
                                            activeKey={sortKey}
                                            activeDir={sortDir}
                                            onSort={toggleSort}
                                            className="px-3 py-2 text-left text-xs tracking-wide"
                                        />
                                        <SortableTh
                                            label="Baja"
                                            sortKey="baja"
                                            activeKey={sortKey}
                                            activeDir={sortDir}
                                            onSort={toggleSort}
                                            className="px-3 py-2 text-left text-xs tracking-wide"
                                        />
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-10 text-center text-slate-400"
                                            >
                                                Sin socios con taquilla.
                                            </td>
                                        </tr>
                                    ) : (
                                        filtered.map((u) => {
                                            const isOpen =
                                                expandedUserId === u.id;
                                            const historyRows =
                                                historyByUser[u.id] || [];
                                            const isLoading =
                                                loadingHistoryUserId === u.id;
                                            const waUrl = buildWaLink(u);
                                            return (
                                                <React.Fragment key={u.id}>
                                                    <tr
                                                        className={`cursor-pointer border-t border-white/5 text-slate-100 hover:bg-slate-800/40 ${rowUrgencyClass(u.urgency)}`}
                                                        onClick={() =>
                                                            openUserHistory(
                                                                u.id,
                                                            )
                                                        }
                                                    >
                                                        <td className="px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                                {waUrl ? (
                                                                    <a
                                                                        href={
                                                                            waUrl
                                                                        }
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className={
                                                                            WA_BTN_CLASS
                                                                        }
                                                                        aria-label="WhatsApp"
                                                                        title="WhatsApp"
                                                                        onClick={(
                                                                            e,
                                                                        ) =>
                                                                            e.stopPropagation()
                                                                        }
                                                                    >
                                                                        <WhatsAppIcon className="h-3.5 w-3.5" />
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-[11px] text-slate-500">
                                                                        sin tel.
                                                                    </span>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <p className="truncate font-semibold text-white">
                                                                        {
                                                                            u.nombre
                                                                        }{" "}
                                                                        {
                                                                            u.apellido
                                                                        }
                                                                    </p>
                                                                    <p className="truncate text-xs text-slate-500">
                                                                        {u.email ||
                                                                            "sin email"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 tabular-nums text-slate-300">
                                                            #
                                                            {u.numeroTaquilla ??
                                                                "—"}
                                                        </td>
                                                        <td className="px-3 py-2 text-slate-400">
                                                            <div className="inline-flex items-center">
                                                                <span>
                                                                    {planShortName(
                                                                        u
                                                                            .plan_vigente
                                                                            ?.nombre,
                                                                    )}
                                                                </span>
                                                                {u.plan_vigente &&
                                                                u.plan_vigente
                                                                    .activo ===
                                                                    false ? (
                                                                    <InactivePlanWarningTooltip />
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 tabular-nums text-slate-400">
                                                            {fmtDate(
                                                                u.ultimo_pago,
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="inline-flex items-center">
                                                                <span className="tabular-nums text-slate-400">
                                                                    {fmtDate(
                                                                        u.fecha_fin,
                                                                    )}
                                                                </span>
                                                                <ExtraDaysBadge
                                                                    days={Number(
                                                                        u.prepaid_extra_days ||
                                                                            0,
                                                                    )}
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <ProgressMeter
                                                                user={u}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2">
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <BajaNoticeButton
                                                                    user={u}
                                                                    onToggle={
                                                                        setBajaConfirmUser
                                                                    }
                                                                    size="sm"
                                                                />
                                                                <BajaLiberarButton
                                                                    user={u}
                                                                    onLiberar={
                                                                        setLiberarConfirmUser
                                                                    }
                                                                    size="sm"
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isOpen ? (
                                                        <tr className="border-t border-white/5 bg-slate-950/50">
                                                            <td
                                                                colSpan={7}
                                                                className="px-3 py-2.5"
                                                            >
                                                                {isLoading ? (
                                                                    <p className="py-3 text-sm text-slate-400">
                                                                        Cargando
                                                                        historial
                                                                        de
                                                                        pagos…
                                                                    </p>
                                                                ) : historyRows.length ===
                                                                  0 ? (
                                                                    <p className="py-3 text-sm text-slate-400">
                                                                        Sin
                                                                        pagos
                                                                        registrados
                                                                        para
                                                                        este
                                                                        usuario.
                                                                    </p>
                                                                ) : (
                                                                    <div className="overflow-auto rounded-xl border border-white/10 bg-slate-900/80">
                                                                        <table className="min-w-full text-xs sm:text-sm">
                                                                            <thead className="bg-slate-800 text-slate-300">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left">
                                                                                        Plan
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-left">
                                                                                        Periodo
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-left">
                                                                                        Estado
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-left">
                                                                                        Método
                                                                                    </th>
                                                                                    <th className="px-3 py-2 text-left">
                                                                                        Recibo
                                                                                    </th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {historyRows.map(
                                                                                    (
                                                                                        row,
                                                                                    ) => (
                                                                                        <tr
                                                                                            key={
                                                                                                row.id
                                                                                            }
                                                                                            className="border-t border-white/5 text-slate-200"
                                                                                        >
                                                                                            <td className="px-3 py-2 font-medium">
                                                                                                {
                                                                                                    row.plan
                                                                                                }
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                {fmtDate(
                                                                                                    row.periodo_inicio,
                                                                                                )}{" "}
                                                                                                –{" "}
                                                                                                {fmtDate(
                                                                                                    row.periodo_fin,
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                <span
                                                                                                    className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusPill(row.status)}`}
                                                                                                >
                                                                                                    {paymentStatusLabel(
                                                                                                        row.status,
                                                                                                    )}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                {paymentMethodLabel(
                                                                                                    row,
                                                                                                )}
                                                                                            </td>
                                                                                            <td className="px-3 py-2">
                                                                                                {row.proof_url ? (
                                                                                                    <button
                                                                                                        type="button"
                                                                                                        className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-semibold text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-slate-700"
                                                                                                        onClick={() =>
                                                                                                            openProof(
                                                                                                                row,
                                                                                                            )
                                                                                                        }
                                                                                                    >
                                                                                                        Ver
                                                                                                    </button>
                                                                                                ) : (
                                                                                                    <span className="text-xs text-slate-500">
                                                                                                        —
                                                                                                    </span>
                                                                                                )}
                                                                                            </td>
                                                                                        </tr>
                                                                                    ),
                                                                                )}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ) : null}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {proofModalUrl ? (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4"
                    onClick={() => setProofModalUrl(null)}
                >
                    <div
                        className="w-full max-w-5xl rounded-2xl border border-white/10 bg-slate-900 p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-2 flex justify-end">
                            <button
                                type="button"
                                className="rounded-md bg-slate-700 px-3 py-1 text-slate-100"
                                onClick={() => setProofModalUrl(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                        <iframe
                            title="Comprobante de pago"
                            src={proofModalUrl}
                            className="h-[75vh] w-full rounded-lg"
                        />
                    </div>
                </div>
            ) : null}

            {bajaConfirmUser ? (
                <div
                    className="fixed inset-0 z-modal grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => !bajaBusy && setBajaConfirmUser(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl ring-1 ring-white/5"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="baja-confirm-title"
                    >
                        <h3
                            id="baja-confirm-title"
                            className="font-heading text-lg font-bold text-white"
                        >
                            {bajaConfirmUser.baja_solicitada_at
                                ? "Quitar aviso de baja"
                                : "Marcar aviso de baja"}
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            {bajaConfirmUser.baja_solicitada_at ? (
                                <>
                                    ¿Confirmas que{" "}
                                    <span className="font-semibold text-slate-200">
                                        {`${bajaConfirmUser.nombre || ""} ${bajaConfirmUser.apellido || ""}`.trim() ||
                                            "este socio"}
                                    </span>{" "}
                                    ya no quiere darse de baja (ha desistido)?
                                    Se quitará la marca de alerta.
                                </>
                            ) : (
                                <>
                                    ¿Confirmas que{" "}
                                    <span className="font-semibold text-slate-200">
                                        {`${bajaConfirmUser.nombre || ""} ${bajaConfirmUser.apellido || ""}`.trim() ||
                                            "este socio"}
                                    </span>{" "}
                                    ha avisado que quiere darse de baja de la
                                    taquilla #
                                    {bajaConfirmUser.numeroTaquilla ?? "—"}? Se
                                    marcará para que sepas que esta plaza podría
                                    quedar libre pronto.
                                </>
                            )}
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={bajaBusy}
                                onClick={() => setBajaConfirmUser(null)}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={bajaBusy}
                                onClick={confirmBajaToggle}
                                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
                            >
                                {bajaBusy ? "…" : "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {liberarConfirmUser ? (
                <div
                    className="fixed inset-0 z-modal grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
                    onClick={() => !bajaBusy && setLiberarConfirmUser(null)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl ring-1 ring-white/5"
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="liberar-baja-title"
                    >
                        <h3
                            id="liberar-baja-title"
                            className="font-heading text-lg font-bold text-white"
                        >
                            Confirmar baja y liberar taquilla
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            ¿Confirmas que{" "}
                            <span className="font-semibold text-slate-200">
                                {`${liberarConfirmUser.nombre || ""} ${liberarConfirmUser.apellido || ""}`.trim() ||
                                    "este socio"}
                            </span>{" "}
                            ya recogió todo y quieres liberar la taquilla #
                            {liberarConfirmUser.numeroTaquilla ?? "—"}?
                            Desaparecerá de Vigencia y la plaza quedará libre
                            para reasignar.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                disabled={bajaBusy}
                                onClick={() => setLiberarConfirmUser(null)}
                                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                disabled={bajaBusy}
                                onClick={confirmLiberarBaja}
                                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-50"
                            >
                                {bajaBusy ? "…" : "Sí, liberar taquilla"}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {toast ? (
                <div className="fixed right-4 top-24 z-50 rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white shadow-xl ring-1 ring-white/10">
                    {toast}
                </div>
            ) : null}
        </Layout1>
    );
}
