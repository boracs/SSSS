import React from "react";
import { usePage } from "@inertiajs/react";
import BunkerLogo from "./BunkerLogo";

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

    return (
        <section
            className={`${className}`}
            aria-label="Patrocinadores oficiales"
        >
            {showTitle ? (
                <p
                    className={`text-[11px] font-bold uppercase tracking-[0.14em] ${
                        isDark ? "text-cyan-300/80" : "text-[#0f5f74]"
                    }`}
                >
                    Patrocinadores oficiales
                </p>
            ) : null}

            <ul className={`flex flex-wrap items-center gap-6 ${showTitle ? "mt-4" : ""}`}>
                {items.map((sponsor) => (
                    <li key={sponsor.id ?? sponsor.name}>
                        {sponsor.url ? (
                            <a
                                href={sponsor.url}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                className={`group inline-flex flex-col items-start gap-2 rounded-xl border p-3 transition ${
                                    isDark
                                        ? "border-white/10 bg-white/5 hover:border-cyan-400/30 hover:bg-white/[0.07]"
                                        : "border-slate-200 bg-white hover:border-cyan-300 hover:shadow-md"
                                }`}
                                aria-label={`Visitar web de ${sponsor.name}`}
                            >
                                {sponsor.logo === "bunker" ? (
                                    <BunkerLogo
                                        variant={resolvedLogoVariant}
                                        className="h-12 w-auto max-w-[200px] opacity-90 transition group-hover:opacity-100 sm:h-14"
                                    />
                                ) : null}
                                {sponsor.tagline ? (
                                    <span
                                        className={`text-xs ${
                                            isDark ? "text-slate-400" : "text-slate-500"
                                        }`}
                                    >
                                        {sponsor.tagline}
                                    </span>
                                ) : null}
                            </a>
                        ) : (
                            <div
                                className={`inline-flex rounded-xl border p-3 ${
                                    isDark
                                        ? "border-white/10 bg-white/5"
                                        : "border-slate-200 bg-white"
                                }`}
                            >
                                {sponsor.logo === "bunker" ? (
                                    <BunkerLogo
                                        variant={resolvedLogoVariant}
                                        className="h-12 w-auto max-w-[200px] sm:h-14"
                                    />
                                ) : null}
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}
