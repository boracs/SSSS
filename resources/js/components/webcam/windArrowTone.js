/**
 * Color de la flecha de viento en forecast al detalle.
 *
 * Dirección (Zurriola, offshore ≈ S / 180°):
 *   verde = offshore (sur) · gris = lateral · rojo = onshore (norte)
 * Intensidad (5 bandas km/h): más viento → color más intenso.
 *
 * En "glassy" el backend ignora la dirección para calidad; aquí sí usamos
 * los grados para que la flecha no quede todo el día del mismo tono.
 */

const OFFSHORE_CENTER_DEG = 180;
const INTENSITY_MAX_KMH = [8, 14, 22, 32];

/** @param {number} a @param {number} b */
function angleDiffDeg(a, b) {
    return ((((a - b + 180) % 360) + 360) % 360) - 180;
}

/** @param {number} kmh */
export function windIntensityIndex(kmh) {
    const speed = Number(kmh);
    if (!Number.isFinite(speed) || speed <= INTENSITY_MAX_KMH[0]) return 0;
    if (speed <= INTENSITY_MAX_KMH[1]) return 1;
    if (speed <= INTENSITY_MAX_KMH[2]) return 2;
    if (speed <= INTENSITY_MAX_KMH[3]) return 3;
    return 4;
}

/**
 * Familia por brújula (misma lógica que SurfWindStateClassifier, sin glassy).
 * @param {number|null|undefined} windDirectionDeg
 * @returns {'green'|'gray'|'red'}
 */
export function windFamilyFromDegrees(windDirectionDeg) {
    const deg = Number(windDirectionDeg);
    if (!Number.isFinite(deg)) return "gray";
    const diff = Math.abs(angleDiffDeg(deg, OFFSHORE_CENTER_DEG));
    if (diff <= 45) return "green";
    if (diff <= 135) return "gray";
    return "red";
}

/**
 * @param {string|null|undefined} windState glassy|off|cross-off|cross-on|on
 * @param {number|null|undefined} windDirectionDeg
 */
export function windDirectionFamily(windState, windDirectionDeg) {
    if (windState === "glassy" || !windState) {
        return windFamilyFromDegrees(windDirectionDeg);
    }
    switch (windState) {
        case "off":
            return "green";
        case "on":
            return "red";
        case "cross-off":
        case "cross-on":
            return "gray";
        default:
            return windFamilyFromDegrees(windDirectionDeg);
    }
}

// Tonos bien visibles sobre fondo slate-950 (sin opacidades /xx que se pierden).
const ARROW_TONES = {
    green: [
        "text-emerald-500",
        "text-emerald-400",
        "text-emerald-300",
        "text-lime-300",
        "text-lime-200",
    ],
    gray: [
        "text-slate-400",
        "text-slate-300",
        "text-slate-200",
        "text-zinc-200",
        "text-zinc-100",
    ],
    red: [
        "text-rose-500",
        "text-rose-400",
        "text-rose-300",
        "text-red-300",
        "text-red-200",
    ],
};

const VALUE_TONES = {
    green: [
        "text-emerald-400",
        "text-emerald-300",
        "text-emerald-200",
        "text-lime-200",
        "text-lime-100",
    ],
    gray: [
        "text-slate-300",
        "text-slate-200",
        "text-slate-100",
        "text-zinc-100",
        "text-white",
    ],
    red: [
        "text-rose-400",
        "text-rose-300",
        "text-rose-200",
        "text-red-200",
        "text-red-100",
    ],
};

/**
 * @param {string|null|undefined} windState
 * @param {number} windSpeedKmh
 * @param {number|null|undefined} windDirectionDeg
 */
export function windArrowClass(windState, windSpeedKmh, windDirectionDeg) {
    const family = windDirectionFamily(windState, windDirectionDeg);
    const i = windIntensityIndex(windSpeedKmh);
    return ARROW_TONES[family][i];
}

/**
 * @param {string|null|undefined} windState
 * @param {number} windSpeedKmh
 * @param {number|null|undefined} windDirectionDeg
 */
export function windValueClass(windState, windSpeedKmh, windDirectionDeg) {
    const family = windDirectionFamily(windState, windDirectionDeg);
    const i = windIntensityIndex(windSpeedKmh);
    return VALUE_TONES[family][i];
}
