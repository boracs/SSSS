import React, { useEffect, useState } from "react";
import { router } from "@inertiajs/react";

const RESERVA_EUR = 15;

function formatCountdown(expiresAtIso) {
    if (!expiresAtIso) return { display: null, isExpired: false };
    const end = new Date(expiresAtIso);
    const ms = end.getTime() - Date.now();
    if (ms <= 0) {
        return { display: "00:00", isExpired: true };
    }
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const display =
        hours > 0
            ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
            : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    return { display, isExpired: false };
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
            className={[
                "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium backdrop-blur-sm transition-all duration-300",
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
                    ¡Copiado!
                </span>
            ) : (
                "Copiar"
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
    onSuccessAction,
    isAdmin = false,
    currentUserId = null,
}) {
    const [countdown, setCountdown] = useState(() => formatCountdown(expiresAt));
    const [uploading, setUploading] = useState(false);
    const [sessionExpired, setSessionExpired] = useState(false);
    const [bizumHelpOpen, setBizumHelpOpen] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [successTitle, setSuccessTitle] = useState("¡Recibido con éxito!");
    const [successSubtitle, setSuccessSubtitle] = useState("Validaremos tu pago en breve. ¡Nos vemos pronto en el agua! 🏄‍♂️");
    const successTimeoutRef = React.useRef(null);
    const uploadSuccessRef = React.useRef(false);
    const [selectedProofName, setSelectedProofName] = useState(null);
    const [selectedProofPreviewUrl, setSelectedProofPreviewUrl] = useState(null);
    const [selectedProofKind, setSelectedProofKind] = useState(null); // "image" | "pdf" | "file"

    useEffect(() => {
        if (!open) return;
        if (hasProof) return;
        if (!expiresAt) return;

        let handledExpired = false;
        const update = () => {
            if (uploadSuccessRef.current) return;
            const next = formatCountdown(expiresAt);
            setCountdown(next);
            if (next.isExpired && !handledExpired) {
                handledExpired = true;
                setSessionExpired(true);
                window.setTimeout(() => {
                    try {
                        onClose?.();
                    } catch {
                        // noop
                    }
                }, 1100);
            }
        };

        setSessionExpired(false);
        update();
        const t = window.setInterval(update, 1000);
        return () => window.clearInterval(t);
    }, [open, expiresAt, hasProof, onClose]);

    useEffect(() => {
        if (!open) {
            setUploadSuccess(false);
            if (successTimeoutRef.current) {
                window.clearTimeout(successTimeoutRef.current);
                successTimeoutRef.current = null;
            }
        }
    }, [open]);

    useEffect(() => {
        uploadSuccessRef.current = uploadSuccess;
    }, [uploadSuccess]);

    useEffect(() => {
        // Reset de estado local al abrir/cambiar la leccion
        setSelectedProofName(null);
        if (selectedProofPreviewUrl) URL.revokeObjectURL(selectedProofPreviewUrl);
        setSelectedProofPreviewUrl(null);
        setSelectedProofKind(null);
        setUploading(false);
        setSessionExpired(false);
    }, [open, lesson?.id]);

    const price = lesson?.price != null ? Number(lesson.price) : null;
    const currency = lesson?.currency || "EUR";
    const total = price ?? 0;
    const pendiente = total > RESERVA_EUR ? total - RESERVA_EUR : 0;

    const handleProofSubmit = (e) => {
        e.preventDefault();
        const form = e.target;
        const file = form.proof?.files?.[0];
        if (!file || !lesson?.id) return;
        setUploading(true);
        setUploadSuccess(false);
        setSuccessTitle("¡Recibido con éxito!");
        setSuccessSubtitle("Validaremos tu pago en breve. ¡Nos vemos pronto en el agua! 🏄‍♂️");
        if (successTimeoutRef.current) {
            window.clearTimeout(successTimeoutRef.current);
            successTimeoutRef.current = null;
        }
        const formData = new FormData();
        formData.append("proof", file);
        if (form.payment_method?.value) {
            formData.append("payment_method", form.payment_method.value);
        }
        router.post(route("academy.lessons.upload-proof", lesson.id), formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                // Mostrar pantalla de éxito 1.8s exactos y luego cerrar + refrescar.
                setUploadSuccess(true);
                setBizumHelpOpen(false);
                setSessionExpired(false);
                if (successTimeoutRef.current) {
                    window.clearTimeout(successTimeoutRef.current);
                }
                successTimeoutRef.current = window.setTimeout(() => {
                    successTimeoutRef.current = null;
                    try {
                        onClose?.();
                    } finally {
                        if (typeof onSuccessAction === "function") {
                            onSuccessAction();
                        }
                    }
                }, 1800);
            },
            onFinish: () => setUploading(false),
        });
    };

    const handleAdminManualConfirm = () => {
        if (!lesson?.id || !currentUserId || interactionsDisabled) return;

        setUploading(true);
        setUploadSuccess(false);
        setSuccessTitle("¡Recibido con éxito!");
        setSuccessSubtitle("Venta registrada en tienda correctamente.");
        if (successTimeoutRef.current) {
            window.clearTimeout(successTimeoutRef.current);
            successTimeoutRef.current = null;
        }

        router.post(
            route("academy.lessons.manual-confirm-payment", lesson.id),
            { user_id: currentUserId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUploadSuccess(true);
                    setBizumHelpOpen(false);
                    setSessionExpired(false);
                    successTimeoutRef.current = window.setTimeout(() => {
                        successTimeoutRef.current = null;
                        onClose?.();
                        router.reload();
                    }, 1800);
                },
                onFinish: () => setUploading(false),
            }
        );
    };

    const handleProofFileChange = (e) => {
        const file = e.target?.files?.[0];
        setSelectedProofName(null);
        if (selectedProofPreviewUrl) URL.revokeObjectURL(selectedProofPreviewUrl);
        setSelectedProofPreviewUrl(null);
        setSelectedProofKind(null);
        if (!file) return;

        setSelectedProofName(file.name || "Archivo seleccionado");

        if (file.type?.startsWith("image/")) {
            const url = URL.createObjectURL(file);
            setSelectedProofPreviewUrl(url);
            setSelectedProofKind("image");
        } else if (file.type === "application/pdf" || file.name?.toLowerCase?.().endsWith(".pdf")) {
            setSelectedProofKind("pdf");
        } else {
            setSelectedProofKind("file");
        }
    };

    const datePart = lesson?.starts_at
        ? ` para el día ${new Date(lesson.starts_at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
        : "";
    const refPart = enrollmentId ? ` (Ref. reserva #${enrollmentId})` : "";
    const whatsappText = `Hola Borja, tengo una duda con el pago de mi reserva de Surf${datePart}.${refPart}`;
    const whatsappHref = whatsappHelpUrl ? `${whatsappHelpUrl}?text=${encodeURIComponent(whatsappText)}` : null;

    if (!open) return null;

    const interactionsDisabled = uploadSuccess || uploading;

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div
                className={`absolute inset-0 backdrop-blur-md ${uploadSuccess ? "bg-black/60" : "bg-brand-deep/70"}`}
                aria-hidden
                onClick={() => {
                    if (interactionsDisabled) return;
                    onClose?.();
                }}
            />
            <div
                className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-[#0d234d] to-[#0f2d5c] p-6 shadow-2xl"
                role="dialog"
                aria-labelledby="payment-modal-title"
            >
                <div className="flex items-start justify-between gap-4">
                    <h2
                        id="payment-modal-title"
                        className={`font-heading text-xl font-bold tracking-tight text-white ${uploadSuccess ? "opacity-0 pointer-events-none" : ""}`}
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
                        className="rounded-xl p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed"
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
                                strokeWidth="1.8"
                                aria-hidden
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                            </svg>
                        </div>
                        <div className="mt-3 text-2xl font-extrabold text-green-500">{successTitle}</div>
                        <div className="mt-2 text-sm text-white/85">
                            {successSubtitle}
                        </div>
                    </div>
                ) : (
                    <>
                        {sessionExpired && (
                            <div className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4 text-white">
                                <div className="text-sm font-bold">Sesión expirada</div>
                                <div className="mt-1 text-xs text-white/80">Cierra el modal y vuelve a intentarlo cuando sea necesario.</div>
                            </div>
                        )}

                        <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wider text-white/80">Pasos para pagar sin fricciones</div>
                            <ol className="mt-2 space-y-2 text-sm text-white/90 list-decimal pl-5">
                                <li>Copia los datos de pago.</li>
                                <li>Paga desde tu app bancaria (0€ comisiones).</li>
                                <li>Sube el comprobante aquí abajo.</li>
                            </ol>
                            {!hasProof && countdown?.display && (
                                <div className="mt-3 text-sm font-semibold text-white">
                                    Tu plaza está reservada durante:{" "}
                                    <span className="inline-block min-w-[110px] font-mono font-extrabold tabular-nums tracking-wide">
                                        {countdown.display}
                                    </span>
                                    {countdown.display.split(":").length === 2 ? " min" : ""}
                                </div>
                            )}
                        </div>

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
                            <button
                                type="button"
                                onClick={() => setBizumHelpOpen(true)}
                                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white/90 backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
                                title="Abrir app de tu banco"
                            >
                                Abrir App de mi Banco
                            </button>
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
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <a
                                href="https://www.bbva.es/login.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/20"
                                title="Login BBVA"
                            >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">BBVA</span>
                            </a>
                            <a
                                href="https://app.santander.es/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/20"
                                title="Login Santander"
                            >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">Sant.</span>
                            </a>
                            <a
                                href="https://sso.revolut.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/20"
                                title="Login Revolut"
                            >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">RLT</span>
                            </a>
                            <a
                                href="https://multimedia.caixabank.es/portal/cuenta_online_EXT/index-ES.html"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/20"
                                title="Login CaixaBank"
                            >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">CxB</span>
                            </a>
                            <a
                                href="https://app.n26.com/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white/90 hover:bg-white/20"
                                title="Login N26"
                            >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px]">N26</span>
                            </a>
                        </div>
                    </div>
                </div>

                {lesson?.id && (
                    <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-4">
                        <p className="text-sm font-medium text-white/90">
                            {hasProof ? "Comprobante recibido. Puedes subir otro si lo necesitas." : "¿Ya has hecho el pago? Sube tu comprobante aquí para acelerar la validación."}
                        </p>
                        <form onSubmit={handleProofSubmit} className="mt-3 space-y-3">
                            <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
                                <label className="inline-flex items-center gap-2">
                                    <input type="radio" name="payment_method" value="bizum" defaultChecked disabled={uploading} />
                                    Bizum
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input type="radio" name="payment_method" value="transferencia" disabled={uploading} />
                                    Transferencia
                                </label>
                            </div>
                            {isAdmin && (
                                <button
                                    type="button"
                                    onClick={handleAdminManualConfirm}
                                    disabled={interactionsDisabled || !currentUserId}
                                    className="w-full rounded-xl bg-green-600 px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    Confirmar Pago en Tienda (Efectivo/TPV)
                                </button>
                            )}
                            <div className="flex flex-wrap items-end gap-3">
                                <div
                                    className={[
                                        "flex-1 rounded-2xl border p-3 transition-colors",
                                        selectedProofName
                                            ? "border-emerald-400/70 bg-emerald-400/10"
                                            : "border-white/20 bg-white/5",
                                    ].join(" ")}
                                >
                                    <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Elegir archivo</div>
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
                                                alt="Previsualizacion del justificante"
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
                                                <div className="text-sm font-semibold text-emerald-300 truncate">{selectedProofName}</div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-white/60">Sube una imagen o PDF (max 10MB).</div>
                                        )}
                                    </div>
                                </div>
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
                            </div>
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
                    </>
                )}

            {bizumHelpOpen && (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-deep/70 backdrop-blur-sm" onClick={() => setBizumHelpOpen(false)} aria-hidden />
                    <div className="relative w-full max-w-md rounded-2xl border border-white/20 bg-white/10 p-5 text-white shadow-2xl">
                        <h3 className="font-heading text-lg font-bold">Bizum: paso rápido</h3>
                        <p className="mt-2 text-sm text-white/85 leading-relaxed">
                            Abre la app de tu banco, selecciona Bizum y pega este número.
                        </p>
                        <div className="mt-3 rounded-xl border border-white/20 bg-white/10 p-3 font-mono text-sm text-white">
                            {bizumNumber}
                        </div>
                        <div className="mt-4 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setBizumHelpOpen(false)}
                                className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
    );
}
