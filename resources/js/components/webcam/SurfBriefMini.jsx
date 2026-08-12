import React, { useId, useState } from "react";
import { Link } from "@inertiajs/react";
import {
    ArrowRight,
    BookOpenCheck,
    CalendarRange,
    ChevronDown,
    Loader2,
} from "lucide-react";
import WaveCrestIcon from "../icons/WaveCrestIcon";
import { surfBriefOverrideMeta } from "./surfBriefOverride";
import SurfLevelAccordion from "./SurfLevelAccordion";
import SurfBriefLevelBlocks from "./SurfBriefLevelBlocks";
import SurfBriefParteCta from "./SurfBriefParteCta";
import { SURF_LEVELS } from "./surfLevels";
import SurfDetailedForecastSlider from "./SurfDetailedForecastSlider";
import useDetailedForecast from "./useDetailedForecast";

function BriefShell({ children, className = "" }) {
    return (
        <section className={`mt-8 sm:mt-10 ${className}`} aria-labelledby="parte-s4-heading">
            <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-s4 sm:text-[11px]">
                    Solo en S4 · Referente de iniciación
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <h2
                        id="parte-s4-heading"
                        className="font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
                    >
                        Parte S4 · Zurriola hoy
                    </h2>
                    <p className="text-xs text-slate-500 sm:text-sm">
                        Traducimos olas, viento y energía a un lenguaje claro — pensado para iniciación y para quien consulta Zurriola antes de salir.
                    </p>
                </div>
            </div>
            {children}
        </section>
    );
}

/** Miniatura del forecast → página webcam/parte (#prevision-forecast). El detalle abre el botón inferior. */
function ForecastMiniPreview({ waveM }) {
    const hours = ["06", "08", "10", "12", "14"];
    const waveHint =
        typeof waveM === "number" && Number.isFinite(waveM)
            ? waveM.toFixed(2)
            : "0.4";
    const parteForecastHref = `${route("servicios.webcams")}#prevision-forecast`;

    return (
        <Link
            href={parteForecastHref}
            aria-label="Ir al forecast en la página del Parte S4"
            className="group relative block w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950 text-left shadow-inner transition hover:border-cyan-500/40 hover:ring-1 hover:ring-cyan-400/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
        >
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-slate-950 to-transparent sm:w-20" />
            <div className="px-2.5 py-2 sm:px-3">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-300/80">
                        Forecast
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-200/90 opacity-90 transition group-hover:opacity-100">
                        <CalendarRange className="h-3 w-3" aria-hidden />
                        Ver parte
                    </span>
                </div>
                <div className="grid grid-cols-[auto_repeat(5,minmax(0,1fr))] gap-x-1 gap-y-1 text-[8px] leading-none text-slate-400 sm:text-[9px]">
                    <span className="pr-1 font-semibold text-slate-500">HORA</span>
                    {hours.map((h) => (
                        <span key={h} className="text-center font-medium text-slate-300">
                            {h}
                        </span>
                    ))}
                    <span className="pr-1 text-slate-500">Oleaje</span>
                    {hours.map((h, i) => (
                        <span key={`w-${h}`} className="text-center font-semibold text-white">
                            {i === 0 ? `${waveHint}m` : "··"}
                        </span>
                    ))}
                    <span className="pr-1 text-slate-500">Energía</span>
                    {hours.map((h) => (
                        <span
                            key={`e-${h}`}
                            className="mx-auto inline-flex h-3.5 min-w-[1.35rem] items-center justify-center rounded bg-emerald-500/25 px-0.5 font-bold text-emerald-200"
                        >
                            ·
                        </span>
                    ))}
                    <span className="pr-1 text-slate-500">Viento</span>
                    {hours.map((h) => (
                        <span key={`v-${h}`} className="text-center text-emerald-300/90">
                            ↗
                        </span>
                    ))}
                </div>
            </div>
        </Link>
    );
}

function LevelParagraphs({ sections, signalStatus }) {
    if (!sections) return null;
    const hasAny = SURF_LEVELS.some((lvl) => sections[lvl.level]);
    if (!hasAny) return null;
    return (
        <SurfBriefLevelBlocks
            summarySections={sections}
            signalStatus={signalStatus}
            showGuideLink
        />
    );
}

