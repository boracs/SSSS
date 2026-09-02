import React from "react";
import { Head } from "@inertiajs/react";
import PageShell from "@/layouts/PageShell";
import Breadcrumbs from "@/components/Breadcrumbs";
import CatalogOfferTabs from "@/components/admin/CatalogOfferTabs";

/**
 * Envoltorio estándar de las pantallas admin del hub Catálogo:
 * PageShell + fondo oscuro con blobs + CatalogOfferTabs + Breadcrumbs + cabecera + slot de toast.
 */
export default function AdminPageShell({
    title,
    headTitle,
    eyebrow,
    description,
    activeTab,
    breadcrumbs = [],
    showBlobs = true,
    showCatalogTabs = true,
    toast = null,
    children,
}) {
    return (
        <PageShell variant="slate">
            <Head title={headTitle || title} />
            <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 sm:px-6 lg:px-8">
                {showBlobs ? (
                    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-cyan-500/10 blur-[100px]" />
                        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-orange-500/10 blur-[90px]" />
                    </div>
                ) : null}

                <div className="relative mx-auto max-w-7xl space-y-6">
                    {showCatalogTabs ? <CatalogOfferTabs active={activeTab} /> : null}

                    <header>
                        {breadcrumbs.length ? (
                            <Breadcrumbs
                                items={breadcrumbs}
                                variant="dark"
                                className="mb-3 hidden sm:flex"
                            />
                        ) : null}
                        {eyebrow ? (
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">
                                {eyebrow}
                            </p>
                        ) : null}
                        {title ? (
                            <h1
                                className={`text-3xl font-extrabold tracking-tight text-white sm:text-4xl ${
                                    eyebrow ? "mt-2" : ""
                                }`}
                            >
                                {title}
                            </h1>
                        ) : null}
                        {description ? (
                            <p className="mt-2 max-w-2xl text-sm text-slate-400">{description}</p>
                        ) : null}
                    </header>

                    {children}
                </div>
            </div>

            {toast}
        </PageShell>
    );
}
