import React, { useEffect, useState, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import {
    Package,
    CreditCard,
    Truck,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    Filter,
    User,
    Phone,
    Mail,
    ExternalLink,
    ShoppingBag,
    FileCheck2,
    ImageOff,
    AlertTriangle,
    CheckCircle2,
    Clock,
} from "lucide-react";
import Layout1 from "../layouts/Layout1";
import PedidoDetailModal from "../components/PedidoDetailModal";
import { formatEur } from "@/utils/money";

const formatDate = (value, compact = false) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString("es-ES", compact
        ? { day: "numeric", month: "short" }
        : { day: "numeric", month: "short", year: "numeric" });
};

const formatDateTime = (value) => {
    if (!value) return null;
    return new Date(value).toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const paymentLabel = (method) => {
    if (!method) return "No especificado";
    const map = { bizum: "Bizum", transferencia: "Transferencia" };
    return map[method] ?? method;
};

const FILTER_PRESETS = [
    { id: "all", label: "Todos", pagado: "", entregado: "" },
    { id: "complete", label: "Completos", pagado: "1", entregado: "1" },
    { id: "pending_pay", label: "Pago pendiente", pagado: "0", entregado: "" },
    { id: "pending_deliver", label: "Pend. entrega", pagado: "1", entregado: "0" },
    { id: "delivered_unpaid", label: "Entreg. sin pago", pagado: "0", entregado: "1", alert: true },
];

function isEntregadoSinPagar(pedido) {
    return Boolean(pedido.entregado) && !pedido.pagado;
}

function statusAccent(pedido) {
    if (isEntregadoSinPagar(pedido)) return "border-l-rose-500 ring-1 ring-rose-500/25";
    if (pedido.pagado && pedido.entregado) return "border-l-emerald-500";
    if (!pedido.pagado && !pedido.entregado) return "border-l-amber-500";
    if (pedido.pagado && !pedido.entregado) return "border-l-cyan-500";
    return "border-l-slate-600";
}

function matchPreset(filtersState) {
    return FILTER_PRESETS.find(
        (p) => p.pagado === filtersState.pagado && p.entregado === filtersState.entregado
    );
}

function StatusBadge({ active, activeLabel, inactiveLabel, tone = "emerald", compact = false }) {
    const activeCls =
        tone === "cyan"
            ? "bg-cyan-500/15 text-cyan-200 ring-cyan-400/30"
            : "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30";
    const inactiveCls = "bg-rose-500/10 text-rose-200 ring-rose-400/25";

    return (
        <span
            className={`inline-flex items-center rounded-full font-semibold ring-1 ${
                compact ? "px-1.5 py-0.5 text-[9px]" : "px-2.5 py-1 text-[11px]"
            } ${active ? activeCls : inactiveCls}`}
        >
            {active ? activeLabel : inactiveLabel}
        </span>
    );
}

function StatusDot({ active, label, tone = "emerald" }) {
    const activeCls = tone === "cyan" ? "bg-cyan-400" : "bg-emerald-400";
    return (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <span className={`h-1.5 w-1.5 rounded-full ${active ? activeCls : "bg-rose-400/80"}`} />
            {label}
        </span>
    );
}

function ToggleSwitch({ checked, onChange, disabled, label, icon: Icon, compact = false }) {
    return (
        <label
            className={`inline-flex items-center ${compact ? "gap-1" : "gap-2"} ${
                disabled ? "opacity-50" : "cursor-pointer"
            }`}
        >
            {Icon ? (
                <Icon className={`shrink-0 text-slate-500 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} aria-hidden />
            ) : (
                <span className={`font-medium text-slate-400 ${compact ? "text-[10px]" : "text-xs"}`}>{label}</span>
            )}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={disabled}
                onClick={() => !disabled && onChange()}
                className={`relative rounded-full transition-colors ${
                    compact ? "h-5 w-9" : "h-6 w-11"
                } ${checked ? "bg-emerald-500" : "bg-slate-600"}`}
            >
                <span
                    className={`absolute rounded-full bg-white shadow transition-transform ${
                        compact ? "top-0.5 h-4 w-4" : "top-0.5 h-5 w-5"
                    } ${checked ? (compact ? "left-[1.15rem]" : "left-[1.35rem]") : "left-0.5"}`}
                />
            </button>
        </label>
    );
}

function StatCard({ label, value, icon: Icon, accent, alert = false }) {
    return (
        <div
            className={`rounded-xl border p-2.5 backdrop-blur-sm sm:rounded-2xl sm:p-4 ${
                alert
                    ? "border-rose-500/40 bg-rose-500/10"
                    : "border-white/10 bg-white/5"
            }`}
        >
            <div className="flex items-center justify-between gap-2 sm:items-start sm:gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:text-[11px]">
                        {label}
                    </p>
                    <p
                        className={`mt-0.5 text-lg font-extrabold sm:mt-1 sm:text-2xl ${
                            alert ? "text-rose-200" : "text-white"
                        }`}
                    >
                        {value}
                    </p>
                </div>
                <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 sm:rounded-xl ${accent}`}
                >
                    <Icon className="h-4 w-4 text-white sm:h-5 sm:w-5" />
                </div>
            </div>
        </div>
    );
}

function ProductThumbMini({ src, alt }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 text-slate-500">
                <ImageOff className="h-3.5 w-3.5" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-9 w-9 shrink-0 rounded-md border border-white/10 object-cover"
        />
    );
}

function PedidoMobileDetail({ pedido, onOpenDetail }) {
    const productos = pedido.productos || [];
    const justificante = formatDateTime(pedido.proof_uploaded_at);

    return (
        <div className="border-t border-white/10 bg-white/[0.03] px-2.5 py-2">
            <div className="mb-2 grid grid-cols-2 gap-1.5 text-[10px]">
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                    <p className="text-slate-500">Pago</p>
                    <p className="font-semibold text-slate-200">{paymentLabel(pedido.payment_method)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                    <p className="text-slate-500">Justificante</p>
                    <p className="font-semibold text-slate-200">
                        {justificante ? justificante : "Pendiente"}
                    </p>
                </div>
            </div>

            {pedido.usuario?.email ? (
                <p className="mb-2 flex items-center gap-1 truncate text-[10px] text-slate-400">
                    <Mail className="h-3 w-3 shrink-0 text-cyan-400" />
                    {pedido.usuario.email}
                </p>
            ) : null}

            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Package className="h-3 w-3" />
                Productos ({productos.length})
            </p>

            <ul className="space-y-1.5">
                {productos.map((producto) => (
                    <li
                        key={producto.id}
                        className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-950/40 px-2 py-1.5"
                    >
                        <ProductThumbMini src={producto.imagen} alt={producto.nombre} />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-slate-200">{producto.nombre}</p>
                            <p className="text-[10px] text-slate-500">
                                {producto.cantidad} × {formatEur(producto.precio_pagado)}
                                {producto.descuento_aplicado > 0 ? (
                                    <span className="ml-1 text-amber-400/90">
                                        (-{parseInt(producto.descuento_aplicado, 10)}%)
                                    </span>
                                ) : null}
                            </p>
                        </div>
                        <p className="shrink-0 text-[11px] font-bold text-emerald-300">
                            {formatEur(producto.subtotal)}
                        </p>
                    </li>
                ))}
            </ul>

            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <span className="text-[10px] font-semibold text-slate-400">Total pedido</span>
                <span className="text-sm font-extrabold text-white">{formatEur(pedido.precio_total)}</span>
            </div>

            <button
                type="button"
                onClick={() => onOpenDetail(pedido)}
                className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-cyan-500/20 bg-cyan-500/10 py-1.5 text-[10px] font-semibold text-cyan-300 transition hover:bg-cyan-500/15"
            >
                <FileCheck2 className="h-3 w-3" />
                Ver detalle completo
            </button>
        </div>
    );
}

function FilterPanel({ filtersState, setFiltersState, onPreset, onApply }) {
    const activePreset = matchPreset(filtersState);

    return (
        <div className="mb-3 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-[#0a1628] to-slate-950/95 shadow-lg shadow-black/20 sm:mb-8 sm:rounded-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2.5 sm:px-4 sm:py-3">
                <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400">
                        <Filter className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-sm font-semibold text-slate-100">Filtrar pedidos</p>
                        <p className="text-[10px] text-slate-500 sm:text-xs">
                            {activePreset ? activePreset.label : "Combinación personalizada"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 p-2.5 sm:gap-2 sm:p-4">
                {FILTER_PRESETS.map((preset) => {
                    const isActive = activePreset?.id === preset.id;

                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onPreset({ pagado: preset.pagado, entregado: preset.entregado })}
                            className={`rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition sm:px-3 sm:py-2 sm:text-xs ${
                                isActive
                                    ? preset.alert
                                        ? "bg-rose-600 text-white shadow-sm shadow-rose-900/40"
                                        : "bg-cyan-600 text-white shadow-sm shadow-cyan-900/30"
                                    : preset.alert
                                      ? "border border-rose-500/35 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15"
                                      : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                            }`}
                        >
                            {preset.alert ? (
                                <span className="inline-flex items-center gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {preset.label}
                                </span>
                            ) : (
                                preset.label
                            )}
                        </button>
                    );
                })}
            </div>

            <form
                onSubmit={onApply}
                className="grid grid-cols-2 gap-2 border-t border-white/10 bg-white/[0.02] px-2.5 py-2.5 sm:flex sm:flex-wrap sm:items-end sm:gap-3 sm:px-4 sm:py-3"
            >
                <p className="col-span-2 w-full text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
                    Ajuste fino
                </p>
                <div className="min-w-0 sm:flex-1 sm:max-w-[160px]">
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-400 sm:text-xs">Pagado</label>
                    <select
                        name="pagado"
                        value={filtersState.pagado}
                        onChange={(e) => setFiltersState((s) => ({ ...s, pagado: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:py-2 sm:text-sm"
                    >
                        <option value="">Todos</option>
                        <option value="1">Sí</option>
                        <option value="0">No</option>
                    </select>
                </div>
                <div className="min-w-0 sm:flex-1 sm:max-w-[160px]">
                    <label className="mb-0.5 block text-[10px] font-medium text-slate-400 sm:text-xs">
                        Entregado
                    </label>
                    <select
                        name="entregado"
                        value={filtersState.entregado}
                        onChange={(e) => setFiltersState((s) => ({ ...s, entregado: e.target.value }))}
                        className="w-full rounded-lg border border-white/10 bg-slate-950 px-2 py-1.5 text-xs text-white focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 sm:py-2 sm:text-sm"
                    >
                        <option value="">Todos</option>
                        <option value="1">Sí</option>
                        <option value="0">No</option>
                    </select>
                </div>
                <button
                    type="submit"
                    className="col-span-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-950/30 transition hover:brightness-110 sm:col-span-1 sm:px-5 sm:text-sm"
                >
                    Aplicar
                </button>
            </form>
        </div>
    );
}

function PedidoCard({
    pedido,
    expanded = false,
    onToggleExpand,
    onTogglePagado,
    onToggleEntregado,
    onOpenDetail,
}) {
    const nombre = [pedido.usuario?.nombre, pedido.usuario?.apellido].filter(Boolean).join(" ") || "Cliente";
    const preview = pedido.productos_preview?.length
        ? pedido.productos_preview.join(" · ")
        : "Sin productos";
    const articulos = pedido.total_articulos ?? 0;
    const accent = statusAccent(pedido);

    return (
        <article
            className={`flex flex-col overflow-hidden rounded-xl border border-white/10 border-l-[3px] bg-slate-900/80 shadow-md shadow-black/20 backdrop-blur-sm transition hover:border-cyan-500/25 sm:rounded-2xl sm:border-l-4 sm:shadow-lg ${accent}`}
        >
            {/* ── Móvil: fila densa + acordeón ── */}
            <div className="sm:hidden">
                <button
                    type="button"
                    onClick={onToggleExpand}
                    aria-expanded={expanded}
                    aria-controls={`pedido-detail-${pedido.id}`}
                    className="flex w-full items-start gap-2 px-2.5 py-2 text-left transition hover:bg-white/[0.03]"
                >
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-xs font-extrabold text-white">#{pedido.id}</span>
                            <span className="text-sm font-extrabold text-emerald-300">
                                {formatEur(pedido.precio_total)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                                {formatDate(pedido.created_at, true)} · {articulos} art.
                            </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <StatusDot active={pedido.pagado} label={pedido.pagado ? "Pagado" : "Pago pend."} />
                            <StatusDot
                                active={pedido.entregado}
                                label={pedido.entregado ? "Entregado" : "Sin entregar"}
                                tone="cyan"
                            />
                        </div>
                        <p className="mt-1 flex items-center gap-1 truncate text-[11px] font-semibold text-slate-200">
                            <User className="h-3 w-3 shrink-0 text-cyan-400" />
                            {nombre}
                            {pedido.usuario?.telefono ? (
                                <span className="truncate font-normal text-slate-500">
                                    · {pedido.usuario.telefono}
                                </span>
                            ) : null}
                        </p>
                        {!expanded ? (
                            <p className="mt-0.5 line-clamp-1 text-[10px] leading-snug text-slate-500">{preview}</p>
                        ) : null}
                    </div>
                    <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                            expanded
                                ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                                : "border-white/10 bg-white/5 text-slate-400"
                        }`}
                        aria-hidden
                    >
                        <ChevronDown
                            className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                        />
                    </span>
                </button>

                {expanded ? (
                    <div id={`pedido-detail-${pedido.id}`}>
                        <PedidoMobileDetail pedido={pedido} onOpenDetail={onOpenDetail} />
                    </div>
                ) : null}

                <div className="flex items-center justify-between gap-2 border-t border-white/10 bg-white/[0.02] px-2.5 py-1.5">
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <ToggleSwitch
                            label="Pagado"
                            icon={CreditCard}
                            compact
                            checked={!!pedido.pagado}
                            onChange={() => onTogglePagado(pedido.id)}
                        />
                        <ToggleSwitch
                            label="Entregado"
                            icon={Truck}
                            compact
                            checked={!!pedido.entregado}
                            onChange={() => onToggleEntregado(pedido.id)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={onToggleExpand}
                        className="text-[10px] font-semibold text-cyan-400/90"
                    >
                        {expanded ? "Ocultar" : "Resumen"}
                    </button>
                </div>
            </div>

            {/* ── Desktop: tarjeta completa ── */}
            <div className="hidden sm:flex sm:flex-col sm:flex-1">
                <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300/80">Pedido</p>
                        <p className="text-lg font-extrabold text-white">#{pedido.id}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                        <StatusBadge
                            active={pedido.pagado}
                            activeLabel="Pagado"
                            inactiveLabel="Pendiente pago"
                        />
                        <StatusBadge
                            active={pedido.entregado}
                            activeLabel="Entregado"
                            inactiveLabel="Sin entregar"
                            tone="cyan"
                        />
                    </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 px-5 py-4">
                    <div className="flex items-end justify-between gap-3">
                        <div>
                            <p className="text-xs text-slate-500">Total</p>
                            <p className="text-2xl font-extrabold text-white">{formatEur(pedido.precio_total)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500">{formatDate(pedido.created_at)}</p>
                            <p className="mt-0.5 text-xs font-medium text-slate-400">
                                {articulos} artículo{articulos === 1 ? "" : "s"}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                            <User className="h-4 w-4 shrink-0 text-cyan-400" />
                            {nombre}
                        </div>
                        {pedido.usuario?.telefono ? (
                            <p className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                                <Phone className="h-3.5 w-3.5" />
                                {pedido.usuario.telefono}
                            </p>
                        ) : null}
                        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{preview}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
                    <div className="flex flex-wrap gap-4">
                        <ToggleSwitch
                            label="Pagado"
                            checked={!!pedido.pagado}
                            onChange={() => onTogglePagado(pedido.id)}
                        />
                        <ToggleSwitch
                            label="Entregado"
                            checked={!!pedido.entregado}
                            onChange={() => onToggleEntregado(pedido.id)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => onOpenDetail(pedido)}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                    >
                        Ver detalle
                        <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </article>
    );
}

export default function GestorPedidos({
    pedidos: pedidosProp = [],
    totalPedidos = 0,
    filters = {},
    currentPage = 1,
    lastPage = 1,
    stats = {},
}) {
    const { flash } = usePage().props;
    const [filtersState, setFiltersState] = useState({
        pagado: filters.pagado ?? "",
        entregado: filters.entregado ?? "",
    });
    const [expandedPedidoId, setExpandedPedidoId] = useState(null);
    const [detailPedidoId, setDetailPedidoId] = useState(null);

    useEffect(() => {
        setFiltersState({
            pagado: filters.pagado ?? "",
            entregado: filters.entregado ?? "",
        });
    }, [filters.pagado, filters.entregado]);

    const togglePedidoExpand = (id) => {
        setExpandedPedidoId((prev) => (prev === id ? null : id));
    };

    const pedidos = Array.isArray(pedidosProp)
        ? pedidosProp
        : Array.isArray(pedidosProp?.data)
          ? pedidosProp.data
          : [];

    const detailPedido = useMemo(() => {
        if (!detailPedidoId) return null;
        return pedidos.find((p) => p.id === detailPedidoId) ?? null;
    }, [pedidos, detailPedidoId]);

    const openPedidoDetail = (pedido) => setDetailPedidoId(pedido.id);
    const closePedidoDetail = () => setDetailPedidoId(null);

    const applyFilters = (e) => {
        e.preventDefault();
        const payload = {};
        if (filtersState.pagado !== "") payload.pagado = filtersState.pagado;
        if (filtersState.entregado !== "") payload.entregado = filtersState.entregado;

        router.get(route("gestor.pedidos.filtrar"), { ...payload, page: 1 }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setExpandedPedidoId(null);
                setDetailPedidoId(null);
            },
        });
    };

    const quickFilter = (patch) => {
        const next = { ...filtersState, ...patch };
        setFiltersState(next);
        const payload = {};
        if (next.pagado !== "") payload.pagado = next.pagado;
        if (next.entregado !== "") payload.entregado = next.entregado;
        router.get(route("gestor.pedidos.filtrar"), { ...payload, page: 1 }, {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                setExpandedPedidoId(null);
                setDetailPedidoId(null);
            },
        });
    };

    const loadPage = (page) => {
        if (page < 1 || page > lastPage) return;
        router.get(
            route("gestor.pedidos.filtrar"),
            { ...filtersState, page },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => setExpandedPedidoId(null),
            },
        );
    };

    const patchToggle = (url) => {
        router.patch(url, {}, { preserveState: true, preserveScroll: true });
    };

    const entregadosSinPagar = stats.entregados_sin_pagar ?? 0;

    return (
        <Layout1>
            <Head title="Gestor de pedidos" />

            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#071326] to-slate-950 px-2 py-4 sm:px-6 sm:py-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-4 flex flex-col gap-2 sm:mb-8 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400 sm:text-xs">
                                Admin · Tienda S4
                            </p>
                            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-white sm:mt-1 sm:text-3xl">
                                Gestor de pedidos
                            </h1>
                            <p className="mt-1 hidden max-w-xl text-sm text-slate-400 sm:block">
                                Control de pagos, entregas y seguimiento de compras de socios.
                            </p>
                        </div>
                        <p className="text-xs text-slate-400 sm:text-sm">
                            <span className="font-bold text-white">{totalPedidos}</span> pedido
                            {totalPedidos === 1 ? "" : "s"}
                            {filtersState.pagado !== "" || filtersState.entregado !== "" ? " · filtrados" : ""}
                        </p>
                    </div>

                    {flash?.success ? (
                        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 sm:mb-6 sm:rounded-xl sm:px-4 sm:py-3 sm:text-sm">
                            {flash.success}
                        </div>
                    ) : null}

                    <div className="mb-3 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3 sm:grid-cols-3 lg:grid-cols-5">
                        <StatCard
                            label="Total"
                            value={stats.total ?? totalPedidos}
                            icon={ShoppingBag}
                            accent="bg-cyan-600/80"
                        />
                        <StatCard
                            label="Completos"
                            value={stats.completos ?? "—"}
                            icon={CheckCircle2}
                            accent="bg-emerald-600/80"
                        />
                        <StatCard
                            label="Pend. pago"
                            value={stats.pendientes_pago ?? "—"}
                            icon={Clock}
                            accent="bg-amber-600/80"
                        />
                        <StatCard
                            label="Pend. entrega"
                            value={stats.pendientes_entrega ?? "—"}
                            icon={Truck}
                            accent="bg-indigo-600/80"
                        />
                        <button
                            type="button"
                            onClick={() => quickFilter({ pagado: "0", entregado: "1" })}
                            className="col-span-2 text-left sm:col-span-1"
                        >
                            <StatCard
                                label="Entreg. sin pago"
                                value={entregadosSinPagar}
                                icon={AlertTriangle}
                                accent="bg-rose-600/90"
                                alert
                            />
                        </button>
                    </div>

                    {entregadosSinPagar > 0 ? (
                        <button
                            type="button"
                            onClick={() => quickFilter({ pagado: "0", entregado: "1" })}
                            className="mb-3 flex w-full items-start gap-2 rounded-xl border border-rose-500/35 bg-rose-500/10 px-3 py-2.5 text-left transition hover:bg-rose-500/15 sm:mb-6 sm:items-center sm:gap-3 sm:px-4 sm:py-3"
                        >
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300 sm:mt-0" />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-rose-100 sm:text-sm">
                                    {entregadosSinPagar} pedido{entregadosSinPagar === 1 ? "" : "s"} entregado
                                    {entregadosSinPagar === 1 ? "" : "s"} sin cobrar
                                </p>
                                <p className="text-[10px] text-rose-200/80 sm:text-xs">
                                    Socios de confianza — revisa y marca como pagado cuando llegue el ingreso.
                                </p>
                            </div>
                            <span className="shrink-0 text-[10px] font-semibold text-rose-300 sm:text-xs">
                                Ver →
                            </span>
                        </button>
                    ) : null}

                    <FilterPanel
                        filtersState={filtersState}
                        setFiltersState={setFiltersState}
                        onPreset={quickFilter}
                        onApply={applyFilters}
                    />

                    {pedidos.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-12 text-center sm:rounded-2xl sm:px-6 sm:py-16">
                            <Package className="mx-auto h-8 w-8 text-slate-500 sm:h-10 sm:w-10" />
                            <p className="mt-3 text-base font-semibold text-slate-200 sm:mt-4 sm:text-lg">
                                No hay pedidos
                            </p>
                            <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                Prueba otro filtro o espera nuevas compras.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {pedidos.map((pedido) => (
                                <PedidoCard
                                    key={pedido.id}
                                    pedido={pedido}
                                    expanded={expandedPedidoId === pedido.id}
                                    onToggleExpand={() => togglePedidoExpand(pedido.id)}
                                    onOpenDetail={openPedidoDetail}
                                    onTogglePagado={(id) => patchToggle(route("pedido.togglePagado", id))}
                                    onToggleEntregado={(id) => patchToggle(route("pedido.toggleEntregado", id))}
                                />
                            ))}
                        </div>
                    )}

                    {lastPage > 1 ? (
                        <div className="mt-6 flex items-center justify-center gap-3 sm:mt-10 sm:gap-4">
                            <button
                                type="button"
                                onClick={() => loadPage(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 sm:rounded-xl"
                                aria-label="Página anterior"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-xs font-medium text-slate-300 sm:text-sm">
                                <span className="font-bold text-white">{currentPage}</span> /{" "}
                                <span className="font-bold text-white">{lastPage}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => loadPage(currentPage + 1)}
                                disabled={currentPage >= lastPage}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10 sm:rounded-xl"
                                aria-label="Página siguiente"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>

            <PedidoDetailModal
                open={Boolean(detailPedido)}
                pedido={detailPedido}
                onClose={closePedidoDetail}
                onTogglePagado={(id) => patchToggle(route("pedido.togglePagado", id))}
                onToggleEntregado={(id) => patchToggle(route("pedido.toggleEntregado", id))}
            />
        </Layout1>
    );
}
