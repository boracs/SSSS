import React, { useState } from "react";
import { Link } from "@inertiajs/react";
import BrandLogo from "./BrandLogo";
import SponsorsStrip from "./SponsorsStrip";
import ContactChannelsModal from "./ContactChannelsModal";

const year = new Date().getFullYear();
const INSTAGRAM_URL = "https://www.instagram.com/sansebastiansurfschool";
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

function InstagramIcon() {
    return (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
    );
}

function SocialButton({ href, label, children }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition-all duration-200 hover:border-s4-cyan/40 hover:bg-s4/20 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
            {children}
        </a>
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
        <footer className="border-t border-s4/30 bg-gradient-to-b from-s4-deep via-slate-900 to-slate-950 text-white">
            <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10">
                <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
                    {/* Marca — móvil alineada a la izquierda (mismo eje que enlaces) */}
                    <div className="flex flex-col items-start text-left lg:col-span-4">
                        <BrandLogo variant="whiteMark" className="h-14 w-14 sm:h-[4.5rem] sm:w-[4.5rem]" />
                        <p className="mt-3 font-heading text-lg font-bold tracking-tight text-white sm:mt-4 sm:text-xl">
                            San Sebastian Surf School
                        </p>
                        <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-400">
                            Zurriola · Cantábrico. Seguridad, técnica y experiencia premium en Donostia.
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-5">
                            <SocialButton href={INSTAGRAM_URL} label="Instagram @sansebastiansurfschool">
                                <InstagramIcon />
                            </SocialButton>
                            <span className="text-xs text-slate-500">@sansebastiansurfschool</span>
                        </div>
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

                <div className="mt-8 border-t border-white/10 pt-6 sm:mt-12 sm:pt-8">
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
