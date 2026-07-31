import React from "react";
import { Link } from "@inertiajs/react";
import { ArrowRight, BookOpenCheck, Gauge, Waves, Wind } from "lucide-react";
import { surfBriefOverrideMeta } from "./surfBriefOverride";

function BriefShell({ children, className = "" }) {
    return (
        <section className={`mt-8 sm:mt-10 ${className}`} aria-labelledby="parte-s4-heading">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-s4 sm:text-[11px]">
                        Solo en S4 · Referente de iniciación
                    </p>
                    <h2
                        id="parte-s4-heading"
                        className="mt-1 font-heading text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl"
                    >
                        Parte S4 · Zurriola hoy
                    </h2>
                </div>
                <p className="max-w-md text-xs leading-relaxed text-slate-500 sm:text-right sm:text-sm">
                    Resumen del día redactado por el equipo para quien aún no interpreta bien el parte.
                </p>
            </div>
            {children}
        </section>
    );
}

export default function SurfBriefMini({ brief }) {
    if (brief?.status === "generating") {
        return (
            <BriefShell>
                <Link
                    href={route("servicios.webcams")}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-cyan-200/90 bg-gradient-to-br from-cyan-50 to-white px-4 py-4 shadow-sm transition hover:border-cyan-300 hover:shadow-md sm:px-5 sm:py-5"
                >
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-s4 text-white shadow-sm">
                            <BookOpenCheck className="h-5 w-5" aria-hidden />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-slate-800">
                                {brief.message || "Generando el parte de hoy…"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                En unos segundos tendrás el resumen claro de Zurriola.
                            </p>
                        </div>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-s4" />
                </Link>
            </BriefShell>
        );
    }

    if (!brief?.has_data) {
        return null;
    }

    const signalMeta = brief.signal?.status ? surfBriefOverrideMeta(brief.signal.status) : null;
    const badgeTone = signalMeta?.miniTone || "bg-slate-50 text-slate-700 ring-slate-200";
    const badgeLabel = signalMeta?.badge || "Condiciones del día";

    return (
        <BriefShell>
            <Link
                href={route("servicios.webcams")}
                className="group block overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-md ring-1 ring-cyan-500/10 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-lg"
            >
                <div className="border-b border-cyan-100/80 bg-gradient-to-r from-[#0f5f74]/[0.07] via-cyan-50/60 to-transparent px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-s4 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                            <BookOpenCheck className="h-3 w-3" aria-hidden />
                            Resumen de expertos
                        </span>
                        <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${badgeTone}`}
                        >
                            {badgeLabel}
                            {brief.signal?.is_manual ? (
                                <span className="ml-1 opacity-80">· S4</span>
                            ) : null}
                        </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                        Traducimos olas, viento y energía a un lenguaje claro — pensado para iniciación y
                        para quien consulta Zurriola antes de salir.
                    </p>
                </div>

                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
                    <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0f5f74] text-white shadow-sm">
                            <Waves className="h-6 w-6" aria-hidden />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                Hoy en Zurriola
                            </p>
                            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-slate-700 sm:line-clamp-2 sm:text-[15px]">
                                {brief.summary}
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0 sm:gap-5">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    <Waves className="h-3 w-3 text-cyan-600" aria-hidden />
                                    Ola
                                </span>
                                <span className="text-sm font-bold text-slate-800">
                                    {brief.wave.height_m} m
                                </span>
                            </div>
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    <Wind className="h-3 w-3 text-cyan-600" aria-hidden />
                                    Viento
                                </span>
                                <span className="text-sm font-bold text-slate-800">
                                    {brief.wind.speed_kmh} km/h
                                </span>
                            </div>
                            <div className="flex flex-col items-center sm:items-start">
                                <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    <Gauge className="h-3 w-3 text-cyan-600" aria-hidden />
                                    Energía
                                </span>
                                <span className="text-sm font-bold text-slate-800">
                                    {brief.energy.label}
                                </span>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-s4">
                            Ver parte
                            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </span>
                    </div>
                </div>
            </Link>
        </BriefShell>
    );
}
