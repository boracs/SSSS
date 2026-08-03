/** Categorías de alquiler (espejo de Surfboard::CATEGORIES en PHP). */
export const BOARD_CATEGORIES = [
    { id: "soft", label: "Softboards" },
    { id: "hard_basic", label: "Duras básicas" },
    { id: "hard_pro", label: "Duras pro boards" },
];

export function boardCategoryLabel(category) {
    return (
        BOARD_CATEGORIES.find((item) => item.id === category)?.label ??
        "Tabla de alquiler"
    );
}
