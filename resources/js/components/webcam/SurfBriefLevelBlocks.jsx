import React from "react";
import { Link } from "@inertiajs/react";
import { BookOpenText } from "lucide-react";
import { FORECAST_GUIDE_ARTICLE_SLUG } from "./surfMetricHelp";
import { surfBriefRecommendedLevel } from "./surfBriefCta";
import { SURF_LEVELS, surfLevelMeta } from "./surfLevels";
import { useSurfLevelPreference } from "./useSurfLevelPreference";

const LEVEL_BORDER = {
    iniciacion: "border-emerald-500",
    intermedio: "border-sky-500",
    avanzado: "border-rose-500",
};

function sortLevels(levels, pref, recommended) {
    const order = levels.slice();
    const highlight = pref || recommended;
    if (!highlight) return order;
    return order.sort((a, b) => {
        if (a.level === highlight) return -1;
        if (b.level === highlight) return 1;
        return 0;
    });
}

function LevelPicker({ pref, onPick }) {
    return (
        <div
            className="flex flex-wrap items-center gap-2"
            role="group"
            aria-label="Filtrar por tu nivel"
        >
            <span className="text-[11px] font-medium text-slate-500">Mi nivel:</span>
            {SURF_LEVELS.map((lvl) => {
                const active = pref === lvl.level;
                return (
                    <button
                        key={lvl.level}
                        type="button"
                        onClick={() => onPick(active ? null : lvl.level)}
                        aria-pressed={active}
                        className={`min-h-[36px] rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                            active ? lvl.activeClass : lvl.idleClass
                        }`}
                    >
                        {lvl.label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Bloques por nivel del parte + selector opcional (localStorage).
 */
export default function SurfBriefLevelBlocks({
    summarySections,
    signalStatus = null,
    showGuideLink = true,
}) {
    const [pref, setPref] = useSurfLevelPreference();
    const recommended = surfBriefRecommendedLevel(signalStatus);

    const hasAny = SURF_LEVELS.some((lvl) => summarySections?.[lvl.level]);
    if (!hasAny) return null;

    const sorted = sortLevels(SURF_LEVELS, pref, recommended);

    const visible = pref
        ? sorted.filter((lvl) => lvl.level === pref)
        : sorted;

    return (
        <section className="mt-4 space-y-3" aria-label="Recomendación por nivel hoy">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                        Para tu nivel · hoy
                    </h3>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                        Criterio del monitor — cambia cada mañana.
                    </p>
                </div>
                {showGuideLink ? (
                    <Link
                        href={route("taller.show", FORECAST_GUIDE_ARTICLE_SLUG)}
                        className="inline-flex min-h-[36px] items-center gap-1.5 text-[11px] font-semibold text-[#0f5f74] underline-offset-2 hover:underline"
                    >
                        <BookOpenText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Cómo interpretar el parte
                    </Link>
                ) : null}
            </div>

            <LevelPicker pref={pref} onPick={setPref} />

            <div className="space-y-2.5">
                {visible.map((lvl) => {
                    const text = summarySections?.[lvl.level];
                    if (!text) return null;
                    const border = LEVEL_BORDER[lvl.level] || "border-slate-300";
                    const meta = surfLevelMeta(lvl.level);
                    const isRecommended = recommended === lvl.level;
                    const isMine = pref === lvl.level;
                    return (
                        <div
                            key={lvl.level}
                            className={`rounded-r-lg border-l-4 ${border} bg-white/70 px-3 py-2.5 ring-1 ring-slate-900/5 ${
                                isRecommended || isMine ? "ring-2 ring-[#0f5f74]/20" : ""
                            }`}
                        >
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                    {meta?.label ?? lvl.label}
                                </p>
                                {isRecommended ? (
                                    <span className="rounded-full bg-[#0f5f74]/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#0f5f74]">
                                        Recomendado hoy
                                    </span>
                                ) : null}
                                {isMine && !isRecommended ? (
                                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-600">
                                        Tu nivel
                                    </span>
                                ) : null}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-slate-800 sm:text-[15px]">
                                {text}
                            </p>
                        </div>
                    );
                })}
            </div>

            {pref ? (
                <button
                    type="button"
                    onClick={() => setPref(null)}
                    className="text-[11px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
                >
                    Ver los tres niveles
                </button>
            ) : null}
        </section>
    );
}
