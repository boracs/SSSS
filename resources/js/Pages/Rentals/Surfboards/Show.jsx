import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { toast } from "react-toastify";
import BookingCalendar from "../../../Components/BookingCalendar";
import BackButton from "../../../components/BackButton";
import Breadcrumbs from "../../../components/Breadcrumbs";
import ManualPaymentInstructionsModal from "../../../components/ManualPaymentInstructionsModal";
import AuthenticatedLayout from "../../../layouts/AuthenticatedLayout";

function parseFirstImage(imageUrl) {
    if (!imageUrl) return null;
    try {
        const parsed = JSON.parse(imageUrl);
        if (Array.isArray(parsed) && parsed[0]) return parsed[0];
    } catch {
        // ignore
    }
    return imageUrl;
}

function imageSrc(pathOrUrl) {
    if (!pathOrUrl) return "/img/placeholder.svg";
    if (String(pathOrUrl).startsWith("http")) return pathOrUrl;
    return `/storage/${String(pathOrUrl).replace(/^\/+/, "")}`;
}

function buildPricesByDuration(priceSchema) {
    if (!priceSchema) return null;
    // igual que PriceSchema::getPricesByDuration() en backend
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

function isoDate(d) {
    if (!d) return null;
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    // usar YYYY-MM-DD para request
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function Show({ surfboard, paymentIban = "[IBAN]", paymentBizumNumber = "[BIZUM_NUMBER]", whatsappHelpUrl = null }) {
    const user = usePage().props.auth?.user || null;
    const first = parseFirstImage(surfboard?.image_url);
    const pricesByDuration = useMemo(
        () => buildPricesByDuration(surfboard?.price_schema),
        [surfboard]
    );

    const [blockedRanges, setBlockedRanges] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selected, setSelected] = useState({
        startDate: null,
        endDate: null,
        totalPrice: null,
    });

    const { data, setData, processing, errors } = useForm({
        surfboard_id: surfboard.id,
        client_name: user?.name || user?.nombre || "",
        client_email: user?.email || "",
        client_phone: "",
        start_date: "",
        end_date: "",
        payment_method: "bizum",
        proof: null,
    });

    // cargar rangos bloqueados del mes actual + siguiente (ventana simple)
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

    const canReserve = Boolean(data.client_name && data.start_date && data.end_date && !isChecking);

    const submitRentalPayment = async ({ proofFile, paymentMethod }) => {
        if (!canReserve) {
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
                    toast.success("Reserva creada correctamente. Te avisaremos tras validación.");
                    resolve();
                },
                onError: (errors) => {
                    const messages = Object.values(errors || {}).flat();
                    if (messages.length > 0) {
                        messages.forEach((msg) => toast.error(msg));
                    } else {
                        toast.error("No se pudo crear la reserva. Inténtalo de nuevo.");
                    }
                    reject(new Error("rental"));
                },
                onFinish: () => {
                    // onFinish es llamado siempre; no cerramos aquí
                },
            });
        });
    };

    const displayName = surfboard?.name || `Tabla #${surfboard?.id}`;
    const breadcrumbs = [
        { label: "Inicio", href: route("Pag_principal") },
        { label: "Tablas de alquiler", href: route("rentals.surfboards.index") },
        { label: displayName },
    ];

    return (
        <>
            <Head title={surfboard?.name ? `${surfboard.name} · Alquiler` : "Tabla · Alquiler"} />
            <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <BackButton href={route("rentals.surfboards.index")}>
                        Volver a tablas
                    </BackButton>
                    <Breadcrumbs items={breadcrumbs} />
                </div>

                <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
                    <div className="lg:col-span-5">
                        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                            <div className="aspect-[4/3] bg-slate-100">
                                <img
                                    src={imageSrc(first)}
                                    alt={surfboard?.image_alt || surfboard?.name || `Tabla ${surfboard.id}`}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = "/img/placeholder.svg";
                                    }}
                                />
                            </div>
                            <div className="p-5">
                                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    {surfboard.category === "soft" ? "Softboard" : "Hardboard"}
                                </div>
                                <div className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-slate-800">
                                    {displayName}
                                </div>
                                {surfboard.description ? (
                                    <p className="mt-3 text-sm text-slate-700">
                                        {surfboard.description}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900">
                                        Disponibilidad y reserva
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Selecciona un rango libre. Las reservas pendientes también bloquean.
                                    </p>
                                </div>
                                <div className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                                    Esquema: {surfboard.price_schema?.name || "—"}
                                </div>
                            </div>

                            <div className="mt-5">
                                <BookingCalendar
                                    blockedRanges={blockedRanges}
                                    pricesByDuration={pricesByDuration}
                                    isChecking={isChecking}
                                    onRangeChange={setSelected}
                                />
                            </div>

                            <div className="mt-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <label className="block">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Nombre
                                        </span>
                                        <input
                                            value={data.client_name}
                                            onChange={(e) =>
                                                setData("client_name", e.target.value)
                                            }
                                            className="input-focus-ring mt-1 w-full px-4 py-2"
                                            placeholder="Tu nombre"
                                        />
                                        {errors.client_name ? (
                                            <div className="mt-1 text-xs text-rose-600">
                                                {errors.client_name}
                                            </div>
                                        ) : null}
                                    </label>

                                    <label className="block">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Email (opcional)
                                        </span>
                                        <input
                                            value={data.client_email}
                                            onChange={(e) =>
                                                setData("client_email", e.target.value)
                                            }
                                            className="mt-1 w-full rounded-xl border-slate-300 focus:border-surf-primary focus:ring-surf-primary"
                                            placeholder="correo@ejemplo.com"
                                        />
                                        {errors.client_email ? (
                                            <div className="mt-1 text-xs text-rose-600">
                                                {errors.client_email}
                                            </div>
                                        ) : null}
                                    </label>

                                    <label className="block md:col-span-2">
                                        <span className="text-sm font-semibold text-slate-700">
                                            Teléfono (opcional)
                                        </span>
                                        <input
                                            value={data.client_phone}
                                            onChange={(e) =>
                                                setData("client_phone", e.target.value)
                                            }
                                            className="input-focus-ring mt-1 w-full px-4 py-2"
                                            placeholder="600 000 000"
                                        />
                                        {errors.client_phone ? (
                                            <div className="mt-1 text-xs text-rose-600">
                                                {errors.client_phone}
                                            </div>
                                        ) : null}
                                    </label>
                                </div>

                                {(errors.start_date || errors.end_date) && (
                                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                        {errors.start_date || errors.end_date}
                                    </div>
                                )}

                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="text-xs text-slate-500">
                                        Estado al crear: <span className="font-semibold">pendiente</span>.
                                        Un admin confirmará el pago (o caduca a los 7 días).
                                    </div>
                                    <button
                                        type="button"
                                        disabled={!canReserve}
                                        onClick={() => setPaymentModalOpen(true)}
                                        className="inline-flex items-center justify-center rounded-xl bg-brand-action px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-300 ease-in-out hover:bg-brand-action/90 disabled:opacity-60"
                                    >
                                        Continuar al pago
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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

Show.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

