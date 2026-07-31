import React from "react";

const OPEN_METEO_LOGO = {
    white: {
        webp: "/img/sponsors/open-meteo/open-meteo-mark.webp",
        png: "/img/sponsors/open-meteo/open-meteo-mark.png",
        width: 231,
        height: 110,
    },
};

export default function OpenMeteoLogo({ variant = "white", className = "", height }) {
    const asset = OPEN_METEO_LOGO[variant] ?? OPEN_METEO_LOGO.white;
    const h = height ?? asset.height;

    return (
        <picture className={className}>
            <source srcSet={asset.webp} type="image/webp" />
            <img
                src={asset.png}
                alt="Open-Meteo · Datos meteorológicos y marinos"
                width={asset.width}
                height={h}
                className="h-auto max-w-full object-contain"
                loading="lazy"
                decoding="async"
            />
        </picture>
    );
}
