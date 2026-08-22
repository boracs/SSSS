import React, { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

const DISMISS_KEY = "s4_pwa_install_dismissed_v1";

function isAlreadyInstalled() {
    if (typeof window === "undefined") {
        return true;
    }
    const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        // iOS Safari «Añadir a inicio»
        Boolean(window.navigator.standalone);
    return standalone;
}

/**
 * CTA «Instalar app» solo si:
 * - no está ya instalada (display-mode standalone), y
 * - el navegador dispara beforeinstallprompt (Chrome/Android).
 * El prompt nativo del navegador lo controla Chrome; esto es nuestro aviso propio.
 */
export default function PwaInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (isAlreadyInstalled()) {
            return undefined;
        }
        try {
            if (localStorage.getItem(DISMISS_KEY) === "1") {
                return undefined;
            }
        } catch {
            /* private mode */
        }

        const onBeforeInstall = (event) => {
            event.preventDefault();
            setDeferredPrompt(event);
            setOpen(true);
        };
        const onInstalled = () => {
            setOpen(false);
            setDeferredPrompt(null);
            try {
                localStorage.setItem(DISMISS_KEY, "1");
            } catch {
                /* ignore */
            }
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstall);
        window.addEventListener("appinstalled", onInstalled);
        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstall);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    if (!open || !deferredPrompt || isAlreadyInstalled()) {
        return null;
    }

    const dismiss = () => {
        setOpen(false);
        setDeferredPrompt(null);
        try {
            localStorage.setItem(DISMISS_KEY, "1");
        } catch {
            /* ignore */
        }
    };

    const install = async () => {
        try {
            await deferredPrompt.prompt();
            await deferredPrompt.userChoice;
        } catch {
            /* usuario canceló o navegador bloqueó */
        } finally {
            setDeferredPrompt(null);
            setOpen(false);
        }
    };

    return (
        <div
            className="fixed bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.75rem))] left-[max(0.75rem,env(safe-area-inset-left,0px))] z-[800] w-[min(18.5rem,calc(100vw-5.5rem))] rounded-2xl border border-cyan-900/15 bg-white p-3 shadow-[0_16px_40px_-20px_rgba(15,95,116,0.45)] sm:bottom-6 sm:left-6"
            role="dialog"
            aria-label="Instalar San Sebastián Surf School"
        >
            <div className="flex items-start gap-2.5">
                <img
                    src="/favicon-192.png"
                    alt=""
                    width={40}
                    height={40}
                    className="mt-0.5 h-10 w-10 shrink-0 rounded-xl border border-slate-200 object-cover"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">Instalar S4 Surf</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">
                        Acceso rápido desde el móvil. Solo si aún no la tienes.
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={install}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#0f5f74] px-3 text-xs font-semibold text-white"
                        >
                            <Download className="h-3.5 w-3.5" aria-hidden />
                            Instalar
                        </button>
                        <button
                            type="button"
                            onClick={dismiss}
                            className="inline-flex min-h-10 items-center rounded-xl px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                        >
                            Ahora no
                        </button>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={dismiss}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    aria-label="Cerrar"
                >
                    <X className="h-4 w-4" aria-hidden />
                </button>
            </div>
        </div>
    );
}
