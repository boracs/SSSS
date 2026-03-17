import axios from 'axios';
window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
// CSRF estable para SPA: usar cookie XSRF-TOKEN (siempre sincronizada) -> header X-XSRF-TOKEN
window.axios.defaults.xsrfCookieName = 'XSRF-TOKEN';
window.axios.defaults.xsrfHeaderName = 'X-XSRF-TOKEN';
window.axios.defaults.withCredentials = true;

// Si hay 419, normalmente es token/sesión desincronizada: recargar para rehacer sesión + token.
window.axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error?.response?.status === 419 && typeof window !== 'undefined') {
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

function getXsrfCookie() {
    const raw = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
    return raw ? decodeURIComponent(raw) : '';
}

const originalFetch = window.fetch.bind(window);

window.fetch = function patchedFetch(input, init) {
    const inputIsRequest = typeof Request !== 'undefined' && input instanceof Request;
    const url = typeof input === 'string' ? input : inputIsRequest ? input.url : input?.url;

    const initObj = init ? { ...init } : {};
    const method = String(initObj.method || (inputIsRequest ? input.method : 'GET')).toUpperCase();

    const isSameOrigin =
        url && (url.startsWith('/') || url.startsWith(window.location.origin));
    const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';

    if (isSameOrigin && isMutating) {
        const xsrf = getXsrfCookie();
        if (xsrf) {
            const headers = initObj.headers || (inputIsRequest ? input.headers : undefined) || {};
            const flat =
                headers instanceof Headers
                    ? Object.fromEntries(headers.entries())
                    : Array.isArray(headers)
                    ? Object.fromEntries(headers)
                    : { ...headers };

            if (!flat['X-XSRF-TOKEN']) flat['X-XSRF-TOKEN'] = xsrf;
            if (!flat['X-Requested-With']) flat['X-Requested-With'] = 'XMLHttpRequest';
            initObj.headers = flat;

            if (inputIsRequest) {
                const newRequest = new Request(input, initObj);
                return originalFetch(newRequest);
            }
        }
    }

    return originalFetch(input, initObj);
};
