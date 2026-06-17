import React, { useState } from "react";
import { router, usePage } from "@inertiajs/react";
import * as Dialog from "@radix-ui/react-dialog";
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
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EUR = new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
});

function formatEur(cents) {
    return EUR.format(cents / 100);
}

// ─── Galería ──────────────────────────────────────────────────────────────────

function Gallery({ images, name }) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const hasImages = images && images.length > 0;
    const currentSrc = hasImages ? images[currentImageIndex] : null;

    const openAt = (index) => {
        setCurrentImageIndex(index);
        setIsOpen(true);
    };

    const prev = () =>
        setCurrentImageIndex((i) => (i - 1 + images.length) % images.length);
    const next = () =>
        setCurrentImageIndex((i) => (i + 1) % images.length);

    return (
        <>
            <div className="space-y-3">
                {/* Imagen principal */}
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-800/60">
                    {currentSrc ? (
                        <>
                            <button
                                type="button"
                                onClick={() => openAt(currentImageIndex)}
                                className="block w-full cursor-zoom-in"
                                aria-label="Ver imagen ampliada"
                            >
                                <img
                                    src={currentSrc}
                                    alt={name}
                                    className="h-[260px] w-full object-contain sm:h-[320px]"
                                />
                            </button>
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            prev();
                                        }}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/40 p-2 text-white transition hover:bg-black/60"
                                        aria-label="Imagen anterior"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            next();
                                        }}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-white/10 bg-black/40 p-2 text-white transition hover:bg-black/60"
                                        aria-label="Imagen siguiente"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="flex h-[260px] items-center justify-center text-slate-600 sm:h-[320px]">
                            <svg
                                className="h-16 w-16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1}
                            >
                                <path d="M12 2C6 2 3 7 3 12s3 10 9 10 9-5 9-10S18 2 12 2z" />
                                <path d="M9 9l6 6M15 9l-6 6" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Miniaturas */}
                {images && images.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                        {images.map((src, idx) => (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => openAt(idx)}
                                className={`shrink-0 overflow-hidden rounded-lg transition-all ${
                                    idx === currentImageIndex
                                        ? "ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-900"
                                        : "opacity-80 hover:opacity-100"
                                }`}
                                aria-label={`Ver imagen ${idx + 1} de ${name}`}
                            >
                                <img
                                    src={src}
                                    alt={`${name} ${idx + 1}`}
                                    className="aspect-square h-24 w-24 rounded-lg object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox */}
            <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 z-[900] bg-black/90 transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
                    <Dialog.Content
                        className="fixed inset-0 z-[901] flex items-center justify-center p-4 outline-none"
                        onPointerDownOutside={() => setIsOpen(false)}
                    >
                        {currentSrc && (
                            <img
                                src={currentSrc}
                                alt={name}
                                className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                                onClick={(e) => e.stopPropagation()}
                            />
                        )}

                        {images.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={prev}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-black/50 p-2.5 text-white transition hover:bg-black/70"
                                    aria-label="Imagen anterior"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={next}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl border border-white/20 bg-black/50 p-2.5 text-white transition hover:bg-black/70"
                                    aria-label="Imagen siguiente"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                            </>
                        )}

                        <Dialog.Close asChild>
                            <button
                                type="button"
                                className="absolute right-4 top-4 rounded-xl border border-white/20 bg-black/50 p-2 text-white transition hover:bg-black/70"
                                aria-label="Cerrar visor"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

function StatusBadge({ status, label }) {
    const cfg = {
        available: {
            Icon: CheckCircle2,
            className: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        },
        reserved: {
            Icon: Clock,
            className: "border-amber-500/30 bg-amber-500/15 text-amber-300",
        },
        sold: {
            Icon: Archive,
            className: "border-slate-500/30 bg-slate-500/15 text-slate-400",
        },
    };
    const { Icon, className } = cfg[status] ?? cfg.available;
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
        >
            <Icon className="h-3.5 w-3.5" />
            {label}
        </span>
    );
}

// ─── Fila de especificación ───────────────────────────────────────────────────

function SpecRow({ icon: Icon, label, value, unit }) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
                <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                {label}
            </div>
            <span className="text-sm font-bold text-white">
                {value}
                {unit && (
                    <span className="ml-0.5 text-xs font-normal text-slate-400">
                        {unit}
                    </span>
                )}
            </span>
        </div>
    );
}

// ─── Página detail ────────────────────────────────────────────────────────────

export default function SecondHandShow({ board }) {
    const { props } = usePage();
    const academyWhatsapp = props?.academyWhatsappDisplay ?? "";

    const hasDiscount = board.discount_pct > 0;
    const isSold = board.status === "sold";
    const isAvailable = board.status === "available";

    const whatsappMsg = encodeURIComponent(
        `Hola! Estoy interesado en la tabla de segunda mano: ${board.name} (ID #${board.id}). ¿Está disponible?`
    );
    const whatsappHref = academyWhatsapp
        ? `https://wa.me/${academyWhatsapp.replace(/\D/g, "")}?text=${whatsappMsg}`
        : "#";

    return (
        <Layout1>
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                {/* Volver + breadcrumb */}
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
                        {/* Columna galería + descripción */}
                        <section className="lg:col-span-7">
                            <Gallery images={board.images ?? []} name={board.name} />

                            {board.description && (
                                <div className="mt-6 rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                                    <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
                                        Descripción
                                    </h2>
                                    <p className="text-sm leading-relaxed text-slate-300">
                                        {board.description}
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Columna detalle */}
                        <section className="lg:col-span-5">
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 lg:sticky lg:top-6">
                                {/* Marca y nombre */}
                                <div className="mb-4">
                                    {board.brand && (
                                        <p className="mb-1 text-xs font-extrabold uppercase tracking-[0.15em] text-orange-400">
                                            {board.brand}
                                        </p>
                                    )}
                                    <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white sm:text-3xl">
                                        {board.name}
                                    </h1>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Ref. #SH-{board.id}
                                    </p>
                                </div>

                                {/* Badge estado */}
                                <StatusBadge
                                    status={board.status}
                                    label={board.status_label}
                                />

                                {/* Specs técnicas */}
                                <div className="mt-5 space-y-2">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                        Especificaciones
                                    </p>
                                    <SpecRow
                                        icon={Ruler}
                                        label="Longitud"
                                        value={`${board.height}'`}
                                    />
                                    <SpecRow
                                        icon={Ruler}
                                        label="Anchura"
                                        value={`${board.width}"`}
                                    />
                                    <SpecRow
                                        icon={Ruler}
                                        label="Grosor"
                                        value={`${board.thickness}"`}
                                    />
                                    <SpecRow
                                        icon={Droplets}
                                        label="Volumen"
                                        value={board.volume}
                                        unit=" L"
                                    />
                                </div>

                                {/* Precio */}
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
                                                <p className="text-xs text-slate-500">
                                                    IVA incluido
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-3xl font-extrabold text-cyan-300">
                                                    {formatEur(board.sale_price)}
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    IVA incluido
                                                </p>
                                            </>
                                        )}
                                    </div>
                                )}

                                {isSold && (
                                    <div className="mt-5 rounded-xl border border-slate-500/20 bg-slate-500/10 p-4">
                                        <p className="text-sm font-semibold text-slate-400">
                                            Esta tabla ya ha sido vendida.
                                        </p>
                                        {board.sold_at && (
                                            <p className="mt-0.5 text-xs text-slate-500">
                                                Fecha de venta: {board.sold_at}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* CTA */}
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
                                            Esta tabla está actualmente reservada. Si
                                            estás interesado contacta con nosotros.
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
