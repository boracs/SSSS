import React from "react";
import { ExternalLink, MapPin } from "lucide-react";
import GoogleReviewsBadge from "./GoogleReviewsBadge";

/**
 * Bloque NAP + mapa embebido (contacto / footer).
 * @param {"contact"|"compact"} variant
 */
export default function AcademyLocationPanel({
    location,
    partnerGoogleReviews = null,
    showPartnerGoogleNote = false,
    variant = "contact",
    className = "",
}) {
    if (!location || typeof location !== "object") {
        return null;
    }

    const {
        name,
        street,
        locality,
        postalCode,
        region,
        label,
        note,
        googleMapsUrl,
        googleMapsEmbedUrl,
    } = location;

    const isCompact = variant === "compact";

    return (
        <section
            id="como-llegar"
            aria-labelledby={isCompact ? undefined : "como-llegar-heading"}
            className={className}
        >
            {!isCompact ? (
                <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Ubicación
                    </p>
                    <h2
                        id="como-llegar-heading"
                        className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
                    >
                        Cómo llegar
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        Estamos en Zurriola, a pie de playa. Ideal para clases, club y recogida de material.
                    </p>
                </div>
            ) : null}

            <address
                className={`not-italic ${isCompact ? "text-sm text-slate-300" : "rounded-2xl border border-slate-200/90 bg-white p-4 text-sm text-slate-700 shadow-sm sm:p-5"}`}
            >
                <div className={`flex items-start gap-2 ${isCompact ? "" : "gap-3"}`}>
                    <MapPin
                        className={`mt-0.5 shrink-0 ${isCompact ? "h-4 w-4 text-cyan-300/90" : "h-5 w-5 text-cyan-600"}`}
                        aria-hidden
                    />
                    <div className="min-w-0">
                        <p className={`font-semibold ${isCompact ? "text-white" : "text-slate-900"}`}>
                            {name}
                        </p>
                        <p className={isCompact ? "mt-1 text-slate-300" : "mt-1"}>
                            {street}
                            <br />
                            {postalCode ? `${postalCode} ` : ""}
                            {locality}
                            {region ? ` · ${region}` : ""}
                        </p>
                        {!isCompact && note ? (
                            <p className="mt-2 text-slate-500">{note}</p>
                        ) : null}
                        {googleMapsUrl ? (
                            <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`mt-3 inline-flex items-center gap-1.5 text-sm font-semibold transition ${
                                    isCompact
                                        ? "text-cyan-300 hover:text-cyan-200"
                                        : "text-cyan-700 hover:text-cyan-800"
                                }`}
                            >
                                Abrir en Google Maps
                                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            </a>
                        ) : null}
                    </div>
                </div>
            </address>

            {!isCompact && googleMapsEmbedUrl ? (
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-sm">
                    <iframe
                        title={`Mapa: ${label || name}`}
                        src={googleMapsEmbedUrl}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        className="aspect-[4/3] w-full border-0 sm:aspect-[16/10]"
                        allowFullScreen
                    />
                </div>
            ) : null}

            {!isCompact ? (
                <GoogleReviewsBadge
                    reviews={partnerGoogleReviews}
                    variant="inline"
                    showPartnerNote={showPartnerGoogleNote}
                    className="mt-4"
                />
            ) : null}
        </section>
    );
}
