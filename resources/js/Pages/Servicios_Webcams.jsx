import React, { useEffect, useRef, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import axios from "axios";
import { CloudSun, ExternalLink, Loader2, Radio, Sun } from "lucide-react";
import ZurriolaWebcamPlayer from "../components/webcam/ZurriolaWebcamPlayer";
import SurfBriefCard from "../components/webcam/SurfBriefCard";
import SurfForecastTable from "../components/webcam/SurfForecastTable";
import SurfFullForecastOverlay from "../components/webcam/SurfFullForecastOverlay";
import SurfDetailedForecastSlider from "../components/webcam/SurfDetailedForecastSlider";
import useDetailedForecast from "../components/webcam/useDetailedForecast";
import WeatherDetailPanel from "../components/webcam/WeatherDetailPanel";
import ZurriolaGeoGuide from "../components/webcam/ZurriolaGeoGuide";
import SeoHead from "../components/seo/SeoHead";
import SharePageButton from "../components/SharePageButton";
import { FORECAST_GUIDE_ARTICLE_SLUG } from "../components/webcam/surfMetricHelp";

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

    const toggleWeatherDetail = () => {
        const nextOpen = !weatherOpen;
        setWeatherOpenAndFetch(nextOpen);
        if (nextOpen) {
            window.setTimeout(() => {
                document.getElementById(WEATHER_PANEL_ID)?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }, 50);
        }
    };
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

    // Deep-links: #webcam-directo | #prevision-forecast | #parte-s4-hoy | #zurriola-temporada | #zurriola-guia.
    useEffect(() => {
        const scrollToHash = () => {
            const hash = window.location.hash.replace(/^#/, "");
            if (!hash) {
                return;
            }
            window.setTimeout(() => {
                document.getElementById(hash)?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 80);
        };

        scrollToHash();
        window.addEventListener("hashchange", scrollToHash);
        return () => window.removeEventListener("hashchange", scrollToHash);
    }, [url]);

    return (
        <div className="min-h-screen s4-surface-dark">
            <SeoHead seo={seo} />

            <section className="relative overflow-hidden border-b border-s4/40">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,95,116,0.45),_transparent_55%)]" />
                <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">
                        <Radio className="h-3.5 w-3.5" />
                        Zurriola · Donostia
                    </div>
                    <h1 className="max-w-3xl font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-[2.65rem] lg:leading-tight">
                        Webcam Zurriola en directo y previsión de surf
                    </h1>
                    <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
                        Comprueba olas y viento en la playa de la Zurriola antes de entrar al agua. Parte
                        del día, forecast y señal oficial de Gipuzkoa.
                    </p>
                </div>
            </section>

            {/* 1) Webcam primero */}
            <section id="webcam-directo" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-6 sm:px-6 sm:pt-8">
                <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <h2 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
                                Señal en directo
                            </h2>
                            <span className="hidden text-slate-600 sm:inline" aria-hidden>
                                ·
                            </span>
                            <p className="text-xs text-slate-400 sm:text-sm">
                                Usa el zoom para acercarte a la rompiente.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <SharePageButton
                            variant="dark"
                            label="Compartir webcam"
                            title="Webcam Zurriola en directo · S4"
                            text="Señal en directo de la playa de la Zurriola (Donostia)."
                            path={`${route("servicios.webcams")}#webcam-directo`}
                        />
                        <p className="shrink-0 text-left text-[11px] leading-snug text-slate-500 sm:text-right sm:text-xs lg:max-w-[17rem]">
                            <a
                                href={GIPUZKOA_WEBCAM_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-medium text-cyan-400/90 hover:text-cyan-300"
                            >
                                Fuente oficial Gipuzkoa
                                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
                            </a>
                        </p>
                    </div>
                </div>

                <ZurriolaWebcamPlayer />

                <div className="mt-3 flex justify-start sm:mt-4">
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
                        {weatherLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : null}
                        {weatherOpen ? "Ocultar tiempo" : "Ver tiempo"}
                        {!weatherOpen &&
                        weatherData?.hourly?.[0]?.temperature_c != null ? (
                            <span className="hidden sm:inline">
                                · {Math.round(weatherData.hourly[0].temperature_c)}°
                            </span>
                        ) : null}
                    </button>
                </div>

                <WeatherDetailPanel
                    panelId={WEATHER_PANEL_ID}
                    open={weatherOpen}
                    data={weatherData}
                    loading={weatherLoading}
                    error={weatherError}
                />
            </section>

            {/* 2) Forecast justo debajo */}
            <section
                id={FORECAST_ANCHOR_ID}
                className="mx-auto max-w-6xl scroll-mt-24 space-y-4 px-4 pt-3 pb-8 sm:px-6 sm:pt-4 sm:pb-10"
            >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <h2 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
                        Previsión de olas en Zurriola
                    </h2>
                    <Link
                        href={route("taller.show", FORECAST_GUIDE_ARTICLE_SLUG)}
                        className="inline-flex w-fit items-center gap-1 text-sm font-medium text-cyan-400/90 transition hover:text-cyan-300"
                    >
                        Cómo interpretar el parte
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    </Link>
                </div>
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

                <SurfBriefCard brief={surfBrief} />
            </section>

            <ZurriolaGeoGuide facts={zurriolaGeo} />
        </div>
    );
}
