import React from "react";

/** Rutas optimizadas generadas por scripts/generate-sponsor-assets.mjs */
export const BUNKER_LOGO = {
    whiteNav: {
        webp: "/img/sponsors/bunker/bunker-white-nav.webp",
        png: "/img/sponsors/bunker/bunker-white-nav.png",
        width: 54,
        height: 36,
    },
    whiteMark: {
        webp: "/img/sponsors/bunker/bunker-white-mark.webp",
        png: "/img/sponsors/bunker/bunker-white-mark.png",
        width: 96,
        height: 64,
    },
    whiteHero: {
        webp: "/img/sponsors/bunker/bunker-white-hero.webp",
        png: "/img/sponsors/bunker/bunker-white-hero.png",
        width: 180,
        height: 120,
    },
    navyNav: {
        webp: "/img/sponsors/bunker/bunker-navy-nav.webp",
        png: "/img/sponsors/bunker/bunker-navy-nav.png",
        width: 54,
        height: 36,
    },
    navyMark: {
        webp: "/img/sponsors/bunker/bunker-navy-mark.webp",
        png: "/img/sponsors/bunker/bunker-navy-mark.png",
        width: 96,
        height: 64,
    },
    navyHero: {
        webp: "/img/sponsors/bunker/bunker-navy-hero.webp",
        png: "/img/sponsors/bunker/bunker-navy-hero.png",
        width: 180,
        height: 120,
    },
};

const ALT = "The Bunker Surf Shop · Patrocinador oficial S4";

/**
 * @param {"whiteNav"|"whiteMark"|"whiteHero"|"navyNav"|"navyMark"|"navyHero"} variant
 */
export default function BunkerLogo({
    variant = "whiteMark",
    className = "",
    priority = false,
    decorative = false,
}) {
    const asset = BUNKER_LOGO[variant] ?? BUNKER_LOGO.whiteMark;

    return (
        <picture className={className}>
            <source srcSet={asset.webp} type="image/webp" />
            <img
                src={asset.png}
                alt={decorative ? "" : ALT}
                aria-hidden={decorative ? true : undefined}
                width={asset.width}
                height={asset.height}
                className="h-auto max-w-full object-contain"
                decoding="async"
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : undefined}
            />
        </picture>
    );
}
