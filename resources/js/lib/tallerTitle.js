/**
 * Formato de lectura para títulos del Taller (español editorial).
 * - Evita Title Case denso ("Qué Aprenderé En Mi…").
 * - Separa un subtítulo entre paréntesis finales.
 */

function capitalizeSentenceStart(value) {
    const s = String(value || "");
    if (!s) return "";
    const match = s.match(/^([¿¡"«]*)([\s\S]*)$/);
    if (!match) return s;
    const [, prefix, rest] = match;
    if (!rest) return prefix;
    return `${prefix}${rest.charAt(0).toLocaleUpperCase("es-ES")}${rest.slice(1)}`;
}

/** Convierte Title Case / MAYÚSCULAS densas a frase en español. */
export function toSentenceCaseEs(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    // Ya parece frase (pocas mayúsculas internas) → respetar.
    const letters = raw.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, "");
    const upper = (letters.match(/[A-ZÁÉÍÓÚÜÑ]/g) || []).length;
    if (letters.length >= 8 && upper / letters.length <= 0.22) {
        return raw;
    }
    return capitalizeSentenceStart(raw.toLocaleLowerCase("es-ES"));
}

/**
 * @returns {{ main: string, subtitle: string|null }}
 */
export function formatTallerDisplayTitle(title) {
    const raw = String(title || "").trim();
    if (!raw) return { main: "", subtitle: null };

    const paren = raw.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (paren) {
        let subtitle = toSentenceCaseEs(paren[2].trim());
        subtitle = subtitle.replace(/^y\s+/i, "").trim();
        return {
            main: toSentenceCaseEs(paren[1].trim()),
            subtitle: subtitle || null,
        };
    }

    return { main: toSentenceCaseEs(raw), subtitle: null };
}
