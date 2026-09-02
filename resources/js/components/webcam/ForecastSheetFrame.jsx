import React, { createContext, useContext, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

const ForecastSheetExpandContext = createContext(null);

export function useForecastSheetExpand() {
    return useContext(ForecastSheetExpandContext);
}

/**
 * Agranda el sheet a la altura del texto (contentRef = wrapper h-fit).
 * No medir el scroller flex-1: si ya creció, scrollHeight suma altura en cada clic.
 */
export function useGrowSheetForNested(open, overlayRef, contentRef) {
    const setMinHeightPx = useForecastSheetExpand();

    useLayoutEffect(() => {
        if (typeof setMinHeightPx !== "function") {
            return undefined;
        }

        if (!open) {
            setMinHeightPx(0);
            return undefined;
        }

        const measure = () => {
            const overlay = overlayRef.current;
            const content = contentRef.current;
            if (!overlay || !content) {
                return;
            }

            const header = overlay.querySelector("[data-nested-header]");
            const footer = overlay.querySelector("[data-nested-footer]");
            const styles = window.getComputedStyle(overlay);
            const padY =
                (Number.parseFloat(styles.paddingTop) || 0) +
                (Number.parseFloat(styles.paddingBottom) || 0);
            const needed =
                (header?.offsetHeight ?? 0) +
                content.offsetHeight +
                (footer?.offsetHeight ?? 0) +
                padY +
                4;
            const cap = Math.round(window.innerHeight * 0.9);
            const next = Math.min(Math.ceil(needed), cap);
            setMinHeightPx((prev) => (prev === next ? prev : next));
        };

        measure();
        const node = contentRef.current;
        const observer = node ? new ResizeObserver(measure) : null;
        observer?.observe(node);
        window.addEventListener("resize", measure);

        return () => {
            observer?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [open, overlayRef, contentRef, setMinHeightPx]);
}

/**
 * Bottom-sheet del parte, portaleado a document.body.
 * `h-fit` crece con el contenido; `maxHeightClass` es el tope.
 * Los modales anidados pueden subir `minHeight` vía useGrowSheetForNested.
 */
export default function ForecastSheetFrame({
    open,
    panelId,
    label,
    maxHeightClass = "h-fit max-h-[90dvh]",
    children,
}) {
    const [minHeightPx, setMinHeightPx] = useState(0);

    if (!open || typeof document === "undefined") {
        return null;
    }

    return createPortal(
        <ForecastSheetExpandContext.Provider value={setMinHeightPx}>
            <div
                id={panelId}
                role="dialog"
                aria-modal="false"
                aria-label={label}
                className={`fixed inset-x-0 bottom-0 top-auto z-overlay-panel flex w-full flex-col overflow-hidden rounded-t-2xl border-t border-cyan-500/25 bg-slate-950/95 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md overscroll-contain sm:rounded-t-3xl ${maxHeightClass}`}
                style={{
                    paddingBottom: "env(safe-area-inset-bottom, 0px)",
                    minHeight: minHeightPx > 0 ? `${minHeightPx}px` : undefined,
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            </div>
        </ForecastSheetExpandContext.Provider>,
        document.body,
    );
}
