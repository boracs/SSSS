import React, { useState, useEffect } from "react";
import { Head, Link, usePage, router } from "@inertiajs/react";
import { ArrowLeft, ShoppingBag, ShoppingCart, Sparkles } from "lucide-react";
import Layout1 from "../layouts/Layout1";

function EmptyCartView() {
    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="relative border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-6 py-10 text-center sm:px-10">
                <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                    <ShoppingCart className="h-10 w-10 text-sky-200" strokeWidth={1.5} />
                </div>
                <h2 className="relative mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    Tu carrito está vacío
                </h2>
                <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-300">
                    Todavía no has añadido ningún producto. Explora la tienda y encuentra equipamiento, ropa y accesorios para tu próxima sesión.
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
                        <p className="text-lg font-semibold text-slate-900">Tienda oficial S4</p>
                        <p className="mt-1 text-sm text-slate-500">
                            Ropa, accesorios, merchandising y productos oficiales de la escuela.
                        </p>
                    </div>
                </Link>

                <div className="flex flex-col items-center gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-between">
                    <p className="inline-flex items-center gap-2 text-xs text-slate-500">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Los socios con taquilla pueden comprar desde la tienda online.
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
        const lineas = productos.map((p) => ({ id: p.id, cantidad: p.cantidad }));
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
            }
        );
    };

    // Determinar las clases de Toast
    const toastClasses =
        tipoToast === "success"
            ? "bg-green-100 border border-green-400 text-green-800"
            : "bg-red-100 border border-red-400 text-red-800";
    const toastIcon = tipoToast === "success" ? "✔ Éxito" : "❌ Error";

    return (
        <Layout1>
            <Head title="Carrito" />
            {/* Toast unificado para éxito o error */}
            {mensajeToast && (
                <div
                    className={`fixed top-5 right-5 px-4 py-3 rounded-lg shadow-lg animate-fade-in-down ${toastClasses}`}
                >
                    <strong className="font-semibold">{toastIcon}</strong>
                    <div className="text-sm">{mensajeToast}</div>
                </div>
            )}

            {productos.length === 0 ? (
                <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
                    <div className="mx-auto w-full max-w-3xl">
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                                Tu carrito
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Revisa tus productos antes de confirmar el pedido.
                            </p>
                        </div>
                        <EmptyCartView />
                    </div>
                </div>
            ) : (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center py-8">
                <div className="p-6 bg-white rounded-lg shadow-md max-w-lg mx-auto w-full">
                    <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                        Tu Carrito
                    </h2>

                        <div>
                            <ul className="divide-y divide-gray-200">
                                {productos.map((producto, index) => (
                                    <li
                                        key={index}
                                        className="py-4 flex items-center justify-between"
                                    >
                                        <div className="flex-1">
                                            <h3 className="text-lg font-medium text-gray-800">
                                                {producto.nombre}
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Cantidad: {producto.cantidad}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <p className="text-gray-800 font-medium">
                                                {new Intl.NumberFormat(
                                                    "es-ES",
                                                    {
                                                        minimumFractionDigits: 2,
                                                        maximumFractionDigits: 2,
                                                    }
                                                ).format(producto.precio)}{" "}
                                                €
                                            </p>
                                            <p className="text-gray-500">
                                                Subtotal: {new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(producto.subtotal))} €
                                            </p>
                                            <button
                                                onClick={() =>
                                                    abrirModal(producto.id)
                                                }
                                                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-150"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-6 pt-4 border-t border-gray-300">
                                <p className="text-xl font-semibold text-gray-800">
                                    Total:{" "}
                                    <span className="text-red-500">
                                        {new Intl.NumberFormat("es-ES", {
                                            style: "decimal",
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        }).format(total)}{" "}
                                        €
                                    </span>
                                </p>
                            </div>

                            <div className="mt-6 text-center">
                                {productos.length > 0 && (
                                    <>
                                        <button
                                            onClick={iniciarPagoStripe}
                                            disabled={!canCheckout || procesandoPago}
                                            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition duration-150 shadow-md ${
                                                canCheckout && !procesandoPago
                                                    ? "bg-violet-600 text-white hover:bg-violet-700"
                                                    : "bg-slate-300 text-slate-600 cursor-not-allowed"
                                            }`}
                                        >
                                            {procesandoPago ? (
                                                <>
                                                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Preparando pago…
                                                </>
                                            ) : (
                                                <>
                                                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                                                        <line x1="1" y1="10" x2="23" y2="10" />
                                                    </svg>
                                                    Pagar con tarjeta
                                                </>
                                            )}
                                        </button>
                                        {!canCheckout ? (
                                            <p className="mt-3 text-sm font-medium text-amber-700">
                                                Solo los usuarios con taquilla pueden comprar productos físicos.
                                            </p>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>

                    <div className="mt-6 text-center">
                        <button
                            type="button"
                            onClick={() => window.history.back()}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Volver atrás
                        </button>
                    </div>
                </div>
            </div>
            )}

            {/* Modal eliminar producto (Popup de verificación) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-70 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full transform transition-all duration-300 scale-100">
                        <h3 className="text-2xl font-bold text-red-600 mb-4">
                            ⚠️ Confirmar Eliminación
                        </h3>
                        <p className="text-lg text-gray-700 mb-6">
                            Estás a punto de eliminar un producto de tu carrito.
                            ¿Estás realmente seguro?
                        </p>
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={cerrarModal}
                                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition duration-150 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={eliminarProducto} // Solo si confirma, llama a la función de eliminación
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-150 font-bold"
                            >
                                Sí, Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </Layout1>
    );
};

export default Carrito;
