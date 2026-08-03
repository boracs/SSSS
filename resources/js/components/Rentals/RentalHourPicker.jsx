import { useEffect, useMemo, useState } from "react";
import BookingCalendar from "../BookingCalendar";
import { MINUTE_PACKS, packLabel, priceForMinutes } from "../../lib/rentalPricing";
import { buildPickupSlots, formatTime, resolveRentalPolicy } from "../../lib/rentalAvailability";
import { formatRentalEur } from "../../lib/surfboardPublicDisplay";

/**
 * Alquiler por horas: pack + día + hora de recogida.
 * La devolución nunca se elige: es recogida + pack (misma fórmula que
 * BookingService::normalizeHourWindow). Los slots que pisarían el buffer de
 * otra reserva no se ofrecen.
 */
export default function RentalHourPicker({
    packs,
    policy,
    blockedRanges = [],
    isChecking = false,
    onChange,
}) {
    const resolvedPolicy = useMemo(() => resolveRentalPolicy(policy), [policy]);

    const availablePacks = useMemo(
        () =>
            Object.entries(MINUTE_PACKS)
                .map(([minutes, column]) => ({
                    minutes: Number(minutes),
                    label: packLabel(column),
                    price: packs ? priceForMinutes(packs, Number(minutes)) : 0,
                }))
                .filter((pack) => pack.price > 0),
        [packs],
    );

    const [packMinutes, setPackMinutes] = useState(null);
    const [day, setDay] = useState(null);
    const [pickupTime, setPickupTime] = useState(null);

    useEffect(() => {
        if (availablePacks.length === 0) {
            setPackMinutes(null);
            return;
        }
        setPackMinutes((current) =>
            availablePacks.some((pack) => pack.minutes === current)
                ? current
                : availablePacks[0].minutes,
        );
    }, [availablePacks]);

    const slots = useMemo(() => {
        if (!day || !packMinutes) return [];
        return buildPickupSlots({
            date: day,
            packMinutes,
            policy: resolvedPolicy,
            blockedRanges,
        });
    }, [day, packMinutes, resolvedPolicy, blockedRanges]);

    /* Al cambiar pack o día, la hora elegida puede dejar de ser válida. */
    useEffect(() => {
        setPickupTime((current) =>
            current && slots.some((slot) => slot.time === current && slot.available)
                ? current
                : null,
        );
    }, [slots]);

    const selectedSlot = useMemo(
        () => slots.find((slot) => slot.time === pickupTime) || null,
        [slots, pickupTime],
    );

    const totalPrice = useMemo(
        () => (packs && packMinutes ? priceForMinutes(packs, packMinutes) : null),
        [packs, packMinutes],
    );

    useEffect(() => {
        onChange?.({
            packMinutes,
            pickupAt: selectedSlot?.pickupAt ?? null,
            returnAt: selectedSlot?.returnAt ?? null,
            totalPrice: selectedSlot ? totalPrice : null,
        });
    }, [packMinutes, selectedSlot, totalPrice, onChange]);

    const hasSlots = slots.length > 0;
    const anyAvailable = slots.some((slot) => slot.available);

    if (availablePacks.length === 0) {
        return (
            <p className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm text-slate-400">
                Esta tabla no tiene tarifas por horas. Elige el alquiler por días.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Duración
                </p>
                <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Duración del alquiler">
                    {availablePacks.map((pack) => {
                        const active = pack.minutes === packMinutes;
                        return (
                            <button
                                key={pack.minutes}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setPackMinutes(pack.minutes)}
                                className={`rounded-xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                                    active
                                        ? "bg-cyan-600 text-white ring-cyan-500"
                                        : "bg-slate-950/60 text-slate-300 ring-white/10 hover:bg-slate-800 hover:text-slate-100"
                                }`}
                            >
                                {pack.label}
                                <span
                                    className={`ml-2 text-xs font-medium tabular-nums ${
                                        active ? "text-cyan-100" : "text-slate-500"
                                    }`}
                                >
                                    {formatRentalEur(pack.price)}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="board-availability-calendar">
                <BookingCalendar
                    tone="dark"
                    selectionMode="single"
                    selectedDate={day}
                    onDateChange={setDay}
                    excludeBlockedDays={false}
                    showTotal={false}
                    isChecking={isChecking}
                    blockedRanges={blockedRanges}
                />
            </div>

            <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    Hora de recogida
                </p>

                {!day ? (
                    <p className="mt-2 text-sm text-slate-400">Elige primero el día.</p>
                ) : !hasSlots ? (
                    <p className="mt-2 text-sm text-slate-400">
                        No hay horas para este pack dentro del horario de la escuela.
                    </p>
                ) : (
                    <>
                        <div
                            className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-6"
                            role="group"
                            aria-label="Hora de recogida"
                        >
                            {slots.map((slot) => {
                                const active = slot.time === pickupTime;
                                return (
                                    <button
                                        key={slot.time}
                                        type="button"
                                        disabled={!slot.available}
                                        aria-pressed={active}
                                        onClick={() => setPickupTime(slot.time)}
                                        title={
                                            slot.available
                                                ? `Devolución ${formatTime(slot.returnAt)}`
                                                : "No disponible"
                                        }
                                        className={`rounded-lg px-2 py-2 text-sm font-semibold tabular-nums ring-1 ring-inset transition ${
                                            active
                                                ? "bg-cyan-600 text-white ring-cyan-500"
                                                : slot.available
                                                  ? "bg-slate-950/60 text-slate-200 ring-white/10 hover:bg-slate-800"
                                                  : "cursor-not-allowed bg-slate-900/40 text-slate-600 line-through ring-white/5"
                                        }`}
                                    >
                                        {slot.time}
                                    </button>
                                );
                            })}
                        </div>
                        {!anyAvailable ? (
                            <p className="mt-2 text-sm text-amber-300/90">
                                Este día está completo para esta duración. Prueba otro día u otro pack.
                            </p>
                        ) : null}
                    </>
                )}
            </div>

            {selectedSlot ? (
                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-sm ring-1 ring-inset ring-white/5">
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-slate-400">Recogida</span>
                        <span className="font-heading font-semibold tabular-nums text-slate-100">
                            {formatTime(selectedSlot.pickupAt)}
                        </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                        <span className="text-slate-400">Devolución</span>
                        <span className="font-heading font-semibold tabular-nums text-slate-100">
                            {formatTime(selectedSlot.returnAt)}
                        </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 border-t border-white/10 pt-2">
                        <span className="text-slate-400">Total estimado</span>
                        <span className="font-heading font-semibold tabular-nums text-cyan-300">
                            {formatRentalEur(totalPrice) ?? "—"}
                        </span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
