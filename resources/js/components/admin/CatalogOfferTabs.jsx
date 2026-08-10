import React from "react";
import { Link, usePage } from "@inertiajs/react";

const TABS = [
    {
        id: "taquillas",
        label: "Taquillas",
        routeName: "taquilla.index.admin",
        match: ["taquilla.index.admin"],
    },
    {
        id: "bonos",
        label: "Bonos VIP",
        routeName: "admin.bonos.index",
        match: ["admin.bonos.index"],
    },
    {
        id: "clases",
        label: "Clases",
        routeName: "admin.class-manager.index",
        match: ["admin.class-manager.index"],
    },
    {
        id: "particulares",
        label: "Particulares",
        routeName: "admin.catalog.private-lessons",
        match: ["admin.catalog.private-lessons"],
    },
    {
        id: "fotos",
        label: "Fotos",
        routeName: "admin.photos.index",
        match: ["admin.photos.index"],
    },
    {
        id: "surfskate",
        label: "Surfskate",
        routeName: "admin.catalog.surfskate",
        match: ["admin.catalog.surfskate"],
    },
];

function resolveHref(routeName) {
    try {
        return route(routeName, undefined, false);
    } catch {
        return "#";
    }
}

function isTabActive(tab, active, url) {
    if (active && tab.id === active) return true;
    try {
        if (typeof route === "function" && route().current) {
            return tab.match.some((name) => route().current(name));
        }
    } catch {
        // fall through
    }
    const path = String(url || "").split("?")[0];
    if (tab.id === "taquillas" && path.includes("/taquilla/admin/index")) return true;
    if (tab.id === "bonos" && path.includes("/admin/bonos")) return true;
    if (tab.id === "clases" && path.includes("/admin/class-manager")) return true;
    if (tab.id === "particulares" && path.includes("/admin/catalogo/clases-particulares")) return true;
    if (tab.id === "fotos" && path.includes("/admin/photos")) return true;
    if (tab.id === "surfskate" && path.includes("/admin/catalogo/surfskate")) return true;
    if (tab.id === "taquillas" && path.endsWith("/admin/catalogo")) return false;
    return false;
}

/**
 * Tabs del Gestor de servicios (catálogo de lo que ofrecemos).
 * Navega a cada CRUD de dominio sin fusionar lógica.
 * @param {{ active?: 'taquillas'|'bonos'|'clases'|'particulares'|'fotos'|'surfskate' }} props
 */
export default function CatalogOfferTabs({ active } = {}) {
    const { url } = usePage();

    return (
        <div className="mb-5 space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                        Admin · Servicios
                    </p>
                    <p className="text-xs text-slate-500">
                        Crea, edita y activa/desactiva lo que ofrecemos.
                    </p>
                </div>
                <Link
                    href={resolveHref("admin.catalog.index")}
                    className="text-[11px] font-semibold text-slate-400 underline-offset-2 hover:text-cyan-300 hover:underline"
                >
                    Ver hub
                </Link>
            </div>
            <nav
                aria-label="Tipos de servicio del gestor"
                className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
            >
                {TABS.map((tab) => {
                    const selected = isTabActive(tab, active, url);
                    return (
                        <Link
                            key={tab.id}
                            href={resolveHref(tab.routeName)}
                            aria-current={selected ? "page" : undefined}
                            className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                                selected
                                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/40"
                                    : "bg-white/5 text-slate-400 ring-1 ring-white/10 hover:bg-white/10 hover:text-slate-200"
                            }`}
                        >
                            {tab.label}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
