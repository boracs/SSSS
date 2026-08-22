import React, { useEffect } from "react";
import { Check, LogIn, ShoppingCart } from "lucide-react";
import BrandLogo from "../BrandLogo";
import S4Button from "../S4Button";
import SafeImage from "../SafeImage";

/** Altura reservada para que el dock del chat suba y no tape el CTA (ver Chatbot.jsx). */
const STICKY_BAR_CSS_VAR = "--s4-sticky-purchase-bar-h";
const STICKY_BAR_OFFSET = "5rem";

/**
 * Barra fija móvil: miniatura + precio + CTA cuando el bloque principal sale del viewport.
 *
 * `inCartQty` es estado local de la ficha (sesión actual): al recargar vuelve a 0
 * porque no hay props.cart compartido en Inertia.
 */
export default function ProductStickyPurchaseBar({
    visible = false,
    canBuy = false,
    agotado = false,
    needsAccess = false,
    isGuest = false,
    priceLabel = "",
    anchorPriceLabel = "",
    imageUrl = "",
    productName = "",
    safeQty = 1,
    inCartQty = 0,
    onAddToCart,
}) {
    const showInCartPill = canBuy && inCartQty > 0;

    useEffect(() => {
        document.documentElement.style.setProperty(
            STICKY_BAR_CSS_VAR,
            visible ? STICKY_BAR_OFFSET : "0px",
        );
        return () => document.documentElement.style.setProperty(STICKY_BAR_CSS_VAR, "0px");
    }, [visible]);

    if (!visible) return null;

    return (
        <div
            className="fixed inset-x-0 bottom-0 z-40 border-t-[3px] border-s4 bg-white/95 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-12px_40px_-16px_rgba(15,23,42,0.25)] backdrop-blur-md lg:hidden"
            role="region"
            aria-label={productName ? `Comprar ${productName}` : "Comprar producto"}
        >
            <div className="mx-auto flex w-full min-w-0 max-w-6xl items-center gap-2 sm:gap-3">
                <BrandLogo
                    variant="navyNav"
                    className="hidden h-7 shrink-0 sm:block"
                    decorative
                />

                <div
                    className="h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-slate-200/90 sm:h-14 sm:w-14"
                    aria-hidden
                >
                    <SafeImage
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        placeholderClassName="h-full w-full"
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-x-1.5 overflow-hidden">
                        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            <span className="min-[380px]:hidden">Socio</span>
                            <span className="hidden min-[380px]:inline">Precio socio</span>
                        </p>
                        {showInCartPill ? (
                            <span
                                className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-emerald-800 ring-1 ring-emerald-200/80 animate-in fade-in duration-300"
                                aria-hidden
                            >
                                <Check className="h-2.5 w-2.5 shrink-0" aria-hidden />
                                En carrito · {inCartQty}
                            </span>
                        ) : null}
                    </div>
                    <div className="flex min-w-0 items-baseline gap-1.5">
                        <p className="shrink-0 font-heading text-lg font-extrabold tabular-nums text-s4 sm:text-xl">
                            {priceLabel}
                        </p>
                        {anchorPriceLabel ? (
                            <p className="hidden shrink-0 text-[11px] font-medium text-slate-400 line-through decoration-slate-400 min-[380px]:block">
                                {anchorPriceLabel}
                            </p>
                        ) : null}
                    </div>
                    <span className="sr-only" aria-live="polite">
                        {inCartQty > 0 ? `En tu carrito: ${inCartQty}` : ""}
                    </span>
                </div>

                {canBuy ? (
                    <S4Button
                        type="button"
                        variant="primary"
                        size="lg"
                        className="min-w-[96px] shrink-0 justify-center px-3 sm:px-4"
                        onClick={onAddToCart}
                    >
                        <ShoppingCart className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="sm:hidden">
                            Añadir{safeQty > 1 ? ` (${safeQty})` : ""}
                        </span>
                        <span className="hidden sm:inline">
                            Añadir al carrito{safeQty > 1 ? ` (${safeQty})` : ""}
                        </span>
                    </S4Button>
                ) : null}

                {agotado ? (
                    <S4Button
                        type="button"
                        variant="secondary"
                        size="lg"
                        className="min-w-[96px] shrink-0 justify-center px-4"
                        disabled
                    >
                        Agotado
                    </S4Button>
                ) : null}

                {needsAccess && isGuest ? (
                    <S4Button
                        href={route("login")}
                        variant="primary"
                        size="lg"
                        className="min-w-[96px] shrink-0 justify-center px-4"
                    >
                        <LogIn className="h-4 w-4" />
                        Entrar
                    </S4Button>
                ) : null}

                {needsAccess && !isGuest ? (
                    <S4Button
                        href={route("taquillas.planes")}
                        variant="primary"
                        size="lg"
                        className="min-w-[96px] shrink-0 justify-center px-4"
                    >
                        Taquilla
                    </S4Button>
                ) : null}
            </div>
        </div>
    );
}
