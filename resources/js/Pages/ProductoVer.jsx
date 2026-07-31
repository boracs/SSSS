import React, { useMemo, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import Layout1 from "../layouts/Layout1";
import Contenedor_productos from "../layouts/Contenedor_productos";
import ProductImageGallery from "../components/ProductImageGallery";
import SeoHead from "../components/seo/SeoHead";
import BackButton from "../components/BackButton";
import Breadcrumbs from "../components/Breadcrumbs";
import S4Button from "../components/S4Button";
import { toast } from "react-toastify";
import {
    Lock,
    Package,
    ShieldCheck,
    ShoppingBag,
    ShoppingCart,
    Tag,
    Users,
} from "lucide-react";
import { hasStoreAccess } from "@/utils/hasStoreAccess";
import { demoCatalogImage } from "@/utils/demoCatalogImages";

const ProductVer = ({ producto, productosRelacionados = [], seo = null }) => {
    const { auth } = usePage().props;
    const user = auth?.user || null;
    const puedeComprarTienda = hasStoreAccess(user);

    const maxQty = Math.max(0, Number(producto?.max_qty ?? producto?.unidades ?? 0) || 0);
    const [qty, setQty] = useState(1);

    const qtyOptions = useMemo(() => {
        const cap = Math.min(maxQty, 20);
        if (cap < 1) return [1];
        return Array.from({ length: cap }, (_, i) => i + 1);
    }, [maxQty]);

    if (!producto) {
        return (
            <Layout1>
                <div className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4">
                    <p className="text-base font-medium text-slate-600">Cargando producto…</p>
                </div>
            </Layout1>
        );
    }

    const agotado = !producto.in_stock;
    const canBuy = puedeComprarTienda && !agotado;
    const needsLocker = !puedeComprarTienda && !agotado;
    const safeQty = Math.min(Math.max(1, qty), Math.max(1, maxQty || 1));
    const fallbackImg = demoCatalogImage(producto.id, producto.nombre);
    const gallery =
        Array.isArray(producto.gallery) && producto.gallery.length > 0
            ? producto.gallery.map((src) =>
                  !src || src.includes("placeholder") ? fallbackImg : src,
              )
            : [
                  producto.imagen_principal &&
                  !String(producto.imagen_principal).includes("placeholder")
                      ? producto.imagen_principal
                      : fallbackImg,
              ];

    const highlights = Array.isArray(producto.highlights) ? producto.highlights.slice(0, 3) : [];
    const summary =
        typeof producto.summary === "string" && producto.summary.trim() !== ""
            ? producto.summary.trim()
            : null;

    const breadcrumbs = [
        { label: "Inicio", href: route("Pag_principal") },
        { label: "Tienda", href: route("tienda") },
        { label: producto.nombre },
    ];

    const handleAgregarAlCarrito = () => {
        router.post(
            route("carrito.agregar", producto.id),
            { cantidad: safeQty },
            {
                onSuccess: () => toast.success("Producto añadido al carrito"),
                onError: () => toast.error("No se pudo añadir el producto al carrito"),
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    return (
        <Layout1>
            <SeoHead seo={seo} />

            <div className="s4-surface-light min-h-[70vh]">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <BackButton
                            href={route("tienda")}
                            className="!text-slate-600 hover:!bg-slate-100 hover:!text-s4"
                        >
                            Volver a la tienda
                        </BackButton>
                        <Breadcrumbs items={breadcrumbs} variant="light" />
                    </div>

                    <article className="mt-6 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(15,95,116,0.35)] sm:mt-8">
                        <div className="grid grid-cols-1 lg:grid-cols-12">
                            <section
                                className="bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4 sm:p-6 lg:col-span-6 lg:p-8"
                                aria-label="Galería del producto"
                            >
                                <ProductImageGallery
                                    images={gallery}
                                    productName={producto.nombre}
                                    compact={false}
                                    tone="light"
                                />
                            </section>

                            <section className="flex flex-col justify-center border-t border-slate-100 p-5 sm:p-7 lg:col-span-6 lg:border-l lg:border-t-0 lg:p-8">
                                <p className="text-xs font-semibold tracking-wide text-s4">
                                    Tienda socios · Zurriola
                                </p>

                                <h1 className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                                    {producto.nombre}
                                </h1>

                                {summary ? (
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                                        {summary}
                                    </p>
                                ) : null}

                                {highlights.length > 0 ? (
                                    <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                                        {highlights.map((item) => (
                                            <li key={item} className="flex gap-2">
                                                <span
                                                    className="mt-2 h-1 w-1 shrink-0 rounded-full bg-s4/70"
                                                    aria-hidden
                                                />
                                                <span className="leading-snug">{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}

                                {(producto.tag_labels || []).length > 0 ? (
                                    <ul
                                        className="mt-4 flex flex-wrap gap-1.5"
                                        aria-label="Categorías del producto"
                                    >
                                        {producto.tag_labels.map((label) => (
                                            <li
                                                key={label}
                                                className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-2.5 py-1 text-xs font-semibold text-s4"
                                            >
                                                {label}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}

                                <div className="mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-5">
                                    {producto.has_discount ? (
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-sm ring-1 ring-white/20">
                                                    <Tag className="h-3 w-3" aria-hidden />
                                                    -{producto.descuento_pct}% socios
                                                </span>
                                                <span className="text-sm text-slate-500 line-through decoration-slate-400">
                                                    {producto.precio_formatted}
                                                </span>
                                            </div>
                                            <p className="font-heading text-3xl font-extrabold tabular-nums text-s4 sm:text-4xl">
                                                {producto.precio_final_formatted}
                                            </p>
                                            <p className="text-sm font-medium text-emerald-700">
                                                Ahorras {producto.ahorro_formatted}
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="font-heading text-3xl font-extrabold tabular-nums text-s4 sm:text-4xl">
                                            {producto.precio_final_formatted ||
                                                producto.precio_formatted}
                                        </p>
                                    )}
                                </div>

                                <p
                                    className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                                        agotado
                                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                                            : producto.low_stock
                                              ? "bg-amber-50 text-amber-800 ring-amber-200"
                                              : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                    }`}
                                >
                                    <Package className="h-3.5 w-3.5" aria-hidden />
                                    {producto.stock_label}
                                </p>

                                <div className="mt-6 space-y-3">
                                    {canBuy ? (
                                        <>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <label
                                                    htmlFor="producto-qty"
                                                    className="text-sm font-semibold text-slate-700"
                                                >
                                                    Cantidad
                                                </label>
                                                <select
                                                    id="producto-qty"
                                                    value={safeQty}
                                                    onChange={(e) =>
                                                        setQty(Number(e.target.value) || 1)
                                                    }
                                                    className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold tabular-nums text-slate-900 focus:border-s4/40 focus:outline-none focus:ring-1 focus:ring-s4/30"
                                                >
                                                    {qtyOptions.map((n) => (
                                                        <option key={n} value={n}>
                                                            {n}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <S4Button
                                                type="button"
                                                variant="primary"
                                                size="lg"
                                                className="w-full justify-center"
                                                onClick={handleAgregarAlCarrito}
                                            >
                                                <ShoppingCart className="h-4 w-4" />
                                                Añadir al carrito
                                                {safeQty > 1 ? ` (${safeQty})` : ""}
                                            </S4Button>
                                        </>
                                    ) : agotado ? (
                                        <S4Button
                                            type="button"
                                            variant="secondary"
                                            size="lg"
                                            className="w-full justify-center"
                                            disabled
                                        >
                                            Agotado
                                        </S4Button>
                                    ) : needsLocker ? (
                                        <>
                                            <S4Button
                                                href={route("taquillas.planes")}
                                                variant="primary"
                                                size="lg"
                                                className="w-full justify-center"
                                            >
                                                Ver planes de taquilla
                                            </S4Button>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm leading-relaxed text-slate-600">
                                                <p className="font-semibold text-slate-800">
                                                    Compra exclusiva para socios
                                                </p>
                                                <p className="mt-1">
                                                    Con taquilla activa puedes comprar en la tienda
                                                    del club a precio de socios.
                                                </p>
                                            </div>
                                        </>
                                    ) : (
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
                                    )}

                                    {canBuy ? (
                                        <p className="text-xs leading-relaxed text-slate-600">
                                            Puedes ajustar cantidades en el carrito antes de
                                            confirmar el pedido.
                                        </p>
                                    ) : null}
                                </div>

                                <ul className="mt-8 grid gap-3 border-t border-slate-100 pt-6 sm:grid-cols-3">
                                    {[
                                        {
                                            icon: Users,
                                            title: "Solo socios",
                                            text: "Tienda del club S4",
                                        },
                                        {
                                            icon: ShieldCheck,
                                            title: "Precio club",
                                            text: "Descuento con taquilla",
                                        },
                                        {
                                            icon: ShoppingBag,
                                            title: "Recogida",
                                            text: "En la escuela · Zurriola",
                                        },
                                    ].map(({ icon: Icon, title, text }) => (
                                        <li key={title} className="flex items-start gap-2.5">
                                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-s4/10 text-s4">
                                                <Icon className="h-4 w-4" aria-hidden />
                                            </span>
                                            <span>
                                                <span className="block text-sm font-semibold text-slate-800">
                                                    {title}
                                                </span>
                                                <span className="block text-xs text-slate-600">
                                                    {text}
                                                </span>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        </div>
                    </article>

                    {productosRelacionados.length > 0 ? (
                        <div className="mt-10 sm:mt-12">
                            <Contenedor_productos
                                productos={productosRelacionados}
                                eyebrow="Sigue explorando"
                                title="También te puede interesar"
                                description="Más material del club con descuento para socios con taquilla activa."
                                compact
                            />
                        </div>
                    ) : null}
                </div>
            </div>
        </Layout1>
    );
};

export default ProductVer;
