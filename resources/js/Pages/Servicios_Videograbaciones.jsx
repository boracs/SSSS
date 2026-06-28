import React from "react";
import { Link } from "@inertiajs/react";
import {
    BarChart3,
    Camera,
    CheckCircle2,
    Clapperboard,
    MonitorPlay,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    Waves,
} from "lucide-react";

const STEPS = [
    {
        step: "01",
        title: "Grabamos tu sesión",
        body: "Cámara en playa y ángulos múltiples en el agua. Capturamos cada maniobra en condiciones reales de Zurriola.",
    },
    {
        step: "02",
        title: "Análisis técnico",
        body: "Revisión frame a frame con tu monitor: postura, línea, timing de la ola y puntos de mejora concretos.",
    },
    {
        step: "03",
        title: "Plan de acción",
        body: "Sales con correcciones claras y, si lo deseas, material editado listo para redes o para tu progreso personal.",
    },
];

const BENEFITS = [
    {
        icon: Target,
        title: "Corrección precisa",
        text: "Lo que sientes en el agua no siempre coincide con lo que haces. El video no miente: acelera tu curva de aprendizaje.",
    },
    {
        icon: TrendingUp,
        title: "Progreso medible",
        text: "Compara sesiones, detecta patrones y valida mejoras sesión a sesión con un referente visual objetivo.",
    },
    {
        icon: Sparkles,
        title: "Contenido premium",
        text: "Clips editados de calidad para Instagram, portfolio o recuerdo. Tu surfing, presentado como se merece.",
    },
    {
        icon: Users,
        title: "Sesiones en grupo",
        text: "Ideal para cursillos, equipos o amigos que entrenan juntos. Misma dinámica, feedback individualizado.",
    },
];

const INCLUDES = [
    "Grabación en playa durante tu clase o sesión",
    "Revisión guiada con monitor certificado",
    "Detección de errores técnicos recurrentes",
    "Recomendaciones personalizadas de entrenamiento",
    "Entrega de clips seleccionados (según pack)",
    "Opción de análisis comparativo entre sesiones",
];

export default function ServiciosVideograbaciones() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a2a33] to-slate-950 text-white">
            <section className="relative overflow-hidden border-b border-cyan-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.45),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Clapperboard className="h-3.5 w-3.5" />
                        Servicio premium S4
                    </div>
                    <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                        Videograbaciones que convierten cada ola en{" "}
                        <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                            progreso real
                        </span>
                    </h1>
                    <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                        En San Sebastián Surf School no solo surfeas:{" "}
                        <strong className="text-white">ves, entiendes y mejoras</strong>. Nuestro servicio de
                        videograbación combina captura profesional en playa con análisis técnico para que cada sesión
                        deje huella en tu técnica y en tu confianza.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={route("contacto")}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-amber-400 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:brightness-110"
                        >
                            <Camera className="h-4 w-4" />
                            Reservar videograbación
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

            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                <div className="overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-cyan-950/40">
                    <img
                        src="/img/videograbacion-analisis.png"
                        alt="Sesión de análisis de video de surf con monitor e indicadores técnicos en pantalla"
                        className="h-auto w-full object-cover"
                    />
                </div>
                <p className="mt-4 text-center text-sm text-slate-500">
                    Revisión técnica en sala: métricas, ángulos y correcciones aplicadas a tu maniobra.
                </p>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
                <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                            En qué consiste
                        </p>
                        <h2 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                            Tu surfing, bajo el microscopio del experto
                        </h2>
                        <p className="mt-4 leading-relaxed text-slate-300">
                            La videograbación es mucho más que un video bonito. Es una herramienta de coaching de alto
                            rendimiento: registramos tu sesión, la proyectamos con software de análisis y un monitor S4
                            te guía sobre qué ajustar en la próxima ola.
                        </p>
                        <p className="mt-4 leading-relaxed text-slate-300">
                            Perfecto si llevas tiempo estancado, si quieres preparar una competición o si simplemente
                            deseas <strong className="text-white">material de calidad</strong> que refleje tu evolución
                            en el Cantábrico.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {BENEFITS.map(({ icon: Icon, title, text }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                            >
                                <Icon className="mb-2 h-5 w-5 text-cyan-300" />
                                <h3 className="text-sm font-bold text-white">{title}</h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-400">{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="border-y border-white/5 bg-[#0f5f74]/20 py-12">
                <div className="mx-auto max-w-6xl px-4 sm:px-6">
                    <div className="mb-8 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200/80">
                            Instalaciones
                        </p>
                        <h2 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
                            Del agua al laboratorio de análisis
                        </h2>
                        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400">
                            Entorno profesional para grabar, revisar y entrenar. Tecnología, monitor cualificado y un
                            espacio pensado para que el feedback sea claro y accionable.
                        </p>
                    </div>
                    <div className="overflow-hidden rounded-3xl border border-cyan-900/40 shadow-xl">
                        <img
                            src="/img/videograbacion-lab.png"
                            alt="Laboratorio de surf: análisis de video, zona social y entrenamiento de rendimiento"
                            className="h-auto w-full object-cover"
                        />
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
                <div className="mb-10 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-300">Cómo funciona</p>
                    <h2 className="mt-2 text-3xl font-extrabold text-white">Tres pasos. Una mejora visible.</h2>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                    {STEPS.map(({ step, title, body }) => (
                        <div
                            key={step}
                            className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/10 to-transparent p-6"
                        >
                            <span className="text-4xl font-black text-cyan-500/30">{step}</span>
                            <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
                <div className="grid gap-8 rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-cyan-500/10 p-8 lg:grid-cols-2 lg:p-12">
                    <div>
                        <div className="mb-4 flex items-center gap-2">
                            <MonitorPlay className="h-6 w-6 text-emerald-400" />
                            <h2 className="text-2xl font-extrabold text-white">Qué incluye el servicio</h2>
                        </div>
                        <ul className="space-y-3">
                            {INCLUDES.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-sm text-slate-300">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6">
                            <BarChart3 className="h-8 w-8 text-orange-400" />
                            <h3 className="mt-3 text-xl font-bold text-white">¿Listo para dar el salto?</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
                                Complementa tu videograbación con clases en academía o reserva una sesión suelta. Nuestro
                                equipo te asesora sobre el pack que mejor encaja con tu nivel.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <Link
                                    href={route("contacto")}
                                    className="inline-flex items-center gap-2 rounded-full bg-[#0f5f74] px-5 py-2.5 text-sm font-bold text-white ring-1 ring-cyan-400/30 transition hover:bg-[#0d5163]"
                                >
                                    <Waves className="h-4 w-4" />
                                    Contactar ahora
                                </Link>
                                <Link
                                    href={route("servicios.surf")}
                                    className="text-sm font-semibold text-cyan-300 underline-offset-4 hover:underline"
                                >
                                    Ver clases de surf
                                </Link>
                            </div>
                            <p className="mt-4 text-[11px] text-slate-500">
                                * Tarifas y packs disponibles bajo consulta. Servicio sujeto a disponibilidad
                                meteorológica.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
