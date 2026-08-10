import React, { useEffect, useState } from "react";

/**
 * Toast fixed top-right estándar del admin. Se autodescarta tras `durationMs`.
 * `variant`: success | error | neutral (por defecto según se infiere de `message`/prop explícita).
 */
export default function AdminToast({ message, variant = "neutral", durationMs = 2500, onDismiss }) {
    const [visible, setVisible] = useState(Boolean(message));

    useEffect(() => {
        setVisible(Boolean(message));
        if (!message || !durationMs) return;
        const timer = setTimeout(() => {
            setVisible(false);
            onDismiss?.();
        }, durationMs);
        return () => clearTimeout(timer);
    }, [message, durationMs, onDismiss]);

    if (!visible || !message) return null;

    const variantClass =
        variant === "success"
            ? "bg-emerald-600 text-white"
            : variant === "error"
              ? "bg-rose-600 text-white"
              : "bg-slate-800 text-white ring-1 ring-white/10";

    return (
        <div
            className={`fixed right-4 top-24 z-toast rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${variantClass}`}
        >
            {message}
        </div>
    );
}
