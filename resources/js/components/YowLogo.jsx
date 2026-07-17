import React from "react";

const YOW_LOGO = {
    white: {
        svg: "/img/sponsors/yow/yow-logo-white.svg",
        width: 120,
        height: 34,
    },
};

export default function YowLogo({ variant = "white", className = "", height }) {
    const asset = YOW_LOGO[variant] ?? YOW_LOGO.white;
    const h = height ?? asset.height;

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
