import React, { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import AccordionTrigger from "../ui/AccordionTrigger";
import { SURF_LEVELS } from "./surfLevels";

const LEVEL_BORDER = {
    iniciacion: "border-emerald-500",
    intermedio: "border-sky-500",
    avanzado: "border-rose-500",
};

function LevelGuide({ level }) {
    const border = LEVEL_BORDER[level.level] || "border-slate-300";
    return (
        <div className={`border-l-4 ${border} py-1 pl-3`}>
            <p className="text-sm font-semibold leading-snug text-slate-900">
                {level.label}
                <span className="font-medium text-slate-600"> · {level.title}</span>
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-slate-700">{level.body}</p>
            <p className="mt-1.5 text-xs font-medium italic text-slate-500">{level.next}</p>
        </div>
    );
}

/**
 * Guía fija de niveles S4 (no es el parte del día).
 * Un solo disclosure; los tres niveles se leen al abrir.
 */
export default function SurfLevelAccordion() {
    const [open, setOpen] = useState(false);
    const panelId = useId();

    return (
        <div className="mt-5 border-t border-slate-200/80 pt-3">
            <AccordionTrigger
                open={open}
                onToggle={() => setOpen((v) => !v)}
                panelId={panelId}
                className="flex w-full min-h-[44px] items-center justify-between gap-3 rounded-xl py-2 text-left text-sm font-semibold text-slate-800 transition hover:text-s4"
            >
                <span className="flex min-w-0 items-start gap-2">
                    <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0">
                        <span className="block">¿No sabes tu nivel?</span>
                        <span className="mt-0.5 block text-xs font-normal text-slate-500">
                            Guía fija de la escuela — no cambia con el parte de hoy.
                        </span>
                    </span>
                </span>
            </AccordionTrigger>

            <div
                id={panelId}
                hidden={!open}
                role="region"
                aria-label="Guía de niveles de la escuela"
                className="mt-3 space-y-4"
            >
                {SURF_LEVELS.map((lvl) => (
                    <LevelGuide key={lvl.level} level={lvl} />
                ))}
            </div>
        </div>
    );
}
