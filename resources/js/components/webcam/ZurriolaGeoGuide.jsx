import React from "react";
import { Link } from "@inertiajs/react";
import { Waves } from "lucide-react";

const MD_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Renderiza texto FAQ con enlaces markdown `[etiqueta](/ruta#ancla)`.
 * Sin lógica de negocio: solo presentación.
 */
function FaqAnswerText({ text }) {
    if (typeof text !== "string" || text === "") {
        return null;
    }

    const nodes = [];
    let lastIndex = 0;
    let match;
    let key = 0;
    const re = new RegExp(MD_LINK_RE.source, "g");

    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const label = match[1];
        const href = match[2];
        const internal = href.startsWith("/") || href.startsWith("#");
        nodes.push(
            internal ? (
                <Link
                    key={`faq-a-${key++}`}
                    href={href}
                    className="font-medium text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline"
                >
                    {label}
                </Link>
            ) : (
                <a
                    key={`faq-a-${key++}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-cyan-300/90 underline-offset-2 hover:text-cyan-200 hover:underline"
                >
                    {label}
                </a>
            ),
        );
        lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }

    return nodes.length > 0 ? nodes : text;
}

/**
 * Frase de lugar a partir de hechos GEO (sin inventar localidad ni barrio).
 */
function placeNarrative(place) {
    const beach = typeof place.beach_name === "string" ? place.beach_name.trim() : "";
    const locality = typeof place.locality === "string" ? place.locality.trim() : "";
    const breakType = typeof place.break_type === "string" ? place.break_type.trim() : "";
    const orientation =
        typeof place.orientation_label === "string" ? place.orientation_label.trim() : "";

    const parts = [];
    if (beach && locality) {
        parts.push(`La escuela está junto a la ${beach}, en ${locality}.`);
    } else if (beach) {
        parts.push(`La escuela está junto a la ${beach}.`);
    } else if (locality) {
        parts.push(`En ${locality}.`);
    }

    const traits = [];
    if (breakType) {
        traits.push(breakType);
    }
    if (orientation) {
        traits.push(`orientación ${orientation}`);
    }
    if (traits.length > 0) {
        parts.push(`${traits.join(", ")}.`);
    }

    return parts.join(" ");
}

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
    const meters = Number.isFinite(Number(school.meters)) ? Number(school.meters) : null;
    const placeText = placeNarrative(place);

    return (
        <section
            id="zurriola-guia"
            className="mx-auto max-w-6xl scroll-mt-24 space-y-8 px-4 pb-14 pt-10 sm:px-6 sm:pt-14"
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
                    Zurriola: lugar, temporada y condiciones
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
                    {facts.description}
                </p>
            </div>

            {placeText || meters !== null || facts.consistency_note ? (
                <article className="max-w-3xl border-l-2 border-cyan-400/40 pl-4 sm:pl-5">
                    <h3 className="font-heading text-xl font-bold tracking-tight text-white sm:text-2xl">
                        A pie de playa
                        {meters !== null ? (
                            <>
                                <span className="font-semibold text-slate-500"> · </span>
                                <span className="tabular-nums">{meters} m</span>
                            </>
                        ) : null}
                    </h3>
                    {placeText ? (
                        <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                            {placeText}
                        </p>
                    ) : null}
                    {facts.consistency_note ? (
                        <p className="mt-3 text-sm leading-relaxed text-slate-200 sm:text-base">
                            {facts.consistency_note}
                        </p>
                    ) : null}
                </article>
            ) : null}

            {seasons.length > 0 ? (
                <div id="zurriola-temporada" className="scroll-mt-24">
                    <h3 className="font-heading text-lg font-bold text-white">Temporada en Zurriola</h3>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
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
                                Mejores horas para surfear en verano
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
                    {/* Móvil: sin scroll horizontal — una franja = un bloque (marketing: menos fricción). */}
                    <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 md:hidden">
                        {bands.map((band) => (
                            <li key={band.range_label} className="bg-white/[0.02] px-3.5 py-3">
                                <p className="text-[13px] font-bold tabular-nums text-cyan-200">
                                    {band.range_label}
                                </p>
                                <dl className="mt-2.5 space-y-2 text-[11px] leading-snug text-slate-300">
                                    <div>
                                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            Iniciación
                                        </dt>
                                        <dd className="mt-0.5">{band.iniciacion}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            Intermedio
                                        </dt>
                                        <dd className="mt-0.5">{band.intermedio}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                            Avanzado
                                        </dt>
                                        <dd className="mt-0.5">{band.avanzado}</dd>
                                    </div>
                                </dl>
                            </li>
                        ))}
                    </ul>

                    {/* Desktop / tablet ancha: tabla clásica */}
                    <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-white/10 md:block">
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
                    {facts.energy_bands_note ? (
                        <p className="mt-3 max-w-3xl text-xs leading-relaxed text-slate-500 sm:text-sm">
                            {facts.energy_bands_note}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {faqs.length > 0 ? (
                <div>
                    <h3 className="font-heading text-lg font-bold text-white">
                        Preguntas frecuentes
                    </h3>
                    <dl className="mt-4 grid gap-5 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-6">
                        {faqs.map((faq) => (
                            <div key={faq.question}>
                                <dt className="text-sm font-semibold text-white">{faq.question}</dt>
                                <dd className="mt-1.5 text-sm leading-relaxed text-slate-400">
                                    <FaqAnswerText text={faq.answer} />
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ) : null}

            {facts.disclaimer || place.break_note ? (
                <div className="space-y-2 text-xs leading-relaxed text-slate-500">
                    {facts.disclaimer ? <p>{facts.disclaimer}</p> : null}
                    {place.break_note ? <p>{place.break_note}</p> : null}
                </div>
            ) : null}
        </section>
    );
}
