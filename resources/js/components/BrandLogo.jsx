import React from "react";

/** Rutas optimizadas generadas por scripts/generate-brand-assets.mjs */
export const BRAND_LOGO = {
    whiteNav: {
        webp: "/img/brand/logo-white-nav.webp",
        png: "/img/brand/logo-white-nav.png",
        width: 66,
        height: 44,
    },
    whiteHero: {
        webp: "/img/brand/logo-white-hero.webp",
        png: "/img/brand/logo-white-hero.png",
        width: 252,
        height: 168,
    },
    whiteMark: {
        webp: "/img/brand/logo-white-mark.webp",
        png: "/img/brand/logo-white-mark.png",
        width: 132,
        height: 88,
    },
    navyNav: {
        webp: "/img/brand/logo-navy-nav.webp",
        png: "/img/brand/logo-navy-nav.png",
        width: 66,
        height: 44,
    },
    navyHero: {
        webp: "/img/brand/logo-navy-hero.webp",
        png: "/img/brand/logo-navy-hero.png",
        width: 252,
        height: 168,
    },
    navyMark: {
        webp: "/img/brand/logo-navy-mark.webp",
        png: "/img/brand/logo-navy-mark.png",
        width: 132,
        height: 88,
    },
};

const ALT = "San Sebastián Surf School · Donostia";

/**
 * @param {"whiteNav"|"whiteHero"|"whiteMark"|"navyNav"|"navyHero"|"navyMark"} variant
 */
export default function BrandLogo({
    variant = "whiteNav",
    className = "",
    priority = false,
    decorative = false,
}) {
    const asset = BRAND_LOGO[variant] ?? BRAND_LOGO.whiteNav;

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
