import React, { useState, useEffect } from "react";
import Menu_principal from "../components/Menu_principal";
import Titulo from "../components/Titulo";
import Footer from "../components/Footer";
import BrandBanner from "../components/BrandBanner";
import { CartProvider } from "../Contexts//cartContext";
import Chatbot from "../components/Chatbot.jsx";
import { usePage } from "@inertiajs/react";

const Layout1 = ({ children, header }) => {
    const { props, url } = usePage();
    const user = props.auth?.user;

    const loggedIn = !!user;
    const isAdmin = user && user.role === "admin";
    const shouldRenderChatbot = !isAdmin;

    const isHome = url === "/" || url === "";
    const [scrolled, setScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    const headerSolid = true;

    return (
        <div className="min-h-screen flex flex-col bg-brand-bg text-slate-900">
            <Titulo />

            {/* Banner de marca (gradiente) + menú único para todos */}
            <BrandBanner />
            <header className="sticky top-0 z-header w-full border-b border-slate-200/60 bg-white/95 shadow-sm backdrop-blur-md transition-all duration-300 ease-out">
                {header || (
                    <CartProvider>
                        <Menu_principal headerVariant={headerSolid ? "solid" : "hero"} />
                    </CartProvider>
                )}
            </header>

            <main className="flex-1">{children}</main>

            <Footer />

            {shouldRenderChatbot && <Chatbot loggedIn={loggedIn} />}
        </div>
    );
};
export default Layout1;
