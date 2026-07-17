import React from "react";
import { usePage } from "@inertiajs/react";
import Header from "../components/Header";
import Chatbot from "../components/Chatbot.jsx";
import Footer from "../components/Footer";

export default function PublicLayout({ children }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isAdmin = user && String(user?.role) === "admin";
    const shouldRenderChatbot = !isAdmin;

    return (
        <div className="flex min-h-screen flex-col bg-transparent text-slate-900 dark:text-gray-100">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            {/* WhatsApp flotante retirado: experiencia centralizada en el widget del Chatbot. */}
            {shouldRenderChatbot && <Chatbot logoIn={user} />}
        </div>
    );
}
