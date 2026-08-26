import React from "react";
import { Link, usePage } from "@inertiajs/react";
import Layout1 from "../layouts/Layout1";
import "../../css/pagina_principal.css";
import Contenedor_productos from "../layouts/Contenedor_productos";
import BrandLogo from "../components/BrandLogo";
import S4Button from "../components/S4Button";
import SeoHead from "../components/seo/SeoHead";
import SurfBriefMini from "../components/webcam/SurfBriefMini";
import HomeServiciosDestacados from "../components/HomeServiciosDestacados";
import HomeExploraDirectorio from "../components/HomeExploraDirectorio";
import OpcionesIntro from "../components/OpcionesIntro";
import GoogleReviewsBadge from "../components/GoogleReviewsBadge";
import { Waves } from "lucide-react";

const Pag_principal = ({ productos = [], surfBrief, seo = null }) => {
    const { partnerGoogleReviews } = usePage().props;
    return (
        <Layout1 className="bg-transparent">
            <SeoHead seo={seo} />

            {/* Hero a sangre — fuera del contenedor claro para que no filtre blanco */}
            <section
                className="home-hero relative isolate min-h-[calc(100svh-4.5rem)] w-full bg-slate-950"
                aria-labelledby="hero-heading"
            >
                    <picture>
                        <source
                            type="image/webp"
                            srcSet="/img/zurriola-surf-sunset-960.webp 960w, /img/zurriola-surf-sunset-1280.webp 1280w, /img/zurriola-surf-sunset-1920.webp 1920w"
                            sizes="100vw"
                        />
                        <img
                            src="/img/zurriola-surf-sunset-1280.jpg"
                            srcSet="/img/zurriola-surf-sunset-960.jpg 960w, /img/zurriola-surf-sunset-1280.jpg 1280w, /img/zurriola-surf-sunset-1920.jpg 1920w"
                            sizes="100vw"
                            width={1920}
                            height={1847}
                            alt="Surfista al atardecer en la playa de Zurriola, San Sebastián, con el Urgull al fondo"
                            className="home-hero__media absolute inset-0 h-full w-full object-cover object-[68%_42%]"
                            loading="eager"
                            fetchPriority="high"
                            decoding="async"
                        />
                    </picture>
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/45 to-slate-950/20"
                    />
                    <div
                        aria-hidden
                        className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-slate-950/5 to-transparent"
                    />

                    <div className="relative z-[2] mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-6xl flex-col justify-center gap-3 px-4 py-10 sm:gap-4 sm:px-6 sm:py-16 lg:px-8">
                        <BrandLogo
                            variant="whiteHero"
                            className="home-hero__brand h-14 w-auto sm:h-24 lg:h-28"
                            priority
                        />

                        <p className="home-hero__eyebrow inline-flex w-fit items-center rounded-full border border-cyan-500/22 bg-slate-950/38 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-200/85 backdrop-blur-sm">
                            Escuela oficial · Zurriola, Donostia
                        </p>

                        <h1
                            id="hero-heading"
                            className="home-hero__title max-w-xl font-heading text-[2rem] font-extrabold leading-[1.06] tracking-tight text-slate-50 sm:max-w-2xl sm:text-5xl lg:text-6xl"
                        >
                            Domina el Cantábrico
                        </h1>

                        <p className="home-hero__copy max-w-md text-base leading-relaxed text-slate-300 sm:text-lg">
                            <span className="font-semibold text-slate-100">
                                San Sebastián Surf School
                            </span>
                            {" — "}
                            tu seguridad, nuestra técnica y material incluido en
                            cada clase.
                        </p>

                        <ul
                            className="home-hero__trust flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs"
                            aria-label="Ventajas de la escuela"
                        >
                            {[
                                "Material incluido",
                                "Monitores titulados",
                                "Desde 35 €",
                            ].map((item) => (
                                <li
                                    key={item}
                                    className="rounded-full border border-white/10 bg-slate-950/35 px-2.5 py-1 text-slate-300 backdrop-blur-sm"
                                >
                                    {item}
                                </li>
                            ))}
                        </ul>

                        <div className="home-hero__cta mt-1 sm:mt-2">
                            <S4Button
                                href={route("academy.lessons.index")}
                                variant="primary"
                                size="lg"
                                className="border border-cyan-500/25 shadow-lg shadow-cyan-950/45 hover:border-cyan-400/35"
                            >
                                <Waves className="h-4 w-4" />
                                Reserva tu clase
                            </S4Button>
                            <p className="mt-2.5 text-sm text-slate-400/90">
                                <Link
                                    href={route("servicios.surf")}
                                    className="font-medium text-cyan-200/80 underline-offset-2 transition hover:text-cyan-100 hover:underline"
                                >
                                    Ver clases y tarifas
                                </Link>
                                <span className="text-slate-500"> · </span>
                                Respuesta rápida en temporada
                            </p>
                        </div>
                    </div>
                </section>

            <div className="relative overflow-hidden s4-surface-light">
                {/* Bloque claro inicial */}
                <div className="relative mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10 lg:px-8">
                    <HomeServiciosDestacados />
                    <SurfBriefMini brief={surfBrief} />
                </div>

                {/* Explora S4 + club/instalaciones — una sola banda */}
                <div className="mt-10 sm:mt-12">
                    <HomeExploraDirectorio />
                </div>

                {/* Opiniones Google + galería */}
                <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-10 sm:px-6 sm:pb-12 sm:pt-12 lg:px-8">
                    <section aria-labelledby="testimonios-heading">
                        <div className="mb-8 text-center sm:mb-10">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-s4">
                                Prueba social
                            </p>
                            <h2
                                id="testimonios-heading"
                                className="mt-2 font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl"
                            >
                                Lo que dicen nuestros alumnos
                            </h2>
                            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                                Clases organizadas con{" "}
                                <span className="font-semibold text-slate-800">
                                    The Bunker Surf Shop
                                </span>
                                {partnerGoogleReviews?.reviewCount ? (
                                    <>
                                        {" "}
                                        ·{" "}
                                        <span className="font-semibold text-slate-800">
                                            {new Intl.NumberFormat("es-ES").format(
                                                partnerGoogleReviews.reviewCount,
                                            )}
                                        </span>{" "}
                                        reseñas verificadas en Google
                                    </>
                                ) : (
                                    " · reseñas verificadas en Google"
                                )}
                            </p>
                        </div>

                        <GoogleReviewsBadge
                            reviews={partnerGoogleReviews}
                            variant="card"
                            showPartnerNote={false}
                        />

                        <div className="mt-10 flex flex-col items-center text-center">
                            <S4Button
                                href={route("academy.lessons.index")}
                                variant="primary"
                                size="lg"
                            >
                                <Waves className="h-4 w-4" aria-hidden />
                                Reserva tu clase de surf
                            </S4Button>
                        </div>
                    </section>

                    <section className="mt-16 sm:mt-20">
                        <div className="grid gap-4 sm:grid-cols-3">
                            {[
                                {
                                    src: "/img/surf-grupo-bonos.png",
                                    alt: "Grupo de surf en clase con bonos de San Sebastián Surf School",
                                    caption: "Clases y bonos",
                                },
                                {
                                    src: "/img/zona-calentamiento.png",
                                    alt: "Zona de calentamiento pre-surf en instalaciones de San Sebastián Surf School",
                                    caption: "Instalaciones club",
                                },
                                {
                                    src: "/img/videograbacion-analisis.png",
                                    alt: "Análisis de técnica con videograbación",
                                    caption: "Análisis técnico",
                                },
                            ].map((img) => (
                                <figure
                                    key={img.caption}
                                    className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                                >
                                    <div className="aspect-[4/3] overflow-hidden">
                                        <img
                                            src={img.src}
                                            alt={img.alt}
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            loading="lazy"
                                        />
                                    </div>
                                    <figcaption className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-s4">
                                        {img.caption}
                                    </figcaption>
                                </figure>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Ofertas (claras) → mosaico accesos (corte seco blanco → tiles) */}
                {productos.length > 0 ? (
                    <div className="mx-auto mt-12 max-w-6xl px-4 sm:mt-14 sm:px-6 lg:px-8">
                        <Contenedor_productos productos={productos} compact />
                    </div>
                ) : null}
                <OpcionesIntro
                    showHeading={false}
                    className={productos.length > 0 ? "mt-10 sm:mt-12" : "mt-10 sm:mt-14"}
                />
            </div>
        </Layout1>
    );
};

export default Pag_principal;
