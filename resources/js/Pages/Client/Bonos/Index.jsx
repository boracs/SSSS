import { Head, router, usePage } from "@inertiajs/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { formatEur } from "@/utils/money";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import AccordionTrigger from "@/components/ui/AccordionTrigger";
import { whatsappUrlWithMessage } from "@/lib/whatsapp";

function ConsumptionDetailsPanel({ details }) {
    if (!details) {
        return (
            <p className="text-sm text-slate-500">No hay información adicional para esta sesión.</p>
        );
    }

    const classmates = Array.isArray(details.classmates) ? details.classmates : [];

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Nivel</p>
                <p className="text-sm text-slate-800">
                    {details.level_label || "Iniciación"}
                    {details.modality_label ? (
                        <span className="text-slate-500"> · {details.modality_label}</span>
                    ) : null}
                </p>
                {details.location ? (
                    <p className="text-xs text-slate-500">{details.location}</p>
                ) : null}
            </div>

            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Compañeros en clase</p>
                {classmates.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                        {classmates.map((name) => (
                            <li
                                key={name}
                                className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-200"
                            >
                                {name}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-500">Sesión individual o sin otros alumnos registrados.</p>
                )}
            </div>

            <div className="space-y-1 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Objetivos trabajados</p>
                {details.objectives ? (
                    <p className="text-sm leading-relaxed text-slate-700">{details.objectives}</p>
                ) : (
                    <p className="text-sm text-slate-500">Sin objetivos registrados para esta sesión.</p>
                )}
            </div>

            <div className="space-y-1 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Comentario del monitor</p>
                {details.monitor_comment ? (
                    <blockquote className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-900">
                        {details.monitor_name ? (
                            <footer className="mb-1 text-xs font-semibold text-amber-700">{details.monitor_name}</footer>
                        ) : null}
                        {details.monitor_comment}
                    </blockquote>
                ) : (
                    <p className="text-sm text-slate-500">Sin comentarios del monitor para esta sesión.</p>
                )}
            </div>
        </div>
    );
}

const INITIAL_CLASSES_VISIBLE = 5;
const CLASSES_LOAD_STEP = 10;
const INITIAL_PURCHASES_VISIBLE = 3;
const PURCHASES_LOAD_STEP = 5;

function LoadMoreButton({ label, onClick, remaining }) {
    if (remaining <= 0) {
        return null;
    }

    return (
        <div className="border-t border-slate-200 px-4 py-3 text-center">
            <button
                type="button"
                onClick={onClick}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
            >
                {label}
                <span className="text-xs font-normal text-slate-500">({remaining} más)</span>
            </button>
        </div>
    );
}

function CollapseToggle({ open, onClick, children, className = "", panelId }) {
    return (
        <AccordionTrigger
            open={open}
            onToggle={onClick}
            panelId={panelId}
            stopPropagation={false}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${className}`}
            chevronClassName="h-3 w-3"
        >
            {children}
        </AccordionTrigger>
    );
}

/** Desplaza suavemente solo si el bloque no cabe en la ventana (p. ej. historial abierto encima). */
function scrollIntoViewIfNeeded(el, { topOffset = 96, bottomMargin = 16 } = {}) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const viewportBottom = window.innerHeight - bottomMargin;
    const fullyVisible = rect.top >= topOffset && rect.bottom <= viewportBottom;
    if (!fullyVisible) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
}

export default function ClientBonosIndex({
    packs = [],
    myBonos = [],
    consumptionHistory = [],
    whatsappHelpUrl = null,
    vipActive = true,
}) {
    const { flash } = usePage().props;
    const [selectedPack, setSelectedPack] = useState(null);
    const [expandedConsumptionId, setExpandedConsumptionId] = useState(null);
    const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
    const [expandedPurchaseClassKey, setExpandedPurchaseClassKey] = useState(null);
    const [visibleClassesCount, setVisibleClassesCount] = useState(INITIAL_CLASSES_VISIBLE);
    const [visiblePurchasesCount, setVisiblePurchasesCount] = useState(INITIAL_PURCHASES_VISIBLE);
    const [showHistory, setShowHistory] = useState(false);
    const [showMyBonos, setShowMyBonos] = useState(false);
    const myBonosSectionRef = useRef(null);
    const toast = flash?.success || flash?.error;

    const whatsappReactivateUrl = whatsappUrlWithMessage(
        whatsappHelpUrl,
        "Hola, fui VIP y me gustaría reactivar mi perfil VIP para volver a comprar bonos y reservar clases grupales.",
    );

    const creditsSummary = useMemo(() => {
        const confirmed = myBonos.filter((b) => String(b.status) === "confirmed");
        const balance = confirmed.reduce((sum, b) => sum + Math.max(0, Number(b.clases_restantes ?? 0)), 0);
        const active = myBonos.find((b) => ["in_use", "active"].includes(String(b.usage_status)));
        const queued = myBonos.filter((b) => String(b.usage_status) === "queued").length;
        const pending = myBonos.filter((b) => String(b.status) === "pending").length;
        const lastMove = consumptionHistory[0] ?? null;

        return { balance, active, queued, pending, lastMove };
    }, [myBonos, consumptionHistory]);

    const visibleConsumptionHistory = consumptionHistory.slice(0, visibleClassesCount);
    const remainingClasses = Math.max(0, consumptionHistory.length - visibleClassesCount);
    const visibleMyBonos = myBonos.slice(0, visiblePurchasesCount);
    const remainingPurchases = Math.max(0, myBonos.length - visiblePurchasesCount);

    const loadMoreClasses = () => {
        setVisibleClassesCount((count) => Math.min(count + CLASSES_LOAD_STEP, consumptionHistory.length));
    };

    const loadMorePurchases = () => {
        setVisiblePurchasesCount((count) => Math.min(count + PURCHASES_LOAD_STEP, myBonos.length));
    };

    useEffect(() => {
        if (!showMyBonos) return;
        const el = myBonosSectionRef.current;
        if (!el) return;
        const frame = requestAnimationFrame(() => scrollIntoViewIfNeeded(el));
        return () => cancelAnimationFrame(frame);
    }, [showMyBonos]);

    const toggleMyBonos = () => {
        setShowMyBonos((open) => !open);
    };

    const toggleHistory = () => {
        setShowHistory((open) => !open);
    };

    const toggleConsumptionDetails = (rowId) => {
        setExpandedConsumptionId((current) => (current === rowId ? null : rowId));
    };

    const [procesandoBono, setProcesandoBono] = useState(false);

    const iniciarPagoBono = () => {
        if (!selectedPack || procesandoBono) return;
        setProcesandoBono(true);
        router.post(
            route("bonos.request-purchase"),
            { pack_id: String(selectedPack.id) },
            {
                preserveScroll: true,
                onError: () => setProcesandoBono(false),
            }
        );
    };

    const togglePurchaseDetails = (bonoId) => {
        setExpandedPurchaseId((current) => {
            const next = current === bonoId ? null : bonoId;
            if (next !== bonoId) {
                setExpandedPurchaseClassKey(null);
            }
            return next;
        });
    };

    const togglePurchaseClassDetails = (bonoId, classRowId) => {
        const key = `${bonoId}:${classRowId}`;
        setExpandedPurchaseClassKey((current) => (current === key ? null : key));
    };

    const usageBadgeClass = (usageStatus) => {
        const key = String(usageStatus || "").toLowerCase();
        if (key === "in_use" || key === "active" || key === "available") return "bg-teal-50 text-teal-700 ring-1 ring-teal-200";
        if (key === "queued") return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
        if (key === "consumed" || key === "exhausted") return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
        if (key === "pending_validation" || key === "pending") return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
        if (key === "rejected") return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
        return "bg-slate-100 text-slate-600 ring-1 ring-slate-200";
    };

    return (
        <>
            <Head title="Bonos VIP" />
            <div className="s4-surface-light min-h-screen">
            <div className="mx-auto max-w-6xl space-y-6 p-4 py-8 sm:p-6">
                <div>
                    <div className="flex flex-wrap items-center gap-3">
                        <h1 className="font-heading text-2xl font-bold text-slate-900">Bonos VIP</h1>
                        {!vipActive ? (
                            <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-amber-200">
                                Perfil inactivo — modo consulta
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-1 max-w-3xl text-sm text-slate-600">
                        Créditos para clases grupales de surf. Tu nivel debe estar validado por el monitor antes de
                        reservar. Si también tienes taquilla física en el club, los bonos son independientes de tu cuota
                        de casillero.
                    </p>
                </div>
                {toast ? (
                    <div className={`fixed right-4 top-24 z-50 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${flash?.success ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                        {toast}
                    </div>
                ) : null}

                {vipActive ? (
                    <section className="space-y-3">
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Comprar bonos</h2>
                            <p className="mt-1 text-sm text-slate-600">
                                Bonos para <strong className="text-slate-800">clases grupales</strong> según el nivel que el
                                monitor haya validado contigo. Los créditos se consumen al reservar sesiones compatibles con
                                tu perfil.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {packs.map((pack) => (
                                <div key={pack.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                    <p className="text-lg font-semibold text-slate-900">{pack.nombre}</p>
                                    <p className="text-slate-600">{pack.num_clases} clases</p>
                                    <p className="mt-2 text-2xl font-bold text-sky-600">{Number(pack.precio).toFixed(2)} €</p>
                                    <button type="button" onClick={() => setSelectedPack(pack)} className="mt-3 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
                                        Comprar
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                        <p className="text-sm leading-relaxed text-amber-900">
                            Tu perfil VIP no está activo actualmente. Aquí puedes consultar tu historial de bonos y
                            clases, pero no puedes comprar bonos nuevos ni reservar clases VIP hasta reactivar tu
                            perfil.
                        </p>
                        {whatsappReactivateUrl ? (
                            <a
                                href={whatsappReactivateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
                            >
                                <WhatsAppIcon className="h-4 w-4" />
                                Solicitar reactivación VIP
                            </a>
                        ) : null}
                    </section>
                )}

                {/* Resumen — siempre visible */}
                <section className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-slate-50 p-4 sm:p-5">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">
                                Tu saldo VIP
                            </p>
                            <p className="mt-1 text-3xl font-extrabold tabular-nums text-teal-700 sm:text-4xl">
                                {creditsSummary.balance}{" "}
                                <span className="text-lg font-semibold text-teal-600 sm:text-xl">
                                    {creditsSummary.balance === 1 ? "crédito" : "créditos"}
                                </span>
                            </p>
                            <p className="mt-2 text-xs text-slate-600">
                                {creditsSummary.active ? (
                                    <>
                                        En uso: <span className="text-slate-800">{creditsSummary.active.pack}</span>
                                        {creditsSummary.queued > 0 ? (
                                            <span className="text-slate-500">
                                                {" "}
                                                · {creditsSummary.queued} en cola
                                            </span>
                                        ) : null}
                                    </>
                                ) : creditsSummary.balance > 0 ? (
                                    "Listo para reservar clases"
                                ) : (
                                    "Compra un bono para empezar"
                                )}
                                {creditsSummary.pending > 0 ? (
                                    <span className="text-amber-700">
                                        {" "}
                                        · {creditsSummary.pending}{" "}
                                        {creditsSummary.pending === 1 ? "compra pendiente" : "compras pendientes"} de
                                        validar
                                    </span>
                                ) : null}
                            </p>
                            {creditsSummary.lastMove && !showHistory ? (
                                <p className="mt-1 truncate text-[11px] text-slate-500">
                                    Último movimiento: {creditsSummary.lastMove.lesson_name}
                                    {creditsSummary.lastMove.date_human ? ` · ${creditsSummary.lastMove.date_human}` : ""}
                                </p>
                            ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {consumptionHistory.length > 0 ? (
                                <CollapseToggle
                                    open={showHistory}
                                    onClick={toggleHistory}
                                    panelId="bonos-historial-panel"
                                    className={
                                        showHistory
                                            ? "border-amber-300 bg-amber-50 text-amber-800"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }
                                >
                                    {showHistory ? "Ocultar historial" : `Ver historial (${consumptionHistory.length})`}
                                </CollapseToggle>
                            ) : null}
                            {myBonos.length > 0 ? (
                                <CollapseToggle
                                    open={showMyBonos}
                                    onClick={toggleMyBonos}
                                    panelId="bonos-mis-bonos-panel"
                                    className={
                                        showMyBonos
                                            ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                    }
                                >
                                    {showMyBonos ? "Ocultar bonos" : `Mis bonos (${myBonos.length})`}
                                </CollapseToggle>
                            ) : null}
                        </div>
                    </div>
                </section>

                {showHistory ? (
                <div id="bonos-historial-panel" className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="rounded-2xl px-4 pb-4 pt-3">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">
                                    Historial de movimientos
                                </h2>
                                <p className="mt-1 text-xs text-slate-600">
                                    El <span className="font-semibold text-teal-700">saldo</span> es el total de créditos
                                    acumulados. Las{" "}
                                    <span className="font-semibold text-emerald-700">compras suman</span> y cada sesión
                                    descuenta:{" "}
                                    <span className="font-semibold text-teal-700">grupal o semanal = 1</span>
                                    {" · "}
                                    <span className="font-semibold text-amber-700">particular = 2</span>.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200">
                            <table className="w-full table-fixed text-sm">
                                <colgroup>
                                    <col className="w-[22%]" />
                                    <col className="w-[34%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[16%]" />
                                </colgroup>
                                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left">Fecha</th>
                                        <th className="px-3 py-2.5 text-left">Concepto</th>
                                        <th className="px-3 py-2.5 text-center">Créditos</th>
                                        <th className="px-3 py-2.5 text-right">Saldo</th>
                                        <th className="px-3 py-2.5 text-center">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {visibleConsumptionHistory.map((row, idx) => {
                                        const entryType = row.entry_type || "consumption";
                                        const isPurchase = entryType === "purchase";
                                        const isPurchasePending = entryType === "purchase_pending";
                                        const isConsumption = entryType === "consumption";
                                        const uc = Math.max(1, Number(row.credits_consumed ?? 1));
                                        const creditsAdded = Number(row.credits_added ?? 0);
                                        const isExpanded = expandedConsumptionId === row.id;

                                        let rowBg = idx % 2 === 0 ? "bg-white hover:bg-slate-50" : "bg-slate-50/50 hover:bg-slate-50";
                                        if (isExpanded) rowBg = "bg-teal-50";
                                        if (isPurchase) rowBg = isExpanded ? "bg-emerald-50" : "bg-emerald-50/60 hover:bg-emerald-50";
                                        if (isPurchasePending) rowBg = isExpanded ? "bg-amber-50" : "bg-amber-50/60 hover:bg-amber-50";

                                        const creditsBadge = isPurchase
                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                            : isPurchasePending
                                              ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                              : uc >= 2
                                                ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                                : "bg-teal-50 text-teal-700 ring-1 ring-teal-200";

                                        return (
                                            <Fragment key={row.id}>
                                                <tr className={rowBg}>
                                                    <td className="px-3 py-2.5 text-slate-700">{row.date_human || "—"}</td>
                                                    <td
                                                        className={`break-words px-3 py-2.5 ${
                                                            isPurchase
                                                                ? "font-medium text-emerald-800"
                                                                : isPurchasePending
                                                                  ? "font-medium text-amber-800"
                                                                  : "text-slate-800"
                                                        }`}
                                                    >
                                                        {row.lesson_name || "Clase de surf"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        <span
                                                            className={`inline-flex min-w-[2.25rem] justify-center rounded-full px-2 py-0.5 text-xs font-bold ${creditsBadge}`}
                                                        >
                                                            {isPurchase
                                                                ? `+${creditsAdded}`
                                                                : isPurchasePending
                                                                  ? "…"
                                                                  : uc === 1
                                                                    ? "−1"
                                                                    : "−2"}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className={`px-3 py-2.5 text-right font-semibold tabular-nums ${
                                                            isPurchase
                                                                ? "text-emerald-700"
                                                                : isPurchasePending
                                                                  ? "text-amber-700"
                                                                  : "text-teal-700"
                                                        }`}
                                                    >
                                                        {isPurchasePending && row.remaining_after != null
                                                            ? row.remaining_after
                                                            : isPurchasePending
                                                              ? "Pendiente"
                                                              : row.remaining_after ?? "—"}
                                                    </td>
                                                    <td className="px-3 py-2.5 text-center">
                                                        {isConsumption ? (
                                                            <AccordionTrigger
                                                                open={isExpanded}
                                                                onToggle={() => toggleConsumptionDetails(row.id)}
                                                                panelId={`bonos-consumo-${row.id}`}
                                                                stopPropagation={false}
                                                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                    isExpanded
                                                                        ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                                                                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                                                }`}
                                                                chevronClassName="h-3 w-3"
                                                            >
                                                                {isExpanded ? "Ocultar" : "Ver más"}
                                                            </AccordionTrigger>
                                                        ) : isPurchase || isPurchasePending ? (
                                                            <AccordionTrigger
                                                                open={isExpanded}
                                                                onToggle={() => toggleConsumptionDetails(row.id)}
                                                                panelId={`bonos-consumo-${row.id}`}
                                                                stopPropagation={false}
                                                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                    isExpanded
                                                                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                                                        : "bg-white text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
                                                                }`}
                                                                chevronClassName="h-3 w-3"
                                                            >
                                                                {isExpanded ? "Ocultar" : "Ver más"}
                                                            </AccordionTrigger>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {isExpanded && isConsumption ? (
                                                    <tr className="bg-teal-50/50">
                                                        <td
                                                            colSpan={5}
                                                            id={`bonos-consumo-${row.id}`}
                                                            className="border-t border-teal-200 px-4 py-4"
                                                        >
                                                            <ConsumptionDetailsPanel details={row.details} />
                                                        </td>
                                                    </tr>
                                                ) : null}
                                                {isExpanded && (isPurchase || isPurchasePending) ? (
                                                    <tr className={isPurchase ? "bg-emerald-50/80" : "bg-amber-50/80"}>
                                                        <td
                                                            colSpan={5}
                                                            id={`bonos-consumo-${row.id}`}
                                                            className="border-t border-slate-200 px-4 py-3 text-sm text-slate-700"
                                                        >
                                                            <p>
                                                                <span className="font-semibold text-slate-900">
                                                                    {row.purchase?.pack_name || row.lesson_name}
                                                                </span>
                                                                {row.purchase?.precio > 0 ? (
                                                                    <span className="text-slate-500">
                                                                        {" "}
                                                                        · {formatEur(row.purchase.precio)}
                                                                    </span>
                                                                ) : null}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-500">
                                                                {isPurchasePending
                                                                    ? "Compra enviada y pendiente de validación por el equipo."
                                                                    : `${row.purchase?.num_clases ?? creditsAdded} créditos añadidos a tu saldo tras confirmar el pago.`}
                                                            </p>
                                                        </td>
                                                    </tr>
                                                ) : null}
                                            </Fragment>
                                        );
                                    })}
                                    {consumptionHistory.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-3 py-6 text-center text-sm text-slate-500">
                                                Aún no hay movimientos registrados.
                                            </td>
                                        </tr>
                                    ) : null}
                                </tbody>
                            </table>
                        </div>
                        <LoadMoreButton
                            label="Ver más movimientos"
                            onClick={loadMoreClasses}
                            remaining={remainingClasses}
                        />
                    </div>
                </div>
                ) : null}

                {showMyBonos ? (
                <div ref={myBonosSectionRef} id="bonos-mis-bonos-panel" className="scroll-mt-24 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3">
                        <h2 className="text-lg font-semibold text-slate-900">Detalle por bono</h2>
                        <p className="mt-1 text-xs text-slate-600">
                            Solo se consume un bono a la vez. Los demás quedan en cola. El historial completo está arriba.
                        </p>
                    </div>
                    <ul className="space-y-2 text-sm text-slate-800">
                        {visibleMyBonos.map((b) => {
                            const total = Math.max(0, Number(b.num_clases ?? 0));
                            const remaining = Math.max(0, Number(b.clases_restantes ?? 0));
                            const consumed = total > 0 ? Math.max(0, total - remaining) : null;
                            const usageStatus = b.usage_status || b.status;
                            const usageLabel = b.usage_label || b.status;
                            const isExpanded = expandedPurchaseId === b.id;
                            const bonoClasses = Array.isArray(b.consumptions) ? b.consumptions : [];

                            return (
                                <li
                                    key={b.id}
                                    className={`overflow-hidden rounded-lg border bg-slate-50 ${isExpanded ? "border-teal-300" : "border-slate-200"}`}
                                >
                                    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-slate-900">{b.pack}</p>
                                            <p className="mt-0.5 text-xs text-slate-600">
                                                {total > 0 ? (
                                                    <>
                                                        {remaining} de {total} clases restantes
                                                        {consumed > 0 ? ` · ${consumed} consumidas` : null}
                                                    </>
                                                ) : (
                                                    <>{remaining} clases restantes</>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${usageBadgeClass(usageStatus)}`}
                                            >
                                                {usageLabel}
                                            </span>
                                            {b.proof_url && b.status === "confirmed" ? (
                                                <a
                                                    href={b.proof_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                                                >
                                                    Recibo
                                                </a>
                                            ) : null}
                                            {b.fiscal_invoice_url && b.status === "confirmed" ? (
                                                <a
                                                    href={b.fiscal_invoice_url}
                                                    className="inline-flex rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100"
                                                >
                                                    {b.fiscal_invoice_ready ? "Factura TBAI" : "Factura…"}
                                                </a>
                                            ) : null}
                                            <AccordionTrigger
                                                open={isExpanded}
                                                onToggle={() => togglePurchaseDetails(b.id)}
                                                panelId={`bonos-compra-${b.id}`}
                                                stopPropagation={false}
                                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                    isExpanded
                                                        ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                                                        : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                                                }`}
                                                chevronClassName="h-3 w-3"
                                            >
                                                {isExpanded ? "Ocultar" : "Ver más"}
                                            </AccordionTrigger>
                                        </div>
                                    </div>

                                    {isExpanded ? (
                                        <div
                                            id={`bonos-compra-${b.id}`}
                                            className="border-t border-slate-200 bg-white px-3 py-3"
                                        >
                                            <div className="mb-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                                <p>
                                                    <span className="font-semibold uppercase tracking-wide text-slate-500">Comprado</span>
                                                    <br />
                                                    <span className="text-sm text-slate-800">{b.purchased_at_human || "—"}</span>
                                                </p>
                                                <p>
                                                    <span className="font-semibold uppercase tracking-wide text-slate-500">Importe</span>
                                                    <br />
                                                    <span className="text-sm text-slate-800">
                                                        {Number(b.precio || 0).toFixed(2).replace(".", ",")} €
                                                    </span>
                                                </p>
                                            </div>

                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                                                Clases de este bono ({bonoClasses.length})
                                            </p>

                                            {bonoClasses.length === 0 ? (
                                                <p className="text-sm text-slate-500">
                                                    Aún no hay clases registradas en este bono.
                                                </p>
                                            ) : (
                                                <div className="overflow-hidden rounded-xl border border-slate-200">
                                                    <table className="w-full table-fixed text-sm">
                                                        <colgroup>
                                                            <col className="w-[24%]" />
                                                            <col className="w-[36%]" />
                                                            <col className="w-[14%]" />
                                                            <col className="w-[14%]" />
                                                            <col className="w-[12%]" />
                                                        </colgroup>
                                                        <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left">Fecha</th>
                                                                <th className="px-2 py-2 text-left">Clase</th>
                                                                <th className="px-2 py-2 text-center">Créd.</th>
                                                                <th className="px-2 py-2 text-right">Saldo</th>
                                                                <th className="px-2 py-2 text-center">
                                                                    <span className="sr-only">Detalle</span>
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 text-slate-800">
                                                            {bonoClasses.map((row) => {
                                                                const uc = Math.max(1, Number(row.credits_consumed ?? 1));
                                                                const classKey = `${b.id}:${row.id}`;
                                                                const classPanelId = `bonos-clase-${b.id}-${row.id}`;
                                                                const classExpanded = expandedPurchaseClassKey === classKey;
                                                                const ucBadge =
                                                                    uc >= 2
                                                                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                                                                        : "bg-teal-50 text-teal-700 ring-1 ring-teal-200";

                                                                return (
                                                                    <Fragment key={row.id}>
                                                                        <tr className={classExpanded ? "bg-teal-50" : "bg-white"}>
                                                                            <td className="px-2 py-2 text-xs text-slate-600">{row.date_human || "—"}</td>
                                                                            <td className="break-words px-2 py-2 text-xs">{row.lesson_name || "Clase de surf"}</td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <span className={`inline-flex min-w-[1.75rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ucBadge}`}>
                                                                                    {uc}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-2 py-2 text-right text-xs font-semibold text-teal-700 tabular-nums">
                                                                                {row.remaining_after}
                                                                            </td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <AccordionTrigger
                                                                                    open={classExpanded}
                                                                                    onToggle={() =>
                                                                                        togglePurchaseClassDetails(
                                                                                            b.id,
                                                                                            row.id,
                                                                                        )
                                                                                    }
                                                                                    panelId={classPanelId}
                                                                                    labelOpen="Ocultar detalle"
                                                                                    labelClosed="Ver detalle"
                                                                                    stopPropagation={false}
                                                                                    className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${
                                                                                        classExpanded
                                                                                            ? "bg-teal-50 text-teal-700"
                                                                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                                                    }`}
                                                                                    chevronClassName="h-3 w-3"
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                        {classExpanded ? (
                                                                            <tr className="bg-teal-50/50">
                                                                                <td
                                                                                    colSpan={5}
                                                                                    id={classPanelId}
                                                                                    className="border-t border-teal-200 px-3 py-3"
                                                                                >
                                                                                    <ConsumptionDetailsPanel details={row.details} />
                                                                                </td>
                                                                            </tr>
                                                                        ) : null}
                                                                    </Fragment>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </li>
                            );
                        })}
                        {myBonos.length === 0 ? <li className="text-slate-500">Aún no tienes bonos.</li> : null}
                    </ul>
                    <LoadMoreButton
                        label="Ver más bonos"
                        onClick={loadMorePurchases}
                        remaining={remainingPurchases}
                    />
                </div>
                ) : null}
            </div>
            </div>

            {/* Modal de confirmación de compra bono → redirige a Stripe */}
            {!!selectedPack && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPack(null)} />
                    <div className="relative w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-2xl text-slate-900">
                        <h2 className="text-xl font-bold">Confirmar compra</h2>
                        <p className="mt-2 text-sm text-slate-600">Vas a comprar el siguiente bono VIP:</p>
                        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                            <div className="font-semibold text-slate-900">{selectedPack.nombre}</div>
                            <div className="mt-1 text-slate-600">{selectedPack.num_clases} clases</div>
                            <div className="mt-2 text-lg font-bold text-emerald-600">
                                {Number(selectedPack.precio).toFixed(2).replace(".", ",")} €
                            </div>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">
                            Serás redirigido a la pasarela de pago seguro (Stripe). Tu bono se activará automáticamente al confirmar el pago.
                        </p>
                        <div className="mt-5 flex gap-3">
                            <button
                                onClick={iniciarPagoBono}
                                disabled={procesandoBono}
                                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {procesandoBono ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                                        </svg>
                                        Preparando…
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <rect x="1" y="4" width="22" height="16" rx="2"/>
                                            <line x1="1" y1="10" x2="23" y2="10"/>
                                        </svg>
                                        Pagar con tarjeta
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setSelectedPack(null)}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
