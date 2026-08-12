import React from "react";
import { Link } from "@inertiajs/react";
import { CalendarRange } from "lucide-react";
import DetailedForecastEntry from "./webcam/DetailedForecastEntry";

/** Fila 1 — oferta principal / día a día */
const OPCIONES_PRINCIPALES = [
    {
        texto: "Clases de Surf",
        imagen: "/img/sunset_surf.webp",
        href: () => route("servicios.surf"),
    },
    {
        texto: "Surftrips",
        imagen: "/img/trip.jpg",
        href: () => route("servicios.surfTrips"),
    },
    {
        texto: "Surfskate",
        imagen: "/img/surf_skate.webp",
        href: () => route("servicios.surfSkate"),
    },
    {
        texto: "Alquiler tablas",
        imagen: "/img/tabla-demo.png",
        href: () => route("rentals.surfboards.index"),
    },
    {
        texto: "Tienda",
        imagen: "/img/tienda_1.webp",
        href: () => route("tienda"),
    },
    {
        texto: "Taquillas",
        imagen: "/img/instalaciones.jpg",
        href: () => route("taquillas.planes"),
    },
    {
        texto: "Webcam",
        imagen: "/img/zurriola_webcam.webp",
        href: () => route("servicios.webcams"),
    },
    {
        texto: "Tablas segunda mano",
        imagen: "/img/ofertas.webp",
        href: () => route("second-hand.index"),
    },
];

/** Fila 2 — servicios técnicos y extras (assets IA en /img/opciones) */
const OPCIONES_MAS = [
    {
        texto: "Reparación tablas",
        imagen: "/img/opciones/opcion-reparacion-tablas.webp",
        href: () => route("servicios"),
    },
    {
        texto: "Reparación neoprenos",
        imagen: "/img/opciones/opcion-reparacion-neoprenos.webp",
        href: () => route("servicios.reparacionNeoprenos"),
    },
    {
        texto: "Subastas",
        imagen: "/img/opciones/opcion-subastas.webp",
        href: () => route("auctions.index"),
    },
    {
        texto: "Blog educativo",
        imagen: "/img/opciones/opcion-taller-surf.webp",
        href: () => route("taller.index"),
    },
    {
        texto: "Comparador",
        imagen: "/img/opciones/opcion-comparador.webp",
        href: () => route("autocoach.index"),
    },
    {
        texto: "Videocorrecciones",
        imagen: "/img/opciones/opcion-videocorrecciones.webp",
        href: () => route("servicios.videograbaciones"),
    },
    {
        texto: "Fotografía",
        imagen: "/img/opciones/opcion-fotografia.webp",
        href: () => route("servicios.fotografia"),
    },
    {
        texto: "Guía surfskate",
        imagen: "/img/opciones/opcion-guia-surfskate.webp",
        href: () => route("servicios.surfSkate.guia"),
    },
    {
        texto: "Forecast al detalle",
        imagen: "/img/zurriola_webcam.webp",
        action: "detailed-forecast",
    },
];

function TileShell({ imagen, texto, children }) {
    return (
        <div className="group relative min-h-[4.75rem] overflow-hidden bg-gray-900 sm:min-h-[5.5rem] md:h-full md:min-h-0 md:flex-1">
            <div
                className="absolute inset-0 scale-100 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${imagen})` }}
                aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25 transition-opacity duration-300 group-hover:from-black/70 group-hover:via-black/35" />
            {children}
            <span className="pointer-events-none absolute inset-0 flex items-end justify-center p-2 pb-2 text-center md:items-center md:p-2.5">
                <span className="text-[9px] font-bold leading-tight tracking-wide text-white drop-shadow-sm sm:text-[10px] md:text-sm lg:text-base">
                    {texto}
                </span>
            </span>
        </div>
    );
}

function OpcionTile({ opcion }) {
    if (opcion.action === "detailed-forecast") {
        return (
            <TileShell imagen={opcion.imagen} texto={opcion.texto}>
                <DetailedForecastEntry
                    variant="tile"
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer border-0 bg-transparent p-0 text-transparent"
                    label={opcion.texto}
                >
                    <span className="sr-only">{opcion.texto}</span>
                    <CalendarRange className="sr-only" aria-hidden />
                </DetailedForecastEntry>
            </TileShell>
        );
    }

    return (
        <Link
            href={opcion.href()}
            className="group relative min-h-[4.75rem] overflow-hidden bg-gray-900 sm:min-h-[5.5rem] md:h-full md:min-h-0 md:flex-1"
        >
            <div
                className="absolute inset-0 scale-100 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${opcion.imagen})` }}
                aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/25 transition-opacity duration-300 group-hover:from-black/70 group-hover:via-black/35" />
            <span className="absolute inset-0 flex items-end justify-center p-2 pb-2 text-center md:items-center md:p-2.5">
                <span className="text-[9px] font-bold leading-tight tracking-wide text-white drop-shadow-sm sm:text-[10px] md:text-sm lg:text-base">
                    {opcion.texto}
                </span>
            </span>
        </Link>
    );
}

function OpcionesRow({ opciones, ariaLabel }) {
    return (
        <div
            className="grid grid-cols-4 gap-px bg-gray-950 md:flex md:h-[160px] md:gap-0 md:bg-gray-800 lg:h-[190px]"
            role="group"
            aria-label={ariaLabel}
        >
            {opciones.map((opcion) => (
                <OpcionTile key={opcion.texto} opcion={opcion} />
            ))}
        </div>
    );
}

/**
 * Mosaico visual de accesos S4 (home / hubs).
 * No va en la cabecera: se usa como bloque de exploración en página.
 */
export default function OpcionesIntro({
    className = "",
    eyebrow = "Explora S4",
    title = "Todo lo que puedes hacer con nosotros",
    showHeading = true,
    variant = "light",
}) {
    const isDark = variant === "dark";

    return (
        <section
            className={`${isDark ? "bg-slate-950" : ""} ${className}`}
            aria-labelledby={showHeading ? "opciones-intro-heading" : undefined}
        >
            {showHeading ? (
                <div className="mx-auto max-w-6xl px-4 pb-5 pt-8 sm:px-6 sm:pb-6 sm:pt-10 lg:px-8">
                    <p
                        className={`text-[11px] font-bold uppercase tracking-[0.16em] sm:text-xs ${
                            isDark ? "text-cyan-300/90" : "text-s4"
                        }`}
                    >
                        {eyebrow}
                    </p>
                    <h2
                        id="opciones-intro-heading"
                        className={`mt-1 font-heading text-2xl font-extrabold tracking-tight sm:text-3xl ${
                            isDark ? "text-white" : "text-slate-900"
                        }`}
                    >
                        {title}
                    </h2>
                    <p
                        className={`mt-2 max-w-2xl text-sm leading-relaxed ${
                            isDark ? "text-slate-400" : "text-slate-600"
                        }`}
                    >
                        Clases, material, club y herramientas para progresar — todo en un mismo sitio.
                    </p>
                </div>
            ) : null}

            <nav className="flex flex-col gap-px bg-gray-950" aria-label="Accesos rápidos S4">
                <OpcionesRow opciones={OPCIONES_PRINCIPALES} ariaLabel="Servicios principales" />
                <OpcionesRow opciones={OPCIONES_MAS} ariaLabel="Más servicios S4" />
            </nav>
        </section>
    );
}
