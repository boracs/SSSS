import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { ChevronDown, Plus } from "lucide-react";
import EmptyState from "../../../components/EmptyState";
import ImageLightbox from "../../../components/ImageLightbox";
import SafeImage from "../../../components/SafeImage";
import SurfboardBookingSection from "../../../components/SurfboardBookingSection";

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
                            className="group relative h-32 w-48 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-sky-400 hover:shadow-md"
                        >
                            <SafeImage
                                src={img}
                                alt={board.image_alt || name}
                                className="pointer-events-none h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                placeholderClassName="rounded-none"
                            />
                            <span
                                className="pointer-events-none absolute bottom-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/70 text-white shadow-lg ring-1 ring-white/30 backdrop-blur-sm transition group-hover:bg-sky-600/90"
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

            <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900">
                {name}
            </h2>

            {/* Especificaciones técnicas */}
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Especificaciones técnicas
                </p>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                    {[
                        { label: "Altura",  value: board.altura },
                        { label: "Anchura", value: board.ancho },
                        { label: "Grosor",  value: board.grosor },
                        {
                            label: "Volumen",
                            value: board.volumen ? `${board.volumen} L` : null,
                        },
                    ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-slate-50 p-3">
                            <dt className="text-xs text-slate-500">{label}</dt>
                            <dd className="mt-1 font-semibold text-slate-900">
                                {value || "—"}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>

            {/* Descripción */}
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
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

    const closeLightbox = useCallback(() => setLightbox(null), []);

    const counts = useMemo(() => {
        const soft = allBoards.filter((s) => s.category === "soft").length;
        const hard = allBoards.filter((s) => s.category === "hard").length;
        return { all: allBoards.length, soft, hard };
    }, [allBoards]);

    const filteredBoards = useMemo(() => {
        if (activeCategory === "all") return allBoards;
        return allBoards.filter((s) => s.category === activeCategory);
    }, [allBoards, activeCategory]);

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
            <div
                className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6"
                style={{ fontFamily: "'Inter', 'Geist', sans-serif" }}
            >
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                    {/* ── Catálogo ── */}
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        {/* Cabecera con título + filtros */}
                        <div className="border-b border-slate-100 p-5">
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                                Tablas de alquiler
                            </h1>
                            <p className="mt-1 text-sm text-slate-600">
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
                                        className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-inset transition-colors ${
                                            activeCategory === f.id
                                                ? "bg-sky-900 text-white ring-sky-900"
                                                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 hover:text-slate-800"
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Lista de tablas */}
                        <div className="p-3">
                            {filteredBoards.length === 0 ? (
                                <EmptyState
                                    title="No hay tablas en esta categoría"
                                    description="Prueba con otro filtro para ver disponibilidad."
                                />
                            ) : (
                                <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
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
                                                    className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                                        selected
                                                            ? "border-sky-400 bg-sky-50 shadow-sm"
                                                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
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
                                                        <p className="truncate text-base font-semibold text-slate-900">
                                                            {name}
                                                        </p>
                                                        <p className="text-xs uppercase tracking-wide text-slate-500">
                                                            {s.category === "soft" ? "Softboard" : "Hardboard"}
                                                        </p>
                                                    </div>
                                                    <span
                                                        className={`md:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                                                            selected
                                                                ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-200"
                                                                : "bg-slate-100 text-slate-500 ring-1 ring-slate-200 group-hover:bg-sky-50 group-hover:text-sky-700 group-hover:ring-sky-200"
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
                                                    <div className="md:hidden col-span-1 overflow-hidden rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out">
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
                    <section className="hidden md:block rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="p-5">
                            {!selectedBoard ? (
                                <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                    <div>
                                        <p className="text-lg font-semibold text-slate-800">
                                            Selecciona una tabla para ver los detalles
                                        </p>
                                        <p className="mt-1 text-sm text-slate-600">
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

            <ImageLightbox
                open={Boolean(lightbox?.src)}
                src={lightbox?.src ?? null}
                alt={lightbox?.alt ?? "Imagen de la tabla"}
                onClose={closeLightbox}
            />
        </>
    );
}
