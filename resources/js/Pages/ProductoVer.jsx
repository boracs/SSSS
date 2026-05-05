import React, { useMemo, useState } from "react";
import { usePage, router } from "@inertiajs/react";
import Layout1 from "../layouts/Layout1";
import { toast } from "react-toastify";

function resolveImageSrc(raw) {
    if (!raw || typeof raw !== "string" || raw.includes("undefined")) {
        return "/img/placeholder.svg";
    }
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/")) return raw;
    return `/storage/${raw.replace(/^\/+/, "")}`;
}

const ProductVer = ({ producto, usuario }) => {
    const { auth } = usePage().props;
    const usuarioActual = usuario || auth?.user || null;
    const numeroTaquilla = usuarioActual?.numeroTaquilla || 0;

    const formatoPrecio = new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
    });

    const gallery = useMemo(() => {
        if (!producto) return [];
        const fromList = Array.isArray(producto.imagenes)
            ? producto.imagenes.map((img) => resolveImageSrc(img?.ruta || img))
            : [];
        const principal = resolveImageSrc(producto.imagen_principal || producto.imagenPrincipal);
        const merged = [principal, ...fromList].filter(Boolean);
        return [...new Set(merged)];
    }, [producto]);

    const [imagenPrincipal, setImagenPrincipal] = useState(gallery[0] || "/img/placeholder.svg");

    if (!producto) {
        return (
            <Layout1>
                <div className="mx-auto flex min-h-[60vh] max-w-7xl items-center justify-center px-4">
                    <p className="text-base font-medium text-slate-300">Cargando producto...</p>
                </div>
            </Layout1>
        );
    }

    const precio = Number(producto.precio || 0);
    const descuento = Number(producto.descuento || 0);
    const precioFinal = descuento > 0 ? precio - (precio * descuento) / 100 : precio;
    const stock = Number(producto.unidades || 0);
    const agotado = stock <= 0;
    const stockBajo = stock > 0 && stock <= 3;
    const tieneTaquilla = !(numeroTaquilla === 0 || numeroTaquilla === null);
    const canBuy = tieneTaquilla && !agotado;

    const handleAgregarAlCarrito = (productoId) => {
        router.post(route("carrito.agregar", productoId), {}, {
            onSuccess: () => toast.success("Producto agregado al carrito"),
            onError: () => toast.error("Hubo un problema al agregar el producto al carrito"),
            preserveState: true,
            preserveScroll: true,
        });
    };

    return (
        <Layout1>
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Tienda · Detalle de producto
                    </p>
                    <button
                        type="button"
                        onClick={() => router.get(route("tienda"))}
                        className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                    >
                        Volver a tienda
                    </button>
                </div>
                <div className="rounded-3xl border border-slate-700/80 bg-gradient-to-b from-slate-800 to-slate-900 p-4 shadow-xl sm:p-6 lg:p-8">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
                        <section className="lg:col-span-7">
                            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/40">
                                <img
                                    src={imagenPrincipal}
                                    alt={producto.nombre}
                                    className="h-[320px] w-full object-contain sm:h-[420px] lg:h-[500px]"
                                />
                            </div>
                            {gallery.length > 1 ? (
                                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                                    {gallery.map((src, idx) => (
                                        <button
                                            key={`${src}-${idx}`}
                                            type="button"
                                            onClick={() => setImagenPrincipal(src)}
                                            className={`shrink-0 overflow-hidden rounded-xl border transition ${
                                                src === imagenPrincipal
                                                    ? "border-cyan-400 ring-2 ring-cyan-500/30"
                                                    : "border-slate-600 hover:border-slate-400"
                                            }`}
                                        >
                                            <img
                                                src={src}
                                                alt={`${producto.nombre} miniatura ${idx + 1}`}
                                                className="h-20 w-20 object-cover sm:h-24 sm:w-24"
                                            />
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </section>

                        <section className="lg:col-span-5">
                            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-5 lg:sticky lg:top-6">
                                <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                                    {producto.nombre}
                                </h1>
                                <p className="mt-1 text-xs text-slate-400">Referencia producto #{producto.id}</p>

                                <div className="mt-5 rounded-xl border border-slate-700 bg-slate-950/40 p-4">
                                    {descuento > 0 ? (
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium text-slate-400 line-through">
                                                {formatoPrecio.format(precio)}
                                            </p>
                                            <p className="text-3xl font-extrabold text-emerald-300">
                                                {formatoPrecio.format(precioFinal)}
                                            </p>
                                            <p className="text-sm font-semibold text-rose-300">
                                                Descuento aplicado: {parseInt(descuento, 10)}%
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-3xl font-extrabold text-cyan-300">
                                            {formatoPrecio.format(precio)}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 space-y-2">
                                    {agotado ? (
                                        <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200">
                                            Producto agotado
                                        </p>
                                    ) : stockBajo ? (
                                        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-200">
                                            Solo quedan {stock} unidad{stock > 1 ? "es" : ""}
                                        </p>
                                    ) : (
                                        <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200">
                                            Disponible: {stock} unidades
                                        </p>
                                    )}
                                </div>

                                <div className="mt-6">
                                    <button
                                        type="button"
                                        onClick={() => canBuy && handleAgregarAlCarrito(producto.id)}
                                        disabled={!canBuy}
                                        className={`w-full rounded-xl px-4 py-3 text-sm font-bold tracking-wide transition ${
                                            canBuy
                                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 hover:from-emerald-600 hover:to-teal-600"
                                                : "cursor-not-allowed bg-slate-600 text-slate-200"
                                        }`}
                                    >
                                        {agotado ? "Agotado" : tieneTaquilla ? "Añadir al carrito" : "Taquilla requerida"}
                                    </button>
                                    {!tieneTaquilla ? (
                                        <p className="mt-3 text-sm text-amber-200">
                                            Debes tener una taquilla asignada para comprar en esta oferta.
                                        </p>
                                    ) : (
                                        <p className="mt-3 text-xs text-slate-400">
                                            Compra segura: puedes revisar y editar cantidades en el carrito antes de confirmar.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Layout1>
    );
};

export default ProductVer;
