import React, { useEffect, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { BookOpenText, Camera, Sparkles, X } from "lucide-react";
import { surfBriefOverrideMeta } from "./surfBriefOverride";
import { SURF_LEVELS } from "./surfLevels";

function firstLevelWithText(sections) {
    const found = SURF_LEVELS.find((lvl) => Boolean(sections?.[lvl.level]));
    return found?.level ?? null;
}

/** Quita emoji decorativo al inicio del general (solo presentación del modal). */
function stripLeadingEmoji(text) {
    if (!text || typeof text !== "string") return text;
    return text.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u, "").trimStart();
}

/**
 * Estilos de tab solo para ParteHoyModal (más contraste activo / idle suave).
 * No muta SURF_LEVELS → no afecta SurfLevelAccordion.
 */
const MODAL_TAB_STYLES = {
    iniciacion: {
        idle: "border border-emerald-100 bg-emerald-50/40 text-emerald-800/80 hover:bg-emerald-50/70",
        active:
            "border-2 border-emerald-500 bg-emerald-100 text-emerald-950 shadow-sm ring-2 ring-emerald-300/60",
    },
    intermedio: {
        idle: "border border-sky-100 bg-sky-50/40 text-sky-800/80 hover:bg-sky-50/70",
        active:
            "border-2 border-sky-500 bg-sky-100 text-sky-950 shadow-sm ring-2 ring-sky-300/60",
    },
    avanzado: {
        idle: "border border-rose-100 bg-rose-50/40 text-rose-800/80 hover:bg-rose-50/70",
        active:
            "border-2 border-rose-500 bg-rose-100 text-rose-950 shadow-sm ring-2 ring-rose-300/60",
    },
};

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
 * Modal ligero encima del sheet (no segundo bottom-sheet).
 * Desktop: más ancho para reducir scroll. Niveles: 3 botones en fila;
 * solo se muestra el texto del nivel activo (menos scroll en móvil).
 */
function ParteHoyModal({ open, onClose, brief }) {
    const sections = brief?.summary_sections || null;
    const levelsWithText = SURF_LEVELS.filter((lvl) => Boolean(sections?.[lvl.level]));
    const [activeLevel, setActiveLevel] = useState(null);

    useEffect(() => {
        if (!open) return;
        setActiveLevel(firstLevelWithText(brief?.summary_sections) ?? null);
    }, [open, brief]);

    if (!open) return null;

    const signalMeta = brief?.signal?.status
        ? surfBriefOverrideMeta(brief.signal.status)
        : null;
    const generalRaw = sections?.general || brief?.summary || "";
    const general = stripLeadingEmoji(generalRaw);
    const updated = brief?.generated_at_human?.split(" ")[1] || null;
    const hasLevels = levelsWithText.length > 0;
    const hasContent = Boolean(general || hasLevels);
    const activeText = activeLevel ? sections?.[activeLevel] : null;
    const activeMeta = SURF_LEVELS.find((lvl) => lvl.level === activeLevel) || null;

    return (
        <div
            className="absolute inset-0 z-[40] flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-[2px] sm:items-center sm:p-5 md:p-8"
            role="presentation"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Parte S4 de hoy"
                className="flex max-h-[min(85dvh,42rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-cyan-200/40 bg-white shadow-2xl sm:max-h-[min(82vh,40rem)] sm:max-w-2xl md:max-w-3xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
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

                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-5">
                    {signalMeta ? (
                        <span
                            className={`mb-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${signalMeta.tableBadge}`}
                        >
                            {signalMeta.badge}
                            {brief?.signal?.is_manual ? (
                                <span className="ml-1.5 opacity-80">· S4</span>
                            ) : null}
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

                            {hasLevels ? (
                                <div>
                                    <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                                        Tu nivel
                                    </p>
                                    <div
                                        className="grid grid-cols-3 gap-1.5 sm:gap-2"
                                        role="tablist"
                                        aria-label="Nivel del parte"
                                    >
                                        {levelsWithText.map((lvl) => {
                                            const isActive = activeLevel === lvl.level;
                                            const tabStyle = MODAL_TAB_STYLES[lvl.level] ?? {
                                                idle: lvl.idleClass,
                                                active: lvl.activeClass,
                                            };
                                            return (
                                                <button
                                                    key={lvl.level}
                                                    type="button"
                                                    role="tab"
                                                    aria-selected={isActive}
                                                    aria-controls="parte-nivel-panel"
                                                    id={`parte-tab-${lvl.level}`}
                                                    onClick={() => setActiveLevel(lvl.level)}
                                                    className={`rounded-xl px-2 py-2.5 text-center transition sm:px-3 sm:py-3 ${
                                                        isActive ? tabStyle.active : tabStyle.idle
                                                    }`}
                                                >
                                                    <span className="block text-[11px] font-bold uppercase tracking-wide sm:text-xs">
                                                        {lvl.label}
                                                    </span>
                                                    <span className="mt-0.5 hidden text-[10px] font-medium leading-snug opacity-80 sm:block">
                                                        {lvl.title}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {activeText && activeMeta ? (
                                        <div
                                            id="parte-nivel-panel"
                                            role="tabpanel"
                                            aria-labelledby={`parte-tab-${activeMeta.level}`}
                                            className="mt-3 rounded-xl bg-slate-50/80 px-3 py-3 ring-1 ring-slate-200/80 sm:px-4 sm:py-3.5"
                                        >
                                            <span
                                                className={`mb-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${activeMeta.labelClass}`}
                                            >
                                                {activeMeta.label}
                                            </span>
                                            <p className="text-sm leading-7 text-slate-800 sm:text-[15px] sm:leading-7">
                                                {activeText}
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}

                            {sections?.aviso ? (
                                <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 ring-1 ring-amber-200">
                                    {sections.aviso}
                                </p>
                            ) : null}
                        </div>
                    )}
                </div>

                <div className="shrink-0 border-t border-slate-100 px-4 py-2.5 sm:px-6">
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
 * Footer compartido de sheets SurfConditions:
 * [Ver parte de hoy] + [Ver webcam] + modal del parte.
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

    useEffect(() => {
        if (!sheetOpen) setParteOpen(false);
    }, [sheetOpen]);

    useEffect(() => {
        if (!parteOpen) return undefined;

        const onKeyDown = (event) => {
            if (event.key !== "Escape") return;
            event.stopImmediatePropagation();
            setParteOpen(false);
        };
        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [parteOpen]);

    return (
        <>
            <div className="relative z-10 shrink-0 border-t border-white/10 bg-slate-950 px-3 py-2 sm:px-6 sm:py-2.5">
                <div className="flex flex-col items-center gap-1.5">
                    <div className="flex w-full max-w-md flex-row items-stretch justify-center gap-2">
                        {canShowParte ? (
                            <button
                                type="button"
                                onClick={() => setParteOpen(true)}
                                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-semibold tracking-wide text-cyan-100 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 sm:flex-none sm:px-4 sm:text-xs"
                            >
                                <BookOpenText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                Ver parte de hoy
                            </button>
                        ) : null}
                        <WebcamFooterButton webcamAnchorId={webcamAnchorId} />
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
        </>
    );
}
