import React, { useEffect, useRef, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { BookOpenText, Camera, CircleHelp, Sparkles, X } from "lucide-react";
import { surfBriefOverrideMeta } from "./surfBriefOverride";
import {
    FORECAST_GUIDE_ARTICLE_SLUG,
    SURF_METRIC_HELP_ITEMS,
    splitHelpParagraphs,
} from "./surfMetricHelp";
import { useGrowSheetForNested } from "./ForecastSheetFrame";
import SurfBriefLevelBlocks from "./SurfBriefLevelBlocks";

function stripLeadingEmoji(text) {
    if (!text || typeof text !== "string") return text;
    return text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").trimStart();
}

const WEBCAMS_PATH = "/servicios/webcams";

function WebcamFooterButton({ webcamAnchorId }) {
    const { url } = usePage();
    const onWebcamsPage = typeof url === "string" && url.startsWith(WEBCAMS_PATH);
    const hashHref = `${route("servicios.webcams")}#${webcamAnchorId}`;

    const scrollToWebcam = (event) => {
        if (!onWebcamsPage) {
            return;
        }
        event.preventDefault();
        document.getElementById(webcamAnchorId)?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    return (
        <Link
            href={hashHref}
            onClick={scrollToWebcam}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-600/90 px-3.5 py-2 text-[11px] font-semibold tracking-wide text-white shadow-sm transition hover:border-cyan-300/50 hover:bg-cyan-500 sm:flex-none sm:px-4 sm:text-xs"
        >
            <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Ver webcam
        </Link>
    );
}

/**
 * Modal ligero encima del sheet. Mismos bloques de nivel que el parte público.
 */
function ParteHoyModal({ open, onClose, brief }) {
    const overlayRef = useRef(null);
    const bodyRef = useRef(null);
    useGrowSheetForNested(open, overlayRef, bodyRef);

    if (!open) return null;

    const sections = brief?.summary_sections || null;
    const signalMeta = brief?.signal?.status
        ? surfBriefOverrideMeta(brief.signal.status)
        : null;
    const generalRaw = sections?.general || brief?.summary || "";
    const general = stripLeadingEmoji(generalRaw);
    const updated = brief?.generated_at_human || null;
    const hasContent = Boolean(general || sections?.iniciacion || sections?.intermedio || sections?.avanzado);

    return (
        <div
            ref={overlayRef}
            className="absolute inset-0 z-[40] flex min-h-0 items-end justify-center overflow-hidden bg-slate-950/70 p-3 backdrop-blur-[2px] sm:p-5 md:p-8"
            role="presentation"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Parte S4 de hoy"
                className="flex min-h-0 max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-cyan-200/40 bg-white shadow-2xl sm:max-w-2xl md:max-w-3xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    data-nested-header
                    className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6"
                >
                    <div className="inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#0f5f74]">
                            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Parte S4 · Hoy
                        </div>
                        {updated ? (
                            <span className="text-[11px] font-medium leading-none normal-case tracking-normal text-slate-500">
                                (Actualizado {updated})
                            </span>
                        ) : null}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar parte de hoy"
                        className="shrink-0 rounded-full border border-slate-200 p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                </div>

                <div className="min-h-0 overflow-y-auto">
                    <div ref={bodyRef} className="px-4 py-3 sm:px-6 sm:py-5">
                    {signalMeta || sections?.aviso ? (
                        <span
                            className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold leading-none ${
                                signalMeta?.tableBadge || "bg-slate-100 text-slate-800"
                            }`}
                        >
                            {[
                                signalMeta?.badge,
                                brief?.signal?.is_manual ? "S4" : null,
                                sections?.aviso,
                            ]
                                .filter(Boolean)
                                .join(" · ")}
                        </span>
                    ) : null}

                    {brief?.signal?.note ? (
                        <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-800">
                            {brief.signal.note}
                        </p>
                    ) : null}

                    {!hasContent ? (
                        <p className="text-sm text-slate-600">
                            El parte de hoy aún no está disponible.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {general ? (
                                <p className="text-sm font-semibold leading-7 text-slate-900 sm:text-[15px] sm:leading-7">
                                    {general}
                                </p>
                            ) : null}

                            <SurfBriefLevelBlocks
                                summarySections={sections}
                                showGuideLink={false}
                            />
                        </div>
                    )}
                    </div>
                </div>

                <div
                    data-nested-footer
                    className="shrink-0 border-t border-slate-100 px-4 py-2.5 sm:px-6"
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl bg-[#0f5f74] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d5568]"
                    >
                        Seguir con el forecast
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Modal: glosario técnico de métricas (mismo texto que las «?» de la tabla).
 * CTA al artículo del Taller en lenguaje sencillo.
 */
function InterpretarParteModal({ open, onClose }) {
    const overlayRef = useRef(null);
    const bodyRef = useRef(null);
    useGrowSheetForNested(open, overlayRef, bodyRef);

    if (!open) return null;

    const articleHref = route("taller.show", FORECAST_GUIDE_ARTICLE_SLUG);

    return (
        <div
            ref={overlayRef}
            className="absolute inset-0 z-[40] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-[2px] sm:p-5 md:p-8"
            role="presentation"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="interpretar-parte-title"
                className="flex min-h-0 max-h-full w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-cyan-200/40 bg-white shadow-2xl sm:max-w-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div
                    data-nested-header
                    className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6"
                >
                    <div>
                        <h2
                            id="interpretar-parte-title"
                            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#0f5f74]"
                        >
                            <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Cómo interpretar el parte
                        </h2>
                        <p className="mt-1 text-[11px] text-slate-500 sm:text-xs">
                            Misma guía técnica que las «?» de la tabla · Zurriola
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Cerrar guía de interpretación"
                        className="rounded-full border border-slate-200 p-1.5 text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>
                </div>

                <div className="min-h-0 overflow-y-auto">
                    <div ref={bodyRef} className="px-4 py-3 sm:px-6 sm:py-4">
                    <div className="space-y-3">
                        {SURF_METRIC_HELP_ITEMS.map((item) => (
                            <article
                                key={item.id}
                                className="rounded-xl border border-slate-200/90 bg-slate-50/70 px-3.5 py-3 sm:px-4"
                            >
                                <h3 className="text-[11px] font-bold uppercase tracking-widest text-cyan-800">
                                    {item.label}
                                </h3>
                                <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-700">
                                    {splitHelpParagraphs(item.text).map((para, idx) => (
                                        <p key={idx}>{para}</p>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="mt-4 rounded-xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50 to-white p-3.5 sm:p-4">
                        <p className="text-sm font-semibold leading-snug text-slate-900">
                            ¿No te quedó claro? ¿Quieres saber cómo influye cada cosa en un lenguaje
                            sencillo?
                        </p>
                        <Link
                            href={articleHref}
                            onClick={onClose}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f5f74] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0d5568] sm:w-auto"
                        >
                            <BookOpenText className="h-4 w-4 shrink-0" aria-hidden />
                            Leer la guía del Taller
                        </Link>
                    </div>
                    </div>
                </div>

                <div
                    data-nested-footer
                    className="shrink-0 border-t border-slate-100 px-4 py-2.5 sm:px-6"
                >
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Seguir con el forecast
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Footer compartido de sheets SurfConditions:
 * [Ver parte de hoy] + [Ver webcam] + [Cómo interpretar] + modales.
 * El sheet padre debe ser `relative` para el overlay del modal.
 */
export default function SurfForecastSheetFooter({
    brief: briefProp = null,
    webcamAnchorId = "webcam-directo",
    sheetOpen = true,
    hint = "La webcam de arriba sigue activa · cierra con la X si quieres",
}) {
    const page = usePage();
    const brief = briefProp ?? page?.props?.surfBrief ?? null;
    const canShowParte =
        Boolean(brief?.has_data) ||
        Boolean(brief?.summary) ||
        Boolean(brief?.summary_sections?.general);

    const [parteOpen, setParteOpen] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);

    useEffect(() => {
        if (!sheetOpen) {
            setParteOpen(false);
            setGuideOpen(false);
        }
    }, [sheetOpen]);

    useEffect(() => {
        if (!parteOpen && !guideOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            event.stopImmediatePropagation();
            if (guideOpen) {
                setGuideOpen(false);
                return;
            }
            setParteOpen(false);
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [parteOpen, guideOpen]);

    const openParte = () => {
        setGuideOpen(false);
        setParteOpen(true);
    };

    const openGuide = () => {
        setParteOpen(false);
        setGuideOpen(true);
    };

    return (
        <>
            <div className="relative z-10 shrink-0 border-t border-white/10 bg-slate-950 px-3 py-2 sm:px-6 sm:py-2.5">
                <div className="flex flex-col items-center gap-1.5">
                    <div className="flex w-full max-w-lg flex-row flex-wrap items-stretch justify-center gap-2">
                        {canShowParte ? (
                            <button
                                type="button"
                                onClick={openParte}
                                className="inline-flex min-w-[9.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold tracking-wide text-cyan-100 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 sm:flex-none sm:px-4 sm:text-xs"
                            >
                                <BookOpenText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Ver parte de hoy
                            </button>
                        ) : null}
                        <WebcamFooterButton webcamAnchorId={webcamAnchorId} />
                        <button
                            type="button"
                            onClick={openGuide}
                            className="inline-flex min-w-[9.5rem] flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold tracking-wide text-cyan-100 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 sm:flex-none sm:px-4 sm:text-xs"
                        >
                            <CircleHelp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Cómo interpretar el parte
                        </button>
                    </div>
                    {hint ? (
                        <p className="hidden text-center text-[10px] text-slate-500 sm:block">
                            {hint}
                        </p>
                    ) : null}
                </div>
            </div>

            <ParteHoyModal
                open={parteOpen}
                onClose={() => setParteOpen(false)}
                brief={brief}
            />
            <InterpretarParteModal open={guideOpen} onClose={() => setGuideOpen(false)} />
        </>
    );
}
