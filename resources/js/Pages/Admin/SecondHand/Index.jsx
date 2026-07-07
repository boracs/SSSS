import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Layout1 from "../../../layouts/Layout1";
import {
    PlusCircle,
    Plus,
    Minus,
    Pencil,
    Trash2,
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
};

// ── StatusSelect — dropdown estilizado con confirmación diferida ───────────────

function StatusSelect({ board, onRequestChange }) {
    const cfg = STATUS_CONFIG[board.status] ?? STATUS_CONFIG.sold;

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

                {/* El select nativo invisible sobre el botón */}
                <select
                    value={board.status}
                    onChange={(e) => onRequestChange(board, e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                    aria-label="Cambiar estado"
                >
                    {Object.entries(STATUS_CONFIG).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
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

// ── Panel detalle (acordeón) ───────────────────────────────────────────────────

function BoardDetailPanel({ board }) {
    const profit = board.profit_cents;
    const cfg = STATUS_CONFIG[board.status] ?? STATUS_CONFIG.sold;

    return (
        <div className="grid gap-4 border-t border-white/5 bg-slate-950/60 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Fechas</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Compra / alta</dt>
                        <dd className="font-medium text-white">{fmtDate(board.purchased_at || board.created_at)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Venta</dt>
                        <dd className="font-medium text-white">{fmtDate(board.sold_at)}</dd>
                    </div>
                </dl>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Precios</p>
                <dl className="mt-2 space-y-1.5 text-sm">
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Compra</dt>
                        <dd className="font-medium text-slate-300">{fmt(board.purchase_price)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Venta PVP</dt>
                        <dd className="font-semibold text-white">{fmt(board.sale_price)}</dd>
                    </div>
                    {board.discount_pct > 0 ? (
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Con descuento</dt>
                            <dd className="font-semibold text-orange-400">
                                -{board.discount_pct}% · {fmt(board.effective_price)}
                            </dd>
                        </div>
                    ) : (
                        <div className="flex justify-between gap-2">
                            <dt className="text-slate-500">Precio final</dt>
                            <dd className="font-semibold text-white">{fmt(board.effective_price)}</dd>
                        </div>
                    )}
                </dl>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Estado</p>
                <p className="mt-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${cfg.select}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                    </span>
                </p>
                {profit != null ? (
                    <p className={`mt-3 text-sm font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        Margen: {fmt(profit)}
                    </p>
                ) : (
                    <p className="mt-3 text-xs text-slate-500">Margen al cerrar venta</p>
                )}
            </div>
            {board.description ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:col-span-2 lg:col-span-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Notas</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{board.description}</p>
                </div>
            ) : null}
        </div>
    );
}

// ── Fila de tabla ──────────────────────────────────────────────────────────────

function BoardRow({ board, expanded, onToggleExpand, onDelete, onRequestStatusChange }) {
    const profit = board.profit_cents;

    return (
        <>
        <tr className={`border-t border-white/5 ${expanded ? "bg-white/[0.07]" : "hover:bg-white/5"}`}>
            <td className="w-12 px-2 py-3">
                <button
                    type="button"
                    onClick={() => onToggleExpand(board.id)}
                    aria-expanded={expanded}
                    aria-label={expanded ? "Ocultar detalle" : "Ver detalle"}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
                        expanded
                            ? "border-orange-500/40 bg-orange-500/15 text-orange-300"
                            : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                >
                    {expanded ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                </button>
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    {board.first_image ? (
                        <img src={board.first_image} alt={board.name} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                    ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-600">
                            <Ruler className="h-5 w-5" />
                        </div>
                    )}
                    <div>
                        {board.brand && (
                            <p className="text-[10px] font-bold uppercase tracking-wider text-orange-400">{board.brand}</p>
                        )}
                        {board.model && (
                            <p className="text-[10px] text-slate-400">{board.model}</p>
                        )}
                        {board.board_type_label && (
                            <p className="text-[10px] text-slate-500">{board.board_type_label}</p>
                        )}
                        <p className="text-sm font-semibold text-white">{board.name}</p>
                        <p className="text-[11px] text-slate-500">#SH-{board.id}</p>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 text-xs text-slate-400">
                <div className="space-y-0.5">
                    <p>{board.height}&apos; ✕ {board.width}&quot; ✕ {board.thickness}&quot;</p>
                    <p className="flex items-center gap-1">
                        <Droplets className="h-3 w-3" />{board.volume} L
                    </p>
                </div>
            </td>

            {/* ── ESTADO: selector interactivo ── */}
            <td className="px-4 py-3">
                <StatusSelect board={board} onRequestChange={onRequestStatusChange} />
            </td>

            <td className="px-4 py-3">
                <p className="text-sm font-bold text-white">{fmt(board.effective_price ?? board.sale_price)}</p>
                {board.discount_pct > 0 ? (
                    <p className="text-[11px] text-orange-400">-{board.discount_pct}%</p>
                ) : null}
            </td>
            <td className="px-4 py-3">
                {profit != null ? (
                    <div className={`flex items-center gap-1 text-sm font-bold ${profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        <TrendingUp className="h-3.5 w-3.5" />
                        {fmt(profit)}
                    </div>
                ) : (
                    <span className="text-xs text-slate-600">-</span>
                )}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => router.get(route("admin.second-hand.edit", board.id))}
                        className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
                        title="Editar"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(board)}
                        className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-1.5 text-rose-400 hover:bg-rose-500/20"
                        title="Eliminar"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
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

    // Modal borrado
    const [confirmDelete, setConfirmDelete] = useState(null);

    // Modal cambio de estado
    const [pendingStatus, setPendingStatus] = useState(null); // { board, newStatus }
    const [statusProcessing, setStatusProcessing] = useState(false);
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpanded = (id) => {
        setExpandedId((prev) => (prev === id ? null : id));
    };

    /* ── Borrado ── */
    const handleDelete    = (board) => setConfirmDelete(board);
    const doDelete        = () => {
        if (!confirmDelete) return;
        router.delete(route("admin.second-hand.destroy", confirmDelete.id), {
            onFinish: () => setConfirmDelete(null),
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

    return (
        <Layout1>
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Flash */}
                {flash?.success && (
                    <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                        {flash.success}
                    </div>
                )}

                {/* Cabecera */}
                <div className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white">Gestión Segunda Mano</h1>
                        <p className="mt-0.5 text-xs text-slate-500">{boards.length} tablas registradas</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.get(route("admin.second-hand.create"))}
                        className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-orange-600"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nueva tabla
                    </button>
                </div>

                {/* Estadísticas */}
                <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "Disponibles", value: stats.available, icon: CheckCircle2, color: "text-emerald-400" },
                        { label: "Reservadas",  value: stats.reserved,  icon: Clock,        color: "text-amber-400"  },
                        { label: "Vendidas",    value: stats.sold,      icon: Archive,      color: "text-slate-400"  },
                        { label: "Ingresos",    value: fmt(stats.revenue), icon: TrendingUp, color: "text-cyan-400"  },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <Icon className={`mb-1.5 h-5 w-5 ${color}`} />
                            <p className="text-2xl font-extrabold text-white">{value}</p>
                            <p className="text-xs text-slate-500">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                        <Filter className="h-3.5 w-3.5" />
                        Filtros
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                        <div>
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
                                    className={`${FILTER_CONTROL} pl-9`}
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
                                className={FILTER_CONTROL}
                            >
                                <option value="" className="bg-slate-900">Todos</option>
                                <option value="available" className="bg-slate-900">Disponible</option>
                                <option value="reserved" className="bg-slate-900">Reservada</option>
                                <option value="sold" className="bg-slate-900">Vendida</option>
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
                                className={FILTER_CONTROL}
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
                                className={FILTER_CONTROL}
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
                                className={FILTER_CONTROL}
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
                                className={FILTER_CONTROL}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-medium text-slate-300 transition hover:bg-white/10"
                            >
                                <X className="h-3.5 w-3.5" />
                                Limpiar
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => applyFilters()}
                            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-5 text-sm font-bold text-white transition hover:bg-orange-600"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filtrar
                        </button>
                    </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="w-12 px-2 py-3" aria-label="Detalle" />
                                {["Tabla", "Medidas", "Estado", "Precios", "Margen", "Acciones"].map((h) => (
                                    <th key={h} className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {boards.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                                        {hasActiveFilters
                                            ? "No hay tablas que coincidan con los filtros aplicados."
                                            : "No hay tablas registradas aún."}
                                    </td>
                                </tr>
                            ) : (
                                boards.map((board) => (
                                    <BoardRow
                                        key={board.id}
                                        board={board}
                                        expanded={expandedId === board.id}
                                        onToggleExpand={toggleExpanded}
                                        onDelete={handleDelete}
                                        onRequestStatusChange={handleRequestStatusChange}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal confirmación borrado */}
            {confirmDelete && (
                <div className="fixed inset-0 z-[800] flex items-center justify-center bg-black/70 px-4">
                    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
                        <h2 className="text-base font-bold text-white">¿Eliminar tabla?</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Se eliminará permanentemente{" "}
                            <strong className="text-white">{confirmDelete.name}</strong> y sus imágenes.
                        </p>
                        <div className="mt-5 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setConfirmDelete(null)}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={doDelete}
                                className="flex-1 rounded-xl bg-rose-600 py-2 text-sm font-bold text-white hover:bg-rose-700"
                            >
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmación cambio de estado */}
            <ConfirmStatusModal
                pending={pendingStatus}
                onCancel={cancelStatusChange}
                onConfirm={confirmStatusChange}
                processing={statusProcessing}
            />
        </Layout1>
    );
}