import React, { useEffect, useMemo, useState } from "react";
import { usePage } from "@inertiajs/react";
import { formatMonthYearMadridFromYearMonth } from "../../lib/madridTime";
import {
    formatEurosFromCents,
    quotePrivateLesson,
} from "../../lib/privateLessonPricing";
import { ymd, startOfMonth, addMonths } from "./StudentCalendar";

const fieldClass =
    "mt-1 w-full rounded-xl border border-gray-600 bg-gray-950/60 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/40";

function emptyParticipant() {
    return { first_name: "", last_name: "", age: "" };
}

/**
 * Solicitud de clase particular (alumno o visitante). Estado de calendario/slots local.
 */
export default function PrivateLessonRequestModal({
    open,
    onClose,
    initialDate,
    todayStr,
    onContinueToPayment,
}) {
    const pageProps = usePage().props;
    const authUser = pageProps.auth?.user || null;
    const privateLessonPricing = pageProps.academyPrivateLesson ?? null;
    const [privateDate, setPrivateDate] = useState(initialDate);
    const [privateDurationMode, setPrivateDurationMode] = useState("preset");
    const [privateDurationMinutes, setPrivateDurationMinutes] = useState(90);
    const [privateManualMinutes, setPrivateManualMinutes] = useState(90);
    const [privateSlots, setPrivateSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [selectedPrivateSlot, setSelectedPrivateSlot] = useState(null);
    const [privateSlotsExpanded, setPrivateSlotsExpanded] = useState(false);
    const [miniMonth, setMiniMonth] = useState(initialDate);
    const [participants, setParticipants] = useState([emptyParticipant()]);
    const [guestFirstName, setGuestFirstName] = useState("");
    const [guestLastName, setGuestLastName] = useState("");
    const [guestEmail, setGuestEmail] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [formError, setFormError] = useState(null);

    const needsGuestContact = !authUser;

    const privateEffectiveDurationMinutes = useMemo(
        () =>
            privateDurationMode === "manual"
                ? Math.max(30, Number(privateManualMinutes || 90))
                : Number(privateDurationMinutes || 90),
        [privateDurationMode, privateManualMinutes, privateDurationMinutes],
    );

    const priceQuote = useMemo(
        () =>
            quotePrivateLesson(
                privateLessonPricing,
                participants.length,
                privateEffectiveDurationMinutes,
            ),
        [privateLessonPricing, participants.length, privateEffectiveDurationMinutes],
    );

    const privateDurationLabel = useMemo(() => {
        const m = privateEffectiveDurationMinutes;
        if (m === 60) return "1 hora";
        if (m === 90) return "1,5 horas";
        if (m === 120) return "2 horas";
        return `${m} min`;
    }, [privateEffectiveDurationMinutes]);

    const miniMonthStart = useMemo(
        () => startOfMonth(new Date((miniMonth || initialDate) + "T12:00:00")),
        [miniMonth, initialDate],
    );
    const miniMonthEnd = useMemo(
        () => new Date(miniMonthStart.getFullYear(), miniMonthStart.getMonth() + 1, 0),
        [miniMonthStart],
    );
    const miniFirstDow = useMemo(() => (miniMonthStart.getDay() + 6) % 7, [miniMonthStart]);
    const miniTotalCells = useMemo(
        () => Math.ceil((miniFirstDow + miniMonthEnd.getDate()) / 7) * 7,
        [miniFirstDow, miniMonthEnd],
    );
    const miniCells = useMemo(() => {
        const out = [];
        for (let i = 0; i < miniTotalCells; i++) {
            const dayNum = i - miniFirstDow + 1;
            const inMonth = dayNum >= 1 && dayNum <= miniMonthEnd.getDate();
            const d = new Date(miniMonthStart.getFullYear(), miniMonthStart.getMonth(), dayNum);
            out.push({ key: ymd(d), inMonth, dayNum });
        }
        return out;
    }, [miniTotalCells, miniFirstDow, miniMonthStart, miniMonthEnd]);

    const loadPrivateSlots = async (d, durationOverride = null) => {
        setLoadingSlots(true);
        setSelectedPrivateSlot(null);
        try {
            const durationMinutes = durationOverride ?? privateEffectiveDurationMinutes;
            const res = await fetch(
                route("academy.private.availability", {
                    date: d,
                    duration_minutes: durationMinutes,
                }),
                { headers: { Accept: "application/json" } },
            );
            const json = await res.json();
            setPrivateSlots(Array.isArray(json.slots) ? json.slots : []);
        } catch (e) {
            setPrivateSlots([]);
        } finally {
            setLoadingSlots(false);
        }
    };

    useEffect(() => {
        if (!open) {
            setPrivateSlotsExpanded(false);
            setFormError(null);
            return;
        }
        setPrivateDate(initialDate);
        setMiniMonth(initialDate);
        setSelectedPrivateSlot(null);
        setPrivateSlotsExpanded(false);
        setFormError(null);
        setParticipants([
            authUser
                ? {
                      first_name: String(authUser.nombre || "").trim(),
                      last_name: String(authUser.apellido || "").trim(),
                      age: "",
                  }
                : emptyParticipant(),
        ]);
        if (!authUser) {
            setGuestFirstName("");
            setGuestLastName("");
            setGuestEmail("");
            setGuestPhone("");
        }
        loadPrivateSlots(initialDate, 90);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, initialDate]);

    if (!open) return null;

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
            prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
        );
    };

    const normalizedParticipants = () =>
        participants.map((p) => ({
            first_name: String(p.first_name || "").trim(),
            last_name: String(p.last_name || "").trim(),
            age: Number(p.age),
        }));

    const participantsValid = participants.every((p) => {
        const first = String(p.first_name || "").trim();
        const last = String(p.last_name || "").trim();
        const age = Number(p.age);
        return (
            first !== "" &&
            last !== "" &&
            Number.isInteger(age) &&
            age >= 5 &&
            age <= 99
        );
    });

    const continueToPayment = () => {
        if (!selectedPrivateSlot) return;
        if (!participantsValid) {
            setFormError("Indica nombre, apellidos y edad (5–99) de cada persona.");
            return;
        }
        const people = normalizedParticipants();

        if (needsGuestContact) {
            const first = guestFirstName.trim();
            const last = guestLastName.trim();
            const email = guestEmail.trim();
            const phone = guestPhone.trim();
            if (!first || !last || !email || !phone) {
                setFormError(
                    "Indica nombre, apellidos, email y teléfono de quien paga.",
                );
                return;
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                setFormError("El email no parece válido.");
                return;
            }
            setFormError(null);
            onContinueToPayment({
                date: privateDate,
                start: selectedPrivateSlot.start,
                duration_minutes: privateEffectiveDurationMinutes,
                participants: people,
                price_cents: priceQuote.totalCents,
                deposit_cents: priceQuote.depositCents,
                guest_first_name: first,
                guest_last_name: last,
                guest_email: email,
                guest_phone: phone,
            });
            return;
        }
        setFormError(null);
        onContinueToPayment({
            date: privateDate,
            start: selectedPrivateSlot.start,
            duration_minutes: privateEffectiveDurationMinutes,
            participants: people,
            price_cents: priceQuote.totalCents,
            deposit_cents: priceQuote.depositCents,
        });
    };

    return (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-950/70" onClick={onClose} aria-hidden />
            <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
                            Paso 2 · Particular
                        </p>
                        <h3 className="mt-1 font-heading text-lg font-bold text-gray-100">
                            Solicitar clase particular
                        </h3>
                    </div>
                    <button type="button" onClick={onClose} className="s4-btn s4-btn-primary s4-btn--sm">
                        Cerrar
                    </button>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
                    {/* Columna izquierda: fecha */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-300">Fecha</label>
                        <div className="mt-2 rounded-2xl border border-gray-700 bg-gray-900 p-3">
                            <div className="flex items-center justify-between">
                                <button
                                    type="button"
                                    onClick={() => setMiniMonth(ymd(addMonths(miniMonthStart, -1)))}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-100 hover:bg-gray-700"
                                    aria-label="Mes anterior"
                                >
                                    ←
                                </button>
                                <div className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
                                    {formatMonthYearMadridFromYearMonth(
                                        miniMonthStart.getFullYear(),
                                        miniMonthStart.getMonth() + 1,
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMiniMonth(ymd(addMonths(miniMonthStart, 1)))}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-100 hover:bg-gray-700"
                                    aria-label="Mes siguiente"
                                >
                                    →
                                </button>
                            </div>
                            <div className="mt-2 grid grid-cols-7 gap-1 text-[10px] font-bold text-gray-400">
                                {["L", "M", "X", "J", "V", "S", "D"].map((w) => (
                                    <div key={w} className="text-center">
                                        {w}
                                    </div>
                                ))}
                            </div>
                            <div className="mt-2 grid grid-cols-7 gap-1">
                                {miniCells.map((c) => {
                                    const disabled = !c.inMonth || c.key < todayStr;
                                    const selected = c.key === privateDate;
                                    return (
                                        <button
                                            key={c.key}
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => {
                                                setPrivateDate(c.key);
                                                loadPrivateSlots(c.key);
                                            }}
                                            className={[
                                                "h-10 rounded-xl text-xs font-semibold transition-all",
                                                disabled
                                                    ? "cursor-not-allowed bg-gray-800 text-gray-600"
                                                    : "bg-gray-800 text-gray-200 hover:-translate-y-0.5",
                                                selected
                                                    ? "bg-s4-cyan text-slate-900 shadow-md"
                                                    : "ring-1 ring-gray-600/70",
                                            ].join(" ")}
                                        >
                                            {c.inMonth ? c.dayNum : ""}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Columna derecha: duración + horarios + personas */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-300">
                                Horario disponible
                            </label>
                            <div className="mt-2 rounded-2xl border border-gray-700 bg-gray-900 p-3">
                                <label
                                    htmlFor="private-duration"
                                    className="block text-xs font-medium text-gray-400"
                                >
                                    Duración de la clase:
                                </label>
                                <div
                                    className={[
                                        "mt-1.5 grid gap-2",
                                        privateDurationMode === "manual"
                                            ? "grid-cols-1 sm:grid-cols-2"
                                            : "grid-cols-1",
                                    ].join(" ")}
                                >
                                    <select
                                        id="private-duration"
                                        value={
                                            privateDurationMode === "manual"
                                                ? "manual"
                                                : String(privateDurationMinutes)
                                        }
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (v === "manual") {
                                                setPrivateDurationMode("manual");
                                                setPrivateSlotsExpanded(false);
                                                loadPrivateSlots(
                                                    privateDate,
                                                    Math.max(30, Number(privateManualMinutes || 90)),
                                                );
                                            } else {
                                                const minutes = Number(v);
                                                setPrivateDurationMode("preset");
                                                setPrivateDurationMinutes(minutes);
                                                setPrivateSlotsExpanded(false);
                                                loadPrivateSlots(privateDate, minutes);
                                            }
                                        }}
                                        className="input-focus-ring w-full rounded-xl px-3 py-2 text-sm"
                                    >
                                        <option value="60">1 hora</option>
                                        <option value="90">1,5 horas</option>
                                        <option value="120">2 horas</option>
                                        <option value="manual">Manual</option>
                                    </select>
                                    {privateDurationMode === "manual" ? (
                                        <select
                                            value={privateManualMinutes}
                                            onChange={(e) => {
                                                const minutes = Number(e.target.value || 90);
                                                setPrivateManualMinutes(minutes);
                                                setPrivateSlotsExpanded(false);
                                                loadPrivateSlots(privateDate, Math.max(30, minutes));
                                            }}
                                            className="input-focus-ring w-full rounded-xl px-3 py-2 text-sm"
                                            aria-label="Minutos manuales"
                                        >
                                            {Array.from({ length: 18 }, (_, i) => 45 + i * 15).map(
                                                (m) => (
                                                    <option key={m} value={m}>
                                                        {m} min
                                                    </option>
                                                ),
                                            )}
                                        </select>
                                    ) : null}
                                </div>

                                {selectedPrivateSlot && !privateSlotsExpanded ? (
                                    <p className="mb-2 mt-3 text-xs text-cyan-300">
                                        Seleccionado:{" "}
                                        <span className="font-semibold text-cyan-200">
                                            {selectedPrivateSlot.start} a {selectedPrivateSlot.end}
                                        </span>{" "}
                                        ({privateDurationLabel})
                                    </p>
                                ) : (
                                    <div className="mt-3" />
                                )}

                                {loadingSlots ? (
                                    <p className="text-sm text-gray-300">Cargando disponibilidad…</p>
                                ) : privateSlots.length === 0 ? (
                                    <p className="text-sm text-gray-300">
                                        No hay huecos disponibles para ese día.
                                    </p>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setPrivateSlotsExpanded((v) => !v)}
                                            className="flex w-full items-center justify-between gap-2 rounded-xl border border-gray-600/80 bg-gray-800 px-3 py-2.5 text-sm font-semibold text-gray-100 hover:border-cyan-500/40"
                                            aria-expanded={privateSlotsExpanded}
                                        >
                                            <span>
                                                {privateSlotsExpanded
                                                    ? "Ocultar horarios"
                                                    : "Ver horarios"}
                                            </span>
                                            <span
                                                className={`text-xs text-gray-400 transition-transform ${privateSlotsExpanded ? "rotate-180" : ""}`}
                                                aria-hidden
                                            >
                                                ▼
                                            </span>
                                        </button>

                                        {privateSlotsExpanded ? (
                                            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-gray-700/70 bg-gray-950/40 p-1.5 sm:max-h-44">
                                                <div className="flex flex-col gap-1">
                                                    {privateSlots.map((s) => {
                                                        const key = `${s.start}-${s.end}`;
                                                        const active =
                                                            selectedPrivateSlot?.start === s.start;
                                                        return (
                                                            <button
                                                                key={key}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedPrivateSlot(s);
                                                                    setPrivateSlotsExpanded(false);
                                                                }}
                                                                className={[
                                                                    "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold",
                                                                    active
                                                                        ? "bg-s4-cyan text-slate-900"
                                                                        : "bg-gray-800/90 text-gray-200 ring-1 ring-gray-600/80 hover:bg-gray-700/90",
                                                                ].join(" ")}
                                                            >
                                                                <span>
                                                                    {s.start} a {s.end}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ) : null}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Personas — rellena el hueco vacío */}
                        <section>
                            <div className="flex items-center justify-between gap-2">
                                <h4 className="text-sm font-semibold text-gray-300">
                                    Personas de la clase{" "}
                                    <span className="tabular-nums text-gray-500">
                                        ({participants.length}/6)
                                    </span>
                                </h4>
                                <button
                                    type="button"
                                    onClick={addParticipant}
                                    disabled={participants.length >= 6}
                                    className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    + Añadir persona
                                </button>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">
                                Quién surfeará en la sesión.
                            </p>

                            <div className="mt-3 space-y-3">
                                {participants.map((row, idx) => (
                                    <div key={`private-p-${idx}`}>
                                        {participants.length > 1 ? (
                                            <div className="mb-1.5 flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-500">
                                                    Persona {idx + 1}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => removeParticipant(idx)}
                                                    className="inline-flex min-h-10 items-center text-xs font-semibold text-rose-300/90 hover:text-rose-200"
                                                >
                                                    Quitar
                                                </button>
                                            </div>
                                        ) : null}
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-6">
                                            <label className="block sm:col-span-2">
                                                <span className="text-xs font-medium text-gray-400">
                                                    Nombre
                                                </span>
                                                <input
                                                    type="text"
                                                    autoComplete={idx === 0 ? "given-name" : "off"}
                                                    value={row.first_name}
                                                    onChange={(e) =>
                                                        updateParticipant(
                                                            idx,
                                                            "first_name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className={fieldClass}
                                                    placeholder="Nombre"
                                                />
                                            </label>
                                            <label className="block sm:col-span-2">
                                                <span className="text-xs font-medium text-gray-400">
                                                    Apellidos
                                                </span>
                                                <input
                                                    type="text"
                                                    autoComplete={idx === 0 ? "family-name" : "off"}
                                                    value={row.last_name}
                                                    onChange={(e) =>
                                                        updateParticipant(
                                                            idx,
                                                            "last_name",
                                                            e.target.value,
                                                        )
                                                    }
                                                    className={fieldClass}
                                                    placeholder="Apellidos"
                                                />
                                            </label>
                                            <label className="block sm:col-span-2">
                                                <span className="text-xs font-medium text-gray-400">
                                                    Edad
                                                </span>
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={5}
                                                    max={99}
                                                    value={row.age}
                                                    onChange={(e) =>
                                                        updateParticipant(idx, "age", e.target.value)
                                                    }
                                                    className={fieldClass}
                                                    placeholder="Ej. 12"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-3 space-y-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5">
                                <div className="flex items-baseline justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-cyan-200/80">
                                            Precio de la clase
                                        </p>
                                        <p className="mt-0.5 text-xs text-gray-400">
                                            {priceQuote.people === 1
                                                ? `1 persona · ${privateDurationLabel}`
                                                : `${priceQuote.people} personas · ${privateDurationLabel}`}
                                        </p>
                                    </div>
                                    <p className="shrink-0 text-lg font-bold tabular-nums text-white">
                                        {formatEurosFromCents(priceQuote.totalCents)}
                                    </p>
                                </div>
                                <div className="flex items-baseline justify-between gap-3 border-t border-white/10 pt-1.5 text-xs">
                                    <span className="text-emerald-300/90">
                                        Señal ahora
                                    </span>
                                    <span className="font-semibold tabular-nums text-emerald-200">
                                        {formatEurosFromCents(priceQuote.depositCents)}
                                    </span>
                                </div>
                                {priceQuote.remainingCents > 0 ? (
                                    <p className="text-[11px] leading-snug text-gray-500">
                                        El resto ({formatEurosFromCents(priceQuote.remainingCents)})
                                        lo pagas en la escuela el día de la clase.
                                    </p>
                                ) : null}
                            </div>
                        </section>
                    </div>
                </div>

                {needsGuestContact ? (
                    <div className="mt-5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-200/90">
                            Tus datos de contacto
                        </p>
                        <p className="mt-1 text-xs text-amber-100/70">
                            Los usamos para confirmar la particular y enviarte el recibo de la
                            señal. Nombre y apellidos de quien paga.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <label className="block text-xs font-medium text-gray-300">
                                Nombre
                                <input
                                    type="text"
                                    autoComplete="given-name"
                                    value={guestFirstName}
                                    onChange={(e) => setGuestFirstName(e.target.value)}
                                    className={fieldClass}
                                    placeholder="Maider"
                                />
                            </label>
                            <label className="block text-xs font-medium text-gray-300">
                                Apellidos
                                <input
                                    type="text"
                                    autoComplete="family-name"
                                    value={guestLastName}
                                    onChange={(e) => setGuestLastName(e.target.value)}
                                    className={fieldClass}
                                    placeholder="García"
                                />
                            </label>
                            <label className="block text-xs font-medium text-gray-300 sm:col-span-2">
                                Email
                                <input
                                    type="email"
                                    autoComplete="email"
                                    value={guestEmail}
                                    onChange={(e) => setGuestEmail(e.target.value)}
                                    className={fieldClass}
                                    placeholder="tu@email.com"
                                />
                            </label>
                            <label className="block text-xs font-medium text-gray-300 sm:col-span-2">
                                Teléfono
                                <input
                                    type="tel"
                                    autoComplete="tel"
                                    value={guestPhone}
                                    onChange={(e) => setGuestPhone(e.target.value)}
                                    className={fieldClass}
                                    placeholder="+34 600 000 000"
                                />
                            </label>
                        </div>
                    </div>
                ) : null}

                {formError ? (
                    <p className="mt-3 text-sm text-rose-300" role="alert">
                        {formError}
                    </p>
                ) : null}

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                    <button type="button" className="s4-btn s4-btn-secondary s4-btn--md" onClick={onClose}>
                        Cancelar
                    </button>
                    <button
                        type="button"
                        disabled={!selectedPrivateSlot}
                        onClick={continueToPayment}
                        className="s4-btn s4-btn-primary s4-btn--md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Continuar al pago
                    </button>
                </div>
            </div>
        </div>
    );
}
