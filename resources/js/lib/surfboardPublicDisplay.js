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

export const TARIFF_SLOTS = [
    { key: "price_1h", label: "1 h" },
    { key: "price_4h", label: "4 h" },
    { key: "price_24h", label: "24 h" },
    { key: "price_week", label: "Semana" },
];

export function buildVisibleTariffs(priceSchema) {
    if (!priceSchema) return [];
    return TARIFF_SLOTS.map(({ key, label }) => {
        const formatted = formatRentalEur(priceSchema[key]);
        return formatted ? { label, formatted } : null;
    }).filter(Boolean);
}

export function boardCategoryLabel(category) {
    return category === "soft" ? "Softboard" : "Hardboard";
}

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
