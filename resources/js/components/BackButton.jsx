import React, { useEffect, useState } from "react";
import { Link } from "@inertiajs/react";

/**
 * Botón "Volver atrás" inteligente: prominente al inicio, sutil tras hacer scroll.
 */
export default function BackButton({ href, children = "Volver atrás", className = "" }) {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 100);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <Link
            href={href}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-300 ease-in-out hover:bg-gray-700 hover:text-sky-300 ${
                scrolled
                    ? "text-gray-400 opacity-80 hover:opacity-100"
                    : "text-gray-200"
            } ${className}`}
        >
            <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                />
            </svg>
            {children}
        </Link>
    );
}
