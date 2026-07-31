import React, { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { resolveAcademyWhatsappUrl, WHATSAPP_TOPICS } from "../lib/whatsapp";

function roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
}

function formatEur(n) {
    return roundMoney(n).toFixed(2).replace(".", ",");
}

function formatCountdown(expiresAtIso) {
    if (!expiresAtIso) return { display: null, isExpired: false };
    const end = new Date(expiresAtIso);
    const ms = end.getTime() - Date.now();
    if (ms <= 0) return { display: "00:00", isExpired: true };
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

/**
 * Modal de pago con Stripe Checkout para academia (grupal, particular, pago pendiente).
 */
export default function PaymentModal({
    open,
    onClose,
    lesson,
    expiresAt,
    hasProof = false,
    enrollmentId = null,
    whatsappHelpUrl,
    onSuccessAction,
    isAdmin = false,
    currentUserId = null,
    groupLessonRequestPayload = null,
}) {
    const [processing, setProcessing] = useState(false);
    const [countdown, setCountdown] = useState(() => formatCountdown(expiresAt));
    const [sessionExpired, setSessionExpired] = useState(false);

    useEffect(() => {
        if (!open) {
            setProcessing(false);
            setSessionExpired(false);
        }
    }, [open]);

    useEffect(() => {
        if (!open || hasProof || !expiresAt) return;
        let handledExpired = false;
        const update = () => {
            const next = formatCountdown(expiresAt);
            setCountdown(next);
            if (next.isExpired && !handledExpired) {
                handledExpired = true;
                setSessionExpired(true);
            }
        };
        update();
        const t = window.setInterval(update, 1000);
        return () => window.clearInterval(t);
    }, [open, expiresAt, hasProof]);

    const { props } = usePage();
    const {
        academyClassReservationDepositEur: depositCapRaw = 30,
        academyPrivateLessonDepositEur: privateDepositRaw = 7,
        academyWhatsappUrl,
    } = props;
    const groupDepositCap = Math.max(0, Number(depositCapRaw) || 30);
    const privateDepositCap = Math.max(0, Number(privateDepositRaw) || 7);

    const isPrivateFlow = lesson?.id === "PRIVATE_FLOW";
    const qty = isPrivateFlow
        ? 1
        : Math.max(1, Number(groupLessonRequestPayload?.quantity ?? 1) || 1);
    const unit = lesson?.price != null ? Number(lesson.price) : null;
    // Particular: `price` ya es el total del grupo (tabla 1–6 pax). Grupal: unit × qty.
    const total =
        unit != null
            ? roundMoney(isPrivateFlow ? unit : unit * qty)
            : 0;
    const depositCap = isPrivateFlow ? privateDepositCap : groupDepositCap;
    const reservaEur = total > 0 ? roundMoney(Math.min(depositCap, total)) : depositCap;
    const restoEur = total > 0 ? roundMoney(Math.max(0, total - reservaEur)) : 0;

    const isNewRequest = Boolean(groupLessonRequestPayload && lesson?.id && !isPrivateFlow);
    const isPayPending = !isNewRequest && !isPrivateFlow && lesson?.id;

    const participantCount = Math.max(
        1,
        Array.isArray(lesson?.participants) ? lesson.participants.length : qty,
    );

    const handleAdminManualConfirm = () => {
        if (!lesson?.id || isPrivateFlow || !currentUserId) return;
        router.post(
            route("academy.lessons.manual-confirm-payment", lesson.id),
            { user_id: currentUserId },
            { preserveScroll: true, onSuccess: () => { onClose?.(); router.reload(); } },
        );
    };

    const iniciarPagoStripe = () => {
        if (!lesson?.id || processing || sessionExpired) return;
        setProcessing(true);

        if (isNewRequest) {
            router.post(
                route("academy.lessons.request", lesson.id),
                {
                    quantity: groupLessonRequestPayload.quantity ?? 1,
                    age_bracket: groupLessonRequestPayload.age_bracket || undefined,
                    request_extra_monitor: groupLessonRequestPayload.request_extra_monitor ? 1 : 0,
                    participants: groupLessonRequestPayload.participants ?? [],
                    ...(groupLessonRequestPayload.guest_email
                        ? {
                              guest_email: groupLessonRequestPayload.guest_email,
                              guest_phone: groupLessonRequestPayload.guest_phone,
                          }
                        : {}),
                },
                {
                    preserveScroll: true,
                    onError: () => setProcessing(false),
                },
            );
            return;
        }

        if (isPrivateFlow) {
            router.post(
                route("academy.private.request"),
                {
                    date: lesson.date,
                    start: lesson.start,
                    duration_minutes: lesson.duration_minutes ?? 90,
                    participants: Array.isArray(lesson.participants)
                        ? lesson.participants
                        : [],
                    ...(lesson.guest_first_name
                        ? {
                              guest_first_name: lesson.guest_first_name,
                              guest_last_name: lesson.guest_last_name,
                              guest_email: lesson.guest_email,
                              guest_phone: lesson.guest_phone,
                          }
                        : {}),
                },
                {
                    preserveScroll: true,
                    onError: () => setProcessing(false),
                },
            );
            return;
        }

        router.post(
            route("academy.lessons.pay", lesson.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => onSuccessAction?.(),
                onError: () => setProcessing(false),
            },
        );
    };

    if (!open || !lesson?.id) return null;

    const whatsappHref = resolveAcademyWhatsappUrl(
        whatsappHelpUrl,
        WHATSAPP_TOPICS.payment,
        academyWhatsappUrl,
    );

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/75"
                onClick={() => !processing && onClose?.()}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="payment-modal-title"
                className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            >
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
                            Paso 2 · Pago
                        </p>
                        <h2
                            id="payment-modal-title"
                            className="mt-1 font-heading text-lg font-bold tracking-tight text-white"
                        >
                            Confirmar pago
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => !processing && onClose?.()}
                        disabled={processing}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>

                <div className="mt-5 space-y-4">
                    <p className="text-sm leading-relaxed text-slate-400">
                        {isPrivateFlow
                            ? `Señal de ${depositCap.toFixed(0)} € ahora. El resto de la clase se abona después.`
                            : `Señal de ${depositCap.toFixed(0)} € para formalizar la reserva.`}
                    </p>

                    {total > 0 ? (
                        <div className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-4 py-3.5 text-sm">
                            {isPrivateFlow && lesson?.price_per_person != null ? (
                                <div className="flex justify-between gap-3 text-slate-500">
                                    <span>Tarifa</span>
                                    <span className="tabular-nums text-slate-400">
                                        {Number(lesson.price_per_person)} € × {participantCount}{" "}
                                        {participantCount === 1 ? "persona" : "personas"}
                                    </span>
                                </div>
                            ) : null}
                            <div
                                className={[
                                    "flex justify-between gap-3",
                                    isPrivateFlow && lesson?.price_per_person != null
                                        ? "mt-2"
                                        : "",
                                ].join(" ")}
                            >
                                <span className="text-slate-400">Precio de la clase</span>
                                <span className="font-semibold tabular-nums text-white">
                                    {formatEur(total)} €
                                </span>
                            </div>
                            <div className="mt-2 flex justify-between gap-3 border-t border-white/[0.06] pt-2">
                                <span className="text-slate-400">Señal ahora</span>
                                <span className="font-semibold tabular-nums text-cyan-200">
                                    {formatEur(reservaEur)} €
                                </span>
                            </div>
                            {isPrivateFlow && restoEur > 0 ? (
                                <div className="mt-2 flex justify-between gap-3 text-slate-500">
                                    <span>Resto después</span>
                                    <span className="tabular-nums">{formatEur(restoEur)} €</span>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-white/[0.08] bg-slate-950/50 px-4 py-3.5 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-slate-400">Señal ahora</span>
                                <span className="font-semibold tabular-nums text-cyan-200">
                                    {formatEur(reservaEur)} €
                                </span>
                            </div>
                        </div>
                    )}

                    {enrollmentId ? (
                        <p className="text-xs text-slate-600">Ref. #{enrollmentId}</p>
                    ) : null}

                    {sessionExpired ? (
                        <div
                            role="alert"
                            className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-200"
                        >
                            Sesión expirada. Cierra y vuelve a intentarlo.
                        </div>
                    ) : countdown?.display && !hasProof ? (
                        <p className="text-xs text-slate-500">
                            Tiempo restante:{" "}
                            <span className="font-mono font-semibold text-slate-300">
                                {countdown.display}
                            </span>
                        </p>
                    ) : null}

                    <p className="text-xs leading-relaxed text-slate-600">
                        Redirección a Stripe. El pago se confirma automáticamente.
                    </p>
                </div>

                {isAdmin && !isPrivateFlow ? (
                    <button
                        type="button"
                        onClick={handleAdminManualConfirm}
                        disabled={!currentUserId || processing}
                        className="s4-btn s4-btn-secondary s4-btn--md mt-4 w-full disabled:opacity-60"
                    >
                        Confirmar pago en tienda (efectivo/TPV)
                    </button>
                ) : null}

                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                    <button
                        type="button"
                        onClick={() => !processing && onClose?.()}
                        disabled={processing}
                        className="s4-btn s4-btn-ghost s4-btn--md w-full sm:w-auto disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={iniciarPagoStripe}
                        disabled={processing || sessionExpired || hasProof}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[12rem]"
                    >
                        {processing ? (
                            <>
                                <svg
                                    className="h-4 w-4 animate-spin"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                    />
                                </svg>
                                Preparando…
                            </>
                        ) : isPayPending ? (
                            "Pagar con tarjeta"
                        ) : (
                            "Reservar y pagar"
                        )}
                    </button>
                </div>

                {whatsappHref ? (
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 block text-center text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-cyan-300/90 hover:underline"
                    >
                        ¿Problemas con el pago? Contactar por WhatsApp
                    </a>
                ) : null}
            </div>
        </div>
    );
}
