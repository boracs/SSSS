import { usePage, router } from "@inertiajs/react";
import React from "react";
import { toast } from "react-toastify";
import { ArrowRight, ShoppingBag, Tag } from "lucide-react";

const ProductoOferta = ({ nombre, precio, imagen, unidades, descuento, producto, compact = false }) => {
    const { auth } = usePage().props;
    const user = auth?.user;
    const numeroTaquilla = user?.numeroTaquilla || 0;
    const precioNum = Number(precio) || 0;
    const descuentoNum = Number(descuento) || 0;
    const precioFinal =
        descuentoNum > 0 ? precioNum - (descuentoNum / 100) * precioNum : precioNum;
    const ahorro = precioNum - precioFinal;
    const agotado = unidades === 0;
    const puedeComprar = Boolean(user && numeroTaquilla > 0 && !agotado);

    const handleAgregarAlCarrito = (productoId, e) => {
        e.stopPropagation();
        router.post(route("carrito.agregar", productoId), {}, {
            onSuccess: () => toast.success("Producto agregado al carrito"),
            onError: () => toast.error("Hubo un problema al agregar el producto"),
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleVerProducto = (productoId) => {
        router.get(route("producto.ver", { productoId }), {}, {
            preserveState: false,
            preserveScroll: true,
        });
    };

    const placeholderImg = "/img/placeholder.svg";
    const imagenValida =
        typeof imagen === "string" && imagen.trim() !== "" && !imagen.includes("undefined");
    const imageSrc = imagenValida
        ? imagen.startsWith("http") || imagen.startsWith("/")
            ? imagen
            : `/storage/productos/${imagen.replace(/^productos\/?/, "")}`
        : placeholderImg;

    return (
        <article
            className={`group relative flex h-full cursor-pointer flex-col overflow-hidden border border-slate-200/70 bg-white transition-all duration-500 hover:border-cyan-400/40 ${
                compact
                    ? "rounded-xl shadow-[0_2px_12px_-8px_rgba(15,23,42,0.15)] hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-12px_rgba(14,116,144,0.25)]"
                    : "rounded-2xl shadow-[0_4px_24px_-12px_rgba(15,23,42,0.18)] hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-16px_rgba(14,116,144,0.35)]"
            }`}
            onClick={() => handleVerProducto(producto.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleVerProducto(producto.id)}
        >
            <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div className="absolute -left-1/2 top-0 h-full w-1/2 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[220%]" />
            </div>

            <div
                className={`relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 ${compact ? "aspect-[5/4]" : "aspect-[4/3]"}`}
            >
                <img
                    src={imageSrc}
                    alt={nombre}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                    loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent opacity-80 transition-opacity duration-300 group-hover:opacity-90" />

                {descuentoNum > 0 ? (
                    <span
                        className={`absolute left-2 top-2 inline-flex items-center gap-0.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 font-bold uppercase tracking-wide text-white shadow-lg shadow-orange-500/30 ${compact ? "px-1.5 py-0.5 text-[9px]" : "left-3 top-3 gap-1 px-2.5 py-1 text-[11px]"}`}
                    >
                        <Tag className={compact ? "h-2 w-2" : "h-3 w-3"} />
                        -{parseInt(descuentoNum, 10)}%
                    </span>
                ) : null}

                {agotado ? (
                    <span
                        className={`absolute right-2 top-2 rounded-full border border-white/20 bg-slate-900/75 font-semibold text-white backdrop-blur-md ${compact ? "px-1.5 py-0.5 text-[9px]" : "right-3 top-3 px-2.5 py-1 text-[11px]"}`}
                    >
                        Agotado
                    </span>
                ) : compact ? null : (
                    <span className="absolute bottom-3 left-3 rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                        Oferta socios
                    </span>
                )}
            </div>

            <div className={`relative flex flex-1 flex-col ${compact ? "p-2" : "p-4"}`}>
                <h3
                    className={`line-clamp-2 font-heading font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#0f5f74] ${compact ? "text-[11px]" : "text-base"}`}
                >
                    {nombre}
                </h3>

                <div className={`flex items-end justify-between gap-1 ${compact ? "mt-1.5" : "mt-3 gap-2"}`}>
                    <div>
                        {descuentoNum > 0 ? (
                            <p
                                className={`font-medium text-slate-400 line-through ${compact ? "text-[9px]" : "text-xs"}`}
                            >
                                {precioNum.toFixed(2)} €
                            </p>
                        ) : null}
                        <p
                            className={`font-extrabold tabular-nums tracking-tight text-[#0f5f74] ${compact ? "text-sm" : "text-2xl"}`}
                        >
                            {precioFinal.toFixed(2)}
                            <span
                                className={`ml-0.5 font-semibold text-slate-500 ${compact ? "text-[10px]" : "text-sm"}`}
                            >
                                €
                            </span>
                        </p>
                    </div>
                    {descuentoNum > 0 ? (
                        <span
                            className={`rounded-lg border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-teal-50 font-bold leading-tight text-emerald-700 ${compact ? "px-1 py-0.5 text-[8px]" : "rounded-xl px-2.5 py-1.5 text-[11px]"}`}
                        >
                            −{ahorro.toFixed(2)} €
                        </span>
                    ) : null}
                </div>

                <div className={compact ? "mt-1.5 pt-0" : "mt-auto pt-4"}>
                    {puedeComprar ? (
                        <button
                            type="button"
                            onClick={(e) => handleAgregarAlCarrito(producto.id, e)}
                            className={`inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#0f5f74] via-cyan-700 to-cyan-600 font-bold text-white shadow-md shadow-cyan-900/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-cyan-900/25 active:scale-[0.98] ${compact ? "gap-1 py-1 text-[10px]" : "gap-2 rounded-xl py-2.5 text-sm"}`}
                        >
                            <ShoppingBag
                                className={`transition-transform group-hover:scale-110 ${compact ? "h-3 w-3" : "h-4 w-4"}`}
                            />
                            {compact ? "Añadir" : "Agregar al carrito"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled
                            title={
                                !user
                                    ? "Inicia sesión para comprar"
                                    : "Necesitas una taquilla activa"
                            }
                            className={`group/btn relative w-full rounded-lg border border-dashed border-slate-200 bg-slate-50 font-semibold text-slate-400 ${compact ? "py-1 text-[10px]" : "rounded-xl py-2.5 text-sm"}`}
                        >
                            {compact ? "Añadir" : "Agregar al carrito"}
                            {!compact ? (
                                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-slate-700/50 bg-slate-900 px-3 py-2 text-center text-[11px] font-medium text-white shadow-xl group-hover/btn:block">
                                    {!user
                                        ? "Inicia sesión para comprar ofertas"
                                        : "Activa tu taquilla para acceder a ofertas"}
                                </span>
                            ) : null}
                        </button>
                    )}

                    {!compact ? (
                        <p className="mt-2 flex items-center justify-center gap-1 text-[11px] font-medium text-cyan-700/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            Ver ficha
                            <ArrowRight className="h-3 w-3" />
                        </p>
                    ) : null}
                </div>
            </div>
        </article>
    );
};

export default ProductoOferta;
