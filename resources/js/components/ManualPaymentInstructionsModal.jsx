import React, { useEffect, useState } from "react";

const DEFAULT_STEPS_PAYMENT = "Pasos para completar el pago";
const DEFAULT_STEPS_RESERVATION = "Pasos para completar tu reserva";

/** Texto legal/comercial unificado: señal 30 € (solo clases y alquileres). */
export const DEPOSIT_NOTICE_RESERVATION_ES =
    "Para formalizar la reserva no es necesario abonar el importe total de inmediato: basta con una señal de 30 € como compromiso de asistencia. Si no asistieras sin cancelar dentro de los plazos indicados, esa señal queda aplicada a los gastos derivados.";

function CopyButton({ value, label = "Copiar", copiedMessage = "¡Copiado!" }) {
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
            className={[
                "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-300",
                copied
                    ? "border-emerald-300 bg-emerald-500/90 text-white hover:bg-emerald-500/80"
                    : "border-white/30 bg-white/10 text-white/95 hover:bg-white/20",
            ].join(" ")}
        >
            {copied ? (
                <span className="inline-flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6L9 17l-5-5" />
                    </svg>
                    {copiedMessage}
                </span>
            ) : (
                label
            )}
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

/**
 * Modal oscuro estándar: Bizum + IBAN + copiar, método de pago, subida de justificante, confirmar deshabilitado sin archivo.
 * Reutilizable en academia, alquileres, bonos, taquillas, carrito, mis reservas, etc.
 */
export default function ManualPaymentInstructionsModal({
    open,
    onClose,
    bizumNumber = "[BIZUM_NUMBER]",
    iban = "[IBAN]",
    whatsappHelpUrl = null,
    /** Título del bloque de pasos */
    stepsHeading = null,
    /** Si true, usa texto de “reserva”; si false, texto de “pago” genérico */
    useReservationStepsHeading = false,
    /** Muestra el aviso de señal 30 € (solo clases y alquileres). */
    showDepositNotice = false,
    /** Línea destacada bajo los pasos, ej. "Total a pagar: …" */
    totalPrimaryLine = null,
    /** Filas opcionales [{ label, value }] debajo del total (p. ej. desglose clase) */
    priceBreakdownRows = null,
    /** Caja informativa tipo “tu bono se activará…” */
    secondaryNote = null,
    /** Texto sobre la zona de archivo */
    uploadIntro = "Sube el comprobante para validación manual.",
    hasProof = false,
    /** Contenido opcional entre pasos y desglose (countdown, alertas) */
    afterStepsSlot = null,
    /** Botones o acciones extra encima del input de archivo (p. ej. admin tienda) */
    beforeUploadSlot = null,
    /** Campos extra dentro del formulario (p. ej. referencia de taquilla) */
    extraFormSlot = null,
    /** async ({ proofFile, paymentMethod }) => void — debe lanzar si falla el envío */
    onSubmit,
    /** Tras el mensaje de éxito, antes de cerrar (p. ej. reload parcial). */
    onAfterSuccessSubmit = null,
    successTitle = "¡Recibido con éxito!",
    successSubtitle = "Validaremos tu pago en breve.",
    whatsappMessageBuilder = null,
}) {
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("");
    const [paymentMethodError, setPaymentMethodError] = useState(false);
    const [submitHintVisible, setSubmitHintVisible] = useState(false);
    const [selectedProofName, setSelectedProofName] = useState(null);
    const [selectedProofPreviewUrl, setSelectedProofPreviewUrl] = useState(null);
    const [selectedProofKind, setSelectedProofKind] = useState(null);
    const successTimeoutRef = React.useRef(null);

    const heading = stepsHeading || (useReservationStepsHeading ? DEFAULT_STEPS_RESERVATION : DEFAULT_STEPS_PAYMENT);

    useEffect(() => {
        if (!open) {
            setUploadSuccess(false);
            setUploading(false);
            setPaymentMethod("");
            setPaymentMethodError(false);
            setSubmitHintVisible(false);
            if (successTimeoutRef.current) {
                window.clearTimeout(successTimeoutRef.current);
                successTimeoutRef.current = null;
            }
        }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        setSelectedProofName(null);
        if (selectedProofPreviewUrl) URL.revokeObjectURL(selectedProofPreviewUrl);
        setSelectedProofPreviewUrl(null);
        setSelectedProofKind(null);
        setUploading(false);
        setUploadSuccess(false);
        setPaymentMethod("");
        setPaymentMethodError(false);
        setSubmitHintVisible(false);
    }, [open]);

    const handleProofFileChange = (e) => {
        const file = e.target?.files?.[0];
        setSelectedProofName(null);
        if (selectedProofPreviewUrl) URL.revokeObjectURL(selectedProofPreviewUrl);
        setSelectedProofPreviewUrl(null);
        setSelectedProofKind(null);
        if (!file) return;
        setSelectedProofName(file.name || "Archivo seleccionado");
        if (file.type?.startsWith("image/")) {
            setSelectedProofPreviewUrl(URL.createObjectURL(file));
            setSelectedProofKind("image");
        } else if (file.type === "application/pdf" || file.name?.toLowerCase?.().endsWith(".pdf")) {
            setSelectedProofKind("pdf");
        } else {
            setSelectedProofKind("file");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const input = e.target.querySelector('input[name="proof"]');
        const file = input?.files?.[0];
        if (!file || !onSubmit || uploading) {
            if (!file) setSubmitHintVisible(true);
            return;
        }
        if (!paymentMethod) {
            setPaymentMethodError(true);
            setSubmitHintVisible(true);
            return;
        }
        setUploading(true);
        setUploadSuccess(false);
        try {
            await onSubmit({ proofFile: file, paymentMethod });
            setUploadSuccess(true);
            if (successTimeoutRef.current) window.clearTimeout(successTimeoutRef.current);
            successTimeoutRef.current = window.setTimeout(() => {
                successTimeoutRef.current = null;
                try {
                    onClose?.();
                } catch {
                    // noop
                }
                try {
                    onAfterSuccessSubmit?.();
                } catch {
                    // noop
                }
            }, 1800);
        } catch {
            // el padre puede usar toast; no cerramos
        } finally {
            setUploading(false);
        }
    };

    const whatsappText =
        typeof whatsappMessageBuilder === "function"
            ? whatsappMessageBuilder()
            : "Hola, tengo una duda con el pago de mi reserva.";
    const whatsappHref = whatsappHelpUrl ? `${whatsappHelpUrl}?text=${encodeURIComponent(whatsappText)}` : null;

    if (!open) return null;

    const interactionsDisabled = uploadSuccess || uploading;
    const canSubmit = !!selectedProofName && !!paymentMethod && !uploading;
    const submitHintText = !paymentMethod && !selectedProofName
        ? "Selecciona método de pago y sube el comprobante."
        : !paymentMethod
            ? "Selecciona el método de pago."
            : "Sube el comprobante para continuar.";

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className={`absolute inset-0 backdrop-blur-md ${uploadSuccess ? "bg-black/60" : "bg-brand-deep/70"}`}
                aria-hidden
                onClick={() => {
                    if (interactionsDisabled) return;
                    onClose?.();
                }}
            />
            <div
                className="relative max-h-[92vh] w-full max-w-[80vw] overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-[#0d234d] to-[#0f2d5c] p-5 shadow-2xl lg:p-7 xl:max-w-[1200px]"
                role="dialog"
                aria-labelledby="manual-payment-title"
            >
                <div className="flex items-start justify-between gap-4">
                    <h2
                        id="manual-payment-title"
                        className={`font-heading text-xl font-bold tracking-tight text-white ${uploadSuccess ? "pointer-events-none opacity-0" : ""}`}
                    >
                        Instrucciones de pago
                    </h2>
                    <button
                        type="button"
                        onClick={() => {
                            if (interactionsDisabled) return;
                            onClose?.();
                        }}
                        disabled={interactionsDisabled}
                        className="rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                        aria-label="Cerrar"
                    >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {uploadSuccess ? (
                    <div className="mt-8 flex flex-col items-center text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                            <svg
                                className="h-20 w-20 scale-110 animate-bounce text-green-500"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.8}
                                aria-hidden
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            </svg>
                        </div>
                        <div className="mt-3 text-2xl font-extrabold text-green-500">{successTitle}</div>
                        <div className="mt-2 text-sm text-white/85">{successSubtitle}</div>
                    </div>
                ) : (
                    <>
                        <div className="mt-4 grid grid-cols-1 gap-5 xl:grid-cols-2 xl:gap-6">
                            <div className="space-y-4">
                                {showDepositNotice ? (
                                    <div className="rounded-2xl border border-sky-400/40 bg-sky-500/15 p-4 text-sm leading-relaxed text-white">
                                        <p className="font-semibold text-sky-100">Compromiso de reserva</p>
                                        <p className="mt-2 text-white/90">{DEPOSIT_NOTICE_RESERVATION_ES}</p>
                                    </div>
                                ) : null}

                                <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wider text-white/80">{heading}</div>
                                    <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-white/90">
                                        <li>Copia los datos de pago (Bizum o IBAN).</li>
                                        <li>Realiza el pago desde tu app bancaria.</li>
                                        <li>Sube el comprobante para validación manual.</li>
                                    </ol>
                                    {totalPrimaryLine ? (
                                        <div className="mt-3 text-sm font-semibold text-white">{totalPrimaryLine}</div>
                                    ) : null}
                                </div>

                                {afterStepsSlot ? <div>{afterStepsSlot}</div> : null}

                                {priceBreakdownRows && priceBreakdownRows.length > 0 ? (
                                    <div className="space-y-2 rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
                                        {priceBreakdownRows.map((row) => (
                                            <div key={row.label} className="flex justify-between text-sm">
                                                <span className="text-white/80">{row.label}</span>
                                                <span className="font-semibold text-white">{row.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
                                        <label className="inline-flex cursor-pointer items-center gap-2">
                                            <input
                                                type="radio"
                                                name="mpm_method"
                                                checked={paymentMethod === "bizum"}
                                                onChange={() => {
                                                    setPaymentMethod("bizum");
                                                    setPaymentMethodError(false);
                                                }}
                                                disabled={uploading}
                                            />
                                            Bizum
                                        </label>
                                        <label className="inline-flex cursor-pointer items-center gap-2">
                                            <input
                                                type="radio"
                                                name="mpm_method"
                                                checked={paymentMethod === "transferencia"}
                                                onChange={() => {
                                                    setPaymentMethod("transferencia");
                                                    setPaymentMethodError(false);
                                                }}
                                                disabled={uploading}
                                            />
                                            Transferencia
                                        </label>
                                    </div>
                                    <p className={`text-xs ${paymentMethodError ? "text-rose-300" : "text-white/60"}`}>
                                        {paymentMethodError ? "Selecciona el método de pago." : "Ningún método de pago seleccionado."}
                                    </p>
                                    <div className="space-y-3 rounded-xl bg-white/10 p-3 text-sm text-white/95">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="min-w-0 flex-1 break-all">
                                                <strong>Bizum:</strong> {bizumNumber}
                                            </p>
                                            <CopyButton value={bizumNumber} label="Copiar Bizum" copiedMessage="Bizum copiado" />
                                        </div>
                                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                                            <p className="min-w-0 flex-1 break-all">
                                                <strong>IBAN:</strong> {iban}
                                            </p>
                                            <CopyButton value={iban} label="Copiar IBAN" copiedMessage="IBAN copiado" />
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
                                    {secondaryNote ? (
                                        <div className="mb-3 rounded-xl border border-sky-400/30 bg-sky-500/10 p-3 text-sm text-sky-50">{secondaryNote}</div>
                                    ) : null}
                                    <p className="text-sm font-medium text-white/90">{hasProof ? "Comprobante recibido. Puedes subir otro si lo necesitas." : uploadIntro}</p>
                                    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
                                        {beforeUploadSlot}
                                        {extraFormSlot}
                                        <div
                                            className={[
                                                "rounded-2xl border p-3 transition-colors",
                                                selectedProofName ? "border-emerald-400/70 bg-emerald-400/10" : "border-white/20 bg-white/5",
                                            ].join(" ")}
                                        >
                                            <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Subir comprobante</div>
                                            <input
                                                type="file"
                                                name="proof"
                                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf"
                                                onChange={handleProofFileChange}
                                                className="mt-2 w-full max-w-full text-sm text-white/90 file:mr-2 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-sm file:text-white disabled:opacity-60"
                                                required
                                                disabled={uploading}
                                            />
                                            <div className="mt-2 min-h-[2.2rem]">
                                                {selectedProofPreviewUrl ? (
                                                    <img
                                                        src={selectedProofPreviewUrl}
                                                        alt="Previsualización del justificante"
                                                        className="h-20 w-full rounded-xl border border-white/20 object-contain bg-white/5"
                                                    />
                                                ) : selectedProofName ? (
                                                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-2">
                                                        {selectedProofKind === "pdf" ? (
                                                            <svg className="h-8 w-8 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 3h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 3v5h5" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="h-8 w-8 text-emerald-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-1a4 4 0 1 0-8 0v1" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16h8" />
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4" />
                                                            </svg>
                                                        )}
                                                        <div className="truncate text-sm font-semibold text-emerald-300">{selectedProofName}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-white/60">Imagen o PDF (máx. 10 MB).</div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-start gap-2">
                                            <div
                                                className="relative"
                                                onMouseEnter={() => {
                                                    if (!canSubmit) setSubmitHintVisible(true);
                                                }}
                                                onMouseLeave={() => setSubmitHintVisible(false)}
                                                onTouchStart={() => {
                                                    if (!canSubmit) setSubmitHintVisible(true);
                                                }}
                                                onClick={() => {
                                                    if (!canSubmit) setSubmitHintVisible((prev) => !prev);
                                                }}
                                            >
                                                <button
                                                    type="submit"
                                                    disabled={!canSubmit}
                                                    className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {uploading ? (
                                                        <>
                                                            <Spinner className="h-4 w-4" />
                                                            Enviando…
                                                        </>
                                                    ) : (
                                                        "Confirmar y enviar"
                                                    )}
                                                </button>
                                                {submitHintVisible && !canSubmit ? (
                                                    <p className="pointer-events-none absolute left-0 top-[calc(100%+6px)] z-10 max-w-xs rounded-lg bg-slate-900/95 px-3 py-2 text-xs text-white shadow-xl">
                                                        {submitHintText}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => !uploading && onClose?.()}
                                                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/20"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </form>
                                </div>

                                {whatsappHref ? (
                                    <div className="space-y-2">
                                        <a
                                            href={whatsappHref}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-sm font-medium text-white hover:bg-emerald-500/30"
                                        >
                                            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            Tengo problemas con el pago
                                        </a>
                                        <p className="text-xs leading-relaxed text-white/80">
                                            Si le urge o tiene prisa, puede llamarnos. Estaremos encantados de solucionarle las dudas o problemas; si decide esperar, le atenderemos lo antes posible. Gracias por su tiempo.
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
