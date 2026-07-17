import React from "react";
import { Head, Link } from "@inertiajs/react";
import {
    ExternalLink,
    MapPin,
    Radio,
} from "lucide-react";
import ZurriolaWebcamPlayer from "../components/webcam/ZurriolaWebcamPlayer";
import SurfBriefCard from "../components/webcam/SurfBriefCard";
import SurfForecastTable from "../components/webcam/SurfForecastTable";

const GIPUZKOA_WEBCAM_URL =
    "https://www.gipuzkoa.eus/es/web/hondartzak/webcams/zurriola";

export default function ServiciosWebcams({ surfBrief, surfForecast }) {
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
                <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Radio className="h-3.5 w-3.5" />
                        Condiciones S4 · Zurriola
                    </div>
                    <h1 className="max-w-3xl font-heading text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                        Mira el mar{" "}
                        <span className="bg-gradient-to-r from-cyan-300 to-teal-200 bg-clip-text text-transparent">
                            antes de salir
                        </span>
                    </h1>
                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                        Webcam en directo, previsión a 3 días y parte del día — a 23 metros de la escuela.
                    </p>
                </div>
            </section>

            <section id="webcam-directo" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-10 sm:px-6">
                <div className="mb-6">
                    <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">En vivo</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        Webcam en directo
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Usa el zoom para acercarte a la rompiente. La señal es de la red oficial de Gipuzkoa.
                    </p>
                </div>

                <div className="grid gap-8 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)] lg:items-start">
                    <ZurriolaWebcamPlayer />

                    <aside className="space-y-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                            <div className="mb-3 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-cyan-400" />
                                <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-100">Ubicación y señal</h3>
                            </div>
                            <p className="text-sm leading-relaxed text-slate-400">
                                Vista sobre Zurriola, a <span className="font-semibold text-slate-200">23 metros</span> de
                                San Sebastian Surf School (S4). Señal de la Diputación Foral de Gipuzkoa — Red de
                                videometría de playas.
                            </p>
                            <a
                                href={GIPUZKOA_WEBCAM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                            >
                                Fuente oficial Gipuzkoa
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                        </div>

                        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-transparent p-5">
                            <p className="text-sm font-semibold text-white">¿Vas a salir a surfear?</p>
                            <p className="mt-2 text-sm text-slate-400">
                                Reserva clase o echa un ojo a foto y vídeo de tu sesión.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <Link
                                    href={route("servicios.surf")}
                                    className="rounded-lg bg-[#0f5f74] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d4f60]"
                                >
                                    Clases
                                </Link>
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
                                    Vídeo
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            <section className="mx-auto max-w-6xl space-y-4 px-4 py-10 sm:px-6">
                <SurfForecastTable
                    days={Array.isArray(surfForecast?.days) ? surfForecast.days : Array.isArray(surfForecast) ? surfForecast : []}
                    metricHelp={surfForecast?.metricHelp ?? {}}
                    summary={surfBrief?.summary}
                    updatedAtHuman={surfBrief?.generated_at_human}
                    level={surfBrief?.level}
                    override={surfBrief?.override}
                    reactions={surfBrief?.reactions ?? null}
                />
                <SurfBriefCard brief={surfBrief} />
            </section>
        </div>
    );
}
