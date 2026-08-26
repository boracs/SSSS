import React from "react";
import { ExternalLink, Quote, Star } from "lucide-react";

const reviewCountFormatter = new Intl.NumberFormat("es-ES");

function formatRating(rating) {
    return Number(rating).toLocaleString("es-ES", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
}

/** Logo G oficial (SVG inline, accesible). */
function GoogleGIcon({ className = "h-5 w-5 shrink-0" }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            role="img"
            aria-label="Google"
        >
            <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
        </svg>
    );
}

function StarRow({ rating, sizeClass = "h-4 w-4" }) {
    const full = Math.min(5, Math.max(0, Math.round(Number(rating))));
    const label = `${full} de 5 estrellas`;

    return (
        <div className="flex gap-0.5" role="img" aria-label={label}>
            {Array.from({ length: 5 }).map((_, index) => (
                <Star
                    key={index}
                    className={`${sizeClass} ${
                        index < full
                            ? "fill-amber-400 text-amber-400"
                            : "fill-slate-200 text-slate-200"
                    }`}
                    aria-hidden
                />
            ))}
        </div>
    );
}

/**
 * CTA Google visible (confianza / CRO). variant: card = compacto en reseña; primary = destacado.
 */
function GoogleVerifyButton({
    reviewsUrl,
    surface = "light",
    variant = "card",
    className = "",
    label = "Ver en Google",
}) {
    if (!reviewsUrl) {
        return null;
    }

    const isDark = surface === "dark";
    const isPrimary = variant === "primary";

    const base =
        "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40";

    let tone = "";
    if (isPrimary) {
        tone = isDark
            ? "border border-white/20 bg-white text-slate-900 shadow-md hover:bg-slate-100"
            : "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-cyan-200 hover:bg-cyan-50/50";
    } else {
        tone = isDark
            ? "border border-white/15 bg-white/10 text-white hover:bg-white/15"
            : "border border-slate-200/90 bg-slate-50 text-slate-800 hover:border-cyan-200 hover:bg-white";
    }

    return (
        <a
            href={reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${label} (se abre en una pestaña nueva)`}
            className={`${base} ${tone} ${className}`}
        >
            <GoogleGIcon className="h-4 w-4" />
            <span>{label}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </a>
    );
}

function GoogleReviewSnippetCard({
    snippet,
    reviewsUrl,
    compact = false,
    surface = "light",
}) {
    if (!snippet) {
        return null;
    }

    const { quote, author, rating, context } = snippet;
    const articleLabel = `Reseña de ${author}${context ? `, ${context}` : ""}`;
    const isDark = surface === "dark";

    return (
        <article
            aria-label={articleLabel}
            className={`relative flex flex-col rounded-2xl border border-t-[3px] border-t-cyan-500 text-left ${
                isDark
                    ? "border-white/10 bg-slate-900/50 backdrop-blur-sm"
                    : "border-slate-200/80 bg-white shadow-sm"
            } ${compact ? "p-4" : "p-5 transition hover:-translate-y-0.5 hover:shadow-md"}`}
        >
            <div className="flex-1">
                <Quote
                    className={`${isDark ? "text-cyan-400/40" : "text-cyan-200/90"} ${compact ? "h-6 w-6" : "h-7 w-7"}`}
                    aria-hidden
                />
                <div className="mb-2 mt-2 flex flex-wrap items-center justify-between gap-2">
                    <StarRow rating={rating} sizeClass={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
                    <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            isDark
                                ? "bg-white/10 text-cyan-100/90"
                                : "bg-cyan-50 text-cyan-800"
                        }`}
                    >
                        <GoogleGIcon className="h-3 w-3" />
                        Verificada
                    </span>
                </div>
                <blockquote className="m-0">
                    <p
                        className={`leading-relaxed ${
                            isDark ? "text-slate-300" : "text-slate-700"
                        } ${compact ? "text-xs sm:text-sm" : "text-sm"}`}
                    >
                        &ldquo;{quote}&rdquo;
                    </p>
                </blockquote>
                <footer
                    className={`border-t ${isDark ? "border-white/10" : "border-slate-100"} ${
                        compact ? "mt-3 pt-3" : "mt-4 pt-4"
                    }`}
                >
                    <cite className="not-italic">
                        <p className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                            {author}
                        </p>
                    </cite>
                    {context ? (
                        <p
                            className={`mt-0.5 text-[11px] font-medium ${
                                isDark ? "text-cyan-200/70" : "text-slate-500"
                            }`}
                        >
                            {context}
                        </p>
                    ) : null}
                </footer>
            </div>
            <GoogleVerifyButton
                reviewsUrl={reviewsUrl}
                surface={surface}
                variant="card"
                className={compact ? "mt-3" : "mt-4"}
            />
        </article>
    );
}

