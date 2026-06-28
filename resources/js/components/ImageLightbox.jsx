import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Visor a pantalla completa montado en document.body (evita recortes por stacking context).
 */
export default function ImageLightbox({ open, src, alt = "Imagen ampliada", onClose }) {
    const [errored, setErrored] = useState(false);

    useEffect(() => {
        setErrored(false);
    }, [src, open]);

    useEffect(() => {
        if (!open) return;
        const saved = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = saved || "";
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    if (!open || !src || typeof document === "undefined") return null;

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-label={alt}
            className="fixed inset-0 z-[1300] flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm sm:p-8"
            onClick={() => onClose?.()}
        >
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClose?.();
                }}
                aria-label="Cerrar imagen ampliada"
                className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-white/30 transition hover:bg-white/25 sm:right-6 sm:top-6"
            >
                <X className="h-6 w-6" aria-hidden="true" />
            </button>

            {errored ? (
                <div
                    className="flex max-h-[85vh] max-w-[90vw] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-brand-deep to-brand-deep/80 px-10 py-16 text-white shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    <svg
                        className="h-20 w-20 opacity-60"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    <p className="mt-4 text-sm text-white/80">Imagen no disponible</p>
                </div>
            ) : (
                <img
                    src={src}
                    alt={alt}
                    decoding="async"
                    loading="eager"
                    draggable={false}
                    className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                    onError={() => setErrored(true)}
                />
            )}
        </div>,
        document.body,
    );
}
