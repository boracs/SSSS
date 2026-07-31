/** Imágenes de prueba (accesorios / neopreno / quillas) — `/public/img/tienda/demo` */
export const DEMO_PRODUCT_IMAGES = [
    "/img/tienda/demo/producto-neopreno.webp",
    "/img/tienda/demo/producto-invento.webp",
    "/img/tienda/demo/producto-quilla-azul.webp",
    "/img/tienda/demo/producto-quilla-negra.webp",
    "/img/tienda/demo/producto-quillas-set.webp",
];

/** Imágenes de prueba (tablas) — `/public/img/tienda/demo` */
export const DEMO_BOARD_IMAGES = [
    "/img/tienda/demo/tabla-lost-blanca.webp",
    "/img/tienda/demo/tabla-gong-negra.webp",
    "/img/tienda/demo/tabla-bullrun.webp",
    "/img/tienda/demo/tabla-occy-bottom.webp",
    "/img/tienda/demo/tabla-occy-trio.webp",
    "/img/tienda/demo/tabla-perfil.webp",
];

const BOARD_NAME_RE = /\b(tabla|board|shortboard|longboard|foam|softboard|occy|surfboard)\b/i;

/**
 * Placeholder estable por id (y tipo tabla vs accesorio).
 * @param {number|string|null|undefined} id
 * @param {string} [nombre]
 * @returns {string}
 */
export function demoCatalogImage(id, nombre = "") {
    const n = Number(id);
    const seed = Number.isFinite(n) ? Math.abs(n) : 0;
    const pool = BOARD_NAME_RE.test(String(nombre)) ? DEMO_BOARD_IMAGES : DEMO_PRODUCT_IMAGES;
    return pool[seed % pool.length];
}

/**
 * Resuelve URL de imagen de catálogo o cae a demo.
 * @param {string|null|undefined} imagen
 * @param {{ id?: number|string, nombre?: string }} [opts]
 * @returns {string}
 */
export function resolveCatalogImage(imagen, { id, nombre = "" } = {}) {
    const raw = typeof imagen === "string" ? imagen.trim() : "";
    const valid =
        Boolean(raw) &&
        !raw.includes("undefined") &&
        !raw.includes("placeholder.svg") &&
        !raw.includes("Imagen no disponible");
    if (!valid) return demoCatalogImage(id, nombre);

    if (raw.startsWith("http") || raw.startsWith("/")) return raw;
    return `/storage/productos/${raw.replace(/^productos\/?/, "")}`;
}
