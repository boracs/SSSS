import { useCallback, useEffect, useState } from "react";
import { SURF_LEVEL_PREF_KEY } from "./surfBriefCta";

const VALID = new Set(["iniciacion", "intermedio", "avanzado"]);

function readPref() {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(SURF_LEVEL_PREF_KEY);
        return VALID.has(raw) ? raw : null;
    } catch {
        return null;
    }
}

/**
 * Preferencia de nivel del visitante (localStorage, sin backend).
 */
export function useSurfLevelPreference() {
    const [pref, setPrefState] = useState(null);

    useEffect(() => {
        setPrefState(readPref());
    }, []);

    const setPref = useCallback((level) => {
        if (level !== null && !VALID.has(level)) return;
        try {
            if (level === null) {
                window.localStorage.removeItem(SURF_LEVEL_PREF_KEY);
            } else {
                window.localStorage.setItem(SURF_LEVEL_PREF_KEY, level);
            }
        } catch {
            /* ignore */
        }
        setPrefState(level);
    }, []);

    return [pref, setPref];
}
