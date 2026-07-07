import React, { useState, useMemo } from "react";
import { Link } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import { Ruler, Droplets, Tag, Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

const EUR = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});

function formatEur(cents) {
    return EUR.format(cents / 100);
}

function formatHeight(feetDecimal) {
    const feet = Math.floor(feetDecimal);
    const inches = Math.round((feetDecimal - feet) * 12);
    return `${feet}'${inches}"`;
}

const HEIGHT_FILTERS = [
    { value: "all", label: "Todas las alturas" },
    { value: "short", label: "Hasta 5'8\"", match: (h) => h <= 5.67 },
    { value: "mid-short", label: "5'8\" – 6'0\"", match: (h) => h > 5.67 && h <= 6.0 },
    { value: "mid-long", label: "6'0\" – 6'4\"", match: (h) => h > 6.0 && h <= 6.33 },
    { value: "long", label: "Más de 6'4\"", match: (h) => h > 6.33 },
];

const VOLUME_FILTERS = [
    { value: "all", label: "Todos los volúmenes" },
    { value: "low", label: "Menos de 30 L", match: (v) => v < 30 },
    { value: "mid-low", label: "30 – 34 L", match: (v) => v >= 30 && v < 34 },
    { value: "mid", label: "34 – 38 L", match: (v) => v >= 34 && v < 38 },
    { value: "high", label: "Más de 38 L", match: (v) => v >= 38 },
];

const PRICE_FILTERS = [
    { value: "all", label: "Todos los precios" },
    { value: "under300", label: "Hasta 300 €", match: (cents) => cents <= 30000 },
    { value: "300-450", label: "300 – 450 €", match: (cents) => cents > 30000 && cents <= 45000 },
    { value: "450-600", label: "450 – 600 €", match: (cents) => cents > 45000 && cents <= 60000 },
    { value: "over600", label: "Más de 600 €", match: (cents) => cents > 60000 },
];

function effectivePriceCents(board) {
    return Number(board.effective_price ?? board.sale_price ?? 0);
}

