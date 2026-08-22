import React, { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

function toAbsoluteUrl(pathOrUrl) {
    if (typeof window === "undefined") {
        return pathOrUrl;
    }
    try {
        return new URL(pathOrUrl, window.location.origin).href;
    } catch {
        return pathOrUrl;
    }
}

/**
 * Compartir página (Web Share API + copiar enlace).
 * Ayuda a difusión social; el SEO técnico sigue en metas/OG del backend.
 *
 * @param {"dark"|"light"} variant
 */
export default function SharePageButton({
    title,
    text = "",
    path,
    variant = "dark",
    className = "",
    label = "Compartir",
}) {
    const [copied, setCopied] = useState(false);

    const dark = variant === "dark";
    const shell = dark
        ? "border-white/15 bg-white/5 text-cyan-100 hover:border-cyan-400/35 hover:bg-white/10 hover:text-white"
        : "border-slate-200 bg-white text-[#0f5f74] hover:border-cyan-300/60 hover:bg-cyan-50/70";

    const share = async () => {
        const url = toAbsoluteUrl(path || window.location.href);
        const payload = {
            title: title || document.title,
            text: text || title || "",
            url,
        };

        try {
            if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
                await navigator.share(payload);
                return;
            }
        } catch (err) {
            // AbortError = usuario canceló; no hace falta fallback.
            if (err?.name === "AbortError") {
                return;
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            window.prompt("Copia el enlace:", url);
        }
    };

    return (
        <button
            type="button"
            onClick={share}
            className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${shell} ${className}`}
            aria-label={copied ? "Enlace copiado" : label}
        >
            {copied ? (
                <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                <Share2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
                <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            )}
            <span>{copied ? "Enlace copiado" : label}</span>
        </button>
    );
}