export default function SurfBriefMini({ brief }) {
    const [expanded, setExpanded] = useState(false);
    const expandId = useId();
    const panelId = useId();

    const {
        open,
        days,
        loading,
        error,
        weatherOk,
        weatherMessage,
        openDetailed,
        closeDetailed,
    } = useDetailedForecast();

    if (brief?.status === "generating") {
        return (
            <BriefShell>
                <Link
                    href={route("servicios.webcams")}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50 to-white px-4 py-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md sm:px-5 sm:py-5"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-s4 text-white shadow-sm">
                            <BookOpenCheck className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">
                                {brief.message || "Generando el parte de hoy…"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                En unos segundos tendrás el resumen claro de Zurriola.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-s4" />
                </Link>
            </BriefShell>
        );
    }

    if (!brief?.has_data) {
        return null;
    }

    const signalMeta = brief.signal?.status ? surfBriefOverrideMeta(brief.signal.status) : null;
    const badgeTone = signalMeta?.miniTone || "bg-slate-50 text-slate-700 ring-slate-200";
    const badgeLabel = signalMeta?.badge || "Condiciones del día";
    const sections = brief.summary_sections || null;
    const generalText = sections?.general || brief.summary;
    const hasLevels = Boolean(
        sections?.iniciacion || sections?.intermedio || sections?.avanzado,
    );

    return (
        <BriefShell>
            <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-cyan-500/10">
                <div className="border-b border-cyan-100/80 bg-gradient-to-r from-[#0f5f74]/[0.07] via-cyan-50/60 to-transparent px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-s4 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            <BookOpenCheck className="h-3 w-3" aria-hidden />
                            Resumen de expertos
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${badgeTone}`}
                        >
                            {badgeLabel}
                            {brief.signal?.is_manual ? (
                                <span className="ml-1 opacity-80">· S4</span>
                            ) : null}
                        </span>
                    </div>
                </div>

                <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,14rem)] sm:items-start sm:gap-5 sm:p-5">
                    <div className="min-w-0">
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f5f74] text-white shadow-sm">
                                <WaveCrestIcon
                                    className="h-5 w-5"
                                    decorative={false}
                                    title="Ola · Parte S4 Zurriola"
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                    Hoy en Zurriola
                                </p>
                                <p
                                    id={expandId}
                                    className={`mt-1 text-sm leading-relaxed text-slate-700 sm:text-[15px] ${
                                        expanded ? "" : "line-clamp-3 sm:line-clamp-2"
                                    }`}
                                >
                                    {generalText}
                                </p>
                                {hasLevels || generalText ? (
                                    <button
                                        type="button"
                                        onClick={() => setExpanded((v) => !v)}
                                        aria-expanded={expanded}
                                        aria-controls={expandId}
                                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-s4 transition hover:text-cyan-800"
                                    >
                                        {expanded ? "Leer menos" : "Leer más"}
                                        <ChevronDown
                                            className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`}
                                            aria-hidden
                                        />
                                    </button>
                                ) : null}
                            </div>
                        </div>

                        {expanded ? (
                            <div className="mt-1 border-t border-slate-100 pt-1">
                                {sections?.aviso ? (
                                    <p
                                        className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200"
                                        role="alert"
                                    >
                                        {sections.aviso}
                                    </p>
                                ) : null}
                                <LevelParagraphs
                                    sections={sections}
                                    signalStatus={brief.signal?.status}
                                />
                                <div className="mt-3">
                                    <SurfBriefParteCta
                                        signalStatus={brief.signal?.status}
                                        className="w-full sm:w-auto"
                                    />
                                </div>
                                <SurfLevelAccordion />
                                <p className="mt-3">
                                    <Link
                                        href={route("servicios.webcams")}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 underline-offset-2 hover:text-s4 hover:underline"
                                    >
                                        Ver webcam y Parte S4 completo
                                        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                                    </Link>
                                </p>
                            </div>
                        ) : null}
                    </div>

                    <ForecastMiniPreview waveM={brief.wave?.height_m} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
                    <p className="text-[11px] text-slate-500">
                        Oleaje + tiempo cada 2h · todos los días
                    </p>
                    <button
                        type="button"
                        onClick={openDetailed}
                        aria-expanded={open}
                        aria-controls={panelId}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0f5f74] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0d4a5c]"
                    >
                        {loading && open ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                            <CalendarRange className="h-4 w-4" aria-hidden />
                        )}
                        Ver forecast al detalle
                    </button>
                </div>
            </div>

            <SurfDetailedForecastSlider
                panelId={panelId}
                open={open}
                days={days}
                loading={loading}
                error={error}
                weatherOk={weatherOk}
                weatherMessage={weatherMessage}
                onClose={closeDetailed}
                webcamAnchorId="webcam-directo"
                brief={brief}
            />
        </BriefShell>
    );
}
