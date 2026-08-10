import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { fadeUp } from "./TallerShell";

const CARD_ACCENTS = [
    "from-[#0f5f74]/90 to-cyan-600/80",
    "from-cyan-600/90 to-teal-500/80",
    "from-slate-800/90 to-[#0f5f74]/80",
    "from-orange-500/85 to-amber-500/75",
    "from-indigo-600/85 to-cyan-500/75",
    "from-emerald-600/85 to-teal-500/75",
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
            width={128}
            height={96}
            loading="lazy"
            decoding="async"
            className={`object-cover ${className}`}
        />
    );
}

export function TallerArticleCard({ article, index = 0, featured = false }) {
    const accent = accentForIndex(index);
    const cover = article?.cover_image || null;

    if (featured) {
        return (
            <motion.article
                custom={index}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-40px" }}
                variants={fadeUp}
                className="group relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_20px_50px_-24px_rgba(15,95,116,0.4)] lg:col-span-2"
            >
                <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-[0.92]`} aria-hidden />
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
                        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-white/15 lg:aspect-auto lg:w-[42%] lg:border-b-0 lg:border-l lg:border-white/15 lg:order-2">
                            <CoverThumb
                                src={cover}
                                alt=""
                                className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105"
                            />
                        </div>
                    ) : null}

                    <div className="flex min-w-0 flex-1 flex-col justify-between p-6 sm:p-8 lg:p-9">
                        <div>
                            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95 backdrop-blur-sm">
                                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                                Destacado
                            </span>
                            <h2 className="mt-4 font-heading text-2xl font-extrabold leading-tight text-white sm:mt-5 sm:text-3xl">
                                {article.title}
                            </h2>
                            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/85 sm:mt-4 sm:text-base">
                                {article.excerpt}
                            </p>
                        </div>

                        <Link
                            href={route("taller.show", article.slug)}
                            className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0f5f74] shadow-lg transition hover:scale-[1.02] hover:shadow-xl sm:mt-8"
                        >
                            Leer ahora
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </Link>
                    </div>
                </div>
            </motion.article>
        );
    }

    return (
        <motion.article
            custom={index}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-30px" }}
            variants={fadeUp}
            whileHover={{ y: -6 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
        >
            <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} aria-hidden />

            {cover ? (
                <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100 sm:hidden">
                    <CoverThumb
                        src={cover}
                        alt=""
                        className="h-full w-full transition duration-500 group-hover:scale-105"
                    />
                </div>
            ) : null}

            <div className="flex flex-1 items-start gap-4 p-5 sm:gap-5 sm:p-6">
                <div className="flex min-w-0 flex-1 flex-col">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f5f74]/10 to-cyan-500/15 text-[#0f5f74]">
                            <BookOpen className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                            Guía #{String(index + 1).padStart(2, "0")}
                        </span>
                    </div>

                    <h2 className="line-clamp-3 font-heading text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#0f5f74] sm:text-xl">
                        {article.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600 sm:line-clamp-3">
                        {article.excerpt}
                    </p>

                    <Link
                        href={route("taller.show", article.slug)}
                        className="mt-auto inline-flex items-center gap-2 pt-4 text-sm font-semibold text-cyan-700 transition-colors group-hover:text-[#0f5f74] sm:pt-5"
                    >
                        Ver más
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </Link>
                </div>

                {cover ? (
                    <div className="hidden w-[5.75rem] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block md:w-28">
                        <CoverThumb
                            src={cover}
                            alt=""
                            className="aspect-square w-full transition duration-500 group-hover:scale-105"
                        />
                    </div>
                ) : null}
            </div>
        </motion.article>
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
        <section className="mt-14" aria-labelledby="taller-related-heading">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h2
                        id="taller-related-heading"
                        className="font-heading text-xl font-bold text-slate-900 sm:text-2xl"
                    >
                        Sigue leyendo en el Taller
                    </h2>
                    <p className="mt-2 text-sm text-slate-600">Más guías para mejorar tu surf</p>
                </div>
            </div>

            <div className="mt-6 grid items-stretch gap-4 sm:grid-cols-3">
                {items.map((article, index) => (
                    <motion.div
                        key={article.id}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: Math.min(index, 8) * 0.05 }}
                        className="flex h-full"
                    >
                        <Link
                            href={route("taller.show", article.slug)}
                            className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-cyan-300/60 hover:shadow-md"
                        >
                            {article.cover_image ? (
                                <div className="aspect-[16/10] w-full overflow-hidden bg-slate-100 sm:hidden">
                                    <CoverThumb
                                        src={article.cover_image}
                                        alt=""
                                        className="h-full w-full transition duration-500 group-hover:scale-105"
                                    />
                                </div>
                            ) : null}
                            <div className="flex flex-1 items-start gap-3 p-4 sm:p-5">
                                <div className="flex min-w-0 flex-1 flex-col">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
                                        Artículo
                                    </p>
                                    <h3 className="mt-2 line-clamp-3 font-heading text-base font-bold leading-snug text-slate-900 group-hover:text-[#0f5f74]">
                                        {article.title}
                                    </h3>
                                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                                        {article.excerpt}
                                    </p>
                                    <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-cyan-700 transition group-hover:gap-2 group-hover:text-[#0f5f74]">
                                        Leer artículo
                                        <ArrowRight className="h-4 w-4" aria-hidden />
                                    </span>
                                </div>
                                {article.cover_image ? (
                                    <div className="hidden w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:block">
                                        <CoverThumb
                                            src={article.cover_image}
                                            alt=""
                                            className="aspect-square w-full transition duration-500 group-hover:scale-105"
                                        />
                                    </div>
                                ) : null}
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {hasMore ? (
                <div className="mt-8 flex flex-col items-center gap-2">
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-[#0f5f74] shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/60 disabled:cursor-wait disabled:opacity-60"
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
