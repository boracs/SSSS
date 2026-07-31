import React, { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, usePage } from "@inertiajs/react";
import { Lock, MessageCircle } from "lucide-react";
import ContactChannelsModal from "./ContactChannelsModal";

const PANEL_INNER =
    "rounded-xl border border-white/15 bg-slate-950 p-3 shadow-2xl shadow-black/50";

/**
 * Popover de requisitos de compra (cuenta + taquilla) + modal de contacto.
 * Panel + dismiss siempre en portal (mismo stacking context) para que los botones
 * del diálogo queden por encima del overlay de cierre.
 *
 * @param {{
 *   disabled?: boolean,
 *   children: React.ReactNode,
 *   triggerClassName?: string,
 *   portal?: boolean,
 * }} props
 */
export default function StoreAccessPopover({
    disabled = false,
    children,
    triggerClassName = "",
    portal: _portal = false, // legacy; el panel siempre va a document.body
}) {
    const { auth } = usePage().props;
    const user = auth?.user ?? null;
    const popoverId = useId();
    const triggerRef = useRef(null);
    const panelRef = useRef(null);

    const [infoOpen, setInfoOpen] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [panelStyle, setPanelStyle] = useState(null);

    const updatePanelPosition = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setPanelStyle({
            position: "fixed",
            top: Math.max(8, rect.top - 8),
            left: Math.min(
                Math.max(rect.left + rect.width / 2, 148),
                window.innerWidth - 148,
            ),
            transform: "translate(-50%, -100%)",
            zIndex: 110,
            width: "min(18.5rem, calc(100vw - 2rem))",
            pointerEvents: "auto",
        });
    };

    useLayoutEffect(() => {
        if (!infoOpen) return undefined;
        updatePanelPosition();
        window.addEventListener("scroll", updatePanelPosition, true);
        window.addEventListener("resize", updatePanelPosition);
        return () => {
            window.removeEventListener("scroll", updatePanelPosition, true);
            window.removeEventListener("resize", updatePanelPosition);
        };
    }, [infoOpen]);

    useEffect(() => {
        if (!infoOpen) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape") setInfoOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [infoOpen]);

    const dismissOutside = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setInfoOpen(false);
    };

    const openContactModal = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setInfoOpen(false);
        // Diferir un tick: evita que el mismo gesto cierre el modal al montarse el backdrop.
        window.setTimeout(() => setContactOpen(true), 0);
    };

    const panelBody = (
        <div
            id={popoverId}
            role="dialog"
            aria-label="Requisitos para comprar"
            className={PANEL_INNER}
        >
            <div className="mb-2 flex items-start gap-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" aria-hidden />
                <p className="text-[11px] leading-relaxed text-slate-200 sm:text-xs">
                    La compra online es para socios con{" "}
                    <strong className="font-semibold text-white">cuenta y taquilla activa</strong>.
                </p>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400 sm:text-xs">
                Si eres cliente recurrente y conoces al personal, ponte en contacto con nosotros y
                buscamos una solución.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
                {!user ? (
                    <Link
                        href={route("login")}
                        className="relative z-10 inline-flex items-center rounded-lg bg-cyan-500 px-2.5 py-1.5 text-[10px] font-bold text-slate-950 hover:bg-cyan-400"
                        onClick={(e) => e.stopPropagation()}
                    >
                        Iniciar sesión
                    </Link>
                ) : null}
                <Link
                    href={route("taquillas.planes")}
                    className="relative z-10 inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-slate-100 hover:border-cyan-400/40"
                    onClick={(e) => e.stopPropagation()}
                >
                    Planes de taquilla
                </Link>
                <button
                    type="button"
                    className="relative z-10 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-bold text-slate-100 hover:border-cyan-400/40"
                    onClick={openContactModal}
                >
                    <MessageCircle className="h-3 w-3" aria-hidden />
                    Contacto
                </button>
            </div>
        </div>
    );

    const floatingUi =
        infoOpen && !disabled
            ? createPortal(
                  <>
                      <div
                          data-store-access-dismiss
                          className="fixed inset-0 z-[100]"
                          aria-hidden
                          onPointerDown={dismissOutside}
                          onClick={dismissOutside}
                      />
                      <div
                          ref={panelRef}
                          data-store-access-panel
                          className="z-[110]"
                          style={panelStyle || { position: "fixed", visibility: "hidden", zIndex: 110 }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                      >
                          {panelBody}
                      </div>
                  </>,
                  document.body,
              )
            : null;

    return (
        <>
            <div className={`relative ${infoOpen ? "z-[111]" : ""}`}>
                <button
                    ref={triggerRef}
                    type="button"
                    aria-expanded={infoOpen}
                    aria-controls={popoverId}
                    aria-haspopup="dialog"
                    disabled={disabled}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (!disabled) setInfoOpen((open) => !open);
                    }}
                    className={triggerClassName}
                >
                    {children}
                </button>
            </div>

            {floatingUi}

            {contactOpen ? (
                <ContactChannelsModal
                    topic="store"
                    title="Hablemos de tu caso"
                    subtitle="Cuéntanos tu situación y te ayudamos a resolver cualquier duda sobre tu acceso, material o taquilla."
                    footerNote="Si eres cliente habitual, contáctanos y buscamos juntos una solución que te encaje."
                    onClose={() => setContactOpen(false)}
                />
            ) : null}
        </>
    );
}
