import React, { useEffect, useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import {
    Gavel,
    Search,
    Clock,
    Sparkles,
    TrendingUp,
    Users,
    ArrowUpRight,
    Radio,
} from "lucide-react";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmt = (cents) => EUR.format(Number(cents || 0) / 100);

const STATUS = {
    live: {
        label: "En curso",
        ring: "ring-emerald-400/30",
        badge: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
        dot: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.6)]",
    },
    ended: {
        label: "Finalizada",
        ring: "ring-amber-400/20",
        badge: "border-amber-400/30 bg-amber-500/10 text-amber-100",
        dot: "bg-amber-400",
    },
    settled: {
        label: "Adjudicada",
        ring: "ring-cyan-400/25",
        badge: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
        dot: "bg-cyan-400",
    },
};

function useTimeLeft(endsAt, active) {
    const [label, setLabel] = useState(null);

    useEffect(() => {
        if (!endsAt || !active) {
            setLabel(null);
            return undefined;
        }
        const tick = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (diff <= 0) {
                setLabel("Finalizada");
                return;
            }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            if (d > 0) setLabel(`${d}d ${h}h`);
            else if (h > 0) setLabel(`${h}h ${m}m`);
            else setLabel(`${m} min`);
        };
        tick();
        const id = setInterval(tick, 30000);
        return () => clearInterval(id);
    }, [endsAt, active]);

    return label;
}

function AuctionCard({ auction }) {
    const cfg = STATUS[auction.status] ?? STATUS.ended;
    const remaining = useTimeLeft(auction.ends_at, auction.status === "live");
    const isLive = auction.status === "live";

    return (
        <Link
            href={route("auctions.show", auction.slug)}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] shadow-[0_4px_24px_rgba(0,0,0,0.25)] ring-1 ring-inset ring-white/5 backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-orange-400/30 hover:shadow-[0_12px_40px_rgba(251,146,60,0.12)] ${cfg.ring}`}
        >
            <div className="relative aspect-[5/4] overflow-hidden bg-slate-900/80">
                {auction.first_image ? (
                    <>
                        <img
                            src={auction.first_image}
                            alt={auction.title}
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
                            loading="lazy"
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    </>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-800/80 to-slate-900">
                        <Gavel className="h-12 w-12 text-slate-600/80" strokeWidth={1.25} />
                        <span className="text-[10px] font-medium uppercase tracking-widest text-slate-600">Sin imagen</span>
                    </div>
                )}

                <div className="absolute left-3 right-3 top-3 flex items-start justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur-md ${cfg.badge}`}>
                        {isLive ? (
                            <span className={`relative flex h-2 w-2 ${cfg.dot} rounded-full`}>
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            </span>
                        ) : (
                            <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        )}
                        {auction.status_label}
                    </span>
                    {remaining && isLive ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-semibold text-amber-100 backdrop-blur-md">
                            <Clock className="h-3 w-3" />
                            {remaining}
                        </span>
                    ) : null}
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300/90">
                        {auction.category_label}
                    </p>
                    <h2 className="mt-0.5 line-clamp-2 text-base font-bold leading-snug text-white drop-shadow-sm">
                        {auction.title}
                    </h2>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3.5">
                <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-500">Puja líder</p>
                    <p className="text-xl font-extrabold tabular-nums tracking-tight text-white">
                        {fmt(auction.current_price_cents)}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Users className="h-3.5 w-3.5" />
                        {auction.bid_count} {auction.bid_count === 1 ? "puja" : "pujas"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300/90 opacity-0 transition group-hover:opacity-100">
                        Ver lote
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                </div>
            </div>
        </Link>
    );
}

function StatChip({ icon: Icon, label, value, accent }) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 backdrop-blur-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
                <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                <p className="text-lg font-bold tabular-nums text-white">{value}</p>
            </div>
        </div>
    );
}

export default function AuctionsIndex({ auctions = [] }) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("all");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return auctions.filter((a) => {
            if (status !== "all" && a.status !== status) return false;
            if (!q) return true;
            return (
                String(a.title || "").toLowerCase().includes(q) ||
                String(a.category_label || "").toLowerCase().includes(q)
            );
        });
    }, [auctions, query, status]);

    const liveCount = auctions.filter((a) => a.status === "live").length;
    const totalBids = auctions.reduce((sum, a) => sum + Number(a.bid_count || 0), 0);

    const filters = [
        { id: "all", label: "Todas", count: auctions.length },
        { id: "live", label: "En curso", count: liveCount },
        { id: "ended", label: "Finalizadas" },
        { id: "settled", label: "Adjudicadas" },
    ];

    return (
        <Layout1>
            <Head title="Subastas S4" />
            <div className="relative min-h-screen overflow-hidden bg-[#070b14]">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(251,146,60,0.14),transparent)]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute -right-32 top-40 h-96 w-96 rounded-full bg-cyan-500/[0.04] blur-3xl"
                />

                <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
                    {/* Hero */}
                    <header className="mb-10">
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-500/[0.08] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-200/90">
                            <Sparkles className="h-3.5 w-3.5" />
                            Club exclusivo S4
                        </div>
                        <h1 className="max-w-3xl text-3xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl">
                            Subastas de{" "}
                            <span className="bg-gradient-to-r from-orange-200 via-amber-200 to-orange-400 bg-clip-text text-transparent">
                                material premium
                            </span>
                        </h1>
                        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
                            Lotes seleccionados para socios VIP y taquilla. Puja en tiempo real y paga de forma segura al ganar.
                        </p>

                        <div className="mt-8 grid gap-3 sm:grid-cols-3">
                            <StatChip
                                icon={Radio}
                                label="Activas ahora"
                                value={liveCount}
                                accent="bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
                            />
                            <StatChip
                                icon={Gavel}
                                label="Lotes publicados"
                                value={auctions.length}
                                accent="bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/20"
                            />
                            <StatChip
                                icon={TrendingUp}
                                label="Pujas totales"
                                value={totalBids}
                                accent="bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/20"
                            />
                        </div>
                    </header>

                    {/* Toolbar */}
                    <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap gap-2">
                            {filters.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    onClick={() => setStatus(f.id)}
                                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                                        status === f.id
                                            ? "bg-white text-slate-900 shadow-lg shadow-white/10"
                                            : "border border-white/10 text-slate-400 hover:border-white/20 hover:text-white"
                                    }`}
                                >
                                    {f.label}
                                    {f.count != null ? ` · ${f.count}` : ""}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full sm:max-w-xs">
                            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <input
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar por título o categoría…"
                                className="w-full rounded-xl border border-white/10 bg-slate-950/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-orange-400/40 focus:outline-none focus:ring-2 focus:ring-orange-400/15"
                            />
                        </div>
                    </div>

                    {/* Grid */}
                    {filtered.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
                                <Gavel className="h-7 w-7 text-slate-600" />
                            </div>
                            <p className="text-base font-medium text-slate-300">No hay lotes con estos filtros</p>
                            <p className="mt-1 text-sm text-slate-500">Prueba otro estado o vuelve más tarde.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {filtered.map((auction) => (
                                <AuctionCard key={auction.id} auction={auction} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout1>
    );
}
