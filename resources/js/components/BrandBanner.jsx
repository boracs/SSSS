import React from "react";

/**
 * Banner superior de marca: gradiente azul medianoche → cian, título y tagline.
 * Se muestra en todas las páginas (invitados, usuarios y admin) encima del menú.
 */
export default function BrandBanner() {
    return (
        <div className="w-full bg-gradient-to-r from-brand-deep via-brand-deep/95 to-brand-accent py-6 sm:py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70 sm:text-sm">
                    S4 · San Sebastian Surf School
                </p>
                <h1 className="mt-2 font-heading text-2xl font-extrabold leading-tight text-white sm:text-3xl md:text-4xl">
                    Domina el Cantábrico con{" "}
                    <span className="text-brand-accent">S4</span>
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">
                    Escuela de surf premium en San Sebastián. Seguridad, técnica y experiencia local en La Concha y Zurriola.
                </p>
            </div>
        </div>
    );
}
