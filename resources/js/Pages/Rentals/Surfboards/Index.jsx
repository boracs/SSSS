import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@inertiajs/react";
import { ChevronDown, RotateCcw } from "lucide-react";
import EmptyState from "../../../components/EmptyState";
import ImageLightbox from "../../../components/ImageLightbox";
import SafeImage from "../../../components/SafeImage";
import RentalTariffTable from "../../../components/Rentals/RentalTariffTable";
import SurfboardPublicDetail from "../../../components/Rentals/SurfboardPublicDetail";
import SeoHead from "../../../components/seo/SeoHead";
import {
    boardMatchesMeasureFilters,
    buildSurfHeightOptions,
    buildVolumeOptions,
    formatSurfHeight,
} from "../../../lib/surfboardMeasures";
import {
    BOARD_CATEGORIES,
    boardCategoryLabel,
    catalogFromPriceLabel,
    imageUrlFor,
} from "../../../lib/surfboardPublicDisplay";

const HEIGHT_OPTIONS = buildSurfHeightOptions(3, 5, 11, 0);
const VOLUME_OPTIONS = buildVolumeOptions(15, 100, 1);

const selectClass =
    "w-full rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-100 outline-none transition hover:border-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30";

export default function Index({
    surfboards,
    category,
    tariffTable = null,
    rentalPolicy = null,
    paymentIban = "[IBAN]",
    paymentBizumNumber = "[BIZUM_NUMBER]",
    whatsappHelpUrl = null,
    seo = null,
}) {
    const allBoards = (surfboards || []).filter((s) => {
        const active = s.is_active ?? s.isActive;
        return active === true || active === 1;
    });

    const [activeCategory, setActiveCategory] = useState(category || "all");
    const [selectedId, setSelectedId]         = useState(null);
    const [lightbox, setLightbox]             = useState(null);
    const [volumeMin, setVolumeMin]           = useState("");
    const [volumeMax, setVolumeMax]           = useState("");
    const [heightMin, setHeightMin]           = useState("");
    const [heightMax, setHeightMax]           = useState("");
    /** true = panel lateral (≥1024px); false = acordeón bajo la tarjeta (móvil/tablet) */
    const [isLgUp, setIsLgUp] = useState(() =>
        typeof window !== "undefined" && window.matchMedia
            ? window.matchMedia("(min-width: 1024px)").matches
            : false,
    );

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return undefined;
        const mq = window.matchMedia("(min-width: 1024px)");
        const sync = () => setIsLgUp(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    const closeLightbox = useCallback(() => setLightbox(null), []);

    const hasMeasureFilters =
        volumeMin !== "" || volumeMax !== "" || heightMin !== "" || heightMax !== "";

    const clearMeasureFilters = () => {
        setVolumeMin("");
        setVolumeMax("");
        setHeightMin("");
        setHeightMax("");
        setSelectedId(null);
    };

    const handleHeightMinChange = (value) => {
        setHeightMin(value);
        if (value !== "" && heightMax !== "" && Number(value) > Number(heightMax)) {
            setHeightMax(value);
        }
        setSelectedId(null);
    };

    const handleHeightMaxChange = (value) => {
        setHeightMax(value);
        if (value !== "" && heightMin !== "" && Number(value) < Number(heightMin)) {
            setHeightMin(value);
        }
        setSelectedId(null);
    };

    const handleVolumeMinChange = (value) => {
        setVolumeMin(value);
        if (value !== "" && volumeMax !== "" && Number(value) > Number(volumeMax)) {
            setVolumeMax(value);
        }
        setSelectedId(null);
    };

    const handleVolumeMaxChange = (value) => {
        setVolumeMax(value);
        if (value !== "" && volumeMin !== "" && Number(value) < Number(volumeMin)) {
            setVolumeMin(value);
        }
        setSelectedId(null);
    };

    const categoryTabs = useMemo(() => {
        const tabs = BOARD_CATEGORIES.map(({ id, label }) => ({
            id,
            label: `${label} (${allBoards.filter((s) => s.category === id).length})`,
        }));
        return [{ id: "all", label: `Todas (${allBoards.length})` }, ...tabs];
    }, [allBoards]);

    const filteredBoards = useMemo(() => {
        const measureFilters = { volumeMin, volumeMax, heightMin, heightMax };

        return allBoards.filter((s) => {
            if (activeCategory !== "all" && s.category !== activeCategory) {
                return false;
            }
            return boardMatchesMeasureFilters(s, measureFilters);
        });
    }, [allBoards, activeCategory, volumeMin, volumeMax, heightMin, heightMax]);

    /* Si la tabla abierta deja de estar en el filtro, cerrar sin abrir otra */
    useEffect(() => {
        if (selectedId && !filteredBoards.some((s) => s.id === selectedId)) {
            setSelectedId(null);
        }
    }, [filteredBoards, selectedId]);

    const selectedBoard = useMemo(
        () => filteredBoards.find((s) => s.id === selectedId) || null,
        [filteredBoards, selectedId],
    );

    /* Toggle: abrir al clicar; cerrar si ya estaba abierta */
    const handleCardClick = (id) =>
        setSelectedId((prev) => (prev === id ? null : id));

    const handleCategoryChange = (categoryId) => {
        setActiveCategory(categoryId);
        setSelectedId(null);
    };

    return (
        <>
            <SeoHead seo={seo} />
            <div className="min-h-screen bg-black py-6 sm:py-8">
                <div
                    className="mx-auto w-full max-w-7xl rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 px-4 py-6 shadow-sm sm:px-6 lg:px-7"
                    style={{ fontFamily: "'Inter', 'Geist', sans-serif" }}
                >
                    <RentalTariffTable tariffTable={tariffTable} />

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* ── Catálogo ── */}
                    <section className="rounded-3xl border border-slate-700 bg-slate-900/95 shadow-sm backdrop-blur">
                        {/* Cabecera con título + filtros */}
                        <div className="border-b border-slate-700 p-6">
                            <h1 className="text-[32px] font-extrabold tracking-tight text-slate-100">
                                Tablas de alquiler
                            </h1>
                            <p className="mt-1 text-sm text-slate-300">
                                Consulta disponibilidad y reserva en segundos.
                            </p>
                            <div
                                className="mt-4 flex flex-wrap gap-2"
                                role="tablist"
                                aria-label="Filtros de categoría"
                            >
                                {categoryTabs.map((f) => (
                                    <button
                                        key={f.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={activeCategory === f.id}
                                        onClick={() => handleCategoryChange(f.id)}
                                        className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition-all duration-200 ${
                                            activeCategory === f.id
                                                ? "bg-cyan-600 text-white ring-cyan-500"
                                                : "bg-slate-900 text-slate-300 ring-slate-600 hover:-translate-y-px hover:bg-slate-800 hover:text-slate-100"
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-800/70 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-300">
                                        Filtros por medidas
                                    </p>
                                    {hasMeasureFilters ? (
                                        <button
                                            type="button"
                                            onClick={clearMeasureFilters}
                                            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-500/15"
                                        >
                                            <RotateCcw className="h-3.5 w-3.5" />
                                            Limpiar
                                        </button>
                                    ) : null}
                                </div>

                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-semibold text-slate-300">
                                            Altura mínima
                                        </span>
                                        <select
                                            value={heightMin}
                                            onChange={(e) => handleHeightMinChange(e.target.value)}
                                            className={selectClass}
                                            aria-label="Altura mínima de tabla"
                                        >
                                            {HEIGHT_OPTIONS.map((opt) => (
                                                <option key={`hmin-${opt.value || "any"}`} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-semibold text-slate-300">
                                            Altura máxima
                                        </span>
                                        <select
                                            value={heightMax}
                                            onChange={(e) => handleHeightMaxChange(e.target.value)}
                                            className={selectClass}
                                            aria-label="Altura máxima de tabla"
                                        >
                                            {HEIGHT_OPTIONS.map((opt) => (
                                                <option key={`hmax-${opt.value || "any"}`} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-semibold text-slate-300">
                                            Volumen mínimo
                                        </span>
                                        <select
                                            value={volumeMin}
                                            onChange={(e) => handleVolumeMinChange(e.target.value)}
                                            className={selectClass}
                                            aria-label="Volumen mínimo en litros"
                                        >
                                            {VOLUME_OPTIONS.map((opt) => (
                                                <option key={`vmin-${opt.value || "any"}`} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="block">
                                        <span className="mb-1 block text-[11px] font-semibold text-slate-300">
                                            Volumen máximo
                                        </span>
                                        <select
                                            value={volumeMax}
                                            onChange={(e) => handleVolumeMaxChange(e.target.value)}
                                            className={selectClass}
                                            aria-label="Volumen máximo en litros"
                                        >
                                            {VOLUME_OPTIONS.map((opt) => (
                                                <option key={`vmax-${opt.value || "any"}`} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                                    Alturas en pies y pulgadas (3&apos;5&quot; → 11&apos;0&quot;). Ej.: 6&apos;2&quot; = entre 6&apos;0&quot; y 6&apos;2&quot;.
                                    {" "}Traducción rápida: 1 pie = 30,48 cm · 1 pulgada = 2,54 cm.
                                </p>
                            </div>
                        </div>

                        {/* Lista de tablas */}
                        <div className="p-3">
                            {filteredBoards.length === 0 ? (
                                <EmptyState
                                    title={
                                        hasMeasureFilters
                                            ? "Ninguna tabla coincide con los filtros"
                                            : "No hay tablas en esta categoría"
                                    }
                                    description={
                                        hasMeasureFilters
                                            ? "Prueba ampliando el rango de altura o volumen, o limpia los filtros."
                                            : "Prueba con otro filtro para ver disponibilidad."
                                    }
                                    action={
                                        hasMeasureFilters ? (
                                            <button
                                                type="button"
                                                onClick={clearMeasureFilters}
                                                className="inline-flex items-center rounded-xl bg-cyan-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-600"
                                            >
                                                Limpiar filtros
                                            </button>
                                        ) : null
                                    }
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-2">
                                    {filteredBoards.map((s) => {
                                        const name     = s.name || `Tabla #${s.id}`;
                                        const imgUrl   = imageUrlFor(s);
                                        const selected = selectedId === s.id;
                                        const fromPrice = catalogFromPriceLabel(s.price_schema);
                                        const metaParts = [
                                            boardCategoryLabel(s.category),
                                            s.altura ? formatSurfHeight(s.altura) : null,
                                            s.volumen ? `${parseFloat(s.volumen)} L` : null,
                                        ].filter(Boolean);
                                        return (
                                            /* Tarjeta + acordeón en el mismo celda: en <lg el detalle cae justo debajo */
                                            <div key={s.id} className="flex flex-col gap-2.5">
                                                <div
                                                    className={`group rounded-2xl border p-3 transition-all duration-200 ${
                                                        selected
                                                            ? "border-cyan-400 bg-cyan-500/10 shadow-sm"
                                                            : "border-slate-700 bg-slate-900 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800/80 hover:shadow-sm"
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCardClick(s.id)}
                                                        aria-expanded={selected}
                                                        aria-label={`${selected ? "Cerrar" : "Abrir"} detalles de ${name}`}
                                                        className="flex w-full items-start gap-3 text-left"
                                                    >
                                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                                            <SafeImage
                                                                src={imgUrl}
                                                                alt={s.image_alt || name}
                                                                className="h-full w-full object-cover"
                                                                placeholderClassName="rounded-lg"
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate font-heading text-[15px] font-semibold text-slate-100">
                                                                {name}
                                                            </p>
                                                            <p className="mt-0.5 truncate text-xs uppercase tracking-wide text-slate-400">
                                                                {metaParts.join(" · ")}
                                                            </p>
                                                            {fromPrice ? (
                                                                <p className="mt-0.5 truncate text-xs font-medium text-cyan-300/90">
                                                                    {fromPrice}
                                                                </p>
                                                            ) : null}
                                                        </div>
                                                        {!isLgUp ? (
                                                            <span
                                                                className={`mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                                                                    selected
                                                                        ? "bg-cyan-600 text-white shadow-md ring-2 ring-cyan-200"
                                                                        : "bg-slate-800 text-slate-300 ring-1 ring-slate-600 group-hover:bg-cyan-500/15 group-hover:text-cyan-300 group-hover:ring-cyan-500/40"
                                                                }`}
                                                                aria-hidden="true"
                                                            >
                                                                <ChevronDown
                                                                    className={`h-5 w-5 transition-transform duration-300 ${selected ? "rotate-180" : ""}`}
                                                                    strokeWidth={2.5}
                                                                />
                                                            </span>
                                                        ) : null}
                                                    </button>
                                                    <div className="mt-2 flex justify-end border-t border-white/5 pt-2">
                                                        <Link
                                                            href={route("rentals.surfboards.show", s.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-cyan-300/90 transition hover:bg-cyan-500/15 hover:text-cyan-200"
                                                        >
                                                            Ver ficha
                                                        </Link>
                                                    </div>
                                                </div>

                                                {/* Acordeón: solo en <lg, montado justo debajo de ESTA tarjeta */}
                                                {selected && !isLgUp ? (
                                                    <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/95 p-4 shadow-sm transition-all duration-300 ease-in-out sm:p-5">
                                                        <SurfboardPublicDetail
                                                            board={s}
                                                            onImageClick={setLightbox}
                                                            paymentIban={paymentIban}
                                                            paymentBizumNumber={paymentBizumNumber}
                                                            whatsappHelpUrl={whatsappHelpUrl}
                                                            rentalPolicy={rentalPolicy}
                                                            titleAs="h2"
                                                        />
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Panel lateral: solo montado en ≥lg (nunca debajo de la lista en tablet) */}
                    {isLgUp ? (
                    <section className="rounded-3xl border border-slate-700 bg-slate-900/95 shadow-sm backdrop-blur">
                        <div className="p-6">
                            {!selectedBoard ? (
                                <div className="grid place-items-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-8 text-center">
                                    <div>
                                        <p className="text-lg font-semibold text-slate-100">
                                            Selecciona una tabla para ver los detalles
                                        </p>
                                        <p className="mt-1 text-sm text-slate-400">
                                            Aquí verás imágenes, especificaciones y opciones de reserva.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <SurfboardPublicDetail
                                    board={selectedBoard}
                                    onImageClick={setLightbox}
                                    paymentIban={paymentIban}
                                    paymentBizumNumber={paymentBizumNumber}
                                    whatsappHelpUrl={whatsappHelpUrl}
                                    rentalPolicy={rentalPolicy}
                                    titleAs="h2"
                                />
                            )}
                        </div>
                    </section>
                    ) : null}
                </div>

                    {allBoards.length === 0 && (
                        <div className="mt-8">
                            <EmptyState
                                title="No hay tablas en este momento"
                                description="No hay tablas activas para esta categoría. Prueba con otra o vuelve más tarde."
                                action={
                                    <Link
                                        href={route("rentals.surfboards.index")}
                                        className="inline-flex items-center rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-primary/90"
                                    >
                                        Ver todas las categorías
                                    </Link>
                                }
                            />
                        </div>
                    )}
                </div>
            </div>

            <ImageLightbox
                open={Boolean(lightbox?.src)}
                src={lightbox?.src ?? null}
                alt={lightbox?.alt ?? "Imagen de la tabla"}
                onClose={closeLightbox}
            />
        </>
    );
}
