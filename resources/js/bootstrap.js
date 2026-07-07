import axios from "axios";
import { route } from "./lib/route.js";
import { getCsrfFetchHeaders } from "./lib/csrf.js";
import { Ziggy } from "./ziggy";

// Túneles / distintos hosts: rutas siempre respecto al origen actual (evita URLs rotas en ziggy.js).
if (typeof window !== "undefined" && window.location?.origin) {
    Ziggy.url = window.location.origin;
    Ziggy.port = window.location.port ? Number(window.location.port) : null;
}

window.axios = axios;
window.route = route;
globalThis.route = route;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";
// CSRF estable para SPA: usar cookie XSRF-TOKEN (siempre sincronizada) -> header X-XSRF-TOKEN
window.axios.defaults.xsrfCookieName = "XSRF-TOKEN";
window.axios.defaults.xsrfHeaderName = "X-XSRF-TOKEN";
window.axios.defaults.withCredentials = true;

// Si hay 419, normalmente es token/sesión desincronizada: recargar para rehacer sesión + token.
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 419 && typeof window !== "undefined") {
            window.location.reload();
        }
        return Promise.reject(error);
    },
);

const originalFetch = window.fetch.bind(window);

window.fetch = function patchedFetch(input, init) {
    const inputIsRequest = typeof Request !== "undefined" && input instanceof Request;
    const url = typeof input === "string" ? input : inputIsRequest ? input.url : input?.url;

    const initObj = init ? { ...init } : {};
    const method = String(initObj.method || (inputIsRequest ? input.method : "GET")).toUpperCase();

    const isSameOrigin =
        url && (url.startsWith("/") || url.startsWith(window.location.origin));
    const isMutating = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";

    if (isSameOrigin && isMutating) {
        const flatHeaders =
            initObj.headers instanceof Headers
                ? Object.fromEntries(initObj.headers.entries())
                : Array.isArray(initObj.headers)
                  ? Object.fromEntries(initObj.headers)
                  : { ...(initObj.headers ?? (inputIsRequest ? Object.fromEntries(input.headers.entries()) : {})) };

        initObj.headers = getCsrfFetchHeaders(flatHeaders);

        if (inputIsRequest) {
            return originalFetch(new Request(input, initObj));
        }
    }

    return originalFetch(input, initObj);
};
