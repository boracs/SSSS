import React from "react";
import { Link } from "@inertiajs/react";
import {
    MapPin,
    Clock,
    Users,
    UtensilsCrossed,
    ArrowRight,
    Compass,
    Waves,
    Fuel,
    Truck,
    Package,
    Navigation,
    Gauge,
    Route,
    ShieldCheck,
    Timer,
} from "lucide-react";

const HORARIO = "Salida excursión de surf · 4 horas · 09:00–13:00";

const PACKS = [
    {
        titulo: "País Vasco",
        subtitulo: "PACK 1 – PAÍS VASCO",
        descripcion:
            "Excursión de surf de 4 horas (09:00–13:00) por los mejores spots del País Vasco, saliendo desde Donostia.",
        tarifas: [
            { pax: "1 persona", precio: "120,00 €" },
            { pax: "2 personas", precio: "80,00 €/pax" },
            { pax: "3 personas", precio: "60,00 €/pax" },
            { pax: "4 personas", precio: "50,00 €/pax" },
        ],
        acento: "from-teal-400 to-cyan-400",
        ring: "ring-teal-400/30",
        chip: "bg-teal-500/15 text-teal-200 ring-teal-400/30",
        glow: "hover:border-teal-400/40",
    },
    {
        titulo: "Côte Basque",
        subtitulo: "PACK 2 – CÔTE BASQUE",
        descripcion:
            "Excursión de surf de 4 horas (09:00–13:00) en la Costa Vasca francesa, a poca distancia desde Guipúzcoa.",
        tarifas: [
            { pax: "1 persona", precio: "140,00 €" },
            { pax: "2 personas", precio: "100,00 €/pax" },
            { pax: "3 personas", precio: "80,00 €/pax" },
            { pax: "4 personas", precio: "60,00 €/pax" },
        ],
        acento: "from-violet-400 to-fuchsia-400",
        ring: "ring-violet-400/30",
        chip: "bg-violet-500/15 text-violet-200 ring-violet-400/30",
        glow: "hover:border-violet-400/40",
        destacado: true,
    },
    {
        titulo: "Las Landas",
        subtitulo: "PACK 3 – LAS LANDAS",
        descripcion:
            "Excursión de surf de 4 horas (09:00–13:00) en las playas de Las Landas (Aquitania), con salida desde Guipúzcoa.",
        tarifas: [
            { pax: "1 persona", precio: "200,00 €" },
            { pax: "2 personas", precio: "150,00 €/pax" },
            { pax: "3 personas", precio: "100,00 €/pax" },
            { pax: "4 personas", precio: "75,00 €/pax" },
        ],
        acento: "from-orange-400 to-amber-400",
        ring: "ring-orange-400/30",
        chip: "bg-orange-500/15 text-orange-200 ring-orange-400/30",
        glow: "hover:border-orange-400/40",
    },
];

const MENU = [
    { nombre: "Menú del día", precio: "30,00 €/pax" },
    { nombre: "Menú sidrería", precio: "50,00 €/pax" },
];

const AHORROS = [
    {
        icon: Fuel,
        titulo: "Sin repostar ni calcular rutas",
        texto: "Olvídate del combustible, peajes y paradas en gasolineras. Nosotros nos encargamos del trayecto de ida y vuelta.",
    },
    {
        icon: Truck,
        titulo: "Sin alquilar furgoneta",
        texto: "No necesitas reservar ni conducir una furgoneta para llevar tablas y wetsuits. Viajas cómodo y sin estrés logístico.",
    },
    {
        icon: Package,
        titulo: "Material incluido",
        texto: "Tabla y neopreno adaptados a tu nivel van en el pack. Te ahorras el alquiler por separado y la duda de si el material encaja contigo.",
    },
    {
        icon: Navigation,
        titulo: "Al spot adecuado para ti",
        texto: "Te llevamos directamente a un buen punto según tu nivel. Sin dar vueltas, consultar apps a ciegas ni acabar en una playa que no encaja.",
    },
    {
        icon: Gauge,
        titulo: "Marea y condiciones al día",
        texto: "Elegimos el mejor momento de marea y las condiciones del día. Aprovechas la ventana buena en lugar de perder horas probando a ciegas.",
    },
    {
        icon: Route,
        titulo: "Sin carreteras desconocidas",
        texto: "Evitas conducir por tramos que no conoces, aparcar mal o perder tiempo con el GPS. Llegas relajado y listo para surfear.",
    },
    {
        icon: ShieldCheck,
        titulo: "Monitor y seguridad",
        texto: "Vas acompañado de un profesional que conoce la zona, el spot y los riesgos del día. Más tranquilidad que ir por tu cuenta.",
    },
    {
        icon: Timer,
        titulo: "Tiempo de surf, no de logística",
        texto: "Las 4 horas son para surfear y disfrutar. No para organizar transporte, cargar material ni improvisar el plan sobre la marcha.",
    },
];

