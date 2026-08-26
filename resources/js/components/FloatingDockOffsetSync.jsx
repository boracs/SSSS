import { useEffect } from "react";
import { router } from "@inertiajs/react";
import {
    publishFooterOverlapPx,
    clearFooterOverlapPx,
    resetStickyPurchaseBarHeight,
} from "../utils/floatingDockOffset";

/**
 * Mantiene --s4-footer-overlap-h y resetea sticky al cambiar de página.
 * Vive en PublicLayout para que el dock sea fiable aunque Chatbot cargue lazy.
 */
export default function FloatingDockOffsetSync() {
    useEffect(() => {
        const sync = () => publishFooterOverlapPx();

        sync();

        const footer = document.querySelector("footer");
        let footerObserver = null;
        if (footer && typeof ResizeObserver !== "undefined") {
            footerObserver = new ResizeObserver(sync);
            footerObserver.observe(footer);
        }

        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                sync();
                ticking = false;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        document.addEventListener("scroll", onScroll, { passive: true, capture: true });
        window.addEventListener("resize", sync, { passive: true });

        const offNavigate = router.on("navigate", () => {
            resetStickyPurchaseBarHeight();
        });
        const offFinish = router.on("finish", () => {
            resetStickyPurchaseBarHeight();
            requestAnimationFrame(sync);
        });

        return () => {
            footerObserver?.disconnect();
            window.removeEventListener("scroll", onScroll);
            document.removeEventListener("scroll", onScroll, { capture: true });
            window.removeEventListener("resize", sync);
            offNavigate();
            offFinish();
            clearFooterOverlapPx();
            resetStickyPurchaseBarHeight();
        };
    }, []);

    return null;
}