function BoardCard({ board }) {
    const hasDiscount = board.discount_pct > 0;

    return (
        <Link
            href={route("second-hand.show", board.id)}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(251,146,60,0.15)]"
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-800/60">
                {board.first_image ? (
                    <img
                        src={board.first_image}
                        alt={board.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <svg className="h-16 w-16 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                            <path d="M12 2C6 2 3 7 3 12s3 10 9 10 9-5 9-10S18 2 12 2z" />
                            <path d="M9 9l6 6M15 9l-6 6" />
                        </svg>
                    </div>
                )}

                {hasDiscount && (
                    <div className="absolute left-2 top-2 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
                        -{board.discount_pct}%
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col p-4">
                <div className="mb-2">
                    {board.brand && (
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                            {board.brand}
                        </p>
                    )}
                    <h3 className="text-sm font-bold leading-tight text-white line-clamp-2">
                        {board.name}
                    </h3>
                </div>

                <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    <SpecPill icon={Ruler} label={`${formatHeight(board.height)} × ${board.width}"`} />
                    <SpecPill icon={Ruler} label={`${board.thickness}"`} suffix="grosor" />
                    <SpecPill icon={Droplets} label={`${board.volume} L`} />
                </div>

                <div className="mt-auto">
                    {hasDiscount ? (
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

const selectClass =
    "w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-8 text-sm text-slate-200 outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20 sm:w-auto sm:min-w-[180px]";

const sortButtonClass =
    "inline-flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3 pr-3 text-sm text-slate-200 outline-none transition hover:border-orange-400/40 hover:bg-white/10 focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20 sm:w-auto sm:min-w-[180px]";

export default function SecondHandIndex({ boards }) {
    const [search, setSearch] = useState("");
    const [heightFilter, setHeightFilter] = useState("all");
    const [volumeFilter, setVolumeFilter] = useState("all");
    const [priceFilter, setPriceFilter] = useState("all");
    const [priceSort, setPriceSort] = useState(null);

    const togglePriceSort = () => {
        setPriceSort((prev) => (prev === null || prev === "desc" ? "asc" : "desc"));
    };

    const filtered = useMemo(() => {
        const heightRule = HEIGHT_FILTERS.find((f) => f.value === heightFilter);
        const volumeRule = VOLUME_FILTERS.find((f) => f.value === volumeFilter);
        const priceRule = PRICE_FILTERS.find((f) => f.value === priceFilter);
        const q = search.toLowerCase().trim();

        let result = boards.filter((b) => {
            const matchSearch =
                !q ||
                b.name.toLowerCase().includes(q) ||
                (b.brand ?? "").toLowerCase().includes(q) ||
                (b.model ?? "").toLowerCase().includes(q);

            const h = Number(b.height);
            const v = Number(b.volume);
            const priceCents = effectivePriceCents(b);
            const matchHeight = heightFilter === "all" || (heightRule?.match?.(h) ?? true);
            const matchVolume = volumeFilter === "all" || (volumeRule?.match?.(v) ?? true);
            const matchPrice = priceFilter === "all" || (priceRule?.match?.(priceCents) ?? true);

            return matchSearch && matchHeight && matchVolume && matchPrice;
        });

        if (priceSort) {
            result = [...result].sort((a, b) => {
                const diff = effectivePriceCents(a) - effectivePriceCents(b);
                return priceSort === "asc" ? diff : -diff;
            });
        }

        return result;
    }, [boards, search, heightFilter, volumeFilter, priceFilter, priceSort]);

    const hasActiveFilters =
        search.trim() !== "" ||
        heightFilter !== "all" ||
        volumeFilter !== "all" ||
        priceFilter !== "all" ||
        priceSort !== null;

    const clearFilters = () => {
        setSearch("");
        setHeightFilter("all");
        setVolumeFilter("all");
        setPriceFilter("all");
        setPriceSort(null);
    };

    return (
        <Layout1>
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-400">
                        Segunda Mano · San Sebastian Surf School
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                        Tablas de Segunda Mano
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Tablas revisadas y garantizadas por nuestra escuela. Equipo de calidad
                        a precios justos para todos los niveles.
                    </p>
                    {boards.length > 0 && (
                        <p className="mt-3 text-sm font-semibold text-emerald-400">
                            {boards.length} tabla{boards.length !== 1 ? "s" : ""} en venta
                            {hasActiveFilters && filtered.length !== boards.length ? (
                                <span className="font-normal text-slate-400">
                                    {" "}
                                    · {filtered.length} coinciden con tu búsqueda
                                </span>
                            ) : null}
                        </p>
                    )}
                </div>

                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o marca…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Altura
                            </span>
                            <select
                                value={heightFilter}
                                onChange={(e) => setHeightFilter(e.target.value)}
                                className={selectClass}
                            >
                                {HEIGHT_FILTERS.map((f) => (
                                    <option key={f.value} value={f.value} className="bg-slate-900 text-slate-100">
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Volumen
                            </span>
                            <select
                                value={volumeFilter}
                                onChange={(e) => setVolumeFilter(e.target.value)}
                                className={selectClass}
                            >
                                {VOLUME_FILTERS.map((f) => (
                                    <option key={f.value} value={f.value} className="bg-slate-900 text-slate-100">
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Franja de precio
                            </span>
                            <select
                                value={priceFilter}
                                onChange={(e) => setPriceFilter(e.target.value)}
                                className={selectClass}
                            >
                                {PRICE_FILTERS.map((f) => (
                                    <option key={f.value} value={f.value} className="bg-slate-900 text-slate-100">
                                        {f.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Precio
                            </span>
                            <button
                                type="button"
                                onClick={togglePriceSort}
                                aria-label={
                                    priceSort === "asc"
                                        ? "Ordenado de menor a mayor. Clic para ordenar de mayor a menor"
                                        : priceSort === "desc"
                                          ? "Ordenado de mayor a menor. Clic para ordenar de menor a mayor"
                                          : "Ordenar por precio"
                                }
                                className={`${sortButtonClass} ${
                                    priceSort ? "border-orange-400/40 text-orange-100" : ""
                                }`}
                            >
                                <span>
                                    {priceSort === "asc"
                                        ? "Menor a mayor"
                                        : priceSort === "desc"
                                          ? "Mayor a menor"
                                          : "Ordenar por precio"}
                                </span>
                                {priceSort === "asc" ? (
                                    <ArrowUp className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
                                ) : priceSort === "desc" ? (
                                    <ArrowDown className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
                                ) : (
                                    <ArrowUpDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                                )}
                            </button>
                        </div>

                        {hasActiveFilters ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/10 sm:self-end"
                            >
                                Limpiar filtros
                            </button>
                        ) : null}
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <Tag className="mb-3 h-10 w-10 text-slate-600" />
                        <p className="text-sm font-medium text-slate-400">
                            {boards.length === 0
                                ? "No hay tablas en venta en este momento."
                                : "No hay tablas que coincidan con tu búsqueda."}
                        </p>
                        {hasActiveFilters && boards.length > 0 ? (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
                            >
                                Ver todas las tablas en venta
                            </button>
                        ) : null}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filtered.map((board) => (
                            <BoardCard key={board.id} board={board} />
                        ))}
                    </div>
                )}
            </div>
        </Layout1>
    );
}
