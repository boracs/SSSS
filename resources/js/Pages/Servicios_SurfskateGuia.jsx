import React from "react";
import { Head, Link } from "@inertiajs/react";
import {
    Activity,
    ArrowRight,
    Footprints,
    Ruler,
    Scale,
    Sparkles,
    Table2,
    Info,
    CheckCircle2,
    ShieldCheck,
} from "lucide-react";
import YowLogo from "../components/YowLogo";

const PILARES = [
    {
        icon: Footprints,
        titulo: "Tu postura sobre la tabla",
        texto:
            "Mide mentalmente la distancia entre tus pies cuando surfeas. Esa medida debe encajar con la tabla: si los pies quedan muy juntos o muy separados, perderás fluidez al girar.",
    },
    {
        icon: Ruler,
        titulo: "Tu altura y complexión",
        texto:
            "Si eres alto o tienes más corpulencia, necesitas una tabla más larga y ancha para no salirte de los cantos. Si eres más bajo o ligero, una tabla compacta te dará giros más rápidos y fáciles.",
    },
    {
        icon: Scale,
        titulo: "Tu peso",
        texto:
            "El sistema de ejes YOW Meraki está pensado para quienes superan unos 50 kg. Para niños o pesos muy ligeros, la gama Grom ofrece tablas más suaves de manejar y menos exigentes al empujar.",
    },
];

const PERFILES = [
    {
        etiqueta: "Compacto y ágil",
        altura: "Menos de 1,60 m",
        peso: "Menos de 55 kg",
        wheelbase: "16,5″ – 17″",
        modelos: "Mundaka 32″, Grom (Hossegor, Huntington)",
        estilo: "Giros rápidos y reactivos, ideal para empezar o para un estilo más radical.",
    },
    {
        etiqueta: "Equilibrado",
        altura: "1,60 m – 1,75 m",
        peso: "55 kg – 75 kg",
        wheelbase: "17″ – 18″",
        modelos: "Pipe 32″ (referencia polivalente), Chiba 30″",
        estilo: "La opción más versátil: buena para clase, paseo y practicar maniobras.",
        destacado: true,
    },
    {
        etiqueta: "Técnico avanzado",
        altura: "1,75 m – 1,85 m",
        peso: "70 kg – 90 kg",
        wheelbase: "17″ – 19″",
        modelos: "Snappers 32,5″, Hole Shot 33,85″",
        estilo: "Para quien ya domina el surfskate y busca cantear fuerte o simular shortboard.",
    },
    {
        etiqueta: "Cruising y estabilidad",
        altura: "Más de 1,85 m",
        peso: "Más de 85 kg",
        wheelbase: "19″ – 23″ o más",
        modelos: "Teahupoo 34″, Malibú 36″, Waikiki",
        estilo: "Mantiene la velocidad con comodidad, parecido a surfear tablas largas o single fin.",
    },
];

const TABLA_SELECCION = [
    {
        altura: "Menos de 1,60 m",
        peso: "Menos de 55 kg",
        longitud: "29″ – 31″",
        ejemplos: "Grom Series",
        wheelbase: "17″ o menos",
    },
    {
        altura: "1,60 m – 1,75 m",
        peso: "55 kg – 75 kg",
        longitud: "31″ – 33″",
        ejemplos: "Chiba, Pipe, Hole Shot",
        wheelbase: "17″ – 18″",
    },
    {
        altura: "1,75 m – 1,85 m",
        peso: "70 kg – 90 kg",
        longitud: "33″ – 34″",
        ejemplos: "Snappers, Teahupoo",
        wheelbase: "18″ – 19″",
    },
    {
        altura: "Más de 1,85 m",
        peso: "Más de 85 kg",
        longitud: "34″ – 36″ o más",
        ejemplos: "Waikiki, Malibú",
        wheelbase: "19″ – 20″ o más",
    },
];

