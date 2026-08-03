import { packLabel } from "./rentalPricing";
import { formatSurfHeight } from "./surfboardMeasures";
import { demoCatalogImage, DEMO_BOARD_IMAGES } from "../utils/demoCatalogImages";

/** Imágenes demo temporales — sustituir cuando cada tabla tenga foto real */
export function imageUrlFor(surfboard) {
    return demoCatalogImage(surfboard?.id, surfboard?.name || "tabla");
}

export function imageListFor(surfboard) {
    const seed = Number(surfboard?.id) || 0;
    const primary = imageUrlFor(surfboard);
    const secondary = DEMO_BOARD_IMAGES[(seed + 1) % DEMO_BOARD_IMAGES.length];
    return primary === secondary ? [primary] : [primary, secondary];
}

export function formatRentalEur(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return `${n.toFixed(2).replace(".", ",")} €`;
}

/** Anchura / grosor con pulgadas si el valor no trae unidad. */
export function formatInchMeasure(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    const text = String(raw).trim();
    if (!text) return null;
    if (/["″]|pulg/i.test(text)) return text;
    return `${text}"`;
}

export function formatVolumeLiters(raw) {
    if (raw === null || raw === undefined || raw === "") return null;
    const n = Number(String(raw).replace(",", "."));
    if (Number.isFinite(n)) return `${n} L`;
    const text = String(raw).trim();
    return /l\b/i.test(text) ? text : `${text} L`;
}

/** Precio ya en céntimos (payload de tarifas); mismo formato que el resto de la ficha. */
export function formatRentalEurFromCents(cents) {
    const n = Number(cents);
    if (!Number.isFinite(n)) return null;
    return formatRentalEur(n / 100);
}

/**
 * Resumen de packs en la ficha; la tabla completa vive en /tablas-alquiler.
 * Solo horas: el precio por día/semana ya se ve al elegir un rango en el
 * calendario, así que no hace falta duplicarlo aquí.
 */
export const TARIFF_SLOTS = ["price_60m", "price_90m", "price_180m", "price_360m"].map((key) => ({
    key,
    label: packLabel(key),
}));

export function buildVisibleTariffs(priceSchema) {
    if (!priceSchema) return [];
    return TARIFF_SLOTS.map(({ key, label }) => {
        const formatted = formatRentalEur(priceSchema[key]);
        return formatted ? { label, formatted } : null;
    }).filter(Boolean);
}

/** Etiqueta de catálogo: prioriza 1 día, si no la primera tarifa visible. */
export function catalogFromPriceLabel(priceSchema) {
    if (!priceSchema) return null;
    const day = formatRentalEur(priceSchema.price_1d);
    if (day) return `desde ${day} / 1 día`;
    const first = buildVisibleTariffs(priceSchema)[0];
    if (!first) return null;
    return `desde ${first.formatted} / ${first.label}`;
}

export { BOARD_CATEGORIES, boardCategoryLabel } from "./surfboardCategories";

export function boardDisplayDescription(board, name) {
    if (!board?.description) return null;
    const description = String(board.description).trim();
    if (!description) return null;
    if (description.toLowerCase() === String(name).trim().toLowerCase()) return null;
    return description;
}

export function boardSpecs(board) {
    return [
        { label: "Altura", value: formatSurfHeight(board?.altura) },
        { label: "Anchura", value: formatInchMeasure(board?.ancho) },
        { label: "Grosor", value: formatInchMeasure(board?.grosor) },
        { label: "Volumen", value: formatVolumeLiters(board?.volumen) },
    ];
}
