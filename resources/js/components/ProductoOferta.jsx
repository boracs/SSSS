import { usePage, router } from "@inertiajs/react";
import React from "react";
import { toast } from "react-toastify";
import { ShoppingBag, Tag } from "lucide-react";

const ProductoOferta = ({ nombre, precio, imagen, unidades, descuento, producto }) => {
    const { auth } = usePage().props;
    const user = auth?.user;
    const numeroTaquilla = user?.numeroTaquilla || 0;
    const precioNum = Number(precio) || 0;
    const descuentoNum = Number(descuento) || 0;
    const precioFinal =
        descuentoNum > 0 ? precioNum - (descuentoNum / 100) * precioNum : precioNum;
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
            className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-900/10"
            onClick={() => handleVerProducto(producto.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleVerProducto(producto.id)}
        >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-50">
                <img
                    src={imageSrc}
                    alt={nombre}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                />
                {descuentoNum > 0 ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                        <Tag className="h-3 w-3" />
                        -{parseInt(descuentoNum, 10)}%
                    </span>
                ) : null}
                {agotado ? (
                    <span className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                        Agotado
                    </span>
                ) : null}
            </div>

            <div className="flex flex-1 flex-col p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-600">
                    Oferta socios S4
                </p>
                <h3 className="mt-1 line-clamp-2 font-heading text-base font-bold leading-snug text-slate-900">
                    {nombre}
                </h3>

                <div className="mt-3 flex items-end justify-between gap-2">
                    <div>
                        {descuentoNum > 0 ? (
                            <p className="text-xs text-slate-400 line-through">
                                {precioNum.toFixed(2)} €
                            </p>
                        ) : null}
                        <p className="text-xl font-extrabold tabular-nums text-[#0f5f74]">
                            {precioFinal.toFixed(2)} €
                        </p>
                    </div>
                    {descuentoNum > 0 ? (
                        <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                            Ahorras {(precioNum - precioFinal).toFixed(2)} €
                        </span>
                    ) : null}
                </div>

                <div className="mt-auto pt-4">
                    {puedeComprar ? (
                        <button
                            type="button"
                            onClick={(e) => handleAgregarAlCarrito(producto.id, e)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0f5f74] to-cyan-600 py-2.5 text-sm font-bold text-white shadow-md transition hover:from-[#0d4f60] hover:to-cyan-500"
                        >
                            <ShoppingBag className="h-4 w-4" />
                            Agregar al carrito
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
                            className="group/btn relative w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-sm font-semibold text-slate-500"
                        >
                            Agregar al carrito
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-[200px] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-center text-[11px] font-medium text-white shadow-lg group-hover/btn:block">
                                {!user
                                    ? "Inicia sesión para comprar ofertas"
                                    : "Activa tu taquilla para acceder a ofertas"}
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

export default ProductoOferta;
