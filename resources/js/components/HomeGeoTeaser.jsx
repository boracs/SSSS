import React from "react";
import { Link } from "@inertiajs/react";
import { ArrowRight, MapPin } from "lucide-react";

/**
 * Teaser GEO citables en home — solo hechos de ZurriolaGeoFactsService.
 * Compacto (≤~150px móvil): viñetas + enlace a #zurriola-guia.
 */
export default function HomeGeoTeaser({ facts = null }) {
    if (!facts || typeof facts !== "object") {
        return null;
    }

    const place = facts.place ?? {};
    const school = facts.school_to_beach ?? {};
    const operations = facts.operations ?? {};

    const bullets = [
        school.label ||
            (school.meters
                ? `A pie de playa, a unos ${school.meters} metros de la Zurriola.`
                : null),
        place.beach_name && place.locality
            ? `${place.beach_name} · ${place.locality}`
            : place.beach_name || place.locality || null,
        place.orientation_label && place.break_type
            ? `${place.break_type} · orientación ${place.orientation_label}`
            : place.break_type || place.orientation_label || null,
        operations.arrive_minutes_before
            ? `Llega ${operations.arrive_minutes_before} min antes de clase (neopreno puesto).`
            : operations.text || null,
    ].filter(Boolean).slice(0, 4);

    if (bullets.length === 0) {
        return null;
    }

    const guideHref = `${route("servicios.webcams")}#zurriola-guia`;

    return (
        <section
            className="mt-10 max-h-[9.5rem] overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/90 px-3.5 py-3 sm:mt-12 sm:max-h-none sm:px-5 sm:py-4"
            aria-labelledby="home-geo-heading"
        >
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <div className="inline-flex min-w-0 items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-s4" aria-hidden />
                    <h2
                        id="home-geo-heading"
                        className="truncate text-xs font-bold uppercase tracking-[0.14em] text-slate-700 sm:text-[13px]"
                    >
                        Zurriola · hechos locales
                    </h2>
                </div>
                <Link
                    href={guideHref}
                    className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-s4 underline-offset-2 hover:underline sm:text-xs"
                >
                    Guía completa
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            </div>
            <ul className="mt-2 grid gap-1 text-[11px] leading-snug text-slate-600 sm:mt-2.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-1 sm:text-xs sm:leading-relaxed">
                {bullets.map((text) => (
                    <li key={text} className="truncate sm:whitespace-normal sm:line-clamp-2">
                        <span className="mr-1.5 text-cyan-600/80" aria-hidden>
                            ·
                        </span>
                        {text}
                    </li>
                ))}
            </ul>
        </section>
    );
}
