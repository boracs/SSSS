/**
 * Textos de ayuda de métricas del forecast (fuente única: tooltips «?» + modal «Cómo interpretar»).
 * Claves alineadas con SurfForecastTable MetricInfo.
 */

export const FORECAST_GUIDE_ARTICLE_SLUG =
    "como-interpretar-el-parte-de-olas-guia-avanzada-para-surfistas";

/** @type {ReadonlyArray<{ id: string, label: string, text: string }>} */
export const SURF_METRIC_HELP_ITEMS = Object.freeze([
    {
        id: "oleaje",
        label: "Oleaje",
        text:
            "Qué es: altura de la ola (metros) y dirección (flecha = de dónde viene el mar).\n\n" +
            "En Zurriola (abre al NW): si el swell llega de NW entra de lleno y se nota más tamaño. Si viene rotado (S u otras direcciones), gran parte de la energía se pierde por la costa y la playa queda más pequeña de lo que sugiere el número.\n\n" +
            "Cómo leerlo: mira la flecha + los metros juntos; un 0,5 m de NW no es lo mismo que 0,5 m de sur.",
    },
    {
        id: "periodo",
        label: "Periodo",
        text:
            "Qué es: segundos entre una ola y la siguiente.\n\n" +
            "En Zurriola: 6–9 s mar de viento (fofas); 10–13 s óptimo (mar de fondo ordenado); ≥14 s mucha energía de fondo y más riesgo de cerrazón en arena de verano.",
    },
    {
        id: "energia",
        label: "Energía / kJ",
        text:
            "Qué es: índice de punch del oleaje alineado a Surf-Forecast, calculado sobre Open-Meteo (no es un feed oficial de SF).\n\n" +
            "Fórmula: kJ ≈ 2.4 × boost(T) × 0.5 × (H×1.52)² × T (H en pies). La escala 1.52 corrige Hs OM→SF en Zurriola; boost sube en periodo largo. La columna de altura sigue siendo Open-Meteo sin escalar.\n\n" +
            "Umbrales S4 (orientativos): <50 intermedio escaso; ~70–80 avanzado posible; ≥100 pueden surfear todos.",
    },
    {
        id: "viento",
        label: "Viento",
        text:
            "Qué es: km/h + flecha (de dónde sopla).\n\n" +
            "Zurriola: sur = offshore (ordena, facilita leer y anticipar la ola para colocarte a tiempo); norte = onshore (aplana/abofa, pica el mar y dificulta lectura, anticipación y posición).\n\n" +
            "Colores: verde flojo, amarillo medio, rojo fuerte.",
    },
    {
        id: "marea",
        label: "Marea",
        text:
            "Fuente preferente: Euskalmet (Open Data Euskadi) — pleamar/bajamar con minutos. Si falta, estimación Open-Meteo.\n\n" +
            "Bajo cada día: ~2 altas y ~2 bajas con flecha, hora y altura. Entre paréntesis (+/− Xm) cuánto subió o bajó desde el extremo anterior.\n\n" +
            "Coeficientes del día: Sube +Xm (media de llenados) y Baja −Xm (media de vaciados).",
    },
]);

/** Mapa id → texto para MetricInfo / overrides. */
export const DEFAULT_METRIC_HELP = Object.freeze(
    Object.fromEntries(SURF_METRIC_HELP_ITEMS.map((item) => [item.id, item.text])),
);

export function splitHelpParagraphs(text) {
    return String(text ?? "")
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);
}
