import { usePage, router } from "@inertiajs/react";
import React from "react";
import { toast } from "react-toastify";

const Producto = ({
    nombre,
    precio,
    imagenes,
    unidades,
    descuento,
    producto,
}) => {
    const { auth } = usePage().props;
    const user = auth?.user;

    // Verificar si el usuario tiene una taquilla asignada y distinta de 0 o null
    const tieneTaquilla =
        user &&
        user.numeroTaquilla &&
        user.numeroTaquilla !== 0 &&
        user.numeroTaquilla !== null;

    // Lógica para manejar la adición al carrito
    const handleAgregarAlCarrito = (productoId) => {
        router.post(
            route("carrito.agregar", productoId),
            {},
            {
                onSuccess: () => toast.success("Producto agregado al carrito"),
                onError: () =>
                    toast.error(
                        "Hubo un problema al agregar el producto al carrito"
                    ),
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    // Lógica para manejar la navegación a la vista del producto
    const handleVerProducto = (productoId) => {
        router.get(
            route("producto.ver", { productoId }),
            {},
            {
                preserveState: false,
                preserveScroll: true,
            }
        );
    };

    // Lógica para determinar la fuente de la imagen.
    // Acepta URL absoluta (backend con asset()) o ruta relativa; evita 403 usando la URL que envía Laravel.
    const raw = producto.imagenPrincipal ?? producto.imagen_principal;
    const imageSource =
        raw &&
        typeof raw === "string" &&
        !raw.includes("undefined")
            ? raw.startsWith("http")
                ? raw
                : raw.startsWith("/") ? raw : `/storage/${raw.replace(/^\/+/, "")}`
            : "/img/placeholder.svg";

    return (
        <div>
            <div
                // 💡 Tarjeta: Cambiamos a un color oscuro (slate-800) con bordes y sombras de alto contraste.
                className="max-w-xs w-full bg-slate-800 border border-gray-700 rounded-2xl shadow-3xl overflow-hidden hover:shadow-4xl hover:shadow-emerald-500/40 transition-all duration-500 cursor-pointer p-5 group"
                onClick={() => handleVerProducto(producto.id)}
            >
                <div className="w-full overflow-hidden relative rounded-xl">
                    <img
                        src={imageSource} // Usando la fuente de imagen defensiva
                        alt={producto.nombre}
                        // 💡 AJUSTE: Aseguramos que la imagen use 'block' para eliminar espacios extraños y la hacemos crecer.
                        className="w-full h-48 object-cover transition-transform duration-500 group-hover:scale-105 block"
                    />
                    {descuento > 0 && (
                        // Etiqueta de descuento más moderna y visible en la imagen
                        <div className="absolute top-2 right-2 bg-pink-600 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-lg">
                            -{parseInt(descuento)}% OFF
                        </div>
                    )}
                </div>
                <div
                    // 💡 AJUSTE DE ALTURA: min-h-[140px] asegura que haya suficiente espacio para el contenido variable.
                    // Usamos 'flex flex-col justify-between' para que el botón siempre quede abajo.
                    className="p-2 pt-4 flex flex-col min-h-[140px] justify-between"
                >
                    <div>
                        {" "}
                        {/* Contenedor para Título y Precios */}
                        <h2
                            // 💡 CORRECCIÓN: 'text-left' para asegurar alineación a la izquierda si el contenedor padre
                            // tiene 'text-center' y forzamos el límite a 2 líneas para estabilidad.
                            className="text-2xl font-extrabold text-white tracking-tight mb-1 overflow-hidden h-14 line-clamp-2 text-left"
                        >
                            {nombre}
                        </h2>
                        {/* BLOQUE DE PRECIOS */}
                        <div className="flex items-center justify-between mt-2">
                            {descuento > 0 ? (
                                <div className="flex flex-col text-left">
                                    {/* Precio Original (tachado y sutil) */}
                                    <p className="text-base font-medium text-gray-400 line-through">
                                        {precio} €
                                    </p>
                                    {/* Precio Final (el más destacado, usando un color techie: emerald) */}
                                    <p className="text-3xl font-extrabold text-emerald-400 tracking-tight">
                                        {(
                                            precio -
                                            (descuento / 100) * precio
                                        ).toFixed(2)}{" "}
                                        €
                                    </p>
                                </div>
                            ) : (
                                // Precio base sin descuento
                                <p className="text-3xl font-extrabold text-indigo-400 text-left">
                                    {precio} €
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-6">
                        {user ? (
                            tieneTaquilla ? (
                                /* 🏆 1. ESTADO HABILITADO (Logueado y con Taquilla) 🏆 */
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAgregarAlCarrito(producto.id);
                                    }}
                                    disabled={unidades === 0}
                                    className={`
                                    w-full py-3.5 rounded-xl font-extrabold transition-all duration-300 shadow-xl text-white flex items-center justify-center tracking-wider
                                    ${
                                        unidades === 0
                                            ? "bg-gray-600 cursor-not-allowed shadow-none" // AGOTADO
                                            : "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.97] shadow-emerald-500/50" // COMPRA ACTIVA
                                    }
                                `}
                                >
                                    {unidades === 0
                                        ? "AGOTADO"
                                        : "Añadir al Carrito"}
                                </button>
                            ) : (
                                /* ⚠️ 2. ESTADO DESHABILITADO (Logueado pero sin Taquilla) ⚠️ */
                                <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full py-3.5 rounded-xl font-extrabold bg-amber-600 text-white cursor-not-allowed relative group shadow-md opacity-90 tracking-wider"
                                    disabled
                                >
                                    <span className="opacity-100">
                                        Taquilla Requerida
                                    </span>
                                    {/* Tooltip: Perfecto para el tema oscuro */}
                                    <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] w-max max-w-xs text-center text-xs text-white bg-slate-900 rounded-lg p-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 whitespace-nowrap">
                                        Debes tener una taquilla asignada para
                                        poder comprar ofertas
                                    </span>
                                </button>
                            )
                        ) : (
                            /* 🚫 3. ESTADO DESHABILITADO (No Logueado) 🚫 */
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="w-full py-3.5 rounded-xl font-extrabold bg-gray-700 text-gray-300 cursor-not-allowed relative group shadow-inner tracking-wider"
                                disabled
                            >
                                <span className="opacity-90">
                                    Iniciar Sesión
                                </span>
                                {/* Tooltip: Perfecto para el tema oscuro */}
                                <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] w-max max-w-xs text-center text-xs text-white bg-slate-900 rounded-lg p-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 whitespace-nowrap">
                                    Debes estar logueado para agregar productos
                                    al carrito
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Producto;
