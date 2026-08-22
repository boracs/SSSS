import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import BrandLogo from "./BrandLogo";
import SponsorsStrip from "./SponsorsStrip";
import FooterSocialLinks from "./FooterSocialLinks";
import ContactChannelsModal from "./ContactChannelsModal";

const year = new Date().getFullYear();
const CONTACT_EMAIL = "info@sansebastiansurfschool.com";

const footerLinkClass =
    "inline-block text-sm font-medium text-slate-300 transition-colors duration-200 hover:text-s4-cyan focus-visible:outline-none focus-visible:text-s4-cyan";

const footerButtonClass = `${footerLinkClass} cursor-pointer text-left`;

function FooterSection({ title, children, className = "" }) {
    return (
        <div className={className}>
            <h3 className="font-heading text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300/90">
                {title}
            </h3>
            <div className="mt-3">{children}</div>
        </div>
    );
}

function FooterLinks({ items, onOpenContact }) {
    return (
        <ul className="space-y-2.5 text-sm leading-snug">
            {items.map(({ href, label, openContact }) => (
                <li key={label}>
                    {openContact ? (
                        <button type="button" onClick={onOpenContact} className={footerButtonClass}>
                            {label}
                        </button>
                    ) : (
                        <Link href={href} className={footerLinkClass}>
                            {label}
                        </Link>
                    )}
                </li>
            ))}
        </ul>
    );
}

function ContactBlock({ onOpenContact, className = "" }) {
    return (
        <ul className={`space-y-2.5 text-sm leading-snug text-slate-300 ${className}`}>
            <li>San Sebastián · Donostia</li>
            <li>
                <button type="button" onClick={onOpenContact} className={footerButtonClass}>
                    Escríbenos
                </button>
            </li>
            <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={`${footerLinkClass} break-all sm:break-normal`}>
                    {CONTACT_EMAIL}
                </a>
            </li>
        </ul>
    );
}

export default function Footer() {
    const [contactOpen, setContactOpen] = useState(false);
    const openContact = () => setContactOpen(true);

    const explorarLinks = [
        { href: route("nosotros"), label: "Sobre nosotros" },
        { href: route("servicios.surf"), label: "Clases de surf" },
        { href: route("rentals.surfboards.index"), label: "Tablas de alquiler" },
        { href: route("taller.index"), label: "Taller · Blog" },
        { label: "Contacto", openContact: true },
    ];

    const serviciosLinks = [
        { href: route("academy.lessons.index"), label: "Reservar clases" },
        { href: route("taquillas.planes"), label: "Taquillas y planes" },
        { href: `${route("servicios.webcams")}#webcam-directo`, label: "Webcam Zurriola en directo" },
        { href: route("servicios.fotografia"), label: "Fotografía en el agua" },
        { href: route("tienda"), label: "Tienda oficial" },
    ];

    return (
        <footer className="relative z-[1] min-w-0 overflow-x-clip border-t border-s4/30 bg-gradient-to-b from-s4-deep via-slate-900 to-slate-950 text-white">
            <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10">
                <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
                    {/* Marca — móvil alineada a la izquierda (mismo eje que enlaces) */}
                    <div className="flex flex-col items-start text-left lg:col-span-4">
                        <BrandLogo variant="whiteMark" className="h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]" />
                        <p className="mt-3 font-heading text-lg font-bold tracking-tight text-white sm:mt-4 sm:text-xl">
                            San Sebastian Surf School
                        </p>
                        <FooterSocialLinks className="mt-4 sm:mt-5" />
                    </div>

                    {/* Móvil: banda de contacto ancho completo (CTA claro, sin columna huérfana) */}
                    <div className="col-span-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 sm:hidden">
                        <p className="text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                            San Sebastián · Donostia
                        </p>
                        <button
                            type="button"
                            onClick={openContact}
                            className="mt-3 flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-[#0f5f74] via-cyan-700 to-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-md shadow-cyan-950/30 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                        >
                            Escríbenos
                        </button>
                        <a
                            href={`mailto:${CONTACT_EMAIL}`}
                            className="mt-2 block text-center text-xs text-slate-400 transition hover:text-cyan-300"
                        >
                            {CONTACT_EMAIL}
                        </a>
                    </div>

                    {/* Enlaces — móvil 2 cols simétricas; tablet+ 3 cols con contacto */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 lg:col-span-8 lg:gap-10">
                        <FooterSection title="Explorar">
                            <FooterLinks items={explorarLinks} onOpenContact={openContact} />
                        </FooterSection>

                        <FooterSection title="Servicios">
                            <FooterLinks items={serviciosLinks} />
                        </FooterSection>

                        <FooterSection title="Contacto" className="hidden sm:block">
                            <ContactBlock onOpenContact={openContact} />
                        </FooterSection>
                    </div>
                </div>

                <div className="mt-8 min-w-0 border-t border-white/10 pt-8 sm:mt-10 sm:pt-10">
                    <SponsorsStrip variant="dark" layout="strip" title="Colaboradores" />
                </div>
            </div>

            <div className="border-t border-white/10 bg-slate-950/50">
                <div className="mx-auto max-w-7xl px-4 py-4 text-center sm:px-6 sm:text-left">
                    <p className="text-[11px] leading-relaxed text-slate-500 sm:text-xs">
                        © {year} San Sebastian Surf School · S4. Todos los derechos reservados.
                    </p>
                </div>
            </div>

            {contactOpen ? (
                <ContactChannelsModal topic="contact" onClose={() => setContactOpen(false)} />
            ) : null}
        </footer>
    );
}
