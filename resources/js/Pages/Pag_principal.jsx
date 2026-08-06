import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import Layout1 from "../layouts/Layout1";
import "../../css/pagina_principal.css";
import Contenedor_productos from "../layouts/Contenedor_productos";
import BrandLogo from "../components/BrandLogo";
import S4Button from "../components/S4Button";
import SeoHead from "../components/seo/SeoHead";
import Por_que_escogernos_motivo from "../components/Por_que_escogernos_motivo";
import SurfBriefMini from "../components/webcam/SurfBriefMini";
import OpcionesIntro from "../components/OpcionesIntro";
import {
    ShieldCheck,
    Sparkles,
    Users,
    ArrowRight,
    Waves,
    MapPin,
    Camera,
    Compass,
    Quote,
    Star,
    Wrench,
    Shirt,
    Gavel,
    GitCompareArrows,
    Video,
    Clapperboard,
    GraduationCap,
} from "lucide-react";

const motivos = [
    {
        icon: ShieldCheck,
        title: "Seguridad primero",
        paragraph:
            "Protocolos rigurosos en cada sesión: ratio controlado, zonas delimitadas y supervisión constante en el agua.",
    },
    {
        icon: Users,
        title: "Instructores certificados",
        paragraph:
            "Equipo local con certificaciones internacionales y años de experiencia en el Cantábrico y en Zurriola.",
    },
    {
        icon: Sparkles,
        title: "Material premium incluido",
        paragraph:
            "Tablas y neoprenos de marcas líderes, revisados y adaptados a tu nivel en cada clase o alquiler.",
    },
];

const seccionesDestacadas = [
    { label: "Clases de surf", href: route("servicios.surf"), icon: Waves },
    { label: "Taquillas", href: route("taquillas.planes"), icon: ShieldCheck },
    { label: "Webcam", href: route("servicios.webcams"), icon: Video },
    { label: "Reparación de tablas", href: route("servicios"), icon: Wrench },
    { label: "Tienda S4", href: route("tienda"), icon: Star },
    { label: "Sobre nosotros", href: route("nosotros"), icon: MapPin },
];

const seccionesSecundarias = [
    { label: "Surftrips", href: route("servicios.surfTrips"), icon: Compass },
    { label: "Surfskate", href: route("servicios.surfSkate"), icon: Sparkles },
    { label: "Fotografía", href: route("servicios.fotografia"), icon: Camera },
    { label: "Reparación de neoprenos", href: route("servicios.reparacionNeoprenos"), icon: Shirt },
    { label: "Subastas", href: route("auctions.index"), icon: Gavel },
    { label: "Comparador de maniobras", href: route("autocoach.index"), icon: GitCompareArrows },
    { label: "Videocorrecciones", href: route("servicios.videograbaciones"), icon: Clapperboard },
    { label: "Taller de Surf", href: route("taller.index"), icon: GraduationCap },
];

const testimonios = [
    {
        quote: "Sentí que conocían cada ola de Zurriola. Fui con respeto al mar y salí con confianza y muchas ganas de volver.",
        author: "Ane",
        role: "Nivel iniciación",
        rating: 5,
    },
    {
        quote: "La combinación de seguridad, técnica y material hizo que mis hijos disfrutaran sin riesgos. Se nota que son escuela oficial.",
        author: "Jon",
        role: "Padre de dos alumnos",
        rating: 5,
    },
    {
        quote: "Venía con experiencia en otras playas y me sorprendió el conocimiento local del Cantábrico. Clases muy personalizadas.",
        author: "Laura",
        role: "Intermedio",
        rating: 5,
    },
];

