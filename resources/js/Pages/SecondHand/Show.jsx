import React, { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { router, usePage } from "@inertiajs/react";
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
    Grid2X2,
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

const MOSAIC_TOP   = 3; // Imagen principal + 2 laterales
const STRIP_CELLS  = 2; // Celdas en la tira inferior
const GRID_VISIBLE = MOSAIC_TOP + STRIP_CELLS;

// ── Placeholder sin imágenes ───────────────────────────────────────────────────

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

// ── MosaicGallery ──────────────────────────────────────────────────────────────

function MosaicGallery({ images: rawImages, name }) {
    // Normalización defensiva: JSON string, null, array vacío → siempre array limpio
    const realImages = normalizeImages(rawImages);
    const images = realImages.length > 0 ? realImages : DEMO_IMAGES;

    const [lbOpen,  setLbOpen]  = useState(false);
    const [lbIndex, setLbIndex] = useState(0);

    const openAt  = useCallback((i) => { setLbIndex(i); setLbOpen(true); }, []);
    const closeLb = useCallback(() => setLbOpen(false), []);

    // Sin imágenes → placeholder
    if (images.length === 0) return <GalleryPlaceholder />;

    const overflow    = Math.max(0, images.length - GRID_VISIBLE);
    const stripImages = images.slice(MOSAIC_TOP, GRID_VISIBLE);

    const cellBase =
        "group relative overflow-hidden bg-slate-100 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-orange-400 focus-visible:outline-offset-2";

    return (
        <>
            <div className="select-none" role="region" aria-label={`Galería de ${name}`}>

                {/* ── Bloque superior 3×2 ── */}
                <div
                    className="grid grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-2xl"
                    style={{ aspectRatio: "4/2.4" }}
                >
                    {/* [0] Main — col-span-2, row-span-2 */}
                    {images[0] && (
                        <button
                            type="button"
                            className={`${cellBase} col-span-2 row-span-2 rounded-none`}
                            onClick={() => openAt(0)}
                            aria-label={`Ampliar imagen principal de ${name}`}
                        >
                            <img
                                src={images[0]}
                                alt={name}
                                decoding="async"
                                fetchpriority="high"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                                <div className="rounded-full bg-black/40 p-3 backdrop-blur-sm">
                                    <ZoomIn className="h-5 w-5 text-white" />
                                </div>
                            </div>
                        </button>
                    )}

                    {/* [1] Superior derecha */}
                    {images[1] && (
                        <button
                            type="button"
                            className={`${cellBase} rounded-none`}
                            onClick={() => openAt(1)}
                            aria-label={`Ampliar vista 2 de ${name}`}
                        >
                            <img
                                src={images[1]}
                                alt={`${name} — vista 2`}
                                decoding="async"
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                        </button>
                    )}

                    {/* [2] Inferior derecha */}
                    {images[2] && (
                        <button
                            type="button"
                            className={`${cellBase} rounded-none`}
                            onClick={() => openAt(2)}
                            aria-label={`Ampliar vista 3 de ${name}`}
                        >
                            <img
                                src={images[2]}
                                alt={`${name} — vista 3`}
                                decoding="async"
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                            />
                        </button>
                    )}
                </div>

                {/* ── Tira inferior ── */}
                {images.length > MOSAIC_TOP && (
                    <div
                        className="mt-1.5 grid gap-1.5 overflow-hidden rounded-xl"
                        style={{
                            gridTemplateColumns: `repeat(${Math.min(
                                stripImages.length + (overflow > 0 ? 1 : 0), 4
                            )}, 1fr)`,
                        }}
                    >
                        {stripImages.map((src, idx) => {
                            const globalIdx      = MOSAIC_TOP + idx;
                            const isLastWithMore = idx === stripImages.length - 1 && overflow > 0;

                            return (
                                <button
                                    key={globalIdx}
                                    type="button"
                                    className={`${cellBase} aspect-square rounded-xl`}
                                    onClick={() => openAt(globalIdx)}
                                    aria-label={
                                        isLastWithMore
                                            ? `Ver todas las imágenes (+${overflow} más)`
                                            : `Ampliar imagen ${globalIdx + 1} de ${name}`
                                    }
                                >
                                    <img
                                        src={src}
                                        alt={`${name} — vista ${globalIdx + 1}`}
                                        decoding="async"
                                        loading="lazy"
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                                    />
                                    {isLastWithMore && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/65 backdrop-blur-[2px]">
                                            <Grid2X2 className="h-5 w-5 text-white/80" />
                                            <span className="text-base font-extrabold text-white">+{overflow} más</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Lightbox — createPortal, sin Radix, overflow limpio */}
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

function SpecRow({ icon: Icon, label, value, unit }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                {label}
            </div>
            <span className="text-sm font-bold text-white">{value}{unit ?? ""}</span>
        </div>
    );
}

// ── Página ─────────────────────────────────────────────────────────────────────

export default function SecondHandShow(props) {
    const { board } = props;
    const { props: pageProps } = usePage();
    const academyWhatsapp = pageProps?.academyWhatsappDisplay ?? "";

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
                <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-4 shadow-2xl backdrop-blur-sm sm:p-6 lg:p-8">
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">

                        {/* Galería + descripción */}
                        <section className="lg:col-span-7">
                            <MosaicGallery images={board.images} name={board.name} />

                            {board.description && (
                                <div className="mt-6 rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                                        Descripción
                                    </h2>
                                    <p className="text-sm leading-relaxed text-slate-300">{board.description}</p>
                                </div>
                            )}
                        </section>

                        {/* Ficha técnica */}
                        <section className="lg:col-span-5">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 lg:sticky lg:top-6">

                                <div className="mb-4">
                                    {board.brand && (
                                        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.15em] text-orange-400">
                                            {board.brand}
                                        </p>
                                    )}
                                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                                        {board.name}
                                    </h1>
                                    <p className="mt-1 text-xs text-slate-500">Ref. #SH-{board.id}</p>
                                </div>

                                <StatusBadge status={board.status} label={board.status_label} />

                                <div className="mt-5 space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Especificaciones
                                    </p>
                                    <SpecRow icon={Ruler}    label="Longitud" value={`${board.height}'`}   />
                                    <SpecRow icon={Ruler}    label="Anchura"  value={`${board.width}"`}    />
                                    <SpecRow icon={Ruler}    label="Grosor"   value={`${board.thickness}"`} />
                                    <SpecRow icon={Droplets} label="Volumen"  value={board.volume} unit=" L" />
                                </div>

                                {!isSold && (
                                    <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/40 p-4">
                                        {hasDiscount ? (
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-bold text-white">
                                                        -{board.discount_pct}%
                                                    </span>
                                                    <span className="text-sm text-slate-400 line-through">
                                                        {formatEur(board.sale_price)}
                                                    </span>
                                                </div>
                                                <p className="text-3xl font-extrabold text-orange-400">
                                                    {formatEur(board.effective_price)}
                                                </p>
                                                <p className="text-xs text-slate-500">IVA incluido</p>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-3xl font-extrabold text-cyan-300">
                                                    {formatEur(board.sale_price)}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">IVA incluido</p>
                                            </>
                                        )}
                                    </div>
                                )}

                                {isSold && (
                                    <div className="mt-5 rounded-xl border border-slate-500/20 bg-slate-500/10 p-4">
                                        <p className="text-sm font-semibold text-slate-400">Esta tabla ya ha sido vendida.</p>
                                        {board.sold_at && (
                                            <p className="mt-0.5 text-xs text-slate-500">Fecha de venta: {board.sold_at}</p>
                                        )}
                                    </div>
                                )}

                                <div className="mt-5">
                                    {isAvailable && (
                                        <a
                                            href={whatsappHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-600 hover:to-teal-600"
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