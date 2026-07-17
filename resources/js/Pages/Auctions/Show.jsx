import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import {
    ArrowLeft,
    ArrowUpRight,
    Clock,
    Gavel,
    CreditCard,
    Loader2,
    TrendingUp,
    Sparkles,
    Trophy,
    Hash,
    Calendar,
    ShieldCheck,
    Package,
    CircleHelp,
    Radio,
    CheckCircle2,
    Lock,
} from "lucide-react";
import { toast } from "react-toastify";

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });
const fmt = (cents) => EUR.format(Number(cents || 0) / 100);
const minBidEuros = (cents) => (Number(cents || 0) / 100).toFixed(2);

function formatDateTime(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-ES", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getPhase(auction) {
    if (auction.is_live) return "live";
    if (auction.has_ended || auction.status === "ended" || auction.status === "settled") return "ended";
    if (auction.starts_at && new Date(auction.starts_at) > Date.now()) return "scheduled";
    if (auction.status === "live") return "closing";
    return auction.status;
}

const PHASE_BADGE = {
    live: {
        label: "En vivo",
        className: "border-emerald-400/35 bg-emerald-500/15 text-emerald-100",
        dot: "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)]",
    },
    scheduled: {
        label: "Próximamente",
        className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
        dot: "bg-cyan-400",
    },
    closing: {
        label: "Cerrando",
        className: "border-amber-400/30 bg-amber-500/10 text-amber-100",
        dot: "bg-amber-400",
    },
    ended: {
        label: "Finalizada",
        className: "border-white/10 bg-white/5 text-slate-400",
        dot: "bg-slate-500",
    },
    settled: {
        label: "Adjudicada",
        className: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
        dot: "bg-cyan-400",
    },
};

