import React, { useCallback, useEffect, useMemo, useState } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import { CalendarDays, Clock, Loader2, Lock } from "lucide-react";
import { toast } from "react-toastify";
import BookingCalendar from "./BookingCalendar";
import ContactChannelsModal from "./ContactChannelsModal";
import RentalHourPicker from "./Rentals/RentalHourPicker";
import WetsuitTariffModal from "./Rentals/WetsuitTariffModal";
import { Collapsible, CollapsibleContent } from "./ui/collapsible";
import { buildPacksFromSchema, DAY_PACKS } from "../lib/rentalPricing";
import { localDate, localDateTime, normalizeDayWindow, resolveRentalPolicy } from "../lib/rentalAvailability";
import { formatRentalEur } from "../lib/surfboardPublicDisplay";

const MODE_DAY = "day";
const MODE_HOUR = "hour";

const MODE_TABS = [
    { id: MODE_HOUR, label: "Por horas", hint: "Pack de horas + recogida el mismo día", icon: Clock },
    { id: MODE_DAY, label: "Por días", hint: "Selecciona un rango en el calendario", icon: CalendarDays },
];

function isoDate(value) {
    return localDate(value) || "";
}

function formatDateTimeLabel(value) {
    if (!value) return null;
    return new Intl.DateTimeFormat("es-ES", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    }).format(value);
}

/**
 * Reserva de alquiler: modo horas (pack + hora de recogida) o modo días
 * (ciclo mediodía → mediodía). La devolución y el bloqueo con buffer los
 * calcula BookingService; aquí solo se refleja lo mismo para el cliente.
 */
