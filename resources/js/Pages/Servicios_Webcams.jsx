import React from "react";
import { Head, Link } from "@inertiajs/react";
import {
    ArrowRight,
    ExternalLink,
    MapPin,
    Radio,
    Waves,
    Wind,
} from "lucide-react";
import ZurriolaWebcamPlayer from "../components/webcam/ZurriolaWebcamPlayer";

const GIPUZKOA_WEBCAM_URL =
    "https://www.gipuzkoa.eus/es/web/hondartzak/webcams/zurriola";

const INFO_ITEMS = [
    {
        icon: MapPin,
        title: "Ubicación",
        text: "Vista sobre la playa de Zurriola, a escasos metros de San Sebastian Surf School (S4).",
    },
    {
        icon: Waves,
        title: "Condiciones en tiempo real",
        text: "Consulta el estado del mar, la afluencia y el viento antes de tu sesión o clase.",
    },
    {
        icon: Wind,
        title: "Red oficial",
        text: "Señal proporcionada por la Diputación Foral de Gipuzkoa — Red de videometría de playas.",
    },
];

export default function ServiciosWebcams() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-[#0a1f2e] to-slate-950 text-white">
            <Head>
                <title>Webcams en directo | San Sebastian Surf School</title>
                <meta
                    name="description"
                    content="Webcam en directo de la playa de Zurriola (Donostia). Comprueba olas, viento y condiciones antes de surfear con S4 Surf School."
                />
            </Head>

            <section className="relative overflow-hidden border-b border-cyan-950/60">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.45),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Radio className="h-3.5 w-3.5" />
                        Webcams S4 · Zurriola
                    </div>
                    <h1 className="max-w-3xl font-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                        Condiciones en directo en{" "}
                        <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent">
                            Zurriola
                        </span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                        Imagen en tiempo real de la playa donde entrenamos cada día. Ideal para planificar
                        tu clase, alquiler o sesión libre en el Cantábrico.
                    </p>
                    <div className="mt-8 flex flex-wrap gap-3">
                        <Link
                            href={route("servicios.surf")}
                            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0f5f74] to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:from-[#0d4f60] hover:to-cyan-500"
                        >
                            Reservar clases
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <a
                            href={GIPUZKOA_WEBCAM_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/40 hover:bg-white/10"
                        >
                            Fuente oficial Gipuzkoa
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
                <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
                    <div>
                        <ZurriolaWebcamPlayer />
                        <p className="mt-4 text-xs leading-relaxed text-slate-500">
                            Señal en directo de la{" "}
                            <a
                                href={GIPUZKOA_WEBCAM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-400/90 underline-offset-2 hover:text-cyan-300 hover:underline"
                            >
                                Red de videometría — Diputación Foral de Gipuzkoa
                            </a>
                            . La calidad y disponibilidad dependen del servicio público.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {INFO_ITEMS.map(({ icon: Icon, title, text }) => (
                            <div
                                key={title}
                                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm"
                            >
                                <div className="mb-2 flex items-center gap-2">
                                    <Icon className="h-5 w-5 text-cyan-400" />
                                    <h2 className="text-sm font-bold uppercase tracking-wide text-cyan-100">
                                        {title}
                                    </h2>
                                </div>
                                <p className="text-sm leading-relaxed text-slate-400">{text}</p>
                            </div>
                        ))}

                        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-5">
                            <p className="text-sm font-semibold text-white">¿Vas a salir a surfear?</p>
                            <p className="mt-2 text-sm text-slate-400">
                                Revisa la webcam y reserva tu plaza en clases, alquiler de tablas o
                                consulta nuestros servicios multimedia.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link
                                    href={route("servicios.fotografia")}
                                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 ring-1 ring-white/10 transition hover:bg-white/15"
                                >
                                    Fotografía
                                </Link>
                                <Link
                                    href={route("servicios.videograbaciones")}
                                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 ring-1 ring-white/10 transition hover:bg-white/15"
                                >
                                    Videograbaciones
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
