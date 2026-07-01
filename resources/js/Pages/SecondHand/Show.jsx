import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { router, usePage, Link } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import {
    Ruler,
    Droplets,
    ArrowLeft,
    Phone,
    CheckCircle2,
    Clock,
    Archive,
    ChevronLeft,
    ChevronRight,
    X,
    ZoomIn,
    ImageOff,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
function formatEur(cents) { return EUR.format(cents / 100); }

/**
 * Normaliza board.images que puede llegar de Laravel como:
 *   - Array<string>  (Inertia ya parsea el JSON, caso normal)
 *   - null / undefined  (sin imágenes)
 *   - string JSON  (fallback si no se casteó en el modelo)
 */
function normalizeImages(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string") {
        try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed.filter(Boolean) : []; }
        catch { return []; }
    }
    return [];
}

// ── Demo hardcodeado (se usa cuando board.images está vacío) ───────────────────

const DEMO_IMAGES = [
    "/images/image_4636c0.png",
    "/images/image_4636a1.png",
    "/images/image_46367c.png",
    "/images/image_4636c0.png",
    "/images/image_4636a1.png",
    "/images/image_46367c.png",
    "/images/image_4636c0.png",
    "/images/image_4636a1.png",
];

// ── Constantes de layout ───────────────────────────────────────────────────────

function GalleryPlaceholder() {
    return (
        <div className="flex h-72 w-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-slate-800/40">
            <ImageOff className="h-10 w-10 text-slate-600" />
            <p className="text-xs text-slate-600">Sin imágenes disponibles</p>
        </div>
    );
}

// ── Lightbox (createPortal + cleanup atómico) ──────────────────────────────────

function Lightbox({ images, index, open, onClose }) {
    const [current, setCurrent] = useState(index);
    // Ref para la imagen activa — permite resetear focus sin parpadeo
    const imgRef = useRef(null);

    // Sync índice cuando se abre
    useEffect(() => { if (open) setCurrent(index); }, [open, index]);

    // ── Body scroll lock con cleanup garantizado ──
    useEffect(() => {
        if (!open) return;
        const saved = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        // Cleanup: se ejecuta cuando open cambia a false O cuando se desmonta
        return () => {
            document.body.style.overflow = saved || "";
        };
    }, [open]);

    // ── Navegación teclado con cleanup ──
    const prev = useCallback(
        () => setCurrent((i) => (i - 1 + images.length) % images.length),
        [images.length]
    );
    const next = useCallback(
        () => setCurrent((i) => (i + 1) % images.length),
        [images.length]
    );

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === "Escape")     { e.preventDefault(); onClose(); }
            if (e.key === "ArrowLeft")  { e.preventDefault(); prev(); }
            if (e.key === "ArrowRight") { e.preventDefault(); next(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, prev, next, onClose]);

    // No renderiza nada si está cerrado — limpia el DOM atómicamente
    if (!open) return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Visor de imágenes"
            className="fixed inset-0 z-[950] flex items-center justify-center bg-black/95 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Imagen activa — stopPropagation evita cierre al hacer clic en ella */}
            <img
                ref={imgRef}
                key={current}
                src={images[current]}
                alt={`Imagen ${current + 1} de ${images.length}`}
                decoding="async"
                loading="eager"
                className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
            />

            {/* Contador */}
            <div className="pointer-events-none absolute bottom-[4.5rem] left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/60 px-4 py-1.5 text-xs font-semibold text-white/60 backdrop-blur-sm">
                {current + 1} / {images.length}
            </div>

            {/* Tira de miniaturas */}
            {images.length > 1 && (
                <div
                    className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-1.5 overflow-x-auto px-2 pb-1"
                    onClick={(e) => e.stopPropagation()}
                >
                    {images.map((src, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setCurrent(i)}
                            aria-label={`Ver imagen ${i + 1}`}
                            aria-current={i === current ? "true" : undefined}
                            className={`h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                                i === current
                                    ? "border-white opacity-100 ring-1 ring-white/30"
                                    : "border-transparent opacity-35 hover:opacity-65"
                            }`}
                        >
                            <img
                                src={src}
                                alt=""
                                aria-hidden="true"
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        </button>
                    ))}
                </div>
            )}

            {/* Flecha anterior */}
            {images.length > 1 && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); prev(); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-black/50 p-3 text-white transition hover:bg-black/75"
                    aria-label="Imagen anterior"
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
            )}

            {/* Flecha siguiente */}
            {images.length > 1 && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); next(); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-white/15 bg-black/50 p-3 text-white transition hover:bg-black/75"
                    aria-label="Imagen siguiente"
                >
                    <ChevronRight className="h-5 w-5" />
                </button>
            )}

            {/* Cerrar */}
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="absolute right-3 top-3 rounded-xl border border-white/15 bg-black/50 p-2 text-white transition hover:bg-black/75"
                aria-label="Cerrar visor"
            >
                <X className="h-5 w-5" />
            </button>
        </div>,
        document.body
    );
}

