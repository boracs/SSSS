import React from "react";
import { Link } from "@inertiajs/react";
import { Clock, Download, FileCheck2 } from "lucide-react";

const TONE = {
    light: {
        pdf: "rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100",
        pending: "rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-200",
        tbaiReady:
            "rounded-full bg-sky-50 text-sky-700 ring-1 ring-sky-200 hover:bg-sky-100",
        tbaiWait:
            "rounded-full bg-amber-50 text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100",
    },
    dark: {
        pdf: "rounded-lg bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/25",
        pending: "rounded-lg bg-white/5 text-slate-500 ring-1 ring-white/10",
        tbaiReady:
            "rounded-lg bg-sky-500/15 text-sky-200 ring-1 ring-sky-400/30 hover:bg-sky-500/25",
        tbaiWait:
            "rounded-lg bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/25",
    },
};

/**
 * TicketBAI a la izquierda, factura a la derecha.
 */
export default function StoreFiscalInvoiceActions({
    detailUrl,
    pdfUrl,
    onPdfClick,
    ready = false,
    tone = "light",
    spread = false,
    compact = false,
    alwaysShow = false,
}) {
    const hasPdf = Boolean(pdfUrl) || typeof onPdfClick === "function";
    if (!alwaysShow && !detailUrl && !hasPdf) return null;

    const palette = TONE[tone] ?? TONE.light;
    const facturaLabel = compact ? "Factura" : "Ver factura";
    const tbaiLabel = ready
        ? compact
            ? "TicketBAI"
            : "Ver TicketBAI"
        : compact
          ? "TicketBAI…"
          : "TicketBAI en proceso";
    const size = compact
        ? "px-1.5 py-0.5 text-[9px] sm:text-[10px]"
        : "px-2.5 py-1 text-[11px]";
    const iconClass = compact ? "h-2.5 w-2.5" : "h-3 w-3";
    const facturaClass = `inline-flex items-center gap-1 font-semibold transition ${size} ${palette.pdf}`;

    return (
        <span
            className={
                spread
                    ? "flex w-full min-w-0 items-center justify-between gap-2"
                    : "inline-flex flex-wrap items-center gap-1.5"
            }
        >
            {detailUrl ? (
                <Link
                    href={detailUrl}
                    onClick={(e) => e.stopPropagation()}
                    title={ready ? "Identificador y QR TicketBAI" : "Hacienda aún no ha sellado el TicketBAI"}
                    className={`inline-flex items-center gap-1 font-semibold transition ${size} ${
                        ready ? palette.tbaiReady : palette.tbaiWait
                    }`}
                >
                    {ready ? (
                        <FileCheck2 className={iconClass} aria-hidden />
                    ) : (
                        <Clock className={iconClass} aria-hidden />
                    )}
                    {tbaiLabel}
                </Link>
            ) : (
                <span
                    className={`inline-flex items-center gap-1 font-semibold ${size} ${palette.tbaiWait}`}
                    title="Hacienda aún no ha sellado el TicketBAI"
                >
                    <Clock className={iconClass} aria-hidden />
                    {tbaiLabel}
                </span>
            )}
            {pdfUrl ? (
                <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className={facturaClass}
                >
                    <Download className={iconClass} aria-hidden />
                    {facturaLabel}
                </a>
            ) : typeof onPdfClick === "function" ? (
                <button type="button" onClick={onPdfClick} className={facturaClass}>
                    <Download className={iconClass} aria-hidden />
                    {facturaLabel}
                </button>
            ) : (
                <span className={`inline-flex items-center font-semibold ${size} ${palette.pending}`}>
                    {compact ? "Factura…" : "Factura pendiente"}
                </span>
            )}
        </span>
    );
}
