import React from "react";
import { Link } from "@inertiajs/react";

const OPCIONES = [
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
        texto: "Tablas 2ª mano",
        imagen: "/img/ofertas.webp",
        href: () => route("second-hand.index"),
    },
];

function OpcionTile({ opcion }) {
    return (
        <Link
            href={opcion.href()}
            className="group relative min-h-[5.25rem] overflow-hidden bg-gray-900 sm:min-h-[6rem] md:h-full md:min-h-0 md:flex-1"
        >
            <div
                className="absolute inset-0 scale-100 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                style={{ backgroundImage: `url(${opcion.imagen})` }}
                aria-hidden
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/45 to-black/30 transition-opacity duration-300 group-hover:from-black/65 group-hover:via-black/35" />
            <span className="absolute inset-0 flex items-end justify-center p-2 pb-2.5 text-center md:items-center md:p-3">
                <span className="text-[10px] font-bold leading-tight tracking-wide text-white drop-shadow-sm sm:text-[11px] md:text-base lg:text-lg">
                    {opcion.texto}
                </span>
            </span>
        </Link>
    );
}

const OpcionesIntro = () => (
    <nav
        className="grid grid-cols-4 grid-rows-2 gap-px bg-gray-950 md:flex md:h-[300px] md:grid-cols-none md:grid-rows-none md:gap-0 md:bg-gray-800"
        aria-label="Accesos rápidos S4"
    >
        {OPCIONES.map((opcion) => (
            <OpcionTile key={opcion.texto} opcion={opcion} />
        ))}
    </nav>
);

export default OpcionesIntro;
