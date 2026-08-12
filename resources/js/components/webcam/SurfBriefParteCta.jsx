import React from "react";
import { Link } from "@inertiajs/react";
import { ArrowRight } from "lucide-react";
import { surfBriefCtaForSignal } from "./surfBriefCta";

/**
 * CTA contextual bajo el Parte S4 (CRO según señal del día).
 */
export default function SurfBriefParteCta({ signalStatus, className = "" }) {
    const cta = surfBriefCtaForSignal(signalStatus);
    if (!cta) return null;

    const href = cta.href();
    const primary =
        cta.tone === "primary"
            ? "bg-[#0f5f74] text-white hover:bg-[#0d4a5c] shadow-sm"
            : cta.tone === "safe"
              ? "border border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-100"
              : "border border-slate-200 bg-white text-[#0f5f74] hover:bg-slate-50";

    return (
        <Link
            href={href}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${primary} ${className}`}
        >
            {cta.label}
            <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </Link>
    );
}
