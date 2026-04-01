import React, { useEffect, useMemo, useState } from "react";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { toast } from "react-toastify";
import BookingCalendar from "../../../Components/BookingCalendar";
import BackButton from "../../../components/BackButton";
import Breadcrumbs from "../../../components/Breadcrumbs";
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

function Spinner({ className = "h-5 w-5" }) {
    return (
        <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

export default function Show({ surfboard, paymentIban = "[IBAN]", paymentBizumNumber = "[BIZUM_NUMBER]" }) {
    const user = usePage().props.auth?.user || null;
    const first = parseFirstImage(surfboard?.image_url);
    const pricesByDuration = useMemo(
        () => buildPricesByDuration(surfboard?.price_schema),
        [surfboard]
    );

    const [blockedRanges, setBlockedRanges] = useState([]);
    const [isChecking, setIsChecking] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState("bizum");
    const [proofFile, setProofFile] = useState(null);
    const [proofName, setProofName] = useState("");
    const [proofPreview, setProofPreview] = useState("");
    const [selected, setSelected] = useState({
        startDate: null,
        endDate: null,
        totalPrice: null,
    });

    const { data, setData, post, processing, errors } = useForm({
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

    const canReserve = Boolean(
        data.client_name &&
            data.start_date &&
            data.end_date &&
            !processing &&
            !isChecking
    );

    const submitReservation = (e) => {
        e.preventDefault();
        setData("payment_method", paymentMethod);
        setData("proof", proofFile);
        post(route("rentals.bookings.store"), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setPaymentModalOpen(false);
                setProofFile(null);
                setProofName("");
                if (proofPreview) URL.revokeObjectURL(proofPreview);
                setProofPreview("");
                toast.success("Reserva creada correctamente. Te avisaremos tras validación.");
                router.reload({ only: [] });
            },
            onError: () => {
                toast.error("No se pudo crear la reserva o subir el comprobante.");
            },
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

            {paymentModalOpen ? (
                <div className="fixed inset-0 z-modal flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-brand-deep/70 backdrop-blur-md" onClick={() => !processing && setPaymentModalOpen(false)} aria-hidden />
                    <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/20 bg-gradient-to-br from-[#0d234d] to-[#0f2d5c] p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <h2 className="font-heading text-xl font-bold tracking-tight text-white">Instrucciones de pago</h2>
                            <button type="button" onClick={() => !processing && setPaymentModalOpen(false)} className="rounded-xl p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label="Cerrar">
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4">
                            <div className="text-xs font-semibold uppercase tracking-wider text-white/80">Pasos para completar tu reserva</div>
                            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-white/90">
                                <li>Copia los datos de pago (Bizum o IBAN).</li>
                                <li>Realiza el pago desde tu app bancaria.</li>
                                <li>Sube el comprobante para validación manual.</li>
                            </ol>
                            <div className="mt-3 text-sm font-semibold text-white">
                                Total a pagar: <span className="font-extrabold">{(selected.totalPrice ?? 0).toFixed(2).replace(".", ",")} €</span>
                            </div>
                        </div>

                        <div className="mt-4 space-y-3">
                            <div className="flex flex-wrap items-center gap-3 text-sm text-white/90">
                                <label className="inline-flex items-center gap-2">
                                    <input type="radio" name="payment_method_rental" value="bizum" checked={paymentMethod === "bizum"} onChange={() => setPaymentMethod("bizum")} />
                                    Bizum
                                </label>
                                <label className="inline-flex items-center gap-2">
                                    <input type="radio" name="payment_method_rental" value="transferencia" checked={paymentMethod === "transferencia"} onChange={() => setPaymentMethod("transferencia")} />
                                    Transferencia
                                </label>
                            </div>
                            <div className="rounded-xl bg-white/10 p-3 text-sm text-white/95">
                                {paymentMethod === "bizum" ? (
                                    <p><strong>Bizum:</strong> {paymentBizumNumber}</p>
                                ) : (
                                    <p><strong>IBAN:</strong> {paymentIban}</p>
                                )}
                            </div>
                        </div>

                        <form onSubmit={submitReservation} className="mt-4 space-y-3">
                            <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                                <div className="text-xs font-semibold uppercase tracking-wider text-white/70">Subir comprobante</div>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0] || null;
                                        setProofFile(f);
                                        setProofName(f?.name || "");
                                        if (proofPreview) URL.revokeObjectURL(proofPreview);
                                        if (f && f.type?.startsWith("image/")) setProofPreview(URL.createObjectURL(f));
                                        else setProofPreview("");
                                    }}
                                    className="mt-2 w-full text-sm text-white/90 file:mr-2 file:rounded-lg file:border-0 file:bg-white/20 file:px-3 file:py-2 file:text-sm file:text-white"
                                    required
                                    disabled={processing}
                                />
                                {proofPreview ? (
                                    <img src={proofPreview} alt="Previsualización" className="mt-2 h-20 w-full rounded-xl border border-white/20 object-contain bg-white/5" />
                                ) : proofName ? (
                                    <div className="mt-2 text-sm font-medium text-emerald-200">{proofName}</div>
                                ) : null}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={processing || !canReserve || !proofFile}
                                    className="inline-flex min-w-[170px] items-center justify-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {processing ? (<><Spinner className="h-4 w-4" /> Procesando…</>) : "Confirmar y enviar"}
                                </button>
                                <button type="button" onClick={() => !processing && setPaymentModalOpen(false)} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 hover:bg-white/20">
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}
        </>
    );
}

Show.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;

