import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, router, usePage } from "@inertiajs/react";
import PageShell from "@/layouts/PageShell";
import Contenedor_productos from "../layouts/Contenedor_productos";
import StorePromoBanner from "../components/store/StorePromoBanner";
import ProductImageGallery from "../components/ProductImageGallery";
import ProductPurchaseCta from "../components/ProductPurchaseCta";
import ProductStickyPurchaseBar from "../components/store/ProductStickyPurchaseBar";
import ProductTagPills from "../components/ProductTagPills";
import useInertiaFlashToast from "@/hooks/useInertiaFlashToast";
import SeoHead from "../components/seo/SeoHead";
import Breadcrumbs from "../components/Breadcrumbs";
import SharePageButton from "../components/SharePageButton";
import { toast } from "react-toastify";
import { ChevronLeft, ChevronDown, MapPin, Package, Tag } from "lucide-react";
import { hasStoreAccess } from "@/utils/hasStoreAccess";
import { demoCatalogImage } from "@/utils/demoCatalogImages";

/** Etiqueta de stock con número de unidades visible en ficha producto. */
function productStockLabel(stock) {
    if (stock < 1) return "Agotado";
    if (stock === 1) return "Solo queda 1 unidad";
    if (stock < 3) return `Solo quedan ${stock} unidades`;
    return `${stock} unidades en stock`;
}

function productQtyHint(stock, maxSelectable) {
    if (stock < 1) return null;
    // El pill de stock ya informa del estado (agotado / quedan X); el hint solo
    // aporta información nueva: el tope de unidades por pedido.
    if (maxSelectable < stock) {
        return `${stock} unidades disponibles · máx. ${maxSelectable} por pedido.`;
    }
    return null;
}

