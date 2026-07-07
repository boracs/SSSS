import { useState } from "react";
import { Link } from "@inertiajs/react";
import {
    ArrowRight,
    Banknote,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    ExternalLink,
    HandCoins,
    Lock,
    Mail,
    MessageCircle,
    Package,
    Phone,
    ShieldCheck,
    Sparkles,
    Sticker,
    Tag,
    Wrench,
} from "lucide-react";

const STEPS = [
    {
        step: 1,
        icon: ClipboardList,
        title: "Anota tu taquilla en la pizarra",
        body: "En el local hay una pizarra física. Si necesitas reparar alguna de tus tablas, escribe el número de taquilla que tienes asignado — el mismo sitio donde las guardas en el rack.",
        highlight: "Sin apps ni formularios. Solo la pizarra del club.",
    },
    {
        step: 2,
        icon: Tag,
        title: "Marca los toques con cinta azul",
        body: "Pon cinta azul en cada golpe o zona que quieras que repare Edy. Puedes marcar una tabla o varias: solo se recogen las que lleven la cinta puesta.",
        highlight: "La cinta azul es la señal para Edy.",
    },
    {
        step: 3,
        icon: Package,
        title: "Edy revisa la pizarra y recoge las tablas",
        body: "Cuando Edy Mulder pasa por el local, consulta la pizarra para ver qué taquillas tienen reparaciones pendientes. Va a cada taquilla, recoge las tablas con cinta azul y se las lleva al taller.",
        highlight: "Tú no mueves la tabla de un sitio a otro.",
    },
    {
        step: 4,
        icon: Wrench,
        title: "Reparación en taller",
        body: "Edy trabaja la tabla en su taller especializado. El plazo habitual es de una semana, aunque si puede antes te la devuelve antes.",
        highlight: "Proceso semanal y transparente.",
    },
    {
        step: 5,
        icon: Sticker,
        title: "Devolución con pegatina de precio",
        body: "La tabla vuelve a tu rack con una pegatina donde figura el importe de la reparación. La revisas en el local y, si todo está bien, pasas al pago.",
        highlight: "Precio claro antes de abonar.",
    },
    {
        step: 6,
        icon: HandCoins,
        title: "Pagas a Edy: Bizum o buzón",
        body: "Puedes hacer un Bizum a Edy o dejar el dinero en un sobre con tu nombre y número de taquilla dentro del buzón exclusivo para él, situado en el local.",
        highlight: "Tú validas el arreglo; Edy cobra directamente.",
    },
];

const CLIENT_CHECKLIST = [
    "Escribir tu número de taquilla en la pizarra del local",
    "Poner cinta azul en los toques que quieras reparar",
    "Dejar la tabla en tu rack / taquilla como siempre",
    "Revisar la tabla cuando vuelva con la pegatina de precio",
    "Pagar por Bizum o en el buzón de Edy",
];

const EDY_CHECKLIST = [
    "Consultar la pizarra de reparaciones",
    "Recoger solo las tablas con cinta azul",
    "Reparar en taller y devolver al rack",
    "Colocar pegatina con el precio de la reparación",
];

function StepCard({ step, icon: Icon, title, body, highlight, isLast }) {
    return (
        <div className="relative flex gap-4 sm:gap-6">
            {!isLast ? (
                <div
                    className="absolute left-[1.15rem] top-12 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-cyan-400/50 to-cyan-400/10 sm:block"
                    aria-hidden
                />
            ) : null}
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-500/15 text-sm font-bold text-cyan-200 ring-4 ring-slate-950 sm:h-10 sm:w-10">
                {step}
            </div>
            <article className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-400/25">
                    <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                    <Sparkles className="h-3 w-3" />
                    {highlight}
                </p>
            </article>
        </div>
    );
}

