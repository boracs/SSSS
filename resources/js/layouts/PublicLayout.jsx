import React from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FlashErrorModal from "../components/FlashErrorModal";
import PwaInstallBanner from "../components/PwaInstallBanner";
import FloatingDockOffsetSync from "../components/FloatingDockOffsetSync";
import Chatbot from "../components/Chatbot.jsx";

export default function PublicLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col overflow-x-clip bg-transparent text-slate-900 dark:text-gray-100">
            <Header />
            <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">{children}</main>
            <Footer />
            <FlashErrorModal />
            <PwaInstallBanner />
            <FloatingDockOffsetSync />
            <Chatbot showChatLauncher />
        </div>
    );
}
