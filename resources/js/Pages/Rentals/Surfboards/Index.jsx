import React, { useEffect, useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import EmptyState from "../../../components/EmptyState";
import SafeImage from "../../../components/SafeImage";

function imageUrlFor(surfboard) {
    if (surfboard.first_image_url) return surfboard.first_image_url;
    if (!surfboard.image_url) return null;
    try {
        const parsed = JSON.parse(surfboard.image_url);
        if (Array.isArray(parsed) && parsed[0]) return `/storage/${String(parsed[0]).replace(/^\/+/, "")}`;
    } catch {
        // ignore
    }
    const p = surfboard.image_url;
    return String(p).startsWith("http") ? p : `/storage/${String(p).replace(/^\/+/, "")}`;
}

function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "—";
    return `${n.toFixed(2).replace(".", ",")} €`;
}

function imageListFor(surfboard) {
    if (!surfboard) return [];
    const list = [];
    if (surfboard.first_image_url) list.push(surfboard.first_image_url);
    if (surfboard.image_url) {
        try {
            const parsed = JSON.parse(surfboard.image_url);
            if (Array.isArray(parsed)) {
                parsed.forEach((p) => list.push(String(p).startsWith("http") ? p : `/storage/${String(p).replace(/^\/+/, "")}`));
            } else {
                list.push(String(surfboard.image_url).startsWith("http") ? surfboard.image_url : `/storage/${String(surfboard.image_url).replace(/^\/+/, "")}`);
            }
        } catch {
            list.push(String(surfboard.image_url).startsWith("http") ? surfboard.image_url : `/storage/${String(surfboard.image_url).replace(/^\/+/, "")}`);
        }
    }
    return [...new Set(list.filter(Boolean))];
}

