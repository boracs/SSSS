import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import { Lock, LogIn, MessageCircle, ShoppingCart } from "lucide-react";
import S4Button from "./S4Button";
import ContactChannelsModal from "./ContactChannelsModal";

/**
 * CTAs de compra en ficha producto según acceso (guest / sin taquilla / socio).
 */
export default function ProductPurchaseCta({
    canBuy,
    agotado,
    needsAccess,
    isGuest,
    safeQty,
    onAddToCart,
    qtySelect,
}) {
    const [contactOpen, setContactOpen] = useState(false);

    if (canBuy) {
        return (
            <>
                {qtySelect}
                <S4Button
                    type="button"
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                    onClick={onAddToCart}
                >
                    <ShoppingCart className="h-4 w-4" />
                    Añadir al carrito
                    {safeQty > 1 ? ` (${safeQty})` : ""}
                </S4Button>
            </>
        );
    }

    if (agotado) {
        return (
            <S4Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full justify-center"
                disabled
            >
                Agotado
            </S4Button>
        );
    }

    if (!needsAccess) {
        return (
            <S4Button
                type="button"
                variant="secondary"
                size="lg"
                className="w-full justify-center"
                disabled
            >
                <Lock className="h-4 w-4" />
                No disponible
            </S4Button>
        );
    }

    return (
        <>
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3.5 py-3 text-sm leading-relaxed text-slate-700">
                <p className="font-semibold text-slate-900">
                    {isGuest ? "Inicia sesión para comprar" : "Necesitas taquilla activa"}
                </p>
                <p className="mt-1">
                    La tienda del club es solo para socios con cuenta y taquilla. Recogida en
                    Zurriola.
                </p>
            </div>

            {isGuest ? (
                <S4Button
                    href={route("login")}
                    variant="primary"
                    size="lg"
                    className="w-full justify-center"
                >
                    <LogIn className="h-4 w-4" />
                    Iniciar sesión
                </S4Button>
            ) : (
                <S4Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    className="w-full justify-center opacity-90"
                    disabled
                    aria-disabled="true"
                >
                    <ShoppingCart className="h-4 w-4" />
                    Añadir al carrito
                </S4Button>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
                <S4Button
                    href={route("taquillas.planes")}
                    variant={isGuest ? "secondary" : "primary"}
                    size="lg"
                    className="w-full justify-center sm:flex-1"
                >
                    Ver planes de taquilla
                </S4Button>
                <button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:flex-1"
                >
                    <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                    Contacto
                </button>
            </div>

            {!isGuest ? (
                <p className="text-xs text-slate-500">
                    ¿Ya eres cliente habitual?{" "}
                    <button
                        type="button"
                        onClick={() => setContactOpen(true)}
                        className="font-semibold text-s4 underline-offset-2 hover:underline"
                    >
                        Escríbenos
                    </button>{" "}
                    y te ayudamos con el acceso.
                </p>
            ) : (
                <p className="text-xs text-slate-500">
                    ¿Aún no tienes cuenta?{" "}
                    <Link
                        href={route("register")}
                        className="font-semibold text-s4 underline-offset-2 hover:underline"
                    >
                        Regístrate
                    </Link>
                    .
                </p>
            )}

            {contactOpen ? (
                <ContactChannelsModal
                    topic="store"
                    title="Hablemos de tu acceso a la tienda"
                    subtitle="Cuéntanos tu situación y te ayudamos con taquilla o acceso de socio."
                    footerNote="Si eres cliente habitual, buscamos juntos una solución."
                    onClose={() => setContactOpen(false)}
                />
            ) : null}
        </>
    );
}
