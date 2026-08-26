/**
 * Query del catálogo público de segunda mano (espejo de SecondHandCatalogFilters).
 */
export const SECOND_HAND_CATALOG_QS_KEY = "s4.secondHand.catalogQs";

export function toCatalogQuery(filters = {}) {
    const params = {};
    const q = String(filters.q ?? "").trim();
    if (q) params.q = q;
    if (filters.altura && filters.altura !== "all") params.altura = filters.altura;
    if (filters.volumen && filters.volumen !== "all") params.volumen = filters.volumen;
    if (filters.precio && filters.precio !== "all") params.precio = filters.precio;
    if (filters.tipo && filters.tipo !== "all") params.tipo = filters.tipo;
    if (filters.orden === "asc" || filters.orden === "desc") params.orden = filters.orden;
    return params;
}

export function rememberCatalogQuery(params) {
    if (typeof sessionStorage === "undefined") return;
    const qs = new URLSearchParams(params).toString();
    if (qs) {
        sessionStorage.setItem(SECOND_HAND_CATALOG_QS_KEY, qs);
    } else {
        sessionStorage.removeItem(SECOND_HAND_CATALOG_QS_KEY);
    }
}

export function rememberedCatalogHref() {
    const base = route("second-hand.index");
    if (typeof sessionStorage === "undefined") return base;
    const qs = sessionStorage.getItem(SECOND_HAND_CATALOG_QS_KEY);
    return qs ? `${base}?${qs}` : base;
}
