import React, { useEffect, useRef, useState } from "react";
import { usePage } from "@inertiajs/react";
import axios from "axios";
import { CloudSun, ExternalLink, Radio, Sun } from "lucide-react";
import ZurriolaWebcamPlayer from "../components/webcam/ZurriolaWebcamPlayer";
import SurfBriefCard from "../components/webcam/SurfBriefCard";
import SurfForecastTable from "../components/webcam/SurfForecastTable";
import SurfFullForecastOverlay from "../components/webcam/SurfFullForecastOverlay";
import SurfDetailedForecastSlider from "../components/webcam/SurfDetailedForecastSlider";
import useDetailedForecast from "../components/webcam/useDetailedForecast";
import WeatherDetailPanel from "../components/webcam/WeatherDetailPanel";
import ZurriolaGeoGuide from "../components/webcam/ZurriolaGeoGuide";
import SeoHead from "../components/seo/SeoHead";

const GIPUZKOA_WEBCAM_URL =
    "https://www.gipuzkoa.eus/es/web/hondartzak/webcams/zurriola";

const FORECAST_ANCHOR_ID = "prevision-forecast";
const WEATHER_PANEL_ID = "weather-detail-panel";
const FULL_FORECAST_PANEL_ID = "full-forecast-panel";
const DETAILED_TIMELINE_PANEL_ID = "detailed-timeline-panel";

export default function ServiciosWebcams({
    surfBrief,
    surfForecast,
    zurriolaGeo = null,
    seo = null,
}) {
    const { url } = usePage();
    const surfDays = Array.isArray(surfForecast?.days)
        ? surfForecast.days
        : Array.isArray(surfForecast)
          ? surfForecast
          : [];
    const schoolMeters = zurriolaGeo?.school_to_beach?.meters ?? 20;
    const schoolLabel =
        zurriolaGeo?.school_to_beach?.label ??
        `A pie de playa, a unos ${schoolMeters} metros de la Zurriola.`;

    const [weatherOpen, setWeatherOpen] = useState(false);
    const [weatherData, setWeatherData] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(false);
    const [weatherError, setWeatherError] = useState("");
    const weatherFetchedRef = useRef(false);

    const setWeatherOpenAndFetch = async (nextOpen) => {
        setWeatherOpen(nextOpen);

        if (!nextOpen || weatherFetchedRef.current) {
            return;
        }

        setWeatherLoading(true);
        setWeatherError("");

        try {
            const { data } = await axios.get(route("servicios.webcams.weather"));
            if (data?.ok) {
                weatherFetchedRef.current = true;
                setWeatherData(data);
            } else {
                weatherFetchedRef.current = false;
                setWeatherError(data?.message || "No se pudo cargar el tiempo detallado.");
            }
        } catch {
            weatherFetchedRef.current = false;
            setWeatherError("No se pudo cargar el tiempo detallado. Prueba otra vez.");
        } finally {
            setWeatherLoading(false);
        }
    };

    const toggleWeatherDetail = () => setWeatherOpenAndFetch(!weatherOpen);
    const openWeatherDetail = () => setWeatherOpenAndFetch(true);

    const [fullForecastOpen, setFullForecastOpen] = useState(false);

    const {
        open: detailedOpen,
        days: detailedDays,
        loading: detailedLoading,
        error: detailedError,
        weatherOk: detailedWeatherOk,
        weatherMessage: detailedWeatherMessage,
        openDetailed: openDetailedTimelineRaw,
        closeDetailed: closeDetailedTimeline,
    } = useDetailedForecast();

    const openFullForecast = () => {
        closeDetailedTimeline();
        setFullForecastOpen(true);
        openWeatherDetail();
    };

    const openDetailedTimeline = () => {
        setFullForecastOpen(false);
        openDetailedTimelineRaw();
    };

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
                    days={surfDays}
                    metricHelp={surfForecast?.metricHelp ?? {}}
                    summary={surfBrief?.summary}
                    summarySections={surfBrief?.summary_sections ?? null}
                    summaryStatus={surfBrief?.status ?? null}
                    summaryMessage={surfBrief?.message ?? null}
                    updatedAtHuman={surfBrief?.generated_at_human}
                    signal={surfBrief?.signal ?? null}
                    reactions={surfBrief?.reactions ?? null}
                    onOpenFullForecast={openFullForecast}
                    onOpenDetailedTimeline={openDetailedTimeline}
                />

                <SurfFullForecastOverlay
                    panelId={FULL_FORECAST_PANEL_ID}
                    open={fullForecastOpen}
                    days={surfDays}
                    weatherDaily={weatherData?.daily ?? []}
                    weatherLoading={weatherLoading}
                    weatherError={weatherError}
                    onClose={() => setFullForecastOpen(false)}
                    brief={surfBrief}
                    webcamAnchorId="webcam-directo"
                />

                <SurfDetailedForecastSlider
                    panelId={DETAILED_TIMELINE_PANEL_ID}
                    open={detailedOpen}
                    days={detailedDays}
                    loading={detailedLoading}
                    error={detailedError}
                    weatherOk={detailedWeatherOk}
                    weatherMessage={detailedWeatherMessage}
                    onClose={closeDetailedTimeline}
                    webcamAnchorId="webcam-directo"
                    brief={surfBrief}
                />

                <div>
                    <button
                        type="button"
                        onClick={toggleWeatherDetail}
                        aria-expanded={weatherOpen}
                        aria-controls={WEATHER_PANEL_ID}
                        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
                    >
                        {weatherOpen ? (
                            <CloudSun className="h-4 w-4" aria-hidden />
                        ) : (
                            <Sun className="h-4 w-4" aria-hidden />
                        )}
                        {weatherOpen ? "Ocultar tiempo" : "Tiempo detallado"}
                    </button>

                    <WeatherDetailPanel
                        panelId={WEATHER_PANEL_ID}
                        open={weatherOpen}
                        data={weatherData}
                        loading={weatherLoading}
                        error={weatherError}
                    />
                </div>

                <SurfBriefCard brief={surfBrief} />
            </section>

            <ZurriolaGeoGuide facts={zurriolaGeo} />
        </div>
    );
}
