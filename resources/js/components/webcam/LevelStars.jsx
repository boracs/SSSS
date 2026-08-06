import React from "react";
import { Star } from "lucide-react";
import { LEVEL_STAR_STYLES } from "./surfLevels";

/**
 * Fila compacta de estrellas 1–5 por nivel (Ini / Int / Ava).
 * sm/md compactas; lg/xl = slider "forecast al detalle".
 */
export default function LevelStars({ level, stars, size = "sm" }) {
    const style = LEVEL_STAR_STYLES[level];
    if (!style) return null;

    const n = Math.max(1, Math.min(5, Number(stars) || 1));
    const starClass =
        size === "xl"
            ? "h-3 w-3 sm:h-3.5 sm:w-3.5"
            : size === "lg"
              ? "h-2.5 w-2.5 sm:h-3 sm:w-3"
              : size === "md"
                ? "h-2 w-2 sm:h-2.5 sm:w-2.5"
                : "h-1.5 w-1.5";
    const labelClass =
        size === "xl"
            ? "text-[10px] sm:text-[11px]"
            : size === "lg"
              ? "text-[9px] sm:text-[10px]"
              : size === "md"
                ? "text-[8px] sm:text-[9px]"
                : "text-[7px] sm:text-[8px]";
    const pillPad =
        size === "xl" || size === "lg"
            ? "gap-0.5 px-1 py-0.5"
            : "gap-px px-0.5 py-px";

    return (
        <div
            className={`flex w-full items-center justify-center rounded-full ring-1 ${pillPad} ${style.pill}`}
            aria-label={`${style.aria}: ${n} de 5`}
        >
            <span
                className={`shrink-0 font-bold leading-none ${labelClass} ${style.label}`}
                aria-hidden
            >
                {style.short}
            </span>
            <div className="flex items-center gap-px">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                        key={i}
                        className={`${starClass} ${
                            i <= n ? style.filled : "text-slate-700"
                        }`}
                        aria-hidden
                    />
                ))}
            </div>
        </div>
    );
}

/** Tres filas Ini → Int → Ava. */
export function LevelStarsStack({
    iniciacion,
    intermedio,
    avanzado,
    size = "sm",
    className = "",
}) {
    const stackGap = size === "xl" ? "gap-1" : size === "lg" ? "gap-0.5" : "gap-px";

    return (
        <div className={`flex w-full flex-col ${stackGap} ${className}`}>
            <LevelStars level="iniciacion" stars={iniciacion} size={size} />
            <LevelStars level="intermedio" stars={intermedio} size={size} />
            <LevelStars level="avanzado" stars={avanzado} size={size} />
        </div>
    );
}