export default function Index({ surfboards, category }) {
    const allBoards = surfboards || [];
    const [activeCategory, setActiveCategory] = useState(category || "all");
    const [selectedId, setSelectedId] = useState(null);
    const [activeImage, setActiveImage] = useState(null);

    const counts = useMemo(() => {
        const all = allBoards;
        const soft = all.filter((s) => s.category === "soft").length;
        const hard = all.filter((s) => s.category === "hard").length;
        return { all: all.length, soft, hard };
    }, [allBoards]);

    const filteredBoards = useMemo(() => {
        if (activeCategory === "all") return allBoards;
        return allBoards.filter((s) => s.category === activeCategory);
    }, [allBoards, activeCategory]);

    useEffect(() => {
        if (!filteredBoards.length) {
            setSelectedId(null);
            return;
        }
        if (!selectedId || !filteredBoards.some((s) => s.id === selectedId)) {
            setSelectedId(filteredBoards[0].id);
        }
    }, [filteredBoards, selectedId]);

    const selectedBoard = useMemo(
        () => filteredBoards.find((s) => s.id === selectedId) || null,
        [filteredBoards, selectedId]
    );
    const selectedImages = useMemo(() => imageListFor(selectedBoard), [selectedBoard]);

    useEffect(() => {
        setActiveImage(selectedImages[0] || null);
    }, [selectedBoard, selectedImages]);

    return (
        <>
            <Head title="Tablas de alquiler" />
            <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6" style={{ fontFamily: "'Inter', 'Geist', sans-serif" }}>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5">
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-800">
                            Tablas de alquiler
                            </h1>
                            <p className="mt-1 text-sm text-slate-600">
                            Consulta disponibilidad y reserva en segundos.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filtros de categoría">
                                {[
                                    { id: "all", label: `Todas (${counts.all})` },
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

                        <div className="h-[70vh] overflow-y-auto p-3">
                            {filteredBoards.length === 0 ? (
                                <EmptyState
                                    title="No hay tablas en esta categoría"
                                    description="Prueba con otro filtro para ver disponibilidad."
                                />
                            ) : (
                                <div className="space-y-2">
                                    {filteredBoards.map((s) => {
                                        const name = s.name || `Tabla #${s.id}`;
                                        const imgUrl = imageUrlFor(s);
                                        const selected = selectedId === s.id;
                                        return (
                                            <button
                                                key={s.id}
                                                type="button"
                                                onClick={() => setSelectedId(s.id)}
                                                className={`group flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                                                    selected
                                                        ? "border-sky-400 bg-sky-50 shadow-sm"
                                                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className="h-20 w-20 overflow-hidden rounded-lg bg-slate-100">
                                                    <SafeImage
                                                        src={imgUrl}
                                                        alt={s.image_alt || name}
                                                        className="h-full w-full object-cover"
                                                        placeholderClassName="rounded-lg"
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-base font-semibold text-slate-900">{name}</p>
                                                    <p className="text-xs uppercase tracking-wide text-slate-500">
                                                        {s.category === "soft" ? "Softboard" : "Hardboard"}
                                                    </p>
                                                    <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                        Disponible
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="h-[80vh] overflow-y-auto p-5">
                            {!selectedBoard ? (
                                <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                                    <div>
                                        <p className="text-lg font-semibold text-slate-800">Selecciona una tabla para ver los detalles</p>
                                        <p className="mt-1 text-sm text-slate-600">Aquí verás imágenes, especificaciones y opciones de reserva.</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                        <div className="aspect-[16/10] w-full overflow-hidden">
                                            <SafeImage
                                                src={activeImage || imageUrlFor(selectedBoard)}
                                                alt={selectedBoard.image_alt || selectedBoard.name || "Tabla"}
                                                className="h-full w-full object-cover"
                                                placeholderClassName="rounded-none"
                                            />
                                        </div>
                                    </div>

                                    {selectedImages.length > 1 ? (
                                        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                                            {selectedImages.map((img) => (
                                                <button
                                                    key={img}
                                                    type="button"
                                                    onClick={() => setActiveImage(img)}
                                                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                                                        activeImage === img ? "border-sky-500" : "border-slate-200"
                                                    }`}
                                                >
                                                    <SafeImage src={img} alt="Miniatura tabla" className="h-full w-full object-cover" />
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div className="mt-6">
                                        <h2 className="text-4xl font-extrabold tracking-tight text-slate-900">
                                            {selectedBoard.name || `Tabla #${selectedBoard.id}`}
                                        </h2>
                                        <p className="mt-2 text-sm text-slate-600">
                                            {selectedBoard.description || "Tabla premium optimizada para rendimiento, estabilidad y control en distintas condiciones de mar."}
                                        </p>
                                    </div>

                                    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                                        <p className="text-sm font-bold uppercase tracking-wide text-slate-500">Especificaciones técnicas</p>
                                        <dl className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                                            <div className="rounded-lg bg-slate-50 p-3">
                                                <dt className="text-xs text-slate-500">Volumen</dt>
                                                <dd className="mt-1 font-semibold text-slate-900">{selectedBoard.volume || "—"} {selectedBoard.volume ? "L" : ""}</dd>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 p-3">
                                                <dt className="text-xs text-slate-500">Medidas</dt>
                                                <dd className="mt-1 font-semibold text-slate-900">{selectedBoard.dimensions || selectedBoard.size || "—"}</dd>
                                            </div>
                                            <div className="rounded-lg bg-slate-50 p-3">
                                                <dt className="text-xs text-slate-500">Material</dt>
                                                <dd className="mt-1 font-semibold text-slate-900">{selectedBoard.material || "Epoxy / Foam"}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Precio 24h</p>
                                            <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatMoney(selectedBoard.price_schema?.price_24h)}</p>
                                            <Link
                                                href={route("rentals.surfboards.show", selectedBoard.id)}
                                                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                                            >
                                                Añadir a la Reserva
                                            </Link>
                                        </div>
                                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                                            <p className="text-xs uppercase tracking-wide text-slate-500">Precio semana</p>
                                            <p className="mt-1 text-2xl font-extrabold text-slate-900">{formatMoney(selectedBoard.price_schema?.price_week)}</p>
                                            <Link
                                                href={route("rentals.surfboards.show", selectedBoard.id)}
                                                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                            >
                                                Ver calendario y reservar
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                        <p className="text-sm font-semibold text-slate-700">Calendario (vista rápida)</p>
                                        <p className="mt-1 text-sm text-slate-600">
                                            Selecciona fechas y franja horaria en la vista de reserva de esta tabla.
                                        </p>
                                        <Link
                                            href={route("rentals.surfboards.show", selectedBoard.id)}
                                            className="mt-3 inline-flex items-center text-sm font-semibold text-sky-700 hover:text-sky-800"
                                        >
                                            Abrir calendario interactivo →
                                        </Link>
                                    </div>
                                </>
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
        </>
    );
}
