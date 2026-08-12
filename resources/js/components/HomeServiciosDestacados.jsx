import React from "react";
import { Link } from "@inertiajs/react";
import { ArrowRight } from "lucide-react";

/**
 * Escaparate de oferta home: solo los 4 servicios prioritarios (decisión dueño).
 * Modo claro. Sin precios inventados. CTAs distintos de OpcionesIntro / directorio / hero.
 */
const SERVICIOS = [
    {
        id: "clases",
        title: "Clases de surf",
        benefit: "Aprende en Zurriola con material incluido.",
        href: () => route("servicios.surf"),
        image: "/img/sunset_surf.webp",
        imageAlt: "Clase de surf al atardecer en Zurriola",
        cta: "Ver clases",
        featured: true,
    },
    {
        id: "taquillas",
        title: "Taquillas",
        benefit: "Guarda el equipo cerca de la playa.",
        href: () => route("taquillas.planes"),
        image: "/img/instalaciones.jpg",
        imageAlt: "Instalaciones y taquillas del club S4",
        cta: "Ver planes",
        featured: false,
    },
    {
        id: "surfskate",
        title: "Surfskate",
        benefit: "Mejora la técnica fuera del agua.",
        href: () => route("servicios.surfSkate"),
        image: "/img/surf_skate.webp",
        imageAlt: "Sesión de surfskate",
        cta: "Ver surfskate",
        featured: false,
    },
    {
        id: "fotos",
        title: "Fotos",
        benefit: "Lleva a casa tu sesión en el agua.",
        href: () => route("servicios.fotografia"),
        image: "/img/fotografo-playa-sunset.png",
        imageAlt: "Fotógrafo de surf en la playa al atardecer",
        cta: "Ver sesiones",
        featured: false,
    },
];

function Tile({ item }) {
    const href = item.href();
    const isFeatured = item.featured;

    return (
        <Link
            href={href}
            className={[
                "group relative block overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s4-cyan/50 focus-visible:ring-offset-2",
                isFeatured ? "min-h-[14rem] sm:min-h-[18rem]" : "min-h-[11rem] sm:min-h-[12.5rem]",
            ].join(" ")}
        >
            <img
                src={item.image}
                alt={item.imageAlt}
                className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                loading="lazy"
            />
            <div
                className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent"
                aria-hidden
            />
            <div
                className={[
                    "relative flex h-full flex-col justify-end",
                    isFeatured ? "p-5 sm:p-7" : "p-4 sm:p-5",
                ].join(" ")}
            >
                <h3
                    className={[
                        "font-heading font-extrabold tracking-tight text-white",
                        isFeatured ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
                    ].join(" ")}
                >
                    {item.title}
                </h3>
                <p
                    className={[
                        "mt-1 max-w-md text-white/85",
                        isFeatured ? "text-sm sm:text-base" : "text-xs sm:text-sm",
                    ].join(" ")}
                >
                    {item.benefit}
                </p>
                {isFeatured ? (
                    <span
                        className="s4-btn s4-btn-on-media s4-btn--md mt-4 inline-flex min-h-11 pointer-events-none"
                        aria-hidden
                    >
                        {item.cta}
                        <ArrowRight className="h-4 w-4" />
                    </span>
                ) : (
                    <span className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-white">
                        {item.cta}
                        <ArrowRight
                            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </span>
                )}
            </div>
        </Link>
    );
}

export default function HomeServiciosDestacados() {
    const featured = SERVICIOS.find((s) => s.featured);
    const secondary = SERVICIOS.filter((s) => !s.featured);

    return (
        <section
            className="mt-10 sm:mt-12"
            aria-labelledby="home-servicios-destacados-heading"
        >
            <div className="mb-5 max-w-2xl sm:mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-s4">
                    Oferta principal
                </p>
                <h2
                    id="home-servicios-destacados-heading"
                    className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
                >
                    Empieza por aquí
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                    Lo esencial de S4 en Zurriola, en un clic.
                </p>
            </div>

            <div className="grid gap-3 sm:gap-4">
                {featured ? <Tile item={featured} /> : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    {secondary.map((item) => (
                        <Tile key={item.id} item={item} />
                    ))}
                </div>
            </div>
        </section>
    );
}
