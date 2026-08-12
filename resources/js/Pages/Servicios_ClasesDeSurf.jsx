import React, { useMemo, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import SeoHead from "../components/seo/SeoHead";
import ContactChannelsModal from "../components/ContactChannelsModal";
import {
    Waves,
    CheckCircle2,
    ShieldCheck,
    Award,
    Package,
    ArrowRight,
    MessageCircle,
    CalendarDays,
    Users,
    UserCheck,
    Camera,
    Sparkles,
    Ticket,
    UserPlus,
    AlertTriangle,
    BookOpen,
    GraduationCap,
    Target,
    Flame,
} from "lucide-react";

import { privateLessonPriceRows } from "../lib/privateLessonPricing";

const BONOS = [
    {
        titulo: "Bono 5 clases",
        descripcion:
            "Cinco clases de hora y media con tabla y neopreno incluidos. La forma flexible de empezar a surfear con regularidad.",
        detalles: [
            "5 clases de 1,5 h",
            "Tabla y neopreno incluidos",
            "Equivale a 30 €/clase",
        ],
        precio: "150 €",
        nota: "5 clases",
        icon: Ticket,
    },
    {
        titulo: "Bono 10 clases",
        descripcion:
            "Diez clases de hora y media con tabla y neopreno incluidos. El mejor precio por sesión para progresar de verdad.",
        detalles: [
            "10 clases de 1,5 h",
            "Tabla y neopreno incluidos",
            "Equivale a 25 €/clase",
        ],
        precio: "250 €",
        nota: "10 clases",
        icon: Sparkles,
        destacado: true,
    },
    {
        titulo: "Bono 10 clases particulares",
        descripcion:
            "Diez clases particulares a precio reducido. Atención totalmente personalizada para acelerar tu evolución.",
        detalles: [
            "10 clases particulares",
            "Tabla y neopreno incluidos",
            "Atención individual",
        ],
        precio: "600 €",
        nota: "10 clases particulares",
        icon: UserCheck,
    },
];

const PASOS = [
    {
        icon: MessageCircle,
        title: "Planning por WhatsApp",
        body: "Cada domingo por la tarde, nuestros monitores publican en el grupo el planning de la semana con las mejores franjas según la marea y el oleaje previstos.",
    },
    {
        icon: CalendarDays,
        title: "Tú decides cuándo",
        body: "Te haces una idea de qué momentos estarán mejor para tu nivel y te apuntas a la franja que quieras… o vas por libre, sin ningún compromiso.",
    },
    {
        icon: Waves,
        title: "Surfeas en tu mejor momento",
        body: "Aprovechas las condiciones óptimas del día, acompañado de monitor y con el equipo incluido. Solo tienes que disfrutar de la ola.",
    },
];

const NIVEL_STYLE = {
    Principiante: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
    Intermedio: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/30",
    Avanzado: "bg-orange-500/15 text-orange-200 ring-orange-400/30",
};

const NIVELES_CLASE = [
    {
        nivel: "Principiante",
        icon: GraduationCap,
        olas: "Espuma y olas pequeñas (rodilla a cadera)",
        resumen:
            "Primeros pasos en el agua. Ideal tras el tutorial de primer día o una particular inicial.",
        requisitos: [
            "No es necesario haber surfeado antes (pero sí haber hecho primer día o equivalente)",
            "Objetivo: puesta en pie, bajar la ola de frente y coger espumas u olas pequeñas sin romper con ayuda",
            "Saber escuchar indicaciones del monitor y moverse con ayuda en la orilla",
            "Condiciones suaves: zona controlada, sin presión de pico ni corrientes fuertes",
        ],
    },
    {
        nivel: "Intermedio",
        icon: Target,
        olas: "Hasta hombro, olas con algo de fuerza",
        resumen:
            "Ya dominas la base. Entras al agua sin que el monitor repita conceptos de principiante.",
        requisitos: [
            "Puesta en pie consistente en espuma y primeras olas verdes pequeñas",
            "Remar con control, girar la tabla y desplazarte en el agua sin ayuda constante",
            "Conocer normas básicas de seguridad y posicionamiento en el pico con supervisión",
            "Empezar a bajar la ola de lado y generar velocidad en la pared",
        ],
    },
    {
        nivel: "Avanzado",
        icon: Flame,
        olas: "Cabeza o inferior según condiciones del día",
        resumen:
            "Autonomía en el agua. El monitor afina técnica y lectura de la ola, no enseña desde cero.",
        requisitos: [
            "Take-off fluido en olas sin romper y primeras maniobras en la pared",
            "Lectura básica de series, corrientes y elección de pico acorde a tu nivel",
            "Capacidad de surfear en grupo sin frenar la dinámica de la sesión",
            "Duck dive o turtle roll en neopreno (según material) para salir al line-up",
        ],
    },
];

const PRIMER_DIA_TEORIA = [
    "Seguridad en la playa, uso del material y señales del monitor",
    "Cómo tumbarse, equilibrar el cuerpo y posicionarse en la tabla",
    "Técnica de remada y cómo girar la tabla en el agua",
    "Cómo coger la ola en espuma y, si te sale bien, olas pequeñas sin romper",
    "Dinámica de grupo en el agua: turnos, posición y ayuda mutua con el monitor",
    "Puesta en práctica guiada en orilla, espuma y zona controlada, paso a paso",
];

const PLANNING = [
    {
        dia: "Lunes",
        franjas: [
            { hora: "11:00", nivel: "Principiante" },
            { hora: "14:00", nivel: "Avanzado" },
        ],
    },
    {
        dia: "Martes",
        franjas: [
            { hora: "09:00", nivel: "Principiante" },
            { hora: "11:00", nivel: "Intermedio" },
            { hora: "17:30", nivel: "Avanzado" },
            { hora: "19:00", nivel: "Principiante" },
        ],
    },
    {
        dia: "Miércoles",
        franjas: [
            { hora: "10:00", nivel: "Principiante" },
            { hora: "12:30", nivel: "Intermedio" },
            { hora: "18:00", nivel: "Avanzado" },
        ],
    },
    {
        dia: "Jueves",
        franjas: [
            { hora: "09:30", nivel: "Principiante" },
            { hora: "16:00", nivel: "Intermedio" },
            { hora: "18:30", nivel: "Avanzado" },
        ],
    },
    {
        dia: "Viernes",
        franjas: [
            { hora: "11:00", nivel: "Principiante" },
            { hora: "13:00", nivel: "Avanzado" },
            { hora: "17:00", nivel: "Intermedio" },
        ],
    },
];

const ASISTENCIA = [
    {
        personas: "2 a 6 alumnos en la franja",
        consumo: "1 clase del bono",
        equivalente: "25 €/clase",
        detalle: "Precio estándar del bono de 10 clases (250 € ÷ 10)",
        destacado: false,
    },
    {
        personas: "Solo tú en la franja",
        consumo: "2 clases del bono",
        equivalente: "50 €",
        detalle:
            "Excepción: nadie más se apuntó — sesión como particular a precio superoferta",
        destacado: true,
    },
];

const VENTAJAS = [
    {
        icon: ShieldCheck,
        title: "Seguridad primero",
        text: "Todas nuestras clases siguen protocolos de seguridad rigurosos en el agua.",
    },
    {
        icon: Award,
        title: "Instructores certificados",
        text: "Años de experiencia y certificaciones internacionales que avalan a nuestro equipo.",
    },
    {
        icon: Package,
        title: "Equipo de calidad",
        text: "Tablas y trajes de neopreno de marcas líderes, siempre en óptimo estado.",
    },
];

/**
 * Cabecera de capítulo de modalidad.
 * Outline: eyebrow (01 + contexto) → H2 = nombre del servicio → H3 = promesa/beneficio.
 */
function SectionChapterHeader({
    number,
    title,
    sublabel,
    benefit,
    theme,
    align = "left",
    titleId,
}) {
    const styles = {
        particulares: {
            wrap: "border-amber-400/25 bg-amber-500/[0.07]",
            num: "text-amber-400/80",
            rule: "bg-amber-400/35",
            sub: "text-amber-100/55",
            benefit: "text-amber-50/90",
        },
        bonos: {
            wrap: "border-emerald-400/25 bg-emerald-500/[0.07]",
            num: "text-emerald-400/80",
            rule: "bg-emerald-400/35",
            sub: "text-emerald-100/55",
            benefit: "text-emerald-50/90",
        },
    };
    const s = styles[theme];
    const centered = align === "center";

    return (
        <header
            className={centered ? "flex flex-col items-center text-center" : ""}
        >
            <div
                className={`inline-flex max-w-full items-center gap-2.5 rounded-xl border px-3 py-2 backdrop-blur-sm ${s.wrap}`}
            >
                <span
                    className={`text-xs font-bold tabular-nums tracking-wider ${s.num}`}
                    aria-hidden
                >
                    {number}
                </span>
                {sublabel ? (
                    <>
                        <span
                            className={`h-3.5 w-px shrink-0 ${s.rule}`}
                            aria-hidden
                        />
                        <p
                            className={`text-[11px] font-medium leading-snug ${s.sub}`}
                        >
                            {sublabel}
                        </p>
                    </>
                ) : null}
            </div>
            <h2
                id={titleId}
                className={`mt-4 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] ${
                    centered ? "max-w-2xl" : ""
                }`}
            >
                {title}
            </h2>
            {benefit ? (
                <h3
                    className={`mt-3 max-w-2xl text-lg font-semibold leading-snug sm:text-xl ${s.benefit}`}
                >
                    {benefit}
                </h3>
            ) : null}
        </header>
    );
}

function ModalidadPickerCard({
    href,
    number,
    icon: Icon,
    title,
    subtitle,
    hint,
    theme,
    benefits = [],
}) {
    const styles = {
        particulares: {
            card: "border-amber-400/25 bg-gradient-to-br from-amber-500/10 via-violet-950/40 to-slate-950/80 hover:border-amber-400/50 hover:from-amber-500/15",
            num: "text-amber-500/25 group-hover:text-amber-400/40",
            icon: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
            title: "text-white",
            hint: "text-amber-200/80",
            check: "text-amber-400",
        },
        bonos: {
            card: "border-emerald-400/25 bg-gradient-to-br from-emerald-500/10 via-cyan-950/40 to-slate-950/80 hover:border-emerald-400/50 hover:from-emerald-500/15",
            num: "text-emerald-500/25 group-hover:text-emerald-400/40",
            icon: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
            title: "text-white",
            hint: "text-emerald-200/80",
            check: "text-emerald-400",
        },
    };
    const s = styles[theme];

    return (
        <a
            href={href}
            className={`group relative flex h-full flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-8 ${s.card}`}
        >
            <div className="mb-4 flex items-start justify-between gap-4">
                <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ring-1 ${s.icon}`}
                >
                    <Icon className="h-6 w-6" />
                </div>
                <span
                    className={`shrink-0 select-none text-5xl font-black leading-none tabular-nums transition-colors sm:text-6xl ${s.num}`}
                    aria-hidden
                >
                    {number}
                </span>
            </div>
            <h3 className={`text-xl font-extrabold sm:text-2xl ${s.title}`}>
                {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                {subtitle}
            </p>
            {benefits.length > 0 ? (
                <ul className="mt-4 space-y-2">
                    {benefits.map((item) => (
                        <li
                            key={item}
                            className="flex items-start gap-2 text-sm leading-snug text-slate-300"
                        >
                            <CheckCircle2
                                className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${s.check}`}
                                aria-hidden
                            />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
            <p
                className={`mt-4 text-xs font-semibold uppercase tracking-wider ${s.hint}`}
            >
                {hint}
            </p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-white/90">
                Ver tarifas
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
            </span>
        </a>
    );
}

