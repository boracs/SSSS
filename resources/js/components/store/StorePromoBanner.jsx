import React, { useCallback, useEffect, useState } from "react";
import { Link } from "@inertiajs/react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AUTOPLAY_MS = 6500;

export default function StorePromoBanner({ slides = [], variant = "card" }) {
    const items = Array.isArray(slides) ? slides.filter((s) => s?.href && s?.title) : [];
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    const count = items.length;
    const go = useCallback(
        (dir) => {
            if (count < 2) return;
            setIndex((i) => (i + dir + count) % count);
        },
        [count],
    );

    useEffect(() => {
        if (count < 2 || paused) return undefined;
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % count);
        }, AUTOPLAY_MS);
        return () => clearInterval(id);
    }, [count, paused]);

    useEffect(() => {
        if (index >= count) setIndex(0);
    }, [count, index]);

    if (count === 0) return null;

    const slide = items[index] ?? items[0];
    const bleed = variant === "bleed";

    return (
        <section
            className={
                bleed
                    ? "relative mb-5 overflow-hidden border-y border-white/10 sm:mb-6"
                    : "relative mb-5 overflow-hidden rounded-2xl border border-white/10 sm:mb-6"
            }
            aria-roledescription="carrusel"
            aria-label="Ofertas del club"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="relative min-h-[12rem] sm:min-h-[14rem]">
                <img
                    src={slide.imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    aria-hidden
                    fetchPriority={index === 0 ? "high" : "auto"}
                    loading={index === 0 ? "eager" : "lazy"}
                />
                <div
                    className="absolute inset-0 bg-gradient-to-b from-slate-950/30 via-slate-950/45 to-slate-950/60"
                    aria-hidden
                />

                <div
                    className={`relative z-[1] mx-auto flex min-h-[12rem] w-full max-w-2xl flex-col items-center justify-center py-5 text-center sm:min-h-[14rem] sm:py-6 ${
                        count > 1 ? "px-12 sm:px-16" : "px-4 sm:px-8"
                    }`}
                >
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-300/90">
                        {slide.eyebrow}
                    </p>
                    <h2 className="mt-1 max-w-lg font-heading text-xl font-extrabold tracking-tight text-white [text-shadow:0_1px_2px_rgba(2,6,23,0.6)] sm:text-2xl">
                        {slide.title}
                    </h2>
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-slate-200/90 [text-shadow:0_1px_2px_rgba(2,6,23,0.6)] sm:max-w-lg">
                        {slide.subtitle}
                    </p>
                    <Link
                        href={slide.href}
                        className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#0f5f74] px-4 text-sm font-semibold text-white transition hover:bg-[#0c4d5e]"
                    >
                        {slide.ctaLabel}
                    </Link>
                </div>

                {count > 1 ? (
                    <>
                        <button
                            type="button"
                            onClick={() => go(-1)}
                            aria-label="Oferta anterior"
                            className="absolute left-1 top-1/2 z-[2] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-white/85 transition hover:scale-110 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 sm:left-3"
                        >
                            <ChevronLeft
                                className="h-8 w-8 drop-shadow-[0_2px_8px_rgba(2,6,23,0.65)] sm:h-9 sm:w-9"
                                strokeWidth={2.25}
                                aria-hidden
                            />
                        </button>
                        <button
                            type="button"
                            onClick={() => go(1)}
                            aria-label="Siguiente oferta"
                            className="absolute right-1 top-1/2 z-[2] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-white/85 transition hover:scale-110 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 sm:right-3"
                        >
                            <ChevronRight
                                className="h-8 w-8 drop-shadow-[0_2px_8px_rgba(2,6,23,0.65)] sm:h-9 sm:w-9"
                                strokeWidth={2.25}
                                aria-hidden
                            />
                        </button>
                    </>
                ) : null}
            </div>
        </section>
    );
}
