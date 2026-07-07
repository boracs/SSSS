import React, { useMemo } from "react";
import { Head, usePage, router } from "@inertiajs/react";
import Layout1 from "../layouts/Layout1";
import Contenedor_productos from "../layouts/Contenedor_productos";
import ProductImageGallery from "../components/ProductImageGallery";
import { toast } from "react-toastify";
import { ArrowLeft, Lock, ShoppingCart, Tag } from "lucide-react";

function resolveImageSrc(raw) {
    if (!raw || typeof raw !== "string" || raw.includes("undefined")) {
        return "/img/placeholder.svg";
    }
    if (raw.startsWith("http")) return raw;
    if (raw.startsWith("/")) return raw;
    return `/storage/${raw.replace(/^\/+/, "")}`;
}

const ProductVer = ({ producto, usuario, productosRelacionados = [] }) => {
    const { auth } = usePage().props;
    const usuarioActual = usuario || auth?.user || null;

    const tieneTaquilla =
        usuarioActual &&
        (usuarioActual.has_store_discount_access === true ||
            String(usuarioActual.has_store_discount_access) === "1" ||
            (usuarioActual.numeroTaquilla &&
                usuarioActual.numeroTaquilla !== 0 &&
                usuarioActual.numeroTaquilla !== "0" &&
                usuarioActual.numeroTaquilla !== null));

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

    const productJsonLd = useMemo(() => {
        if (!producto) return null;

        const precioNum = Number(producto.precio || 0);
        const descuentoNum = Number(producto.descuento || 0);
        const precioOferta =
            descuentoNum > 0 ? precioNum - (precioNum * descuentoNum) / 100 : precioNum;

        return {
            "@context": "https://schema.org",
            "@type": "Product",
            name: producto.nombre,
            sku: String(producto.id),
            image: gallery.length > 0 ? gallery : undefined,
            category: (producto.tag_labels || []).join(", ") || undefined,
            offers: {
                "@type": "Offer",
                priceCurrency: "EUR",
                price: precioOferta.toFixed(2),
                availability:
                    Number(producto.unidades || 0) > 0
                        ? "https://schema.org/InStock"
                        : "https://schema.org/OutOfStock",
            },
        };
    }, [producto, gallery]);

    if (!producto) {
        return (
            <Layout1>
                <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
                    <p className="text-base font-medium text-slate-300">Cargando producto...</p>
                </div>
            </Layout1>
        );
    }

    const precio = Number(producto.precio || 0);
    const descuento = Number(producto.descuento || 0);
    const precioFinal = descuento > 0 ? precio - (precio * descuento) / 100 : precio;
    const ahorro = precio - precioFinal;
    const stock = Number(producto.unidades || 0);
    const agotado = stock <= 0;
    const stockBajo = stock > 0 && stock <= 3;
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
            <Head title={`${producto.nombre} · Tienda S4`}>
                {productJsonLd ? (
                    <script type="application/ld+json">{JSON.stringify(productJsonLd)}</script>
                ) : null}
            </Head>

            <div className="mx-auto w-full max-w-4xl px-3 py-4 sm:px-4 sm:py-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Tienda · Detalle
                    </p>
                    <button
                        type="button"
                        onClick={() => router.get(route("tienda"))}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/10"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver
                    </button>
                </div>

                <article className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-800/90 to-slate-950 shadow-lg">
                    <div className="grid grid-cols-2 items-start gap-2.5 p-2.5 sm:gap-4 sm:p-4 md:gap-5 md:p-5">
                        <section className="min-w-0" aria-label="Galería del producto">
                            <ProductImageGallery
                                images={gallery}
                                productName={producto.nombre}
                                compact
                            />
                        </section>

                        <section className="flex min-w-0 flex-col gap-2 sm:gap-2.5">
                            <div>
                                <h1 className="font-heading text-sm font-bold leading-snug text-white sm:text-base md:text-lg">
                                    {producto.nombre}
                                </h1>
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                    Ref. #{producto.id}
                                </p>
                                {(producto.tag_labels || []).length > 0 ? (
                                    <ul
                                        className="mt-1.5 flex flex-wrap gap-1"
                                        aria-label="Categorías del producto"
                                    >
                                        {producto.tag_labels.map((label) => (
                                            <li
                                                key={label}
                                                className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-200"
                                            >
                                                {label}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </div>

                            <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 sm:px-3 sm:py-2.5">
                                {descuento > 0 ? (
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500/15 px-1.5 py-0.5 text-[10px] font-bold text-orange-300">
                                                <Tag className="h-2.5 w-2.5" />
                                                -{parseInt(descuento, 10)}%
                                            </span>
                                            <span className="text-[11px] text-slate-500 line-through">
                                                {formatoPrecio.format(precio)}
                                            </span>
                                        </div>
                                        <p className="text-lg font-extrabold tabular-nums text-emerald-300 sm:text-xl">
                                            {formatoPrecio.format(precioFinal)}
                                        </p>
                                        <p className="text-[11px] text-emerald-200/75">
                                            Ahorras {formatoPrecio.format(ahorro)}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-lg font-extrabold tabular-nums text-cyan-300 sm:text-xl">
                                        {formatoPrecio.format(precio)}
                                    </p>
                                )}
                            </div>

                            {agotado ? (
                                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-200">
                                    Agotado
                                </p>
                            ) : stockBajo ? (
                                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200">
                                    Quedan {stock} uds.
                                </p>
                            ) : (
                                <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-200">
                                    Disponible · {stock} uds.
                                </p>
                            )}

                            {canBuy ? (
                                <button
                                    type="button"
                                    onClick={() => handleAgregarAlCarrito(producto.id)}
                                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-bold text-white shadow-md transition hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] sm:text-sm"
                                >
                                    <ShoppingCart className="h-3.5 w-3.5" />
                                    Añadir al carrito
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled
                                    className="inline-flex w-full cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-slate-700/70 px-3 py-2 text-xs font-bold text-slate-300 sm:text-sm"
                                >
                                    <Lock className="h-3.5 w-3.5" />
                                    {agotado
                                        ? "Agotado"
                                        : tieneTaquilla
                                          ? "No disponible"
                                          : "Taquilla requerida"}
                                </button>
                            )}

                            {!tieneTaquilla && !agotado ? (
                                <p className="text-[11px] leading-snug text-amber-200/90">
                                    Necesitas taquilla activa para comprar.
                                </p>
                            ) : canBuy ? (
                                <p className="text-[10px] leading-snug text-slate-500">
                                    Confirma cantidades en el carrito.
                                </p>
                            ) : null}
                        </section>
                    </div>
                </article>

                {productosRelacionados.length > 0 ? (
                    <div className="mt-5 sm:mt-6">
                        <Contenedor_productos
                            productos={productosRelacionados}
                            eyebrow={null}
                            title="También te puede interesar"
                            description={null}
                            scrollHint={null}
                            compact
                        />
                    </div>
                ) : null}
            </div>
        </Layout1>
    );
};

export default ProductVer;
