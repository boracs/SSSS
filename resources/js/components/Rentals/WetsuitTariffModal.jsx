import { createPortal } from "react-dom";
import { useEffect } from "react";
import { X } from "lucide-react";
import WetsuitPriceTables from "./WetsuitPriceTables";

/**
 * Popup informativo de precios de neopreno. A diferencia de las tablas, el
 * neopreno no se reserva aquí: hay disponibilidad de sobra y se alquila en
 * el momento de la recogida en el local.
 */
export default function WetsuitTariffModal({ onClose }) {
    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose]);

    return createPortal(
        <div
            className="fixed inset-0 z-[900] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wetsuit-tariff-title"
        >
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/40">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" aria-hidden="true" />
                </button>

                <div className="border-b border-slate-800 px-6 pb-5 pt-6 pr-14">
                    <h3 id="wetsuit-tariff-title" className="text-xl font-bold tracking-tight text-white">
                        Alquiler de neopreno
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        Tenemos disponibilidad de sobra: no hace falta reservarlo aquí, se alquila
                        directamente al recoger la tabla en el local.
                    </p>
                </div>

                <div className="p-6">
                    <WetsuitPriceTables />
                </div>

                <p className="border-t border-slate-800 px-6 py-4 text-center text-xs leading-relaxed text-slate-400">
                    Precios orientativos, sujetos a confirmación en el local según talla disponible.
                </p>
            </div>
        </div>,
        document.body,
    );
}
