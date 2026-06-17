import React, { useEffect, useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import EmptyState from "../../../components/EmptyState";
import SafeImage from "../../../components/SafeImage";

function imageUrlFor(surfboard) {
    if (surfboard.first_image_url) return surfboard.first_image_url;
    if (!surfboard.image_url) return null;
    try {
        const parsed = JSON.parse(surfboard.image_url);
        if (Array.isArray(parsed) && parsed[0])
            return `/storage/${String(parsed[0]).replace(/^\/+/, "")}`;
    } catch {
        // ignore
    }
    const p = surfboard.image_url;
    return String(p).startsWith("http")
        ? p
        : `/storage/${String(p).replace(/^\/+/, "")}`;
}

function imageListFor(surfboard) {
    if (!surfboard) return [];
    const list = [];
    if (surfboard.first_image_url) list.push(surfboard.first_image_url);
    if (surfboard.image_url) {
        try {
            const parsed = JSON.parse(surfboard.image_url);
            if (Array.isArray(parsed)) {
                parsed.forEach((p) =>
                    list.push(
                        String(p).startsWith("http")
                            ? p
                            : `/storage/${String(p).replace(/^\/+/, "")}`,
                    ),
                );
            } else {
                list.push(
                    String(surfboard.image_url).startsWith("http")
                        ? surfboard.image_url
                        : `/storage/${String(surfboard.image_url).replace(/^\/+/, "")}`,
                );
            }
        } catch {
            list.push(
                String(surfboard.image_url).startsWith("http")
                    ? surfboard.image_url
                    : `/storage/${String(surfboard.image_url).replace(/^\/+/, "")}`,
            );
        }
    }
    return [...new Set(list.filter(Boolean))];
}

/** Bloque de detalle reutilizado tanto en el acordeón móvil como en el panel lateral de escritorio. */
function BoardDetail({ board, onImageClick }) {
    const images = useMemo(() => imageListFor(board), [board]);
    const name = board.name || `Tabla #${board.id}`;

    return (
        <>
            {/* Imágenes mini en fila — clic abre modal */}
            <div className="flex flex-wrap gap-2">
                {(images.length ? images : [imageUrlFor(board)]).map(
                    (img, i) => (
                        <button
                            key={img || i}
                            type="button"
                            onClick={() => onImageClick(img)}
                            aria-label="Ampliar imagen"
                            className="group h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 transition hover:border-sky-300"
                        >
                            <SafeImage
                                src={img}
                                alt={board.image_alt || name}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                placeholderClassName="rounded-none"
                            />
                        </button>
                    ),
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

            {/* Botón único de reserva */}
            <Link
                href={route("rentals.surfboards.show", board.id)}
                className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-sky-700"
            >
                Reservar
            </Link>
        </>
    );
}

export default function Index({ surfboards, category }) {
    const allBoards = (surfboards || []).filter((s) => {
        const active = s.is_active ?? s.isActive;
        return active === true || active === 1;
    });

    const [activeCategory, setActiveCategory] = useState(category || "all");
    const [selectedId, setSelectedId]         = useState(null);
    const [modalImage, setModalImage]         = useState(null);

    /* Bloquea scroll del body cuando el modal está abierto */
    useEffect(() => {
        if (!modalImage) return;
        const onKey = (e) => { if (e.key === "Escape") setModalImage(null); };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [modalImage]);

    const counts = useMemo(() => {
        const soft = allBoards.filter((s) => s.category === "soft").length;
        const hard = allBoards.filter((s) => s.category === "hard").length;
        return { all: allBoards.length, soft, hard };
    }, [allBoards]);

    const filteredBoards = useMemo(() => {
        if (activeCategory === "all") return allBoards;
        return allBoards.filter((s) => s.category === activeCategory);
    }, [allBoards, activeCategory]);

    /* Auto-selecciona el primero al cambiar filtro */
    useEffect(() => {
        if (!filteredBoards.length) { setSelectedId(null); return; }
        if (!selectedId || !filteredBoards.some((s) => s.id === selectedId)) {
            setSelectedId(filteredBoards[0].id);
        }
    }, [filteredBoards, selectedId]);

    const selectedBoard = useMemo(
        () => filteredBoards.find((s) => s.id === selectedId) || null,
        [filteredBoards, selectedId],
    );

    /* Toggle: clic en la tarjeta ya seleccionada la deselecciona (cierra el acordeón) */
    const handleCardClick = (id) =>
        setSelectedId((prev) => (prev === id ? null : id));

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
                                        onClick={() => setActiveCategory(f.id)}
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
                                                    {/* Chevron indicador — solo visible en móvil */}
                                                    <svg
                                                        className={`md:hidden h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${selected ? "rotate-180" : ""}`}
                                                        fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                {/* ── Acordeón móvil: solo < md ── */}
                                                {selected && (
                                                    <div className="md:hidden col-span-1 overflow-hidden rounded-xl border border-sky-100 bg-white p-4 shadow-sm transition-all duration-300 ease-in-out">
                                                        <BoardDetail
                                                            board={s}
                                                            onImageClick={setModalImage}
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
                                    onImageClick={setModalImage}
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

            {/* Modal de imagen a pantalla completa */}
            {modalImage ? (
                <div
                    className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm sm:p-8"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Imagen ampliada"
                    onClick={() => setModalImage(null)}
                >
                    <button
                        type="button"
                        onClick={() => setModalImage(null)}
                        aria-label="Cerrar"
                        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/30 transition hover:bg-white/20 sm:right-6 sm:top-6"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    <div
                        className="flex max-h-full w-full max-w-4xl items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SafeImage
                            src={modalImage}
                            alt="Imagen de la tabla"
                            className="max-h-[85vh] w-auto max-w-full rounded-2xl object-contain"
                            placeholderClassName="h-[60vh] w-full rounded-2xl"
                        />
                    </div>
                </div>
            ) : null}
        </>
    );
}