// ── Galería uniforme (mismo tamaño por imagen) ────────────────────────────────

function UniformGallery({ images: rawImages, name }) {
    const realImages = normalizeImages(rawImages);
    const images = realImages.length > 0 ? realImages : DEMO_IMAGES;

    const [lbOpen, setLbOpen] = useState(false);
    const [lbIndex, setLbIndex] = useState(0);

    const openAt = useCallback((i) => {
        setLbIndex(i);
        setLbOpen(true);
    }, []);
    const closeLb = useCallback(() => setLbOpen(false), []);

    if (images.length === 0) return <GalleryPlaceholder />;

    const cellClass =
        "group relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-800/60 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-orange-400 focus-visible:outline-offset-2";

    return (
        <>
            <div
                className={
                    images.length === 1
                        ? "grid grid-cols-1"
                        : "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5"
                }
                role="region"
                aria-label={`Galería de ${name}`}
            >
                {images.map((src, idx) => (
                    <button
                        key={`${src}-${idx}`}
                        type="button"
                        className={cellClass}
                        onClick={() => openAt(idx)}
                        aria-label={`Ampliar imagen ${idx + 1} de ${name}`}
                    >
                        <img
                            src={src}
                            alt={`${name} — vista ${idx + 1}`}
                            decoding="async"
                            loading={idx === 0 ? "eager" : "lazy"}
                            fetchpriority={idx === 0 ? "high" : "auto"}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
                            <div className="rounded-full bg-black/45 p-2 backdrop-blur-sm">
                                <ZoomIn className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <Lightbox images={images} index={lbIndex} open={lbOpen} onClose={closeLb} />
        </>
    );
}

// ── StatusBadge ────────────────────────────────────────────────────────────────

function StatusBadge({ status, label }) {
    const cfg = {
        available: { Icon: CheckCircle2, cls: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300" },
        reserved:  { Icon: Clock,        cls: "border-amber-500/30 bg-amber-500/15 text-amber-300"   },
        sold:      { Icon: Archive,      cls: "border-slate-500/30 bg-slate-500/15 text-slate-400"   },
    };
    const { Icon, cls } = cfg[status] ?? cfg.available;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${cls}`}>
            <Icon className="h-3.5 w-3.5" />
            {label}
        </span>
    );
}

// ── SpecRow ────────────────────────────────────────────────────────────────────

function SpecCell({ icon: Icon, label, value, unit }) {
    return (
        <div className="rounded-lg border border-white/5 bg-white/5 px-2.5 py-2 sm:px-3 sm:py-2.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <Icon className="h-3 w-3 shrink-0" />
                {label}
            </div>
            <p className="mt-0.5 text-sm font-bold text-white sm:text-base">
                {value}
                {unit ?? ""}
            </p>
        </div>
    );
}

function BoardSummaryHeader({ board, status, statusLabel, compact = false }) {
    return (
        <div className={compact ? "mb-3 lg:hidden" : "mb-3 hidden lg:block"}>
            {board.brand && (
                <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-orange-400 sm:text-xs">
                    {board.brand}
                </p>
            )}
            <h1 className={`font-extrabold leading-tight tracking-tight text-white ${compact ? "text-xl" : "text-2xl sm:text-3xl"}`}>
                {board.name}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <p className="text-[11px] text-slate-500">Ref. #SH-{board.id}</p>
                <StatusBadge status={status} label={statusLabel} />
            </div>
        </div>
    );
}

function PriceBlock({ board, hasDiscount, isSold }) {
    if (isSold) {
        return (
            <div className="rounded-xl border border-slate-500/20 bg-slate-500/10 px-3 py-2.5 sm:p-4">
                <p className="text-sm font-semibold text-slate-400">Esta tabla ya ha sido vendida.</p>
                {board.sold_at && (
                    <p className="mt-0.5 text-xs text-slate-500">Fecha de venta: {board.sold_at}</p>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-white/10 bg-slate-950/40 px-3 py-2.5 sm:p-4">
            {hasDiscount ? (
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                -{board.discount_pct}%
                            </span>
                            <span className="text-xs text-slate-400 line-through sm:text-sm">
                                {formatEur(board.sale_price)}
                            </span>
                        </div>
                        <p className="text-2xl font-extrabold text-orange-400 sm:text-3xl">
                            {formatEur(board.effective_price)}
                        </p>
                    </div>
                    <p className="text-[11px] text-slate-500">IVA incluido</p>
                </div>
            ) : (
                <div className="flex flex-wrap items-end justify-between gap-2">
                    <p className="text-2xl font-extrabold text-cyan-300 sm:text-3xl">
                        {formatEur(board.sale_price)}
                    </p>
                    <p className="text-[11px] text-slate-500">IVA incluido</p>
                </div>
            )}
        </div>
    );
}

// ── Navegación entre tablas (inline, bajo descripción) ───────────────────────────

function BoardInlineNavigation({ previousBoard, nextBoard }) {
    if (!previousBoard && !nextBoard) {
        return null;
    }

    const linkClass =
        "group flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 transition hover:bg-orange-500/10 sm:gap-3 sm:px-3";

    return (
        <nav
            aria-label="Navegar entre tablas"
            className="mt-4 overflow-hidden rounded-xl border border-orange-500/25 bg-gradient-to-r from-orange-950/25 via-slate-900/40 to-orange-950/25"
        >
            <div className="flex divide-x divide-orange-500/15">
                {previousBoard ? (
                    <Link href={route("second-hand.show", previousBoard.id)} className={linkClass}>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300 transition group-hover:border-orange-400/50 group-hover:bg-orange-500/20">
                            <ChevronLeft className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-orange-400/90">
                                Tabla anterior
                            </span>
                            <span className="block truncate text-sm font-semibold text-slate-100">
                                {previousBoard.name}
                            </span>
                        </span>
                    </Link>
                ) : (
                    <div className="min-w-0 flex-1" aria-hidden />
                )}

                {nextBoard ? (
                    <Link
                        href={route("second-hand.show", nextBoard.id)}
                        className={`${linkClass} justify-end text-right`}
                    >
                        <span className="min-w-0">
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-orange-400/90">
                                Siguiente tabla
                            </span>
                            <span className="block truncate text-sm font-semibold text-slate-100">
                                {nextBoard.name}
                            </span>
                        </span>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-300 transition group-hover:border-orange-400/50 group-hover:bg-orange-500/20">
                            <ChevronRight className="h-4 w-4" />
                        </span>
                    </Link>
                ) : (
                    <div className="min-w-0 flex-1" aria-hidden />
                )}
            </div>
        </nav>
    );
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function SecondHandShow(props) {
    const { board, navigation = {} } = props;
    const { props: pageProps } = usePage();
    const academyWhatsapp = pageProps?.academyWhatsappDisplay ?? "";

    const previousBoard = navigation?.previous ?? null;
    const nextBoard = navigation?.next ?? null;

    const hasDiscount = board.discount_pct > 0;
    const isSold      = board.status === "sold";
    const isAvailable = board.status === "available";

    const whatsappMsg  = encodeURIComponent(
        `Hola! Estoy interesado en la tabla de segunda mano: ${board.name} (ID #${board.id}). ¿Está disponible?`
    );
    const whatsappHref = academyWhatsapp
        ? `https://wa.me/${academyWhatsapp.replace(/\D/g, "")}?text=${whatsappMsg}`
        : "#";

    return (
        <Layout1>
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

                {/* Breadcrumb */}
                <div className="mb-5">
                    <button
                        type="button"
                        onClick={() => router.get(route("second-hand.index"))}
                        className="mb-3 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Volver al catálogo
                    </button>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Tienda · Segunda Mano
                    </p>
                </div>

                {/* Card principal */}
                <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-3 shadow-2xl backdrop-blur-sm sm:p-5 lg:p-6">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">

                        {/* Galería + descripción + navegación */}
                        <section className="lg:col-span-7">
                            <BoardSummaryHeader
                                board={board}
                                status={board.status}
                                statusLabel={board.status_label}
                                compact
                            />

                            <div className="mb-3 grid grid-cols-2 gap-2 lg:hidden">
                                <SpecCell icon={Ruler} label="Longitud" value={`${board.height}'`} />
                                <SpecCell icon={Ruler} label="Anchura" value={`${board.width}"`} />
                                <SpecCell icon={Ruler} label="Grosor" value={`${board.thickness}"`} />
                                <SpecCell icon={Droplets} label="Volumen" value={board.volume} unit=" L" />
                            </div>

                            <div className="mb-3 lg:hidden">
                                <PriceBlock board={board} hasDiscount={hasDiscount} isSold={isSold} />
                            </div>

                            <UniformGallery images={board.images} name={board.name} />

                            {board.description && (
                                <div className="mt-4 rounded-xl border border-white/5 bg-slate-900/40 p-3 sm:p-4">
                                    <h2 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Descripción
                                    </h2>
                                    <p className="text-sm leading-relaxed text-slate-300">{board.description}</p>
                                </div>
                            )}

                            <BoardInlineNavigation
                                previousBoard={previousBoard}
                                nextBoard={nextBoard}
                            />
                        </section>

                        {/* Ficha técnica — desktop + CTA en móvil */}
                        <section className="lg:col-span-5">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3 sm:p-4 lg:sticky lg:top-6">
                                <BoardSummaryHeader
                                    board={board}
                                    status={board.status}
                                    statusLabel={board.status_label}
                                />

                                <div className="hidden lg:block">
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                        Especificaciones
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <SpecCell icon={Ruler} label="Longitud" value={`${board.height}'`} />
                                        <SpecCell icon={Ruler} label="Anchura" value={`${board.width}"`} />
                                        <SpecCell icon={Ruler} label="Grosor" value={`${board.thickness}"`} />
                                        <SpecCell icon={Droplets} label="Volumen" value={board.volume} unit=" L" />
                                    </div>
                                </div>

                                <div className="mt-3 hidden lg:block">
                                    <PriceBlock board={board} hasDiscount={hasDiscount} isSold={isSold} />
                                </div>

                                <div className="mt-3 lg:mt-4">
                                    {isAvailable && (
                                        <a
                                            href={whatsappHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-600 hover:to-teal-600 sm:py-3"
                                        >
                                            <Phone className="h-4 w-4" />
                                            Consultar por WhatsApp
                                        </a>
                                    )}
                                    {board.status === "reserved" && (
                                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs font-medium text-amber-300">
                                            Esta tabla está actualmente reservada. Si estás interesado contacta con nosotros.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </Layout1>
    );
}