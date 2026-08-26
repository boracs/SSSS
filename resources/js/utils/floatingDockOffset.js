/** Compartido con ProductStickyPurchaseBar / Chatbot / PublicLayout. */
export const FOOTER_OVERLAP_CSS_VAR = "--s4-footer-overlap-h";
export const STICKY_PURCHASE_BAR_CSS_VAR = "--s4-sticky-purchase-bar-h";

const FAB_CLEARANCE_GAP_PX = 12;
const FAB_BASE_BOTTOM_PX = 20;
/** Evita que el dock suba demasiado cuando el footer ocupa medio viewport. */
const MAX_FOOTER_LIFT_PX = 148;

function readCssPx(varName) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
}

/**
 * Cuánto hay que subir el dock flotante para que no quede tapado por el footer.
 * Solo cuenta el solape real con la zona del FAB (no toda la altura visible del footer).
 */
export function measureFooterOverlapPx() {
    const footer = document.querySelector("footer");
    if (!footer) {
        return 0;
    }

    const footerTop = footer.getBoundingClientRect().top;
    const viewportH = window.innerHeight;
    const stickyH = readCssPx(STICKY_PURCHASE_BAR_CSS_VAR);
    const naturalInset = FAB_BASE_BOTTOM_PX + stickyH;
    const stackBottomY = viewportH - naturalInset;

    if (footerTop >= stackBottomY - FAB_CLEARANCE_GAP_PX) {
        return 0;
    }

    const neededInset = viewportH - footerTop + FAB_CLEARANCE_GAP_PX;
    const overlap = Math.max(0, neededInset - naturalInset);

    return Math.min(MAX_FOOTER_LIFT_PX, Math.round(overlap));
}

export function publishFooterOverlapPx() {
    document.documentElement.style.setProperty(
        FOOTER_OVERLAP_CSS_VAR,
        `${measureFooterOverlapPx()}px`,
    );
}

export function clearFooterOverlapPx() {
    document.documentElement.style.setProperty(FOOTER_OVERLAP_CSS_VAR, "0px");
}

export function resetStickyPurchaseBarHeight() {
    document.documentElement.style.setProperty(STICKY_PURCHASE_BAR_CSS_VAR, "0px");
}

/** Clases tailwind para FAB/panel anclados encima de sticky + footer. */
export const FLOATING_DOCK_BOTTOM =
    "bottom-[calc(max(1.25rem,env(safe-area-inset-bottom,0px))+var(--s4-sticky-purchase-bar-h,0px)+var(--s4-footer-overlap-h,0px))]";

export const FLOATING_DOCK_BOTTOM_SM =
    "sm:bottom-[calc(1.5rem+var(--s4-sticky-purchase-bar-h,0px)+var(--s4-footer-overlap-h,0px))]";
