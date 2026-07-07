import { PAYMENT_STATUS_LABELS } from "../../lib/guestEnrollment";

export default function ConfirmPaymentModal({
    open,
    enrollment,
    nextStatus,
    onCancel,
    onConfirm,
    processing = false,
}) {
    if (!open || !enrollment) return null;

    const current = PAYMENT_STATUS_LABELS[enrollment.payment_status] || enrollment.payment_status;
    const next = PAYMENT_STATUS_LABELS[nextStatus] || nextStatus;

    return (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={onCancel} aria-label="Cerrar" />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-2xl ring-1 ring-white/10">
                <h3 className="text-lg font-bold text-white">Confirmar cambio de pago</h3>
                <p className="mt-2 text-sm text-gray-300">
                    <span className="font-semibold text-white">{enrollment.name}</span>
                    <br />
                    De <span className="text-amber-200">{current}</span> a <span className="text-cyan-200">{next}</span>.
                </p>
                <p className="mt-2 text-xs text-gray-500">Esta acción queda registrada. ¿Continuar?</p>
                <div className="mt-5 flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                    >
                        {processing ? "Actualizando…" : "Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
