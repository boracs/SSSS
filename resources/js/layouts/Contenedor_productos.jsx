import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@inertiajs/react";
import ProductoOferta from "../components/ProductoOferta";

const Contenedor_productos = ({
    productos = [],
    eyebrow = "Tienda socios",
    title = "Mejores ofertas del club",
    description = "Precios exclusivos para socios con taquilla activa. Material, accesorios y equipamiento con descuento directo en tu carrito.",
    showShopLink = true,
    scrollHint = "Desliza para descubrir más ofertas exclusivas",
    compact = false,
}) => {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(scrollLeft > 8);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
    }, []);

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", updateScrollState, { passive: true });
        window.addEventListener("resize", updateScrollState);
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            window.removeEventListener("resize", updateScrollState);
        };
    }, [productos.length, updateScrollState]);

    const scrollStep = compact ? 200 : 300;

    const scroll = (dir) => {
        scrollRef.current?.scrollBy({ left: dir * scrollStep, behavior: "smooth" });
    };

    if (!productos.length) return null;

    return (
        <section
            className={`relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 shadow-[0_20px_60px_-24px_rgba(15,95,116,0.35)] ${compact ? "rounded-2xl p-3 sm:p-4" : "p-5 sm:p-8"}`}
            aria-labelledby="ofertas-socios-heading"
        >
            <div
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-orange-300/15 blur-3xl"
                aria-hidden
            />

            <div
                className={`relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${compact ? "mb-3" : "mb-8 gap-4 sm:items-end"}`}
            >
                <div>
                    {eyebrow ? (
                        <p className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-700">
                            <Sparkles className="h-3.5 w-3.5" />
                            {eyebrow}
                        </p>
                    ) : null}
                    <h2
                        id="ofertas-socios-heading"
                        className={`font-heading font-extrabold tracking-tight text-slate-900 ${eyebrow ? "mt-3" : ""} ${compact ? "text-base sm:text-lg" : "text-2xl sm:text-3xl"}`}
                    >
                        {title}
                    </h2>
                    {description ? (
                        <p
                            className={`max-w-xl leading-relaxed text-slate-600 ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}
                        >
                            {description}
                        </p>
                    ) : null}
                </div>
                {showShopLink ? (
                    <Link
                        href={route("tienda")}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200/80 bg-white/80 font-semibold text-[#0f5f74] shadow-sm backdrop-blur-sm transition hover:border-cyan-300 hover:bg-white hover:text-cyan-600 ${compact ? "px-2.5 py-1.5 text-xs" : "gap-1.5 px-4 py-2.5 text-sm"}`}
                    >
                        Ver tienda completa
                        <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Link>
                ) : null}
            </div>

            <div className="relative">
                <div
                    className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white/95 to-transparent transition-opacity duration-300 sm:w-14 ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
                    aria-hidden
                />
                <div
                    className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-cyan-50/95 to-transparent transition-opacity duration-300 sm:w-14 ${canScrollRight ? "opacity-100" : "opacity-0"}`}
                    aria-hidden
                />

                <button
                    type="button"
                    onClick={() => scroll(-1)}
                    aria-label="Productos anteriores"
                    disabled={!canScrollLeft}
                    className={`absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-700 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.35)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-cyan-300 hover:text-cyan-600 ${compact ? "-left-0.5 h-8 w-8" : "-left-1 hidden h-11 w-11 sm:flex"} ${canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                    <ChevronLeft className={compact ? "h-4 w-4" : "h-5 w-5"} />
                </button>

                <div
                    ref={scrollRef}
                    className={`flex snap-x snap-mandatory overflow-x-auto pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${compact ? "gap-2.5 sm:gap-3" : "gap-4 sm:gap-5"}`}
                >
                    {productos.map((producto, index) => (
                        <div
                            key={producto.id}
                            className={
                                compact
                                    ? "w-[min(58vw,168px)] shrink-0 snap-start sm:w-[168px]"
                                    : "w-[min(88vw,280px)] shrink-0 snap-start sm:w-[272px]"
                            }
                            style={{ animationDelay: `${index * 60}ms` }}
                        >
                            <ProductoOferta
                                nombre={producto.nombre}
                                precio={producto.precio}
                                imagen={producto.imagen}
                                unidades={producto.unidades}
                                descuento={producto.descuento}
                                producto={producto}
                                compact={compact}
                            />
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => scroll(1)}
                    aria-label="Más productos"
                    disabled={!canScrollRight}
                    className={`absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-700 shadow-[0_8px_24px_-8px_rgba(15,23,42,0.35)] backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-cyan-300 hover:text-cyan-600 ${compact ? "-right-0.5 h-8 w-8" : "-right-1 hidden h-11 w-11 sm:flex"} ${canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"}`}
                >
                    <ChevronRight className={compact ? "h-4 w-4" : "h-5 w-5"} />
                </button>
            </div>

            {scrollHint ? (
                <p className="relative mt-5 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
                    {scrollHint}
                </p>
            ) : null}
        </section>
    );
};

export default Contenedor_productos;