const ProductVer = ({ producto, productosRelacionados = [], storePromoSlides = [], seo = null }) => {
    const { auth } = usePage().props;
    useInertiaFlashToast();
    const user = auth?.user || null;
    const puedeComprarTienda = hasStoreAccess(user);
    const isGuest = !user;

    const stockAvailable = Math.max(
        0,
        Number(producto?.max_qty ?? producto?.unidades ?? 0) || 0,
    );
    /** Máximo por línea en carrito (backend también valida stock). */
    const maxSelectable =
        stockAvailable > 0 ? Math.min(stockAvailable, 20) : 0;
    const [qty, setQty] = useState(1);
    // Solo sesión actual en ficha: al recargar vuelve a 0 (no hay props.cart compartido).
    const [addedQty, setAddedQty] = useState(0);
    const [stickyCtaVisible, setStickyCtaVisible] = useState(false);
    const purchaseCtaRef = useRef(null);

    const agotado = !producto?.in_stock || stockAvailable < 1;
    const canBuy = Boolean(producto) && puedeComprarTienda && !agotado;
    const needsAccess = Boolean(producto) && !puedeComprarTienda && !agotado;

    const qtyOptions = useMemo(() => {
        if (maxSelectable < 1) return [];
        return Array.from({ length: maxSelectable }, (_, i) => i + 1);
    }, [maxSelectable]);

    useEffect(() => {
        if (maxSelectable < 1) return;
        setQty((prev) => Math.min(Math.max(1, prev), maxSelectable));
    }, [producto?.id, maxSelectable]);

    useEffect(() => {
        setAddedQty(0);
    }, [producto?.id]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }, [producto?.id]);

    useEffect(() => {
        const node = purchaseCtaRef.current;
        if (!node || typeof IntersectionObserver === "undefined") return undefined;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setStickyCtaVisible(!entry.isIntersecting);
            },
            { root: null, threshold: 0, rootMargin: "0px 0px -8px 0px" },
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, [producto?.id]);

    if (!producto) {
        return (
            <PageShell variant="light">
                <div className="mx-auto flex min-h-[50vh] max-w-3xl items-center justify-center px-4">
                    <p className="text-base font-medium text-slate-600">Cargando producto…</p>
                </div>
            </PageShell>
        );
    }

    const stockLabel = productStockLabel(stockAvailable);
    const lowStock = stockAvailable > 0 && stockAvailable < 3;
    const qtyHint = productQtyHint(stockAvailable, maxSelectable);
    const safeQty =
        maxSelectable > 0
            ? Math.min(Math.max(1, qty), maxSelectable)
            : 1;
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

    const galleryThumbs = Array.isArray(producto.gallery_thumbs)
        ? producto.gallery_thumbs
        : [];

    const summary =
        typeof producto.summary === "string" && producto.summary.trim() !== ""
            ? producto.summary.trim()
            : null;

    const stickyPriceLabel =
        producto.precio_final_formatted || producto.precio_formatted || "";
    const stickyAnchorPriceLabel = producto.has_discount
        ? producto.precio_formatted || ""
        : "";
    const showStickyBar = canBuy || agotado || needsAccess;

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
                onSuccess: () => {
                    setAddedQty((q) => q + safeQty);
                    toast.success("Producto añadido al carrito");
                },
                onError: () => toast.error("No se pudo añadir el producto al carrito"),
                preserveState: true,
                preserveScroll: true,
            },
        );
    };

    const qtySelect =
        maxSelectable > 0 ? (
            <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                    <label htmlFor="producto-qty" className="text-sm font-semibold text-slate-700">
                        Cantidad
                    </label>
                    <div className="relative">
                        <select
                            id="producto-qty"
                            value={safeQty}
                            onChange={(e) => setQty(Number(e.target.value) || 1)}
                            aria-describedby={qtyHint ? "producto-qty-hint" : undefined}
                            className="min-h-11 min-w-[5.75rem] appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-4 pr-11 text-sm font-semibold tabular-nums text-slate-900 focus:border-s4/40 focus:outline-none focus:ring-1 focus:ring-s4/30"
                        >
                            {qtyOptions.map((n) => (
                                <option key={n} value={n}>
                                    {n}
                                </option>
                            ))}
                        </select>
                        <ChevronDown
                            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                            aria-hidden
                        />
                    </div>
                </div>
                {qtyHint ? (
                    <p id="producto-qty-hint" className="text-xs text-slate-500">
                        {qtyHint}
                    </p>
                ) : null}
            </div>
        ) : null;

    return (
        <PageShell variant="light">
            <SeoHead seo={seo} />

            <div
                className={`min-h-[70vh] overflow-x-clip ${showStickyBar ? "pb-20 lg:pb-0" : ""}`}
            >
                <div className="mx-auto w-full min-w-0 max-w-6xl px-4 py-4 sm:px-6 sm:py-8 lg:px-8">
                    <div className="flex items-center justify-between gap-3">
                        <Link
                            href={route("tienda")}
                            className="inline-flex min-h-[44px] items-center gap-1 rounded-lg px-1 text-sm font-semibold text-slate-600 transition hover:text-s4"
                        >
                            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="sm:hidden">Tienda</span>
                            <span className="hidden sm:inline">Volver a la tienda</span>
                        </Link>
                        <Breadcrumbs
                            items={breadcrumbs}
                            variant="light"
                            className="hidden min-w-0 sm:block"
                        />
                    </div>

                    <article className="mt-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(15,95,116,0.35)] sm:mt-8">
                        <div className="grid min-w-0 grid-cols-1 lg:grid-cols-12">
                            <section
                                className="min-w-0 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 p-4 sm:p-6 lg:col-span-6 lg:p-8"
                                aria-label="Galería del producto"
                            >
                                <ProductImageGallery
                                    images={gallery}
                                    thumbs={galleryThumbs}
                                    productName={producto.nombre}
                                    compact={false}
                                    tone="light"
                                />
                            </section>

                            <section className="flex min-w-0 flex-col justify-center border-t border-slate-100 p-5 sm:p-7 lg:col-span-6 lg:border-l lg:border-t-0 lg:p-8">
                                <p className="text-xs font-semibold tracking-wide text-s4">
                                    Tienda socios · Zurriola
                                </p>

                                <h1 className="mt-2 break-words font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
                                    {producto.nombre}
                                </h1>

                                {summary ? (
                                    <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                                        {summary}
                                    </p>
                                ) : null}

                                {(producto.tag_labels || []).length > 0 ? (
                                    <ProductTagPills
                                        values={producto.tags}
                                        labels={producto.tag_labels}
                                        linkable
                                        surface="light"
                                        max={6}
                                        className="mt-4"
                                    />
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
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                                Precio socio
                                            </p>
                                            <p className="font-heading text-3xl font-extrabold tabular-nums text-s4 sm:text-4xl">
                                                {producto.precio_final_formatted ||
                                                    producto.precio_formatted}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <p
                                    className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${
                                        agotado
                                            ? "bg-rose-50 text-rose-700 ring-rose-200"
                                            : lowStock
                                              ? "bg-amber-50 text-amber-800 ring-amber-200"
                                              : "bg-emerald-50 text-emerald-800 ring-emerald-200"
                                    }`}
                                >
                                    <Package className="h-3.5 w-3.5" aria-hidden />
                                    {stockLabel}
                                </p>

                                <div ref={purchaseCtaRef} className="mt-6 space-y-3">
                                    <ProductPurchaseCta
                                        canBuy={canBuy}
                                        agotado={agotado}
                                        needsAccess={needsAccess}
                                        isGuest={isGuest}
                                        safeQty={safeQty}
                                        onAddToCart={handleAgregarAlCarrito}
                                        qtySelect={qtySelect}
                                    />
                                </div>

                                <div className="mt-3">
                                    <SharePageButton
                                        variant="light"
                                        label="Compartir producto"
                                        title={`${producto.nombre} · tienda S4`}
                                        text="Producto de la tienda de San Sebastián Surf School (Zurriola, Donostia)."
                                        path={route("producto.ver", producto.id)}
                                    />
                                </div>

                                {canBuy ? (
                                    <p className="mt-6 flex items-start gap-2.5 border-t border-slate-100 pt-6 text-sm leading-relaxed text-slate-600">
                                        <MapPin
                                            className="mt-0.5 h-4 w-4 shrink-0 text-s4"
                                            aria-hidden
                                        />
                                        <span>
                                            <span className="font-semibold text-slate-800">
                                                Recogida en S4
                                            </span>
                                            {" · "}
                                            Escuela a pie de playa, Zurriola
                                        </span>
                                    </p>
                                ) : null}
                            </section>
                        </div>
                    </article>
                </div>

                <div className="mx-auto mt-10 w-full min-w-0 max-w-6xl px-4 sm:mt-12 sm:px-6 lg:px-8">
                    <StorePromoBanner slides={storePromoSlides} />
                </div>

                {productosRelacionados.length > 0 ? (
                    <div className="mt-10 overflow-x-clip px-4 pb-2 sm:mt-12 sm:px-6 sm:pb-4 lg:px-8">
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

            <ProductStickyPurchaseBar
                visible={stickyCtaVisible && showStickyBar}
                canBuy={canBuy}
                agotado={agotado}
                needsAccess={needsAccess}
                isGuest={isGuest}
                priceLabel={stickyPriceLabel}
                anchorPriceLabel={stickyAnchorPriceLabel}
                imageUrl={gallery[0]}
                productName={producto.nombre}
                safeQty={safeQty}
                inCartQty={addedQty}
                onAddToCart={handleAgregarAlCarrito}
            />
        </PageShell>
    );
};

export default ProductVer;
