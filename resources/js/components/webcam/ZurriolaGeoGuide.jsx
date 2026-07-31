import React from "react";
import { Clock3, Waves } from "lucide-react";
import S4Button from "../S4Button";

/**
 * Bloque GEO citables Zurriola (props desde ZurriolaGeoFactsService).
 * Sin lógica de negocio: solo render de hechos públicos.
 */
export default function ZurriolaGeoGuide({ facts = null }) {
    if (!facts || typeof facts !== "object") {
        return null;
    }

    const place = facts.place ?? {};
    const school = facts.school_to_beach ?? {};
    const seasons = Array.isArray(facts.seasons) ? facts.seasons : [];
    const windows = Array.isArray(facts.summer_windows) ? facts.summer_windows : [];
    const bands = Array.isArray(facts.energy_bands) ? facts.energy_bands : [];
    const faqs = Array.isArray(facts.faqs) ? facts.faqs : [];
    const operations = facts.operations ?? {};
    const material = facts.material ?? {};
    const meters = school.meters ?? 20;

    return (
        <section
            id="zurriola-guia"
            className="mx-auto max-w-6xl scroll-mt-24 space-y-8 px-4 pb-14 sm:px-6"
            aria-labelledby="zurriola-geo-heading"
        >
            <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300/80">
                    Guía local S4
                </p>
                <h2
                    id="zurriola-geo-heading"
                    className="mt-1 font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl"
                >
                    Zurriola: lugar, temporada y cómo venir a clase
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                    {facts.description}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-100">Lugar</h3>
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-300">
                        <li>
                            <span className="text-slate-500">Playa:</span> {place.beach_name}
                        </li>
                        <li>
                            <span className="text-slate-500">Localidad:</span> {place.locality}
                        </li>
                        <li>
                            <span className="text-slate-500">Orientación:</span>{" "}
                            {place.orientation_label}
                        </li>
                        <li>
                            <span className="text-slate-500">Rompiente:</span> {place.break_type}
                        </li>
                    </ul>
                    {place.break_note ? (
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">{place.break_note}</p>
                    ) : null}
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-100">
                        Escuela ↔ playa
                    </h3>
                    <p className="mt-3 text-3xl font-extrabold tracking-tight text-white">
                        {meters}
                        <span className="ml-1 text-base font-semibold text-slate-400">m</span>
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{school.label}</p>
                    {facts.consistency_note ? (
                        <p className="mt-3 text-xs leading-relaxed text-slate-500">
                            {facts.consistency_note}
                        </p>
                    ) : null}
                </article>

                <article className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:col-span-2 lg:col-span-1">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-cyan-100">
                        <Clock3 className="h-3.5 w-3.5" aria-hidden />
                        Día de clase
                    </h3>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{operations.text}</p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{material.text}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <S4Button href={route("servicios.surf")} size="sm">
                            Ver clases
                        </S4Button>
                        <S4Button href={route("contacto")} variant="secondary" size="sm">
                            Contacto
                        </S4Button>
                    </div>
                </article>
            </div>

            {seasons.length > 0 ? (
                <div>
                    <h3 className="font-heading text-lg font-bold text-white">Temporada en Zurriola</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {seasons.map((season) => (
                            <article
                                key={season.id || season.title}
                                className="rounded-2xl border border-white/10 bg-slate-950/40 p-4"
                            >
                                <h4 className="text-sm font-semibold text-cyan-100">{season.title}</h4>
                                <p className="mt-2 text-sm leading-relaxed text-slate-400">{season.body}</p>
                            </article>
                        ))}
                    </div>
                    {windows.length > 0 ? (
                        <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                            <p className="text-xs font-bold uppercase tracking-wide text-cyan-200">
                                Franjas orientativas en verano
                            </p>
                            <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
                                {windows.map((w) => (
                                    <li key={w.label}>
                                        <span className="font-semibold text-white">{w.label}:</span>{" "}
                                        {w.range}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {bands.length > 0 ? (
                <div>
                    <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-white">
                        <Waves className="h-5 w-5 text-cyan-300" aria-hidden />
                        Niveles según energía (kJ)
                    </h3>
                    {facts.levels_intro ? (
                        <p className="mt-2 max-w-3xl text-sm text-slate-400">{facts.levels_intro}</p>
                    ) : null}
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
                        <table className="min-w-full text-left text-sm">
                            <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Energía</th>
                                    <th className="px-4 py-3 font-semibold">Iniciación</th>
                                    <th className="px-4 py-3 font-semibold">Intermedio</th>
                                    <th className="px-4 py-3 font-semibold">Avanzado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10 text-slate-300">
                                {bands.map((band) => (
                                    <tr key={band.range_label} className="align-top">
                                        <td className="px-4 py-3 font-semibold text-white">
                                            {band.range_label}
                                        </td>
                                        <td className="px-4 py-3">{band.iniciacion}</td>
                                        <td className="px-4 py-3">{band.intermedio}</td>
                                        <td className="px-4 py-3">{band.avanzado}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : null}

            {faqs.length > 0 ? (
                <article className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-cyan-100">
                        Preguntas frecuentes
                    </h3>
                    <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                        {faqs.map((faq) => (
                            <div key={faq.question}>
                                <dt className="text-sm font-semibold text-white">{faq.question}</dt>
                                <dd className="mt-1 text-sm leading-relaxed text-slate-400">
                                    {faq.answer}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </article>
            ) : null}

            {facts.disclaimer ? (
                <p className="text-xs leading-relaxed text-slate-500">{facts.disclaimer}</p>
            ) : null}
        </section>
    );
}
