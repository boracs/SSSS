import React, { useId } from "react";
import AccordionTrigger from "./AccordionTrigger";

/**
 * Texto con clamp + «Leer más / Leer menos» (controlado).
 * `collapsedClassName` acepta cualquier string Tailwind (p. ej. line-clamp-3 sm:line-clamp-2).
 *
 * @param {string} text
 * @param {boolean} open
 * @param {() => void} onToggle
 * @param {string} [id] — id del párrafo (aria-controls); si no, useId
 * @param {string} [collapsedClassName="line-clamp-3"]
 * @param {string} [expandLabel="Leer más"]
 * @param {string} [collapseLabel="Leer menos"]
 * @param {string} [className] — clases del <p>
 * @param {string} [buttonClassName]
 * @param {string} [chevronClassName="h-3.5 w-3.5"]
 */
export default function ExpandableText({
    text,
    open,
    onToggle,
    id: idProp,
    collapsedClassName = "line-clamp-3",
    expandLabel = "Leer más",
    collapseLabel = "Leer menos",
    className = "",
    buttonClassName = "",
    chevronClassName = "h-3.5 w-3.5",
}) {
    const autoId = useId();
    const textId = idProp || autoId;

    if (!text) {
        return null;
    }

    return (
        <>
            <p
                id={textId}
                className={`${className} ${open ? "" : collapsedClassName}`.trim()}
            >
                {text}
            </p>
            <AccordionTrigger
                open={open}
                onToggle={onToggle}
                panelId={textId}
                stopPropagation={false}
                className={buttonClassName}
                chevronClassName={chevronClassName}
            >
                {open ? collapseLabel : expandLabel}
            </AccordionTrigger>
        </>
    );
}
