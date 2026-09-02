import { useState } from "react";
import PageShell from "@/layouts/PageShell";
import { Link } from "@inertiajs/react";
import SeoHead from "../components/seo/SeoHead";
import ContactBlock from "../components/ContactBlock";
import RepairStepCard from "../components/RepairStepCard";
import RepairClubReviews from "../components/RepairClubReviews";
import S4Button from "@/components/S4Button";
import {
    ArrowRight,
    Banknote,
    CheckCircle2,
    ClipboardList,
    HandCoins,
    Lock,
    MessageCircle,
    Package,
    ShieldCheck,
    Sticker,
    Tag,
    Wrench,
} from "lucide-react";

const ACCENT_MD =
    "bg-gradient-to-r from-cyan-500 to-emerald-500 font-bold text-slate-950 shadow-md hover:brightness-110";
const OUTLINE_GLASS_MD =
    "border border-white/20 bg-white/10 font-semibold text-white hover:bg-white/15";
const WHATSAPP_SOLID =
    "bg-emerald-600 font-bold text-white from-emerald-600 to-emerald-600 hover:bg-emerald-500 hover:brightness-100";
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

export default function Servicios({ whatsappHelpUrl = null, edyContact = null, seo = null }) {
    const [edyContactOpen, setEdyContactOpen] = useState(false);

    const edy = edyContact ?? {};
    const hasEdyDirectContact = Boolean(edy.phone || edy.email || edy.whatsappUrl);

    // WhatsApp del reparador si existe; si no, la escuela con el texto de duda de tablas.
    const whatsappRepairUrl = edy.whatsappUrl
        ? edy.whatsappUrl
        : whatsappHelpUrl
          ? (() => {
                const url = new URL(whatsappHelpUrl);
                url.searchParams.set(
                    "text",
                    "Hola, tengo una duda sobre el servicio de reparación de tablas con Edy Mulder.",
                );
                return url.toString();
            })()
          : null;
    const whatsappRepairLabel = edy.whatsappUrl ? "WhatsApp Edy" : "WhatsApp";

    return (
        <PageShell variant="dark" withGradient>
            <SeoHead seo={seo} />
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-cyan-950/50">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.35),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Wrench className="h-3.5 w-3.5" aria-hidden />
                        Servicio para socios
                    </div>
                    <h1 className="max-w-4xl font-heading text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
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
                    <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-400">
                        ¿Dudas de si merece la pena? Pregunta a Edy antes de marcar la cinta azul. Los canales están al
                        final de la página.
                    </p>
                    <div className="mt-8 flex flex-wrap items-center gap-3">
                        <S4Button href="#como-funciona" variant="accent" className={ACCENT_MD}>
                            Así se deja la tabla
                            <ArrowRight className="h-4 w-4" aria-hidden />
                        </S4Button>
                        <S4Button href={route("taquillas.planes")} variant="secondary" className={OUTLINE_GLASS_MD}>
                            Ver planes de taquilla
                        </S4Button>
                    </div>
                    <div className="mt-5">
                        <Link
                            href={route("servicios.reparacionNeoprenos")}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200 hover:underline"
                        >
                            También reparamos neoprenos
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Valor */}
            <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-6 lg:col-span-2">
                        <div className="flex items-start gap-4">
                            <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-emerald-300" aria-hidden />
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
                            <Lock className="h-6 w-6 text-cyan-300" aria-hidden />
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
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                        </Link>
                    </div>
                </div>
            </section>

            <RepairClubReviews accent="cyan" headingId="tablas-google-reviews" />

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
                        <p className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                            <Link
                                href={`${route("nosotros")}#taller-edy-mulder`}
                                className="text-cyan-300/90 transition hover:text-cyan-200 hover:underline"
                            >
                                Instalaciones del club
                            </Link>
                            <Link
                                href={route("taller.show", "guia-practica-como-reparar-una-tabla-de-surf")}
                                className="text-cyan-300/90 transition hover:text-cyan-200 hover:underline"
                            >
                                Toques pequeños en casa
                            </Link>
                        </p>
                    </div>

                    <div className="grid gap-8 lg:grid-cols-[1fr_320px] lg:gap-12">
                        <ol className="space-y-6">
                            {STEPS.map((item, index) => (
                                <RepairStepCard
                                    key={item.step}
                                    {...item}
                                    accent="cyan"
                                    isLast={index === STEPS.length - 1}
                                />
                            ))}
                        </ol>

                        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Tú haces</h3>
                                <ul className="mt-4 space-y-3">
                                    {CLIENT_CHECKLIST.map((item) => (
                                        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
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
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden />
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
                                <MessageCircle className="h-6 w-6 text-emerald-300" aria-hidden />
                                <h3 className="mt-3 font-bold text-white">Bizum</h3>
                                <p className="mt-2 text-sm text-slate-400">
                                    Pago rápido directamente a Edy una vez validada la reparación.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
                                <Banknote className="h-6 w-6 text-amber-300" aria-hidden />
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
                    {hasEdyDirectContact ? (
                        <div className="mx-auto mt-6 max-w-md text-left">
                            <ContactBlock
                                contact={edy}
                                open={edyContactOpen}
                                onToggle={() => setEdyContactOpen((v) => !v)}
                                mailSubject="Consulta reparación de tabla"
                                mailIconClassName="text-cyan-300"
                                fallbackName="Edy"
                            />
                        </div>
                    ) : null}
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {whatsappRepairUrl ? (
                            <S4Button
                                href={whatsappRepairUrl}
                                external
                                target="_blank"
                                rel="noopener noreferrer"
                                variant="accent"
                                className={WHATSAPP_SOLID}
                            >
                                <MessageCircle className="h-4 w-4" aria-hidden />
                                {whatsappRepairLabel}
                            </S4Button>
                        ) : null}
                        <S4Button
                            href={route("contacto")}
                            variant="secondary"
                            className={OUTLINE_GLASS_MD}
                        >
                            Formulario de contacto
                        </S4Button>
                    </div>
                </div>
            </section>
        </PageShell>
    );
}
