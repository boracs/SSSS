import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";

const RESERVA_EUR = 15;

function formatCountdown(expiresAtIso) {
    if (!expiresAtIso) return { text: null, minutesLeft: null };
    const end = new Date(expiresAtIso);
    const now = new Date();
    const ms = end.getTime() - now.getTime();
    if (ms <= 0) return { text: "Expirado", minutesLeft: 0 };
    const h = Math.floor(ms / (1000 * 60 * 60));
    const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return { text: `Expira en ${h}h ${m}min`, minutesLeft: Math.floor(ms / 60000) };
}

function CopyButton({ value }) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        if (!value || value.startsWith("[")) return;
        navigator.clipboard.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm font-medium text-white/95 backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
        >
            {copied ? "¡Copiado!" : "Copiar"}
        </button>
    );
}

function Spinner({ className = "h-5 w-5" }) {
    return (
        <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
    );
}

export default function PaymentModal({
    open,
    onClose,
    lesson,
    expiresAt,
    hasProof = false,
    enrollmentId = null,
    bizumNumber = "[BIZUM_NUMBER]",
    iban = "[IBAN]",
    whatsappHelpUrl,
}) {
    const [countdown, setCountdown] = useState(() => formatCountdown(expiresAt));
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (!open || !expiresAt || hasProof) return;
        const update = () => setCountdown(formatCountdown(expiresAt));
        update();
        const t = setInterval(update, 60 * 1000);
        return () => clearInterval(t);
    }, [open, expiresAt, hasProof]);

    const price = lesson?.price != null ? Number(lesson.price) : null;
    const currency = lesson?.currency || "EUR";
    const total = price ?? 0;
    const pendiente = total > RESERVA_EUR ? total - RESERVA_EUR : 0;
    const isUrgent = countdown.minutesLeft != null && countdown.minutesLeft < 60 && countdown.minutesLeft > 0;

    const handleProofSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const file = form.proof?.files?.[0];
        if (!file || !lesson?.id) return;
        setUploading(true);
        const formData = new FormData();
        formData.append("proof", file);
        router.post(route("academy.lessons.upload-proof", lesson.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setUploading(false),
        });
    };

    const datePart = lesson?.starts_at
        ? ` para el día ${new Date(lesson.starts_at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
        : "";
    const refPart = enrollmentId ? ` (Ref. reserva #${enrollmentId})` : "";
    const whatsappText = `Hola Borja, tengo una duda con el pago de mi reserva de Surf${datePart}.${refPart}`;
    const whatsappHref = whatsappHelpUrl ? `${whatsappHelpUrl}?text=${encodeURIComponent(whatsappText)}` : null;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-brand-deep/70 backdrop-blur-md"
                aria-hidden
                onClick={onClose}
            />
            <div
                className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-[#0d234d] to-[#0f2d5c] p-6 shadow-2xl"
                role="dialog"
                aria-labelledby="payment-modal-title"
            >
                <div className="flex items-start justify-between gap-4">
                    <h2 id="payment-modal-title" className="font-heading text-xl font-bold tracking-tight text-white">
                        Instrucciones de pago
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        aria-label="Cerrar"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <p className="mt-4 text-sm leading-relaxed text-white/90">
                    ¡Solicitud recibida! Hemos bloqueado tu plaza durante 3h. Realiza el pago para confirmar.
                </p>

                <div className="mt-6 space-y-4 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                    <div className="flex justify-between text-sm">
                        <span className="text-white/80">Pago de reserva</span>
                        <span className="font-semibold text-white">{RESERVA_EUR} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-white/80">Pago total</span>
                        <span className="font-semibold text-white">{total.toFixed(2)} €</span>
                    </div>
                    {pendiente > 0 && (
                        <div className="flex justify-between text-sm">
                            <span className="text-white/80">Pendiente en escuela (si pagas reserva)</span>
                            <span className="font-semibold text-white">{pendiente.toFixed(2)} €</span>
                        </div>
                    )}
                </div>

                <div className="mt-6 space-y-3">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Bizum</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="min-w-0 truncate rounded-xl bg-white/10 px-3 py-2 font-mono text-sm text-white/95">
                                {bizumNumber}
                            </span>
                            <CopyButton value={bizumNumber} />
                        </div>
                    </div>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">IBAN</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="min-w-0 break-all rounded-xl bg-white/10 px-3 py-2 font-mono text-sm text-white/95">
                                {iban}
                            </span>
                            <CopyButton value={iban} />
                        </div>
                    </div>
                </div>

                {lesson?.id && (
                    <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4">
                        <p className="text-sm font-medium text-white/90">
                            {hasProof ? "Comprobante recibido. Puedes subir otro si lo necesitas." : "¿Ya has hecho el pago? Sube tu comprobante aquí para acelerar la validación."}
                        </p>
                        <form onSubmit={handleProofSubmit} className="mt-3 flex flex-wrap items-end gap-3">
                            <input
                                type="file"
                                name="proof"
                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                className="max-w-full text-sm text-white/90 file:mr-2 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-sm file:text-white"
                                required
                                disabled={uploading}
                            />
                            <button
                                type="submit"
                                disabled={uploading}
                                className="inline-flex min-w-[140px] items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Spinner className="h-4 w-4" />
                                        Subiendo…
                                    </>
                                ) : (
                                    "Subir comprobante"
                                )}
                            </button>
                        </form>
                    </div>
                )}

                {whatsappHref && (
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500/30"
                    >
                        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Tengo problemas con el pago
                    </a>
                )}

                {hasProof ? (
                    <p className="mt-4 text-center text-sm font-medium leading-relaxed text-sky-300">
                        Comprobante recibido. Estamos revisando tu pago; puede tardar un rato según el momento. Gracias por tu paciencia.
                    </p>
                ) : countdown.text ? (
                    <p
                        className={`mt-4 text-center text-sm font-medium ${
                            isUrgent ? "animate-pulse text-red-400" : "text-amber-300"
                        }`}
                    >
                        {countdown.text}
                    </p>
                ) : null}
            </div>
        </div>
    );
}