const Pag_principal = ({ productos = [], surfBrief, seo = null }) => {
    const [mostrarTodosServicios, setMostrarTodosServicios] = useState(false);
    const accesosVisibles = mostrarTodosServicios
        ? [...seccionesDestacadas, ...seccionesSecundarias]
        : seccionesDestacadas;

    return (
    <Layout1>
        <SeoHead seo={seo} />

        <div className="relative overflow-hidden s4-surface-light">
            {/* ── HERO (primer viewport: marca + titular + frase + CTA + imagen) ── */}
            <section
                className="home-hero relative isolate min-h-[calc(100svh-4.5rem)] w-full"
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

                <div className="relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-6xl flex-col justify-center gap-4 px-4 py-10 sm:gap-5 sm:px-6 sm:py-16 lg:px-8">
                    <BrandLogo
                        variant="whiteHero"
                        className="home-hero__brand h-20 w-auto sm:h-32 lg:h-40"
                        priority
                    />

                    <h1
                        id="hero-heading"
                        className="home-hero__title max-w-2xl font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl"
                    >
                        Domina el Cantábrico
                        <span className="mt-1 block text-[0.78em] font-bold leading-snug sm:mt-2 sm:text-[0.85em]">
                            con San Sebastián Surf School
                        </span>
                    </h1>

                    <p className="home-hero__copy max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
                        Tu seguridad, nuestra técnica. Escuela de surf en Zurriola, Donostia.
                    </p>

                    <div className="home-hero__cta mt-2 sm:mt-3">
                        <S4Button href={route("servicios.surf")} variant="onMedia" size="lg">
                            <Waves className="h-4 w-4" />
                            Reserva tu clase
                        </S4Button>
                        <p className="mt-2.5 text-sm text-white/80">
                            Clases desde 35 € · material incluido
                        </p>
                    </div>
                </div>
            </section>

            <main className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-10 lg:px-8">
                {/* ── Parte S4 (USP: resumen de expertos, justo bajo el hero) ── */}
                <SurfBriefMini brief={surfBrief} />

                {/* ── Beneficios (bajo el fold) ── */}
                <section className="mt-10 grid grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-3" aria-label="Ventajas S4">
                    {[
                        { icon: ShieldCheck, t: "Instructores federados", s: "Formación y rescate" },
                        { icon: Sparkles, t: "Equipo premium", s: "Tablas y neoprenos top" },
                        { icon: Users, t: "+5.000 alumnos", s: "Todos los niveles" },
                    ].map(({ icon: Icon, t, s }) => (
                        <div key={t} className="flex items-center gap-3 px-1 py-2">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center text-s4">
                                <Icon className="h-5 w-5" aria-hidden />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">{t}</p>
                                <p className="text-xs text-slate-500">{s}</p>
                            </div>
                        </div>
                    ))}
                </section>

                {/* ── Accesos rápidos ── */}
                <section className="mt-10" aria-label="Accesos rápidos">
                    <div className="flex flex-nowrap gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
                        {accesosVisibles.map(({ label, href, icon: Icon }) => (
                            <Link
                                key={label}
                                href={href}
                                className="group inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2.5 text-sm font-medium shadow-sm transition-all duration-200 hover:border-cyan-500/50 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                            >
                                <Icon className="h-4 w-4 flex-shrink-0 text-s4-cyan" aria-hidden />
                                <span className="whitespace-nowrap text-slate-200 group-hover:text-white">{label}</span>
                            </Link>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={() => setMostrarTodosServicios((prev) => !prev)}
                        className="mt-3 text-sm font-semibold text-s4 transition hover:text-s4-hover"
                    >
                        {mostrarTodosServicios ? "Ver menos" : "Ver todos los servicios"}
                    </button>
                </section>

                {/* ── Sobre nosotros teaser ── */}
                <section className="mt-14 sm:mt-16" aria-labelledby="sobre-nosotros-heading">
                    <div className="grid overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-s4 to-slate-900 shadow-xl lg:grid-cols-5">
                        <div className="relative hidden lg:col-span-2 lg:block">
                            <img
                                src="/img/nosotros/galeria/instalaciones-01.png"
                                alt="Instalaciones premium del club S4 en Zurriola"
                                className="h-full w-full object-cover opacity-90"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-s4/90" />
                        </div>
                        <div className="p-6 sm:p-8 lg:col-span-3">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                                Sobre nosotros · Escuela oficial · Zurriola
                            </p>
                            <h2
                                id="sobre-nosotros-heading"
                                className="mt-3 font-heading text-2xl font-extrabold text-white sm:text-3xl"
                            >
                                San Sebastian Surf School
                                <span className="mt-1 block text-lg font-bold text-cyan-200 sm:text-xl">
                                    Tu escuela y club en el Cantábrico
                                </span>
                            </h2>
                            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                                Somos la escuela de surf de referencia en Donostia. Formación, alquiler de material,
                                bonos VIP y un club de socios con instalaciones premium a pie de la playa de Zurriola.
                            </p>

                            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[
                                    { value: "<5", label: "Instalaciones renovadas", sub: "Menos de 5 años" },
                                    { value: "200+", label: "Socios activos", sub: "Comunidad creciente" },
                                    { value: "98%", label: "Satisfacción", sub: "Valoración media" },
                                    { value: "Top", label: "Material premium", sub: "Mejores marcas" },
                                ].map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center backdrop-blur-sm"
                                    >
                                        <p className="text-xl font-black text-cyan-300 sm:text-2xl">{stat.value}</p>
                                        <p className="mt-0.5 text-[10px] font-semibold text-white/90">{stat.label}</p>
                                        <p className="text-[9px] text-slate-400">{stat.sub}</p>
                                    </div>
                                ))}
                            </div>

                            <S4Button href={route("nosotros")} variant="onMedia" className="mt-6">
                                Ver instalaciones y club
                                <ArrowRight className="h-4 w-4" />
                            </S4Button>
                        </div>
                    </div>
                </section>

                {/* ── Por qué elegir S4 ── */}
                <section className="mt-16 sm:mt-20" aria-labelledby="por-que-heading">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-s4">
                            Experiencia S4
                        </p>
                        <h2
                            id="por-que-heading"
                            className="mt-2 font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl"
                        >
                            ¿Por qué elegir S4?
                        </h2>
                        <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600">
                            Más de una década formando surfistas en el Cantábrico con el mismo estándar: seguridad,
                            técnica y trato cercano.
                        </p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {motivos.map((m) => (
                            <Por_que_escogernos_motivo key={m.title} {...m} />
                        ))}
                    </div>
                </section>

                {/* ── Testimonios ── */}
                <section className="mt-16 sm:mt-20" aria-labelledby="testimonios-heading">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-s4">
                            Comunidad
                        </p>
                        <h2
                            id="testimonios-heading"
                            className="mt-2 font-heading text-2xl font-extrabold text-slate-900 sm:text-3xl"
                        >
                            Lo que dicen nuestros surfistas
                        </h2>
                        <p className="mx-auto mt-3 max-w-lg text-sm text-slate-600">
                            Más de <span className="font-semibold text-slate-800">5.000 alumnos</span> han confiado
                            en S4 para dar su primer take-off en el Cantábrico.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {testimonios.map((t) => (
                            <article
                                key={t.author}
                                className="relative rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <Quote className="h-8 w-8 text-cyan-200" aria-hidden />
                                <div className="mb-3 flex gap-0.5">
                                    {Array.from({ length: t.rating }).map((_, i) => (
                                        <Star
                                            key={i}
                                            className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
                                            aria-hidden
                                        />
                                    ))}
                                </div>
                                <p className="text-sm leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</p>
                                <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-s4 text-xs font-bold text-white">
                                        {t.author[0]}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{t.author}</p>
                                        <p className="text-xs text-slate-500">{t.role}</p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                {/* ── Experiencia visual ── */}
                <section className="mt-16 sm:mt-20">
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[
                            {
                                src: "/img/surf-grupo-bonos.png",
                                alt: "Grupo de surf en clase con bonos S4",
                                caption: "Clases y bonos",
                            },
                            {
                                src: "/img/zona-calentamiento.png",
                                alt: "Zona de calentamiento pre-surf en instalaciones S4",
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

                {/* ── Ofertas socios ── */}
                {productos.length > 0 ? (
                    <div className="mt-16 sm:mt-20">
                        <Contenedor_productos productos={productos} />
                    </div>
                ) : null}
            </main>

            {/* ── Exploración visual (antes del footer) ── */}
            {/* ── Exploración visual (fusionada con el footer) ── */}
            <OpcionesIntro
                variant="dark"
                className="mt-10 sm:mt-14"
            />
        </div>
    </Layout1>
    );
};

export default Pag_principal;
