import defaultTheme from "tailwindcss/defaultTheme";
import forms from "@tailwindcss/forms";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: "class",
    content: [
        "./resources/js/**/*.{js,jsx,ts,tsx}",
        "./resources/css/**/*.css",
        "./vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php",
        "./storage/framework/views/*.php",
        "./resources/views/**/*.blade.php",
    ],
    theme: {
        extend: {
            // Fusión de fuentes: Mantenemos tus fuentes y añadimos compatibilidad
            fontFamily: {
                sans: ["Inter", "Poppins", ...defaultTheme.fontFamily.sans],
                heading: [
                    "Inter",
                    "Montserrat",
                    ...defaultTheme.fontFamily.sans,
                ],
                editorial: ["Georgia", "Cambria", "Times New Roman", "serif"],
            },
            // Tus escalas tipográficas originales
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
            // Fusión de colores: Tus marcas + Variables dinámicas de v0
            colors: {
                // --- Variables de v0 / shadcn (Nuevas) ---
                border: "oklch(var(--border) / <alpha-value>)",
                input: "oklch(var(--input) / <alpha-value>)",
                ring: "oklch(var(--ring) / <alpha-value>)",
                background: "oklch(var(--background) / <alpha-value>)",
                foreground: "oklch(var(--foreground) / <alpha-value>)",
                primary: {
                    DEFAULT: "oklch(var(--primary) / <alpha-value>)",
                    foreground:
                        "oklch(var(--primary-foreground) / <alpha-value>)",
                },
                secondary: {
                    DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
                    foreground:
                        "oklch(var(--secondary-foreground) / <alpha-value>)",
                },
                destructive: {
                    DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
                    foreground:
                        "oklch(var(--destructive-foreground) / <alpha-value>)",
                },
                muted: {
                    DEFAULT: "oklch(var(--muted) / <alpha-value>)",
                    foreground:
                        "oklch(var(--muted-foreground) / <alpha-value>)",
                },
                accent: {
                    DEFAULT: "oklch(var(--accent) / <alpha-value>)",
                    foreground:
                        "oklch(var(--accent-foreground) / <alpha-value>)",
                },
                popover: {
                    DEFAULT: "oklch(var(--popover) / <alpha-value>)",
                    foreground:
                        "oklch(var(--popover-foreground) / <alpha-value>)",
                },
                card: {
                    DEFAULT: "oklch(var(--card) / <alpha-value>)",
                    foreground: "oklch(var(--card-foreground) / <alpha-value>)",
                },
                // --- Tus colores originales de Surf Premium ---
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
                softdark: {
                    base: "#111827",
                    surface: "#1F2937",
                    border: "#374151",
                    text: "#E5E7EB",
                    muted: "#9CA3AF",
                },
            },
            // Tus Z-index originales
            zIndex: {
                header: "70",
                dropdown: "80",
                modal: "90",
                toast: "999",
            },
            // Bordes: v0 usa --radius, tú usabas custom
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                custom: "2rem", // Mantengo tu borde original por si lo usas
            },
            // Animaciones: Combinamos las tuyas con las de shadcn
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
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            animation: {
                "wave-float": "wave-float 3s ease-in-out infinite",
                "pulse-soft": "pulse-soft 2s ease-in-out infinite",
                "fade-in-down": "fade-in-down 0.2s ease-out forwards",
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
            },
        },
    },
    plugins: [forms, animate],
};
