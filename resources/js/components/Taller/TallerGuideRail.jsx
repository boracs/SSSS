import React from "react";
import { BookOpen, ChevronRight } from "lucide-react";
import { Link } from "@inertiajs/react";
import SnapRail from "../ui/SnapRail";
import { TallerArticleCardRail } from "./TallerArticleCard";

/**
 * Raíl de guías del Taller (webcam). Mismo gesto que ofertas tienda; cards de leer.
 */
export default function TallerGuideRail({ articles = [] }) {
    const items = Array.isArray(articles) ? articles.filter((a) => a?.slug && a?.title) : [];
    if (items.length === 0) return null;

    return (
        <section
            id="taller-guias-zurriola"
            className="relative w-full overflow-hidden bg-gradient-to-b from-s4-surface-dark-teal via-s4-deep to-transparent pb-14 pt-8 sm:pb-20 sm:pt-10"
            aria-labelledby="taller-guias-zurriola-heading"
        >
            <div
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan-500/15 blur-3xl"
                aria-hidden
            />
            <div className="relative z-[2] mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                <div className="relative mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                            <BookOpen className="h-3.5 w-3.5" aria-hidden />
                            Del Taller S4
                        </p>
                        <h2
                            id="taller-guias-zurriola-heading"
                            className="mt-3 font-heading text-xl font-extrabold tracking-tight text-white sm:text-2xl"
                        >
                            Para leer Zurriola hoy
                        </h2>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-400">
                            Guías cortas para entender el parte, las olas y cómo colocarte.
                        </p>
                    </div>
                    <Link
                        href={route("taller.index")}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-cyan-100 shadow-sm backdrop-blur-sm transition hover:border-cyan-400/40 hover:bg-white/15 hover:text-white"
                    >
                        Ver todas las guías
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                <SnapRail
                    compact
                    tone="dark"
                    prevLabel="Guías anteriores"
                    nextLabel="Guías siguientes"
                >
                    {items.map((article) => (
                        <div
                            key={article.id ?? article.slug}
                            className="flex w-[min(78vw,220px)] shrink-0 snap-start sm:w-[220px]"
                        >
                            <TallerArticleCardRail article={article} />
                        </div>
                    ))}
                </SnapRail>
            </div>
        </section>
    );
}
