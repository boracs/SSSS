import React from "react";
import { Link } from "@inertiajs/react";

/** Fila única — experiencias del club (8 tiles; cola técnica vive en el directorio). */
const OPCIONES_PRINCIPALES = [
    {
        texto: "Clases de Surf",
        imagen: "/img/home-tiles/sunset_surf-800.webp",
        href: () => route("servicios.surf"),
        width: 800,
        height: 533,
    },
    {
        texto: "Surftrips",
        imagen: "/img/home-tiles/trip-800.webp",
        href: () => route("servicios.surfTrips"),
        width: 700,
        height: 860,
    },
    {
        texto: "Surfskate",
        imagen: "/img/home-tiles/surf_skate-800.webp",
        href: () => route("servicios.surfSkate"),
        width: 800,
        height: 535,
    },
    {
        texto: "Alquiler tablas",
        imagen: "/img/home-tiles/tabla-demo-800.webp",
        href: () => route("rentals.surfboards.index"),
        width: 800,
        height: 800,
    },
    {
        texto: "Tienda",
        imagen: "/img/home-tiles/tienda_1-800.webp",
        href: () => route("tienda"),
        width: 800,
        height: 533,
    },
    {
        texto: "Taquillas",
        imagen: "/img/home-tiles/instalaciones-800.webp",
        href: () => route("taquillas.planes"),
        width: 800,
        height: 600,
    },
    {
        texto: "Webcam",
        imagen: "/img/home-tiles/zurriola_webcam-800.webp",
        href: () => route("servicios.webcams"),
        width: 800,
        height: 533,
    },
    {
        texto: "Tablas segunda mano",
        imagen: "/img/home-tiles/ofertas-800.webp",
        href: () => route("second-hand.index"),
        width: 800,
        height: 521,
    },
];

function OpcionTile({ opcion }) {
    return (
        <Link
            href={opcion.href()}
            className="group relative min-h-[4.75rem] overflow-hidden bg-gray-900 sm:min-h-[5.5rem] md:h-full md:min-h-0 md:flex-1"
        >
            <img
                src={opcion.imagen}
                alt=""
                width={opcion.width}
                height={opcion.height}
                sizes="(min-width: 768px) 25vw, 50vw"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                decoding="async"
                aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/35 to-black/15 transition-opacity duration-300 group-hover:from-black/50 group-hover:via-black/25" />
            <span className="absolute inset-0 flex items-center justify-center p-2 text-center md:p-2.5">
                <span className="text-[9px] font-bold leading-tight tracking-wide text-white drop-shadow-sm sm:text-[10px] md:text-sm lg:text-base">
                    {opcion.texto}
                </span>
            </span>
        </Link>
    );
}

function chunkArray(items, size) {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size));
    }
    return chunks;
}

function rowGridClass(count) {
    if (count >= 4) return "grid-cols-4";
    if (count === 3) return "grid-cols-3";
    if (count === 2) return "grid-cols-2";
    return "grid-cols-1";
}

function OpcionesRow({ opciones, ariaLabel }) {
    const rows = chunkArray(opciones, 4);

    return (
        <div role="group" aria-label={ariaLabel} className="flex flex-col gap-px bg-gray-950">
            {rows.map((row) => (
                <div
                    key={row.map((o) => o.texto).join("|")}
                    className={`grid gap-px bg-gray-950 md:flex md:h-[160px] md:bg-gray-800 lg:h-[190px] ${rowGridClass(row.length)}`}
                >
                    {row.map((opcion) => (
                        <OpcionTile key={opcion.texto} opcion={opcion} />
                    ))}
                </div>
            ))}
        </div>
    );
}

/**
 * Galería visual de experiencias S4 (cierre de la home).
 * Cola técnica (reparaciones, subastas, taller, comparador…) vive en HomeExploraDirectorio.
 */
export default function OpcionesIntro({
    className = "",
    eyebrow = "El club en imágenes",
    title = "Experiencias del club",
    lead = "Ocho puertas visuales a lo que más se vive en Zurriola.",
    showHeading = true,
}) {
    return (
        <section
            className={`relative overflow-hidden ${className}`}
            aria-labelledby={showHeading ? "opciones-intro-heading" : undefined}
        >
            {showHeading ? (
                <div className="relative z-[2] bg-white">
                    <div className="mx-auto max-w-6xl px-4 pb-5 pt-12 sm:px-6 sm:pb-6 sm:pt-14 lg:px-8">
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-s4 sm:text-xs">
                            {eyebrow}
                        </p>
                        <h2
                            id="opciones-intro-heading"
                            className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
                        >
                            {title}
                        </h2>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                            {lead}
                        </p>
                    </div>
                </div>
            ) : null}

            <nav className="relative z-[2] flex flex-col gap-px bg-gray-950" aria-label="Experiencias del club">
                <OpcionesRow opciones={OPCIONES_PRINCIPALES} ariaLabel="Experiencias principales" />
            </nav>
        </section>
    );
}
