import React from "react";
import { usePage } from "@inertiajs/react";
import BunkerLogo from "./BunkerLogo";
import YowLogo from "./YowLogo";
import GipuzkoaLogo from "./GipuzkoaLogo";
import OpenMeteoLogo from "./OpenMeteoLogo";

function SponsorMark({ logo, logoVariant, className }) {
    if (logo === "bunker") {
        return <BunkerLogo variant="sponsorStrip" className={className} />;
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

    if (items.length === 0) {
        return null;
    }

    const isDark = variant === "dark";
    const resolvedLogoVariant =
        logoVariant ?? (isDark ? "whiteMark" : "navyMark");

    const gridMarkClass =
        "mx-auto flex h-6 w-auto max-w-[88px] items-center justify-center sm:h-9 sm:max-w-[120px] [&_img]:h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain";

    const stripMarkClass =
        "flex h-7 w-auto max-w-[96px] items-center justify-center transition duration-200 group-hover:scale-[1.03] sm:h-9 sm:max-w-[128px] [&_img]:h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain";

    const titleClass = `shrink-0 text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px] ${
        isDark ? "text-cyan-300/75" : "text-[#0f5f74]"
    }`;

    if (layout === "strip") {
        return (
            <section className={className} aria-label={title}>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-8">
                        {showTitle ? <p className={titleClass}>{title}</p> : null}
                        <ul
                            className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-5 sm:flex-1 sm:justify-end lg:justify-center lg:gap-x-10 ${
                                showTitle ? "" : "w-full"
                            }`}
                        >
                            {items.map((sponsor) => {
                                const label = sponsor.tagline
                                    ? `${sponsor.name} — ${sponsor.tagline}`
                                    : sponsor.name;
                                const mark = (
                                    <SponsorMark
                                        logo={sponsor.logo}
                                        logoVariant={resolvedLogoVariant}
                                        className={stripMarkClass}
                                    />
                                );
                                const linkClass =
                                    "group inline-flex items-center opacity-75 transition-opacity duration-200 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 rounded-lg";

                                return (
                                    <li key={sponsor.id ?? sponsor.name}>
                                        {sponsor.url ? (
                                            <a
                                                href={sponsor.url}
                                                target="_blank"
                                                rel="noopener noreferrer sponsored"
                                                className={linkClass}
                                                aria-label={label}
                                                title={label}
                                            >
                                                {mark}
                                            </a>
                                        ) : (
                                            <span className="group inline-flex items-center opacity-75" title={label}>
                                                {mark}
                                            </span>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
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
