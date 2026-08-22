import React, { useMemo } from "react";
import { usePage } from "@inertiajs/react";
import BunkerLogo from "./BunkerLogo";
import YowLogo from "./YowLogo";
import GipuzkoaLogo from "./GipuzkoaLogo";
import OpenMeteoLogo from "./OpenMeteoLogo";

/** Orden visual footer (sin subgrupos visibles). */
const STRIP_ORDER = ["bunker", "yow", "gipuzkoa", "open_meteo"];

function SponsorMark({ logo, logoVariant, className, strip = false }) {
    if (logo === "bunker") {
        // whiteMark/nav son oscuros sobre negro: solo sponsorStrip funciona en footer navy.
        return (
            <BunkerLogo variant="sponsorStrip" className={className} />
        );
    }
    if (logo === "yow") {
        return <YowLogo variant="color" className={className} />;
    }
    if (logo === "gipuzkoa") {
        return <GipuzkoaLogo variant="white" className={className} />;
    }
    if (logo === "open_meteo") {
        return <OpenMeteoLogo variant="white" className={className} />;
    }
    return null;
}

function sponsorLabel(sponsor) {
    return sponsor.tagline ? `${sponsor.name} — ${sponsor.tagline}` : sponsor.name;
}

function orderStripSponsors(items) {
    const byLogo = Object.fromEntries(items.map((item) => [item.logo, item]));
    const ordered = STRIP_ORDER.map((id) => byLogo[id]).filter(Boolean);
    const known = new Set(STRIP_ORDER);
    const extras = items.filter((item) => !known.has(item.logo));
    return [...ordered, ...extras];
}

/**
 * Bloque reutilizable de patrocinadores (footer, home, etc.).
 * layout="strip" → franja horizontal de logos (footer oscuro).
 * layout="grid" → tarjetas en rejilla (legacy / superficies claras).
 */
export default function SponsorsStrip({
    variant = "dark",
    layout = "grid",
    className = "",
    showTitle = true,
    title = "Colaboradores",
    logoVariant,
}) {
    const { sponsors = [] } = usePage().props;
    const items = Array.isArray(sponsors) ? sponsors.filter((s) => s?.active !== false) : [];

    const stripItems = useMemo(() => orderStripSponsors(items), [items]);

    if (items.length === 0) {
        return null;
    }

    const isDark = variant === "dark";
    const resolvedLogoVariant =
        logoVariant ?? (isDark ? "whiteMark" : "navyMark");

    const gridMarkClass =
        "mx-auto flex h-6 w-auto max-w-[88px] items-center justify-center sm:h-9 sm:max-w-[120px] [&_img]:h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain";

    /** Bunker usa wordmark horizontal (sponsorStrip); el resto, marks cuadrados. */
    const stripMarkClassFor = (logoId) => {
        if (logoId === "bunker") {
            return "pointer-events-none flex h-9 w-auto max-w-[9.5rem] items-center justify-center sm:h-10 sm:max-w-[11rem] [&_img]:max-h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain";
        }
        return "pointer-events-none flex h-8 w-auto max-w-[5.25rem] items-center justify-center sm:h-9 sm:max-w-[6.25rem] [&_img]:max-h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain";
    };

    const stripLinkClassFor = (logoId) => {
        const base =
            "group inline-flex min-h-11 items-center justify-center rounded-lg px-1 transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";
        if (logoId === "bunker") {
            return `${base} min-w-[7rem] opacity-90 hover:opacity-100 sm:min-w-[8rem]`;
        }
        return `${base} min-w-[4.5rem] opacity-[0.55] hover:opacity-100`;
    };

    const titleClass = `text-[11px] font-bold uppercase tracking-[0.16em] ${
        isDark ? "text-cyan-300/80" : "text-[#0f5f74]"
    }`;

    if (layout === "strip") {
        return (
            <section
                className={`min-w-0 ${className}`}
                aria-label="Colaboradores y tecnología"
            >
                {showTitle ? (
                    <p className={`${titleClass} text-center sm:text-left`}>{title}</p>
                ) : null}

                <ul
                    className={`flex min-w-0 flex-wrap items-center justify-center gap-x-8 gap-y-6 sm:justify-start md:gap-x-10 lg:justify-center lg:gap-x-12 ${
                        showTitle ? "mt-5 sm:mt-6" : ""
                    } max-w-[calc(100%-3.25rem)] sm:max-w-none`}
                >
                    {stripItems.map((sponsor) => {
                        const label = sponsorLabel(sponsor);
                        const mark = (
                            <SponsorMark
                                logo={sponsor.logo}
                                logoVariant={resolvedLogoVariant}
                                className={stripMarkClassFor(sponsor.logo)}
                                strip
                            />
                        );

                        return (
                            <li key={sponsor.id ?? sponsor.name} className="shrink-0">
                                {sponsor.url ? (
                                    <a
                                        href={sponsor.url}
                                        target="_blank"
                                        rel="noopener noreferrer sponsored"
                                        className={stripLinkClassFor(sponsor.logo)}
                                        aria-label={label}
                                        title={label}
                                    >
                                        {mark}
                                    </a>
                                ) : (
                                    <span
                                        className="inline-flex min-h-11 items-center opacity-55"
                                        title={label}
                                    >
                                        {mark}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    }

    return (
        <section className={className} aria-label={title}>
            {showTitle ? <p className={titleClass}>{title}</p> : null}

            <ul
                className={`grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 ${
                    showTitle ? "mt-2.5 sm:mt-4" : ""
                }`}
            >
                {items.map((sponsor) => {
                    const cardClass = `group flex h-full min-h-0 w-full flex-col items-center justify-center gap-0.5 rounded-lg border px-2.5 py-2.5 text-center transition sm:gap-1.5 sm:rounded-xl sm:px-3 sm:py-3 ${
                        isDark
                            ? "border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-white/[0.07]"
                            : "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-md"
                    }`;
                    const mark = (
                        <SponsorMark
                            logo={sponsor.logo}
                            logoVariant={resolvedLogoVariant}
                            className={gridMarkClass}
                        />
                    );
                    const tagline = sponsor.tagline ? (
                        <span
                            className={`mt-0.5 text-[10px] leading-tight sm:text-[11px] ${
                                isDark ? "text-slate-400" : "text-slate-500"
                            }`}
                        >
                            {sponsor.tagline}
                        </span>
                    ) : null;

                    return (
                        <li key={sponsor.id ?? sponsor.name} className="min-w-0">
                            {sponsor.url ? (
                                <a
                                    href={sponsor.url}
                                    target="_blank"
                                    rel="noopener noreferrer sponsored"
                                    className={cardClass}
                                    aria-label={`Visitar web de ${sponsor.name}`}
                                >
                                    {mark}
                                    {tagline}
                                </a>
                            ) : (
                                <div className={cardClass}>
                                    {mark}
                                    {tagline}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
