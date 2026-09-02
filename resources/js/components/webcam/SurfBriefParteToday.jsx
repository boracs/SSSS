import React from "react";
import { Link } from "@inertiajs/react";
import { Clock, Video, Waves } from "lucide-react";
import SurfBriefReactions from "./SurfBriefReactions";
import SurfLevelAccordion from "./SurfLevelAccordion";
import SurfBriefLevelBlocks from "./SurfBriefLevelBlocks";
import SurfBriefParteCta from "./SurfBriefParteCta";
import SharePageButton from "../SharePageButton";
import { surfBriefOverrideMeta } from "./surfBriefOverride";

function UnifiedAlert({ note }) {
    if (!note) return null;
    return (
        <p
            className="mb-3 rounded-xl bg-slate-900/[0.04] px-3 py-2 text-sm font-medium text-slate-800 ring-1 ring-slate-900/5"
        >
            {note}
        </p>
    );
}

function ParteHeading({ updatedAtHuman }) {
    return (
        <div className="min-w-0">
            <h2
                id="parte-s4-hoy-heading"
                className="font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
            >
                Parte S4 · Hoy
            </h2>
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {updatedAtHuman
                    ? `Monitor S4 · Actualizado ${updatedAtHuman}`
                    : "Monitor S4"}
            </p>
        </div>
    );
}

/**
 * Bloque público «Parte S4 · Hoy» (forecast + guía de niveles + feedback).
 */
export default function SurfBriefParteToday({
    summary,
    summarySections = null,
    summaryStatus = null,
    summaryMessage = null,
    updatedAtHuman,
    signal = null,
    reactions = null,
    hideCta = false,
}) {
    const signalMeta = signal?.status ? surfBriefOverrideMeta(signal.status) : null;
    const hasStructured =
        Boolean(summarySections?.iniciacion) ||
        Boolean(summarySections?.intermedio) ||
        Boolean(summarySections?.avanzado);
    const generalText = summarySections?.general || summary;

    if (!summary) {
        return (
            <div
                id="parte-s4-hoy"
                className="mt-4 scroll-mt-24 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-md sm:mt-5 sm:p-5 md:p-6"
            >
                <ParteHeading updatedAtHuman={updatedAtHuman} />
                <p className="mt-3 text-sm font-medium text-slate-800">
                    {summaryStatus === "generating"
                        ? summaryMessage || "Generando el parte de hoy…"
                        : "El parte de hoy aún no está disponible."}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                    {summaryStatus === "generating"
                        ? "Recarga la página en unos segundos."
                        : "Mientras tanto puedes consultar la webcam o las clases."}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Link
                        href={`${route("servicios.webcams")}#webcam-directo`}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-s4 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-s4-hover"
                    >
                        <Video className="h-4 w-4 shrink-0" aria-hidden />
                        Ver webcam en directo
                    </Link>
                    <Link
                        href={route("servicios.surf")}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-s4 transition hover:bg-slate-50"
                    >
                        <Waves className="h-4 w-4 shrink-0" aria-hidden />
                        Clases de surf
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <article
            id="parte-s4-hoy"
            className={`mt-4 scroll-mt-24 rounded-2xl border p-4 shadow-md sm:mt-5 sm:p-5 md:p-6 ${
                signalMeta ? signalMeta.tableWrap : "border-slate-200/90 bg-white"
            }`}
            aria-labelledby="parte-s4-hoy-heading"
        >
            <header className="mb-4">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                    <ParteHeading updatedAtHuman={updatedAtHuman} />
                    <SharePageButton
                        variant="light"
                        label="Compartir"
                        title="Parte S4 de hoy · Zurriola"
                        text="Resumen del monitor S4 para surfear en Zurriola (Donostia)."
                        path={`${route("servicios.webcams")}#parte-s4-hoy`}
                    />
                </div>
                {signalMeta || summarySections?.aviso ? (
                    <p
                        className={`mt-3 inline-flex max-w-full items-center rounded-xl px-3 py-2 text-xs font-bold leading-none sm:text-sm ${
                            signalMeta?.tableBadge || "bg-slate-100 text-slate-800"
                        }`}
                    >
                        {[
                            signalMeta?.badge,
                            signal?.is_manual ? "S4" : null,
                            summarySections?.aviso,
                        ]
                            .filter(Boolean)
                            .join(" · ")}
                    </p>
                ) : null}
            </header>

            <UnifiedAlert note={signal?.note} />

            {generalText ? (
                <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Resumen del día
                    </h3>
                    <p className="mt-1.5 text-[15px] font-normal leading-relaxed text-slate-800 sm:text-base">
                        {generalText}
                    </p>
                </div>
            ) : null}

            {hasStructured ? (
                <SurfBriefLevelBlocks summarySections={summarySections} />
            ) : null}

            {hideCta ? null : (
                <SurfBriefParteCta signalStatus={signal?.status} className="mt-3 w-full sm:w-auto" />
            )}

            <SurfLevelAccordion />
            <SurfBriefReactions initial={reactions} />
        </article>
    );
}
