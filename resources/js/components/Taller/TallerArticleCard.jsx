import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { fadeUp } from "./TallerShell";
import { formatTallerDisplayTitle } from "../../lib/tallerTitle";

const CARD_ACCENTS = [
    "from-[#0f5f74] to-cyan-600",
    "from-cyan-600 to-teal-500",
    "from-slate-700 to-[#0f5f74]",
    "from-orange-500 to-amber-500",
    "from-indigo-600 to-cyan-500",
    "from-emerald-600 to-teal-500",
];

function accentForIndex(index) {
    return CARD_ACCENTS[index % CARD_ACCENTS.length];
}

function CoverThumb({ src, alt, className = "" }) {
    if (!src) return null;

    return (
        <img
            src={src}
            alt={alt}
            width={640}
            height={400}
            loading="lazy"
            decoding="async"
            className={`object-cover ${className}`}
        />
    );
}

const MAGAZINE_CARD_CLASS =
    "group relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_12px_32px_-12px_rgba(15,45,55,0.38)] transition-[box-shadow,border-color] duration-150 ease-out hover:border-cyan-300/50 hover:shadow-[0_18px_44px_-10px_rgba(15,45,55,0.52)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-2";

/**
 * Tarjeta revista unificada: imagen hero + cuerpo con gradiente (índice y relacionados).
 */
