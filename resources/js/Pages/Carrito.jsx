import React, { useState, useEffect } from "react";
import { Link, usePage, router } from "@inertiajs/react";
import { toast } from "react-toastify";
import SeoHead from "@/components/seo/SeoHead";
import {
    ArrowLeft,
    Minus,
    Plus,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import ProductTagPills from "../components/ProductTagPills";
import SafeImage from "../components/SafeImage";
import ImageLightbox from "@/components/ImageLightbox";
import PageShell from "@/layouts/PageShell";
import { resolveCatalogImage } from "../utils/demoCatalogImages";
import useInertiaFlashToast from "@/hooks/useInertiaFlashToast";
import S4Button from "@/components/S4Button";
import { formatEur } from "@/utils/money";

/** Backend envía euros como float; parsea coma decimal por si acaso. */
function formatLineEur(value) {
    const n = parseFloat(String(value ?? 0).replace(",", "."));
    return formatEur(Number.isFinite(n) ? n : 0);
}

function EmptyCartView() {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-6 py-10 text-center sm:px-10">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                    <ShoppingCart
                        className="h-10 w-10 text-sky-200"
                        strokeWidth={1.5}
                    />
                </div>
                <h2 className="relative mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Tu carrito está vacío
                </h2>
                <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
                    Todavía no has añadido ningún producto. Explora la tienda y
                    encuentra equipamiento, ropa y accesorios para tu próxima
                    sesión.
                </p>
            </div>

            <div className="space-y-4 px-6 py-8 sm:px-10">
                <Link
                    href={route("tienda")}
                    className="group mx-auto flex max-w-lg items-start gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 transition hover:border-sky-200 hover:bg-sky-50/60"
                >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 transition group-hover:bg-sky-200">
                        <ShoppingBag className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 text-left">
                        <p className="text-lg font-semibold text-slate-900">
                            Tienda oficial S4
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            Ropa, accesorios, merchandising y productos
                            oficiales de la escuela.
                        </p>
                    </div>
                </Link>

                <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
                    <p className="inline-flex items-center gap-2 text-xs text-slate-500">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Los socios con taquilla pueden comprar desde la tienda
                        online.
                    </p>
                    <button
                        type="button"
                        onClick={() => window.history.back()}
                        className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver atrás
                    </button>
                </div>
            </div>
        </div>
    );
}

