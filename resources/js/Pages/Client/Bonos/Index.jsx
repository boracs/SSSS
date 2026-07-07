import { Head, router, usePage } from "@inertiajs/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import ManualPaymentInstructionsModal from "@/components/ManualPaymentInstructionsModal";
import { formatEur } from "@/utils/money";

function ConsumptionDetailsPanel({ details }) {
    if (!details) {
        return (
            <p className="text-sm text-gray-400">No hay información adicional para esta sesión.</p>
        );
    }

    const classmates = Array.isArray(details.classmates) ? details.classmates : [];

    return (
        <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">Nivel</p>
                <p className="text-sm text-gray-100">
                    {details.level_label || "Iniciación"}
                    {details.modality_label ? (
                        <span className="text-gray-400"> · {details.modality_label}</span>
                    ) : null}
                </p>
                {details.location ? (
                    <p className="text-xs text-gray-400">{details.location}</p>
                ) : null}
            </div>

            <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">Compañeros en clase</p>
                {classmates.length > 0 ? (
                    <ul className="flex flex-wrap gap-1.5">
                        {classmates.map((name) => (
                            <li
                                key={name}
                                className="rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-medium text-teal-100 ring-1 ring-teal-400/25"
                            >
                                {name}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-400">Sesión individual o sin otros alumnos registrados.</p>
                )}
            </div>

            <div className="space-y-1 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">Objetivos trabajados</p>
                {details.objectives ? (
                    <p className="text-sm leading-relaxed text-gray-200">{details.objectives}</p>
                ) : (
                    <p className="text-sm text-gray-400">Sin objetivos registrados para esta sesión.</p>
                )}
            </div>

            <div className="space-y-1 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">Comentario del monitor</p>
                {details.monitor_comment ? (
                    <blockquote className="rounded-lg border border-amber-500/20 bg-amber-950/30 px-3 py-2 text-sm leading-relaxed text-amber-50/90">
                        {details.monitor_name ? (
                            <footer className="mb-1 text-xs font-semibold text-amber-200/70">{details.monitor_name}</footer>
                        ) : null}
                        {details.monitor_comment}
                    </blockquote>
                ) : (
                    <p className="text-sm text-gray-400">Sin comentarios del monitor para esta sesión.</p>
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
        <div className="border-t border-white/5 px-4 py-3 text-center">
            <button
                type="button"
                onClick={onClick}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-800/90 px-4 py-2 text-sm font-semibold text-amber-100 ring-1 ring-amber-500/30 transition hover:bg-gray-700/90"
            >
                {label}
                <span className="text-xs font-normal text-gray-400">({remaining} más)</span>
            </button>
        </div>
    );
}

function CollapseToggle({ open, onClick, children, className = "" }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-expanded={open}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition ${className}`}
        >
            {children}
            <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>▼</span>
        </button>
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
    paymentIban,
    paymentBizumNumber,
    whatsappHelpUrl = null,
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

    const submitBono = async ({ proofFile }) => {
        if (!selectedPack) throw new Error("no pack");
        const fd = new FormData();
        fd.append("pack_id", String(selectedPack.id));
        fd.append("proof", proofFile);
        await new Promise((resolve, reject) => {
            router.post(route("bonos.request-purchase"), fd, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => resolve(),
                onError: () => reject(new Error("bono")),
            });
        });
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
        if (key === "in_use" || key === "active" || key === "available") return "bg-teal-900/35 text-teal-200 ring-1 ring-teal-500/35";
        if (key === "queued") return "bg-indigo-900/35 text-indigo-200 ring-1 ring-indigo-500/35";
        if (key === "consumed" || key === "exhausted") return "bg-slate-800/80 text-slate-400 ring-1 ring-slate-600/40";
        if (key === "pending_validation" || key === "pending") return "bg-amber-900/35 text-amber-200 ring-1 ring-amber-500/35";
        if (key === "rejected") return "bg-rose-900/35 text-rose-200 ring-1 ring-rose-500/35";
        return "bg-gray-800 text-gray-200 ring-1 ring-white/10";
    };

    return (
        <>
            <Head title="Bonos VIP" />
            <div className="mx-auto max-w-6xl space-y-6 p-6 text-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-white">Bonos VIP</h1>
                    <p className="mt-1 max-w-3xl text-sm text-gray-400">
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

                <section className="space-y-3">
                    <div>
                        <h2 className="text-lg font-bold text-white">Comprar bonos</h2>
                        <p className="mt-1 text-sm text-gray-400">
                            Bonos para <strong className="text-gray-200">clases grupales</strong> según el nivel que el
                            monitor haya validado contigo. Los créditos se consumen al reservar sesiones compatibles con
                            tu perfil.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {packs.map((pack) => (
                            <div key={pack.id} className="rounded-2xl border border-gray-700 bg-gray-900 p-4 shadow-sm">
                                <p className="text-lg font-semibold text-gray-100">{pack.nombre}</p>
                                <p className="text-gray-300">{pack.num_clases} clases</p>
                                <p className="mt-2 text-2xl font-bold text-sky-300">{Number(pack.precio).toFixed(2)} €</p>
                                <button type="button" onClick={() => setSelectedPack(pack)} className="mt-3 rounded-xl bg-sky-600 px-4 py-2 font-semibold text-white hover:bg-sky-700">
                                    Comprar
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Resumen — siempre visible */}
                <section className="rounded-2xl border border-teal-500/25 bg-gradient-to-br from-gray-950 via-teal-950/20 to-gray-950 p-4 sm:p-5">
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-300/80">
                                Tu saldo VIP
                            </p>
                            <p className="mt-1 text-3xl font-extrabold tabular-nums text-teal-300 sm:text-4xl">
                                {creditsSummary.balance}{" "}
                                <span className="text-lg font-semibold text-teal-200/80 sm:text-xl">
                                    {creditsSummary.balance === 1 ? "crédito" : "créditos"}
                                </span>
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                                {creditsSummary.active ? (
                                    <>
                                        En uso: <span className="text-slate-200">{creditsSummary.active.pack}</span>
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
                                    <span className="text-amber-300/90">
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
                                    className={
                                        showHistory
                                            ? "border-amber-500/40 bg-amber-500/15 text-amber-100"
                                            : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                                    }
                                >
                                    {showHistory ? "Ocultar historial" : `Ver historial (${consumptionHistory.length})`}
                                </CollapseToggle>
                            ) : null}
                            {myBonos.length > 0 ? (
                                <CollapseToggle
                                    open={showMyBonos}
                                    onClick={toggleMyBonos}
                                    className={
                                        showMyBonos
                                            ? "border-indigo-500/40 bg-indigo-500/15 text-indigo-100"
                                            : "border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                                    }
                                >
                                    {showMyBonos ? "Ocultar bonos" : `Mis bonos (${myBonos.length})`}
                                </CollapseToggle>
                            ) : null}
                        </div>
                    </div>
                </section>

                {showHistory ? (
                <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-gray-950 via-gray-900 to-teal-950/50 p-[1px] shadow-xl shadow-amber-900/20">
                    <div className="rounded-2xl bg-gray-950/90 px-4 pb-4 pt-3">
                        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-lg font-bold tracking-tight text-transparent bg-gradient-to-r from-amber-200 via-orange-200 to-teal-200 bg-clip-text">
                                    Historial de movimientos
                                </h2>
                                <p className="mt-1 text-xs text-amber-100/70">
                                    El <span className="font-semibold text-teal-200/90">saldo</span> es el total de créditos
                                    acumulados. Las{" "}
                                    <span className="font-semibold text-emerald-300">compras suman</span> y cada sesión
                                    descuenta:{" "}
                                    <span className="font-semibold text-teal-200/90">grupal o semanal = 1</span>
                                    {" · "}
                                    <span className="font-semibold text-amber-200/90">particular = 2</span>.
                                </p>
                            </div>
                        </div>
                        <div className="rounded-xl border border-white/5">
                            <table className="w-full table-fixed text-sm">
                                <colgroup>
                                    <col className="w-[22%]" />
                                    <col className="w-[34%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[14%]" />
                                    <col className="w-[16%]" />
                                </colgroup>
                                <thead className="bg-gradient-to-r from-amber-900/35 via-gray-900/80 to-teal-900/35 text-[11px] font-semibold uppercase tracking-wide text-amber-50/90">
                                    <tr>
                                        <th className="px-3 py-2.5 text-left">Fecha</th>
                                        <th className="px-3 py-2.5 text-left">Concepto</th>
                                        <th className="px-3 py-2.5 text-center">Créditos</th>
                                        <th className="px-3 py-2.5 text-right">Saldo</th>
                                        <th className="px-3 py-2.5 text-center">Detalles</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-gray-100">
                                    {visibleConsumptionHistory.map((row, idx) => {
                                        const entryType = row.entry_type || "consumption";
                                        const isPurchase = entryType === "purchase";
                                        const isPurchasePending = entryType === "purchase_pending";
                                        const isConsumption = entryType === "consumption";
                                        const uc = Math.max(1, Number(row.credits_consumed ?? 1));
                                        const creditsAdded = Number(row.credits_added ?? 0);
                                        const isExpanded = expandedConsumptionId === row.id;

                                        let rowBg = idx % 2 === 0 ? "bg-gray-900/25 hover:bg-gray-800/40" : "bg-gray-900/10 hover:bg-gray-800/35";
                                        if (isExpanded) rowBg = "bg-teal-950/35";
                                        if (isPurchase) rowBg = isExpanded ? "bg-emerald-950/40" : "bg-emerald-950/20 hover:bg-emerald-950/30";
                                        if (isPurchasePending) rowBg = isExpanded ? "bg-amber-950/35" : "bg-amber-950/15 hover:bg-amber-950/25";

                                        const creditsBadge = isPurchase
                                            ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/45"
                                            : isPurchasePending
                                              ? "bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/35"
                                              : uc >= 2
                                                ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40"
                                                : "bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/30";

                                        return (
                                            <Fragment key={row.id}>
                                                <tr className={rowBg}>
                                                    <td className="px-3 py-2.5 text-gray-200">{row.date_human || "—"}</td>
                                                    <td
                                                        className={`break-words px-3 py-2.5 ${
                                                            isPurchase
                                                                ? "font-medium text-emerald-100"
                                                                : isPurchasePending
                                                                  ? "font-medium text-amber-100"
                                                                  : "text-gray-100"
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
                                                                ? "text-emerald-300"
                                                                : isPurchasePending
                                                                  ? "text-amber-200/70"
                                                                  : "text-teal-200"
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
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleConsumptionDetails(row.id)}
                                                                aria-expanded={isExpanded}
                                                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                    isExpanded
                                                                        ? "bg-teal-500/20 text-teal-100 ring-1 ring-teal-400/40"
                                                                        : "bg-gray-800/80 text-amber-100/90 ring-1 ring-amber-500/25 hover:bg-gray-700/80"
                                                                }`}
                                                            >
                                                                {isExpanded ? "Ocultar" : "Ver más"}
                                                                <span
                                                                    className={`text-[10px] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                                >
                                                                    ▼
                                                                </span>
                                                            </button>
                                                        ) : isPurchase || isPurchasePending ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleConsumptionDetails(row.id)}
                                                                aria-expanded={isExpanded}
                                                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                                    isExpanded
                                                                        ? "bg-emerald-500/20 text-emerald-100 ring-1 ring-emerald-400/40"
                                                                        : "bg-gray-800/80 text-emerald-100/90 ring-1 ring-emerald-500/25 hover:bg-gray-700/80"
                                                                }`}
                                                            >
                                                                {isExpanded ? "Ocultar" : "Ver más"}
                                                                <span
                                                                    className={`text-[10px] transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                                                >
                                                                    ▼
                                                                </span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-500">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                                {isExpanded && isConsumption ? (
                                                    <tr className="bg-teal-950/20">
                                                        <td colSpan={5} className="border-t border-teal-500/15 px-4 py-4">
                                                            <ConsumptionDetailsPanel details={row.details} />
                                                        </td>
                                                    </tr>
                                                ) : null}
                                                {isExpanded && (isPurchase || isPurchasePending) ? (
                                                    <tr className={isPurchase ? "bg-emerald-950/25" : "bg-amber-950/20"}>
                                                        <td colSpan={5} className="border-t border-white/5 px-4 py-3 text-sm text-slate-300">
                                                            <p>
                                                                <span className="font-semibold text-white">
                                                                    {row.purchase?.pack_name || row.lesson_name}
                                                                </span>
                                                                {row.purchase?.precio > 0 ? (
                                                                    <span className="text-slate-400">
                                                                        {" "}
                                                                        · {formatEur(row.purchase.precio)}
                                                                    </span>
                                                                ) : null}
                                                            </p>
                                                            <p className="mt-1 text-xs text-slate-400">
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
                                            <td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-400">
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
                <div ref={myBonosSectionRef} className="scroll-mt-24 rounded-xl border border-gray-700 bg-gray-900 p-4">
                    <div className="mb-3">
                        <h2 className="text-lg font-semibold text-white">Detalle por bono</h2>
                        <p className="mt-1 text-xs text-gray-400">
                            Solo se consume un bono a la vez. Los demás quedan en cola. El historial completo está arriba.
                        </p>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-200">
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
                                    className={`overflow-hidden rounded-lg border bg-gray-800/70 ${isExpanded ? "border-teal-500/30" : "border-gray-700"}`}
                                >
                                    <div className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-semibold text-gray-100">{b.pack}</p>
                                            <p className="mt-0.5 text-xs text-gray-400">
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
                                            <button
                                                type="button"
                                                onClick={() => togglePurchaseDetails(b.id)}
                                                aria-expanded={isExpanded}
                                                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                                                    isExpanded
                                                        ? "bg-teal-500/20 text-teal-100 ring-1 ring-teal-400/40"
                                                        : "bg-gray-900/80 text-amber-100/90 ring-1 ring-amber-500/25 hover:bg-gray-700/80"
                                                }`}
                                            >
                                                {isExpanded ? "Ocultar" : "Ver más"}
                                                <span className={`text-[10px] transition-transform ${isExpanded ? "rotate-180" : ""}`}>▼</span>
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded ? (
                                        <div className="border-t border-white/5 bg-gray-900/50 px-3 py-3">
                                            <div className="mb-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-2">
                                                <p>
                                                    <span className="font-semibold uppercase tracking-wide text-gray-500">Comprado</span>
                                                    <br />
                                                    <span className="text-sm text-gray-200">{b.purchased_at_human || "—"}</span>
                                                </p>
                                                <p>
                                                    <span className="font-semibold uppercase tracking-wide text-gray-500">Importe</span>
                                                    <br />
                                                    <span className="text-sm text-gray-200">
                                                        {Number(b.precio || 0).toFixed(2).replace(".", ",")} €
                                                    </span>
                                                </p>
                                            </div>

                                            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-200/80">
                                                Clases de este bono ({bonoClasses.length})
                                            </p>

                                            {bonoClasses.length === 0 ? (
                                                <p className="text-sm text-gray-400">
                                                    Aún no hay clases registradas en este bono.
                                                </p>
                                            ) : (
                                                <div className="overflow-hidden rounded-xl border border-white/5">
                                                    <table className="w-full table-fixed text-sm">
                                                        <colgroup>
                                                            <col className="w-[24%]" />
                                                            <col className="w-[36%]" />
                                                            <col className="w-[14%]" />
                                                            <col className="w-[14%]" />
                                                            <col className="w-[12%]" />
                                                        </colgroup>
                                                        <thead className="bg-gray-900/80 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                                            <tr>
                                                                <th className="px-2 py-2 text-left">Fecha</th>
                                                                <th className="px-2 py-2 text-left">Clase</th>
                                                                <th className="px-2 py-2 text-center">Créd.</th>
                                                                <th className="px-2 py-2 text-right">Saldo</th>
                                                                <th className="px-2 py-2 text-center">+</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5 text-gray-100">
                                                            {bonoClasses.map((row) => {
                                                                const uc = Math.max(1, Number(row.credits_consumed ?? 1));
                                                                const classKey = `${b.id}:${row.id}`;
                                                                const classExpanded = expandedPurchaseClassKey === classKey;
                                                                const ucBadge =
                                                                    uc >= 2
                                                                        ? "bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/40"
                                                                        : "bg-teal-500/15 text-teal-100 ring-1 ring-teal-400/30";

                                                                return (
                                                                    <Fragment key={row.id}>
                                                                        <tr className={classExpanded ? "bg-teal-950/25" : "bg-gray-900/20"}>
                                                                            <td className="px-2 py-2 text-xs text-gray-300">{row.date_human || "—"}</td>
                                                                            <td className="break-words px-2 py-2 text-xs">{row.lesson_name || "Clase de surf"}</td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <span className={`inline-flex min-w-[1.75rem] justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${ucBadge}`}>
                                                                                    {uc}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-2 py-2 text-right text-xs font-semibold text-teal-200 tabular-nums">
                                                                                {row.remaining_after}
                                                                            </td>
                                                                            <td className="px-2 py-2 text-center">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => togglePurchaseClassDetails(b.id, row.id)}
                                                                                    aria-expanded={classExpanded}
                                                                                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                                                                                        classExpanded
                                                                                            ? "bg-teal-500/20 text-teal-100"
                                                                                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                                                                                    }`}
                                                                                >
                                                                                    {classExpanded ? "−" : "+"}
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                        {classExpanded ? (
                                                                            <tr className="bg-teal-950/15">
                                                                                <td colSpan={5} className="border-t border-teal-500/10 px-3 py-3">
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
                        {myBonos.length === 0 ? <li className="text-gray-400">Aún no tienes bonos.</li> : null}
                    </ul>
                    <LoadMoreButton
                        label="Ver más bonos"
                        onClick={loadMorePurchases}
                        remaining={remainingPurchases}
                    />
                </div>
                ) : null}
            </div>

            <ManualPaymentInstructionsModal
                open={!!selectedPack}
                onClose={() => setSelectedPack(null)}
                bizumNumber={paymentBizumNumber || "[BIZUM_NUMBER]"}
                iban={paymentIban || "[IBAN]"}
                whatsappHelpUrl={whatsappHelpUrl}
                showDepositNotice={false}
                totalPrimaryLine={selectedPack ? `Total a pagar: ${Number(selectedPack.precio).toFixed(2).replace(".", ",")} €` : null}
                secondaryNote="Tu bono se activará en cuanto el administrador confirme el pago."
                uploadIntro="Sube aquí el justificante de pago para validación manual."
                onSubmit={submitBono}
                onAfterSuccessSubmit={() => setSelectedPack(null)}
                successSubtitle="Hemos recibido tu solicitud. Validaremos el pago y activaremos tu bono."
            />
        </>
    );
}
