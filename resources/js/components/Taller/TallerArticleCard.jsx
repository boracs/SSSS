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

export function TallerArticleCard({ article, index = 0, featured = false }) {
    const accent = accentForIndex(index);

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

                <div className="relative flex min-h-[280px] flex-col justify-between p-7 sm:p-9 lg:min-h-[320px]">
                    <div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/95 backdrop-blur-sm">
                            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                            Destacado
                        </span>
                        <h2 className="mt-5 font-heading text-2xl font-extrabold leading-tight text-white sm:text-3xl lg:max-w-xl">
                            {article.title}
                        </h2>
                        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                            {article.excerpt}
                        </p>
                    </div>

                    <Link
                        href={route("taller.show", article.slug)}
                        className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#0f5f74] shadow-lg transition hover:scale-[1.02] hover:shadow-xl"
                    >
                        Leer ahora
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Link>
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

            <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f5f74]/10 to-cyan-500/15 text-[#0f5f74]">
                        <BookOpen className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        Guía #{String(index + 1).padStart(2, "0")}
                    </span>
                </div>

                <h2 className="line-clamp-3 min-h-[4.5rem] font-heading text-lg font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#0f5f74] sm:min-h-[5.25rem] sm:text-xl">
                    {article.title}
                </h2>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">
                    {article.excerpt}
                </p>

                <Link
                    href={route("taller.show", article.slug)}
                    className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-cyan-700 transition-colors group-hover:text-[#0f5f74]"
                >
                    Ver más
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
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
                            className="group flex h-full w-full flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-cyan-300/60 hover:shadow-md"
                        >
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-700">
                                Artículo
                            </p>
                            <h3 className="mt-2 line-clamp-3 min-h-[4.5rem] font-heading text-base font-bold leading-snug text-slate-900 group-hover:text-[#0f5f74]">
                                {article.title}
                            </h3>
                            <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-600">
                                {article.excerpt}
                            </p>
                            <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-cyan-700 transition group-hover:gap-2 group-hover:text-[#0f5f74]">
                                Leer artículo
                                <ArrowRight className="h-4 w-4" aria-hidden />
                            </span>
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
