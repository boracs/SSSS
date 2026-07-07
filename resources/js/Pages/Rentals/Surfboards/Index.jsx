import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { ChevronDown, Plus, RotateCcw } from "lucide-react";
import EmptyState from "../../../components/EmptyState";
import ImageLightbox from "../../../components/ImageLightbox";
import SafeImage from "../../../components/SafeImage";
import SurfboardBookingSection from "../../../components/SurfboardBookingSection";
import {
    boardMatchesMeasureFilters,
    buildSurfHeightOptions,
    buildVolumeOptions,
    formatSurfHeight,
} from "../../../lib/surfboardMeasures";

const HEIGHT_OPTIONS = buildSurfHeightOptions(3, 5, 11, 0);
const VOLUME_OPTIONS = buildVolumeOptions(15, 100, 1);

const selectClass =
    "w-full rounded-lg border border-slate-600 bg-slate-900 px-2.5 py-1.5 text-sm font-medium text-slate-100 outline-none transition hover:border-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/30";

/** Imagen demo temporal — sustituir cuando cada tabla tenga foto real */
const DEMO_BOARD_IMAGE = "/img/tabla-demo.png";

function imageUrlFor(_surfboard) {
    return DEMO_BOARD_IMAGE;
}

function imageListFor(_surfboard) {
    return [DEMO_BOARD_IMAGE];
}

/** Bloque de detalle reutilizado tanto en el acordeón móvil como en el panel lateral de escritorio. */
function BoardDetail({
    board,
    onImageClick,
    paymentIban,
    paymentBizumNumber,
    whatsappHelpUrl,
}) {
    const images = useMemo(() => imageListFor(board), [board]);
    const name = board.name || `Tabla #${board.id}`;

    const displayImages = useMemo(() => {
        const list = images.length ? images : [imageUrlFor(board)].filter(Boolean);
        return list;
    }, [images, board]);

    const openImage = useCallback(
        (src) => {
            if (!src) return;
            onImageClick({ src, alt: board.image_alt || name });
        },
        [board.image_alt, name, onImageClick],
    );

    return (
        <>
            {/* Imagen principal — doble tamaño; + abre visor ampliado */}
            <div className="flex flex-wrap gap-3">
                {displayImages.length > 0 ? (
                    displayImages.map((img, i) => (
                        <button
                            key={img || i}
                            type="button"
                            onClick={() => openImage(img)}
                            aria-label="Ampliar imagen"
                            className="group relative h-32 w-48 shrink-0 cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400 hover:shadow-md"
                        >
                            <SafeImage
                                src={img}
                                alt={board.image_alt || name}
                                className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                placeholderClassName="rounded-none"
                            />
                            <span
                                className="pointer-events-none absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm transition group-hover:bg-cyan-600/90"
                                aria-hidden="true"
                            >
                                <Plus className="h-5 w-5" strokeWidth={2.5} />
                            </span>
                        </button>
                    ))
                ) : (
                    <div
                        className="flex h-32 w-48 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-xs text-slate-500"
                        aria-hidden="true"
                    >
                        Sin imagen
                    </div>
                )}
            </div>

            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-100">
                {name}
            </h2>

            {/* Especificaciones técnicas */}
            <div className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/80 p-4 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Especificaciones técnicas
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    {[
                        { label: "Altura",  value: formatSurfHeight(board.altura) },
                        { label: "Anchura", value: board.ancho },
                        { label: "Grosor",  value: board.grosor },
                        {
                            label: "Volumen",
                            value: board.volumen ? `${board.volumen} L` : null,
                        },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-slate-800/80 p-3">
                            <dt className="text-xs text-slate-400">{label}</dt>
                            <dd className="mt-1 text-[15px] font-semibold text-slate-100">
                                {value || "—"}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* Descripción */}
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
                {board.description ||
                    "Tabla premium optimizada para rendimiento, estabilidad y control en distintas condiciones de mar."}
            </p>

            <SurfboardBookingSection
                key={board.id}
                surfboard={board}
                paymentIban={paymentIban}
                paymentBizumNumber={paymentBizumNumber}
                whatsappHelpUrl={whatsappHelpUrl}
                embedded
            />
        </>
    );
}

export default function Index({
    surfboards,
    category,
    paymentIban = "[IBAN]",
    paymentBizumNumber = "[BIZUM_NUMBER]",
    whatsappHelpUrl = null,
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

    const counts = useMemo(() => {
        const soft = allBoards.filter((s) => s.category === "soft").length;
        const hard = allBoards.filter((s) => s.category === "hard").length;
        return { all: allBoards.length, soft, hard };
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
            <Head title="Tablas de alquiler" />
            <div className="min-h-screen bg-black py-6 sm:py-8">
                <div
                    className="mx-auto w-full max-w-7xl rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-900 px-4 py-6 shadow-sm sm:px-6 lg:px-7"
                    style={{ fontFamily: "'Inter', 'Geist', sans-serif" }}
                >
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
                                {[
                                    { id: "all",  label: `Todas (${counts.all})` },
                                    { id: "soft", label: `Softboards (${counts.soft})` },
                                    { id: "hard", label: `Hardboards (${counts.hard})` },
                                ].map((f) => (
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
                                                className="inline-flex items-center rounded-xl bg-sky-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
                                            >
                                                Limpiar filtros
                                            </button>
                                        ) : null
                                    }
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-3">
                                    {filteredBoards.map((s) => {
                                        const name     = s.name || `Tabla #${s.id}`;
                                        const imgUrl   = imageUrlFor(s);
                                        const selected = selectedId === s.id;
                                        return (
                                            /* Cada tarjeta + su acordeón móvil envueltos en un fragment */
                                            <React.Fragment key={s.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCardClick(s.id)}
                                                    aria-expanded={selected}
                                                    aria-label={`${selected ? "Cerrar" : "Abrir"} detalles de ${name}`}
                                                    className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all duration-200 ${
                                                        selected
                                                            ? "border-cyan-400 bg-cyan-500/10 shadow-sm"
                                                            : "border-slate-700 bg-slate-900 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800/80 hover:shadow-sm"
                                                    }`}
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
                                                        <p className="truncate text-[15px] font-semibold text-slate-100">
                                                            {name}
                                                        </p>
                                                        <p className="text-xs uppercase tracking-wide text-slate-400">
                                                            {s.category === "soft" ? "Softboard" : "Hardboard"}
                                                            {s.altura || s.volumen ? (
                                                                <>
                                                                    {" · "}
                                                                    {formatSurfHeight(s.altura)}
                                                                    {s.volumen ? ` · ${parseFloat(s.volumen)} L` : ""}
                                                                </>
                                                            ) : null}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`md:hidden inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
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
                                                </button>

                                                {/* ── Acordeón móvil: solo < md ── */}
                                                {selected && (
                                                    <div className="md:hidden col-span-1 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out">
                                                        <BoardDetail
                                                            board={s}
                                                            onImageClick={setLightbox}
                                                            paymentIban={paymentIban}
                                                            paymentBizumNumber={paymentBizumNumber}
                                                            whatsappHelpUrl={whatsappHelpUrl}
                                                        />
                                                    </div>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* ── Panel lateral — solo >= md ── */}
                    <section className="hidden md:block rounded-3xl border border-slate-700 bg-slate-900/95 shadow-sm backdrop-blur">
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
                                <BoardDetail
                                    board={selectedBoard}
                                    onImageClick={setLightbox}
                                    paymentIban={paymentIban}
                                    paymentBizumNumber={paymentBizumNumber}
                                    whatsappHelpUrl={whatsappHelpUrl}
                                />
                            )}
                        </div>
                    </section>
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