export function TallerArticleCardMagazine({ article, index = 0, className = "" }) {
    const accent = accentForIndex(index);
    const cover = article?.cover_image || null;
    const { main: titleMain, subtitle: titleSubtitle } = formatTallerDisplayTitle(
        article?.title,
    );
    const guideNum = String(index + 1).padStart(2, "0");

    return (
        <Link
            href={route("taller.show", article.slug)}
            className={`${MAGAZINE_CARD_CLASS} ${className}`}
        >
            <div className="relative isolate aspect-[16/10] w-full shrink-0 overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-100 via-cyan-50/80 to-slate-200/60">
                {cover ? (
                    <CoverThumb
                        src={cover}
                        alt=""
                        className="absolute inset-0 h-full w-full scale-100 transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.02]"
                    />
                ) : (
                    <div
                        className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-25`}
                        aria-hidden
                    />
                )}
                <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/10 to-transparent"
                    aria-hidden
                />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#0f5f74] shadow-sm backdrop-blur-sm">
                    <BookOpen className="h-3 w-3" aria-hidden />
                    Guía {guideNum}
                </span>
            </div>

            <div className="relative flex flex-1 flex-col bg-gradient-to-b from-white via-white to-slate-50/95 p-5 sm:p-6">
                <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`}
                    aria-hidden
                />

                <h2 className="line-clamp-3 font-heading text-lg font-bold leading-snug tracking-normal text-balance text-slate-900 transition-colors duration-150 ease-out group-hover:text-[#0f5f74] sm:text-xl">
                    {titleMain}
                </h2>
                {titleSubtitle ? (
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">
                        {titleSubtitle}
                    </p>
                ) : null}
                <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                    {article.excerpt}
                </p>

                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-[color,gap] duration-150 ease-out group-hover:gap-2.5 group-hover:text-[#0f5f74] sm:mt-5">
                    Leer artículo
                    <ArrowRight
                        className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5"
                        aria-hidden
                    />
                </span>
            </div>
        </Link>
    );
}

export function TallerArticleCard({ article, index = 0, featured = false }) {
    const accent = accentForIndex(index);
    const cover = article?.cover_image || null;
    const { main: titleMain, subtitle: titleSubtitle } = formatTallerDisplayTitle(
        article?.title,
    );

    if (featured) {
        return (
            <motion.article
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-24px_rgba(15,95,116,0.45)] lg:col-span-2"
            >
                <div
                    className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-[0.92]`}
                    aria-hidden
                />
                <div
                    aria-hidden
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage:
                            "radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                        backgroundSize: "48px 48px",
                    }}
                />

                <div className="relative flex min-h-[280px] flex-col lg:min-h-[300px] lg:flex-row lg:items-stretch">
                    {cover ? (
                        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-white/15 lg:order-2 lg:aspect-auto lg:w-[42%] lg:border-b-0 lg:border-l lg:border-white/15">
                            <CoverThumb
                                src={cover}
                                alt=""
                                className="absolute inset-0 h-full w-full scale-100 transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.02]"
                            />
                        </div>
                    ) : null}

                    <div className="flex min-w-0 flex-1 flex-col justify-between p-6 sm:p-8 lg:p-9">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95 backdrop-blur-sm">
                                <BookOpen className="h-3.5 w-3.5" aria-hidden />
                                Destacado
                            </span>
                            <h2 className="mt-4 font-heading text-2xl font-extrabold leading-[1.22] tracking-normal text-balance text-white sm:mt-5 sm:text-3xl">
                                {titleMain}
                            </h2>
                            {titleSubtitle ? (
                                <p className="mt-1.5 text-sm font-medium leading-snug text-white/80">
                                    {titleSubtitle}
                                </p>
                            ) : null}
                            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:mt-4 sm:text-base">
                                {article.excerpt}
                            </p>
                        </div>

                        <Link
                            href={route("taller.show", article.slug)}
                            className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0f5f74] shadow-lg transition hover:scale-[1.02] hover:shadow-xl sm:mt-8"
                        >
                            Leer ahora
                            <ArrowRight
                                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                                aria-hidden
                            />
                        </Link>
                    </div>
                </div>
            </motion.article>
        );
    }

    return (
        <motion.div
            custom={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
            variants={fadeUp}
            className="h-full"
        >
            <TallerArticleCardMagazine article={article} index={index} />
        </motion.div>
    );
}

export function TallerRelatedArticles({
    articles: initialArticles = [],
    articleSlug,
    relatedMeta = null,
}) {
    const [items, setItems] = useState(() => initialArticles);
    const [nextOffset, setNextOffset] = useState(() => relatedMeta?.next_offset ?? initialArticles.length);
    const [hasMore, setHasMore] = useState(() => Boolean(relatedMeta?.has_more));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!items.length && !hasMore) return null;

    const loadMore = async () => {
        if (!articleSlug || loading || !hasMore) return;
        setLoading(true);
        setError(null);
        try {
            const url = route("taller.related", {
                article: articleSlug,
                offset: nextOffset,
                limit: relatedMeta?.page_size ?? 6,
            });
            const response = await fetch(url, {
                headers: {
                    Accept: "application/json",
                    "X-Requested-With": "XMLHttpRequest",
                },
                credentials: "same-origin",
            });
            if (!response.ok) {
                throw new Error("No se pudieron cargar más artículos");
            }
            const data = await response.json();
            const incoming = Array.isArray(data.items) ? data.items : [];
            setItems((prev) => {
                const seen = new Set(prev.map((a) => a.id));
                return [...prev, ...incoming.filter((a) => !seen.has(a.id))];
            });
            setHasMore(Boolean(data.has_more));
            setNextOffset(Number(data.next_offset ?? nextOffset + incoming.length));
        } catch (e) {
            setError(e?.message || "Error al cargar más artículos");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section
            className="mt-14 overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-b from-white via-slate-50/80 to-cyan-50/40 p-5 shadow-[0_20px_50px_-28px_rgba(15,95,116,0.25)] sm:p-8"
            aria-labelledby="taller-related-heading"
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-700">
                        Blog educativo
                    </p>
                    <h2
                        id="taller-related-heading"
                        className="mt-1 font-heading text-xl font-bold text-slate-900 sm:text-2xl"
                    >
                        Sigue leyendo
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Más guías para mejorar tu surf
                    </p>
                </div>
            </div>

            <div className="mt-6 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((article, index) => (
                    <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: Math.min(index, 8) * 0.05 }}
                        className="flex h-full"
                    >
                        <TallerArticleCardMagazine article={article} index={index} />
                    </motion.div>
                ))}
            </div>

            {hasMore ? (
                <div className="mt-8 flex flex-col items-center gap-2">
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-5 py-2.5 text-sm font-bold text-[#0f5f74] shadow-[0_8px_24px_-12px_rgba(15,95,116,0.3)] transition hover:border-cyan-300 hover:bg-cyan-50/60 disabled:cursor-wait disabled:opacity-60"
                    >
                        {loading ? "Cargando…" : "Cargar más artículos"}
                    </button>
                    {error ? (
                        <p className="text-xs font-medium text-rose-600" role="alert">
                            {error}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </section>
    );
}