export default function SurfboardBookingSection({
    surfboard,
    paymentIban = "[IBAN]",
    paymentBizumNumber = "[BIZUM_NUMBER]",
    whatsappHelpUrl = null,
    rentalPolicy = null,
    initialStart = null,
    initialEnd = null,
    showSchemaBadge = false, // reserved; never shown on public UI
    embedded = false,
}) {
    const user = usePage().props.auth?.user || null;
    const tone = embedded ? "dark" : "light";
    const policy = useMemo(() => resolveRentalPolicy(rentalPolicy), [rentalPolicy]);

    const packs = useMemo(
        () => buildPacksFromSchema(surfboard?.price_schema),
        [surfboard?.price_schema],
    );

    // Sin modo por defecto: el calendario/selector de horas solo se despliega
    // cuando el usuario elige explícitamente "Por horas" o "Por días".
    const [mode, setMode] = useState(null);
    const [blockedRanges, setBlockedRanges] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [paying, setPaying] = useState(false);
    const [contactOpen, setContactOpen] = useState(false);
    const [wetsuitTariffOpen, setWetsuitTariffOpen] = useState(false);
    const [daySelection, setDaySelection] = useState({
        startDate: null,
        endDate: null,
        totalPrice: null,
    });
    const [hourSelection, setHourSelection] = useState({
        packMinutes: null,
        pickupAt: null,
        returnAt: null,
        totalPrice: null,
    });

    const { data, setData, processing, errors, reset } = useForm({
        surfboard_id: surfboard.id,
        client_name: user?.name || user?.nombre || "",
        client_email: user?.email || "",
        client_phone: "",
    });

    useEffect(() => {
        setFormOpen(false);
        setPaying(false);
        reset();
    }, [surfboard.id, reset]);

    useEffect(() => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 3, 0);

        setIsChecking(true);
        window.axios
            .get(route("rentals.bookings.check-availability"), {
                params: {
                    surfboard_id: surfboard.id,
                    from: isoDate(from),
                    to: isoDate(to),
                },
            })
            .then((res) => setBlockedRanges(res?.data?.blocked_ranges || []))
            .catch(() => {
                toast.error("No se pudo cargar la disponibilidad.");
            })
            .finally(() => setIsChecking(false));
    }, [surfboard.id]);

    /* Cambiar de modo descarta la selección del otro: nada de estados cruzados. */
    const handleModeChange = (nextMode) => {
        if (nextMode === mode) return;
        setMode(nextMode);
        setFormOpen(false);
        setDaySelection({ startDate: null, endDate: null, totalPrice: null });
        setHourSelection({ packMinutes: null, pickupAt: null, returnAt: null, totalPrice: null });
    };

    const handleRangeChange = useCallback((range) => {
        setDaySelection(range);
    }, []);

    const handleHourChange = useCallback((selection) => {
        setHourSelection(selection);
    }, []);

    const dayWindow = useMemo(() => {
        if (mode !== MODE_DAY || !daySelection.startDate || !daySelection.endDate) return null;
        return normalizeDayWindow(daySelection.startDate, daySelection.endDate, policy);
    }, [mode, daySelection.startDate, daySelection.endDate, policy]);

    const activeWindow = useMemo(() => {
        if (mode === MODE_HOUR) {
            if (!hourSelection.pickupAt || !hourSelection.returnAt) return null;
            return {
                pickupAt: hourSelection.pickupAt,
                returnAt: hourSelection.returnAt,
                totalPrice: hourSelection.totalPrice,
            };
        }
        if (!dayWindow) return null;
        return {
            pickupAt: dayWindow.pickupAt,
            returnAt: dayWindow.returnAt,
            totalPrice: daySelection.totalPrice,
        };
    }, [mode, hourSelection, dayWindow, daySelection.totalPrice]);

    const hasValidSelection = Boolean(activeWindow && !isChecking);

    useEffect(() => {
        if (!hasValidSelection) setFormOpen(false);
    }, [hasValidSelection]);

    const canContinueToPay = Boolean(
        data.client_name?.trim() && hasValidSelection && !processing,
    );

    const buildPayload = () => {
        const base = {
            surfboard_id: surfboard.id,
            client_name: data.client_name,
            client_email: data.client_email || "",
            client_phone: data.client_phone || "",
            payment_method: "card",
        };

        if (mode === MODE_HOUR) {
            const pickup = localDateTime(hourSelection.pickupAt);
            return {
                ...base,
                mode: MODE_HOUR,
                pack_minutes: hourSelection.packMinutes,
                pickup_at: pickup,
                start_date: pickup,
            };
        }

        const days = dayWindow?.days ?? 0;
        return {
            ...base,
            mode: MODE_DAY,
            // pack_days solo si el tramo coincide con un pack ofertado; si no,
            // el servidor deriva los días del rango (y el DP combina packs).
            pack_days: DAY_PACKS[days] ? days : null,
            start_date: isoDate(daySelection.startDate),
            end_date: isoDate(daySelection.endDate),
        };
    };

    const iniciarPagoAlquiler = () => {
        if (!canContinueToPay || paying) {
            toast.error("Completa tu nombre y la selección de fechas antes de pagar.");
            return;
        }
        setPaying(true);
        router.post(route("rentals.bookings.store"), buildPayload(), {
            preserveScroll: true,
            onError: (errs) => {
                setPaying(false);
                const messages = Object.values(errs || {}).flat();
                if (messages.length > 0) messages.forEach((msg) => toast.error(msg));
                else toast.error("No se pudo crear la reserva. Inténtalo de nuevo.");
            },
        });
    };

    const fieldClass = embedded
        ? "mt-1 w-full rounded-xl border border-white/15 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 shadow-sm transition hover:border-white/25 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        : "input-focus-ring mt-1 w-full px-4 py-2.5 text-sm placeholder:text-gray-500";

    const labelText = embedded ? "text-sm font-semibold text-slate-300" : "text-sm font-semibold text-slate-700";

    const primaryBtn =
        "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50";

    const payBtn =
        "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60";

    const wrapperClass = embedded
        ? "mt-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/20 sm:p-5"
        : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

    const tabActiveClass = embedded
        ? "bg-cyan-600 text-white ring-cyan-500 shadow-md shadow-cyan-950/40"
        : "bg-cyan-600 text-white ring-cyan-500 shadow-md";

    const tabClass = embedded
        ? "bg-slate-950/60 text-slate-200 ring-white/10 hover:bg-slate-800 hover:text-slate-100 hover:ring-cyan-500/40"
        : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50";

    const showMobileSticky = embedded && (hasValidSelection || formOpen);
    const stickyTotal = formatRentalEur(activeWindow?.totalPrice);
    const reserveLabel = formatRentalEur(activeWindow?.totalPrice);
    const reserveButtonText =
        hasValidSelection && reserveLabel ? `Reservar por ${reserveLabel}` : "Reservar";
    const pickupLabel = formatDateTimeLabel(activeWindow?.pickupAt);
    const returnLabel = formatDateTimeLabel(activeWindow?.returnAt);

    return (
        <div className={`${wrapperClass}${showMobileSticky ? " pb-24 lg:pb-0" : ""}`}>
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                <p
                    className={
                        embedded
                            ? "font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-400"
                            : "font-heading text-lg font-bold text-slate-900"
                    }
                >
                    {embedded ? "Disponibilidad" : "Disponibilidad y reserva"}
                </p>
                <p className="text-xs text-slate-500 sm:text-sm">
                    {mode === MODE_HOUR
                        ? "Elige pack y hora de recogida"
                        : mode === MODE_DAY
                          ? "Selecciona días"
                          : "Elige un tipo de alquiler"}
                </p>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3" role="group" aria-label="Tipo de alquiler">
                {MODE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const active = mode === tab.id;
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            aria-pressed={active}
                            onClick={() => handleModeChange(tab.id)}
                            className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-3.5 text-center ring-1 ring-inset transition sm:px-4 ${
                                active ? tabActiveClass : tabClass
                            }`}
                        >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                            <span className="text-base font-bold">{tab.label}</span>
                            <span
                                className={`text-[11px] font-medium leading-snug ${
                                    active ? "text-cyan-50/90" : "text-slate-400"
                                }`}
                            >
                                {tab.hint}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div
                className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
                    mode ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="mt-4 w-full">
                        {mode === MODE_HOUR ? (
                            <RentalHourPicker
                                packs={packs}
                                policy={policy}
                                blockedRanges={blockedRanges}
                                isChecking={isChecking}
                                onChange={handleHourChange}
                            />
                        ) : mode === MODE_DAY ? (
                            <div className="board-availability-calendar">
                                <BookingCalendar
                                    blockedRanges={blockedRanges}
                                    pricesByDuration={packs}
                                    isChecking={isChecking}
                                    onRangeChange={handleRangeChange}
                                    initialStart={initialStart}
                                    initialEnd={initialEnd}
                                    tone={tone}
                                />
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>

            {!mode ? (
                <p className="mt-3 text-sm text-slate-400">
                    Elige horas o días para ver la disponibilidad.
                </p>
            ) : null}

            {mode === MODE_DAY && dayWindow ? (
                <p className="mt-3 text-sm text-slate-300">
                    Recogida <span className="font-semibold text-slate-100">{pickupLabel}</span> · Devolución{" "}
                    <span className="font-semibold text-slate-100">{returnLabel}</span>
                    {dayWindow.days ? (
                        <span className="text-slate-500"> · {dayWindow.days} día(s)</span>
                    ) : null}
                </p>
            ) : null}

            {policy.notes?.length ? (
                <ul className="mt-3 space-y-1 text-[11px] leading-relaxed text-slate-500">
                    {policy.notes.map((note) => (
                        <li key={note}>{note}</li>
                    ))}
                    <li>
                        ¿Vas a llegar antes o quieres alargar el alquiler? Una vez hecha la
                        reserva,{" "}
                        <button
                            type="button"
                            onClick={() => setContactOpen(true)}
                            className="font-semibold text-cyan-400 underline decoration-cyan-400/40 underline-offset-2 transition hover:text-cyan-300"
                        >
                            contáctanos
                        </button>{" "}
                        y lo ajustamos: así mantienes el descuento por días en vez de pagar la
                        prórroga como una hora suelta.
                    </li>
                    <li>
                        ¿No tienes neopreno? Tenemos disponibilidad de sobra: no hace falta
                        reservarlo aquí, se alquila al momento en la recogida (
                        <button
                            type="button"
                            onClick={() => setWetsuitTariffOpen(true)}
                            className="font-semibold text-cyan-400 underline decoration-cyan-400/40 underline-offset-2 transition hover:text-cyan-300"
                        >
                            ver precios
                        </button>
                        ).
                    </li>
                </ul>
            ) : null}

            {contactOpen ? (
                <ContactChannelsModal
                    topic="rental"
                    title="Ajustar tu alquiler"
                    subtitle="Cuéntanos si vas a llegar antes o quieres alargar la reserva y buscamos el mejor precio."
                    onClose={() => setContactOpen(false)}
                />
            ) : null}

            {wetsuitTariffOpen ? (
                <WetsuitTariffModal onClose={() => setWetsuitTariffOpen(false)} />
            ) : null}

            <Collapsible open={formOpen} onOpenChange={setFormOpen}>
                {!formOpen ? (
                    <button
                        type="button"
                        disabled={!hasValidSelection}
                        onClick={() => setFormOpen(true)}
                        className={`mt-5 ${primaryBtn}`}
                    >
                        {reserveButtonText}
                    </button>
                ) : null}

                <CollapsibleContent className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100">
                    <div className="min-h-0 overflow-hidden">
                        <div
                            className={`mt-5 space-y-4 border-t pb-1 pt-5 ${
                                embedded ? "border-white/10" : "border-slate-200"
                            }`}
                        >
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <label className="block">
                                    <span className={labelText}>Nombre</span>
                                    <input
                                        value={data.client_name}
                                        onChange={(e) => setData("client_name", e.target.value)}
                                        className={fieldClass}
                                        placeholder="Tu nombre"
                                        autoComplete="name"
                                    />
                                    {errors.client_name ? (
                                        <p className="mt-1 text-xs text-rose-400">{errors.client_name}</p>
                                    ) : null}
                                </label>

                                <label className="block">
                                    <span className={labelText}>Email (opcional)</span>
                                    <input
                                        type="email"
                                        value={data.client_email}
                                        onChange={(e) => setData("client_email", e.target.value)}
                                        className={fieldClass}
                                        placeholder="correo@ejemplo.com"
                                        autoComplete="email"
                                    />
                                    {errors.client_email ? (
                                        <p className="mt-1 text-xs text-rose-400">{errors.client_email}</p>
                                    ) : null}
                                </label>

                                <label className="block md:col-span-2">
                                    <span className={labelText}>Teléfono (opcional)</span>
                                    <input
                                        type="tel"
                                        value={data.client_phone}
                                        onChange={(e) => setData("client_phone", e.target.value)}
                                        className={fieldClass}
                                        placeholder="600 000 000"
                                        autoComplete="tel"
                                    />
                                    {errors.client_phone ? (
                                        <p className="mt-1 text-xs text-rose-400">{errors.client_phone}</p>
                                    ) : null}
                                </label>
                            </div>

                            {pickupLabel ? (
                                <div
                                    className={`rounded-xl px-4 py-3 text-sm ${
                                        embedded
                                            ? "border border-white/10 bg-slate-950/60 text-slate-300"
                                            : "border border-slate-200 bg-slate-50 text-slate-700"
                                    }`}
                                >
                                    Recogida {pickupLabel} · Devolución {returnLabel}
                                    {stickyTotal ? (
                                        <span className="font-semibold"> · Total {stickyTotal}</span>
                                    ) : null}
                                </div>
                            ) : null}

                            {(errors.start_date || errors.pickup_at) && (
                                <div
                                    className={`rounded-xl px-4 py-3 text-sm ${
                                        embedded
                                            ? "border border-rose-500/30 bg-rose-500/10 text-rose-200"
                                            : "border border-rose-200 bg-rose-50 text-rose-800"
                                    }`}
                                >
                                    {errors.start_date || errors.pickup_at}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 pb-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                                    Pago seguro con Stripe
                                </p>
                                <button
                                    type="button"
                                    disabled={!canContinueToPay || paying}
                                    onClick={iniciarPagoAlquiler}
                                    className={payBtn}
                                >
                                    {paying || processing ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                            Preparando pago…
                                        </>
                                    ) : (
                                        "Pagar con tarjeta"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </CollapsibleContent>
            </Collapsible>

            {showMobileSticky ? (
                <div
                    className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700/80 bg-slate-950/95 px-3 py-3 backdrop-blur-md lg:hidden"
                    style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
                >
                    <div className="mx-auto flex max-w-lg items-center gap-3">
                        <div className="min-w-0 flex-1">
                            {pickupLabel ? (
                                <p className="truncate text-xs font-medium text-slate-300">
                                    {pickupLabel} → {returnLabel}
                                </p>
                            ) : null}
                            {stickyTotal ? (
                                <p className="font-heading text-base font-extrabold tabular-nums text-cyan-300">
                                    {stickyTotal}
                                </p>
                            ) : (
                                <p className="text-xs text-slate-500">Total al confirmar la selección</p>
                            )}
                        </div>
                        {!formOpen ? (
                            <button
                                type="button"
                                disabled={!hasValidSelection}
                                onClick={() => setFormOpen(true)}
                                className="shrink-0 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {reserveButtonText}
                            </button>
                        ) : (
                            <button
                                type="button"
                                disabled={!canContinueToPay || paying}
                                onClick={iniciarPagoAlquiler}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {paying || processing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                        Pago…
                                    </>
                                ) : (
                                    "Pagar con tarjeta"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
