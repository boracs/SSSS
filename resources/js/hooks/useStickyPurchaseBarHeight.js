import { useEffect, useRef } from "react";

import { STICKY_PURCHASE_BAR_CSS_VAR } from "../utils/floatingDockOffset";

/** Compartido con Chatbot.jsx — offset dinámico del dock flotante. */
export { STICKY_PURCHASE_BAR_CSS_VAR };

/**
 * Publica la altura real de la barra sticky PDP para que el FAB del chat suba.
 */
export function useStickyPurchaseBarHeight(visible) {
    const barRef = useRef(null);

    useEffect(() => {
        const root = document.documentElement;

        if (!visible) {
            root.style.setProperty(STICKY_PURCHASE_BAR_CSS_VAR, "0px");
            return () => root.style.setProperty(STICKY_PURCHASE_BAR_CSS_VAR, "0px");
        }

        const el = barRef.current;
        if (!el) {
            return undefined;
        }

        const publish = () => {
            root.style.setProperty(STICKY_PURCHASE_BAR_CSS_VAR, `${el.offsetHeight}px`);
        };

        publish();
        const observer = new ResizeObserver(publish);
        observer.observe(el);

        return () => {
            observer.disconnect();
            root.style.setProperty(STICKY_PURCHASE_BAR_CSS_VAR, "0px");
        };
    }, [visible]);

    return barRef;
}
