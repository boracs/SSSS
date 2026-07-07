import { useState } from "react";
import { Link } from "@inertiajs/react";
import {
    ArrowRight,
    Banknote,
    CheckCircle2,
    ChevronDown,
    ClipboardList,
    ExternalLink,
    FilePen,
    Mail,
    MapPin,
    MessageCircle,
    Phone,
    Pin,
    ShieldCheck,
    Sparkles,
    Sticker,
    Shirt,
} from "lucide-react";

const STEPS = [
    {
        step: 1,
        icon: Pin,
        title: "Perchas exclusivas de reparación",
        body: "En el local hay perchas de reparación con un color y unas características únicas para distinguirlas del resto. Los trajes pendientes se cuelgan en una zona exclusiva preparada para ello.",
        highlight: "No uses perchas normales del secadero.",
    },
    {
        step: 2,
        icon: ClipboardList,
        title: "Anota el número de percha en la pizarra",
        body: "Dejamos una pizarra de trajes de surf. Cuando quieras reparar un neopreno, cuelga el traje en una percha de reparación y escribe su número en la pizarra.",
        highlight: "Sin apps: pizarra + percha identificable.",
    },
    {
        step: 3,
        icon: FilePen,
        title: "Marca las zonas a reparar en el traje",
        body: "En el mismo traje deja una hoja descriptiva o un dibujo sencillo con una X en cada zona que quieras que repare Willy. Cuanto más claro, menos malentendidos.",
        highlight: "Indica costuras, desgarros, cremalleras, etc.",
    },
    {
        step: 4,
        icon: MessageCircle,
        title: "Aclara dudas y límite de precio",
        body: "Si tienes cualquier duda, o quieres dejar por escrito que repare solo si no supera cierto importe, indícalo antes de que Willy recoja el traje. Así evitamos sorpresas cuando vaya a repararlo.",
        highlight: "Mejor prevenir que discutir después.",
    },
    {
        step: 5,
        icon: MapPin,
        title: "Willy recoge en sus viajes a Zarautz",
        body: "Willy, administrador y socio de S4, suele desplazarse a Zarautz dos o tres veces al mes. Revisa la pizarra, recoge los trajes señalados y se los lleva a reparar.",
        highlight: "Tú no mueves el neopreno fuera del club.",
    },
    {
        step: 6,
        icon: Sticker,
        title: "Devolución con el precio en el traje",
        body: "Una vez reparado, Willy trae el traje de vuelta y lo deja otra vez en su sitio, con el importe indicado de forma visible.",
        highlight: "Revisas el arreglo antes de pagar.",
    },
    {
        step: 7,
        icon: Banknote,
        title: "Pagas en metálico en el buzón de Willy",
        body: "Cuando estés conforme con la reparación, abona el importe en efectivo en el buzón de pagos correspondiente a Willy, situado en el local.",
        highlight: "Pago directo tras validar el trabajo.",
    },
];

const CLIENT_CHECKLIST = [
    "Colgar el traje en una percha exclusiva de reparación",
    "Anotar el número de percha en la pizarra de trajes",
    "Dejar hoja o dibujo con X en las zonas a reparar",
    "Indicar si hay tope de precio o condiciones especiales",
    "Revisar el traje al volver y pagar en el buzón de Willy",
];

const WILLY_CHECKLIST = [
    "Consultar la pizarra de trajes pendientes",
    "Recoger solo perchas de reparación señaladas",
    "Reparar respetando las indicaciones y límites de precio",
    "Devolver el traje a su zona con el importe visible",
];

function StepCard({ step, icon: Icon, title, body, highlight, isLast }) {
    return (
        <div className="relative flex gap-4 sm:gap-6">
            {!isLast ? (
                <div
                    className="absolute left-[1.15rem] top-12 hidden h-[calc(100%-0.5rem)] w-px bg-gradient-to-b from-violet-400/50 to-violet-400/10 sm:block"
                    aria-hidden
                />
            ) : null}
            <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-violet-400/40 bg-violet-500/15 text-sm font-bold text-violet-200 ring-4 ring-slate-950 sm:h-10 sm:w-10">
                {step}
            </div>
            <article className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300 ring-1 ring-violet-400/25">
                    <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                    <Sparkles className="h-3 w-3" />
                    {highlight}
                </p>
            </article>
        </div>
    );
}

