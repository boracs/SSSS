import React, { useEffect, useState, useMemo } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import {
    Package,
    Truck,
    ChevronLeft,
    ChevronRight,
    ShoppingBag,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import PageShell from "@/layouts/PageShell";
import PedidoDetailModal from "../components/PedidoDetailModal";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { whatsappUrlFromPhone } from "@/lib/whatsapp";

const FILTER_PRESETS = [
    { id: "all", label: "Todos", entregado: "" },
    { id: "pending_deliver", label: "Pend. entrega", entregado: "0" },
    { id: "delivered", label: "Entregados", entregado: "1" },
];

function statusAccent(pedido) {
    return pedido.entregado ? "border-l-emerald-500" : "border-l-rose-500";
}

function matchPreset(filtersState) {
    return FILTER_PRESETS.find((p) => p.entregado === filtersState.entregado);
}

function ToggleSwitch({ checked, onChange, label }) {
    return (
        <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-400">{label}</span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                onClick={onChange}
                className={`relative h-5 w-9 rounded-full transition-colors ${
                    checked ? "bg-emerald-500" : "bg-slate-600"
                }`}
            >
                <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        checked ? "left-[1.15rem]" : "left-0.5"
                    }`}
                />
            </button>
        </label>
    );
}

function StatPill({ label, value, icon: Icon, tone }) {
    const tones = {
        cyan: "text-cyan-300",
        indigo: "text-indigo-300",
        emerald: "text-emerald-300",
    };

    return (
        <div className="flex min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 sm:px-3 sm:py-2">
            <Icon className={`h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4 ${tones[tone] || "text-slate-400"}`} />
            <div className="min-w-0 leading-tight">
                <p className="truncate text-[9px] font-bold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                    {label}
                </p>
                <p className="text-sm font-extrabold text-white sm:text-base">{value}</p>
            </div>
        </div>
    );
}

function EntregadoConfirmModal({ pedido, onCancel, onConfirm, processing }) {
    useEffect(() => {
        if (!pedido) return undefined;
        const onKey = (e) => {
            if (e.key === "Escape" && !processing) onCancel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [pedido, onCancel, processing]);

    if (!pedido) return null;

    const nombre =
        [pedido.usuario?.nombre, pedido.usuario?.apellido].filter(Boolean).join(" ") || "Cliente";
    const markingDelivered = !pedido.entregado;
    const accent = markingDelivered ? "border-l-emerald-500" : "border-l-rose-500";
    const iconWrap = markingDelivered
        ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-300"
        : "border-rose-400/30 bg-rose-500/15 text-rose-300";
    const eyebrow = markingDelivered ? "text-emerald-300/90" : "text-rose-300/90";
    const confirmBtn = markingDelivered
        ? "bg-emerald-600 hover:bg-emerald-500"
        : "bg-rose-600 hover:bg-rose-500";

    return (
        <div
            className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entregado-confirm-title"
        >
            <button
                type="button"
                className="absolute inset-0"
                aria-label="Cancelar"
                onClick={processing ? undefined : onCancel}
            />
            <div
                className={`relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 border-l-[3px] bg-slate-900 p-5 shadow-2xl shadow-black/50 ${accent}`}
            >
                <div className="flex items-start gap-3">
                    <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${iconWrap}`}
                    >
                        {markingDelivered ? (
                            <CheckCircle2 className="h-5 w-5" />
                        ) : (
                            <AlertTriangle className="h-5 w-5" />
                        )}
                    </span>
                    <div className="min-w-0">
                        <p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${eyebrow}`}>
                            Confirmar cambio
                        </p>
                        <h2 id="entregado-confirm-title" className="mt-0.5 text-lg font-bold text-white">
                            {markingDelivered
                                ? "¿Marcar como entregado?"
                                : "¿Marcar como no entregado?"}
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            Pedido{" "}
                            <span className="font-semibold text-slate-200">#{pedido.id}</span> ·{" "}
                            <span className="font-semibold text-slate-200">{nombre}</span>
                            {markingDelivered
                                ? ". Se registrará como entregado al cliente."
                                : ". Volverá a pendiente de entrega."}
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 disabled:opacity-50 sm:flex-none"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold text-white transition disabled:opacity-50 sm:flex-none ${confirmBtn}`}
                    >
                        {processing
                            ? "Guardando…"
                            : markingDelivered
                              ? "Sí, entregado"
                              : "Sí, desmarcar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function PedidoCard({ pedido, onToggleEntregado, onOpenDetail }) {
    const nombre =
        [pedido.usuario?.nombre, pedido.usuario?.apellido].filter(Boolean).join(" ") || "Cliente";
    const telefono = pedido.usuario?.telefono || null;
    const waUrl = telefono ? whatsappUrlFromPhone(telefono) : null;
    const accent = statusAccent(pedido);

    return (
        <article
            className={`flex flex-col rounded-xl border border-white/10 border-l-[3px] bg-slate-900/80 p-3 shadow-md shadow-black/15 transition hover:border-cyan-500/25 ${accent}`}
        >
            <div className="flex items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-extrabold text-white">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">
                        Pedido
                    </span>{" "}
                    <span className="tabular-nums">#{pedido.id}</span>
                </p>
                <ToggleSwitch
                    label={pedido.entregado ? "Entregado" : "Sin entregar"}
                    checked={!!pedido.entregado}
                    onChange={() => onToggleEntregado(pedido)}
                />
            </div>

            <div className="mt-2 flex min-w-0 items-center gap-1.5 text-sm text-slate-200">
                <span className="truncate font-semibold text-slate-100">{nombre}</span>
                {telefono ? (
                    <span className="shrink-0 tabular-nums text-slate-500">· {telefono}</span>
                ) : null}
                {waUrl ? (
                    <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500"
                        aria-label={`WhatsApp a ${nombre}`}
                        title="WhatsApp"
                    >
                        <WhatsAppIcon className="h-3 w-3" />
                    </a>
                ) : null}
                <button
                    type="button"
                    onClick={() => onOpenDetail(pedido)}
                    className="ml-auto mt-0.5 shrink-0 self-end text-xs font-semibold text-cyan-300 transition hover:text-cyan-200"
                >
                    Ver
                </button>
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
        entregado: filters.entregado ?? "",
    });
    const [detailPedidoId, setDetailPedidoId] = useState(null);
    const [confirmEntregaPedido, setConfirmEntregaPedido] = useState(null);
    const [entregaProcessing, setEntregaProcessing] = useState(false);

    useEffect(() => {
        setFiltersState({
            entregado: filters.entregado ?? "",
        });
    }, [filters.entregado]);

    const pedidos = Array.isArray(pedidosProp)
        ? pedidosProp
        : Array.isArray(pedidosProp?.data)
          ? pedidosProp.data
          : [];

    const detailPedido = useMemo(() => {
        if (!detailPedidoId) return null;
        return pedidos.find((p) => p.id === detailPedidoId) ?? null;
    }, [pedidos, detailPedidoId]);

    const activePreset = matchPreset(filtersState);

    const openPedidoDetail = (pedido) => setDetailPedidoId(pedido.id);
    const closePedidoDetail = () => setDetailPedidoId(null);

    const quickFilter = (patch) => {
        const next = { ...filtersState, ...patch };
        setFiltersState(next);
        const payload = {};
        if (next.entregado !== "") payload.entregado = next.entregado;
        router.get(
            route("gestor.pedidos.filtrar"),
            { ...payload, page: 1 },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => setDetailPedidoId(null),
            },
        );
    };

    const loadPage = (page) => {
        if (page < 1 || page > lastPage) return;
        router.get(
            route("gestor.pedidos.filtrar"),
            { ...filtersState, page },
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => setDetailPedidoId(null),
            },
        );
    };

    const requestToggleEntregado = (pedido) => {
        if (!pedido?.id) return;
        setConfirmEntregaPedido(pedido);
    };

    const confirmToggleEntregado = () => {
        if (!confirmEntregaPedido?.id || entregaProcessing) return;
        setEntregaProcessing(true);
        router.patch(
            route("pedido.toggleEntregado", confirmEntregaPedido.id),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                onFinish: () => {
                    setEntregaProcessing(false);
                    setConfirmEntregaPedido(null);
                },
            },
        );
    };

    return (
        <PageShell variant="light">
            <Head title="Gestor de pedidos" />

            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#071326] to-slate-950 px-2 py-4 sm:px-6 sm:py-6">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                                Admin · Tienda S4
                            </p>
                            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                                Gestor de pedidos
                            </h1>
                        </div>
                        <p className="text-xs text-slate-400">
                            <span className="font-bold text-white">{totalPedidos}</span> pedido
                            {totalPedidos === 1 ? "" : "s"}
                            {filtersState.entregado !== "" ? " · filtrados" : ""}
                        </p>
                    </div>

                    {flash?.success ? (
                        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                            {flash.success}
                        </div>
                    ) : null}

                    <div className="mb-3 grid grid-cols-3 gap-1.5 sm:gap-2">
                        <StatPill
                            label="Total"
                            value={stats.total ?? totalPedidos}
                            icon={ShoppingBag}
                            tone="cyan"
                        />
                        <StatPill
                            label="Pend. entrega"
                            value={stats.pendientes_entrega ?? "—"}
                            icon={Truck}
                            tone="indigo"
                        />
                        <StatPill
                            label="Entregados"
                            value={stats.entregados ?? "—"}
                            icon={CheckCircle2}
                            tone="emerald"
                        />
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1.5">
                        {FILTER_PRESETS.map((preset) => {
                            const isActive = activePreset?.id === preset.id;
                            return (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => quickFilter({ entregado: preset.entregado })}
                                    className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition sm:text-xs ${
                                        isActive
                                            ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/30"
                                            : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
                                    }`}
                                >
                                    {preset.label}
                                </button>
                            );
                        })}
                    </div>

                    {pedidos.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-12 text-center">
                            <Package className="mx-auto h-8 w-8 text-slate-500" />
                            <p className="mt-3 text-base font-semibold text-slate-200">No hay pedidos</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Prueba otro filtro o espera nuevas compras.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                            {pedidos.map((pedido) => (
                                <PedidoCard
                                    key={pedido.id}
                                    pedido={pedido}
                                    onOpenDetail={openPedidoDetail}
                                    onToggleEntregado={requestToggleEntregado}
                                />
                            ))}
                        </div>
                    )}

                    {lastPage > 1 ? (
                        <div className="mt-4 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => loadPage(currentPage - 1)}
                                disabled={currentPage <= 1}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label="Página anterior"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-xs font-medium text-slate-300">
                                <span className="font-bold text-white">{currentPage}</span> /{" "}
                                <span className="font-bold text-white">{lastPage}</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => loadPage(currentPage + 1)}
                                disabled={currentPage >= lastPage}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
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
                onToggleEntregado={() => {
                    if (detailPedido) requestToggleEntregado(detailPedido);
                }}
            />

            <EntregadoConfirmModal
                pedido={confirmEntregaPedido}
                processing={entregaProcessing}
                onCancel={() => {
                    if (!entregaProcessing) setConfirmEntregaPedido(null);
                }}
                onConfirm={confirmToggleEntregado}
            />
        </PageShell>
    );
}
