import React from "react";
import Layout1 from "../layouts/Layout1";
import "../../css/pagina_principal.css";
import Contenedor_productos from "../layouts/Contenedor_productos";
import { Head, Link } from "@inertiajs/react";
import BrandLogo from "../components/BrandLogo";
import SponsorsStrip from "../components/SponsorsStrip";
import Por_que_escogernos_motivo from "../components/Por_que_escogernos_motivo";
import SurfBriefMini from "../components/webcam/SurfBriefMini";
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

const seccionesRapidas = [
    { label: "Sobre nosotros", href: route("nosotros"), icon: MapPin },
    { label: "Clases de surf", href: route("servicios.surf"), icon: Waves },
    { label: "Surftrips", href: route("servicios.surfTrips"), icon: Compass },
    { label: "Surfskate", href: route("servicios.surfSkate"), icon: Sparkles },
    { label: "Tienda S4", href: route("tienda"), icon: Star },
    { label: "Taquillas", href: route("taquillas.planes"), icon: ShieldCheck },
    { label: "Webcam", href: route("servicios.webcams"), icon: Camera },
    { label: "Fotografía", href: route("servicios.fotografia"), icon: Camera },
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

const Pag_principal = ({ productos = [], surfBrief }) => (
    <Layout1>
        <Head>
            <title>San Sebastian Surf School | S4</title>
            <meta
                name="description"
                content="Domina el Cantábrico con San Sebastian Surf School (S4). Clases de surf, club de socios e instalaciones premium en Zurriola, Donostia."
            />
            <meta property="og:title" content="San Sebastián Surf School · S4" />
            <meta property="og:description" content="Escuela de surf premium en Zurriola, Donostia." />
            <meta property="og:image" content="/img/brand/og-share.jpg" />
            <meta property="og:type" content="website" />
        </Head>

        <div className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-50">
            {/* Decoración de fondo */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
                <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
                <div className="absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-[#0f5f74]/10 blur-3xl" />
            </div>

            <main className="relative mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
                {/* ── HERO ── */}
                <section
                    className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-200/50"
                    aria-labelledby="hero-heading"
                >
                    <div className="grid lg:grid-cols-2">
                        <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
                            <BrandLogo variant="navyHero" className="h-24 w-24 sm:h-28 sm:w-28" priority />

                            <h1
                                id="hero-heading"
                                className="mt-5 font-heading text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]"
                            >
                                Domina el{" "}
                                <span className="bg-gradient-to-r from-[#0f5f74] to-cyan-500 bg-clip-text text-transparent">
                                    Cantábrico
                                </span>{" "}
                                con S4
                            </h1>

                            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
                                Tu seguridad, nuestra técnica. Clases, alquiler de material, bonos VIP y un club de
                                socios con instalaciones premium a pie de{" "}
                                <strong className="font-semibold text-slate-800">Zurriola</strong>, en el corazón de
                                Donostia.
                            </p>

                            <div className="mt-7 flex flex-wrap gap-3">
                                <Link
                                    href={route("servicios.surf")}
                                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0f5f74] to-cyan-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-900/20 transition hover:brightness-110"
                                >
                                    <Waves className="h-4 w-4" />
                                    Reserva tu clase
                                </Link>
                                <Link
                                    href={route("nosotros")}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-[#0f5f74]"
                                >
                                    Conocer S4
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>

                            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                {[
                                    { icon: ShieldCheck, t: "Instructores federados", s: "Formación y rescate" },
                                    { icon: Sparkles, t: "Equipo premium", s: "Tablas y neoprenos top" },
                                    { icon: Users, t: "+5.000 alumnos", s: "Todos los niveles" },
                                ].map(({ icon: Icon, t, s }) => (
                                    <div
                                        key={t}
                                        className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
                                    >
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0f5f74]/10 text-[#0f5f74]">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-800">{t}</p>
                                            <p className="text-[10px] text-slate-500">{s}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative min-h-[280px] lg:min-h-full">
                            <img
                                src="/img/fotografo-playa-sunset.png"
                                alt="Sesión de surf al atardecer en la playa de Zurriola, San Sebastián"
                                className="absolute inset-0 h-full w-full object-cover"
                                loading="eager"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f5f74]/80 via-[#0f5f74]/20 to-transparent lg:bg-gradient-to-r lg:from-white/20 lg:via-transparent lg:to-transparent" />
                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between text-white sm:bottom-6 sm:left-6 sm:right-6">
                                <BrandLogo variant="whiteMark" className="h-16 w-16 drop-shadow-lg sm:h-20 sm:w-20" decorative />
                                <div className="rounded-xl border border-white/20 bg-black/30 px-3 py-2 text-right backdrop-blur-sm">
                                    <p className="text-[10px] uppercase tracking-wide text-cyan-200">Cantábrico</p>
                                    <p className="text-xs font-semibold">Seguridad & técnica</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Accesos rápidos ── */}
                <section className="mt-10" aria-label="Accesos rápidos">
                    <div className="flex flex-wrap gap-2">
                        {seccionesRapidas.map(({ label, href, icon: Icon }) => (
                            <Link
                                key={label}
                                href={href}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-cyan-400/40 hover:bg-cyan-50 hover:text-[#0f5f74]"
                            >
                                <Icon className="h-3.5 w-3.5 text-cyan-600" />
                                {label}
                            </Link>
                        ))}
                    </div>
                </section>

                <SurfBriefMini brief={surfBrief} />

                {/* ── Sobre nosotros teaser ── */}
                <section className="mt-14 sm:mt-16" aria-labelledby="sobre-nosotros-heading">
                    <div className="grid overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-[#0f5f74] to-slate-900 shadow-xl lg:grid-cols-5">
                        <div className="relative hidden lg:col-span-2 lg:block">
                            <img
                                src="/img/nosotros/galeria/instalaciones-01.png"
                                alt="Instalaciones premium del club S4 en Zurriola"
                                className="h-full w-full object-cover opacity-90"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0f5f74]/90" />
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

                            <Link
                                href={route("nosotros")}
                                className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#0f5f74] transition hover:bg-cyan-50"
                            >
                                Ver instalaciones y club
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Por qué elegir S4 ── */}
                <section className="mt-16 sm:mt-20" aria-labelledby="por-que-heading">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">
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
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-600">
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
                                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f5f74] text-xs font-bold text-white">
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
                                <figcaption className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#0f5f74]">
                                    {img.caption}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </section>

                {/* ── Patrocinadores ── */}
                <section className="mt-16 sm:mt-20">
                    <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm sm:p-8">
                        <SponsorsStrip variant="light" logoVariant="navyMark" />
                    </div>
                </section>

                {/* ── Ofertas socios ── */}
                {productos.length > 0 ? (
                    <div className="mt-16 sm:mt-20">
                        <Contenedor_productos productos={productos} />
                    </div>
                ) : null}
            </main>
        </div>
    </Layout1>
);

export default Pag_principal;
