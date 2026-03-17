import React, { useState } from "react";
import { router } from "@inertiajs/react";

/**
 * FAB para cuando la clase ha pasado a Surf-Trip: Confirmar asistencia o Solicitar reembolso.
 */
export default function SurfTripFab({ lesson, className = "" }) {
    const [open, setOpen] = useState(false);

    if (!lesson?.is_surf_trip) return null;

    const confirm = () => {
        router.post(route("academy.lessons.confirm-surf-trip", lesson.id), { confirm: true });
        setOpen(false);
    };
    const refund = () => {
        router.post(route("academy.lessons.confirm-surf-trip", lesson.id), { confirm: false });
        setOpen(false);
    };

    return (
        <div className={`fixed bottom-6 right-6 z-modal ${className}`}>
            {open && (
                <div className="absolute bottom-14 right-0 w-72 rounded-2xl border-2 border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md">
                    <p className="text-sm font-medium text-slate-800">
                        La clase se ha movido a <strong>Playa Secundaria (Furgoneta)</strong>.
                    </p>
                    <div className="mt-3 flex gap-2">
                        <button
                            type="button"
                            onClick={confirm}
                            className="btn-primary flex-1 text-sm"
                        >
                            Confirmar asistencia
                        </button>
                        <button
                            type="button"
                            onClick={refund}
                            className="btn-secondary flex-1 text-sm"
                        >
                            Solicitar reembolso
                        </button>
                    </div>
                </div>
            )}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-accent text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
                aria-label="Opciones Surf-Trip"
            >
                <span className="text-xl">🏄</span>
            </button>
        </div>
    );
}
