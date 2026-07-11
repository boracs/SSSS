import React, { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { resolveAcademyWhatsappUrl, WHATSAPP_TOPICS } from "../lib/whatsapp";

function roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
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
    const { academyClassReservationDepositEur: depositCapRaw = 30, academyWhatsappUrl } = props;
    const depositCap = Math.max(0, Number(depositCapRaw) || 30);

    const qty = Math.max(1, Number(groupLessonRequestPayload?.quantity ?? 1) || 1);
    const unit = lesson?.price != null ? Number(lesson.price) : null;
    const total = unit != null ? roundMoney(unit * qty) : 0;
    const reservaEur = total > 0 ? roundMoney(Math.min(depositCap, total)) : depositCap;

    const isPrivateFlow = lesson?.id === "PRIVATE_FLOW";
    const isNewRequest = Boolean(groupLessonRequestPayload && lesson?.id && !isPrivateFlow);
    const isPayPending = !isNewRequest && !isPrivateFlow && lesson?.id;

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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-brand-deep/70 backdrop-blur-md" onClick={() => !processing && onClose?.()} />
            <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-gradient-to-br from-[#0d234d] to-[#0f2d5c] p-6 shadow-2xl text-white">
                <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-bold">Confirmar pago</h2>
                    <button
                        type="button"
                        onClick={() => !processing && onClose?.()}
                        disabled={processing}
                        className="rounded-xl p-2 text-white/80 hover:bg-white/10 disabled:opacity-50"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>

                <div className="mt-4 space-y-3">
                    <div className="rounded-2xl border border-sky-400/40 bg-sky-500/15 p-4 text-sm leading-relaxed">
                        <p className="font-semibold text-sky-100">Compromiso de reserva</p>
                        <p className="mt-2 text-white/90">
                            Para formalizar la reserva basta con una señal de {depositCap.toFixed(0)} € como compromiso de asistencia.
                        </p>
                    </div>

                    {total > 0 ? (
                        <div className="rounded-xl bg-white/10 p-4 text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-white/70">Precio total</span>
                                <span className="font-semibold">{total.toFixed(2).replace(".", ",")} €</span>
                            </div>
                            <div className="flex justify-between border-t border-white/10 pt-2">
                                <span className="text-white/70">Señal a pagar ahora</span>
                                <span className="font-bold text-emerald-300">{reservaEur.toFixed(2).replace(".", ",")} €</span>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl bg-white/10 p-4 text-sm">
                            <span className="text-white/70">Señal a pagar: </span>
                            <span className="font-bold text-emerald-300">{reservaEur.toFixed(2).replace(".", ",")} €</span>
                        </div>
                    )}

                    {enrollmentId ? (
                        <p className="text-xs text-white/50">Ref. reserva #{enrollmentId}</p>
                    ) : null}

                    {sessionExpired ? (
                        <div className="rounded-xl border border-rose-300/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                            Sesión expirada. Cierra y vuelve a intentarlo.
                        </div>
                    ) : countdown?.display && !hasProof ? (
                        <div className="flex items-center gap-2 text-sm text-white/70">
                            <span>Tiempo restante:</span>
                            <span className="font-mono font-bold text-amber-300">{countdown.display}</span>
                        </div>
                    ) : null}

                    <p className="text-xs text-white/50">
                        Serás redirigido a la pasarela segura de Stripe. El pago se confirmará automáticamente.
                    </p>
                </div>

                {isAdmin && !isPrivateFlow ? (
                    <button
                        type="button"
                        onClick={handleAdminManualConfirm}
                        disabled={!currentUserId || processing}
                        className="mt-4 w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                        Confirmar pago en tienda (efectivo/TPV)
                    </button>
                ) : null}

                <div className="mt-5 flex gap-3">
                    <button
                        type="button"
                        onClick={iniciarPagoStripe}
                        disabled={processing || sessionExpired || hasProof}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {processing ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Preparando pago…
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="1" y="4" width="22" height="16" rx="2" />
                                    <line x1="1" y1="10" x2="23" y2="10" />
                                </svg>
                                {isPayPending ? "Pagar con tarjeta" : "Reservar y pagar"}
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={() => !processing && onClose?.()}
                        disabled={processing}
                        className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-60"
                    >
                        Cancelar
                    </button>
                </div>

                {whatsappHref ? (
                    <a
                        href={whatsappHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-sm text-white hover:bg-emerald-500/30"
                    >
                        Tengo problemas con el pago
                    </a>
                ) : null}
            </div>
        </div>
    );
}