const Carrito = () => {
    const { props } = usePage();
    useInertiaFlashToast();
    const {
        productos = [],
        total = 0,
        canCheckout = false,
        whatsappHelpUrl = null,
        seo = null,
    } = props;

    // Estado para los modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoAEliminar, setProductoAEliminar] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    // --- Modal eliminar producto ---
    const abrirModal = (productoId) => {
        setProductoAEliminar(productoId);
        setIsModalOpen(true); // Abre el popup de verificación
    };

    const cerrarModal = () => {
        setProductoAEliminar(null);
        setIsModalOpen(false);
    };

    useEffect(() => {
        if (!isModalOpen) return;
        const onKey = (e) => {
            if (e.key === "Escape") cerrarModal();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isModalOpen]);

    const abrirModalPagoPedido = () => setPaymentModalOpen(true);
    const cerrarModalPagoPedido = () => setPaymentModalOpen(false);

    const eliminarProducto = () => {
        if (!productoAEliminar) return;

        // 💡 Usamos router.delete. El controlador de Laravel hará el Redirect::route('carrito')
        // Inertia recargará los props automáticamente (productos y total se actualizan)
        // y el useEffect capturará el mensaje flash de éxito.
        router.delete(route("carrito.eliminar", productoAEliminar), {
            preserveScroll: true,
            onFinish: () => {
                // Cierra el modal después de que la petición termine (éxito o fallo)
                cerrarModal();
            },
        });
    };

    const [cantidadEnCurso, setCantidadEnCurso] = useState(null);
    const [lightbox, setLightbox] = useState(null);

    const actualizarCantidad = (productoId, cantidad) => {
        if (cantidadEnCurso === productoId) return;
        setCantidadEnCurso(productoId);
        router.patch(
            route("carrito.cantidad", productoId),
            { cantidad },
            {
                preserveScroll: true,
                onFinish: () => setCantidadEnCurso(null),
            },
        );
    };

    const [procesandoPago, setProcesandoPago] = useState(false);

    const iniciarPagoStripe = () => {
        const totalNumerico = parseFloat(String(total).replace(",", "."));
        if (isNaN(totalNumerico) || totalNumerico <= 0) {
            toast.error("El total del pedido no es válido.");
            return;
        }
        setProcesandoPago(true);
        const lineas = productos.map((p) => ({
            id: p.id,
            // Misma cantidad que muestra el selector (+/−) de la línea.
            cantidad: Math.max(1, Number(p.cantidad) || 1),
        }));
        router.post(
            route("crear.pedido"),
            {
                productos_json: JSON.stringify(lineas),
                total: String(totalNumerico),
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setProcesandoPago(false);
                    const errorMessage =
                        errors.stock ||
                        errors.general ||
                        errors.productos_json ||
                        "Error al procesar el pedido. Inténtalo de nuevo.";
                    toast.error(errorMessage);
                },
                onFinish: () => {
                    // Si Stripe redirige fuera, da igual; si volvemos al carrito (error), desbloquea.
                    setProcesandoPago(false);
                },
            },
        );
    };

    return (
        <PageShell variant="light">
            <SeoHead seo={seo} />

            {productos.length === 0 ? (
                <div className="px-4 py-10 sm:px-6">
                    <div className="mx-auto w-full max-w-3xl">
                        <div className="mb-6">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Tu carrito
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Revisa tus productos antes de confirmar el
                                pedido.
                            </p>
                        </div>
                        <EmptyCartView />
                    </div>
                </div>
            ) : (
                <div className="px-4 py-10 sm:px-6">
                    <div className="mx-auto w-full max-w-3xl">
                        <div className="mb-6">
                            <h1 className="font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Tu carrito
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Revisa tus productos antes de confirmar el
                                pedido.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-8">
                            <ul>
                                {productos.map((producto) => {
                                    // cantidad = valor del selector (+/−), nunca el descuento.
                                    const cantidad = Math.max(
                                        0,
                                        Number(producto.cantidad) || 0,
                                    );
                                    const stock = Number(producto.stock);
                                    const maxStock = Number.isFinite(stock)
                                        ? stock
                                        : Infinity;
                                    const busy = cantidadEnCurso === producto.id;
                                    const canDecrease = cantidad > 1 && !busy;
                                    const canIncrease = cantidad < maxStock && !busy;

                                    const imageSrc = resolveCatalogImage(
                                        producto.imagen,
                                        {
                                            id: producto.id,
                                            nombre: producto.nombre,
                                        },
                                    );

                                    return (
                                    <li
                                        key={producto.id}
                                        className="flex items-start justify-between gap-2 border-b border-slate-100 py-4 last:border-0 sm:gap-4"
                                    >
                                        <div className="flex min-w-0 flex-1 gap-2 sm:gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setLightbox({
                                                        src: imageSrc,
                                                        alt: producto.nombre,
                                                    })
                                                }
                                                aria-label={`Ampliar imagen de ${producto.nombre}`}
                                                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-cyan-400/60 sm:h-[4.5rem] sm:w-[4.5rem]"
                                            >
                                                <SafeImage
                                                    src={imageSrc}
                                                    alt=""
                                                    className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                                                    placeholderClassName="rounded-none"
                                                />
                                                <span
                                                    className="pointer-events-none absolute bottom-1 right-1 inline-flex h-5 w-5 items-center justify-center rounded-md bg-slate-950/70 text-white"
                                                    aria-hidden="true"
                                                >
                                                    <Plus
                                                        className="h-3 w-3"
                                                        strokeWidth={2.5}
                                                    />
                                                </span>
                                            </button>
                                            <div className="min-w-0 flex-1">
                                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
                                                {producto.nombre}
                                            </p>
                                            <ProductTagPills
                                                labels={producto.tag_labels}
                                                surface="light"
                                                max={1}
                                                className="mt-1"
                                            />
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 sm:gap-3">
                                                <p className="text-xs text-slate-500 sm:text-sm">
                                                    Cantidad:{" "}
                                                    <span className="font-bold tabular-nums text-slate-900">
                                                        {cantidad}
                                                    </span>
                                                </p>
                                                <div
                                                    className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5"
                                                    role="group"
                                                    aria-label="Cambiar cantidad"
                                                >
                                                    <button
                                                        type="button"
                                                        disabled={!canDecrease}
                                                        onClick={() =>
                                                            actualizarCantidad(
                                                                producto.id,
                                                                cantidad - 1,
                                                            )
                                                        }
                                                        aria-label="Quitar una unidad"
                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-300"
                                                    >
                                                        <Minus
                                                            className="h-3 w-3"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!canIncrease}
                                                        onClick={() =>
                                                            actualizarCantidad(
                                                                producto.id,
                                                                cantidad + 1,
                                                            )
                                                        }
                                                        aria-label="Añadir una unidad"
                                                        className="inline-flex h-6 w-6 items-center justify-center rounded-md text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:text-slate-300"
                                                    >
                                                        <Plus
                                                            className="h-3 w-3"
                                                            aria-hidden="true"
                                                        />
                                                    </button>
                                                </div>
                                            </div>
                                            {Number(producto.descuento) > 0 ? (
                                                <span className="mt-1 inline-block text-xs font-medium text-cyan-700">
                                                    −{producto.descuento}%
                                                </span>
                                            ) : null}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-1 sm:gap-2">
                                            <div className="text-right">
                                                {Number(producto.descuento) >
                                                    0 &&
                                                Number(
                                                    producto.precio_original,
                                                ) > Number(producto.precio) ? (
                                                    <p className="text-[10px] tabular-nums text-slate-400 line-through sm:text-xs">
                                                        {formatLineEur(producto.precio_original)}
                                                    </p>
                                                ) : null}
                                                <p className="text-xs tabular-nums text-slate-500 sm:text-sm">
                                                    {formatLineEur(producto.precio)} / ud
                                                </p>
                                                <p className="text-sm font-semibold tabular-nums text-slate-900 sm:text-base">
                                                    {formatLineEur(producto.subtotal)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirModal(producto.id)
                                                }
                                                aria-label="Descartar producto"
                                                title="Descartar"
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 sm:h-9 sm:w-9"
                                            >
                                                <Trash2
                                                    className="h-4 w-4"
                                                    aria-hidden="true"
                                                />
                                            </button>
                                        </div>
                                    </li>
                                    );
                                })}
                            </ul>

                            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
                                <p className="text-base font-semibold text-slate-700">
                                    Total
                                </p>
                                <p className="text-xl font-bold tabular-nums text-slate-900">
                                    {formatLineEur(total)}
                                </p>
                            </div>

                            <S4Button
                                variant="primary"
                                size="lg"
                                className="mt-5 w-full"
                                onClick={iniciarPagoStripe}
                                disabled={!canCheckout || procesandoPago}
                            >
                                {procesandoPago ? (
                                    <>
                                        <svg
                                            className="h-4 w-4 animate-spin"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Preparando pago…
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className="h-4 w-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <rect
                                                x="1"
                                                y="4"
                                                width="22"
                                                height="16"
                                                rx="2"
                                                ry="2"
                                            />
                                            <line
                                                x1="1"
                                                y1="10"
                                                x2="23"
                                                y2="10"
                                            />
                                        </svg>
                                        Pagar con tarjeta
                                    </>
                                )}
                            </S4Button>

                            {!canCheckout ? (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    <p className="font-medium">
                                        Solo los usuarios con taquilla pueden
                                        comprar productos físicos.
                                    </p>
                                    <Link
                                        href={route("taquillas.planes")}
                                        className="mt-2 inline-flex font-semibold text-amber-900 underline-offset-2 hover:underline"
                                    >
                                        Conseguir taquilla
                                    </Link>
                                </div>
                            ) : null}

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <Link
                                    href={route("tienda")}
                                    className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                >
                                    Seguir comprando
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Volver atrás
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isModalOpen ? (
                <div
                    className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
                    role="presentation"
                    onClick={cerrarModal}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="carrito-descartar-titulo"
                        className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={cerrarModal}
                            aria-label="Cerrar"
                            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X className="h-4 w-4" aria-hidden="true" />
                        </button>

                        <div className="px-6 pb-6 pt-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 ring-1 ring-rose-100">
                                <Trash2
                                    className="h-6 w-6 text-rose-600"
                                    aria-hidden="true"
                                />
                            </div>
                            <h3
                                id="carrito-descartar-titulo"
                                className="mt-4 text-lg font-bold tracking-tight text-slate-900"
                            >
                                ¿Descartar este producto?
                            </h3>
                            {productoAEliminar ? (
                                <p className="mt-1 text-sm font-medium text-slate-800">
                                    {productos.find((p) => p.id === productoAEliminar)
                                        ?.nombre || "Producto"}
                                </p>
                            ) : null}
                            <p className="mt-2 text-sm leading-relaxed text-slate-500">
                                Se quitará del carrito con todas sus unidades.
                                Puedes volver a añadirlo desde la tienda.
                            </p>
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:flex-row sm:justify-end sm:gap-3 sm:px-6">
                            <button
                                type="button"
                                onClick={cerrarModal}
                                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={eliminarProducto}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Descartar
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <ImageLightbox
                open={Boolean(lightbox?.src)}
                src={lightbox?.src}
                alt={lightbox?.alt || "Imagen del producto"}
                onClose={() => setLightbox(null)}
            />
        </PageShell>
    );
};

export default Carrito;