function LiveCountdown({ endsAt, isLive, onExpired }) {
    const [parts, setParts] = useState({ h: "00", m: "00", s: "00", done: false });
    const expiredRef = React.useRef(false);

    useEffect(() => {
        expiredRef.current = false;
        if (!endsAt || !isLive) return undefined;
        const tick = () => {
            const diff = new Date(endsAt).getTime() - Date.now();
            if (diff <= 0) {
                setParts({ h: "00", m: "00", s: "00", done: true });
                if (!expiredRef.current) {
                    expiredRef.current = true;
                    onExpired?.();
                }
                return;
            }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setParts({
                h: String(h).padStart(2, "0"),
                m: String(m).padStart(2, "0"),
                s: String(s).padStart(2, "0"),
                done: false,
            });
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [endsAt, isLive, onExpired]);

    if (!isLive) return null;

    return (
        <div className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200/80">
                <Clock className="h-3.5 w-3.5" />
                Tiempo restante
            </p>
            {parts.done ? (
                <p className="text-lg font-bold text-amber-100">Subasta cerrada</p>
            ) : (
                <div className="flex items-center gap-2 tabular-nums">
                    {[
                        { v: parts.h, u: "h" },
                        { v: parts.m, u: "m" },
                        { v: parts.s, u: "s" },
                    ].map((p, i) => (
                        <React.Fragment key={p.u}>
                            {i > 0 ? <span className="text-2xl font-light text-amber-500/50">:</span> : null}
                            <div className="min-w-[3.5rem] rounded-xl border border-white/10 bg-black/30 px-2 py-2 text-center">
                                <span className="text-2xl font-extrabold text-white">{p.v}</span>
                                <span className="block text-[9px] font-semibold uppercase text-amber-300/70">{p.u}</span>
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            )}
        </div>
    );
}

function MetaRow({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <dt className="flex items-center gap-2 text-slate-500">
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                {label}
            </dt>
            <dd className="font-semibold tabular-nums text-slate-100">{value}</dd>
        </div>
    );
}

function ImageGallery({ images, title }) {
    const list = images?.length ? images : [];
    const [active, setActive] = useState(0);
    const current = list[active] ?? null;

    if (!current) {
        return (
            <div className="flex aspect-[16/10] items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                <Gavel className="h-20 w-20 text-slate-700" strokeWidth={1} />
            </div>
        );
    }

    return (
        <div>
            <div className="relative overflow-hidden">
                <img
                    src={current}
                    alt={title}
                    className="aspect-[16/10] w-full object-cover"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#070b14]/50 via-transparent to-transparent" />
            </div>
            {list.length > 1 ? (
                <div className="flex gap-2 border-t border-white/[0.06] bg-black/20 p-3">
                    {list.map((src, index) => (
                        <button
                            key={src}
                            type="button"
                            onClick={() => setActive(index)}
                            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                                index === active
                                    ? "border-orange-400/70 ring-2 ring-orange-400/20"
                                    : "border-white/10 opacity-70 hover:opacity-100"
                            }`}
                        >
                            <img src={src} alt="" className="h-full w-full object-cover" />
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function BidActivity({ bids }) {
    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                    Actividad reciente
                </h2>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                    {bids.length} {bids.length === 1 ? "puja" : "pujas"}
                </span>
            </div>
            {bids.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-10 text-center">
                    <Gavel className="mx-auto mb-3 h-8 w-8 text-slate-600" />
                    <p className="text-sm font-medium text-slate-400">Aún no hay pujas</p>
                    <p className="mt-1 text-xs text-slate-600">Sé el primero en marcar el ritmo del lote.</p>
                </div>
            ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                    {bids.map((bid, index) => (
                        <li
                            key={bid.id}
                            className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition ${
                                bid.is_mine
                                    ? "border border-orange-400/25 bg-orange-500/10 text-orange-50"
                                    : "bg-white/[0.03] text-slate-300"
                            }`}
                        >
                            <div className="flex min-w-0 items-center gap-2.5">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-[10px] font-bold text-slate-500">
                                    {index + 1}
                                </span>
                                <span className="truncate">{bid.bidder_name || "Socio S4"}</span>
                                {bid.is_mine ? (
                                    <span className="shrink-0 rounded-full bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-300">
                                        Tú
                                    </span>
                                ) : null}
                            </div>
                            <span className="ml-2 shrink-0 font-bold tabular-nums">{fmt(bid.amount_cents)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const HOW_IT_WORKS = [
    {
        step: "01",
        title: "Revisa el lote",
        text: "Consulta fotos, descripción, precio de salida e incremento mínimo antes de pujar.",
        icon: Package,
    },
    {
        step: "02",
        title: "Confirma tu puja",
        text: "Introduce un importe igual o superior al mínimo. Cada puja válida actualiza el precio líder.",
        icon: Gavel,
    },
    {
        step: "03",
        title: "Mantente atento",
        text: "Si alguien te supera, vuelve a pujar antes del cierre. El historial muestra la actividad en vivo.",
        icon: Radio,
    },
    {
        step: "04",
        title: "Paga al ganar",
        text: "Si adjudicas el lote, completa el pago seguro con tarjeta desde esta misma ficha.",
        icon: CreditCard,
    },
];

function AuctionProgress({ auction, phase }) {
    const steps = [
        { id: "start", label: "Salida", done: true },
        { id: "live", label: "En curso", done: phase === "live" || phase === "closing" || phase === "ended" || phase === "settled" },
        { id: "end", label: "Cierre", done: phase === "ended" || phase === "settled" },
        { id: "pay", label: "Pago", done: auction.status === "settled" },
    ];

    return (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                Progreso del lote
            </h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-4">
                {steps.map((step, index) => (
                    <li key={step.id} className="relative flex flex-col items-center text-center">
                        {index < steps.length - 1 ? (
                            <span
                                aria-hidden
                                className="absolute left-[calc(50%+1.25rem)] top-4 hidden h-px w-[calc(100%-2.5rem)] bg-white/10 sm:block"
                            />
                        ) : null}
                        <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                                step.done
                                    ? "bg-orange-500/20 text-orange-200 ring-1 ring-orange-400/30"
                                    : "bg-white/5 text-slate-600 ring-1 ring-white/10"
                            }`}
                        >
                            {step.done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                        </span>
                        <span className="mt-2 text-xs font-semibold text-slate-300">{step.label}</span>
                    </li>
                ))}
            </ol>
        </div>
    );
}

function RelatedAuctionCard({ auction }) {
    return (
        <Link
            href={route("auctions.show", auction.slug)}
            className="group flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 transition hover:border-orange-400/30 hover:bg-white/[0.05]"
        >
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                {auction.first_image ? (
                    <img src={auction.first_image} alt="" className="h-full w-full object-cover" />
                ) : (
                    <div className="flex h-full w-full items-center justify-center">
                        <Gavel className="h-6 w-6 text-slate-600" />
                    </div>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white group-hover:text-orange-100">{auction.title}</p>
                <p className="mt-1 text-xs text-slate-500">{auction.category_label}</p>
                <p className="mt-2 text-base font-extrabold tabular-nums text-orange-200">
                    {fmt(auction.current_price_cents)}
                </p>
            </div>
            <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-orange-300" />
        </Link>
    );
}

export default function AuctionsShow({ auction, relatedAuctions = [] }) {
    const { flash } = usePage().props;
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        amount: minBidEuros(auction.minimum_next_bid_cents),
    });
    const [paying, setPaying] = useState(false);
    const [timeUp, setTimeUp] = useState(false);

    const phase = getPhase(auction);
    const phaseBadge = PHASE_BADGE[phase] ?? PHASE_BADGE.ended;
    const canBid = auction.is_live && !timeUp;
    const minimumBidLabel = fmt(auction.minimum_next_bid_cents);
    const incrementEuros = minBidEuros(auction.min_increment_cents);
    const minimumBidEuros = Number(auction.minimum_next_bid_cents || 0) / 100;

    useEffect(() => {
        if (flash?.success) toast.success(flash.success);
        if (flash?.error) toast.error(flash.error);
    }, [flash]);

    useEffect(() => {
        setTimeUp(false);
        setData("amount", minBidEuros(auction.minimum_next_bid_cents));
    }, [auction.minimum_next_bid_cents, auction.current_price_cents, auction.bid_count, auction.is_live]);

    const handleBid = (e) => {
        e.preventDefault();
        clearErrors();

        const amountNum = Number(String(data.amount).replace(",", "."));
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
            toast.error("Indica un importe válido para pujar.");
            return;
        }

        if (amountNum + 0.001 < minimumBidEuros) {
            toast.error(`La puja mínima actual es ${minimumBidLabel}.`);
            setData("amount", minBidEuros(auction.minimum_next_bid_cents));
            return;
        }

        post(route("auctions.bid", auction.slug), {
            preserveScroll: true,
            onError: (fieldErrors) => {
                const first = fieldErrors.amount
                    || Object.values(fieldErrors).flat().find(Boolean);
                if (first) toast.error(first);
            },
        });
    };

    const applyMinimumBid = () => {
        clearErrors();
        setData("amount", minBidEuros(auction.minimum_next_bid_cents));
    };

    const addIncrement = () => {
        clearErrors();
        const current = Number(data.amount) || 0;
        const next = current + Number(auction.min_increment_cents || 0) / 100;
        const minimum = Number(auction.minimum_next_bid_cents || 0) / 100;
        setData("amount", Math.max(next, minimum).toFixed(2));
    };

    const handlePay = () => {
        setPaying(true);
        router.post(route("auctions.pay", auction.slug), {}, {
            onFinish: () => setPaying(false),
        });
    };

    const bids = useMemo(() => auction.bids || [], [auction.bids]);
    const images = auction.images?.length ? auction.images : auction.first_image ? [auction.first_image] : [];

    const specItems = [
        { label: "Categoría", value: auction.category_label },
        { label: "Lote", value: `#${auction.id}` },
        { label: "Precio de salida", value: fmt(auction.starting_price_cents) },
        { label: "Incremento mínimo", value: fmt(auction.min_increment_cents) },
        { label: "Inicio", value: formatDateTime(auction.starts_at) },
        { label: "Cierre", value: formatDateTime(auction.ends_at) },
    ];

    return (
        <Layout1>
            <Head title={auction.title} />
            <div className="relative overflow-hidden bg-[#070b14] pb-16">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(251,146,60,0.1),transparent)]"
                />

                <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
                    <Link
                        href={route("auctions.index")}
                        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al catálogo
                    </Link>

                    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-start lg:gap-10">
                        {/* Columna izquierda */}
                        <div className="space-y-6">
                            <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-900/50 shadow-2xl shadow-black/40 ring-1 ring-white/5">
                                <ImageGallery images={images} title={auction.title} />
                            </div>

                            <article className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-sm sm:p-8">
                                <div className="mb-3 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-orange-200">
                                        {auction.category_label}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold ${phaseBadge.className}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${phaseBadge.dot}`} />
                                        {phaseBadge.label}
                                    </span>
                                </div>
                                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl">
                                    {auction.title}
                                </h1>
                                {auction.description ? (
                                    <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-slate-400 sm:text-base">
                                        {auction.description}
                                    </p>
                                ) : (
                                    <p className="mt-5 text-sm italic text-slate-600">Sin descripción adicional.</p>
                                )}
                            </article>

                            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                                <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                    Ficha del lote
                                </h2>
                                <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                                    {specItems.map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3"
                                        >
                                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                                {item.label}
                                            </dt>
                                            <dd className="mt-1 text-sm font-bold text-slate-100">{item.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            <BidActivity bids={bids} />
                        </div>

                        {/* Columna derecha — acciones */}
                        <div className="lg:sticky lg:top-6 lg:self-start">
                            <div className="space-y-4">
                                <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-xl shadow-black/20 ring-1 ring-white/5">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                        Puja líder
                                    </p>
                                    <p className="mt-1 text-4xl font-extrabold tabular-nums tracking-tight text-white">
                                        {fmt(auction.current_price_cents)}
                                    </p>
                                    <div className="mt-4 flex items-center gap-4 border-t border-white/[0.06] pt-4">
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500">Pujas</p>
                                            <p className="text-xl font-bold text-white">{auction.bid_count}</p>
                                        </div>
                                        <div className="h-8 w-px bg-white/10" />
                                        <div>
                                            <p className="text-[10px] uppercase tracking-wider text-slate-500">Siguiente mín.</p>
                                            <p className="text-lg font-semibold text-orange-200">{minimumBidLabel}</p>
                                        </div>
                                    </div>
                                </div>

                                <LiveCountdown
                                    endsAt={auction.ends_at}
                                    isLive={auction.is_live}
                                    onExpired={() => setTimeUp(true)}
                                />

                                {canBid ? (
                                    <form
                                        noValidate
                                        onSubmit={handleBid}
                                        className="rounded-2xl border border-orange-400/20 bg-gradient-to-br from-orange-500/[0.12] via-transparent to-amber-500/[0.06] p-6 shadow-lg shadow-orange-950/20"
                                    >
                                        <div className="mb-4 flex items-center gap-2">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/25">
                                                <Gavel className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h2 className="text-base font-bold text-white">Tu puja</h2>
                                                <p className="text-xs text-slate-400">Mínimo {minimumBidLabel}</p>
                                            </div>
                                        </div>
                                        <div className="relative">
                                            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
                                                €
                                            </span>
                                            <input
                                                type="number"
                                                step="0.01"
                                                inputMode="decimal"
                                                value={data.amount}
                                                onChange={(e) => setData("amount", e.target.value)}
                                                className="w-full rounded-xl border border-white/10 bg-slate-950/70 py-3.5 pl-9 pr-4 text-lg font-semibold tabular-nums text-white focus:border-orange-400/50 focus:outline-none focus:ring-2 focus:ring-orange-400/20"
                                                aria-invalid={Boolean(errors.amount)}
                                                aria-describedby={errors.amount ? "bid-amount-error" : undefined}
                                            />
                                        </div>
                                        {errors.amount ? (
                                            <p id="bid-amount-error" className="mt-2 text-sm text-rose-400">{errors.amount}</p>
                                        ) : null}
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button
                                                type="button"
                                                onClick={applyMinimumBid}
                                                disabled={processing}
                                                className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/30 hover:text-white disabled:opacity-60"
                                            >
                                                Mínima
                                            </button>
                                            <button
                                                type="button"
                                                onClick={addIncrement}
                                                disabled={processing}
                                                className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/30 hover:text-white disabled:opacity-60"
                                            >
                                                +{incrementEuros} €
                                            </button>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={processing}
                                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-400 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-orange-900/30 transition hover:brightness-105 disabled:opacity-60"
                                        >
                                            {processing ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="h-4 w-4" />
                                            )}
                                            Confirmar puja
                                        </button>
                                    </form>
                                ) : (
                                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
                                        <div className="flex items-start gap-3">
                                            <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
                                            <div>
                                                <p className="text-sm font-semibold text-slate-200">
                                                    {phase === "scheduled"
                                                        ? "La subasta aún no ha comenzado"
                                                        : phase === "closing"
                                                          ? "El plazo ha terminado"
                                                          : "Puja no disponible"}
                                                </p>
                                                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                                    {phase === "scheduled"
                                                        ? `Podrás pujar a partir del ${formatDateTime(auction.starts_at)}.`
                                                        : phase === "closing"
                                                          ? "Estamos cerrando el lote. Actualiza la página en unos segundos."
                                                          : "Este lote ya no acepta nuevas pujas."}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {auction.can_pay ? (
                                    <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-emerald-900/10 p-6">
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                                                <Trophy className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-bold text-white">¡Lote adjudicado!</h2>
                                                <p className="mt-1 text-sm text-emerald-100/90">
                                                    Completa el pago de {fmt(auction.current_price_cents)} para formalizar la compra.
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handlePay}
                                            disabled={paying}
                                            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-bold text-slate-900 shadow-lg shadow-emerald-900/30 disabled:opacity-60"
                                        >
                                            {paying ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <CreditCard className="h-4 w-4" />
                                            )}
                                            Pagar con tarjeta
                                        </button>
                                    </div>
                                ) : null}

                                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-1 backdrop-blur-sm">
                                    <dl className="divide-y divide-white/[0.06]">
                                        <MetaRow icon={TrendingUp} label="Incremento mínimo" value={fmt(auction.min_increment_cents)} />
                                        <MetaRow icon={Calendar} label="Cierra" value={formatDateTime(auction.ends_at)} />
                                        <MetaRow icon={Hash} label="Referencia" value={`Lote #${auction.id}`} />
                                    </dl>
                                </div>

                                <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                                    <div className="flex items-start gap-3">
                                        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-orange-300/80" />
                                        <p className="text-xs leading-relaxed text-slate-500">
                                            Acceso exclusivo para socios VIP o con taquilla activa. Pago seguro vía Stripe al adjudicar el lote.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sección inferior — llena el espacio y aporta valor */}
                    <div className="mt-12 space-y-8">
                        <AuctionProgress auction={auction} phase={phase} />

                        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
                            <div className="mb-6 flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-orange-300" />
                                <h2 className="text-lg font-bold text-white">Cómo pujar en S4</h2>
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                {HOW_IT_WORKS.map((item) => (
                                    <div
                                        key={item.step}
                                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-widest text-orange-400/80">
                                                {item.step}
                                            </span>
                                            <item.icon className="h-4 w-4 text-slate-500" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white">{item.title}</h3>
                                        <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {relatedAuctions.length > 0 ? (
                            <section>
                                <div className="mb-4 flex items-center justify-between gap-4">
                                    <h2 className="text-lg font-bold text-white">Otros lotes en curso</h2>
                                    <Link
                                        href={route("auctions.index")}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-orange-300 hover:text-orange-200"
                                    >
                                        Ver catálogo
                                        <ArrowUpRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {relatedAuctions.map((item) => (
                                        <RelatedAuctionCard key={item.id} auction={item} />
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.03] to-transparent p-6">
                            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                                Condiciones del club
                            </h2>
                            <ul className="mt-4 grid gap-3 text-sm text-slate-400 sm:grid-cols-3">
                                <li className="flex gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
                                    Material revisado por el equipo S4 antes de publicar el lote.
                                </li>
                                <li className="flex gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
                                    Cada puja válida es vinculante hasta el cierre oficial del lote.
                                </li>
                                <li className="flex gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400/80" />
                                    Recogida o coordinación en escuela tras confirmar el pago del ganador.
                                </li>
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        </Layout1>
    );
}