const BonoCard = ({ bono, onContact }) => {
    const Icon = bono.icon;
    const isParticularPack = bono.titulo.toLowerCase().includes("particulares");

    return (
        <div
            className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
                bono.destacado
                    ? "border-emerald-400/40 bg-gradient-to-b from-emerald-500/10 to-white/5 shadow-lg shadow-emerald-950/30"
                    : isParticularPack
                      ? "border-amber-400/30 bg-gradient-to-b from-amber-500/10 to-white/5 hover:border-amber-400/45"
                      : "border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-white/10"
            }`}
        >
            {bono.destacado && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
                    Mejor precio
                </span>
            )}
            {isParticularPack && !bono.destacado ? (
                <span className="absolute -top-3 left-6 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-100">
                    Pack particulares
                </span>
            ) : null}
            <div
                className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${
                    isParticularPack
                        ? "bg-amber-500/15 text-amber-200 ring-amber-400/30"
                        : "bg-cyan-500/15 text-cyan-200 ring-cyan-400/30"
                }`}
            >
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-bold text-white">{bono.titulo}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {bono.descripcion}
            </p>
            <ul className="mt-4 space-y-2">
                {bono.detalles.map((d) => (
                    <li
                        key={d}
                        className="flex items-start gap-2 text-sm text-slate-300"
                    >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {d}
                    </li>
                ))}
            </ul>
            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-4">
                <div>
                    <p className="text-2xl font-extrabold text-white">
                        {bono.precio}
                    </p>
                    <p className="text-xs text-slate-500">{bono.nota}</p>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        onContact?.(isParticularPack ? "academy" : "bono")
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-400/30 transition hover:bg-cyan-500/25"
                >
                    Reservar
                    <ArrowRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
};

