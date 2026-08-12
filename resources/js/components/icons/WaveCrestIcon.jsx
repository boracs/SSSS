import React from "react";

/**
 * Ola crestada minimalista (línea + spray) — SVG inline, sin asset externo.
 * @param {string} [title] — si se pasa, el SVG es informativo (role=img + <title> para a11y/SEO)
 * @param {boolean} [decorative=true] — omitir title y marcar aria-hidden (junto a cifras/UI)
 */
export default function WaveCrestIcon({
    className,
    title = "Ola · oleaje Zurriola",
    decorative = true,
    ...props
}) {
    const labelled = !decorative && Boolean(title);

    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            role={labelled ? "img" : undefined}
            aria-hidden={labelled ? undefined : true}
            aria-label={labelled ? title : undefined}
            {...props}
        >
            {labelled ? <title>{title}</title> : null}
            {/* Agua base */}
            <path d="M3 18.25c2.6-.85 5.4-.85 8 0" />
            {/* Cresta que se enrolla */}
            <path d="M2.5 14.5c3.2.1 5.2-1.2 7-3.6 1.6-2.2 3.1-4.2 5.6-4.6 2.1-.35 3.6.7 4 2.5.45 2-1.1 4.3-3.6 5.6-1.9 1-4.1 1.15-6.2.45" />
            {/* Spray / espuma */}
            <circle cx="19.6" cy="5.2" r="0.95" fill="currentColor" stroke="none" />
            <circle cx="21.35" cy="6.6" r="0.7" fill="currentColor" stroke="none" />
            <circle cx="20.35" cy="3.65" r="0.55" fill="currentColor" stroke="none" />
        </svg>
    );
}