const COMPARATIVA = [
    {
        modelo: "Snappers 32,5″",
        longitud: "32,5″",
        wheelbase: "17″",
        paraQuien: "Tabla media con ejes cortos: mucho espacio para los pies y giros muy cerrados. Simula un shortboard técnico.",
    },
    {
        modelo: "Chiba 30″",
        longitud: "30″",
        wheelbase: "18″",
        paraQuien: "Tabla corta con ejes más separados: muy estable y predecible, perfecta para ciudad y asfalto abierto.",
    },
];

const PROTECCION = [
    {
        nombre: "Rodilleras",
        texto: "Protegen las rodillas si te caes al apoyar la pierna. Muy recomendables cuando empiezas.",
    },
    {
        nombre: "Coderas",
        texto: "Evitan golpes en los codos al caer de lado. Dan tranquilidad en los primeros giros.",
    },
    {
        nombre: "Muñequeras",
        texto: "Sostienen la muñeca si apoyas las manos al perder el equilibrio.",
    },
    {
        nombre: "Casco",
        texto: "Opcional, pero aconsejable si quieres máxima seguridad o practicas maniobras más exigentes.",
        opcional: true,
    },
];

function PerfilCard({ perfil }) {
    return (
        <article
            className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition hover:-translate-y-0.5 ${
                perfil.destacado
                    ? "border-orange-400/40 bg-gradient-to-b from-orange-500/10 to-white/5 shadow-lg shadow-orange-950/20"
                    : "border-white/10 bg-white/5 hover:border-orange-400/25"
            }`}
        >
            {perfil.destacado && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-orange-400 to-amber-300 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-900">
                    Más habitual
                </span>
            )}
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-orange-300">
                {perfil.etiqueta}
            </p>
            <h3 className="mt-2 text-lg font-bold text-white">
                {perfil.altura} · {perfil.peso}
            </h3>
            <dl className="mt-4 space-y-3 text-sm">
                <div>
                    <dt className="text-slate-500">Distancia entre ejes</dt>
                    <dd className="font-semibold text-slate-200">{perfil.wheelbase}</dd>
                </div>
                <div>
                    <dt className="text-slate-500">Modelos recomendados</dt>
                    <dd className="text-slate-300">{perfil.modelos}</dd>
                </div>
            </dl>
            <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-400">{perfil.estilo}</p>
        </article>
    );
}

export default function ServiciosSurfskateGuia() {
    return (
        <>
            <Head>
                <title>Guía para elegir tu surfskate · altura y peso</title>
                <meta
                    name="description"
                    content="Guía práctica de San Sebastian Surf School para elegir surfskate YOW según tu altura, peso y estilo. Tabla de medidas, modelos y consejos sin tecnicismos."
                />
            </Head>

            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#241405] to-slate-950 text-white">
                {/* Hero */}
                <section className="relative overflow-hidden border-b border-orange-950/60">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(120,53,15,0.4),_transparent_55%)]" />
                    <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
                        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-3xl">
                                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-orange-200">
                                    <Sparkles className="h-3.5 w-3.5" />
                                    Surfskate · Guía de equipamiento
                                </div>
                                <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                                    ¿Qué surfskate te va bien según{" "}
                                    <span className="bg-gradient-to-r from-orange-300 to-amber-300 bg-clip-text text-transparent">
                                        tu altura y peso?
                                    </span>
                                </h1>
                                <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                                    No se trata solo de cómo se ve la tabla. Te ayudamos a elegir la medida
                                    correcta para que en clase te sientas cómodo, gires con fluidez y no
                                    luches contra el equipo.
                                </p>
                                <div className="mt-7 flex flex-wrap gap-3">
                                    <a
                                        href="#tabla-seleccion"
                                        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-5 py-2.5 text-sm font-bold text-slate-900 shadow-lg transition hover:brightness-110"
                                    >
                                        <Table2 className="h-4 w-4" />
                                        Ver tabla rápida
                                    </a>
                                    <Link
                                        href={route("servicios.surfSkate")}
                                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
                                    >
                                        Clases de surfskate
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>

                            <div className="flex shrink-0 flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-sm sm:items-center">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                    Equipamiento de referencia
                                </p>
                                <YowLogo height={40} className="opacity-95" />
                                <p className="max-w-[220px] text-center text-xs leading-relaxed text-slate-400 sm:text-left">
                                    Sistemas Meraki S5 · Guía elaborada con San Sebastian Surf School
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pilares */}
                <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="pilares-titulo">
                    <div className="mb-8 max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                            Antes de elegir
                        </p>
                        <h2 id="pilares-titulo" className="mt-2 text-3xl font-extrabold text-white">
                            Tres cosas que importan de verdad
                        </h2>
                        <p className="mt-3 text-slate-400">
                            Olvida el marketing: la tabla correcta depende de cómo te colocas, de tu
                            cuerpo y de cuánto pesas.
                        </p>
                    </div>
                    <div className="grid gap-5 md:grid-cols-3">
                        {PILARES.map((p) => {
                            const Icon = p.icon;
                            return (
                                <div
                                    key={p.titulo}
                                    className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
                                >
                                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/30">
                                        <Icon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-lg font-bold text-white">{p.titulo}</h3>
                                    <p className="mt-2 text-sm leading-relaxed text-slate-400">{p.texto}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Perfiles */}
                <section
                    className="border-y border-white/5 bg-black/20 py-14"
                    aria-labelledby="perfiles-titulo"
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="mb-8 text-center">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                                Por tipo de rider
                            </p>
                            <h2 id="perfiles-titulo" className="mt-2 text-3xl font-extrabold text-white">
                                Encuentra tu perfil
                            </h2>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">
                            {PERFILES.map((perfil) => (
                                <PerfilCard key={perfil.etiqueta} perfil={perfil} />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Tabla principal */}
                <section
                    id="tabla-seleccion"
                    className="mx-auto max-w-6xl px-4 py-14 sm:px-6"
                    aria-labelledby="tabla-titulo"
                >
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                                Consulta rápida
                            </p>
                            <h2 id="tabla-titulo" className="mt-2 text-3xl font-extrabold text-white">
                                Tabla de selección
                            </h2>
                            <p className="mt-2 max-w-xl text-sm text-slate-400">
                                Busca tu rango de altura y peso. La <strong className="font-semibold text-slate-300">distancia entre ejes</strong>{" "}
                                (wheelbase) es la medida clave: es el hueco entre los dos ejes por donde van tus pies.
                            </p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-xl border border-orange-400/20 bg-orange-500/10 px-4 py-2 text-xs text-orange-100">
                            <Info className="h-4 w-4 shrink-0 text-orange-300" />
                            Medidas orientativas · consulta en clase
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-xl shadow-black/20">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                                <thead>
                                    <tr className="border-b border-white/10 bg-orange-500/10">
                                        <th className="px-4 py-4 font-bold text-orange-100 sm:px-6">
                                            Tu altura
                                        </th>
                                        <th className="px-4 py-4 font-bold text-orange-100 sm:px-6">
                                            Tu peso
                                        </th>
                                        <th className="px-4 py-4 font-bold text-orange-100 sm:px-6">
                                            Longitud de tabla
                                        </th>
                                        <th className="px-4 py-4 font-bold text-orange-100 sm:px-6">
                                            Modelos de ejemplo
                                        </th>
                                        <th className="px-4 py-4 font-bold text-orange-100 sm:px-6">
                                            Distancia entre ejes
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {TABLA_SELECCION.map((fila, i) => (
                                        <tr
                                            key={fila.altura}
                                            className={
                                                i % 2 === 0
                                                    ? "border-b border-white/5 bg-transparent"
                                                    : "border-b border-white/5 bg-white/[0.02]"
                                            }
                                        >
                                            <td className="px-4 py-4 font-medium text-white sm:px-6">
                                                {fila.altura}
                                            </td>
                                            <td className="px-4 py-4 text-slate-300 sm:px-6">{fila.peso}</td>
                                            <td className="px-4 py-4 text-slate-200 sm:px-6">{fila.longitud}</td>
                                            <td className="px-4 py-4 text-slate-400 sm:px-6">{fila.ejemplos}</td>
                                            <td className="px-4 py-4 font-semibold text-orange-200 sm:px-6">
                                                {fila.wheelbase}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Longitud vs wheelbase */}
                <section
                    className="border-t border-white/5 bg-black/20 py-14"
                    aria-labelledby="concepto-titulo"
                >
                    <div className="mx-auto max-w-6xl px-4 sm:px-6">
                        <div className="mb-8 max-w-2xl">
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                                Error muy común
                            </p>
                            <h2 id="concepto-titulo" className="mt-2 text-3xl font-extrabold text-white">
                                No mires solo la longitud total
                            </h2>
                            <p className="mt-3 text-slate-400">
                                Dos tablas pueden medir parecido por fuera y comportarse muy distinto. Lo
                                que marca la diferencia es la combinación de longitud y distancia entre ejes.
                            </p>
                        </div>
                        <div className="grid gap-5 md:grid-cols-2">
                            {COMPARATIVA.map((item) => (
                                <article
                                    key={item.modelo}
                                    className="rounded-2xl border border-white/10 bg-white/5 p-6"
                                >
                                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                        <h3 className="text-lg font-bold text-white">{item.modelo}</h3>
                                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                            {item.longitud} · ejes {item.wheelbase}
                                        </span>
                                    </div>
                                    <p className="mt-3 text-sm leading-relaxed text-slate-400">
                                        {item.paraQuien}
                                    </p>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Protección */}
                <section
                    className="mx-auto max-w-6xl px-4 py-14 sm:px-6"
                    aria-labelledby="proteccion-titulo"
                >
                    <div className="mb-8 max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">
                            Seguridad en clase
                        </p>
                        <h2 id="proteccion-titulo" className="mt-2 text-3xl font-extrabold text-white">
                            Equipo de protección disponible
                        </h2>
                        <p className="mt-3 text-slate-400">
                            En nuestras clases puedes usar protección si lo deseas. No es obligatorio, pero
                            te ayuda a sentirte más seguro mientras aprendes, sobre todo al principio.
                        </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {PROTECCION.map((item) => (
                            <div
                                key={item.nombre}
                                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/15 text-orange-300 ring-1 ring-orange-400/25">
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <h3 className="font-bold text-white">{item.nombre}</h3>
                                    {item.opcional && (
                                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                            Opcional
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm leading-relaxed text-slate-400">{item.texto}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-6 flex items-start gap-2 rounded-xl border border-orange-400/15 bg-orange-500/5 px-4 py-3 text-sm text-slate-300">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
                        Pregunta al monitor antes de la sesión si necesitas talla o algún complemento concreto.
                    </p>
                </section>

                {/* CTA */}
                <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
                    <div className="rounded-2xl border border-orange-400/25 bg-gradient-to-br from-orange-500/15 via-white/5 to-transparent p-8 sm:p-10">
                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                            <div className="max-w-xl">
                                <div className="mb-4 flex items-center gap-4">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/20 text-orange-300 ring-1 ring-orange-400/30">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <YowLogo height={28} />
                                </div>
                                <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                                    ¿Tienes dudas con tu medida?
                                </h2>
                                <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                                    En nuestras clases de surfskate probamos el equipo contigo y te
                                    orientamos. Si ya tienes tabla, tráela; si no, te ayudamos a acertar
                                    antes de comprar.
                                </p>
                                <ul className="mt-4 space-y-2">
                                    {[
                                        "Asesoramiento personalizado en clase",
                                        "Equipamiento YOW Meraki de referencia",
                                        "Rodilleras, coderas, muñequeras y casco si lo deseas",
                                        "Todos los niveles: principiante a avanzado",
                                    ].map((item) => (
                                        <li
                                            key={item}
                                            className="flex items-start gap-2 text-sm text-slate-300"
                                        >
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-400" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                                <Link
                                    href={route("contacto")}
                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 px-6 py-3 text-sm font-bold text-slate-900 shadow-lg transition hover:brightness-110"
                                >
                                    Consultar equipamiento
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                    href={route("servicios.surfSkate")}
                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                    Ver clases y precios
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </>
    );
}
