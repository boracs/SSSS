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
        (user.has_store_discount_access === true ||
            String(user.has_store_discount_access) === "1" ||
            (user.numeroTaquilla &&
                user.numeroTaquilla !== 0 &&
                user.numeroTaquilla !== "0" &&
                user.numeroTaquilla !== null));

    const raw = producto.imagenPrincipal ?? producto.imagen_principal;
    const imageSource =
        raw && typeof raw === "string" && !raw.includes("undefined")
            ? raw.startsWith("http")
                ? raw
                : raw.startsWith("/")
                  ? raw
                  : `/storage/${raw.replace(/^\/+/, "")}`
            : null;

    const precioNum = Number(precio || 0);
    const descuentoNum = Number(descuento || 0);
    const precioFinal =
        descuentoNum > 0 ? precioNum - (precioNum * descuentoNum) / 100 : precioNum;
    const agotado = Number(unidades) === 0;
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
            },
        );
    };

    const handleVerProducto = (productoId) => {
        router.get(
            route("producto.ver", { productoId }),
            {},
            { preserveState: false, preserveScroll: true },
        );
    };

    return (
        <div
            className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm cursor-pointer transition-all duration-300 hover:border-orange-400/40 hover:bg-white/10 hover:shadow-[0_8px_32px_rgba(251,146,60,0.15)] sm:rounded-2xl"
            onClick={() => handleVerProducto(producto.id)}
        >
            <div className="relative aspect-square overflow-hidden bg-slate-800/60 sm:aspect-[4/3]">
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
                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2 text-center">
                        <svg
                            className="h-7 w-7 text-slate-600 sm:h-10 sm:w-10"
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
                        <span className="text-[8px] font-medium uppercase tracking-wide text-slate-500 sm:text-[10px]">
                            Sin imagen
                        </span>
                    </div>
                )}

                {descuentoNum > 0 && !agotado ? (
                    <span className="absolute left-1 top-1 rounded-md bg-orange-500/90 px-1 py-0.5 text-[8px] font-bold text-white sm:left-2 sm:top-2 sm:rounded-lg sm:px-1.5 sm:text-[10px]">
                        -{parseInt(descuentoNum, 10)}%
                    </span>
                ) : null}

                {agotado && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                        <span className="rounded-lg border border-slate-400/30 bg-slate-900/80 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider text-slate-300 sm:px-3 sm:py-1 sm:text-xs">
                            Agotado
                        </span>
                    </div>
                )}
            </div>

            <div className="flex min-w-0 flex-1 flex-col p-2 sm:p-3 lg:p-4">
                <div className="mb-1 flex items-start justify-between gap-1 sm:mb-2 sm:gap-2">
                    <h2 className="min-w-0 flex-1 text-[11px] font-bold leading-tight text-white line-clamp-2 sm:text-sm lg:text-base">
                        {nombre}
                    </h2>
                    {!agotado ? (
                        <span className="inline-flex shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1 py-0.5 text-[7px] font-semibold text-emerald-400 sm:px-2 sm:text-[11px]">
                            <span className="sm:hidden">●</span>
                            <span className="hidden sm:inline">OK</span>
                        </span>
                    ) : null}
                </div>

                <div className="mb-1.5 flex items-center gap-1 text-[9px] text-slate-500 sm:mb-2 sm:gap-1.5 sm:text-[11px]">
                    <Boxes className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" />
                    {agotado ? (
                        <span>Sin stock</span>
                    ) : stockBajo ? (
                        <span className="text-amber-400">
                            <span className="sm:hidden">Quedan {unidades}</span>
                            <span className="hidden sm:inline">
                                Ultimas {unidades} unidad{Number(unidades) > 1 ? "es" : ""}
                            </span>
                        </span>
                    ) : (
                        <span className="truncate">
                            <span className="sm:hidden">{unidades} uds</span>
                            <span className="hidden sm:inline">{unidades} unidades disponibles</span>
                        </span>
                    )}
                </div>

                <div className="mt-auto">
                    {descuentoNum > 0 ? (
                        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 sm:gap-x-2">
                            <span className="text-sm font-extrabold tabular-nums text-orange-400 sm:text-lg">
                                {formatEur(precioFinal)}
                            </span>
                            <span className="text-[9px] text-slate-500 line-through sm:text-xs">
                                {formatEur(precioNum)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-sm font-extrabold tabular-nums text-cyan-300 sm:text-lg">
                            {formatEur(precioNum)}
                        </span>
                    )}
                </div>

                <div className="mt-1.5 sm:mt-3">
                    {user ? (
                        tieneTaquilla ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAgregarAlCarrito(producto.id);
                                }}
                                disabled={agotado || addingToCart}
                                className={`flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-[10px] font-bold tracking-wide text-white transition-all duration-200 sm:gap-1.5 sm:rounded-xl sm:py-2.5 sm:text-sm ${
                                    agotado || addingToCart
                                        ? "cursor-not-allowed bg-slate-700/60 text-slate-500"
                                        : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98]"
                                }`}
                            >
                                {agotado ? (
                                    "Agotado"
                                ) : addingToCart ? (
                                    "..."
                                ) : (
                                    <>
                                        <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        <span className="sm:hidden">Carrito</span>
                                        <span className="hidden sm:inline">Anadir al carrito</span>
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => e.stopPropagation()}
                                className="group/btn relative flex w-full cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-amber-600/80 py-1.5 text-[10px] font-bold text-white opacity-80 sm:gap-1.5 sm:rounded-xl sm:py-2.5 sm:text-sm"
                                disabled
                            >
                                <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                <span className="sm:hidden">Taquilla</span>
                                <span className="hidden sm:inline">Taquilla requerida</span>
                            </button>
                        )
                    ) : (
                        <button
                            type="button"
                            onClick={(e) => e.stopPropagation()}
                            className="group/btn relative flex w-full cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-slate-700/60 py-1.5 text-[10px] font-bold text-slate-300 sm:gap-1.5 sm:rounded-xl sm:py-2.5 sm:text-sm"
                            disabled
                        >
                            <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                            <span className="sm:hidden">Entrar</span>
                            <span className="hidden sm:inline">Iniciar sesion</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Producto;
