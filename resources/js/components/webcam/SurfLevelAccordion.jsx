import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SURF_LEVELS } from "./surfLevels";

function LevelBody({ level }) {
    return (
        <div className={`mt-2 rounded-xl p-3 ring-1 ${level.labelClass}`}>
            <p className="text-sm font-semibold leading-snug text-slate-900">
                {level.label}
                <span className="font-medium text-slate-600"> · {level.title}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-800">{level.body}</p>
            <p className="mt-2 text-xs font-medium italic text-slate-600">{level.next}</p>
        </div>
    );
}

/**
 * Guía fija "¿Cuál es mi nivel?".
 * Desktop: 3 cabeceras en fila + un panel a todo el ancho.
 * Móvil: acordeón vertical (panel bajo su cabecera).
 */
export default function SurfLevelAccordion() {
    const [open, setOpen] = useState(null);
    const active = SURF_LEVELS.find((l) => l.level === open) || null;

    return (
        <div className="mt-4 border-t border-slate-900/10 pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                ¿Cuál es mi nivel?
            </p>

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
                                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
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
