import React from "react";
import { Link } from "@inertiajs/react";
import { ArrowRight, Gauge, Waves, Wind } from "lucide-react";

const LEVEL_TONES = {
    iniciacion: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    intermedio: "bg-sky-50 text-sky-700 ring-sky-200",
    avanzado: "bg-amber-50 text-amber-700 ring-amber-200",
    no_recomendado: "bg-rose-50 text-rose-700 ring-rose-200",
};

const OVERRIDE_TONES = {
    closed: "bg-rose-50 text-rose-700 ring-rose-200",
    caution: "bg-amber-50 text-amber-700 ring-amber-200",
    good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const OVERRIDE_LABELS = {
    closed: "Cerrado por la escuela",
    caution: "Precaución",
    good: "Confirmado por la escuela",
};

export default function SurfBriefMini({ brief }) {
    if (!brief?.has_data) {
        return null;
    }

    const badgeTone = brief.override ? OVERRIDE_TONES[brief.override.status] : LEVEL_TONES[brief.level?.value] || LEVEL_TONES.no_recomendado;
    const badgeLabel = brief.override ? OVERRIDE_LABELS[brief.override.status] : brief.level?.label;

    return (
        <section className="mt-6" aria-label="Parte de surf de Zurriola">
            <Link
                href={route("servicios.webcams")}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#0f5f74]/10 text-[#0f5f74]">
                        <Waves className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Parte S4 · Zurriola hoy</p>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${badgeTone}`}>
                                {badgeLabel}
                            </span>
                        </div>
                        <p className="mt-1 line-clamp-1 max-w-md text-sm text-slate-600">{brief.summary}</p>
                    </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-5">
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                        <Waves className="h-4 w-4 text-cyan-600" />
                        <span className="font-semibold">{brief.wave.height_m} m</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-700">
                        <Wind className="h-4 w-4 text-cyan-600" />
                        <span className="font-semibold">{brief.wind.speed_kmh} km/h</span>
                    </div>
                    <div className="hidden items-center gap-1.5 text-sm text-slate-700 sm:flex">
                        <Gauge className="h-4 w-4 text-cyan-600" />
                        <span className="font-semibold">{brief.energy.label}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                </div>
            </Link>
        </section>
    );
}
