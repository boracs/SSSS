import defaultTheme from "tailwindcss/defaultTheme";
import forms from "@tailwindcss/forms";

/**
 * Surf Premium — Sistema de diseño nivel élite.
 * brand-deep #0d234d, brand-accent #06b6d4, brand-bg #f8fafc.
 * Escala tipográfica 1.25 (Major Third). Z-index: toasts 999, modales 90, dropdowns 80, header 70.
 */
/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./resources/js/**/*.{js,jsx,ts,tsx}",
        "./resources/css/**/*.css",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Inter", "Poppins", ...defaultTheme.fontFamily.sans],
                heading: ["Inter", "Montserrat", ...defaultTheme.fontFamily.sans],
                editorial: ["Georgia", "Cambria", "Times New Roman", "serif"],
            },
            fontSize: {
                "scale-xs": ["0.64rem", { lineHeight: "1.25" }],
                "scale-sm": ["0.8rem", { lineHeight: "1.375" }],
                "scale-base": ["1rem", { lineHeight: "1.625" }],
                "scale-lg": ["1.25rem", { lineHeight: "1.5" }],
                "scale-xl": ["1.563rem", { lineHeight: "1.4" }],
                "scale-2xl": ["1.953rem", { lineHeight: "1.3" }],
                "scale-3xl": ["2.441rem", { lineHeight: "1.25" }],
                "scale-4xl": ["3.052rem", { lineHeight: "1.2" }],
            },
            colors: {
                brand: {
                    deep: "#0d234d",
                    accent: "#06b6d4",
                    bg: "#f8fafc",
                    primary: "#0d234d",
                    action: "#06b6d4",
                    surface: "#f8fafc",
                },
                ocean: {
                    primary: "#0d234d",
                    accent: "#06b6d4",
                    "accent-light": "#22d3ee",
                },
                surf: {
                    primary: "#0d234d",
                    secondary: "#06b6d4",
                    accent: "#06b6d4",
                    sand: "#f8fafc",
                },
            },
            zIndex: {
                header: "70",
                dropdown: "80",
                modal: "90",
                toast: "999",
            },
            maxWidth: {
                "7xl": "80rem",
            },
            borderRadius: {
                custom: "2rem",
            },
            transitionDuration: {
                ui: "300",
            },
            transitionTimingFunction: {
                ui: "cubic-bezier(0.4, 0, 0.2, 1)",
            },
            keyframes: {
                "wave-float": {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-4px)" },
                },
                "pulse-soft": {
                    "0%, 100%": { opacity: "1" },
                    "50%": { opacity: "0.85" },
                },
                "fade-in-down": {
                    "0%": { opacity: "0", transform: "translateY(-8px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
            },
            animation: {
                "wave-float": "wave-float 3s ease-in-out infinite",
                "pulse-soft": "pulse-soft 2s ease-in-out infinite",
                "fade-in-down": "fade-in-down 0.2s ease-out forwards",
            },
        },
    },
    plugins: [forms],
};
