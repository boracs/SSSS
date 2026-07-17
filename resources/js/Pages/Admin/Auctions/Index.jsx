import React, { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import Layout1 from "../../../layouts/Layout1";
import {
    PlusCircle,
    Pencil,
    Trash2,
    Gavel,
    Search,
    Play,
    Square,
    Ban,
    ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmt = (cents) => EUR.format(Number(cents || 0) / 100);

const STATUS_CFG = {
    draft: { label: "Borrador", cls: "border-slate-500/40 bg-slate-500/10 text-slate-300" },
    live: { label: "En curso", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
    ended: { label: "Finalizada", cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
    settled: { label: "Adjudicada", cls: "border-cyan-500/40 bg-cyan-500/10 text-cyan-300" },
    cancelled: { label: "Cancelada", cls: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
};

export default function AdminAuctionsIndex({ auctions = [], filters = {}, statuses = [], categories = [] }) {
    const { flash } = usePage().props;
    const [search, setSearch] = useState(filters.search || "");
    const [status, setStatus] = useState(filters.status || "");
    const [category, setCategory] = useState(filters.category || "");

    React.useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    const applyFilters = (e) => {
        e?.preventDefault?.();
        router.get(route("admin.auctions.index"), { search, status, category }, { preserveState: true });
    };

    const action = (name, auctionId) => {
        router.patch(route(name, auctionId), {}, { preserveScroll: true });
    };

    const destroy = (auction) => {
        if (!window.confirm(`¿Eliminar la subasta «${auction.title}»?`)) return;
        router.delete(route("admin.auctions.destroy", auction.id));
    };

    return (
        <Layout1>
            <Head title="Gestión de subastas" />
            <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-white">Subastas S4</h1>
                        <p className="mt-1 text-sm text-slate-500">Crea lotes, publica y cierra subastas</p>
                    </div>
                    <Link
                        href={route("admin.auctions.create")}
                        className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-2.5 text-sm font-bold text-slate-900"
                    >
                        <PlusCircle className="h-4 w-4" />
                        Nueva subasta
                    </Link>
                </div>

                <form
                    onSubmit={applyFilters}
                    className="mb-6 grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:grid-cols-4"
                >
                    <div className="relative sm:col-span-2">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar título…"
                            className="w-full rounded-xl border border-white/10 bg-slate-950/60 py-2 pl-9 pr-3 text-sm text-white"
                        />
                    </div>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    >
                        <option value="">Todos los estados</option>
                        {statuses.map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm text-white"
                    >
                        <option value="">Todas las categorías</option>
                        {categories.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                    <button type="submit" className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white sm:col-span-4">
                        Filtrar
                    </button>
                </form>

                <div className="space-y-3">
                    {auctions.length === 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 py-16 text-center text-slate-500">
                            <Gavel className="mx-auto h-10 w-10 opacity-40" />
                            <p className="mt-3">No hay subastas.</p>
                        </div>
                    ) : (
                        auctions.map((auction) => {
                            const cfg = STATUS_CFG[auction.status] || STATUS_CFG.draft;
                            return (
                                <article
                                    key={auction.id}
                                    className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center"
                                >
                                    <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-slate-800">
                                        {auction.first_image ? (
                                            <img src={auction.first_image} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <Gavel className="h-6 w-6 text-slate-600" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="truncate font-bold text-white">{auction.title}</h2>
                                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${cfg.cls}`}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {auction.category_label} · {auction.bid_count} pujas · Actual {fmt(auction.current_price_cents)}
                                        </p>
                                        {auction.winner_name ? (
                                            <p className="mt-1 text-xs text-cyan-300">Ganador: {auction.winner_name}</p>
                                        ) : null}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {auction.status === "draft" ? (
                                            <button
                                                type="button"
                                                onClick={() => action("admin.auctions.publish", auction.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200"
                                            >
                                                <Play className="h-3.5 w-3.5" /> Publicar
                                            </button>
                                        ) : null}
                                        {auction.status === "live" ? (
                                            <button
                                                type="button"
                                                onClick={() => action("admin.auctions.close", auction.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200"
                                            >
                                                <Square className="h-3.5 w-3.5" /> Cerrar
                                            </button>
                                        ) : null}
                                        {!["settled", "cancelled"].includes(auction.status) ? (
                                            <button
                                                type="button"
                                                onClick={() => action("admin.auctions.cancel", auction.id)}
                                                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-200"
                                            >
                                                <Ban className="h-3.5 w-3.5" /> Cancelar
                                            </button>
                                        ) : null}
                                        <Link
                                            href={route("auctions.show", auction.slug)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" /> Ver
                                        </Link>
                                        <Link
                                            href={route("admin.auctions.edit", auction.id)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10"
                                        >
                                            <Pencil className="h-3.5 w-3.5" /> Editar
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => destroy(auction)}
                                            className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </div>
        </Layout1>
    );
}
