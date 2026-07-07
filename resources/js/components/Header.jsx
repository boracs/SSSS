import React from "react";
import { usePage } from "@inertiajs/react";
import OpcionesIntro from "./OpcionesIntro";
import GlobalNav from "./GlobalNav";
import BrandLogo from "./BrandLogo";

export default function Header() {
    const { url } = usePage();
    const currentPath = String(url || "").split("?")[0];
    const isHome = currentPath === "/";

    return (
        <header className="relative z-[500]">
            {isHome ? <OpcionesIntro /> : null}

            <GlobalNav />

            {isHome ? (
                <div
                    className="border-b border-emerald-500/20 px-4 py-6 sm:px-6"
                    style={{ background: "linear-gradient(95deg, #071a2f 0%, #0b2a43 45%, #114d4b 100%)" }}
                >
                    <div className="mx-auto flex max-w-7xl flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-lime-400">Zurriola · Donostia</p>
                            <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-5xl">
                                Domina el Cantábrico con <span className="text-emerald-400">S4</span>
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm text-slate-200 sm:text-base">
                                Escuela de surf premium en San Sebastián. Seguridad, técnica y experiencia local en Zurriola.
                            </p>
                        </div>
                        <BrandLogo variant="whiteHero" className="h-28 w-28 shrink-0 opacity-95 sm:h-36 sm:w-36" priority />
                    </div>
                </div>
            ) : null}
        </header>
    );
}
