import React from "react";

/** Guía visual del flujo alumno: ver → apuntarse/pagar → confirmación */
function AcademyFlowSteps({ activeStep = 1 }) {
    const steps = [
        { n: 1, label: "Ver clase" },
        { n: 2, label: "Apuntarse" },
        { n: 3, label: "Confirmación" },
    ];

    return (
        <nav aria-label="Pasos para reservar" className="mb-6">
            <ol className="flex items-center justify-center gap-1 sm:gap-2">
                {steps.map((step, index) => {
                    const done = activeStep > step.n;
                    const current = activeStep === step.n;
                    return (
                        <li key={step.n} className="flex items-center gap-1 sm:gap-2">
                            {index > 0 ? (
                                <span
                                    aria-hidden
                                    className={[
                                        "mx-0.5 h-px w-4 sm:w-8",
                                        done || current ? "bg-s4-cyan/60" : "bg-slate-700",
                                    ].join(" ")}
                                />
                            ) : null}
                            <span
                                className={[
                                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs",
                                    current
                                        ? "bg-s4/30 text-cyan-100 ring-1 ring-s4-cyan/50"
                                        : done
                                          ? "bg-emerald-500/15 text-emerald-200"
                                          : "bg-slate-800/80 text-slate-500",
                                ].join(" ")}
                            >
                                <span
                                    className={[
                                        "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                                        current
                                            ? "bg-s4-cyan text-slate-950"
                                            : done
                                              ? "bg-emerald-400 text-slate-950"
                                              : "bg-slate-700 text-slate-300",
                                    ].join(" ")}
                                >
                                    {done ? "✓" : step.n}
                                </span>
                                <span className="whitespace-nowrap">{step.label}</span>
                            </span>
                        </li>
                    );
                })}
            </ol>
            <p className="mt-2 text-center text-[11px] text-slate-500 sm:text-xs">
                {activeStep === 1 && "Elige una clase del listado y pulsa apuntarte."}
                {activeStep === 2 && "Completa el grupo y el pago. No cierres la ventana a medias."}
                {activeStep === 3 && "Listo. Revisa el aviso verde: tu plaza quedó registrada."}
            </p>
        </nav>
    );
}

export default AcademyFlowSteps;
