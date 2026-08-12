import React, { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { SURF_LEVELS } from "./surfLevels";

function LevelBody({ level }) {
    return (
        <div className="mt-2 rounded-xl bg-slate-50/90 p-3 ring-1 ring-slate-900/5">
            <p className="text-sm font-semibold leading-snug text-slate-900">
                {level.label}
                <span className="font-medium text-slate-600"> · {level.title}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">{level.body}</p>
            <p className="mt-2 text-xs font-medium italic text-slate-500">{level.next}</p>
        </div>
    );
}

/**
 * Guía fija de niveles S4 (no es el parte del día).
 */
export default function SurfLevelAccordion() {
    const [open, setOpen] = useState(null);
    const active = SURF_LEVELS.find((l) => l.level === open) || null;

    return (
        <div className="mt-5 border-t border-slate-200/80 pt-4">
            <div className="mb-3 flex items-start gap-2">
                <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
                        ¿No sabes tu nivel?
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-slate-400">
                        Guía fija de la escuela — no cambia con el parte de hoy.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {SURF_LEVELS.map((lvl) => {
                    const isOpen = open === lvl.level;
                    return (
                        <React.Fragment key={lvl.level}>
                            <button
                                type="button"
                                onClick={() => setOpen(isOpen ? null : lvl.level)}
                                aria-expanded={isOpen}
                                aria-controls={`nivel-${lvl.level}-panel`}
                                className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition ${
                                    isOpen ? lvl.activeClass : lvl.idleClass
                                }`}
                            >
                                <span>
                                    <span className="block">{lvl.label}</span>
                                    <span className="mt-0.5 block text-[10px] font-medium opacity-75">
                                        {lvl.title}
                                    </span>
                                </span>
                                <ChevronDown
                                    className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`}
                                    aria-hidden
                                />
                            </button>

                            {isOpen ? (
                                <div
                                    id={`nivel-${lvl.level}-panel`}
                                    className="sm:hidden"
                                    role="region"
                                    aria-label={lvl.label}
                                >
                                    <LevelBody level={lvl} />
                                </div>
                            ) : null}
                        </React.Fragment>
                    );
                })}
            </div>

            {active ? (
                <div
                    id={`nivel-${active.level}-panel-desktop`}
                    className="hidden sm:block"
                    role="region"
                    aria-label={active.label}
                >
                    <LevelBody level={active} />
                </div>
            ) : null}
        </div>
    );
}
