import React, { useCallback, useEffect, useMemo, useState } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import BookingCalendar from "./BookingCalendar";
import { Collapsible, CollapsibleContent } from "./ui/collapsible";

function isoDate(d) {
    if (!d) return null;
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function buildPricesByDuration(priceSchema) {
    if (!priceSchema) return null;
    return {
        1: Number(priceSchema.price_1h || 0),
        2: Number(priceSchema.price_2h || 0),
        4: Number(priceSchema.price_4h || 0),
        12: Number(priceSchema.price_12h || 0),
        24: Number(priceSchema.price_24h || 0),
        48: Number(priceSchema.price_48h || 0),
        72: Number(priceSchema.price_72h || 0),
        168: Number(priceSchema.price_week || 0),
    };
}

/**
 * Calendario + botón Reservar + formulario de contacto con revelación progresiva.
 */
export default function SurfboardBookingSection({
    surfboard,
    paymentIban = "[IBAN]",
    paymentBizumNumber = "[BIZUM_NUMBER]",
    whatsappHelpUrl = null,
    initialStart = null,
    initialEnd = null,
    showSchemaBadge = false, // reserved; never shown on public UI
    embedded = false,
}) {
    const user = usePage().props.auth?.user || null;
    const tone = embedded ? "dark" : "light";

    const pricesByDuration = useMemo(
        () => buildPricesByDuration(surfboard?.price_schema),
        [surfboard?.price_schema],
    );

    const [blockedRanges, setBlockedRanges] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [paying, setPaying] = useState(false);
    const [selected, setSelected] = useState({
        startDate: null,
        endDate: null,
        totalPrice: null,
    });

    const { data, setData, processing, errors, reset } = useForm({
        surfboard_id: surfboard.id,
        client_name: user?.name || user?.nombre || "",
        client_email: user?.email || "",
        client_phone: "",
        start_date: "",
        end_date: "",
        payment_method: "card",
    });

    useEffect(() => {
        setFormOpen(false);
        setPaying(false);
        reset();
    }, [surfboard.id, reset]);

    useEffect(() => {
        const now = new Date();
        const from = new Date(now.getFullYear(), now.getMonth(), 1);
        const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);

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

    useEffect(() => {
        setData("start_date", isoDate(selected.startDate) || "");
        setData("end_date", isoDate(selected.endDate) || "");
    }, [selected.startDate, selected.endDate, setData]);

    const hasValidDates = Boolean(selected.startDate && selected.endDate && !isChecking);

    useEffect(() => {
        if (!hasValidDates) setFormOpen(false);
    }, [hasValidDates]);

    const canContinueToPay = Boolean(
        data.client_name?.trim() &&
            data.start_date &&
            data.end_date &&
            !isChecking &&
            !processing,
    );

    const handleRangeChange = useCallback((range) => {
        setSelected(range);
    }, []);

    const iniciarPagoAlquiler = () => {
        if (!canContinueToPay || paying) {
            toast.error("Completa nombre y fechas antes de pagar.");
            return;
        }
        setPaying(true);
        router.post(
            route("rentals.bookings.store"),
            {
                surfboard_id: data.surfboard_id,
                client_name: data.client_name,
                client_email: data.client_email || "",
                client_phone: data.client_phone || "",
                start_date: data.start_date,
                end_date: data.end_date,
                payment_method: "card",
            },
            {
                preserveScroll: true,
                onError: (errs) => {
                    setPaying(false);
                    const messages = Object.values(errs || {}).flat();
                    if (messages.length > 0) messages.forEach((msg) => toast.error(msg));
                    else toast.error("No se pudo crear la reserva. Inténtalo de nuevo.");
                },
            },
        );
    };

    const fieldClass = embedded
        ? "mt-1 w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        : "input-focus-ring mt-1 w-full px-4 py-2.5 text-sm placeholder:text-gray-500";

    const labelText = embedded ? "text-sm font-semibold text-slate-300" : "text-sm font-semibold text-slate-700";

    const primaryBtn =
        "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50";

    const payBtn =
        "inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60";

    const wrapperClass = embedded
        ? "mt-4 rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-xl shadow-black/20 sm:p-5"
        : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

    return (
        <div className={wrapperClass}>
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
                <p className="text-xs text-slate-500 sm:text-sm">Selecciona días</p>
            </div>

            <div className="board-availability-calendar mt-4 w-full">
                <BookingCalendar
                    blockedRanges={blockedRanges}
                    pricesByDuration={pricesByDuration}
                    isChecking={isChecking}
                    onRangeChange={handleRangeChange}
                    initialStart={initialStart}
                    initialEnd={initialEnd}
                    tone={tone}
                />
            </div>

            <Collapsible open={formOpen} onOpenChange={setFormOpen}>
                {!formOpen ? (
                    <button
                        type="button"
                        disabled={!hasValidDates}
                        onClick={() => setFormOpen(true)}
                        className={`mt-5 ${primaryBtn}`}
                    >
                        Reservar
                    </button>
                ) : null}

                <CollapsibleContent className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100">
                    <div className="min-h-0 overflow-hidden">
                        <div
                            className={`mt-5 space-y-4 border-t pt-5 ${
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

                            {(errors.start_date || errors.end_date) && (
                                <div
                                    className={`rounded-xl px-4 py-3 text-sm ${
                                        embedded
                                            ? "border border-rose-500/30 bg-rose-500/10 text-rose-200"
                                            : "border border-rose-200 bg-rose-50 text-rose-800"
                                    }`}
                                >
                                    {errors.start_date || errors.end_date}
                                </div>
                            )}

                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className={`text-xs ${embedded ? "text-slate-500" : "text-slate-500"}`}>
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
        </div>
    );
}
