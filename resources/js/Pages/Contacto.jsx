import React from "react";
import FomrularioContacto from "../components/FormularioContacto";
import Layout1 from "../layouts/Layout1";
import SeoHead from "../components/seo/SeoHead";

const Contacto = ({ seo = null }) => {
    return (
        <Layout1>
            <SeoHead seo={seo} />
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-12 sm:px-6">
                <h1 className="sr-only">Contacto con San Sebastian Surf School</h1>
                <FomrularioContacto />
            </div>
        </Layout1>
    );
};

export default Contacto;
