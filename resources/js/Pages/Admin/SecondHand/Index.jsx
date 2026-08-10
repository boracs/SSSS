import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import {
    PlusCircle,
    Plus,
    Minus,
    Pencil,
    Trash2,
    RotateCcw,
    TrendingUp,
    CheckCircle2,
    Clock,
    Archive,
    Ruler,
    Droplets,
    ChevronDown,
    Search,
    Filter,
    X,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmt = (cents) => (cents != null ? EUR.format(cents / 100) : "-");

function fmtDate(iso) {
    if (!iso) return "—";
    const parts = String(iso).slice(0, 10).split("-");
    if (parts.length !== 3) return iso;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const STATUS_CONFIG = {
    available: {
        label:  "Disponible",
        select: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20",
        dot:    "bg-emerald-400",
    },
    reserved: {
        label:  "Reservada",
        select: "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20",
        dot:    "bg-amber-400",
    },
    sold: {
        label:  "Vendida",
        select: "border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
        dot:    "bg-rose-400",
    },
    inactive: {
        label:  "Desactivada",
        select: "border-slate-500/40 bg-slate-500/10 text-slate-400",
        dot:    "bg-slate-500",
    },
};

// ── StatusSelect — dropdown estilizado con confirmación diferida ───────────────

function StatusSelect({ board, onRequestChange }) {
    const inactive = board.is_active === false;
    const cfg = inactive
        ? STATUS_CONFIG.inactive
        : STATUS_CONFIG[board.status] ?? STATUS_CONFIG.sold;

    if (inactive) {
        return (
            <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.select}`}
                title="Tabla retirada del catálogo (soft-delete)"
            >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
            </span>
        );
    }

    return (
        <div className="relative inline-flex items-center">
            <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${cfg.select}`}
                title="Cambiar estado"
            >
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
                <select
                    value={board.status}
                    onChange={(e) => onRequestChange(board, e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Cambiar estado"
                >
                    {Object.entries(STATUS_CONFIG)
                        .filter(([val]) => val !== "inactive")
                        .map(([val, { label }]) => (
                            <option key={val} value={val}>
                                {label}
                            </option>
                        ))}
                </select>
            </button>
        </div>
    );
}

// ── ConfirmStatusModal ─────────────────────────────────────────────────────────

function ConfirmStatusModal({ pending, onCancel, onConfirm, processing }) {
    if (!pending) return null;
    const { board, newStatus } = pending;
    const cfg = STATUS_CONFIG[newStatus] ?? STATUS_CONFIG.sold;

    return (
        <div className="fixed inset-0 z-[900] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
            <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                {/* Header coloreado según estado destino */}
                <div className={`border-b border-white/5 px-6 py-4`}>
                    <div className={`mb-1 inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${cfg.select}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </div>
                    <h2 className="mt-2 text-sm font-bold text-white">
                        Confirmar cambio de estado
                    </h2>
                </div>

                {/* Cuerpo */}
                <div className="px-6 py-5">
                    <p className="text-sm text-slate-400">
                        ¿Estás seguro de cambiar el estado de{" "}
                        <strong className="text-white">«{board.name}»</strong>{" "}
                        a{" "}
                        <strong className={`${cfg.select.includes("emerald") ? "text-emerald-300" : cfg.select.includes("amber") ? "text-amber-300" : "text-rose-300"}`}>
                            {cfg.label}
                        </strong>?
                    </p>
                    {newStatus === "sold" && (
                        <p className="mt-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                            Se registrará la fecha de venta automáticamente.
                        </p>
                    )}
                </div>

                {/* Acciones */}
                <div className="flex gap-3 border-t border-white/5 px-6 py-4">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="flex-1 rounded-xl bg-orange-500 py-2 text-sm font-bold text-white transition hover:bg-orange-600 disabled:opacity-50"
                    >
                        {processing ? "Guardando…" : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Panel detalle (acordeón) — denso, sin tarjetas ni estado duplicado ─────────

function BoardDetailPanel({ board }) {
    const profit = board.profit_cents;
    const rows = [
        { label: "Alta", value: fmtDate(board.purchased_at || board.created_at) },
        { label: "Venta", value: fmtDate(board.sold_at) },
        { label: "Compra", value: fmt(board.purchase_price) },
        { label: "PVP", value: fmt(board.sale_price) },
        {
            label: board.discount_pct > 0 ? `Final (−${board.discount_pct}%)` : "Final",
            value: fmt(board.effective_price),
            accent: board.discount_pct > 0 ? "text-orange-400" : "text-white",
        },
        {
            label: "Margen",
            value: profit != null ? fmt(profit) : "Al vender",
            accent:
                profit == null
                    ? "text-slate-500"
                    : profit >= 0
                      ? "text-emerald-400"
                      : "text-rose-400",
        },
    ];

    return (
        <div className="border-t border-white/5 bg-slate-950/70 px-3 py-2.5">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-6">
                {rows.map(({ label, value, accent }) => (
                    <div key={label} className="min-w-0">
                        <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-500">
                            {label}
                        </dt>
                        <dd
                            className={`truncate text-xs font-semibold tabular-nums ${accent || "text-white"}`}
                        >
                            {value}
                        </dd>
                    </div>
                ))}
            </dl>
            {board.description ? (
                <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-slate-400">
                    <span className="font-semibold text-slate-500">Notas · </span>
                    {board.description}
                </p>
            ) : null}
        </div>
    );
}

function ExpandToggle({ expanded, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-expanded={expanded}
            aria-label={expanded ? "Ocultar detalle" : "Ver detalle"}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition ${
                expanded
                    ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
                    : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
            }`}
        >
            {expanded ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
        </button>
    );
}

function BoardActions({ board, onDeactivate, onRestore }) {
    const inactive = board.is_active === false;
    const sold = board.status === "sold";
    // Vendida = historial contable: no se retira. Desactivar solo si sigue en venta
    // (nos la quedamos, regalo, etc.). Reactivar solo aplica a las ya soft-deleted.
    const canDeactivate = !inactive && !sold;

    return (
        <div className="flex shrink-0 items-center gap-1">
            {!inactive ? (
                <button
                    type="button"
                    onClick={() => router.get(route("admin.second-hand.edit", board.id))}
                    className="rounded-md border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                    title="Editar"
                >
                    <Pencil className="h-3.5 w-3.5" />
                </button>
            ) : null}
            {inactive ? (
                <button
                    type="button"
                    onClick={() => onRestore(board)}
                    className="rounded-md border border-emerald-500/25 bg-emerald-500/10 p-1.5 text-emerald-400 hover:bg-emerald-500/20"
                    title="Reactivar"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </button>
            ) : canDeactivate ? (
                <button
                    type="button"
                    onClick={() => onDeactivate(board)}
                    className="rounded-md border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20"
                    title="Retirar del catálogo (no vendida)"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            ) : null}
        </div>
    );
}

function BoardThumb({ board, size = "md" }) {
    const box = size === "sm" ? "h-11 w-11" : "h-12 w-12";
    if (board.first_image) {
        return (
            <img
                src={board.first_image}
                alt={board.name}
                className={`${box} shrink-0 rounded-lg object-cover`}
            />
        );
    }
    return (
        <div
            className={`flex ${box} shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-600`}
        >
            <Ruler className="h-4 w-4" />
        </div>
    );
}

/** Tarjeta compacta para móvil (sin scroll horizontal de tabla). */
function BoardMobileCard({
    board,
    expanded,
    onToggleExpand,
    onDeactivate,
    onRestore,
    onRequestStatusChange,
}) {
    const inactive = board.is_active === false;

    return (
        <article
            className={`overflow-hidden rounded-xl border ${
                inactive
                    ? "border-white/5 bg-white/[0.02] opacity-80"
                    : expanded
                      ? "border-orange-500/25 bg-white/[0.06]"
                      : "border-white/10 bg-white/[0.03]"
            }`}
        >
            <div className="flex gap-2.5 p-2.5">
                <ExpandToggle expanded={expanded} onClick={() => onToggleExpand(board.id)} />
                <BoardThumb board={board} size="sm" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            {board.brand ? (
                                <p className="truncate text-[10px] font-bold uppercase tracking-wider text-orange-400">
                                    {board.brand}
                                    {board.model ? (
                                        <span className="font-medium normal-case tracking-normal text-slate-500">
                                            {" · "}
                                            {board.model}
                                        </span>
                                    ) : null}
                                </p>
                            ) : null}
                            <p className="truncate text-sm font-semibold leading-tight text-white">
                                {board.name}
                            </p>
                        </div>
                        <BoardActions
                            board={board}
                            onDeactivate={onDeactivate}
                            onRestore={onRestore}
                        />
                    </div>
                    <p className="mt-0.5 truncate text-[11px] tabular-nums text-slate-500">
                        {board.height}&apos; × {board.width}&quot; × {board.thickness}&quot;
                        <span className="mx-1 text-slate-700">·</span>
                        {board.volume} L
                        <span className="mx-1 text-slate-700">·</span>
                        #SH-{board.id}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                        <StatusSelect board={board} onRequestChange={onRequestStatusChange} />
                        <p className="text-sm font-bold tabular-nums text-white">
                            {fmt(board.effective_price ?? board.sale_price)}
                            {board.discount_pct > 0 ? (
                                <span className="ml-1 text-[10px] font-semibold text-orange-400">
                                    −{board.discount_pct}%
                                </span>
                            ) : null}
                        </p>
                    </div>
                </div>
            </div>
            {expanded ? <BoardDetailPanel board={board} /> : null}
        </article>
    );
}

// ── Fila de tabla (desktop) ────────────────────────────────────────────────────

function BoardRow({
    board,
    expanded,
    onToggleExpand,
    onDeactivate,
    onRestore,
    onRequestStatusChange,
}) {
    const profit = board.profit_cents;
    const inactive = board.is_active === false;

    return (
        <>
            <tr
                className={`border-t border-white/5 ${
                    inactive
                        ? "bg-white/[0.02] opacity-80"
                        : expanded
                          ? "bg-white/[0.07]"
                          : "hover:bg-white/5"
                }`}
            >
                <td className="w-10 px-2 py-2.5">
                    <ExpandToggle expanded={expanded} onClick={() => onToggleExpand(board.id)} />
                </td>
                <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                        <BoardThumb board={board} size="sm" />
                        <div className="min-w-0">
                            {board.brand ? (
                                <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">
                                    {board.brand}
                                </p>
                            ) : null}
                            {board.model ? (
                                <p className="truncate text-[10px] text-slate-400">{board.model}</p>
                            ) : null}
                            <p className="truncate text-sm font-semibold text-white">{board.name}</p>
                            <p className="text-[10px] text-slate-500">#SH-{board.id}</p>
                        </div>
                    </div>
                </td>
                <td className="px-3 py-2.5 text-xs tabular-nums text-slate-400">
                    <p>
                        {board.height}&apos; × {board.width}&quot; × {board.thickness}&quot;
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px]">
                        <Droplets className="h-3 w-3" />
                        {board.volume} L
                    </p>
                </td>
                <td className="px-3 py-2.5">
                    <StatusSelect board={board} onRequestChange={onRequestStatusChange} />
                </td>
                <td className="px-3 py-2.5">
                    <p className="text-sm font-bold tabular-nums text-white">
                        {fmt(board.effective_price ?? board.sale_price)}
                    </p>
                    {board.discount_pct > 0 ? (
                        <p className="text-[11px] text-orange-400">−{board.discount_pct}%</p>
                    ) : null}
                </td>
                <td className="px-3 py-2.5">
                    {profit != null ? (
                        <div
                            className={`flex items-center gap-1 text-sm font-bold tabular-nums ${
                                profit >= 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                        >
                            <TrendingUp className="h-3.5 w-3.5" />
                            {fmt(profit)}
                        </div>
                    ) : (
                        <span className="text-xs text-slate-600">—</span>
                    )}
                </td>
                <td className="px-3 py-2.5">
                    <BoardActions
                        board={board}
                        onDeactivate={onDeactivate}
                        onRestore={onRestore}
                    />
                </td>
            </tr>
            {expanded ? (
                <tr>
                    <td colSpan={7} className="p-0">
                        <BoardDetailPanel board={board} />
                    </td>
                </tr>
            ) : null}
        </>
    );
}

// ── Página ─────────────────────────────────────────────────────────────────────

const FILTER_LABEL =
    "mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500";
const FILTER_CONTROL =
    "h-10 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 text-sm text-white placeholder:text-slate-500 transition focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20";

export default function AdminSecondHandIndex({ boards, filters = {}, boardTypes = [] }) {
    const { props } = usePage();
    const flash = props?.flash;

    const [search, setSearch] = useState(filters.search || "");
    const [status, setStatus] = useState(filters.status || "");
    const [boardType, setBoardType] = useState(filters.board_type || "");
    const [dateType, setDateType] = useState(filters.date_type || "created");
    const [dateFrom, setDateFrom] = useState(filters.date_from || "");
    const [dateTo, setDateTo] = useState(filters.date_to || "");

    const buildQuery = ({
        nextSearch = search,
        nextStatus = status,
        nextBoardType = boardType,
        nextDateType = dateType,
        nextDateFrom = dateFrom,
        nextDateTo = dateTo,
    } = {}) => ({
        search: nextSearch || undefined,
        status: nextStatus || undefined,
        board_type: nextBoardType || undefined,
        date_type: nextDateType || "created",
        date_from: nextDateFrom || undefined,
        date_to: nextDateTo || undefined,
    });

    const applyFilters = (overrides = {}) => {
        router.get(route("admin.second-hand.index"), buildQuery(overrides), {
            preserveState: true,
            preserveScroll: true,
            only: ["boards", "filters"],
        });
    };

    const clearFilters = () => {
        setSearch("");
        setStatus("");
        setBoardType("");
        setDateType("created");
        setDateFrom("");
        setDateTo("");
        router.get(route("admin.second-hand.index"), {}, {
            preserveState: true,
            preserveScroll: true,
            only: ["boards", "filters"],
        });
    };

    const hasActiveFilters = Boolean(
        search || status || boardType || dateFrom || dateTo || dateType !== "created"
    );

    // Modal desactivar (soft-delete)
    const [confirmDeactivate, setConfirmDeactivate] = useState(null);

    // Modal cambio de estado
    const [pendingStatus, setPendingStatus] = useState(null); // { board, newStatus }
    const [statusProcessing, setStatusProcessing] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpanded = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    const handleDeactivate = (board) => setConfirmDeactivate(board);
    const doDeactivate = () => {
        if (!confirmDeactivate) return;
        router.delete(route("admin.second-hand.destroy", confirmDeactivate.id), {
            onFinish: () => setConfirmDeactivate(null),
        });
    };

    const handleRestore = (board) => {
        router.patch(route("admin.second-hand.restore", board.id), {}, {
            preserveScroll: true,
        });
    };

    /* ── Cambio de estado ── */
    const handleRequestStatusChange = (board, newStatus) => {
        if (newStatus === board.status) return; // sin cambio, no abrir modal
        setPendingStatus({ board, newStatus });
    };

    const cancelStatusChange = () => {
        if (!statusProcessing) setPendingStatus(null);
    };

    const confirmStatusChange = () => {
        if (!pendingStatus || statusProcessing) return;
        setStatusProcessing(true);

        router.patch(
            route("admin.second-hand.update-status", pendingStatus.board.id),
            { status: pendingStatus.newStatus },
            {
                preserveScroll: true,
                onFinish: () => {
                    setStatusProcessing(false);
                    setPendingStatus(null);
                },
            }
        );
    };

    const stats = {
        available: boards.filter((b) => b.status === "available").length,
        reserved:  boards.filter((b) => b.status === "reserved").length,
        sold:      boards.filter((b) => b.status === "sold").length,
        revenue:   boards.filter((b) => b.status === "sold").reduce((acc, b) => acc + (b.effective_price ?? 0), 0),
    };

    const emptyMessage = hasActiveFilters
        ? "No hay tablas que coincidan con los filtros aplicados."
        : "No hay tablas registradas aún.";

    return (
        <>
            <div className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">

                {flash?.success && (
                    <div className="mb-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 sm:mb-4 sm:px-4 sm:py-3">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mb-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 sm:mb-4 sm:px-4 sm:py-3">
                        {flash.error}
                    </div>
                )}

                <div className="mb-3 flex items-center justify-between gap-3 sm:mb-6 sm:gap-4">
                    <div className="min-w-0">
                        <h1 className="truncate text-lg font-extrabold text-white sm:text-2xl">
                            Gestión Segunda Mano
                        </h1>
                        <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
                            {boards.length} tablas registradas
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.get(route("admin.second-hand.create"))}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white shadow-lg transition hover:bg-orange-600 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-sm"
                    >
                        <PlusCircle className="h-4 w-4" />
                        <span className="sm:hidden">Nueva</span>
                        <span className="hidden sm:inline">Nueva tabla</span>
                    </button>
                </div>

                <div className="mb-3 grid grid-cols-4 gap-1.5 sm:mb-6 sm:gap-3">
                    {[
                        { label: "Disponibles", short: "Disp.", value: stats.available, icon: CheckCircle2, color: "text-emerald-400" },
                        { label: "Reservadas", short: "Res.", value: stats.reserved, icon: Clock, color: "text-amber-400" },
                        { label: "Vendidas", short: "Vend.", value: stats.sold, icon: Archive, color: "text-slate-400" },
                        { label: "Ingresos", short: "Ing.", value: fmt(stats.revenue), icon: TrendingUp, color: "text-cyan-400" },
                    ].map(({ label, short, value, icon: Icon, color }) => (
                        <div
                            key={label}
                            className="rounded-xl border border-white/10 bg-white/5 px-2 py-2 sm:rounded-2xl sm:p-4"
                        >
                            <Icon className={`mb-0.5 h-3.5 w-3.5 sm:mb-1.5 sm:h-5 sm:w-5 ${color}`} />
                            <p className="truncate text-sm font-extrabold tabular-nums text-white sm:text-2xl">
                                {value}
                            </p>
                            <p className="truncate text-[9px] text-slate-500 sm:text-xs">
                                <span className="sm:hidden">{short}</span>
                                <span className="hidden sm:inline">{label}</span>
                            </p>
                        </div>
                    ))}
                </div>

                <div className="mb-3 rounded-xl border border-white/10 bg-slate-900/60 p-3 backdrop-blur-sm sm:mb-6 sm:rounded-2xl sm:p-4">
                    <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 sm:mb-4 sm:text-xs">
                        <Filter className="h-3.5 w-3.5" />
                        Filtros
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
                        <div className="col-span-2 sm:col-span-1">
                            <label htmlFor="sh-filter-search" className={FILTER_LABEL}>
                                Buscar
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <input
                                    id="sh-filter-search"
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                                    placeholder="Marca o modelo…"
                                    className={`${FILTER_CONTROL} h-9 pl-9 sm:h-10`}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="sh-filter-status" className={FILTER_LABEL}>
                                Estado
                            </label>
                            <select
                                id="sh-filter-status"
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className={`${FILTER_CONTROL} h-9 sm:h-10`}
                            >
                                <option value="" className="bg-slate-900">Todos</option>
                                <option value="available" className="bg-slate-900">Disponible</option>
                                <option value="reserved" className="bg-slate-900">Reservada</option>
                                <option value="sold" className="bg-slate-900">Vendida</option>
                                <option value="inactive" className="bg-slate-900">Desactivadas</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="sh-filter-board-type" className={FILTER_LABEL}>
                                Tipo
                            </label>
                            <select
                                id="sh-filter-board-type"
                                value={boardType}
                                onChange={(e) => setBoardType(e.target.value)}
                                className={`${FILTER_CONTROL} h-9 sm:h-10`}
                            >
                                <option value="" className="bg-slate-900">Todos</option>
                                {boardTypes.map((t) => (
                                    <option key={t.value} value={t.value} className="bg-slate-900">
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label htmlFor="sh-filter-date-type" className={FILTER_LABEL}>
                                Fecha
                            </label>
                            <select
                                id="sh-filter-date-type"
                                value={dateType}
                                onChange={(e) => setDateType(e.target.value)}
                                className={`${FILTER_CONTROL} h-9 sm:h-10`}
                            >
                                <option value="created" className="bg-slate-900">Alta / Compra</option>
                                <option value="sold" className="bg-slate-900">Venta</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="sh-filter-from" className={FILTER_LABEL}>
                                Desde
                            </label>
                            <input
                                id="sh-filter-from"
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className={`${FILTER_CONTROL} h-9 sm:h-10`}
                            />
                        </div>

                        <div>
                            <label htmlFor="sh-filter-to" className={FILTER_LABEL}>
                                Hasta
                            </label>
                            <input
                                id="sh-filter-to"
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className={`${FILTER_CONTROL} h-9 sm:h-10`}
                            />
                        </div>
                    </div>

                    <div className="mt-2.5 flex justify-end gap-2 sm:mt-4">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-300 transition hover:bg-white/10 sm:h-10 sm:px-4 sm:text-sm"
                            >
                                <X className="h-3.5 w-3.5" />
                                Limpiar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-4 text-xs font-bold text-white transition hover:bg-orange-600 sm:h-10 sm:px-5 sm:text-sm"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filtrar
                        </button>
                    </div>
                </div>

                {/* Móvil: cards densas */}
                <div className="space-y-2 md:hidden">
                    {boards.length === 0 ? (
                        <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-slate-500">
                            {emptyMessage}
                        </p>
                    ) : (
                        boards.map((board) => (
                            <BoardMobileCard
                                key={board.id}
                                board={board}
                                expanded={expandedId === board.id}
                                onToggleExpand={toggleExpanded}
                                onDeactivate={handleDeactivate}
                                onRestore={handleRestore}
                                onRequestStatusChange={handleRequestStatusChange}
                            />
                        ))
                    )}
                </div>

                {/* Desktop: tabla */}
                <div className="hidden overflow-x-auto rounded-2xl border border-white/10 bg-white/5 md:block">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="w-10 px-2 py-2.5" aria-label="Detalle" />
                                {["Tabla", "Medidas", "Estado", "Precios", "Margen", "Acciones"].map((h) => (
                                    <th
                                        key={h}
                                        className="px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {boards.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                                        {emptyMessage}
                                    </td>
                                </tr>
                            ) : (
                                boards.map((board) => (
                                    <BoardRow
                                        key={board.id}
                                        board={board}
                                        expanded={expandedId === board.id}
                                        onToggleExpand={toggleExpanded}
                                        onDeactivate={handleDeactivate}
                                        onRestore={handleRestore}
                                        onRequestStatusChange={handleRequestStatusChange}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {confirmDeactivate && (
                <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/70 px-4">
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                        <h2 className="text-base font-bold text-white">¿Retirar del catálogo?</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            <strong className="text-white">{confirmDeactivate.name}</strong> dejará de
                            mostrarse en venta (p. ej. te la quedas o la regalas). No se borra
                            el registro; puedes reactivarla después. Si se vende, márcala como
                            Vendida — esas no se retiran.
                        </p>
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDeactivate(null)}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={doDeactivate}
                                className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-bold text-white hover:bg-rose-700"
                            >
                                Retirar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmStatusModal
                pending={pendingStatus}
                onCancel={cancelStatusChange}
                onConfirm={confirmStatusChange}
                processing={statusProcessing}
            />
        </>
    );
}