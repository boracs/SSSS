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
                // s4-cyan = acento interactivo (#06b6d4). brand-deep/primary = navy marca (#0d234d) ≠ s4-deep (#0a1f2e).
                s4: {
                    DEFAULT: "#0f5f74",
                    hover: "#0d4f60",
                    cyan: "#06b6d4",
                    deep: "#0a1f2e",
                    surface: "#f8fafc",
                    "surface-light": "#f8fafc",
                    "surface-dark": "#0a2233",
                    "surface-dark-night": "#070b14",
                    "surface-dark-teal": "#0a2a33",
                    "surface-dark-royal": "#1a0f2e",
                    "surface-dark-warm": "#241405",
                    "surface-dark-coach": "#0a2230",
                    ink: "#0f172a",
                },
                brand: {
                    deep: "#0d234d",
                    primary: "#0d234d",
                },
            },
            // Escala z-index (documentada — C8): header < overlay < modal < chatbot < toast
            zIndex: {
                header: "500",
                dropdown: "510",
                "overlay-backdrop": "540",
                "overlay-panel": "550",
                modal: "800",
                chatbot: "850",
                toast: "999",
            },
            // Bordes: lg/md/sm usan var(--radius) definido en resources/css/app.css :root
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
