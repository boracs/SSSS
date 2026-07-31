import React, { useEffect } from "react";
import { usePage } from "@inertiajs/react";
import { ExternalLink, Radio } from "lucide-react";
import ZurriolaWebcamPlayer from "../components/webcam/ZurriolaWebcamPlayer";
import SurfBriefCard from "../components/webcam/SurfBriefCard";
import SurfForecastTable from "../components/webcam/SurfForecastTable";
import ZurriolaGeoGuide from "../components/webcam/ZurriolaGeoGuide";
import S4Button from "../components/S4Button";
import SeoHead from "../components/seo/SeoHead";

const GIPUZKOA_WEBCAM_URL =
    "https://www.gipuzkoa.eus/es/web/hondartzak/webcams/zurriola";

const FORECAST_ANCHOR_ID = "prevision-forecast";

export default function ServiciosWebcams({
    surfBrief,
    surfForecast,
    zurriolaGeo = null,
    seo = null,
}) {
    const { url } = usePage();
    const schoolMeters = zurriolaGeo?.school_to_beach?.meters ?? 20;
    const schoolLabel =
        zurriolaGeo?.school_to_beach?.label ??
        `A pie de playa, a unos ${schoolMeters} metros de la Zurriola.`;

    useEffect(() => {
        const scrollToForecast = () => {
            const hash = window.location.hash.replace(/^#/, "");
            if (hash !== FORECAST_ANCHOR_ID) {
                return;
            }
            window.setTimeout(() => {
                document.getElementById(FORECAST_ANCHOR_ID)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 80);
        };

        scrollToForecast();
        window.addEventListener("hashchange", scrollToForecast);
        return () => window.removeEventListener("hashchange", scrollToForecast);
    }, [url]);

    return (
        <div className="min-h-screen s4-surface-dark">
            <SeoHead seo={seo} />

            <section className="relative overflow-hidden border-b border-s4/40">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.45),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
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
                        Webcam en directo y previsión a 3 días — a {schoolMeters} metros de la escuela.
                    </p>
                </div>
            </section>

            {/* 1) Webcam primero */}
            <section id="webcam-directo" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-8 sm:px-6 sm:pt-10">
                <div className="mb-4 sm:mb-5">
                    <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">En vivo</p>
                    <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
                        Webcam en directo
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Usa el zoom para acercarte a la rompiente.
                    </p>
                </div>

                <ZurriolaWebcamPlayer />

                <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                    <span>{schoolLabel}</span>
                    <span className="text-slate-600" aria-hidden>
                        ·
                    </span>
                    <a
                        href={GIPUZKOA_WEBCAM_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-cyan-400/90 hover:text-cyan-300"
                    >
                        Fuente oficial Gipuzkoa
                        <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                </p>
            </section>

            {/* 2) Forecast justo debajo */}
            <section
                id={FORECAST_ANCHOR_ID}
                className="mx-auto max-w-6xl scroll-mt-24 space-y-4 px-4 py-8 sm:px-6 sm:py-10"
            >
                <SurfForecastTable
                    days={Array.isArray(surfForecast?.days) ? surfForecast.days : Array.isArray(surfForecast) ? surfForecast : []}
                    metricHelp={surfForecast?.metricHelp ?? {}}
                    summary={surfBrief?.summary}
                    summaryStatus={surfBrief?.status ?? null}
                    summaryMessage={surfBrief?.message ?? null}
                    updatedAtHuman={surfBrief?.generated_at_human}
                    signal={surfBrief?.signal ?? null}
                    reactions={surfBrief?.reactions ?? null}
                />
                <SurfBriefCard brief={surfBrief} />
            </section>

            {/* 3) CTAs degradados */}
            <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 sm:pb-12">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-5 sm:py-5">
                    <p className="text-sm font-medium text-slate-300">¿Vas a salir a surfear?</p>
                    <p className="mt-1 text-xs text-slate-500">
                        Reserva clase o echa un ojo a foto y vídeo de tu sesión.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <S4Button href={route("servicios.surf")} size="sm" variant="secondary">
                            Clases
                        </S4Button>
                        <S4Button href={route("servicios.fotografia")} size="sm" variant="secondary">
                            Fotografía
                        </S4Button>
                        <S4Button href={route("servicios.videograbaciones")} size="sm" variant="secondary">
                            Vídeo
                        </S4Button>
                    </div>
                </div>
            </section>

            <ZurriolaGeoGuide facts={zurriolaGeo} />
        </div>
    );
}
