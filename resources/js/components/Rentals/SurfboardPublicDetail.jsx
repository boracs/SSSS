import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import SafeImage from "../SafeImage";
import SurfboardBookingSection from "../SurfboardBookingSection";
import {
    boardDisplayDescription,
    boardSpecs,
    imageListFor,
    imageUrlFor,
    rentalPriceTeaser,
} from "../../lib/surfboardPublicDisplay";

/**
 * Ficha pública de alquiler (catálogo Index + página Show).
 * Superficie clara alineada con tienda (C3/C16).
 */
export default function SurfboardPublicDetail({
    board,
    onImageClick,
    whatsappHelpUrl,
    rentalPolicy = null,
    initialStart = null,
    initialEnd = null,
    titleAs = "h2",
}) {
    const name = board.name || `Tabla #${board.id}`;
    const TitleTag = titleAs === "h1" ? "h1" : "h2";

    const displayImages = useMemo(() => {
        const list = imageListFor(board);
        return list.length ? list : [imageUrlFor(board)].filter(Boolean);
    }, [board]);

    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        setActiveIndex(0);
    }, [board.id]);

    const activeSrc =
        displayImages[Math.min(activeIndex, Math.max(displayImages.length - 1, 0))] || null;

    const openImage = useCallback(
        (src) => {
            if (!src) return;
            onImageClick?.({ src, alt: board.image_alt || name });
        },
        [board.image_alt, name, onImageClick],
    );

    const description = boardDisplayDescription(board, name);
    const priceTeaser = rentalPriceTeaser(board.price_schema);
    const specs = boardSpecs(board);

    return (
        <div className="space-y-5 text-slate-800">
            <header>
                <TitleTag className="font-heading text-2xl font-extrabold tracking-tight text-s4 sm:text-3xl">
                    {name}
                </TitleTag>
            </header>

            <div aria-label="Galería de la tabla">
                {activeSrc ? (
                    <button
                        type="button"
                        onClick={() => openImage(activeSrc)}
                        aria-label="Ampliar imagen"
                        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 transition hover:border-cyan-400/60"
                    >
                        <div className="aspect-[4/3] w-full sm:aspect-[16/10]">
                            <SafeImage
                                src={activeSrc}
                                alt={board.image_alt || name}
                                className="pointer-events-none h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                                placeholderClassName="rounded-none"
                            />
                        </div>
                        <span
                            className="pointer-events-none absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-900/75 text-white shadow-lg ring-1 ring-white/25 backdrop-blur-sm transition group-hover:bg-cyan-600/95"
                            aria-hidden="true"
                        >
                            <Plus className="h-5 w-5" strokeWidth={2.5} />
                        </span>
                    </button>
                ) : (
                    <div
                        className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500 sm:aspect-[16/10]"
                        aria-hidden="true"
                    >
                        Sin imagen
                    </div>
                )}

                {displayImages.length > 1 ? (
                    <div className="mt-2.5 flex gap-2 overflow-x-auto pb-0.5">
                        {displayImages.map((img, i) => {
                            const selected = i === activeIndex;
                            return (
                                <button
                                    key={img || i}
                                    type="button"
                                    onClick={() => setActiveIndex(i)}
                                    aria-label={`Ver imagen ${i + 1}`}
                                    aria-pressed={selected}
                                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border transition sm:h-16 sm:w-24 ${
                                        selected
                                            ? "border-cyan-400 ring-2 ring-cyan-400/35"
                                            : "border-slate-200 hover:border-cyan-500/50"
                                    }`}
                                >
                                    <SafeImage
                                        src={img}
                                        alt=""
                                        className="h-full w-full object-cover"
                                        placeholderClassName="rounded-none"
                                    />
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Especificaciones
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {specs.map(({ label, value }) => (
                        <div key={label} className="px-1 py-2">
                            <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                {label}
                            </dt>
                            <dd className="mt-0.5 font-heading text-base font-bold tabular-nums text-slate-900">
                                {value || "—"}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>

            {description || priceTeaser ? (
                <div className="border-t border-slate-200 pt-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Descripción
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        {description}
                        {description && priceTeaser ? " " : ""}
                        {priceTeaser ? (
                            <span className="font-semibold text-s4">{priceTeaser}</span>
                        ) : null}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                        Recogida y devolución en la escuela S4 (Zurriola); la hora de devolución se
                        calcula sola según la duración elegida.
                    </p>
                </div>
            ) : null}

            <SurfboardBookingSection
                key={board.id}
                surfboard={board}
                whatsappHelpUrl={whatsappHelpUrl}
                rentalPolicy={rentalPolicy}
                initialStart={initialStart}
                initialEnd={initialEnd}
                embedded
                surfaceTone="light"
            />
        </div>
    );
}
