import { useCallback, useMemo, useState } from "react";
import BackButton from "../../../components/BackButton";
import Breadcrumbs from "../../../components/Breadcrumbs";
import ImageLightbox from "../../../components/ImageLightbox";
import SurfboardPublicDetail from "../../../components/Rentals/SurfboardPublicDetail";
import SeoHead from "../../../components/seo/SeoHead";
import AuthenticatedLayout from "../../../layouts/AuthenticatedLayout";

export default function Show({
    surfboard,
    paymentIban = "[IBAN]",
    paymentBizumNumber = "[BIZUM_NUMBER]",
    whatsappHelpUrl = null,
    seo = null,
}) {
    const [lightbox, setLightbox] = useState(null);
    const closeLightbox = useCallback(() => setLightbox(null), []);

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
            <SeoHead seo={seo} />
            <div className="min-h-[70vh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
                <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <BackButton
                            href={route("rentals.surfboards.index")}
                            className="!text-slate-200 hover:!bg-slate-800 hover:!text-cyan-300"
                        >
                            Volver a tablas
                        </BackButton>
                        <Breadcrumbs items={breadcrumbs} variant="dark" />
                    </div>

                    <article className="mt-6 rounded-3xl border border-slate-700 bg-slate-900/95 p-4 shadow-sm backdrop-blur sm:mt-8 sm:p-6 lg:p-7">
                        <SurfboardPublicDetail
                            board={surfboard}
                            onImageClick={setLightbox}
                            paymentIban={paymentIban}
                            paymentBizumNumber={paymentBizumNumber}
                            whatsappHelpUrl={whatsappHelpUrl}
                            initialStart={initialDates.start}
                            initialEnd={initialDates.end}
                            titleAs="h1"
                        />
                    </article>
                </div>
            </div>

            <ImageLightbox
                open={Boolean(lightbox?.src)}
                src={lightbox?.src}
                alt={lightbox?.alt}
                onClose={closeLightbox}
            />
        </>
    );
}

Show.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
