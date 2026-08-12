import React, { Suspense, lazy } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FlashErrorModal from "../components/FlashErrorModal";

const Chatbot = lazy(() => import("../components/Chatbot.jsx"));

export default function PublicLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col bg-transparent text-slate-900 dark:text-gray-100">
            <Header />
            <main className="flex flex-1 flex-col">{children}</main>
            <Footer />
            <FlashErrorModal />
            {/* FAB público: ↑ + chat Maider (también con sesión admin en páginas públicas). */}
            <Suspense fallback={null}>
                <Chatbot showChatLauncher />
            </Suspense>
        </div>
    );
}