const InvitadoAmigoCard = () => {
    return (
        <div className="mt-10 overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-r from-cyan-500/10 via-white/5 to-emerald-500/10 p-6 backdrop-blur-sm sm:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30">
                        <UserPlus className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-white sm:text-xl">
                            ¿Viene un amigo a una sola clase?
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                            Si tienes bono y un amigo quiere unirse puntualmente
                            a una única sesión, puede apuntarse como invitado
                            por <strong className="text-cyan-200">35 €</strong>.
                            Tarifa especial de amigo, válida para esa clase
                            concreta, sin necesidad de comprar bono completo.
                        </p>

                        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
                            <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-100">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                                <span>
                                    <strong className="text-amber-200">
                                        Nivel requerido:
                                    </strong>{" "}
                                    nociones básicas (remar, moverse y
                                    levantarse). Sin ellas, o si elige una
                                    franja por encima de su nivel, el monitor
                                    puede derivarlo a orilla/arena; la
                                    responsabilidad es del alumno. Sin
                                    experiencia →{" "}
                                    <strong className="text-amber-50">
                                        principiante
                                    </strong>{" "}
                                    o particular.
                                </span>
                            </p>
                        </div>

                        <a
                            href="#nivel-minimo-monitor"
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                        >
                            Ver criterio del monitor y niveles
                            <ArrowRight className="h-3.5 w-3.5" />
                        </a>
                    </div>
                </div>
                <div className="shrink-0 self-center rounded-2xl border border-cyan-400/20 bg-slate-900/50 px-6 py-4 text-center lg:self-start">
                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                        Clase suelta amigo
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-cyan-200">
                        35 €
                    </p>
                </div>
            </div>
        </div>
    );
};

