/**
 * Cabeceras CSRF alineadas con Laravel (cookie XSRF-TOKEN → header X-XSRF-TOKEN).
 */
export function getXsrfFromCookie() {
    if (typeof document === "undefined") {
        return "";
    }

    const raw = document.cookie
        .split("; ")
        .find((row) => row.startsWith("XSRF-TOKEN="))
        ?.split("=")[1];

    return raw ? decodeURIComponent(raw) : "";
}

export function getCsrfFromMeta() {
    if (typeof document === "undefined") {
        return "";
    }

    return document.querySelector('meta[name="csrf-token"]')?.getAttribute("content") ?? "";
}

export function syncCsrfMeta(token) {
    if (typeof document === "undefined" || !token) {
        return;
    }

    const meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) {
        meta.setAttribute("content", token);
    }
}

/**
 * @param {Record<string, string>} [extra]
 * @returns {Record<string, string>}
 */
export function getCsrfFetchHeaders(extra = {}) {
    const xsrf = getXsrfFromCookie();
    const meta = getCsrfFromMeta();

    const headers = {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
        ...extra,
    };

    if (xsrf) {
        headers["X-XSRF-TOKEN"] = xsrf;
    } else if (meta) {
        headers["X-CSRF-TOKEN"] = meta;
    }

    return headers;
}
