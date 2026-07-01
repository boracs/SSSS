import React, { useState } from "react";
import { Link } from "@inertiajs/react";
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
    ChevronDown,
    GraduationCap,
    Target,
    Flame,
} from "lucide-react";

const PARTICULARES = [
    { pax: "1 persona", precio: "80 €", nota: "total" },
    { pax: "2 personas", precio: "55 €", nota: "por persona" },
    { pax: "3 personas", precio: "40 €", nota: "por persona" },
    { pax: "4 personas", precio: "30 €", nota: "por persona" },
];

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
    Iniciación: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
    Intermedio: "bg-cyan-500/15 text-cyan-200 ring-cyan-400/30",
    Avanzado: "bg-orange-500/15 text-orange-200 ring-orange-400/30",
};

const NIVELES_CLASE = [
    {
        nivel: "Iniciación",
        icon: GraduationCap,
        olas: "Espuma y olas pequeñas (rodilla a cadera)",
        resumen: "Primeros pasos en el agua. Ideal tras el tutorial de primer día o una particular inicial.",
        requisitos: [
            "No es necesario haber surfeado antes (pero sí haber hecho primer día o equivalente)",
            "Objetivo: puesta en pie, bajar la ola de frente y coger espumas con ayuda",
            "Saber escuchar indicaciones del monitor y moverse con ayuda en la orilla",
            "Condiciones suaves: zona controlada, sin presión de pico ni corrientes fuertes",
        ],
    },
    {
        nivel: "Intermedio",
        icon: Target,
        olas: "Hasta hombro, olas con algo de fuerza",
        resumen: "Ya dominas la base. Entras al agua sin que el monitor repita conceptos de iniciación.",
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
        resumen: "Autonomía en el agua. El monitor afina técnica y lectura de la ola, no enseña desde cero.",
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
    "Cómo coger la ola (espuma) y los primeros intentos de puesta en pie",
    "Puesta en práctica guiada en orilla y espuma, paso a paso",
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
        detalle: "Excepción: nadie más se apuntó — sesión como particular a precio superoferta",
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

const BonoCard = ({ bono }) => {
    const Icon = bono.icon;
    return (
        <div
            className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${
                bono.destacado
                    ? "border-emerald-400/40 bg-gradient-to-b from-emerald-500/10 to-white/5 shadow-lg shadow-emerald-950/30"
                    : "border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-white/10"
            }`}
        >
            {bono.destacado && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
                    Mejor precio
                </span>
            )}
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/30">
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
                <Link
                    href={route("contacto")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-400/30 transition hover:bg-cyan-500/25"
                >
                    Reservar
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
};

const InvitadoAmigoCard = () => {
    const [verMas, setVerMas] = useState(false);

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
                            Si tienes bono y un amigo quiere unirse
                            puntualmente a una única sesión, puede apuntarse
                            como invitado por{" "}
                            <strong className="text-cyan-200">35 €</strong>.
                            Tarifa especial de amigo, válida para esa clase
                            concreta, sin necesidad de comprar bono completo.
                        </p>

                        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3">
                            <p className="flex items-start gap-2 text-sm leading-relaxed text-amber-100">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                                <span>
                                    <strong className="text-amber-200">
                                        Pero cuidado:
                                    </strong>{" "}
                                    tu amigo debe tener nociones básicas de surf
                                    (remar, moverse en el agua y levantarse). Si
                                    nunca ha surfeado o elige una franja de nivel
                                    superior al suyo, el monitor podrá derivarlo a
                                    la arena o a la orilla para que intente coger
                                    olas pequeñas por su cuenta —como si hubiese
                                    alquilado material— mientras se enfoca en el
                                    resto del grupo. No puede dedicarle la
                                    atención que requiere un principiante ni
                                    duplicarse; en ese caso, la responsabilidad
                                    recae en el alumno por haber escogido un
                                    nivel no adecuado.
                                </span>
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setVerMas((v) => !v)}
                            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
                            aria-expanded={verMas}
                        >
                            {verMas ? "Ver menos" : "Ver más"}
                            <ChevronDown
                                className={`h-4 w-4 transition-transform ${verMas ? "rotate-180" : ""}`}
                            />
                        </button>

                        {verMas ? (
                            <div
                                id="invitado-amigo-nivel"
                                className="mt-3 rounded-xl border border-white/10 bg-slate-900/50 p-4 text-sm leading-relaxed text-slate-300"
                            >
                                <p>
                                    Si un alumno se apunta a una franja de nivel
                                    medio o avanzado y el monitor detecta que no
                                    tiene el nivel adecuado, podrá orientarle
                                    para que intente coger{" "}
                                    <strong className="text-white">
                                        espumas más abajo
                                    </strong>{" "}
                                    o, si la situación lo requiere por seguridad,
                                    trabajar desde{" "}
                                    <strong className="text-white">
                                        la orilla o la arena
                                    </strong>
                                    .
                                </p>
                                <p className="mt-3 text-slate-400">
                                    En ese caso, es responsabilidad del alumno
                                    haber elegido una clase por encima de su
                                    nivel real. Si nunca ha surfeado, lo correcto
                                    es empezar por{" "}
                                    <strong className="text-slate-200">
                                        iniciación
                                    </strong>
                                    , no por una sesión de nivel superior.
                                </p>
                            </div>
                        ) : null}
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

export default function ServiciosClasesDeSurf() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2a33] to-slate-950 text-white">
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-cyan-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.45),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Waves className="h-3.5 w-3.5" />
                        Academia de surf S4
                    </div>
                    <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Clases particulares y bonos de surf en la{" "}
                        <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                            Zurriola
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Elige la atención total de una clase particular o la
                        libertad de nuestros bonos: surfeas cuando mejor están las
                        condiciones, con monitor certificado y todo el equipo
                        incluido.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={route("contacto")}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                        >
                            <Waves className="h-4 w-4" />
                            Reservar mi plaza
                        </Link>
                        <Link
                            href={route("servicios.videograbaciones")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                        >
                            Ver videograbaciones
                        </Link>
                    </div>
                </div>
            </section>

            {/* Clases particulares */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                            Clases particulares
                        </p>
                        <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                            Atención 100% personalizada
                        </h2>
                        <p className="mt-4 leading-relaxed text-slate-300">
                            La opción ideal si buscas progresar rápido o prefieres
                            una experiencia a medida. Sesiones de{" "}
                            <strong className="text-white">hora y media</strong> con
                            tabla y neopreno incluidos. El precio por persona baja
                            cuanto mayor es el grupo.
                        </p>
                        <Link
                            href={route("contacto")}
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-cyan-500/15 px-5 py-2.5 text-sm font-semibold text-cyan-200 ring-1 ring-cyan-400/30 transition hover:bg-cyan-500/25"
                        >
                            Reservar particular
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                        <div className="space-y-2">
                            {PARTICULARES.map((p) => (
                                <div
                                    key={p.pax}
                                    className="flex items-center justify-between rounded-xl bg-slate-900/40 px-4 py-3"
                                >
                                    <span className="flex items-center gap-2 text-sm font-medium text-slate-300">
                                        <Users className="h-4 w-4 text-slate-500" />
                                        {p.pax}
                                    </span>
                                    <span className="text-right">
                                        <span className="text-xl font-extrabold text-white">
                                            {p.precio}
                                        </span>
                                        <span className="ml-1 text-xs text-slate-500">
                                            {p.nota}
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                        <p className="mt-4 text-xs text-slate-500">
                            Todas las sesiones duran 1,5 h e incluyen tabla y
                            neopreno.
                        </p>
                    </div>
                </div>
            </section>

            {/* Bonos */}
            <section className="border-y border-white/5 bg-[#0f5f74]/15 py-16">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="mb-10 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/80">
                            Nuestros bonos
                        </p>
                        <h2 className="mt-2 text-3xl font-extrabold text-white">
                            Surfea con libertad y al mejor precio
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
                            Compra tu bono una vez y úsalo durante la semana cuando
                            las condiciones acompañen. Tú eliges cuándo entras al
                            agua.
                        </p>
                    </div>

                    <div className="mb-10 overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-cyan-950/30">
                        <img
                            src="/img/surf-grupo-bonos.png"
                            alt="Grupo de alumnos con monitor en la playa durante una clase de surf en grupo"
                            className="h-auto w-full max-h-[22rem] object-cover object-center"
                        />
                        <p className="border-t border-white/10 bg-slate-900/60 px-4 py-3 text-center text-xs text-slate-400">
                            Clases en grupo con monitor certificado — la dinámica
                            de nuestros bonos en la Zurriola.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        {BONOS.map((bono) => (
                            <BonoCard key={bono.titulo} bono={bono} />
                        ))}
                    </div>

                    {/* Invita a un amigo */}
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
                        domingo en el grupo de WhatsApp y depende de la marea y el
                        oleaje de la semana.
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
                                Con el bono <strong className="text-white">no reservas una particular</strong>.
                                Te apuntas a una franja de grupo abierta a más alumnos. Si en esa franja
                                coincidís varios, cada uno consume{" "}
                                <strong className="text-cyan-200">1 clase del bono</strong>.
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
                                <strong className="text-white">Ejemplo:</strong> el bono de 10 clases
                                cuesta <strong className="text-emerald-300">250 €</strong> — cada sesión
                                de grupo equivale a <strong className="text-emerald-300">25 €</strong>.
                                Si te apuntas a una franja y{" "}
                                <strong className="text-white">nadie más se apunta</strong>, para que no
                                te quedes sin surfear te damos la sesión igualmente, pero consume{" "}
                                <strong className="text-amber-200">2 clases del bono (50 €)</strong>:
                                es una atención casi particular a precio de superoferta, porque en ese
                                caso concreto no hubo grupo.
                            </p>
                            <p className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-slate-200">
                                <strong className="text-rose-200">Importante:</strong> no está permitido
                                usar el bono para forzar una particular — por ejemplo, apuntarse a una
                                franja esperando que nadie más entre. Si quieres clase particular, debes
                                solicitarla <strong className="text-white">al margen del bono</strong>,
                                con la tarifa de particulares.
                            </p>
                        </div>

                        <p className="mt-4 text-xs text-slate-500">
                            Máximo 6 alumnos por monitor. Con más de 6, añadimos un segundo monitor
                            y se abren dos picos en el agua.
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
                                    Si en una franja coincidís más de 6 personas,
                                    añadimos un segundo monitor. Eso nos permite
                                    abrir dos picos en el agua, así puedes elegir
                                    entre olas más grandes o más pequeñas según tu
                                    nivel y preferencia.
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
                                            Fotógrafo de regalo (extra ocasional)
                                        </h4>
                                        <p className="mt-1 text-sm leading-relaxed text-slate-400">
                                            A partir de 4 personas, y solo en los
                                            bonos, procuramos poner fotógrafo sin
                                            coste como detalle. No es algo
                                            garantizado ni habitual: es un extra
                                            que ofrecemos cuando podemos.
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
                                <strong className="text-white">empieza aquí</strong>. Recomendamos que tu
                                primera experiencia sea una{" "}
                                <strong className="text-amber-100">particular</strong> o una{" "}
                                <strong className="text-amber-100">grupal de primer día</strong> donde todos
                                los alumnos parten de cero — así la charla del monitor es útil para todos y
                                nadie pierde tiempo escuchando lo mismo por segunda vez.
                            </p>
                            <p className="mt-3 text-sm leading-relaxed text-slate-200">
                                Es una sesión con{" "}
                                <strong className="text-white">parte teórica en la arena</strong> y práctica
                                inmediata: cómo remar, girar la tabla, tumbarse, coger la ola en espuma y
                                lo básico del surf antes de pasarlo al agua con el monitor.
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
                                href={route("contacto")}
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
                            Apúntate a la franja que corresponda a tu experiencia real. Así la sesión
                            rinde para ti y para el resto del grupo.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {NIVELES_CLASE.map(({ nivel, icon: Icon, olas, resumen, requisitos }) => (
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
                                <p className="text-xs font-semibold text-cyan-200/90">{olas}</p>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{resumen}</p>
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
                        ))}
                    </div>
                </div>

                {/* Nivel, seguridad e invitados */}
                <div className="mt-10 space-y-6">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8">
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
                                    o, si la situación lo requiere por seguridad,
                                    trabajar desde{" "}
                                    <strong className="text-white">
                                        la orilla o la arena
                                    </strong>
                                    .
                                </p>
                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    En ese caso, es responsabilidad del alumno
                                    haber elegido una clase por encima de su
                                    nivel real. Si nunca ha surfeado, lo correcto
                                    es empezar por iniciación, no por una sesión
                                    de nivel superior.
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
                                    Tutorial de primer día (sin experiencia previa)
                                </h3>

                                <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
                                    <p className="text-sm leading-relaxed text-emerald-100">
                                        <strong className="text-white">Recomendación S4:</strong> si nunca
                                        has surfeado, tu primera clase debería ser una{" "}
                                        <strong className="text-emerald-200">particular</strong> o, si
                                        prefieres grupo, una sesión{" "}
                                        <strong className="text-emerald-200">grupal de primer día</strong>{" "}
                                        en la que todos los alumnos empiezan desde cero.
                                    </p>
                                </div>

                                <p className="mt-4 text-sm leading-relaxed text-slate-300">
                                    En el tutorial básico de primer día explicamos las nociones
                                    esenciales antes de entrar al agua:{" "}
                                    <strong className="text-white">seguridad, postura, remada</strong> y
                                    primeros intentos en espuma. Es la base para unirte después a las
                                    clases de iniciación del bono con confianza.
                                </p>

                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    En las clases de{" "}
                                    <strong className="text-slate-200">nivel iniciación</strong> trabajamos
                                    olas pequeñas (rodilla a cadera) con objetivos como la puesta en pie,
                                    bajar la ola de lado y empezar a coger espumas por tu cuenta.
                                </p>

                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    Si un principiante entra directamente a una clase mixta, el monitor
                                    suele dedicar los primeros minutos a conceptos de iniciación que el
                                    resto del grupo{" "}
                                    <strong className="text-slate-200">
                                        ya escuchó en su primera sesión
                                    </strong>{" "}
                                    (normalmente orientada a primer día). Eso resta tiempo de surf a quien
                                    ya domina esas bases. Por eso preferimos que la charla inicial sea{" "}
                                    <strong className="text-white">útil para todos a la vez</strong>:
                                    todos en la misma situación, sin repetir explicaciones ni perder
                                    minutos de clase escuchando algo por segunda vez.
                                </p>

                                <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                    Una vez completado el tutorial o tu primera particular, podrás{" "}
                                    <strong className="text-slate-200">
                                        integrarte en las clases de iniciación
                                    </strong>{" "}
                                    del bono cuando estés preparado. Así la sesión rinde desde el primer
                                    minuto y todo el mundo avanza al mismo ritmo.
                                </p>

                                <Link
                                    href={route("contacto")}
                                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-5 py-2.5 text-sm font-semibold text-emerald-200 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500/25"
                                >
                                    Reservar primera clase o tutorial
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </Link>
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
