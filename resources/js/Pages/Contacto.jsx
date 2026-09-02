import React from "react";
import FomrularioContacto from "../components/FormularioContacto";
import AcademyLocationPanel from "../components/AcademyLocationPanel";
import PageShell from "@/layouts/PageShell";
import SeoHead from "../components/seo/SeoHead";
import { usePage } from "@inertiajs/react";

const Contacto = ({ seo = null }) => {
    const { academyLocation, partnerGoogleReviews } = usePage().props;

    return (
        <PageShell variant="light" withGradient className="px-4 py-10 sm:px-6 sm:py-12">
            <SeoHead seo={seo} />
            <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-12">
                <div className="lg:sticky lg:top-24">
                    <h1 className="sr-only font-heading">Contacto con San Sebastián Surf School</h1>
                    <FomrularioContacto />
                </div>
                <AcademyLocationPanel
                    location={academyLocation}
                    partnerGoogleReviews={partnerGoogleReviews}
                    variant="contact"
                    showPartnerGoogleNote
                />
            </div>
        </PageShell>
    );
};

export default Contacto;