export default function Servicios({ whatsappHelpUrl = null, edyContact = null }) {
    const [edyContactOpen, setEdyContactOpen] = useState(false);

    const edy = edyContact ?? {};
    const hasEdyDirectContact = Boolean(edy.phone || edy.email || edy.whatsappUrl);

    const whatsappRepairUrl = whatsappHelpUrl
        ? `${whatsappHelpUrl.split("?")[0]}?text=${encodeURIComponent(
              "Hola, tengo una duda sobre el servicio de reparación de tablas con Edy Mulder.",
          )}`
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2233] to-slate-950 text-white">
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-cyan-950/50">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.35),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    {hasEdyDirectContact ? (
                        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
                            <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                                ¿Dudas sobre si merece la pena reparar? ¿Crees que el arreglo saldría demasiado caro?
                                Consulta con Edy antes de marcar la tabla con cinta azul.
                            </p>
                            <button
                                type="button"
                                onClick={() => setEdyContactOpen((v) => !v)}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-amber-400"
                                aria-expanded={edyContactOpen}
                            >
                                Contactar con {edy.name || "Edy"}
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${edyContactOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {edyContactOpen ? (
                                <div className="mt-4 space-y-3 rounded-xl border border-amber-500/20 bg-slate-950/40 p-4">
                                    {edy.phone && edy.phoneTel ? (
                                        <a
                                            href={`tel:${edy.phoneTel}`}
                                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                                        >
                                            <Phone className="h-5 w-5 shrink-0 text-amber-300" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    Teléfono
                                                </p>
                                                <p className="text-sm font-semibold text-white">{edy.phone}</p>
                                            </div>
                                        </a>
                                    ) : null}
                                    {edy.email ? (
                                        <a
                                            href={`mailto:${edy.email}?subject=${encodeURIComponent("Consulta reparación de tabla")}`}
                                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                                        >
                                            <Mail className="h-5 w-5 shrink-0 text-cyan-300" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    Correo
                                                </p>
                                                <p className="text-sm font-semibold text-white">{edy.email}</p>
                                            </div>
                                        </a>
                                    ) : null}
                                    {edy.whatsappUrl ? (
                                        <a
                                            href={edy.whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 transition hover:bg-emerald-500/15"
                                        >
                                            <MessageCircle className="h-5 w-5 shrink-0 text-emerald-300" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    WhatsApp
                                                </p>
                                                <p className="text-sm font-semibold text-white">Escribir a {edy.name || "Edy"}</p>
                                            </div>
                                        </a>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Wrench className="h-3.5 w-3.5" />
                        Servicio para socios
                    </div>
                    <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Reparación de tablas con{" "}
                        <span className="bg-gradient-to-r from-cyan-300 to-emerald-300 bg-clip-text text-transparent">
                            Edy Mulder
                        </span>
                    </h1>
                    <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Un sistema sencillo pensado para que no tengas que cargar con tu tabla de un lado para otro.
                        Anotas tu taquilla, marcas los toques con cinta azul y Edy se encarga del resto: recogida,
                        reparación, devolución y cobro transparente.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <a
                            href="#como-funciona"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:brightness-110"
                        >
                            Ver cómo funciona
                            <ArrowRight className="h-4 w-4" />
                        </a>
                        <Link
                            href={route("nosotros") + "#taller-edy-mulder"}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15"
                        >
                            Instalaciones del club
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Valor */}
            <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 lg:col-span-2">
                        <div className="flex items-start gap-4">
                            <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-emerald-300" />
                            <div>
                                <h2 className="text-xl font-bold text-white">Te desentiendes de todo</h2>
                                <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                                    La tabla no sale del ecosistema del club hasta que Edy la recoge. Tú sigues surfeando
                                    con tu rutina normal: pizarra, cinta azul y listo. Edy la repara, la devuelve al rack
                                    y tú solo validas el trabajo y pagas. Sin desplazamientos extra ni coordinaciones
                                    complicadas.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3">
                            <Lock className="h-6 w-6 text-cyan-300" />
                            <h3 className="font-bold text-white">¿Quién puede usarlo?</h3>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400">
                            Servicio pensado para socios con taquilla en el club S4, donde guardan sus tablas en el rack
                            a pie de Zurriola.
                        </p>
                        <Link
                            href={route("taquillas.planes")}
                            className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 hover:underline"
                        >
                            Ver planes de taquilla
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Pasos */}
            <section id="como-funciona" className="scroll-mt-24 border-y border-white/5 bg-slate-950/40">
                <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300/80">Proceso paso a paso</p>
                        <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Cómo trabajamos con Edy</h2>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                            Todo el flujo pasa en el local y en el taller de Edy. La pizarra y la cinta azul son las
                            únicas señales que necesitas recordar.
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-12">
                        <div className="space-y-6">
                            {STEPS.map((item, index) => (
                                <StepCard key={item.step} {...item} isLast={index === STEPS.length - 1} />
                            ))}
                        </div>

                        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tú haces</h3>
                                <ul className="mt-4 space-y-3">
                                    {CLIENT_CHECKLIST.map((item) => (
                                        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300/80">Edy hace</h3>
                                <ul className="mt-4 space-y-3">
                                    {EDY_CHECKLIST.map((item) => (
                                        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            {/* Pago */}
            <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 sm:p-10">
                    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/90">Formas de pago</p>
                            <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                                Bizum o buzón exclusivo de Edy
                            </h2>
                            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                                Cuando recoges la tabla reparada, compruebas el arreglo en el local. Si estás conforme,
                                abonas el importe indicado en la pegatina mediante Bizum a Edy, o dejas el dinero en
                                efectivo dentro de un sobre con tu nombre y número de taquilla en el buzón que tiene
                                reservado en el local.
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
                                <MessageCircle className="h-6 w-6 text-emerald-300" />
                                <h3 className="mt-3 font-bold text-white">Bizum</h3>
                                <p className="mt-2 text-sm text-slate-400">
                                    Pago rápido directamente a Edy una vez validada la reparación.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
                                <Banknote className="h-6 w-6 text-amber-300" />
                                <h3 className="mt-3 font-bold text-white">Buzón en el local</h3>
                                <p className="mt-2 text-sm text-slate-400">
                                    Sobre con tu nombre, n.º de taquilla e importe. Buzón exclusivo para Edy.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
                <div className="rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-slate-900 p-8 text-center sm:p-10">
                    <h2 className="text-2xl font-extrabold text-white sm:text-3xl">¿Tienes dudas sobre una reparación?</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
                        Escríbenos o pásate por el local. Si aún no eres socio, te explicamos cómo conseguir taquilla y
                        acceder al servicio.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {whatsappRepairUrl ? (
                            <a
                                href={whatsappRepairUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
                            >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                            </a>
                        ) : null}
                        <Link
                            href={route("contacto")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/15"
                        >
                            Formulario de contacto
                        </Link>
                        <Link
                            href={route("nosotros")}
                            className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-6 py-2.5 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15"
                        >
                            Conocer el club
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
