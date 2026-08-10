import React from "react";
import { Head, Link } from "@inertiajs/react";
import CatalogOfferTabs from "@/components/admin/CatalogOfferTabs";

function hrefFor(name) {
    try {
        return route(name, undefined, false);
    } catch {
        return "#";
    }
}

export default function SurfskatePlaceholder() {
    return (
        <>
            <Head title="Admin · Servicios · Surfskate" />
            <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <CatalogOfferTabs active="surfskate" />
                <div className="rounded-2xl border border-dashed border-orange-400/35 bg-orange-500/5 p-6 sm:p-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-300">
                        Próximamente
                    </p>
                    <h1 className="mt-2 text-2xl font-bold text-white">
                        Tarifas Surfskate en catálogo
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                        Hoy las tarifas de clases de surfskate están informativas en la página
                        pública. En una siguiente fase se podrán gestionar desde aquí (base de
                        datos + CRUD), igual que taquillas, bonos, clases y fotos.
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2">
                        <Link
                            href={hrefFor("servicios.surfSkate")}
                            className="inline-flex rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-orange-400/40 hover:text-white"
                        >
                            Ver página pública
                        </Link>
                        <Link
                            href={hrefFor("admin.catalog.index")}
                            className="inline-flex rounded-xl bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
                        >
                            Volver al hub
                        </Link>
                    </div>
                </div>
            </div>
        </>
    );
}
