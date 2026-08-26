import React, { useEffect, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import SeoHead from "../../components/seo/SeoHead";
import SafeImage from "../../components/SafeImage";
import WhatsAppIcon from "../../components/icons/WhatsAppIcon";
import { formatEurFromCents } from "../../utils/money";
import { rememberCatalogQuery, toCatalogQuery } from "../../lib/secondHandCatalog";
import { resolveAcademyWhatsappUrl, WHATSAPP_TOPICS } from "../../lib/whatsapp";
import { Ruler, Droplets, Tag, Search, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

const EMPTY_FILTERS = {
    q: "",
    altura: "all",
    volumen: "all",
    precio: "all",
    tipo: "all",
    orden: null,
};

function visitCatalog(nextFilters) {
    const query = toCatalogQuery(nextFilters);
    rememberCatalogQuery(query);
    router.get(route("second-hand.index"), query, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

function BoardCard({ board, loading = "lazy", fetchPriority = "auto" }) {
    const hasDiscount = board.discount_pct > 0;
    const isReserved = board.status === "reserved";
    const heightLabel = board.height_label ?? "";

    return (
        <Link
            href={route("second-hand.show", board.id)}
            className="group relative flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(251,146,60,0.15)] sm:rounded-2xl"
        >
            <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-b from-slate-200 to-slate-300 sm:aspect-[4/3]">
                {board.first_image ? (
                    <SafeImage
                        src={board.first_image}
                        alt={board.name}
                        className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        placeholderClassName="h-full w-full"
                        loading={loading}
                        fetchPriority={fetchPriority}
                        decoding="async"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center bg-slate-800/60">
                        <svg className="h-10 w-10 text-slate-500 sm:h-14 sm:w-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                            <path d="M12 2C6 2 3 7 3 12s3 10 9 10 9-5 9-10S18 2 12 2z" />
                            <path d="M9 9l6 6M15 9l-6 6" />
                        </svg>
                    </div>
                )}

                {hasDiscount && (
                    <div className="absolute left-1.5 top-1.5 rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white shadow sm:left-2 sm:top-2 sm:px-2 sm:text-[11px]">
                        -{board.discount_pct}%
                    </div>
                )}
                {isReserved && (
                    <div className="absolute right-1.5 top-1.5 rounded-full border border-amber-400/40 bg-amber-950/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-200 shadow sm:right-2 sm:top-2 sm:px-2 sm:text-[11px]">
                        Reservada
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col p-2.5 sm:p-4">
                <div className="mb-1.5 sm:mb-2">
                    {board.brand && (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-orange-400 sm:text-[11px]">
                            {board.brand}
                        </p>
                    )}
                    <h2 className="text-xs font-bold leading-snug text-white line-clamp-2 sm:text-sm sm:leading-tight">
                        {board.name}
                    </h2>
                </div>

                <div className="mb-2 hidden grid-cols-2 gap-x-3 gap-y-1.5 sm:mb-3 sm:grid">
                    <SpecPill icon={Ruler} label={`${heightLabel} × ${board.width}"`} />
                    <SpecPill icon={Ruler} label={`${board.thickness}"`} suffix="grosor" />
                    <SpecPill icon={Droplets} label={`${board.volume} L`} />
                    {board.board_type_short ? <SpecPill icon={Tag} label={board.board_type_short} /> : null}
                </div>
                <p className="mb-2 text-[10px] leading-snug text-slate-400 sm:hidden">
                    {heightLabel}
                    {board.volume != null ? ` · ${board.volume} L` : ""}
                    {board.board_type_short ? ` · ${board.board_type_short}` : ""}
                </p>

                <div className="mt-auto">
                    {hasDiscount ? (
                        <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                            <span className="text-base font-extrabold text-orange-400 sm:text-lg">
                                {formatEurFromCents(board.effective_price)}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through sm:text-xs">
                                {formatEurFromCents(board.sale_price)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-base font-extrabold text-cyan-300 sm:text-lg">
                            {formatEurFromCents(board.sale_price)}
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

export default function SecondHandIndex({
    boards = [],
    filters: filtersProp = EMPTY_FILTERS,
    filterOptions = { height: [], volume: [], price: [], type: [] },
    catalogMeta = { total: 0, matched: 0, filtersActive: false },
    seo = null,
}) {
    const { props: pageProps } = usePage();
    const filters = { ...EMPTY_FILTERS, ...filtersProp };
    const filtersRef = useRef(filters);
    filtersRef.current = filters;
    const [search, setSearch] = useState(filters.q ?? "");
    const skipSearchDebounce = useRef(true);

    const total = Number(catalogMeta.total ?? boards.length);
    const matched = Number(catalogMeta.matched ?? boards.length);
    const hasActiveFilters = Boolean(catalogMeta.filtersActive);

    const emptyStockWhatsapp = resolveAcademyWhatsappUrl(
        null,
        "Hola! ¿Cuándo tendréis tablas de segunda mano disponibles?",
        pageProps?.academyWhatsappUrl,
    );
    const browseWhatsapp = resolveAcademyWhatsappUrl(
        null,
        WHATSAPP_TOPICS.secondHand,
        pageProps?.academyWhatsappUrl,
    );

    useEffect(() => {
        rememberCatalogQuery(toCatalogQuery(filtersRef.current));
    }, [filters.q, filters.altura, filters.volumen, filters.precio, filters.tipo, filters.orden]);

    useEffect(() => {
        setSearch(filters.q ?? "");
    }, [filters.q]);

    useEffect(() => {
        if (skipSearchDebounce.current) {
            skipSearchDebounce.current = false;
            return;
        }
        const handle = window.setTimeout(() => {
            const current = filtersRef.current;
            if (search.trim() === (current.q ?? "").trim()) return;
            visitCatalog({ ...current, q: search });
        }, 350);
        return () => window.clearTimeout(handle);
    }, [search]);

    const patchFilters = (partial) => {
        visitCatalog({ ...filters, q: search, ...partial });
    };

    const togglePriceSort = () => {
        patchFilters({ orden: filters.orden === "asc" ? "desc" : "asc" });
    };

    const clearFilters = () => {
        setSearch("");
        visitCatalog(EMPTY_FILTERS);
    };

    return (
        <Layout1>
            <SeoHead seo={seo} />
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-400">
                        Tablas segunda mano · San Sebastian Surf School
                    </p>
                    <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                        Tablas de segunda mano
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Tablas revisadas por la escuela. Las puedes ver en el club (Zurriola, Donostia);
                        recogida en tienda, sin envío.
                    </p>
                    {total > 0 && (
                        <p className="mt-3 text-sm font-semibold text-emerald-400">
                            {total} tabla{total !== 1 ? "s" : ""} en el catálogo
                            {hasActiveFilters && matched !== total ? (
                                <span className="font-normal text-slate-400">
                                    {" "}
                                    · {matched} coinciden con tu búsqueda
                                </span>
                            ) : null}
                        </p>
                    )}
                </div>

                <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                            type="search"
                            placeholder="Buscar por nombre o marca…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-orange-400/50 focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <FilterSelect
                            label="Tipo"
                            value={filters.tipo}
                            onChange={(value) => patchFilters({ tipo: value })}
                            options={filterOptions.type}
                        />
                        <FilterSelect
                            label="Altura"
                            value={filters.altura}
                            onChange={(value) => patchFilters({ altura: value })}
                            options={filterOptions.height}
                        />
                        <FilterSelect
                            label="Volumen"
                            value={filters.volumen}
                            onChange={(value) => patchFilters({ volumen: value })}
                            options={filterOptions.volume}
                        />
                        <FilterSelect
                            label="Franja de precio"
                            value={filters.precio}
                            onChange={(value) => patchFilters({ precio: value })}
                            options={filterOptions.price}
                        />

                        <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                Precio
                            </span>
                            <button
                                type="button"
                                onClick={togglePriceSort}
                                aria-label={
                                    filters.orden === "asc"
                                        ? "Ordenado de menor a mayor. Clic para ordenar de mayor a menor"
                                        : filters.orden === "desc"
                                          ? "Ordenado de mayor a menor. Clic para ordenar de menor a mayor"
                                          : "Ordenar por precio"
                                }
                                className={`${sortButtonClass} ${
                                    filters.orden ? "border-orange-400/40 text-orange-100" : ""
                                }`}
                            >
                                <span>
                                    {filters.orden === "asc"
                                        ? "Menor a mayor"
                                        : filters.orden === "desc"
                                          ? "Mayor a menor"
                                          : "Ordenar por precio"}
                                </span>
                                {filters.orden === "asc" ? (
                                    <ArrowUp className="h-4 w-4 shrink-0 text-orange-400" aria-hidden />
                                ) : filters.orden === "desc" ? (
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

                {boards.length === 0 ? (
                    <EmptyCatalog
                        hasActiveFilters={hasActiveFilters}
                        total={total}
                        onClear={clearFilters}
                        emptyStockWhatsapp={emptyStockWhatsapp}
                        browseWhatsapp={browseWhatsapp}
                    />
                ) : (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4 xl:gap-5">
                        {boards.map((board, index) => (
                            <BoardCard
                                key={board.id}
                                board={board}
                                loading={index < 4 ? "eager" : "lazy"}
                                fetchPriority={index === 0 ? "high" : "auto"}
                            />
                        ))}
                    </div>
                )}
            </div>
        </Layout1>
    );
}

function FilterSelect({ label, value, onChange, options = [] }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={selectClass}
            >
                {options.map((f) => (
                    <option key={f.value} value={f.value} className="bg-slate-900 text-slate-100">
                        {f.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

function EmptyCatalog({ hasActiveFilters, total, onClear, emptyStockWhatsapp, browseWhatsapp }) {
    const whatsappHref = total === 0 ? emptyStockWhatsapp : browseWhatsapp;

    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <Tag className="mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm font-medium text-slate-400">
                {total === 0
                    ? "No hay tablas en el catálogo en este momento."
                    : "No hay tablas que coincidan con tu búsqueda."}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                {hasActiveFilters && total > 0 ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400"
                    >
                        Ver todas las tablas
                    </button>
                ) : null}
                {whatsappHref ? (
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/20"
                    >
                        <WhatsAppIcon className="h-4 w-4" />
                        Consultar por WhatsApp
                    </a>
                ) : (
                    <Link
                        href={route("contacto")}
                        className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                    >
                        Ir a contacto
                    </Link>
                )}
                <Link
                    href={route("rentals.surfboards.index")}
                    className="rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-white/10"
                >
                    Ver alquiler
                </Link>
            </div>
        </div>
    );
}
