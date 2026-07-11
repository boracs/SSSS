import React from "react";
import { Head, Link } from "@inertiajs/react";
import Layout1 from "../../layouts/Layout1";
import Contenedor_productos from "../../layouts/Contenedor_productos";
import {
    TallerPageShell,
    TallerBadge,
    ReadingProgressBar,
    fadeUp,
    motion,
} from "../../components/Taller/TallerShell";
import { TallerRelatedArticles } from "../../components/Taller/TallerArticleCard";
import { ArrowLeft, BookOpen, Clock3 } from "lucide-react";

const ARTICLE_BODY_CLASS =
    "taller-article font-editorial text-[1.0625rem] leading-[1.9] text-slate-700 " +
    "[&_h2]:relative [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:pl-4 [&_h2]:font-heading [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-slate-900 " +
    "[&_h2]:before:absolute [&_h2]:before:left-0 [&_h2]:before:top-1 [&_h2]:before:h-[calc(100%-0.25rem)] [&_h2]:before:w-1 [&_h2]:before:rounded-full [&_h2]:before:bg-gradient-to-b [&_h2]:before:from-[#0f5f74] [&_h2]:before:to-cyan-500 " +
    "[&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:font-heading [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-[#0f5f74] " +
    "[&_p]:mb-5 [&_p:last-child]:mb-0 " +
    "[&_ul]:my-5 [&_ul]:space-y-2.5 [&_ul]:rounded-2xl [&_ul]:border [&_ul]:border-cyan-500/15 [&_ul]:bg-cyan-50/40 [&_ul]:p-5 [&_ul]:pl-8 [&_ul]:list-disc " +
    "[&_ol]:my-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 " +
    "[&_li]:leading-relaxed [&_li]:marker:text-cyan-600 " +
    "[&_table]:my-6 [&_table]:w-full [&_table]:overflow-hidden [&_table]:rounded-xl [&_table]:border [&_table]:border-slate-200 " +
    "[&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-sm [&_th]:font-semibold " +
    "[&_td]:border-b [&_td]:border-slate-100 [&_td]:px-4 [&_td]:py-3 [&_td]:text-sm";

function estimateReadingMinutes(html) {
    const plain = String(html || "").replace(/<[^>]+>/g, " ");
    const words = plain.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(3, Math.ceil(words / 200));
}

export default function Show({ article, relatedArticles = [], productos = [] }) {
    const seoTitle = article.seo_title ?? article.meta_title ?? article.title;
    const seoDescription = article.seo_description ?? article.meta_description ?? article.excerpt;
    const readingMinutes = estimateReadingMinutes(article.content);

    return (
        <Layout1>
            <ReadingProgressBar />

            <Head title={seoTitle}>
                <meta head-key="description" name="description" content={seoDescription} />
                {article.meta_keywords ? (
                    <meta head-key="keywords" name="keywords" content={article.meta_keywords} />
                ) : null}
                <meta head-key="og:title" property="og:title" content={seoTitle} />
                <meta head-key="og:description" property="og:description" content={seoDescription} />
                <meta head-key="og:type" property="og:type" content="article" />
            </Head>

            <TallerPageShell>
                <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
                    <motion.div initial="hidden" animate="visible" variants={fadeUp}>
                        <Link
                            href={route("taller.index")}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:border-cyan-300 hover:text-[#0f5f74]"
                        >
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                            Volver al Taller
                        </Link>
                    </motion.div>

                    <motion.article
                        initial="hidden"
                        animate="visible"
                        variants={fadeUp}
                        custom={0.08}
                        className="mt-8 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(15,95,116,0.35)]"
                    >
                        <header className="relative overflow-hidden bg-gradient-to-br from-[#0f5f74] via-[#0d4a5c] to-cyan-700 px-6 py-10 sm:px-10 sm:py-12">
                            <div
                                aria-hidden
                                className="pointer-events-none absolute inset-0 opacity-25"
                                style={{
                                    backgroundImage:
                                        "radial-gradient(circle at 15% 50%, white 1px, transparent 1px), radial-gradient(circle at 85% 30%, white 1px, transparent 1px)",
                                    backgroundSize: "42px 42px",
                                }}
                            />
                            <div
                                aria-hidden
                                className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/30 blur-3xl"
                            />

                            <div className="relative">
                                <TallerBadge icon={BookOpen} label="Taller de Surf" variant="light" />
                                <h1 className="mt-5 font-heading text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.65rem]">
                                    {article.title}
                                </h1>
                                {article.excerpt ? (
                                    <p className="mt-4 max-w-2xl text-base leading-relaxed text-cyan-50/95 sm:text-lg">
                                        {article.excerpt}
                                    </p>
                                ) : null}
                                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur-sm">
                                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                                    Lectura estimada · {readingMinutes} min
                                </div>
                            </div>
                        </header>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                            className="px-6 py-8 sm:px-10 sm:py-12"
                        >
                            <div
                                className={ARTICLE_BODY_CLASS}
                                dangerouslySetInnerHTML={{ __html: article.content }}
                            />
                        </motion.div>
                    </motion.article>

                    <TallerRelatedArticles articles={relatedArticles} />

                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeUp}
                        className="mt-14"
                    >
                        <Contenedor_productos
                            productos={productos}
                            eyebrow="Tienda S4"
                            title="Material relacionado"
                            description="Productos de nuestra tienda oficial que encajan con esta guía. Precios exclusivos para socios con taquilla activa."
                            scrollHint="Desliza para ver más productos"
                            compact={false}
                        />
                    </motion.div>
                </div>
            </TallerPageShell>
        </Layout1>
    );
}
