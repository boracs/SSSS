import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Raíl horizontal con snap, fundidos y flechas.
 * Misma mecánica que ofertas tienda; el padre pinta las cards.
 *
 * @param {"light"|"dark"} [tone]
 */
export default function SnapRail({
    children,
    compact = false,
    tone = "light",
    prevLabel = "Anterior",
    nextLabel = "Siguiente",
    className = "",
}) {
    const scrollRef = useRef(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const isLight = tone === "light";
    const count = React.Children.count(children);

    const updateScrollState = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        const { scrollLeft, scrollWidth, clientWidth } = el;
        setCanScrollLeft(scrollLeft > 8);
        setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 8);
    }, []);

    useEffect(() => {
        updateScrollState();
        const el = scrollRef.current;
        if (!el) return;
        el.addEventListener("scroll", updateScrollState, { passive: true });
        window.addEventListener("resize", updateScrollState);
        return () => {
            el.removeEventListener("scroll", updateScrollState);
            window.removeEventListener("resize", updateScrollState);
        };
    }, [count, updateScrollState]);

    const scrollStep = compact ? 200 : 300;

    const scroll = (dir) => {
        scrollRef.current?.scrollBy({ left: dir * scrollStep, behavior: "smooth" });
    };

    if (count === 0) return null;

    const fadeFrom = isLight
        ? "bg-gradient-to-r from-white to-transparent"
        : "bg-gradient-to-r from-slate-950/95 to-transparent";
    const fadeTo = isLight
        ? "bg-gradient-to-l from-white to-transparent"
        : "bg-gradient-to-l from-slate-950/95 to-transparent";
    const btn = isLight
        ? "border-slate-200 bg-white text-slate-700 hover:border-s4/30 hover:text-s4"
        : "border-white/20 bg-slate-800/95 text-slate-100 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.55)] hover:border-cyan-400/40 hover:text-cyan-200";
    const btnSize = compact
        ? "h-8 w-8"
        : "hidden h-11 w-11 sm:flex";

    return (
        <div className={`relative min-w-0 overflow-hidden ${className}`}>
            <div
                className={`pointer-events-none absolute inset-y-0 left-0 z-10 w-10 transition-opacity duration-300 sm:w-14 ${fadeFrom} ${canScrollLeft ? "opacity-100" : "opacity-0"}`}
                aria-hidden
            />
            <div
                className={`pointer-events-none absolute inset-y-0 right-0 z-10 w-10 transition-opacity duration-300 sm:w-14 ${fadeTo} ${canScrollRight ? "opacity-100" : "opacity-0"}`}
                aria-hidden
            />

            <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label={prevLabel}
                disabled={!canScrollLeft}
                className={`absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border shadow-md backdrop-blur-md transition-all duration-300 hover:scale-105 ${btn} ${compact ? "left-0" : "left-0"} ${btnSize} ${canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
                <ChevronLeft className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </button>

            <div
                ref={scrollRef}
                className={`flex max-w-full items-stretch snap-x snap-mandatory overflow-x-auto overscroll-x-contain pb-1 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden ${compact ? "gap-2.5 sm:gap-3" : "gap-4 sm:gap-5"}`}
            >
                {children}
            </div>

            <button
                type="button"
                onClick={() => scroll(1)}
                aria-label={nextLabel}
                disabled={!canScrollRight}
                className={`absolute top-1/2 z-20 flex -translate-y-1/2 items-center justify-center rounded-full border shadow-md backdrop-blur-md transition-all duration-300 hover:scale-105 ${btn} ${compact ? "right-0" : "right-0"} ${btnSize} ${canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"}`}
            >
                <ChevronRight className={compact ? "h-4 w-4" : "h-5 w-5"} />
            </button>
        </div>
    );
}
