import React from "react";
import { ChevronDown } from "lucide-react";

/**
 * Trigger controlado para acordeones / disclosures.
 * Solo el botón (+ chevron); el panel lo pinta el padre con el mismo `panelId`.
 *
 * @param {boolean} open
 * @param {() => void} onToggle
 * @param {string} [panelId] — id del panel (aria-controls)
 * @param {string} [label] — aria-label fijo (si se pasa, tiene prioridad)
 * @param {string} [labelOpen="Cerrar detalle"] — aria-label si abierto (icon-only)
 * @param {string} [labelClosed="Abrir detalle"] — aria-label si cerrado (icon-only)
 * @param {string} [className]
 * @param {string} [chevronClassName="h-4 w-4"]
 * @param {string} [chevronWrapperClassName] — envuelve el chevron (p. ej. pastilla)
 * @param {boolean} [showChevron=true]
 * @param {boolean} [stopPropagation=true]
 * @param {React.ReactNode} [children] — etiqueta/contenido; el chevron va al final
 */
export default function AccordionTrigger({
    open,
    onToggle,
    panelId,
    label,
    labelOpen = "Cerrar detalle",
    labelClosed = "Abrir detalle",
    className = "",
    chevronClassName = "h-4 w-4",
    chevronWrapperClassName,
    showChevron = true,
    stopPropagation = true,
    children = null,
    ...rest
}) {
    const handleClick = (e) => {
        if (stopPropagation) {
            e.stopPropagation();
        }
        onToggle?.(e);
    };

    const {
        "aria-label": ariaLabelOverride,
        onClick: _ignoredOnClick,
        ...safeRest
    } = rest;

    const iconOnly =
        children == null || children === false || children === "";
    const computedLabel = open ? labelOpen : labelClosed;
    const ariaLabel =
        ariaLabelOverride !== undefined
            ? ariaLabelOverride
            : label !== undefined
              ? label
              : iconOnly
                ? computedLabel
                : undefined;

    const chevron = showChevron ? (
        <ChevronDown
            className={`shrink-0 transition-transform duration-200 ${
                open ? "rotate-180" : ""
            } ${chevronClassName}`}
            aria-hidden
        />
    ) : null;

    return (
        <button
            type="button"
            {...safeRest}
            aria-expanded={Boolean(open)}
            aria-controls={panelId || undefined}
            aria-label={ariaLabel}
            onClick={handleClick}
            className={className}
        >
            {children}
            {chevronWrapperClassName && chevron ? (
                <span className={chevronWrapperClassName} aria-hidden>
                    {chevron}
                </span>
            ) : (
                chevron
            )}
        </button>
    );
}
