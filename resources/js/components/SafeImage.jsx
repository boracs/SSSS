import React, { useState } from "react";

/**
 * Imagen con fallback elegante: degradado de marca (brand-deep) si falla la carga.
 * Evita huecos rotos y mejora la estabilidad de assets.
 */
export default function SafeImage({
    src,
    alt = "",
    className = "",
    placeholderClassName = "",
    ...props
}) {
    const [errored, setErrored] = useState(false);

    if (errored || !src) {
        return (
            <div
                className={`flex items-center justify-center bg-gradient-to-br from-brand-deep to-brand-deep/80 text-white ${placeholderClassName} ${className}`}
                role="img"
                aria-label={alt || "Imagen no disponible"}
            >
                <svg
                    className="h-12 w-12 opacity-60"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={alt}
            className={className}
            onError={() => setErrored(true)}
            loading="lazy"
            {...props}
        />
    );
}
