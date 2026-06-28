import { usePage, router } from "@inertiajs/react";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { Boxes, ShoppingCart, Lock } from "lucide-react";
import { formatEur } from "@/utils/money";

const Producto = ({ nombre, precio, imagenes, unidades, descuento, producto }) => {
    const { auth } = usePage().props;
    const user = auth?.user;

    const tieneTaquilla =
        user &&
        user.numeroTaquilla &&
        user.numeroTaquilla !== 0 &&
        user.numeroTaquilla !== null;

    const raw = producto.imagenPrincipal ?? producto.imagen_principal;
    const imageSource =
        raw && typeof raw === "string" && !raw.includes("undefined")
            ? raw.startsWith("http")
                ? raw
                : raw.startsWith("/")
                ? raw
                : `/storage/${raw.replace(/^\/+/, "")}`
            : null;

    const precioNum    = Number(precio || 0);
    const descuentoNum = Number(descuento || 0);
    const precioFinal  = descuentoNum > 0
        ? precioNum - (precioNum * descuentoNum) / 100
        : precioNum;
    const agotado   = Number(unidades) === 0;
    const stockBajo = Number(unidades) > 0 && Number(unidades) <= 3;
    const [imageFailed, setImageFailed] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const showImage = Boolean(imageSource) && !imageFailed;

    const handleAgregarAlCarrito = (productoId) => {
        if (addingToCart) return;
        setAddingToCart(true);
        router.post(
            route("carrito.agregar", productoId),
            {},
            {
                onSuccess: () => toast.success("Producto agregado al carrito"),
                onError: () => toast.error("Hubo un problema al agregar el producto al carrito"),
                preserveState: true,
                preserveScroll: true,
                onFinish: () => setAddingToCart(false),
            }
        );
    };

    const handleVerProducto = (productoId) => {
        router.get(
            route("producto.ver", { productoId }),
            {},
            { preserveState: false, preserveScroll: true }
        );
    };

    return (
        <div
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(251,146,60,0.15)]"
            onClick={() => handleVerProducto(producto.id)}
        >
            {/* ── Imagen ─────────────────────────────────────────────── */}
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-800/60">
                {showImage ? (
                    <img
                        src={imageSource}
                        alt=""
                        onError={() => setImageFailed(true)}
                        className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            agotado ? "opacity-50 grayscale" : ""
                        }`}
                    />
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                        <svg
                            className="h-12 w-12 text-slate-600"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1}
                            aria-hidden="true"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                        </svg>
                        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                            Sin imagen
                        </span>
                    </div>
                )}

                {/* Overlay agotado */}
                {agotado && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                        <span className="rounded-xl border border-slate-400/30 bg-slate-900/80 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-300">
                            Agotado
                        </span>
                    </div>
                )}
            </div>

            {/* ── Cuerpo ─────────────────────────────────────────────── */}
            <div className="flex flex-1 flex-col p-4">

                {/* Nombre + badge estado */}
                <div className="mb-2 flex items-start justify-between gap-2">
                    <h2 className="flex-1 text-sm font-bold leading-tight text-white line-clamp-2">
                        {nombre}
                    </h2>
                    {agotado ? (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[11px] font-semibold text-rose-400">
                            Agotado
                        </span>
                    ) : (
                        <span className="inline-flex shrink-0 items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                            Disponible
                        </span>
                    )}
                </div>

                {/* Stock info con icono Lucide */}
                <div className="mb-3 flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Boxes className="h-3 w-3 shrink-0" />
                    {agotado ? (
                        <span>Sin stock</span>
                    ) : stockBajo ? (
                        <span className="text-amber-400">
                            Ultimas {unidades} unidad{Number(unidades) > 1 ? "es" : ""}
                        </span>
                    ) : (
                        <span>{unidades} unidades disponibles</span>
                    )}
                </div>

                {/* Precio */}
                <div className="mt-auto">
                    {descuentoNum > 0 ? (
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-lg font-extrabold text-orange-400">
                                {formatEur(precioFinal)}
                            </span>
                            <span className="inline-flex items-center rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-orange-300 ring-1 ring-orange-400/25">
                                -{parseInt(descuentoNum)}%
                            </span>
                            <span className="w-full text-xs text-slate-500 line-through sm:w-auto">
                                {formatEur(precioNum)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-lg font-extrabold text-cyan-300">
                            {formatEur(precioNum)}
                        </span>
                    )}
                </div>

                {/* Boton CTA */}
                <div className="mt-3">
                    {user ? (
                        tieneTaquilla ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAgregarAlCarrito(producto.id);
                                }}
                                disabled={agotado || addingToCart}
                                className={`flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold tracking-wide text-white transition-all duration-200 ${
                                    agotado || addingToCart
                                        ? "cursor-not-allowed bg-slate-700/60 text-slate-500"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98]"
                                }`}
                            >
                                {agotado ? (
                                    "Agotado"
                                ) : addingToCart ? (
                                    "Anadiendo..."
                                ) : (
                                    <>
                                        <ShoppingCart className="h-3.5 w-3.5" />
                                        Anadir al carrito
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="group/btn relative flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-amber-600/80 py-2.5 text-sm font-bold tracking-wide text-white opacity-80"
                                disabled
                            >
                                <Lock className="h-3.5 w-3.5" />
                                Taquilla requerida
                                <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900 p-2 text-center text-xs text-white opacity-0 shadow-xl transition-opacity group-hover/btn:opacity-100 whitespace-nowrap">
                                    Necesitas taquilla asignada para comprar
                                </span>
                            </button>
                        )
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="group/btn relative flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-xl bg-slate-700/60 py-2.5 text-sm font-bold tracking-wide text-slate-300"
                            disabled
                        >
                            <Lock className="h-3.5 w-3.5" />
                            Iniciar sesion
                            <span className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 w-max max-w-[16rem] -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900 p-2 text-center text-xs text-white opacity-0 shadow-xl transition-opacity group-hover/btn:opacity-100 whitespace-nowrap">
                                Inicia sesion para anadir productos al carrito
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Producto;