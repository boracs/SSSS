import React, { lazy, Suspense, useEffect, useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import FlashErrorModal from "../components/FlashErrorModal";
import PwaInstallBanner from "../components/PwaInstallBanner";
import FloatingDockOffsetSync from "../components/FloatingDockOffsetSync";

const Chatbot = lazy(() => import("../components/Chatbot.jsx"));

function DeferredChatbot() {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const enable = () => setReady(true);

        if (typeof window.requestIdleCallback === "function") {
            const idleId = window.requestIdleCallback(enable, { timeout: 2500 });
            return () => window.cancelIdleCallback(idleId);
        }

        const timeoutId = window.setTimeout(enable, 1200);
        return () => window.clearTimeout(timeoutId);
    }, []);

    if (!ready) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <Chatbot showChatLauncher />
        </Suspense>
    );
}

export default function PublicLayout({ children }) {
    return (
        <div className="flex min-h-screen flex-col overflow-x-clip bg-transparent text-slate-900 dark:text-gray-100">
            <Header />
            <main className="flex min-w-0 flex-1 flex-col overflow-x-clip">{children}</main>
            <Footer />
            <FlashErrorModal />
            <PwaInstallBanner />
            <FloatingDockOffsetSync />
            <DeferredChatbot />
        </div>
    );
}