const PackCard = ({ pack }) => (
    <div
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 ${pack.glow}`}
    >
        <div className={`h-1.5 w-full bg-gradient-to-r ${pack.acento}`} />
        <div className="flex flex-1 flex-col p-6">
            {pack.destacado && (
                <span className="mb-3 inline-flex w-fit items-center rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
                    Más elegido
                </span>
            )}
            <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                    {pack.subtitulo}
                </span>
            </div>
            <h3 className="mt-1 text-2xl font-extrabold text-white">
                {pack.titulo}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {pack.descripcion}
            </p>

            <p className="mt-3 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-xs font-medium text-slate-300">
                {HORARIO}
            </p>

            <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    09:00 – 13:00
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    1–4 personas
                </span>
            </div>

            <div className="mt-5 space-y-1.5 rounded-xl border border-white/10 bg-slate-900/40 p-4">
                {pack.tarifas.map((t) => (
                    <div
                        key={t.pax}
                        className="flex items-center justify-between text-sm"
                    >
                        <span className="text-slate-400">{t.pax}</span>
                        <span className="font-bold text-white">{t.precio}</span>
                    </div>
                ))}
            </div>

            <Link
                href={route("contacto")}
                className={`mt-6 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold ring-1 transition ${pack.chip}`}
            >
                Reservar este trip
                <ArrowRight className="h-3.5 w-3.5" />
            </Link>
        </div>
    </div>
);

export default function ServiciosSurfTrips() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#072a2a] to-slate-950 text-white">
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-teal-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(13,148,136,0.35),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/25 bg-teal-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-teal-200">
                        <Compass className="h-3.5 w-3.5" />
                        SurfTrips premium S4
                    </div>
                    <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Surf trips desde{" "}
                        <span className="bg-gradient-to-r from-teal-300 to-cyan-300 bg-clip-text text-transparent">
                            Guipúzcoa
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Salidas en excursión de surf de 4 horas (09:00–13:00)
                        hacia los mejores spots del País Vasco, la Côte Basque y
                        Las Landas. Desde Donostia, persigues la ola del día con
                        monitor y opción de menú gastronómico al terminar.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={route("contacto")}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:brightness-110"
                        >
                            <Waves className="h-4 w-4" />
                            Reservar mi trip
                        </Link>
                        <Link
                            href={route("servicios.surf")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                        >
                            Ver clases de surf
                        </Link>
                    </div>
                </div>
            </section>

            {/* Packs */}
            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="mb-10 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">
                        Surf trips
                    </p>
                    <h2 className="mt-2 text-3xl font-extrabold text-white">
                        Tres destinos, un mismo horario
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
                        Todas las salidas son excursiones de surf de 4 horas,
                        de 09:00 a 13:00. Tarifas según el número de
                        participantes (máximo 4 por grupo).
                    </p>
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {PACKS.map((pack) => (
                        <PackCard key={pack.titulo} pack={pack} />
                    ))}
                </div>
            </section>

            {/* Lo que te ahorras */}
            <section className="border-t border-white/5 bg-gradient-to-b from-teal-950/30 via-slate-950/80 to-slate-950 py-16">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="mb-10 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">
                            Valor del trip
                        </p>
                        <h2 className="mt-2 text-3xl font-extrabold text-white">
                            Lo que te ahorras al reservar con nosotros
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                            Un surf trip con S4 no es solo una salida: es dejar fuera todo lo que suele
                            complicar el día — transporte, material, spot, marea y planificación — para
                            que tú solo te centres en coger olas.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {AHORROS.map((item) => (
                            <article
                                key={item.titulo}
                                className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-teal-400/30 hover:bg-teal-500/5"
                            >
                                <div className="mb-3 inline-flex rounded-xl bg-teal-500/15 p-2.5 ring-1 ring-teal-400/25 transition group-hover:bg-teal-500/20">
                                    <item.icon className="h-5 w-5 text-teal-300" />
                                </div>
                                <h3 className="text-sm font-bold text-white">{item.titulo}</h3>
                                <p className="mt-2 text-xs leading-relaxed text-slate-400">{item.texto}</p>
                            </article>
                        ))}
                    </div>

                    <p className="mx-auto mt-8 max-w-2xl text-center text-xs text-slate-500">
                        Cuando sumas combustible, furgoneta, alquiler de material y horas perdidas buscando
                        el sitio, un trip organizado suele salir más rentable — y mucho más disfrutable.
                    </p>
                </div>
            </section>

            {/* Opción menú */}
            <section className="border-t border-white/5 bg-[#0f5f74]/20 py-14">
                <div className="mx-auto max-w-3xl px-4 sm:px-6">
                    <div className="text-center">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-200">
                            <UtensilsCrossed className="h-3.5 w-3.5" />
                            Opción con menú
                        </div>
                        <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                            Comida de 2 horas tras la sesión
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
                            Si quieres contratar las clases con menú de comida de
                            2 horas, te ofrecemos la opción de comidas para
                            cerrar el día después del surf:
                        </p>
                    </div>
                    <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {MENU.map((m) => (
                            <div
                                key={m.nombre}
                                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm"
                            >
                                <span className="text-sm font-semibold text-white">
                                    {m.nombre}
                                </span>
                                <span className="text-lg font-extrabold text-amber-300">
                                    {m.precio}
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 text-center text-xs text-slate-500">
                        El menú es un extra opcional que se contrata junto con
                        cualquiera de los tres packs de surf trip.
                    </p>
                </div>
            </section>
        </div>
    );
}