/**
 * Prueba social Google del partner operativo (The Bunker).
 * @param {"card"|"inline"} variant
 * @param {"light"|"dark"} surface — fondo claro (home/contacto) u oscuro (servicios)
 * @param {boolean} showPartnerNote — nota de colaboración (contacto sí, home no)
 */
export default function GoogleReviewsBadge({
    reviews,
    variant = "card",
    surface = "light",
    showPartnerNote = false,
    className = "",
}) {
    if (!reviews || typeof reviews !== "object") {
        return null;
    }

    const {
        businessName,
        legalName,
        rating,
        reviewCount,
        reviewsUrl,
        partnerNote,
        snippetsDisclaimer,
        snippets = [],
    } = reviews;

    if (!reviewsUrl || !reviewCount) {
        return null;
    }

    const displayName = businessName || legalName || "Google";
    const ratingLabel = formatRating(rating);
    const countLabel = reviewCountFormatter.format(reviewCount);
    const summaryLabel = `${ratingLabel} de 5 estrellas, ${countLabel} opiniones en Google`;
    const visibleSnippets =
        variant === "inline" ? snippets.slice(0, 2) : snippets.slice(0, 4);
    const isDark = surface === "dark";
    const primaryCtaLabel = `Ver las ${countLabel} reseñas en Google`;

    if (variant === "inline") {
        return (
            <div
                className={`rounded-2xl border border-t-[3px] border-t-cyan-500 p-4 sm:p-5 ${
                    isDark
                        ? "border-white/10 bg-white/5 backdrop-blur-sm"
                        : "border-slate-200/90 bg-white shadow-sm"
                } ${className}`}
            >
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <GoogleGIcon className="mt-0.5 h-5 w-5" />
                        <div>
                            <p
                                className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                                    isDark ? "text-cyan-200/70" : "text-slate-500"
                                }`}
                            >
                                Google · verificado
                            </p>
                            <p
                                className={`mt-1 text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}
                                aria-label={summaryLabel}
                            >
                                {ratingLabel}
                                <span className={`font-normal ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                                    {" "}
                                    · {countLabel} opiniones
                                </span>
                            </p>
                            <p className={`mt-0.5 text-sm ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                {displayName}
                            </p>
                        </div>
                    </div>
                    <StarRow rating={rating} sizeClass="h-3.5 w-3.5" />
                </div>

                {visibleSnippets.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {visibleSnippets.map((snippet) => (
                            <GoogleReviewSnippetCard
                                key={snippet.id}
                                snippet={snippet}
                                reviewsUrl={reviewsUrl}
                                compact
                                surface={surface}
                            />
                        ))}
                    </div>
                ) : null}

                {snippetsDisclaimer ? (
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
                        {snippetsDisclaimer}
                    </p>
                ) : null}
                {showPartnerNote && partnerNote ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{partnerNote}</p>
                ) : null}
                <GoogleVerifyButton
                    reviewsUrl={reviewsUrl}
                    surface={surface}
                    variant="primary"
                    label={primaryCtaLabel}
                    className="mt-4 sm:w-auto sm:min-w-[18rem]"
                />
            </div>
        );
    }

    return (
        <section className={className} aria-label={`Opiniones en Google: ${displayName}`}>
            <div className="flex flex-col gap-4 border-b border-slate-200/80 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <GoogleGIcon className="h-6 w-6" />
                        <div>
                            <p
                                className="text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl"
                                aria-label={summaryLabel}
                            >
                                {ratingLabel}
                                <span className="font-semibold text-slate-600">
                                    {" "}
                                    · {countLabel} reseñas
                                </span>
                            </p>
                            <p className="text-sm text-slate-600">{displayName}</p>
                        </div>
                    </div>
                    <StarRow rating={rating} sizeClass="h-4 w-4" />
                </div>
                <GoogleVerifyButton
                    reviewsUrl={reviewsUrl}
                    surface="light"
                    variant="primary"
                    label="Ver en Google"
                    className="w-full sm:w-auto sm:min-w-[11rem]"
                />
            </div>

            {visibleSnippets.length > 0 ? (
                <div className="mt-6">
                    {snippetsDisclaimer ? (
                        <p className="mb-4 text-center text-xs text-slate-500 sm:text-left">
                            {snippetsDisclaimer}
                        </p>
                    ) : null}
                    <div className="grid gap-4 md:grid-cols-2">
                        {visibleSnippets.map((snippet) => (
                            <GoogleReviewSnippetCard
                                key={snippet.id}
                                snippet={snippet}
                                reviewsUrl={reviewsUrl}
                                surface={surface}
                            />
                        ))}
                    </div>
                    <div className="mt-6 flex justify-center sm:justify-start">
                        <GoogleVerifyButton
                            reviewsUrl={reviewsUrl}
                            surface="light"
                            variant="primary"
                            label={primaryCtaLabel}
                            className="w-full max-w-md sm:w-auto sm:min-w-[20rem]"
                        />
                    </div>
                </div>
            ) : null}
        </section>
    );
}