export default function ServiciosClasesDeSurf({ seo = null }) {
    const [contactOpen, setContactOpen] = useState(false);
    const [contactTopic, setContactTopic] = useState("academy");

    const privateLessonPricing = usePage().props.academyPrivateLesson ?? null;
    const PARTICULARES = useMemo(
        () => privateLessonPriceRows(privateLessonPricing),
        [privateLessonPricing],
    );

    const openContact = (topic = "academy") => {
        setContactTopic(topic);
        setContactOpen(true);
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2a33] to-slate-950 text-white">
            <SeoHead seo={seo} />
            {contactOpen ? (
                <ContactChannelsModal
                    topic={contactTopic}
                    title="Contacta con la academia"
                    subtitle="Te ayudamos a elegir clase, bono u horario según el oleaje de la semana."
                    accent="academy"
                    onClose={() => setContactOpen(false)}
                />
            ) : null}
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-cyan-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.45),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Waves className="h-3.5 w-3.5" />
                        Academia · San Sebastián Surf School
                    </div>
                    <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Clases de surf en la{" "}
                        <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                            Zurriola
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Particulares, grupales y bonos en la playa de Zurriola
                        (Donostia): surfeas con monitor certificado y equipo
                        incluido, cuando mejor estén las condiciones.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={route("academy.lessons.index")}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-110"
                        >
                            <Waves className="h-4 w-4" />
                            Reservar clase
                        </Link>
                        <a
                            href="#particulares"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-110"
                        >
                            <UserCheck className="h-4 w-4" />
                            Ver particulares
                        </a>
                        <a
                            href="#bonos"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-110"
                        >
                            <Ticket className="h-4 w-4" />
                            Ver bonos
                        </a>
                        <button
                            type="button"
                            onClick={() => openContact("academy")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                        >
                            <MessageCircle className="h-4 w-4" />
                            Contactar
                        </button>
                    </div>
                </div>
            </section>

            {/* Selector de modalidad */}
            <section className="border-b border-white/10 bg-slate-950/90 py-12 sm:py-14">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <p className="text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                        Elige tu forma de surfear
                    </p>
                    <h2 className="mt-3 text-center text-2xl font-extrabold text-white sm:text-3xl">
                        Dos modalidades, dos experiencias
                    </h2>
                    <p className="mx-auto mt-3 max-w-xl text-center text-sm text-slate-400">
                        Las{" "}
                        <strong className="text-amber-200">particulares</strong>{" "}
                        son sesiones a medida con tu monitor. Los{" "}
                        <strong className="text-emerald-200">bonos</strong> son
                        packs flexibles en grupo según el oleaje de la semana.
                    </p>
                    <div className="mt-8 grid items-stretch gap-4 sm:grid-cols-2">
                        <ModalidadPickerCard
                            href="#particulares"
                            number="01"
                            icon={UserCheck}
                            theme="particulares"
                            title="Clases particulares"
                            subtitle="Monitor dedicado a tu grupo. Ideal para progresar rápido o tu primera vez con atención total."
                            hint="Desde 30 €/persona en grupos de 4 a 6"
                            benefits={[
                                "Equipo incluido (tabla y neopreno)",
                                "Tú eliges la hora (dentro de la disponibilidad)",
                                "Atención personalizada: el monitor solo para tu grupo",
                                "Entráis donde más os conviene según el oleaje",
                                "Más olas y feedback al momento para progresar antes",
                                "¿Probar 2 tablas? El monitor puede llevar una segunda y cambiarte",
                                "Ideal para familia o amigos al mismo ritmo",
                            ]}
                        />
                        <ModalidadPickerCard
                            href="#bonos"
                            number="02"
                            icon={Ticket}
                            theme="bonos"
                            title="Bonos en grupo"
                            subtitle="Compras el pack y surfeas cuando mejor esté el mar. Clases de 1,5 h con equipo incluido."
                            hint="Desde 25 €/clase con bono de 10"
                            benefits={[
                                "Equipo incluido (tabla y neopreno)",
                                "Precio más económico por clase",
                                "Más autonomía: aprendes a leer el mar con el grupo",
                                "Haces compañeros de sesión",
                                "Puedes intercambiar tablas con tus compañeros",
                                "Flexibilidad: sales los días que mejor pinte el oleaje",
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* ── SECCIÓN 01: Clases particulares ── */}
            <section
                id="particulares"
                aria-labelledby="particulares-heading"
                className="relative scroll-mt-24 overflow-hidden border-b-4 border-amber-400/50"
            >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-950/90 via-[#1a1028] to-amber-950/50" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.12),_transparent_50%)]" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                    <SectionChapterHeader
                        number="01"
                        title="Clases particulares"
                        sublabel="Sesión a medida · monitor solo para tu grupo"
                        benefit="Atención 100% personalizada"
                        theme="particulares"
                        titleId="particulares-heading"
                    />
                    <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:items-center">
                        <div>
                            <p className="leading-relaxed text-slate-300">
                                La opción ideal si buscas progresar rápido o
                                prefieres una experiencia a medida. Sesiones de{" "}
                                <strong className="text-amber-100">
                                    hora y media
                                </strong>{" "}
                                con tabla y neopreno incluidos. El precio por
                                persona baja cuanto mayor es el grupo.
                            </p>
                            <ul className="mt-5 space-y-2 text-sm text-slate-400">
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                                    Reserva para ti solo o con amigos (hasta 6
                                    personas)
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
                                    Horario y enfoque adaptados a tu nivel
                                </li>
                            </ul>
                            <Link
                                href={`${route("academy.lessons.index")}?particular=1`}
                                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-3 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-110"
                            >
                                Reservar particular
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                        <div className="rounded-2xl border border-amber-400/25 bg-slate-950/60 p-6 shadow-xl shadow-amber-950/20 backdrop-blur-md">
                            <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-amber-300/80">
                                Tarifas por tamaño de grupo
                            </p>
                            <div className="space-y-2">
                                {PARTICULARES.map((p) => (
                                    <div
                                        key={p.pax}
                                        className="flex items-center justify-between rounded-xl border border-amber-400/10 bg-amber-500/5 px-4 py-3.5"
                                    >
                                        <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                            <Users className="h-4 w-4 text-amber-400/70" />
                                            {p.pax}
                                        </span>
                                        <span className="text-right">
                                            <span className="text-2xl font-extrabold text-white">
                                                {p.precio}
                                            </span>
                                            <span className="ml-1 text-xs text-amber-200/50">
                                                {p.nota}
                                            </span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-4 text-center text-xs text-slate-500">
                                Todas las sesiones duran 1,5 h e incluyen tabla
                                y neopreno.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── SECCIÓN 02: Bonos ── */}
            <section
                id="bonos"
                aria-labelledby="bonos-heading"
                className="relative scroll-mt-24 overflow-hidden border-b-4 border-emerald-400/50"
            >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#062a2f] via-emerald-950/40 to-slate-950" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(52,211,153,0.14),_transparent_55%)]" />
                <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />

                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                    <div className="mb-10">
                        <SectionChapterHeader
                            number="02"
                            title="Bonos en grupo"
                            sublabel="Clases en grupo · flexibles según el oleaje"
                            benefit="Surfea con libertad y al mejor precio"
                            theme="bonos"
                            align="center"
                            titleId="bonos-heading"
                        />
                        <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-relaxed text-slate-300">
                            Compra tu bono una vez y úsalo durante la semana
                            cuando las condiciones acompañen. Tú eliges cuándo
                            entras al agua — no es lo mismo que una clase
                            particular reservada a fecha fija.
                        </p>
                    </div>

                    <div className="mb-10 overflow-hidden rounded-3xl border border-emerald-400/20 shadow-2xl shadow-emerald-950/40">
                        <img
                            src="/img/surf-grupo-bonos.png"
                            alt="Grupo de alumnos con monitor en la playa durante una clase de surf en grupo"
                            className="h-auto max-h-[22rem] w-full object-cover object-center"
                        />
                        <p className="border-t border-emerald-400/15 bg-emerald-950/40 px-4 py-3 text-center text-xs text-emerald-100/60">
                            Clases en grupo con monitor certificado — la
                            dinámica de nuestros bonos en la Zurriola.
                        </p>
                    </div>

                    <p className="mb-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/70">
                        Elige tu pack
                    </p>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {BONOS.map((bono) => (
                            <BonoCard
                                key={bono.titulo}
                                bono={bono}
                                onContact={openContact}
                            />
                        ))}
                    </div>

                    <InvitadoAmigoCard />
                </div>
            </section>

            {/* Cómo funcionan los bonos */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="mb-10 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                        Cómo funcionan los bonos
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold text-white">
                        Flexibilidad total, sin compromiso
                    </h2>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                    {PASOS.map(({ icon: Icon, title, body }) => (
                        <div
                            key={title}
                            className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-6"
                        >
                            <Icon className="mb-3 h-6 w-6 text-cyan-300" />
                            <h3 className="text-lg font-bold text-white">
                                {title}
                            </h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                {body}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Planning de ejemplo */}
                <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                            <CalendarDays className="h-5 w-5 text-cyan-300" />
                            Ejemplo de planning semanal
                        </h3>
                        <div className="flex flex-wrap gap-2 text-[11px]">
                            {Object.keys(NIVEL_STYLE).map((nivel) => (
                                <span
                                    key={nivel}
                                    className={`inline-flex items-center rounded-full px-2.5 py-1 font-semibold ring-1 ${NIVEL_STYLE[nivel]}`}
                                >
                                    {nivel}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        {PLANNING.map((dia) => (
                            <div
                                key={dia.dia}
                                className="rounded-xl border border-white/10 bg-slate-900/40 p-4"
                            >
                                <p className="mb-3 text-sm font-bold text-white">
                                    {dia.dia}
                                </p>
                                <div className="space-y-2">
                                    {dia.franjas.map((f) => (
                                        <div
                                            key={f.hora + f.nivel}
                                            className="flex items-center justify-between gap-2"
                                        >
                                            <span className="text-sm font-semibold text-slate-200">
                                                {f.hora}
                                            </span>
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${NIVEL_STYLE[f.nivel]}`}
                                            >
                                                {f.nivel}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="mt-4 text-xs text-slate-500">
                        * Ejemplo orientativo. El planning real se publica cada
                        domingo en el grupo de WhatsApp y depende de la marea y
                        el oleaje de la semana.
                    </p>
                </div>

                {/* Consumo del bono por sesión */}
                <div className="mt-10 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
                            <Users className="h-5 w-5 text-emerald-400" />
                            Cómo se consume tu bono en cada sesión
                        </h3>

                        <div className="mt-4 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3">
                            <p className="text-sm leading-relaxed text-slate-200">
                                Con el bono{" "}
                                <strong className="text-white">
                                    no reservas una particular
                                </strong>
                                . Te apuntas a una franja de grupo abierta a más
                                alumnos. Si en esa franja coincidís varios, cada
                                uno consume{" "}
                                <strong className="text-cyan-200">
                                    1 clase del bono
                                </strong>
                                .
                            </p>
                        </div>

                        <div className="mt-4 space-y-3">
                            {ASISTENCIA.map((a) => (
                                <div
                                    key={a.personas}
                                    className={`rounded-xl border px-4 py-3.5 ${
                                        a.destacado
                                            ? "border-amber-400/30 bg-amber-500/10"
                                            : "border-white/10 bg-slate-900/40"
                                    }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                        <span className="text-sm font-semibold text-white">
                                            {a.personas}
                                        </span>
                                        <span className="text-right">
                                            <span className="block text-lg font-extrabold text-emerald-300">
                                                {a.consumo}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                ({a.equivalente})
                                            </span>
                                        </span>
                                    </div>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                                        {a.detalle}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-300">
                            <p>
                                <strong className="text-white">Ejemplo:</strong>{" "}
                                el bono de 10 clases cuesta{" "}
                                <strong className="text-emerald-300">
                                    250 €
                                </strong>{" "}
                                — cada sesión de grupo equivale a{" "}
                                <strong className="text-emerald-300">
                                    25 €
                                </strong>
                                . Si te apuntas a una franja y{" "}
                                <strong className="text-white">
                                    nadie más se apunta
                                </strong>
                                , para que no te quedes sin surfear te damos la
                                sesión igualmente, pero consume{" "}
                                <strong className="text-amber-200">
                                    2 clases del bono (50 €)
                                </strong>
                                : es una atención casi particular a precio de
                                superoferta, porque en ese caso concreto no hubo
                                grupo.
                            </p>
                            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-slate-200">
                                <strong className="text-rose-200">
                                    Importante:
                                </strong>{" "}
                                no está permitido usar el bono para forzar una
                                particular — por ejemplo, apuntarse a una franja
                                esperando que nadie más entre. Si quieres clase
                                particular, debes solicitarla{" "}
                                <strong className="text-white">
                                    al margen del bono
                                </strong>
                                , con la tarifa de particulares.
                            </p>
                        </div>

                        <p className="mt-4 text-xs text-slate-500">
                            Máximo 6 alumnos por monitor. Con más de 6, añadimos
                            un segundo monitor y se abren dos picos en el agua.
                        </p>
                    </div>

                    {/* Extras / normas */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                            <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-cyan-300" />
                            <div>
                                <h4 className="text-sm font-bold text-white">
                                    Grupos de más de 6 alumnos
                                </h4>
                                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                                    Si en una franja coincidís más de 6
                                    personas, añadimos un segundo monitor. Eso
                                    nos permite abrir dos picos en el agua, así
                                    puedes elegir entre olas más grandes o más
                                    pequeñas según tu nivel y preferencia.
                                </p>
                            </div>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/5 backdrop-blur-sm">
                            <div className="grid gap-0 sm:grid-cols-5">
                                <div className="relative sm:col-span-2">
                                    <img
                                        src="/img/fotografo-playa-sunset.png"
                                        alt="Fotógrafo profesional capturando una sesión de surf al atardecer en la playa"
                                        className="h-44 w-full object-cover sm:h-full sm:min-h-[11rem]"
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-fuchsia-950/60 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-fuchsia-950/40" />
                                </div>
                                <div className="flex items-start gap-3 p-5 sm:col-span-3">
                                    <Camera className="mt-0.5 h-5 w-5 shrink-0 text-fuchsia-300" />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">
                                            Fotógrafo de regalo (extra
                                            ocasional)
                                        </h4>
                                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                                            A partir de 4 personas, y solo en
                                            los bonos, procuramos poner
                                            fotógrafo sin coste como detalle. No
                                            es algo garantizado ni habitual: es
                                            un extra que ofrecemos cuando
                                            podemos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alerta Primer día — primero para quien nunca ha surfeado */}
                <div className="mt-10 overflow-hidden rounded-2xl border-2 border-amber-400/50 bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-orange-500/5 shadow-lg shadow-amber-950/20">
                    <div className="flex flex-col gap-5 p-6 sm:p-8 lg:flex-row lg:items-start">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-400/20 ring-2 ring-amber-400/40">
                            <BookOpen className="h-7 w-7 text-amber-300" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-200">
                                ¿Nunca has surfeado?
                            </p>
                            <h3 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">
                                Clase de Primer día
                            </h3>
                            <p className="mt-3 text-sm leading-relaxed text-amber-50/90">
                                Si jamás has estado en una tabla,{" "}
                                <strong className="text-white">
                                    empieza aquí
                                </strong>
                                . Recomendamos que tu primera experiencia sea
                                una{" "}
                                <strong className="text-amber-100">
                                    particular
                                </strong>{" "}
                                o una{" "}
                                <strong className="text-amber-100">
                                    grupal de primer día
                                </strong>{" "}
                                donde todos los alumnos parten de cero — así la
                                charla del monitor es útil para todos y nadie
                                pierde tiempo escuchando lo mismo por segunda
                                vez.
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-200">
                                Es una sesión con{" "}
                                <strong className="text-white">
                                    parte teórica en la arena
                                </strong>{" "}
                                y práctica inmediata: cómo remar, girar la
                                tabla, tumbarse, coger olas en espuma y — si el
                                nivel y las condiciones lo permiten —{" "}
                                <strong className="text-white">
                                    olas pequeñas sin romper
                                </strong>
                                . Lo básico del surf antes de pasarlo al agua
                                con el monitor.
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-200">
                                En la{" "}
                                <strong className="text-amber-100">
                                    grupal de primer día
                                </strong>{" "}
                                surféis juntos con la misma base: turnos en el
                                agua, correcciones del monitor para todos y
                                dinámica de grupo — aprendéis a moveros con
                                seguridad sin quedaros atrás ni adelantaros sin
                                control.
                            </p>
                            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                                {PRIMER_DIA_TEORIA.map((item) => (
                                    <li
                                        key={item}
                                        className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-black/20 px-3 py-2 text-xs leading-relaxed text-slate-100"
                                    >
                                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={route("academy.lessons.index")}
                                className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-300"
                            >
                                Reservar clase de primer día
                                <ArrowRight className="h-4 w-4" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Niveles de clase */}
                <div className="mt-10">
                    <div className="mb-6 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">
                            Elige bien tu franja
                        </p>
                        <h3 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                            Niveles: qué se exige en cada clase
                        </h3>
                        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-400">
                            Apúntate a la franja que corresponda a tu
                            experiencia real. Así la sesión rinde para ti y para
                            el resto del grupo.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {NIVELES_CLASE.map(
                            ({
                                nivel,
                                icon: Icon,
                                olas,
                                resumen,
                                requisitos,
                            }) => (
                                <article
                                    key={nivel}
                                    className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                                >
                                    <div className="mb-3 flex items-center justify-between gap-2">
                                        <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ${NIVEL_STYLE[nivel]}`}
                                        >
                                            {nivel}
                                        </span>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-slate-300">
                                            <Icon className="h-4 w-4" />
                                        </div>
                                    </div>
                                    <p className="text-xs font-semibold text-cyan-200/90">
                                        {olas}
                                    </p>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                        {resumen}
                                    </p>
                                    <ul className="mt-4 flex-1 space-y-2 border-t border-white/10 pt-4">
                                        {requisitos.map((req) => (
                                            <li
                                                key={req}
                                                className="flex items-start gap-2 text-xs leading-relaxed text-slate-300"
                                            >
                                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                                {req}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ),
                        )}
                    </div>
                </div>

                {/* Nivel, seguridad e invitados (fuente única del criterio; el card amigo solo resume + enlaza aquí) */}
                <div className="mt-10 space-y-6">
                    <div
                        id="nivel-minimo-monitor"
                        className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8"
                    >
                        <div className="mb-6 flex items-center gap-3">
                            <AlertTriangle className="h-6 w-6 text-amber-400" />
                            <h3 className="text-lg font-bold text-white sm:text-xl">
                                Nivel mínimo y criterio del monitor
                            </h3>
                        </div>
                        <div className="grid gap-6 lg:grid-cols-2">
                            <div>
                                <p className="text-sm leading-relaxed text-slate-300">
                                    Las clases de bono — incluida la tarifa de
                                    amigo — están pensadas para quien ya domina
                                    las{" "}
                                    <strong className="text-white">
                                        nociones básicas de surf
                                    </strong>
                                    : saber remar, desplazarse con control en el
                                    agua y levantarse sobre la tabla. Es el
                                    mínimo indispensable para integrarse en el
                                    grupo sin frenar el ritmo de la sesión.
                                </p>
                                <ul className="mt-4 space-y-2">
                                    {[
                                        "Remar y posicionarse en el pico",
                                        "Desplazarse con seguridad en el agua",
                                        "Intentar levantarse y surfear espuma",
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2 text-sm text-slate-300"
                                        >
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-5">
                                <p className="text-sm leading-relaxed text-slate-300">
                                    Si un alumno se apunta a una franja de nivel
                                    medio o avanzado y el monitor detecta que no
                                    tiene el nivel adecuado, podrá orientarle
                                    para que intente coger{" "}
                                    <strong className="text-white">
                                        espumas más abajo
                                    </strong>{" "}
                                    o, si la situación lo requiere por
                                    seguridad, trabajar desde{" "}
                                    <strong className="text-white">
                                        la orilla o la arena
                                    </strong>
                                    .
                                </p>
                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    En ese caso, es responsabilidad del alumno
                                    haber elegido una clase por encima de su
                                    nivel real. Si nunca ha surfeado, lo
                                    correcto es empezar por principiante, no por
                                    una sesión de nivel superior.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-transparent p-6 backdrop-blur-sm sm:p-8">
                        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30">
                                <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white sm:text-xl">
                                    Tutorial de primer día (sin experiencia
                                    previa)
                                </h3>

                                <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                                    <p className="text-sm leading-relaxed text-emerald-100">
                                        <strong className="text-white">
                                            Recomendación San Sebastián Surf
                                            School:
                                        </strong>{" "}
                                        si nunca has surfeado, tu primera clase
                                        debería ser una{" "}
                                        <strong className="text-emerald-200">
                                            particular
                                        </strong>{" "}
                                        o, si prefieres grupo, una sesión{" "}
                                        <strong className="text-emerald-200">
                                            grupal de primer día
                                        </strong>{" "}
                                        en la que todos los alumnos empiezan
                                        desde cero.
                                    </p>
                                </div>

                                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                                    El primer día no es “entrar al agua y
                                    probar”: hay teoría breve, práctica en arena
                                    y luego espumas con supervisión — y, cuando
                                    encaja con tu nivel y el mar del día,
                                    también{" "}
                                    <strong className="text-white">
                                        olas pequeñas sin romper
                                    </strong>
                                    . Así ganas{" "}
                                    <strong className="text-white">
                                        seguridad, remada y pop-up
                                    </strong>{" "}
                                    antes de unirte a las clases de principiante
                                    del bono.
                                </p>

                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    Si entras directo a una clase mixta sin esa
                                    base, el monitor pierde minutos repitiendo
                                    lo que el resto ya vio en su sesión de
                                    primer día. Por eso preferimos que empieces
                                    con un grupo que está{" "}
                                    <strong className="text-white">
                                        en la misma situación
                                    </strong>
                                    , con turnos en el agua y la misma dinámica
                                    de grupo desde el primer momento.
                                </p>

                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    En la guía del Taller te contamos paso a
                                    paso{" "}
                                    <strong className="text-slate-200">
                                        qué se aprende el primer día
                                    </strong>{" "}
                                    y resolvemos las dudas habituales. Cuando lo
                                    tengas claro, reserva tu tutorial o
                                    particular; después podrás integrarte en
                                    principiante del bono con el mismo ritmo que
                                    el grupo.
                                </p>

                                <div className="mt-5 flex flex-wrap items-center gap-3">
                                    <Link
                                        href={route(
                                            "taller.show",
                                            "que-aprendere-en-mi-primera-clase-de-surf-y-guia-de-preguntas-frecuentes",
                                        )}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg transition hover:brightness-110"
                                    >
                                        <BookOpen className="h-4 w-4" />
                                        Qué se hace el primer día
                                    </Link>
                                    <Link
                                        href={route("academy.lessons.index")}
                                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/20"
                                    >
                                        Reservar primera clase o tutorial
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Por qué elegirnos */}
            <section className="border-t border-white/5 bg-[#0f5f74]/15 py-16">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="mb-10 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/80">
                            Por qué elegirnos
                        </p>
                        <h2 className="mt-2 text-3xl font-extrabold text-white">
                            Surf con garantías
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {VENTAJAS.map(({ icon: Icon, title, text }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                            >
                                <Icon className="mb-3 h-6 w-6 text-cyan-300" />
                                <h3 className="text-lg font-bold text-white">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                    {text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}
