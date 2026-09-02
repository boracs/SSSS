import { usePage } from "@inertiajs/react";
import GoogleReviewsBadge from "./GoogleReviewsBadge";

const ACCENT = {
    cyan: "text-cyan-300/80",
    violet: "text-violet-300/80",
};

/**
 * Prueba social del club (The Bunker / Google), no del taller Edy/Willy.
 * Lee partnerGoogleReviews del layout; no pide props de página.
 */
export default function RepairClubReviews({ accent = "cyan", headingId = "repair-google-reviews" }) {
    const { partnerGoogleReviews = null } = usePage().props;
    const reviews = partnerGoogleReviews;
    const eyebrow = ACCENT[accent] ?? ACCENT.cyan;
    const businessName = reviews?.businessName || "The Bunker Surf Shop";

    if (!reviews?.reviewsUrl || !reviews?.reviewCount) {
        return null;
    }

    return (
        <section
            aria-labelledby={headingId}
            className="border-y border-white/10 bg-slate-950/30 py-12 sm:py-14"
        >
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
                <div className="mb-6 text-center">
                    <p className={`text-xs font-bold uppercase tracking-[0.2em] ${eyebrow}`}>
                        El club en Google
                    </p>
                    <h2
                        id={headingId}
                        className="mt-2 text-2xl font-extrabold text-white sm:text-3xl"
                    >
                        Opiniones verificadas
                    </h2>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-400">
                        Valoraciones de{" "}
                        <span className="font-semibold text-slate-200">{businessName}</span>
                        {reviews.reviewCount ? (
                            <>
                                {" "}
                                ·{" "}
                                <span className="font-semibold text-slate-200">
                                    {new Intl.NumberFormat("es-ES").format(reviews.reviewCount)}
                                </span>{" "}
                                reseñas a {String(reviews.rating).replace(".", ",")} estrellas
                            </>
                        ) : null}
                        . El local de Zurriola donde opera S4, no el taller de reparación.
                    </p>
                </div>
                <GoogleReviewsBadge
                    reviews={reviews}
                    variant="inline"
                    surface="dark"
                    showPartnerNote={false}
                />
            </div>
        </section>
    );
}
