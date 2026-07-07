/**
 * Medidas de tablas en notación surf: pies.pulgadas (ej. 4.11 = 4'11", 5.0 = 5'0").
 * Rango estándar de catálogo: 3'5" → 11'0".
 */

export function formatFeetInches(feet, inches) {
    return `${feet}'${inches}"`;
}

/** Lista de alturas para selects (value = pulgadas totales). */
export function buildSurfHeightOptions(
    startFeet = 3,
    startInches = 5,
    endFeet = 11,
    endInches = 0,
) {
    const options = [{ value: "", label: "Sin límite" }];
    let feet = startFeet;
    let inches = startInches;
    const endTotal = endFeet * 12 + endInches;

    while (feet * 12 + inches <= endTotal) {
        const totalInches = feet * 12 + inches;
        options.push({
            value: String(totalInches),
            label: formatFeetInches(feet, inches),
        });
        inches += 1;
        if (inches >= 12) {
            feet += 1;
            inches = 0;
        }
    }

    return options;
}

/** Convierte altura almacenada (6.2, "6'2\"", 6) a pulgadas totales. */
export function parseBoardHeightToInches(raw) {
    if (raw === null || raw === undefined || raw === "") {
        return null;
    }

    const text = String(raw).trim().toLowerCase().replace(",", ".");

    const feetInchMatch = text.match(/(\d+)\s*['′]\s*(\d+)/);
    if (feetInchMatch) {
        const feet = Number(feetInchMatch[1]);
        const inches = Number(feetInchMatch[2]);
        if (Number.isFinite(feet) && Number.isFinite(inches)) {
            return feet * 12 + inches;
        }
    }

    const dotMatch = text.match(/^(\d+)\.(\d+)$/);
    if (dotMatch) {
        const feet = Number(dotMatch[1]);
        const inches = Number(dotMatch[2]);
        if (Number.isFinite(feet) && Number.isFinite(inches) && inches <= 11) {
            return feet * 12 + inches;
        }
    }

    const numeric = Number(text);
    if (!Number.isFinite(numeric)) {
        return null;
    }

    const feet = Math.floor(numeric);
    const fractional = numeric - feet;
    const inchesFromDecimal = Math.round(fractional * 10);
    if (inchesFromDecimal <= 11) {
        return feet * 12 + inchesFromDecimal;
    }

    return Math.round(numeric * 12);
}

export function formatSurfHeight(raw) {
    const total = parseBoardHeightToInches(raw);
    if (total === null) {
        return raw ? String(raw) : "—";
    }
    const feet = Math.floor(total / 12);
    const inches = total % 12;
    return formatFeetInches(feet, inches);
}

export function parseBoardVolume(raw) {
    if (raw === null || raw === undefined || raw === "") {
        return null;
    }
    const value = Number(String(raw).replace(",", "."));
    return Number.isFinite(value) ? value : null;
}

export function buildVolumeOptions(minLiters = 15, maxLiters = 100, step = 1) {
    const options = [{ value: "", label: "Sin límite" }];
    for (let v = minLiters; v <= maxLiters; v += step) {
        options.push({ value: String(v), label: `${v} L` });
    }
    return options;
}

export function boardMatchesMeasureFilters(board, { volumeMin, volumeMax, heightMin, heightMax }) {
    const volume = parseBoardVolume(board.volumen);
    if (volumeMin !== "" && volumeMin != null) {
        const min = Number(volumeMin);
        if (volume === null || volume < min) {
            return false;
        }
    }
    if (volumeMax !== "" && volumeMax != null) {
        const max = Number(volumeMax);
        if (volume === null || volume > max) {
            return false;
        }
    }

    const heightInches = parseBoardHeightToInches(board.altura);
    if (heightMin !== "" && heightMin != null) {
        const min = Number(heightMin);
        if (heightInches === null || heightInches < min) {
            return false;
        }
    }
    if (heightMax !== "" && heightMax != null) {
        const max = Number(heightMax);
        if (heightInches === null || heightInches > max) {
            return false;
        }
    }

    return true;
}
