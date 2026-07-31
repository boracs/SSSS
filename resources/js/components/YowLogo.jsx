import React from "react";

const YOW_LOGO = {
    white: {
        webp: "/img/sponsors/yow/yow-logo-color.webp",
        png: "/img/sponsors/yow/yow-logo-color.png",
        svg: "/img/sponsors/yow/yow-logo-white.svg",
        width: 140,
        height: 80,
    },
    color: {
        webp: "/img/sponsors/yow/yow-logo-color.webp",
        png: "/img/sponsors/yow/yow-logo-color.png",
        width: 140,
        height: 80,
    },
};

export default function YowLogo({ variant = "color", className = "", height }) {
    const asset = YOW_LOGO[variant] ?? YOW_LOGO.color;
    const h = height ?? asset.height;

    if (asset.webp && asset.png) {
        return (
            <picture className={className}>
                <source srcSet={asset.webp} type="image/webp" />
                <img
                    src={asset.png}
                    alt="YOW Surfskate"
                    width={asset.width}
                    height={h}
                    className="h-auto max-w-full object-contain"
                    loading="lazy"
                    decoding="async"
                />
            </picture>
        );
    }

    return (
        <img
            src={asset.svg}
            alt="YOW Surfskate"
            width={asset.width}
            height={h}
            className={className}
            loading="lazy"
            decoding="async"
        />
    );
}
