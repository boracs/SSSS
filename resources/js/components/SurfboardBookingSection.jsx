import React, { useCallback, useEffect, useMemo, useState } from "react";
import { router, useForm, usePage } from "@inertiajs/react";
import { Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import BookingCalendar from "./BookingCalendar";
import ManualPaymentInstructionsModal from "./ManualPaymentInstructionsModal";
import {
    Collapsible,
    CollapsibleContent,
} from "./ui/collapsible";

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

const fieldClass =
    "input-focus-ring mt-1 w-full px-4 py-2.5 text-sm placeholder:text-gray-500";

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
    showSchemaBadge = false,
    embedded = false,
}) {
    const user = usePage().props.auth?.user || null;
    const pricesByDuration = useMemo(
        () => buildPricesByDuration(surfboard?.price_schema),
        [surfboard?.price_schema],
    );

    const [blockedRanges, setBlockedRanges] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
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
        payment_method: "bizum",
        proof: null,
    });

    useEffect(() => {
        setFormOpen(false);
        setPaymentModalOpen(false);
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

    const hasValidDates = Boolean(
        selected.startDate && selected.endDate && !isChecking,
    );

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

    const submitRentalPayment = async ({ proofFile, paymentMethod }) => {
        if (!canContinueToPay) {
            toast.error("Completa nombre y fechas antes de pagar.");
            throw new Error("incomplete");
        }
        const fd = new FormData();
        fd.append("surfboard_id", String(data.surfboard_id));
        fd.append("client_name", data.client_name);
        fd.append("client_email", data.client_email || "");
        fd.append("client_phone", data.client_phone || "");
        fd.append("start_date", data.start_date);
        fd.append("end_date", data.end_date);
        fd.append("payment_method", paymentMethod);
        fd.append("proof", proofFile);
        await new Promise((resolve, reject) => {
            router.post(route("rentals.bookings.store"), fd, {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: () => {
                    toast.success(
                        "Reserva creada correctamente. Te avisaremos tras validación.",
                    );
                    setFormOpen(false);
                    setPaymentModalOpen(false);
                    resolve();
                },
                onError: (errs) => {
                    const messages = Object.values(errs || {}).flat();
                    if (messages.length > 0) {
                        messages.forEach((msg) => toast.error(msg));
                    } else {
                        toast.error(
                            "No se pudo crear la reserva. Inténtalo de nuevo.",
                        );
                    }
                    reject(new Error("rental"));
                },
            });
        });
    };

    const wrapperClass = embedded
        ? "mt-6 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
        : "rounded-3xl border border-slate-200 bg-white p-6 shadow-sm";

    return (
        <>
            <div className={wrapperClass}>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <p
                            className={
                                embedded
                                    ? "text-xs font-bold uppercase tracking-wide text-slate-500"
                                    : "text-lg font-bold text-slate-900"
                            }
                        >
                            {embedded ? "Disponibilidad" : "Disponibilidad y reserva"}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                            {embedded
                                ? "Consulta fechas libres. Las reservas pendientes también bloquean."
                                : "Selecciona un rango libre. Las reservas pendientes también bloquean."}
                        </p>
                    </div>
                    {showSchemaBadge ? (
                        <div className="shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                            Esquema: {surfboard.price_schema?.name || "—"}
                        </div>
                    ) : null}
                </div>

                <div className="board-availability-calendar mt-4 [&_.react-datepicker]:w-full [&_.react-datepicker__month-container]:float-none [&_.react-datepicker__month-container]:w-full">
                    <BookingCalendar
                        blockedRanges={blockedRanges}
                        pricesByDuration={pricesByDuration}
                        isChecking={isChecking}
                        onRangeChange={handleRangeChange}
                        initialStart={initialStart}
                        initialEnd={initialEnd}
                    />
                </div>

                <Collapsible open={formOpen} onOpenChange={setFormOpen}>
                    {!formOpen ? (
                        <button
                            type="button"
                            disabled={!hasValidDates}
                            onClick={() => setFormOpen(true)}
                            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Reservar
                        </button>
                    ) : null}

                    <CollapsibleContent className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 data-[state=open]:grid-rows-[1fr] data-[state=open]:opacity-100">
                        <div className="min-h-0 overflow-hidden">
                            <div className="mt-6 space-y-4 border-t border-slate-200 pt-6">
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Nombre
                                        </span>
                                        <input
                                            value={data.client_name}
                                            onChange={(e) =>
                                                setData("client_name", e.target.value)
                                            }
                                            className={fieldClass}
                                            placeholder="Tu nombre"
                                            autoComplete="name"
                                        />
                                        {errors.client_name ? (
                                            <p className="mt-1 text-xs text-rose-600">
                                                {errors.client_name}
                                            </p>
                                        ) : null}
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Email (opcional)
                                        </span>
                                        <input
                                            type="email"
                                            value={data.client_email}
                                            onChange={(e) =>
                                                setData("client_email", e.target.value)
                                            }
                                            className={fieldClass}
                                            placeholder="correo@ejemplo.com"
                                            autoComplete="email"
                                        />
                                        {errors.client_email ? (
                                            <p className="mt-1 text-xs text-rose-600">
                                                {errors.client_email}
                                            </p>
                                        ) : null}
                                    </label>

                                    <label className="block md:col-span-2">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Teléfono (opcional)
                                        </span>
                                        <input
                                            type="tel"
                                            value={data.client_phone}
                                            onChange={(e) =>
                                                setData("client_phone", e.target.value)
                                            }
                                            className={fieldClass}
                                            placeholder="600 000 000"
                                            autoComplete="tel"
                                        />
                                        {errors.client_phone ? (
                                            <p className="mt-1 text-xs text-rose-600">
                                                {errors.client_phone}
                                            </p>
                                        ) : null}
                                    </label>
                                </div>

                                {(errors.start_date || errors.end_date) && (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                        {errors.start_date || errors.end_date}
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-xs text-slate-500">
                                        Estado al crear:{" "}
                                        <span className="font-semibold">pendiente</span>.
                                        Un admin confirmará el pago (o caduca a los 7 días).
                                    </p>
                                    <button
                                        type="button"
                                        disabled={!canContinueToPay}
                                        onClick={() => setPaymentModalOpen(true)}
                                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-action px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-action/90 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2
                                                    className="h-4 w-4 animate-spin"
                                                    aria-hidden="true"
                                                />
                                                Procesando…
                                            </>
                                        ) : (
                                            "Continuar al pago"
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>

            <ManualPaymentInstructionsModal
                open={paymentModalOpen}
                onClose={() => setPaymentModalOpen(false)}
                bizumNumber={paymentBizumNumber}
                iban={paymentIban}
                whatsappHelpUrl={whatsappHelpUrl}
                useReservationStepsHeading
                showDepositNotice
                totalPrimaryLine={`Total a pagar: ${(selected.totalPrice ?? 0).toFixed(2).replace(".", ",")} €`}
                onSubmit={submitRentalPayment}
                onAfterSuccessSubmit={() => router.reload({ only: [] })}
                successSubtitle="Te avisaremos cuando validemos el pago."
            />
        </>
    );
}
