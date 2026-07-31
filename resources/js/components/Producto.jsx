import { Link, usePage, router } from "@inertiajs/react";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { formatEur } from "@/utils/money";
import { hasStoreAccess } from "@/utils/hasStoreAccess";
import { demoCatalogImage, resolveCatalogImage } from "@/utils/demoCatalogImages";
import StoreAccessPopover from "./StoreAccessPopover";
import StoreAddToCartButton, {
    StoreAddToCartLabel,
    storeAddToCartClassName,
} from "./StoreAddToCartButton";

/**
 * Card de producto tienda S4 (superficie navy única).
 * @param {"full"|"compact"} [density]
 * @param {boolean} [compact] alias de density="compact" (slider ofertas / relacionados)
 */
const Producto = ({
    nombre,
    precio,
    imagenes,
    imagen,
    unidades,
    descuento,
    producto,
    density = "full",
    compact = false,
}) => {
    const isCompact = compact || density === "compact";
    const { auth } = usePage().props;
    const user = auth?.user;
    const puedeComprar = hasStoreAccess(user);

    const raw =
        imagen ??
        producto?.imagen ??
        producto?.imagenPrincipal ??
        producto?.imagen_principal ??
        imagenes?.[0];
    const [imageSrc, setImageSrc] = useState(() =>
        resolveCatalogImage(raw, { id: producto?.id, nombre }),
    );

    const precioNum = Number(precio || 0);
    const descuentoNum = Number(descuento || 0);
    const precioFinal =
        descuentoNum > 0 ? precioNum - (precioNum * descuentoNum) / 100 : precioNum;
    const ahorro = Math.max(0, precioNum - precioFinal);
    const stock = Number(unidades);
    const agotado = stock === 0;
    const stockBajo = stock > 0 && stock <= 3;
    const [addingToCart, setAddingToCart] = useState(false);
    const needsAccess = !puedeComprar;
    const productHref = route("producto.ver", { productoId: producto.id });

    const handleAgregarAlCarrito = (productoId, e) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
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

    const padX = isCompact ? "px-2" : "px-3 sm:px-3.5";

    return (
        <article
            className={[
                "group relative flex h-full min-w-0 flex-col overflow-visible border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:border-slate-500/60 hover:bg-white/[0.07] hover:shadow-[0_12px_36px_rgba(15,23,42,0.45)]",
                isCompact ? "rounded-xl" : "rounded-2xl",
            ].join(" ")}
        >
            <Link
                href={productHref}
                preserveState={false}
                preserveScroll
                className="flex min-h-0 flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
                <div
                    className={[
                        "relative overflow-hidden rounded-t-[inherit] bg-slate-800/70",
                        isCompact ? "aspect-[5/4]" : "aspect-[4/3]",
                    ].join(" ")}
                >
                    <img
                        src={imageSrc}
                        alt={nombre}
                        loading="lazy"
                        decoding="async"
                        onError={() => setImageSrc(demoCatalogImage(producto?.id, nombre))}
                        className={[
                            "h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]",
                            agotado ? "opacity-40 grayscale" : "",
                        ].join(" ")}
                    />

                    {descuentoNum > 0 && !agotado ? (
                        <span
                            className={[
                                "absolute left-2 top-2 rounded-md bg-rose-600 font-extrabold tabular-nums text-white shadow-md shadow-rose-900/35 ring-1 ring-white/25",
                                isCompact
                                    ? "px-1.5 py-0.5 text-[10px]"
                                    : "px-1.5 py-0.5 text-[10px] sm:left-2.5 sm:top-2.5 sm:px-2 sm:text-[11px]",
                            ].join(" ")}
                        >
                            -{parseInt(descuentoNum, 10)}%
                        </span>
                    ) : null}

                    {agotado ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/45">
                            <span
                                className={[
                                    "rounded-lg border border-white/15 bg-slate-950/80 font-bold uppercase tracking-wider text-slate-200",
                                    isCompact
                                        ? "px-2 py-0.5 text-[10px]"
                                        : "px-2.5 py-1 text-[10px] sm:text-xs",
                                ].join(" ")}
                            >
                                Agotado
                            </span>
                        </div>
                    ) : null}
                </div>

                <div
                    className={[
                        "flex min-h-0 flex-1 flex-col",
                        isCompact ? `gap-1.5 ${padX} pt-2` : `gap-2 ${padX} pt-3 sm:pt-3.5`,
                    ].join(" ")}
                >
                    <h3
                        className={[
                            "line-clamp-2 font-bold leading-snug text-white",
                            isCompact
                                ? "min-h-[2.25rem] text-xs"
                                : "min-h-[2.5rem] text-sm sm:min-h-[2.75rem] sm:text-[15px]",
                        ].join(" ")}
                    >
                        {nombre}
                    </h3>

                    {!isCompact ? (
                        <div className="text-xs text-slate-400">
                            {agotado ? (
                                <span className="font-medium text-slate-500">Agotado</span>
                            ) : stockBajo ? (
                                <span className="font-medium text-amber-400">
                                    Últimas {stock} unidad{stock > 1 ? "es" : ""}
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400/90">
                                    <span
                                        className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
                                        aria-hidden
                                    />
                                    En stock
                                </span>
                            )}
                        </div>
                    ) : null}

                    <div
                        className={`mt-auto flex flex-wrap items-baseline gap-1.5 sm:gap-2 ${isCompact ? "pt-0.5" : "pt-1"}`}
                    >
                        {descuentoNum > 0 ? (
                            <>
                                <span
                                    className={[
                                        "font-extrabold leading-none tracking-tight text-white tabular-nums",
                                        isCompact ? "text-sm" : "text-lg sm:text-xl",
                                    ].join(" ")}
                                >
                                    {formatEur(precioFinal)}
                                </span>
                                <span
                                    className={[
                                        "leading-none text-slate-400 line-through decoration-slate-400/80",
                                        isCompact ? "text-[11px]" : "text-xs",
                                    ].join(" ")}
                                >
                                    {formatEur(precioNum)}
                                </span>
                                {isCompact && ahorro > 0 ? (
                                    <span className="rounded bg-rose-600/90 px-1 py-px text-[10px] font-bold tabular-nums text-white">
                                        −{formatEur(ahorro)}
                                    </span>
                                ) : null}
                            </>
                        ) : (
                            <span
                                className={[
                                    "font-extrabold leading-none tracking-tight text-white tabular-nums",
                                    isCompact ? "text-sm" : "text-lg sm:text-xl",
                                ].join(" ")}
                            >
                                {formatEur(precioNum)}
                            </span>
                        )}
                    </div>
                </div>
            </Link>

            <div
                className={[
                    "mt-auto",
                    isCompact ? `${padX} pb-2 pt-1.5` : `${padX} pb-3 pt-2.5 sm:pb-3.5`,
                ].join(" ")}
            >
                {!needsAccess ? (
                    <StoreAddToCartButton
                        surface="dark"
                        compact={isCompact}
                        shortLabel={isCompact}
                        disabled={agotado}
                        loading={addingToCart}
                        onClick={(e) => handleAgregarAlCarrito(producto.id, e)}
                    >
                        {agotado ? "Agotado" : undefined}
                    </StoreAddToCartButton>
                ) : (
                    <StoreAccessPopover
                        disabled={agotado}
                        portal={isCompact}
                        triggerClassName={storeAddToCartClassName({
                            disabled: agotado,
                            surface: "dark",
                            compact: isCompact,
                        })}
                    >
                        {agotado ? (
                            "Agotado"
                        ) : (
                            <StoreAddToCartLabel compact={isCompact} shortLabel={isCompact} />
                        )}
                    </StoreAccessPopover>
                )}
            </div>
        </article>
    );
};

export default Producto;
