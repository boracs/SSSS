import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";

/**
 * Galería de producto — patrón W3C Tabs (tablist + tabpanel).
 * Sin auto-rotación; navegación por teclado; alt descriptivo para SEO/a11y.
 */
const ProductImageGallery = ({
    images = [],
    productName = "Producto",
    compact = true,
    tone = "dark",
}) => {
    const baseId = useId();
    const thumbListRef = useRef(null);
    const tabRefs = useRef([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const isLight = tone === "light";

    const shellBorder = isLight ? "border-slate-200/80" : "border-white/10";
    const shellBg = isLight ? "bg-white" : "bg-slate-950/50";
    const panelBg = isLight
        ? "bg-gradient-to-br from-slate-50 to-slate-100/80"
        : "bg-gradient-to-br from-slate-900 to-slate-950";
    const fadeFrom = isLight ? "from-white" : "from-slate-950/90";
    const counterClass = isLight
        ? "bg-white/90 text-slate-600"
        : "bg-slate-900/80 text-slate-300";
    const expandClass = isLight
        ? "border-slate-200 bg-white/90 text-slate-600 hover:border-cyan-400/50 hover:text-s4"
        : "border-white/15 bg-slate-900/75 text-slate-200 hover:border-cyan-400/40 hover:text-white";
    const thumbIdle = isLight
        ? "border-slate-200 opacity-70 hover:opacity-100"
        : "border-white/10 opacity-65 hover:opacity-100";

    const total = images.length;
    const safeIndex = total > 0 ? Math.min(activeIndex, total - 1) : 0;
    const activeSrc = images[safeIndex] ?? "/img/placeholder.svg";

    const altForIndex = useCallback(
        (index) => {
            if (total <= 1) {
                return productName;
            }
            return `${productName} — imagen ${index + 1} de ${total}`;
        },
        [productName, total],
    );

    const goTo = useCallback(
        (index) => {
            if (total === 0) return;
            const next = ((index % total) + total) % total;
            setActiveIndex(next);
            setImageLoaded(false);
            tabRefs.current[next]?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
                inline: "center",
            });
        },
        [total],
    );

    const handleTabKeyDown = (event, index) => {
        if (total <= 1) return;

        let nextIndex = index;
        switch (event.key) {
            case "ArrowRight":
            case "ArrowDown":
                event.preventDefault();
                nextIndex = (index + 1) % total;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                event.preventDefault();
                nextIndex = (index - 1 + total) % total;
                break;
            case "Home":
                event.preventDefault();
                nextIndex = 0;
                break;
            case "End":
                event.preventDefault();
                nextIndex = total - 1;
                break;
            default:
                return;
        }

        goTo(nextIndex);
        tabRefs.current[nextIndex]?.focus();
    };

    useEffect(() => {
        if (!lightboxOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                setLightboxOpen(false);
            }
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                goTo(safeIndex - 1);
            }
            if (event.key === "ArrowRight") {
                event.preventDefault();
                goTo(safeIndex + 1);
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [lightboxOpen, goTo, safeIndex]);

    if (total === 0) {
        return (
            <figure className={`overflow-hidden rounded-xl border ${shellBorder} ${shellBg}`}>
                <div
                    className={`flex items-center justify-center p-1.5 ${panelBg} ${compact ? "aspect-square max-h-32 sm:max-h-36" : "aspect-[4/5] min-h-[16rem] max-h-[28rem]"}`}
                >
                    <img
                        src="/img/placeholder.svg"
                        alt={productName}
                        className="max-h-full max-w-full object-contain"
                    />
                </div>
            </figure>
        );
    }

    const panelId = `${baseId}-panel`;
    const mainHeight = compact
        ? "aspect-square max-h-32 sm:max-h-36 md:max-h-40"
        : "aspect-[4/5] min-h-[16rem] max-h-[28rem] sm:min-h-[20rem] sm:max-h-[32rem]";

    return (
        <>
            <figure className="min-w-0">
                <div
                    id={panelId}
                    role="tabpanel"
                    aria-labelledby={total > 1 ? `${baseId}-tab-${safeIndex}` : undefined}
                    className={`group/main relative overflow-hidden rounded-xl border ${shellBorder} ${shellBg}`}
                >
                    <div
                        className={`relative flex items-center justify-center p-3 sm:p-4 ${panelBg} ${mainHeight}`}
                    >
                        <img
                            key={activeSrc}
                            src={activeSrc}
                            alt={altForIndex(safeIndex)}
                            decoding="async"
                            fetchPriority={safeIndex === 0 ? "high" : "auto"}
                            loading={safeIndex === 0 ? "eager" : "lazy"}
                            onLoad={() => setImageLoaded(true)}
                            className={`max-h-full max-w-full object-contain transition-all duration-300 ease-out ${
                                imageLoaded ? "scale-100 opacity-100" : "scale-[0.98] opacity-0"
                            }`}
                        />

                        {total > 1 ? (
                            <span
                                className={`pointer-events-none absolute bottom-2 right-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur-sm ${counterClass}`}
                                aria-hidden
                            >
                                {safeIndex + 1}/{total}
                            </span>
                        ) : null}

                        <button
                            type="button"
                            onClick={() => setLightboxOpen(true)}
                            aria-label={`Ampliar ${altForIndex(safeIndex)}`}
                            className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg border opacity-0 backdrop-blur-sm transition group-hover/main:opacity-100 focus:opacity-100 ${expandClass}`}
                        >
                            <Expand className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {total > 1 ? (
                    <div className="relative mt-2 sm:mt-3">
                        <div
                            className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r ${fadeFrom} to-transparent`}
                            aria-hidden
                        />
                        <div
                            className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l ${fadeFrom} to-transparent`}
                            aria-hidden
                        />

                        <div
                            ref={thumbListRef}
                            role="tablist"
                            aria-label={`Galería de ${productName}`}
                            className="flex snap-x snap-mandatory gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        >
                            {images.map((src, index) => {
                                const selected = index === safeIndex;
                                const tabId = `${baseId}-tab-${index}`;

                                return (
                                    <button
                                        key={`${src}-${index}`}
                                        ref={(el) => {
                                            tabRefs.current[index] = el;
                                        }}
                                        id={tabId}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        aria-controls={panelId}
                                        tabIndex={selected ? 0 : -1}
                                        onClick={() => goTo(index)}
                                        onKeyDown={(event) => handleTabKeyDown(event, index)}
                                        aria-label={altForIndex(index)}
                                        className={`relative shrink-0 snap-center overflow-hidden rounded-lg border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70 ${
                                            selected
                                                ? "border-cyan-400 ring-1 ring-cyan-400/35"
                                                : thumbIdle
                                        }`}
                                    >
                                        <img
                                            src={src}
                                            alt=""
                                            aria-hidden
                                            loading="lazy"
                                            decoding="async"
                                            className={`object-cover ${compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-14 w-14 sm:h-16 sm:w-16"}`}
                                        />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ) : null}

                <figcaption className="sr-only">
                    {altForIndex(safeIndex)}
                </figcaption>
            </figure>

            {lightboxOpen ? (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Vista ampliada — ${productName}`}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm"
                    onClick={() => setLightboxOpen(false)}
                >
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(false)}
                        aria-label="Cerrar vista ampliada"
                        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-white transition hover:border-cyan-400/40"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    {total > 1 ? (
                        <>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    goTo(safeIndex - 1);
                                }}
                                aria-label="Imagen anterior"
                                className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-white transition hover:border-cyan-400/40 sm:left-4"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    goTo(safeIndex + 1);
                                }}
                                aria-label="Imagen siguiente"
                                className="absolute right-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-900/80 text-white transition hover:border-cyan-400/40 sm:right-4"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    ) : null}

                    <figure
                        className="relative max-h-[85vh] max-w-[min(100%,56rem)]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <img
                            src={activeSrc}
                            alt={altForIndex(safeIndex)}
                            className="max-h-[85vh] w-full object-contain"
                        />
                        <figcaption className="mt-3 text-center text-sm text-slate-400">
                            {altForIndex(safeIndex)}
                        </figcaption>
                    </figure>
                </div>
            ) : null}
        </>
    );
};

export default ProductImageGallery;