export default function ServiciosReparacionNeoprenos({ whatsappHelpUrl = null, willyContact = null }) {
    const [willyContactOpen, setWillyContactOpen] = useState(false);

    const willy = willyContact ?? {};
    const hasWillyDirectContact = Boolean(willy.phone || willy.email || willy.whatsappUrl);

    const whatsappSchoolUrl = whatsappHelpUrl
        ? `${whatsappHelpUrl.split("?")[0]}?text=${encodeURIComponent(
              "Hola, tengo una duda sobre el servicio de reparación de neoprenos del club.",
          )}`
        : null;

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#1a0f2e] to-slate-950 text-white">
            <section className="relative overflow-hidden border-b border-violet-950/50">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(109,40,217,0.28),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    {hasWillyDirectContact ? (
                        <div className="mb-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5">
                            <p className="text-sm leading-relaxed text-slate-200 sm:text-base">
                                ¿Dudas sobre si merece la pena reparar? ¿Quieres fijar un tope de precio antes de que
                                Willy recoja el traje? Escríbele y evita malentendidos.
                            </p>
                            <button
                                type="button"
                                onClick={() => setWillyContactOpen((v) => !v)}
                                className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-amber-400"
                                aria-expanded={willyContactOpen}
                            >
                                Contactar con {willy.name || "Willy"}
                                <ChevronDown
                                    className={`h-4 w-4 transition-transform ${willyContactOpen ? "rotate-180" : ""}`}
                                />
                            </button>
                            {willyContactOpen ? (
                                <div className="mt-4 space-y-3 rounded-xl border border-amber-500/20 bg-slate-950/40 p-4">
                                    {willy.phone && willy.phoneTel ? (
                                        <a
                                            href={`tel:${willy.phoneTel}`}
                                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                                        >
                                            <Phone className="h-5 w-5 shrink-0 text-amber-300" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    Teléfono
                                                </p>
                                                <p className="text-sm font-semibold text-white">{willy.phone}</p>
                                            </div>
                                        </a>
                                    ) : null}
                                    {willy.email ? (
                                        <a
                                            href={`mailto:${willy.email}?subject=${encodeURIComponent("Consulta reparación de neopreno")}`}
                                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                                        >
                                            <Mail className="h-5 w-5 shrink-0 text-violet-300" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    Correo
                                                </p>
                                                <p className="text-sm font-semibold text-white">{willy.email}</p>
                                            </div>
                                        </a>
                                    ) : null}
                                    {willy.whatsappUrl ? (
                                        <a
                                            href={willy.whatsappUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 transition hover:bg-emerald-500/15"
                                        >
                                            <MessageCircle className="h-5 w-5 shrink-0 text-emerald-300" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                    WhatsApp
                                                </p>
                                                <p className="text-sm font-semibold text-white">
                                                    Escribir a {willy.name || "Willy"}
                                                </p>
                                            </div>
                                        </a>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-200">
                        <Shirt className="h-3.5 w-3.5" />
                        Servicio para socios
                    </div>
                    <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Reparación de neoprenos con{" "}
                        <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                            Willy
                        </span>
                    </h1>
                    <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        Willy, administrador y socio de S4, suele viajar a Zarautz dos o tres veces al mes. Dejamos una
                        pizarra y perchas exclusivas de reparación: tú señalas el traje, marcas las zonas a arreglar y él
                        se encarga del resto.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <a
                            href="#como-funciona"
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:brightness-110"
                        >
                            Ver cómo funciona
                            <ArrowRight className="h-4 w-4" />
                        </a>
                        <Link
                            href={route("servicios")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold transition hover:bg-white/15"
                        >
                            Reparación de tablas
                            <ExternalLink className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="grid gap-5 lg:grid-cols-3">
                    <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-6 lg:col-span-2">
                        <div className="flex items-start gap-4">
                            <ShieldCheck className="mt-0.5 h-8 w-8 shrink-0 text-violet-300" />
                            <div>
                                <h2 className="text-xl font-bold text-white">Sin malentendidos</h2>
                                <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                                    Indica con claridad qué quieres reparar y, si lo necesitas, hasta qué importe autorizas
                                    el arreglo. Willy revisa la pizarra, recoge el traje en la zona exclusiva y lo devuelve
                                    con el precio señalado. Tú validas y pagas en metálico en su buzón.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                        <div className="flex items-center gap-3">
                            <Pin className="h-6 w-6 text-fuchsia-300" />
                            <h3 className="font-bold text-white">Perchas de reparación</h3>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400">
                            Color y formato propios, distintos de las perchas del secadero habitual. Solo se usan para
                            trajes pendientes de reparar.
                        </p>
                    </div>
                </div>
            </section>

            <section id="como-funciona" className="scroll-mt-24 border-y border-white/5 bg-slate-950/40">
                <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
                    <div className="mb-10 max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-300/80">Proceso paso a paso</p>
                        <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Cómo trabajamos con Willy</h2>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                            Pizarra, percha exclusiva y dibujo en el traje. Todo en el local hasta que Willy lo recoge en
                            uno de sus viajes a Zarautz.
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
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-violet-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-violet-300/80">Willy hace</h3>
                                <ul className="mt-4 space-y-3">
                                    {WILLY_CHECKLIST.map((item) => (
                                        <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </aside>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 sm:p-10">
                    <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300/90">Forma de pago</p>
                            <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                                Metálico en el buzón de Willy
                            </h2>
                            <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                                Cuando recojas el traje reparado, comprueba el arreglo y el importe indicado en el propio
                                neopreno. Si estás conforme, deja el dinero en efectivo en el buzón de pagos de Willy en
                                el local.
                            </p>
                        </div>
                        <div className="rounded-2xl border border-violet-500/25 bg-violet-500/10 p-5">
                            <Banknote className="h-6 w-6 text-violet-300" />
                            <h3 className="mt-3 font-bold text-white">Buzón exclusivo</h3>
                            <p className="mt-2 text-sm text-slate-400">
                                Pago en metálico, como acordéis con Willy. Si tienes dudas sobre el precio antes de
                                reparar, contacta con él antes de dejar el traje en la percha.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 sm:pb-24">
                <div className="rounded-3xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-slate-900 p-8 text-center sm:p-10">
                    <h2 className="text-2xl font-extrabold text-white sm:text-3xl">¿Tienes dudas sobre una reparación?</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
                        Escríbenos o contacta con Willy para aclarar zonas, precio máximo o plazos antes de colgar el
                        traje.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                        {willy.whatsappUrl ? (
                            <a
                                href={willy.whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
                            >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp Willy
                            </a>
                        ) : null}
                        {whatsappSchoolUrl ? (
                            <a
                                href={whatsappSchoolUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-6 py-2.5 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15"
                            >
                                WhatsApp S4
                            </a>
                        ) : null}
                        <Link
                            href={route("contacto")}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold transition hover:bg-white/15"
                        >
                            Formulario de contacto
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
}
