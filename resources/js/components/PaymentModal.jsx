import React, { useEffect, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import ManualPaymentInstructionsModal from "./ManualPaymentInstructionsModal";

function roundMoney(n) {
    return Math.round(Number(n) * 100) / 100;
}

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

/**
 * Modal de pago manual para academia (grupal, particular, subida de justificante).
 * UI compartida: {@link ManualPaymentInstructionsModal}.
 */
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
    groupLessonRequestPayload = null,
}) {
    const [countdown, setCountdown] = useState(() => formatCountdown(expiresAt));
    const [sessionExpired, setSessionExpired] = useState(false);
    const uploadSuccessRef = React.useRef(false);

    useEffect(() => {
        uploadSuccessRef.current = false;
    }, [open, lesson?.id]);

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

    const { academyClassReservationDepositEur: depositCapRaw = 30 } = usePage().props;
    const depositCap = Math.max(0, Number(depositCapRaw) || 30);

    const qty = Math.max(1, Number(groupLessonRequestPayload?.quantity ?? 1) || 1);
    const unit = lesson?.price != null ? Number(lesson.price) : null;
    const total = unit != null ? roundMoney(unit * qty) : 0;
    const reservaEur = total > 0 ? roundMoney(Math.min(depositCap, total)) : 0;
    const pendiente = total > reservaEur ? roundMoney(total - reservaEur) : 0;

    const datePart = lesson?.starts_at
        ? ` para el día ${new Date(lesson.starts_at).toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`
        : "";
    const refPart =
        lesson?.id === "PRIVATE_FLOW"
            ? " (clase particular)"
            : enrollmentId
              ? ` (Ref. reserva #${enrollmentId})`
              : "";

    const whatsappMessageBuilder = () => `Hola Borja, tengo una duda con el pago de mi reserva de Surf${datePart}.${refPart}`;

    const totalPrimaryLine = total > 0 ? `Total a pagar: ${total.toFixed(2).replace(".", ",")} €` : null;

    const afterStepsSlot =
        !hasProof && sessionExpired ? (
            <div className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4 text-white">
                <div className="text-sm font-bold">Sesión expirada</div>
                <div className="mt-1 text-xs text-white/80">Cierra el modal y vuelve a intentarlo cuando sea necesario.</div>
            </div>
        ) : null;

    const handleAdminManualConfirm = () => {
        if (!lesson?.id || lesson.id === "PRIVATE_FLOW" || !currentUserId) return;
        router.post(
            route("academy.lessons.manual-confirm-payment", lesson.id),
            { user_id: currentUserId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    uploadSuccessRef.current = true;
                    onClose?.();
                    router.reload();
                },
            }
        );
    };

    const beforeUploadSlot =
        isAdmin && lesson?.id && lesson.id !== "PRIVATE_FLOW" ? (
            <button
                type="button"
                onClick={handleAdminManualConfirm}
                disabled={!currentUserId}
                className="mb-3 w-full rounded-xl bg-green-600 px-4 py-3 font-bold text-white shadow-lg transition-all hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
                Confirmar Pago en Tienda (Efectivo/TPV)
            </button>
        ) : null;

    const runSubmit = async ({ proofFile, paymentMethod }) => {
        if (!lesson) throw new Error("missing lesson");
        const formData = new FormData();
        formData.append("proof", proofFile);
        if (paymentMethod) formData.append("payment_method", paymentMethod);

        const isPrivateFlow = lesson?.id === "PRIVATE_FLOW";

        await new Promise((resolve, reject) => {
            if (groupLessonRequestPayload && lesson?.id && !isPrivateFlow) {
                formData.append("quantity", String(groupLessonRequestPayload.quantity ?? 1));
                if (groupLessonRequestPayload.age_bracket) {
                    formData.append("age_bracket", groupLessonRequestPayload.age_bracket);
                }
                formData.append("request_extra_monitor", groupLessonRequestPayload.request_extra_monitor ? "1" : "0");
                router.post(route("academy.lessons.request", lesson.id), formData, {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        uploadSuccessRef.current = true;
                        resolve();
                    },
                    onError: () => reject(new Error("request")),
                    onFinish: () => {},
                });
                return;
            }

            if (isPrivateFlow) {
                formData.append("date", lesson.date);
                formData.append("start", lesson.start);
                formData.append("duration_minutes", String(lesson.duration_minutes ?? 90));
                router.post(route("academy.private.request"), formData, {
                    forceFormData: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        uploadSuccessRef.current = true;
                        resolve();
                    },
                    onError: () => reject(new Error("private")),
                    onFinish: () => {},
                });
                return;
            }

            if (!lesson?.id) {
                reject(new Error("no lesson id"));
                return;
            }

            router.post(route("academy.lessons.upload-proof", lesson.id), formData, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    uploadSuccessRef.current = true;
                    resolve();
                },
                onError: () => reject(new Error("proof")),
                onFinish: () => {},
            });
        });
    };

    if (!open || !lesson?.id) return null;

    return (
        <ManualPaymentInstructionsModal
            open={open}
            onClose={onClose}
            bizumNumber={bizumNumber}
            iban={iban}
            whatsappHelpUrl={whatsappHelpUrl}
            useReservationStepsHeading
            showDepositNotice
            totalPrimaryLine={totalPrimaryLine}
            secondaryNote="Tu reserva se actualizará cuando el equipo confirme el pago manualmente."
            uploadIntro="Sube aquí el justificante de pago para validación manual."
            hasProof={hasProof}
            afterStepsSlot={afterStepsSlot}
            beforeUploadSlot={beforeUploadSlot}
            onSubmit={runSubmit}
            onAfterSuccessSubmit={onSuccessAction}
            successSubtitle="Validaremos tu pago en breve. ¡Nos vemos pronto en el agua! 🏄‍♂️"
            whatsappMessageBuilder={whatsappMessageBuilder}
        />
    );
}
