import React, { useEffect, useState } from "react";
import { usePage } from "@inertiajs/react";

function emptyParticipant() {
    return { first_name: "", last_name: "" };
}

const fieldClass =
    "mt-1 w-full rounded-lg border border-white/15 bg-slate-950/50 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-cyan-400/40 focus:outline-none focus:ring-1 focus:ring-cyan-400/30";

export default function StudentBookingModal({
    open,
    lesson,
    onClose,
    onConfirm,
    processing = false,
    bookerFirstName = "",
    bookerLastName = "",
}) {
    const authUser = usePage().props.auth?.user || null;
    const needsGuestContact = !authUser;
    const [participants, setParticipants] = useState([emptyParticipant()]);
    const [ageBracket, setAgeBracket] = useState("adult");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestError, setGuestError] = useState(null);

    useEffect(() => {
        if (!open) return;
        setParticipants([
            {
                first_name: String(bookerFirstName || "").trim(),
                last_name: String(bookerLastName || "").trim(),
            },
        ]);
        setAgeBracket("adult");
        setGuestEmail("");
        setGuestPhone("");
        setGuestError(null);
    }, [open, lesson?.id, bookerFirstName, bookerLastName]);

    if (!open || !lesson) return null;

    const quantity = participants.length;
    const total = Number(lesson.total_students || 0);
    const standardCap = 6;
    const wouldExceedStandard = total + quantity > standardCap;
    const requestExtra = wouldExceedStandard;

    const hasAdults = !!lesson?.age_mix?.has_adults;
    const hasChildren = !!lesson?.age_mix?.has_children;
    const ageConflict =
        ageBracket !== "family" &&
        ((ageBracket === "children" && hasAdults) ||
            (ageBracket === "adult" && hasChildren));

    const participantsValid = participants.every(
        (p) =>
            String(p.first_name || "").trim() !== "" &&
            String(p.last_name || "").trim() !== "",
    );

    const addParticipant = () => {
        if (participants.length >= 6) return;
        setParticipants((prev) => [...prev, emptyParticipant()]);
    };

    const removeParticipant = (index) => {
        if (participants.length <= 1) return;
        setParticipants((prev) => prev.filter((_, i) => i !== index));
    };

    const updateParticipant = (index, field, value) => {
        setParticipants((prev) =>
            prev.map((row, i) =>
                i === index ? { ...row, [field]: value } : row,
            ),
        );
    };

    const handleConfirm = () => {
        if (needsGuestContact) {
            const email = guestEmail.trim();
            const phone = guestPhone.trim();
            if (!email || !phone) {
                setGuestError("Indica email y teléfono para reservar sin cuenta.");
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setGuestError("El email no parece válido.");
                return;
            }
            setGuestError(null);
            onConfirm({
                quantity,
                ageBracket,
                requestExtra,
                participants: participants.map((p) => ({
                    first_name: String(p.first_name || "").trim(),
                    last_name: String(p.last_name || "").trim(),
                })),
                guest_email: email,
                guest_phone: phone,
            });
            return;
        }
        onConfirm({
            quantity,
            ageBracket,
            requestExtra,
            participants: participants.map((p) => ({
                first_name: String(p.first_name || "").trim(),
                last_name: String(p.last_name || "").trim(),
            })),
        });
    };

    const confirmDisabled = processing || ageConflict || !participantsValid;

    return (
        <div className="fixed inset-0 z-modal flex items-end justify-center p-0 sm:items-center sm:p-4">
            <div
                className="absolute inset-0 bg-slate-950/75"
                onClick={onClose}
                aria-hidden
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-booking-title"
                className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-slate-900 shadow-2xl sm:rounded-2xl"
            >
                <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
                                Paso 2 · Apuntarse
                            </p>
                            <h3
                                id="student-booking-title"
                                className="mt-1 font-heading text-lg font-bold tracking-tight text-white"
                            >
                                Apuntarse a la clase
                            </h3>
                            <p className="mt-1 text-sm leading-snug text-slate-400">
                                Indica quién viene. Un solo pago cubre todas las
                                plazas.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white/5 hover:text-white"
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

                    <div className="mt-6 space-y-6">
                        {/* Personas */}
                        <section>
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-slate-200">
                                    Personas del grupo{" "}
                                    <span className="tabular-nums text-slate-400">
                                        ({quantity}/6)
                                    </span>
                                </h4>
                                <button
                                    type="button"
                                    onClick={addParticipant}
                                    disabled={participants.length >= 6}
                                    className="inline-flex min-h-10 items-center rounded-lg px-2.5 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-400/10 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    + Añadir
                                </button>
                            </div>

                            <div className="mt-3 space-y-3">
                                {participants.map((row, idx) => (
                                    <div
                                        key={`participant-${idx}`}
                                        className={
                                            participants.length > 1
                                                ? "rounded-xl border border-white/[0.07] bg-slate-950/40 p-3"
                                                : undefined
                                        }
                                    >
                                        {participants.length > 1 ? (
                                            <div className="mb-2 flex items-center justify-between">
                                                <span className="text-xs font-medium text-slate-500">
                                                    Persona {idx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeParticipant(idx)
                                                    }
                                                    className="inline-flex min-h-10 items-center px-1 text-xs font-semibold text-rose-300/90 hover:text-rose-200"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        ) : null}
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                            <label className="block">
                                                <span className="text-xs font-medium text-slate-400">
                                                    Nombre
                                                </span>
                                                <input
                                                    type="text"
                                                    placeholder="Nombre"
                                                    value={row.first_name}
                                                    onChange={(e) =>
                                                        updateParticipant(
                                                            idx,
                                                            "first_name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className={fieldClass}
                                                />
                                            </label>
                                            <label className="block">
                                                <span className="text-xs font-medium text-slate-400">
                                                    Apellidos
                                                </span>
                                                <input
                                                    type="text"
                                                    placeholder="Apellidos"
                                                    value={row.last_name}
                                                    onChange={(e) =>
                                                        updateParticipant(
                                                            idx,
                                                            "last_name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className={fieldClass}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Contacto guest */}
                        {needsGuestContact ? (
                            <section>
                                <h4 className="text-sm font-semibold text-slate-200">
                                    Contacto
                                </h4>
                                <p className="mt-0.5 text-xs text-slate-500">
                                    Sin cuenta · email y teléfono para confirmar
                                </p>
                                <div className="mt-3 space-y-3">
                                    <label className="block">
                                        <span className="text-xs font-medium text-slate-400">
                                            Email
                                        </span>
                                        <input
                                            type="email"
                                            autoComplete="email"
                                            placeholder="tu@email.com"
                                            value={guestEmail}
                                            onChange={(e) =>
                                                setGuestEmail(e.target.value)
                                            }
                                            className={fieldClass}
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-xs font-medium text-slate-400">
                                            Teléfono
                                        </span>
                                        <input
                                            type="tel"
                                            autoComplete="tel"
                                            placeholder="+34 …"
                                            value={guestPhone}
                                            onChange={(e) =>
                                                setGuestPhone(e.target.value)
                                            }
                                            className={fieldClass}
                                        />
                                    </label>
                                </div>
                                {guestError ? (
                                    <p
                                        className="mt-2 text-xs text-rose-300"
                                        role="alert"
                                    >
                                        {guestError}
                                    </p>
                                ) : null}
                            </section>
                        ) : null}

                        {/* Edad */}
                        <section>
                            <label
                                htmlFor="student-booking-age"
                                className="block text-sm font-semibold text-slate-200"
                            >
                                Rango de edad del grupo
                            </label>
                            <select
                                id="student-booking-age"
                                value={ageBracket}
                                onChange={(e) =>
                                    setAgeBracket(e.target.value)
                                }
                                className={`${fieldClass} mt-2`}
                            >
                                <option value="children">
                                    👦 Niños (7-11 años)
                                </option>
                                <option value="adult">
                                    🏄‍♂️ Adultos / Jóvenes (+12 años)
                                </option>
                                <option value="family">
                                    👨‍👩‍👧‍👦 Familia (Mezcla - Clase Especial)
                                </option>
                            </select>
                        </section>

                        {/* Tip + avisos */}
                        <section className="space-y-2.5">
                            <p className="text-xs leading-relaxed text-slate-500">
                                El precio se mantiene, pero al ser un grupo
                                mayor, el servicio mejorará con atención
                                personalizada de dos monitores tras nuestra
                                confirmación.
                            </p>

                            {ageConflict ? (
                                <div
                                    role="status"
                                    className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-100/95"
                                >
                                    Este grupo ya cuenta con alumnos de otra
                                    franja. Por seguridad y autonomía, te
                                    sugerimos buscar una sesión compatible o
                                    contactarnos.
                                </div>
                            ) : null}

                            {requestExtra ? (
                                <div
                                    role="status"
                                    className="rounded-lg border border-sky-400/25 bg-sky-500/10 px-3 py-2.5 text-xs leading-relaxed text-sky-100/95"
                                >
                                    Superáis las {standardCap} plazas estándar
                                    por monitor. La solicitud quedará pendiente
                                    hasta que un administrador confirme que hay
                                    cupo y monitor disponible.
                                </div>
                            ) : null}
                        </section>
                    </div>
                </div>

                <div className="shrink-0 border-t border-white/[0.06] bg-slate-900/95 px-5 py-4 sm:px-6">
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="s4-btn s4-btn-ghost s4-btn--md w-full sm:w-auto"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            disabled={confirmDisabled}
                            onClick={handleConfirm}
                            className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[11.5rem]"
                        >
                            {processing
                                ? "Procesando..."
                                : requestExtra
                                  ? "Solicitar permiso admin"
                                  : "Continuar al pago"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
