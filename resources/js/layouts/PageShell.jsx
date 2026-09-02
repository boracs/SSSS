import React from "react";

const GRADIENT = {
    dark: "bg-gradient-to-b from-slate-950 via-s4-surface-dark to-slate-950",
    night: "bg-gradient-to-b from-slate-950 via-s4-surface-dark-night to-slate-950",
    teal: "bg-gradient-to-b from-slate-950 via-s4-surface-dark-teal to-slate-950",
    royal: "bg-gradient-to-b from-slate-950 via-s4-surface-dark-royal to-slate-950",
    warm: "bg-gradient-to-b from-slate-950 via-s4-surface-dark-warm to-slate-950",
    coach: "bg-gradient-to-b from-slate-950 via-s4-surface-dark-coach to-slate-950",
};

const SOLID = {
    dark: "bg-s4-surface-dark",
    night: "bg-s4-surface-dark-night",
    teal: "bg-s4-surface-dark-teal",
    royal: "bg-s4-surface-dark-royal",
    warm: "bg-s4-surface-dark-warm",
    coach: "bg-s4-surface-dark-coach",
    slate: "bg-slate-950",
};

/**
 * Envoltorio único de página (C4). Sustituye Layout1 + divs de fondo sueltos.
 * PublicLayout ya renderiza el único <main>; PageShell solo pinta superficie.
 *
 * @param {boolean} transparent — sin fondo propio (p. ej. home/nosotros con hero a sangre).
 *   Light + transparent → solo color de texto; el hijo pinta el fondo.
 */
export default function PageShell({
    variant = "light",
    withGradient = false,
    transparent = false,
    className = "",
    children,
}) {
    let surface = "";

    if (transparent) {
        surface = variant === "light" ? "text-slate-900" : "text-white";
    } else if (variant === "light") {
        surface = withGradient
            ? "bg-gradient-to-b from-slate-100 via-white to-slate-100 text-slate-900"
            : "s4-surface-light";
    } else if (withGradient) {
        surface = `${GRADIENT[variant] ?? GRADIENT.dark} text-white`;
    } else if (SOLID[variant]) {
        surface = `${SOLID[variant]} text-white`;
    }

    return (
        <div
            className={`min-h-screen overflow-x-clip ${surface} ${className}`.trim()}
        >
            {children}
        </div>
    );
}
