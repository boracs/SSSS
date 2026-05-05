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
        <div
            className="w-full"
            onClick={() => handleVerProducto(producto.id)}
        >
            <div
                className="h-full rounded-2xl border border-slate-700/90 bg-gradient-to-b from-slate-800 to-slate-900 p-4 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-emerald-500/20 cursor-pointer group"
            >
                <div className="w-full overflow-hidden relative rounded-xl">
                    <img
                        src={imageSource} // Usando la fuente de imagen defensiva
                        alt={producto.nombre}
                        className="block h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    {descuento > 0 && (
                        <div className="absolute right-2 top-2 rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-lg">
                            -{parseInt(descuento)}% OFF
                        </div>
                    )}
                </div>
                <div
                    className="flex min-h-[156px] flex-col justify-between px-1 pt-3"
                >
                    <div>
                        <h2
                            className="mb-1 line-clamp-2 min-h-[3rem] text-left text-lg font-bold leading-tight text-slate-100"
                        >
                            {nombre}
                        </h2>
                        <div className="flex items-center justify-between mt-2">
                            {descuento > 0 ? (
                                <div className="flex flex-col text-left">
                                    <p className="text-sm font-medium text-slate-400 line-through">
                                        {precio} €
                                    </p>
                                    <p className="text-2xl font-extrabold tracking-tight text-emerald-300">
                                        {(
                                            precio -
                                            (descuento / 100) * precio
                                        ).toFixed(2)}{" "}
                                        €
                                    </p>
                                </div>
                            ) : (
                                <p className="text-2xl font-extrabold text-cyan-300 text-left">
                                    {precio} €
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="mt-4">
                        {user ? (
                            tieneTaquilla ? (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAgregarAlCarrito(producto.id);
                                    }}
                                    disabled={unidades === 0}
                                    className={`
                                    flex w-full items-center justify-center rounded-xl py-2.5 text-sm font-bold tracking-wide text-white transition-all duration-300
                                    ${
                                        unidades === 0
                                            ? "cursor-not-allowed bg-slate-600/70"
                                            : "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98]"
                                    }
                                `}
                                >
                                    {unidades === 0
                                        ? "AGOTADO"
                                        : "Añadir al Carrito"}
                                </button>
                            ) : (
                                <button
                                    onClick={(e) => e.stopPropagation()}
                                    className="group relative w-full cursor-not-allowed rounded-xl bg-amber-600 py-2.5 text-sm font-bold tracking-wide text-white shadow-md opacity-90"
                                    disabled
                                >
                                    <span className="opacity-100">
                                        Taquilla Requerida
                                    </span>
                                    <span className="absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] w-max max-w-xs text-center text-xs text-white bg-slate-900 rounded-lg p-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 whitespace-nowrap">
                                        Debes tener una taquilla asignada para
                                        poder comprar ofertas
                                    </span>
                                </button>
                            )
                        ) : (
                            <button
                                onClick={(e) => e.stopPropagation()}
                                className="group relative w-full cursor-not-allowed rounded-xl bg-slate-700 py-2.5 text-sm font-bold tracking-wide text-slate-200 shadow-inner"
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
