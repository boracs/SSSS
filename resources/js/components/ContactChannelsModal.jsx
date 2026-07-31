import React, { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, usePage } from "@inertiajs/react";
import { ChevronRight } from "lucide-react";
import { resolveAcademyWhatsappUrl, WHATSAPP_TOPICS } from "../lib/whatsapp";

const INSTAGRAM_URL = "https://www.instagram.com/sansebastiansurfschool";
const DEFAULT_EMAIL = "info@sansebastiansurfschool.com";

const ROW_CLASS =
    "group flex items-center gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/40 p-4 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800/80 focus:outline-none focus:ring-1 focus:ring-slate-500";

const ICON_WRAP =
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-700/30 p-3";

const WHATSAPP_ICON = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
);

/**
 * Modal de canales de contacto (WhatsApp, Instagram, email, formulario).
 * Reutilizable en Nosotros, Tienda, etc.
 *
 * @param {{ onClose: () => void, topic?: keyof typeof WHATSAPP_TOPICS, title?: string, subtitle?: string, footerNote?: string }} props
 */
export default function ContactChannelsModal({
    onClose,
    topic = "contact",
    title = "Contacta con nosotros",
    subtitle = "Elige cómo prefieres hablar con el equipo",
    footerNote = null,
}) {
    const { props } = usePage();
    const message = WHATSAPP_TOPICS[topic] || WHATSAPP_TOPICS.contact;
    const whatsappHref = resolveAcademyWhatsappUrl(
        null,
        message,
        props.academyWhatsappUrl,
    );
    const email = (props.academyContactEmail || DEFAULT_EMAIL).trim() || DEFAULT_EMAIL;

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === "Escape") onClose();
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [onClose]);

    const contactOptions = useMemo(() => {
        const options = [];

        if (whatsappHref) {
            options.push({
                id: "whatsapp",
                label: "WhatsApp",
                sub: props.academyWhatsappDisplay || "Respuesta rápida",
                href: whatsappHref,
                external: true,
                iconClass: "text-emerald-400",
                icon: WHATSAPP_ICON,
            });
        }

        options.push(
            {
                id: "instagram",
                label: "Instagram",
                sub: "Síguenos y escríbenos",
                href: INSTAGRAM_URL,
                external: true,
                iconClass: "text-pink-400",
                icon: (
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                    </svg>
                ),
            },
            {
                id: "email",
                label: "Correo electrónico",
                sub: email,
                href: `mailto:${email}`,
                external: true,
                iconClass: "text-cyan-300",
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                    </svg>
                ),
            },
            {
                id: "form",
                label: "Formulario de contacto",
                sub: "Te respondemos en 24h",
                href: route("contacto"),
                external: false,
                iconClass: "text-slate-300",
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                ),
            },
        );

        return options;
    }, [whatsappHref, props.academyWhatsappDisplay, email]);

    return createPortal(
        <div
            className="fixed inset-0 z-[900] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-channels-title"
            data-contact-channels-modal
        >
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-slate-700/60 bg-slate-900 shadow-2xl shadow-black/40">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/50 bg-slate-800/50 text-slate-400 transition-all duration-200 hover:border-slate-600 hover:bg-slate-800 hover:text-white focus:outline-none focus:ring-1 focus:ring-slate-500"
                    aria-label="Cerrar"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden>
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="border-b border-slate-800 px-6 pb-5 pt-6 pr-14">
                    <h3
                        id="contact-channels-title"
                        className="text-xl font-bold tracking-tight text-white"
                    >
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className="mt-2 text-base leading-relaxed text-slate-300">
                            {subtitle}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col gap-2 p-4">
                    {contactOptions.map(({ id, label, sub, href, external, iconClass, icon }) => {
                        const body = (
                            <>
                                <div className={`${ICON_WRAP} ${iconClass}`}>{icon}</div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-white">{label}</p>
                                    <p className="mt-0.5 truncate text-xs text-slate-400">{sub}</p>
                                </div>
                                <ChevronRight
                                    className="h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-slate-300"
                                    aria-hidden
                                />
                            </>
                        );

                        if (external) {
                            return (
                                <a
                                    key={id}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={ROW_CLASS}
                                >
                                    {body}
                                </a>
                            );
                        }

                        return (
                            <Link key={id} href={href} className={ROW_CLASS} onClick={onClose}>
                                {body}
                            </Link>
                        );
                    })}
                </div>

                {footerNote ? (
                    <p className="border-t border-slate-800 px-6 py-4 text-center text-sm leading-relaxed text-slate-400">
                        {footerNote}
                    </p>
                ) : null}
            </div>
        </div>,
        document.body,
    );
}
