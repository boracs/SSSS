import { useCallback, useRef, useState } from "react";

const FLASH_MS = 320;

/**
 * Feedback de pulsación: barra vertical cyan en el borde izquierdo (no fondo).
 * Crece desde el punto Y del clic. Respeta reduced-motion.
 */
export default function PressRipple({
    as: Comp = "button",
    className = "",
    children,
    onPointerDown,
    /** Si true, deja la barra idle visible (p. ej. flyout abierto). */
    active = false,
    ...rest
}) {
    const [flash, setFlash] = useState(null);
    const seq = useRef(0);

    const spawn = useCallback(
        (event) => {
            onPointerDown?.(event);
            if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                return;
            }
            const el = event.currentTarget;
            const rect = el.getBoundingClientRect();
            const height = rect.height || 1;
            const originPct = Math.min(100, Math.max(0, ((event.clientY - rect.top) / height) * 100));
            const id = ++seq.current;
            setFlash({ id, originPct });
            window.setTimeout(() => {
                setFlash((prev) => (prev?.id === id ? null : prev));
            }, FLASH_MS);
        },
        [onPointerDown],
    );

    return (
        <Comp
            {...rest}
            className={`group/navpress relative ${className}`}
            onPointerDown={spawn}
        >
            {children}
            <span
                className="pointer-events-none absolute bottom-1.5 left-0 top-1.5 w-[2px] overflow-visible"
                aria-hidden="true"
            >
                <span
                    className={`absolute inset-0 origin-center rounded-full bg-cyan-400/35 transition-transform duration-200 ease-out group-hover/navpress:scale-y-100 ${
                        active ? "scale-y-100 bg-cyan-400/55" : "scale-y-0"
                    }`}
                />
                {flash ? (
                    <span
                        key={flash.id}
                        className="nav-press-rail absolute inset-0 rounded-full"
                        style={{ transformOrigin: `50% ${flash.originPct}%` }}
                    />
                ) : null}
            </span>
        </Comp>
    );
}
