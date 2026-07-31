import React from "react";

const GIPUZKOA_LOGO = {
    white: {
        webp: "/img/sponsors/gipuzkoa/gipuzkoa-mark.webp",
        png: "/img/sponsors/gipuzkoa/gipuzkoa-mark.png",
        width: 217,
        height: 52,
    },
};

export default function GipuzkoaLogo({ variant = "white", className = "", height }) {
    const asset = GIPUZKOA_LOGO[variant] ?? GIPUZKOA_LOGO.white;
    const h = height ?? asset.height;

    return (
        <picture className={className}>
            <source srcSet={asset.webp} type="image/webp" />
            <img
                src={asset.png}
                alt="Diputación Foral de Gipuzkoa · Webcams de playas"
                width={asset.width}
                height={h}
                className="h-auto max-w-full object-contain"
                loading="lazy"
                decoding="async"
            />
        </picture>
    );
}
