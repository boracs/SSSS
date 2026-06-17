import React, { useState, useMemo } from "react";
import { Link, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import {
    Ruler,
    Droplets,
    Tag,
    Search,
    SlidersHorizontal,
    CheckCircle2,
    Clock,
    Archive,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});

function formatEur(cents) {
    return EUR.format(cents / 100);
}

function StatusBadge({ status, label }) {
    const cfg = {
        available: { icon: CheckCircle2, bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30" },
        reserved:  { icon: Clock,        bg: "bg-amber-500/20",   text: "text-amber-300",  border: "border-amber-500/30" },
        sold:      { icon: Archive,       bg: "bg-slate-500/20",   text: "text-slate-400",  border: "border-slate-500/30" },
    };
    const c = cfg[status] ?? cfg.available;
    const Icon = c.icon;
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${c.bg} ${c.text} ${c.border}`}>
            <Icon className="h-3 w-3" />
            {label}
        </span>
    );
}

function BoardCard({ board }) {
    const hasDiscount = board.discount_pct > 0;
    const isSold = board.status === "sold";

    return (
        <Link
            href={route("second-hand.show", board.id)}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(251,146,60,0.15)]"
        >
            {/* Imagen */}
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-800/60">
                {board.first_image ? (
                    <img
                        src={board.first_image}
                        alt={board.name}
                        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${isSold ? "opacity-60 grayscale" : ""}`}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <svg className="h-16 w-16 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                            <path d="M12 2C6 2 3 7 3 12s3 10 9 10 9-5 9-10S18 2 12 2z" />
                            <path d="M9 9l6 6M15 9l-6 6" />
                        </svg>
                    </div>
                )}

                {/* Badge de descuento */}
                {hasDiscount && !isSold && (
                    <div className="absolute left-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                        -{board.discount_pct}%
                    </div>
                )}

                {/* Overlay vendida */}
                {isSold && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                        <span className="rounded-xl border border-slate-400/30 bg-slate-900/80 px-3 py-1.5 text-xs font-bold tracking-wider text-slate-300 uppercase">
                            Vendida
                        </span>
                    </div>
                )}
            </div>

            {/* Cuerpo */}
            <div className="flex flex-1 flex-col p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex-1">
                        {board.brand && (
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                                {board.brand}
                            </p>
                        )}
                        <h3 className="text-sm font-bold leading-tight text-white line-clamp-2">
                            {board.name}
                        </h3>
                    </div>
                    <StatusBadge status={board.status} label={board.status_label} />
                </div>

                {/* Specs t뿯½cnicas */}
                <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <SpecPill icon={Ruler} label={`${board.height}' 뿯½ ${board.width}"`} />
                    <SpecPill icon={Ruler} label={`${board.thickness}"`} suffix="grosor" />
                    <SpecPill icon={Droplets} label={`${board.volume} L`} />
                </div>

                {/* Precio */}
                <div className="mt-auto">
                    {isSold ? (
                        <p className="text-xs text-slate-500">
                            Vendida{board.sold_at ? ` 뿯½ ${board.sold_at}` : ""}
                        </p>
                    ) : hasDiscount ? (
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg font-extrabold text-orange-400">
                                {formatEur(board.effective_price)}
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                                {formatEur(board.sale_price)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-lg font-extrabold text-cyan-300">
                            {formatEur(board.sale_price)}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

function SpecPill({ icon: Icon, label, suffix }) {
    return (
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Icon className="h-3 w-3 shrink-0 text-slate-500" />
            <span>{label}</span>
            {suffix && <span className="text-slate-500">({suffix})</span>}
        </div>
    );
}

// ─── Filtros ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
    { value: "all",       label: "Todas" },
    { value: "available", label: "Disponibles" },
    { value: "reserved",  label: "Reservadas" },
    { value: "sold",      label: "Vendidas" },
];

// ─── P뿯½gina principal ─────────────────────────────────────────────────────────

export default function SecondHandIndex({ boards }) {
    const [search, setSearch]         = useState("");
    const [statusFilter, setStatus]   = useState("all");

    const filtered = useMemo(() => {
        return boards.filter((b) => {
            const matchStatus = statusFilter === "all" || b.status === statusFilter;
            const q = search.toLowerCase();
            const matchSearch =
                !q ||
                b.name.toLowerCase().includes(q) ||
                (b.brand ?? "").toLowerCase().includes(q);
            return matchStatus && matchSearch;
        });
    }, [boards, search, statusFilter]);

    const availableCount = boards.filter((b) => b.status === "available").length;

    return (
        <Layout1>
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

                {/* Cabecera */}
                <div className="mb-8">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-400">
                        Segunda Mano 뿯½ San Sebastian Surf School
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                        Tablas de Segunda Mano
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Tablas revisadas y garantizadas por nuestra escuela. Equipo de calidad
                        a precios justos para todos los niveles.
                    </p>
                    {availableCount > 0 && (
                        <p className="mt-3 text-sm font-semibold text-emerald-400">
                            {availableCount} tabla{availableCount !== 1 ? "s" : ""} disponible{availableCount !== 1 ? "s" : ""}
                        </p>
                    )}
                </div>

                {/* Barra de filtros */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    {/* Buscador */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o marca…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    {/* Filtro estado */}
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-500" />
                        <div className="flex gap-1">
                            {STATUS_FILTERS.map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => setStatus(f.value)}
                                    className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        statusFilter === f.value
                                            ? "bg-orange-500 text-white"
                                            : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid de tablas */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Tag className="mb-3 h-10 w-10 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">
                            No hay tablas que coincidan con tu b뿯½squeda.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((board) => (
                            <BoardCard key={board.id} board={board} />
                        ))}
                    </div>
                )}

                {/* Leyenda */}
                <div className="mt-10 flex flex-wrap gap-4 rounded-2xl border border-white/5 bg-white/5 px-5 py-4">
                    <p className="w-full text-xs font-semibold uppercase tracking-wider text-slate-500">Leyenda</p>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Disponible — puedes comprar
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        Reservada — contacta con nosotros
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Archive className="h-3.5 w-3.5 text-slate-500" />
                        Vendida — historial
                    </div>
                </div>
            </div>
        </Layout1>
    );
}
