/**
 * Tarifario comercial de clases particulares (misma tabla que /servicios/surf).
 * Precio por persona según tamaño del grupo cerrado (1–6).
 */

/** @type {Record<number, number>} */
export const PRIVATE_LESSON_EUR_PER_PERSON = {
    1: 80,
    2: 55,
    3: 40,
    4: 30,
    5: 30,
    6: 30,
};

/**
 * @param {number} peopleCount
 * @returns {{ people: number, perPersonEur: number, totalEur: number, note: 'total' | 'por persona' }}
 */
export function quotePrivateLesson(peopleCount) {
    const people = Math.min(6, Math.max(1, Math.floor(Number(peopleCount) || 1)));
    const perPersonEur = PRIVATE_LESSON_EUR_PER_PERSON[people] ?? 30;
    return {
        people,
        perPersonEur,
        totalEur: perPersonEur * people,
        note: people === 1 ? "total" : "por persona",
    };
}

/**
 * Filas listables para marketing (Info · Clases de surf).
 * @returns {Array<{ pax: string, precio: string, nota: string }>}
 */
export function privateLessonPriceRows() {
    return [1, 2, 3, 4, 5, 6].map((n) => {
        const q = quotePrivateLesson(n);
        return {
            pax: n === 1 ? "1 persona" : `${n} personas`,
            precio: `${q.perPersonEur} €`,
            nota: q.note,
        };
    });
}
