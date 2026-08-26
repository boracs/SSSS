import React from "react";
import FomrularioContacto from "../components/FormularioContacto";
import AcademyLocationPanel from "../components/AcademyLocationPanel";
import Layout1 from "../layouts/Layout1";
import SeoHead from "../components/seo/SeoHead";
import { usePage } from "@inertiajs/react";

const Contacto = ({ seo = null }) => {
    const { academyLocation, partnerGoogleReviews } = usePage().props;

    return (
        <Layout1>
            <SeoHead seo={seo} />
            <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-10 sm:px-6 sm:py-12">
                <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-12">
                    <div className="lg:sticky lg:top-24">
                        <h1 className="sr-only">Contacto con San Sebastian Surf School</h1>
                        <FomrularioContacto />
                    </div>
                    <AcademyLocationPanel
                        location={academyLocation}
                        partnerGoogleReviews={partnerGoogleReviews}
                        variant="contact"
                        showPartnerGoogleNote
                    />
                </div>
            </div>
        </Layout1>
    );
};

export default Contacto;
