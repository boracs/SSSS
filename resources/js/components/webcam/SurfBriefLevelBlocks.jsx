import React from "react";
import { Link } from "@inertiajs/react";
import { BookOpenText } from "lucide-react";
import { FORECAST_GUIDE_ARTICLE_SLUG } from "./surfMetricHelp";
import { SURF_LEVELS, surfLevelMeta } from "./surfLevels";

const LEVEL_BORDER = {
    iniciacion: "border-emerald-500",
    intermedio: "border-sky-500",
    avanzado: "border-rose-500",
};

/**
 * Bloques por nivel del parte (los tres siempre visibles: SEO/GEO).
 * Sin «Recomendado hoy»: el día puede valer para más de un nivel.
 */
export default function SurfBriefLevelBlocks({
    summarySections,
    showGuideLink = true,
}) {
    const hasAny = SURF_LEVELS.some((lvl) => summarySections?.[lvl.level]);
    if (!hasAny) return null;

    return (
        <section className="mt-4 space-y-3" aria-label="Para tu nivel hoy">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Para tu nivel · hoy</h3>
                {showGuideLink ? (
                    <Link
                        href={route("taller.show", FORECAST_GUIDE_ARTICLE_SLUG)}
                        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-s4 underline-offset-2 hover:underline"
                    >
                        <BookOpenText className="h-4 w-4 shrink-0" aria-hidden />
                        Cómo interpretar el parte
                    </Link>
                ) : null}
            </div>

            <div className="space-y-3">
                {SURF_LEVELS.map((lvl) => {
                    const text = summarySections?.[lvl.level];
                    if (!text) return null;
                    const border = LEVEL_BORDER[lvl.level] || "border-slate-300";
                    const meta = surfLevelMeta(lvl.level);
                    return (
                        <div
                            key={lvl.level}
                            className={`rounded-r-lg border-l-4 ${border} px-3 py-2.5`}
                        >
                            <p className="text-sm font-semibold text-slate-800">
                                {meta?.label ?? lvl.label}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-700 sm:text-[15px]">
                                {text}
                            </p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
