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
 */
export default function SponsorsStrip({
    variant = "dark",
    className = "",
    showTitle = true,
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
    const markClass =
        "mx-auto flex h-6 w-auto max-w-[88px] items-center justify-center sm:h-9 sm:max-w-[120px] [&_img]:h-full [&_img]:w-auto [&_img]:max-w-full [&_img]:object-contain";

    return (
        <section className={className} aria-label="Patrocinadores y colaboradores">
            {showTitle ? (
                <p
                    className={`text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px] ${
                        isDark ? "text-cyan-300/80" : "text-[#0f5f74]"
                    }`}
                >
                    Patrocinadores y colaboradores
                </p>
            ) : null}

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
                            className={markClass}
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
