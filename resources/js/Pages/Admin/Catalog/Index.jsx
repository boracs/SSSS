import React from "react";
import { Head, Link } from "@inertiajs/react";

/**
 * Hub del Gestor de servicios: solo cards con descripción.
 * Las pills (CatalogOfferTabs) viven en los gestores hijos para saltar entre dominios
 * sin repetir aquí el mismo menú.
 */
const LINKS = [
    {
        label: "Planes taquillas",
        href: "taquilla.index.admin",
        desc: "Cuotas y planes que ven los socios.",
    },
    {
        label: "Packs de bonos VIP",
        href: "admin.bonos.index",
        desc: "Packs de clases para alumnos VIP.",
    },
    {
        label: "Gestor de clases",
        href: "admin.class-manager.index",
        desc: "Calendario VIP, grupal, semanal y particular.",
    },
    {
        label: "Clases particulares",
        href: "admin.catalog.private-lessons",
        desc: "Precio por tamaño de grupo y señal online.",
    },
    {
        label: "Packs de fotos",
        href: "admin.photos.index",
        desc: "Bonos/packs (base + plus × personas) y reservas.",
    },
    {
        label: "Surfskate",
        href: "admin.catalog.surfskate",
        desc: "Tarifas (próximamente en base de datos).",
    },
];

function hrefFor(name) {
    try {
        return route(name, undefined, false);
    } catch {
        return "#";
    }
}

export default function CatalogIndex() {
    return (
        <>
            <Head title="Admin · Gestor de servicios" />
            <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
                <header>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                        Admin · Servicios
                    </p>
                    <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                        Gestor de servicios
                    </h1>
                    <p className="mt-2 max-w-2xl text-sm text-slate-400">
                        Elige un tipo: cada card abre su gestor de dominio, sin
                        mezclar datos ni lógica.
                    </p>
                </header>
                <ul className="grid gap-3 sm:grid-cols-2">
                    {LINKS.map((item) => (
                        <li key={item.href}>
                            <Link
                                href={hrefFor(item.href)}
                                className="block rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition hover:border-cyan-400/35 hover:bg-slate-900"
                            >
                                <p className="text-sm font-bold text-white">{item.label}</p>
                                <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}
