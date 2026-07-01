import React, { useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "@inertiajs/react";
import ProductoOferta from "../components/ProductoOferta";

const Contenedor_productos = ({ productos = [] }) => {
    const scrollRef = useRef(null);

    const scroll = (dir) => {
        scrollRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
    };

    if (!productos.length) return null;

    return (
        <section className="relative" aria-labelledby="ofertas-socios-heading">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">
                        Tienda socios
                    </p>
                    <h2
                        id="ofertas-socios-heading"
                        className="mt-1 font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl"
                    >
                        Mejores ofertas del club
                    </h2>
                    <p className="mt-2 max-w-xl text-sm text-slate-600">
                        Precios exclusivos para socios con taquilla activa. Material, accesorios y
                        equipamiento con descuento directo en tu carrito.
                    </p>
                </div>
                <Link
                    href={route("tienda")}
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#0f5f74] transition hover:text-cyan-600"
                >
                    Ver tienda completa
                    <ChevronRight className="h-4 w-4" />
                </Link>
            </div>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => scroll(-1)}
                    aria-label="Anterior"
                    className="absolute -left-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:border-cyan-300 hover:text-cyan-600 sm:flex"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>

                <div
                    ref={scrollRef}
                    className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300"
                >
                    {productos.map((producto) => (
                        <div
                            key={producto.id}
                            className="w-[min(100%,280px)] shrink-0 snap-start sm:w-[260px]"
                        >
                            <ProductoOferta
                                nombre={producto.nombre}
                                precio={producto.precio}
                                imagen={producto.imagen}
                                unidades={producto.unidades}
                                descuento={producto.descuento}
                                producto={producto}
                            />
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => scroll(1)}
                    aria-label="Siguiente"
                    className="absolute -right-2 top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg transition hover:border-cyan-300 hover:text-cyan-600 sm:flex"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            </div>

            <p className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-cyan-500" />
                Desliza para ver más productos con descuento
            </p>
        </section>
    );
};

export default Contenedor_productos;
