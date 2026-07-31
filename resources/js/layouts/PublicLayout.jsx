import React, { Suspense, lazy } from "react";
import { usePage } from "@inertiajs/react";
import Header from "../components/Header";
import Footer from "../components/Footer";

const Chatbot = lazy(() => import("../components/Chatbot.jsx"));

export default function PublicLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isAdmin = user && String(user?.role) === "admin";
    const shouldRenderChatbot = !isAdmin;

    return (
        <div className="flex min-h-screen flex-col bg-transparent text-slate-900 dark:text-gray-100">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            {/* WhatsApp flotante retirado: experiencia centralizada en el widget del Chatbot. */}
            {shouldRenderChatbot && (
                <Suspense fallback={null}>
                    <Chatbot logoIn={user} />
                </Suspense>
            )}
        </div>
    );
}
