import React, { useMemo } from "react";
import { Head } from "@inertiajs/react";
import BackButton from "../../../components/BackButton";
import Breadcrumbs from "../../../components/Breadcrumbs";
import SurfboardBookingSection from "../../../components/SurfboardBookingSection";
import AuthenticatedLayout from "../../../layouts/AuthenticatedLayout";

/** Imagen demo temporal — misma que en Index.jsx */
const DEMO_BOARD_IMAGE = "/img/tabla-demo.png";

function imageSrc(pathOrUrl) {
    if (!pathOrUrl) return "/img/placeholder.svg";
    if (String(pathOrUrl).startsWith("http")) return pathOrUrl;
    return `/storage/${String(pathOrUrl).replace(/^\/+/, "")}`;
}

export default function Show({
    surfboard,
    paymentIban = "[IBAN]",
    paymentBizumNumber = "[BIZUM_NUMBER]",
    whatsappHelpUrl = null,
}) {
    const first = DEMO_BOARD_IMAGE;

    const initialDates = useMemo(() => {
        if (typeof window === "undefined") return { start: null, end: null };
        const params = new URLSearchParams(window.location.search);
        const start = params.get("start_date");
        const end = params.get("end_date");
        const toDate = (value) => {
            if (!value) return null;
            const d = new Date(`${value}T12:00:00`);
            return Number.isNaN(d.getTime()) ? null : d;
        };
        return { start: toDate(start), end: toDate(end) };
    }, []);

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
                        <SurfboardBookingSection
                            surfboard={surfboard}
                            paymentIban={paymentIban}
                            paymentBizumNumber={paymentBizumNumber}
                            whatsappHelpUrl={whatsappHelpUrl}
                            initialStart={initialDates.start}
                            initialEnd={initialDates.end}
                            showSchemaBadge
                        />
                    </div>
                </div>
            </div>
        </>
    );
}

Show.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
