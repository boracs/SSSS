import React, { useState, useEffect } from "react";
import { Head, Link, usePage, router } from "@inertiajs/react";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Minus,
    Plus,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import ImageLightbox from "../components/ImageLightbox";
import SafeImage from "../components/SafeImage";
import Layout1 from "../layouts/Layout1";
import { resolveCatalogImage } from "../utils/demoCatalogImages";

function formatCartEur(value) {
    const n = parseFloat(String(value ?? 0).replace(",", "."));
    return new Intl.NumberFormat("es-ES", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(n) ? n : 0);
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
    // 1. Obtener los props y el objeto flash directamente de usePage()
    // Inertia se encarga de que estos props se actualicen automáticamente después de las visitas.
    const { props } = usePage();
    const {
        productos = [],
        total = 0,
        flash,
        canCheckout = false,
        paymentIban = "[IBAN]",
        paymentBizumNumber = "[BIZUM_NUMBER]",
        whatsappHelpUrl = null,
    } = props;

    // Estado local para el mensaje de notificación (Toast)
    const [mensajeToast, setMensajeToast] = useState("");
    const [tipoToast, setTipoToast] = useState(""); // 'success' o 'error'

    // Estado para los modales
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productoAEliminar, setProductoAEliminar] = useState(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);

    // --- EFECTO: Manejar mensajes flash de Laravel (incluye el mensaje de éxito de eliminar) ---
    useEffect(() => {
        // Muestra el mensaje de éxito enviado por el controlador
        if (flash.success) {
            setMensajeToast(flash.success);
            setTipoToast("success");
            setTimeout(() => setMensajeToast(""), 4000);
        }
        // Muestra el mensaje de error enviado por el controlador
        if (flash.error) {
            setMensajeToast(flash.error);
            setTipoToast("error");
            setTimeout(() => setMensajeToast(""), 4000);
        }
    }, [flash]); // Se ejecuta cada vez que el objeto flash cambia (después de una visita de Inertia)

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
            setMensajeToast("El total del pedido no es válido.");
            setTipoToast("error");
            setTimeout(() => setMensajeToast(""), 4000);
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
                    setMensajeToast(errorMessage);
                    setTipoToast("error");
                    setTimeout(() => setMensajeToast(""), 4000);
                },
                onFinish: () => {
                    // Si Stripe redirige fuera, da igual; si volvemos al carrito (error), desbloquea.
                    setProcesandoPago(false);
                },
            },
        );
    };

    return (
        <Layout1>
            <Head title="Carrito" />
            {mensajeToast ? (
                <div
                    className={`fixed right-5 top-5 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg ${
                        tipoToast === "success"
                            ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                            : "border-rose-300 bg-rose-50 text-rose-800"
                    }`}
                >
                    {tipoToast === "success" ? (
                        <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-600"
                            aria-hidden="true"
                        />
                    ) : (
                        <AlertCircle
                            className="h-4 w-4 shrink-0 text-rose-600"
                            aria-hidden="true"
                        />
                    )}
                    <span className="text-sm">{mensajeToast}</span>
                </div>
            ) : null}

            {productos.length === 0 ? (
                <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                    <div className="mx-auto w-full max-w-3xl">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
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
                <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                    <div className="mx-auto w-full max-w-3xl">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Tu carrito
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Revisa tus productos antes de confirmar el
                                pedido.
                            </p>
                        </div>

                        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
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
                                        className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
                                    >
                                        <div className="flex min-w-0 flex-1 gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setLightbox({
                                                        src: imageSrc,
                                                        alt: producto.nombre,
                                                    })
                                                }
                                                aria-label={`Ampliar imagen de ${producto.nombre}`}
                                                className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:border-cyan-400/60 sm:h-[4.5rem] sm:w-[4.5rem]"
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
                                            <p className="font-semibold text-slate-900">
                                                {producto.nombre}
                                            </p>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-3">
                                                <p className="text-sm text-slate-500">
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

                                        <div className="flex shrink-0 items-center justify-between gap-4 sm:flex-col sm:items-end sm:justify-start">
                                            <div className="text-right">
                                                {Number(producto.descuento) >
                                                    0 &&
                                                Number(
                                                    producto.precio_original,
                                                ) > Number(producto.precio) ? (
                                                    <p className="text-xs tabular-nums text-slate-400 line-through">
                                                        {formatCartEur(
                                                            producto.precio_original,
                                                        )}{" "}
                                                        €
                                                    </p>
                                                ) : null}
                                                <p className="text-sm tabular-nums text-slate-500">
                                                    {formatCartEur(
                                                        producto.precio,
                                                    )}{" "}
                                                    € / ud
                                                </p>
                                                <p className="font-semibold tabular-nums text-slate-900">
                                                    {formatCartEur(
                                                        producto.subtotal,
                                                    )}{" "}
                                                    €
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    abrirModal(producto.id)
                                                }
                                                aria-label="Descartar producto"
                                                title="Descartar"
                                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
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
                                    {formatCartEur(total)} €
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={iniciarPagoStripe}
                                disabled={!canCheckout || procesandoPago}
                                className={`mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition ${
                                    canCheckout && !procesandoPago
                                        ? "bg-cyan-600 text-white hover:bg-cyan-500"
                                        : "cursor-not-allowed bg-slate-200 text-slate-500"
                                }`}
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
                            </button>

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
        </Layout1>
    );
};

export default Carrito;
