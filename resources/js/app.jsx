// Importamos los estilos y configuraciones iniciales
import "../css/app.css";
import "./bootstrap";
import axios from 'axios';

// Importamos Inertia y React
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import AuthenticatedLayout from "./layouts/AuthenticatedLayout";

// Obtenemos el nombre de la app desde las variables de entorno
const appName = import.meta.env.VITE_APP_NAME || "Laravel";

// Creamos la aplicación Inertia
createInertiaApp({
    title: (title) => `${title} - ${appName}`,

    resolve: (name) => {
        const pages = import.meta.glob("./Pages/**/*.jsx", { eager: true });

        // Obtenemos el módulo
        const module = pages[`./Pages/${name}.jsx`];

        if (!module) {
            throw new Error(`No se encontró la página: ${name}`);
        }

        if (typeof document !== "undefined") {
            // Excepciones cliente solicitadas en modo claro (body blanco).
            const lightModePages = [
                "Pag_principal",
                "Nosotros",
                "Productos",
                "Academy/Index",
                "Servicios_ClasesDeSurf",
                "Rentals/Surfboards/Index",
                "Rentals/Surfboards/Show",
            ];
            const shouldUseLightMode = lightModePages.includes(name);
            document.documentElement.classList.toggle("dark", !shouldUseLightMode);
        }

        // Layout por defecto (Single Source of Truth): AuthenticatedLayout
        // Si una página define page.layout, se respeta.
        const page = module.default;
        if (!page.layout) {
            page.layout = (pageNode) => <AuthenticatedLayout>{pageNode}</AuthenticatedLayout>;
        }

        return page;
    },

    setup({ el, App, props }) {
        createRoot(el).render(
            <>
                <ToastContainer
                    position="top-right"
                    autoClose={2800}
                    hideProgressBar={true}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss={false}
                    pauseOnHover={false}
                    draggable
                    limit={5}
                    theme="dark"
                    transition={Slide}
                    toastClassName="toast-elite"
                    className="toast-container-premium"
                />
                <App {...props} />
            </>
        );
    },

    progress: false,
});