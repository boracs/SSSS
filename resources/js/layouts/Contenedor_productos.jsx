import React from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@inertiajs/react";
import Producto from "../components/Producto";
import SnapRail from "../components/ui/SnapRail";

/**
 * Carrusel de ofertas tienda socios.
 * Banda full-bleed (fondo a todo el ancho); contenido acotado a max-w-6xl.
 */
const Contenedor_productos = ({
    productos = [],
    eyebrow = "Tienda socios",
    title = "Mejores ofertas del club",
    description = "Precios exclusivos para socios con taquilla activa. Material, accesorios y equipamiento con descuento directo en tu carrito.",
    showShopLink = true,
    compact = false,
    tone = "light",
}) => {
    if (!productos.length) return null;

    const isLight = tone === "light";

    return (
        <section
            className={
                isLight
                    ? "relative w-full overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-6 shadow-[0_16px_48px_-28px_rgba(15,95,116,0.2)] sm:py-8"
                    : `relative w-full overflow-hidden bg-gradient-to-br from-slate-900 via-[#0a2a33] to-slate-950 ${compact ? "pb-5 pt-10 sm:pb-6 sm:pt-12" : "pb-8 pt-12 sm:pb-12 sm:pt-14"}`
            }
            aria-labelledby="ofertas-socios-heading"
        >
            {!isLight ? (
                <>
                    <div
                        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-[#0f5f74]/20 blur-3xl"
                        aria-hidden
                    />
                </>
            ) : null}

            <div className="relative z-[2] mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div
                    className={`relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between ${compact ? "mb-5 gap-3 sm:mb-6 sm:items-end" : "mb-8 gap-4 sm:items-end"}`}
                >
                    <div>
                        {eyebrow ? (
                            <p
                                className={
                                    isLight
                                        ? "inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-s4"
                                        : "inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300"
                                }
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                {eyebrow}
                            </p>
                        ) : null}
                        <h2
                            id="ofertas-socios-heading"
                            className={`font-heading font-extrabold tracking-tight ${isLight ? "text-slate-900" : "text-white"} ${eyebrow ? "mt-3" : ""} ${compact ? "text-base sm:text-lg" : "text-2xl sm:text-3xl"}`}
                        >
                            {title}
                        </h2>
                        {description ? (
                            <p
                                className={`max-w-xl leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"} ${compact ? "mt-1 text-xs" : "mt-2 text-sm"}`}
                            >
                                {description}
                            </p>
                        ) : null}
                    </div>
                    {showShopLink ? (
                        <Link
                            href={route("tienda")}
                            className={
                                isLight
                                    ? `inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white font-semibold text-s4 shadow-sm transition hover:border-s4/30 hover:bg-slate-50 ${compact ? "px-2.5 py-1.5 text-xs" : "gap-1.5 px-4 py-2.5 text-sm"}`
                                    : `inline-flex shrink-0 items-center gap-1 rounded-xl border border-white/15 bg-white/10 font-semibold text-cyan-100 shadow-sm backdrop-blur-sm transition hover:border-cyan-400/40 hover:bg-white/15 hover:text-white ${compact ? "px-2.5 py-1.5 text-xs" : "gap-1.5 px-4 py-2.5 text-sm"}`
                            }
                        >
                            Ver tienda completa
                            <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                        </Link>
                    ) : null}
                </div>

                <SnapRail
                    compact={compact}
                    tone={isLight ? "light" : "dark"}
                    prevLabel="Productos anteriores"
                    nextLabel="Más productos"
                >
                    {productos.map((producto, index) => (
                        <div
                            key={producto.id}
                            className={
                                compact
                                    ? "flex w-[min(58vw,168px)] shrink-0 snap-start sm:w-[168px]"
                                    : "flex w-[min(88vw,280px)] shrink-0 snap-start sm:w-[272px]"
                            }
                            style={{ animationDelay: `${index * 60}ms` }}
                        >
                            <div className="flex w-full flex-col">
                                <Producto
                                    nombre={producto.nombre}
                                    precio={producto.precio}
                                    imagen={producto.imagen}
                                    unidades={producto.unidades}
                                    descuento={producto.descuento}
                                    producto={producto}
                                    density="compact"
                                    surface={isLight ? "light" : "dark"}
                                />
                            </div>
                        </div>
                    ))}
                </SnapRail>
            </div>
        </section>
    );
};

export default Contenedor_productos;
