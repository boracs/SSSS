// Importamos los estilos y configuraciones iniciales
import "../css/app.css";
import "./bootstrap";
import axios from 'axios';

// Importamos Inertia y React
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";
import { ToastContainer, Slide } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PublicLayout from "./layouts/PublicLayout";

const GUEST_SHELL_PAGES = new Set([
    "Auth/Login",
    "Auth/Register",
    "Auth/ForgotPassword",
    "Auth/ResetPassword",
    "Auth/ConfirmPassword",
    "Auth/VerifyEmail",
]);

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
                "Taller/Index",
                "Taller/Show",
                "Productos",
                "Academy/Index",
                "Rentals/Surfboards/Index",
                "Rentals/Surfboards/Show",
                "Pedido",
                "Pedidos",
                "PedidoConfirmacion",
                "Payments/MyInvoices",
                "Edit",
            ];
            const shouldUseLightMode = lightModePages.includes(name);
            document.documentElement.classList.toggle("dark", !shouldUseLightMode);
        }

        // Layout por defecto: PublicLayout (Header único) o GuestLayout (auth sin nav).
        const page = module.default;
        if (!page.layout) {
            page.layout = GUEST_SHELL_PAGES.has(name)
                ? (pageNode) => pageNode
                : (pageNode) => <PublicLayout>{pageNode}</PublicLayout>;
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