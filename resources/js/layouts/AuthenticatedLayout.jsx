import React from "react";
import { Link, usePage } from "@inertiajs/react";
import Header from "../components/Header";
import Chatbot from "../components/Chatbot.jsx";
import Footer from "../components/Footer";

const year = new Date().getFullYear();

export default function AuthenticatedLayout({ header, children }) {
    const { auth } = usePage().props;
    const user = auth?.user;
    const isAdmin = user && String(user?.role) === "admin";
    const shouldRenderChatbot = !isAdmin;

    return (
        <div className="flex min-h-screen flex-col bg-transparent text-slate-900">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
            {shouldRenderChatbot && <Chatbot loggedIn={!!user} />}
        </div>
    );
}
