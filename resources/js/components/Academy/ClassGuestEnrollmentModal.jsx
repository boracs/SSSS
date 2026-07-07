import { useEffect, useState } from "react";
import { emptyGuestForm, guestFormFromEnrollment } from "../../lib/guestEnrollment";

export default function ClassGuestEnrollmentModal({
    open,
    mode = "create",
    enrollment = null,
    onClose,
    onSubmit,
    processing = false,
}) {
    const [form, setForm] = useState(emptyGuestForm());

    useEffect(() => {
        if (!open) return;
        setForm(mode === "edit" ? guestFormFromEnrollment(enrollment) : emptyGuestForm());
    }, [open, mode, enrollment]);

    if (!open) return null;

    const set = (key, value) => setForm((s) => ({ ...s, [key]: value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit?.(form);
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={onClose} aria-label="Cerrar" />
            <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-gray-800 to-gray-900 p-5 shadow-2xl ring-1 ring-white/10">
                <h3 className="text-lg font-bold text-white">
                    {mode === "edit" ? "Editar apuntado" : "Añadir persona"}
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                    Reserva telefónica — no requiere registro en la web.
                </p>
                <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Nombre</label>
                            <input
                                value={form.first_name}
                                onChange={(e) => set("first_name", e.target.value)}
                                className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                                required
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Apellidos</label>
                            <input
                                value={form.last_name}
                                onChange={(e) => set("last_name", e.target.value)}
                                className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                                required
                            />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Teléfono (opcional)</label>
                        <input
                            value={form.phone}
                            onChange={(e) => set("phone", e.target.value)}
                            className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Email (opcional)</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => set("email", e.target.value)}
                            className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-gray-500">Estado del pago</label>
                        <select
                            value={form.payment_status}
                            onChange={(e) => set("payment_status", e.target.value)}
                            className="w-full rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100"
                        >
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Pagado</option>
                            <option value="rejected">Rechazado</option>
                        </select>
                    </div>
                    <div className="mt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="rounded-xl border border-gray-600 px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-gray-700">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                        >
                            {processing ? "Guardando…" : mode === "edit" ? "Guardar" : "Añadir"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
