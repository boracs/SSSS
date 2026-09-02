import React, { useState } from "react";
import { CalendarRange, Loader2 } from "lucide-react";
import SurfDetailedForecastSlider from "./SurfDetailedForecastSlider";
import useDetailedForecast from "./useDetailedForecast";

let entrySeq = 0;

/**
 * Botón + panel "Ver forecast al detalle" reutilizable (home,
 * taller, SurfBriefMini, Subastas, etc.). Fetch solo al primer clic.
 *
 * @param {"button"|"linkish"|"tile"} [variant]
 * @param {string} [webcamAnchorId] ancla de la webcam en /servicios/webcams
 * @param {string} [panelId]
 * @param {string} [className]
 * @param {string} [label]
 * @param {React.ReactNode} [children] contenido custom del disparador
 */
export default function DetailedForecastEntry({
    variant = "button",
    webcamAnchorId = "webcam-directo",
    panelId: panelIdProp,
    className = "",
    label = "Ver forecast ampliado",
    brief = null,
    children = null,
}) {
    const [panelId] = useState(
        () => panelIdProp || `detailed-timeline-panel-${++entrySeq}`,
    );

    const {
        open,
        days,
        loading,
        error,
        weatherOk,
        weatherMessage,
        openDetailed,
        closeDetailed,
    } = useDetailedForecast();

    const triggerClass =
        variant === "tile"
            ? className
            : variant === "linkish"
              ? `inline-flex items-center gap-1.5 text-sm font-bold text-s4 transition hover:text-cyan-700 ${className}`
              : `inline-flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/30 bg-slate-950/70 px-3.5 py-2 text-sm font-semibold text-cyan-200 shadow-sm transition hover:bg-slate-900 ${className}`;

    return (
        <>
            <button
                type="button"
                onClick={openDetailed}
                aria-expanded={open}
                aria-controls={panelId}
                className={triggerClass}
            >
                {children ?? (
                    <>
                        {loading && open ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                            <CalendarRange className="h-4 w-4" aria-hidden />
                        )}
                        {label}
                    </>
                )}
            </button>

            <SurfDetailedForecastSlider
                panelId={panelId}
                open={open}
                days={days}
                loading={loading}
                error={error}
                weatherOk={weatherOk}
                weatherMessage={weatherMessage}
                onClose={closeDetailed}
                webcamAnchorId={webcamAnchorId}
                brief={brief}
            />
        </>
    );
}
