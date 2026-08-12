import React, { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, usePage } from "@inertiajs/react";
import { ExternalLink, Mail, MapPin, MessageSquare, X } from "lucide-react";
import WhatsAppIcon from "./icons/WhatsAppIcon";
import BrandLogo from "./BrandLogo";
import { resolveAcademyWhatsappUrl, WHATSAPP_TOPICS } from "../lib/whatsapp";

const INSTAGRAM_URL = "https://www.instagram.com/sansebastiansurfschool";
const DEFAULT_EMAIL = "info@sansebastiansurfschool.com";
const DEFAULT_LOCATION = "Playa de la Zurriola · Donostia";
const DEFAULT_HUMAN_TOUCH =
    "Te atiende el equipo del club — cercano y sin rodeos.";
const DEFAULT_TEAM_PHOTO = "/img/contact/equipo-s4-demo.png";
const DEFAULT_TEAM_PHOTO_LABEL = "Equipo S4";

const ACCENT_STYLES = {
    default: {
        header: "from-cyan-950/95 via-slate-900 to-emerald-950/90",
        glow: "bg-[radial-gradient(ellipse_at_top_right,_rgba(52,211,153,0.18),_transparent_55%)]",
        ring: "focus-visible:ring-cyan-400/50",
    },
    academy: {
        header: "from-cyan-950/95 via-[#0a2a33] to-emerald-950/90",
        glow: "bg-[radial-gradient(ellipse_at_top_right,_rgba(52,211,153,0.22),_transparent_55%)]",
        ring: "focus-visible:ring-emerald-400/50",
    },
    shop: {
        header: "from-slate-950/95 via-[#0f172a] to-cyan-950/90",
        glow: "bg-[radial-gradient(ellipse_at_top_right,_rgba(34,211,238,0.16),_transparent_55%)]",
        ring: "focus-visible:ring-cyan-400/50",
    },
    rental: {
        header: "from-slate-950/95 via-[#1a1208] to-amber-950/90",
        glow: "bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.14),_transparent_55%)]",
        ring: "focus-visible:ring-amber-400/50",
    },
};

const TOPIC_ACCENT = {
    academy: "academy",
    video: "academy",
    store: "shop",
    locker: "shop",
    rental: "rental",
    contact: "default",
};

const SECONDARY_TILE =
    "group flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center transition hover:border-white/20 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2";

const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const INSTAGRAM_ICON = (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
);

/**
 * Hub de contacto: WhatsApp como CTA primario + canales secundarios compactos.
 *
 * @param {{
 *   onClose: () => void,
 *   topic?: keyof typeof WHATSAPP_TOPICS,
 *   title?: string,
 *   subtitle?: string,
 *   footerNote?: string | null,
 *   accent?: 'default' | 'academy' | 'shop' | 'rental',
 *   locationNote?: string | null,
 *   humanTouchLine?: string | null,
 *   teamPhotoUrl?: string | null,
 *   teamPhotoLabel?: string,
 * }} props
 */
export default function ContactChannelsModal({
    onClose,
    topic = "contact",
    title = "Contacta con nosotros",
    subtitle = "Te ayudamos con clases, reservas y cualquier duda. Escríbenos y te respondemos pronto.",
    footerNote = null,
    accent,
    locationNote = DEFAULT_LOCATION,
    humanTouchLine = DEFAULT_HUMAN_TOUCH,
    teamPhotoUrl = DEFAULT_TEAM_PHOTO,
    teamPhotoLabel = DEFAULT_TEAM_PHOTO_LABEL,
}) {
    const { props } = usePage();
    const dialogRef = useRef(null);
    const whatsappRef = useRef(null);
    const previousFocusRef = useRef(null);
    const message = WHATSAPP_TOPICS[topic] || WHATSAPP_TOPICS.contact;
    const whatsappHref = resolveAcademyWhatsappUrl(
        null,
        message,
        props.academyWhatsappUrl,
    );
    const email = (props.academyContactEmail || DEFAULT_EMAIL).trim() || DEFAULT_EMAIL;
    const whatsappDisplay = (props.academyWhatsappDisplay || "").trim();
    const whatsappSub = whatsappDisplay || "Respuesta en minutos";

    const accentKey = accent ?? TOPIC_ACCENT[topic] ?? "default";
    const accentStyle = ACCENT_STYLES[accentKey] ?? ACCENT_STYLES.default;

    useEffect(() => {
        previousFocusRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
                return;
            }
            if (event.key !== "Tab") {
                return;
            }

            const root = dialogRef.current;
            if (!root) {
                return;
            }

            const focusables = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
                (el) =>
                    el instanceof HTMLElement &&
                    !el.hasAttribute("disabled") &&
                    el.getAttribute("aria-hidden") !== "true" &&
                    el.tabIndex !== -1,
            );
            if (focusables.length === 0) {
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const active = document.activeElement;

            if (event.shiftKey) {
                if (active === first || !root.contains(active)) {
                    event.preventDefault();
                    last.focus();
                }
            } else if (active === last || !root.contains(active)) {
                event.preventDefault();
                first.focus();
            }
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        document.addEventListener("keydown", onKeyDown);
        // CTA primario: mantener foco inicial en WhatsApp (no en el botón cerrar).
        whatsappRef.current?.focus();

        return () => {
            document.body.style.overflow = prevOverflow;
            document.removeEventListener("keydown", onKeyDown);
            const restore = previousFocusRef.current;
            if (restore && typeof restore.focus === "function" && document.contains(restore)) {
                restore.focus();
            }
        };
    }, [onClose]);

    const secondaryChannels = useMemo(
        () => [
            {
                id: "instagram",
                label: "Instagram",
                sub: "Síguenos",
                href: INSTAGRAM_URL,
                external: true,
                iconClass: "text-pink-300",
                icon: INSTAGRAM_ICON,
            },
            {
                id: "email",
                label: "Email",
                sub: "Escríbenos",
                href: `mailto:${email}`,
                external: true,
                iconClass: "text-cyan-300",
                icon: <Mail className="h-5 w-5" aria-hidden />,
            },
        ],
        [email],
    );

    const renderSecondaryLink = ({ id, label, sub, href, external, iconClass, icon }) => {
        const content = (
            <>
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 ${iconClass}`}>
                    {icon}
                </span>
                <span>
                    <span className="block text-sm font-semibold text-white">{label}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">{sub}</span>
                </span>
            </>
        );

        if (external) {
            return (
                <a
                    key={id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${SECONDARY_TILE} ${accentStyle.ring}`}
                >
                    {content}
                </a>
            );
        }

        return (
            <Link
                key={id}
                href={href}
                className={`${SECONDARY_TILE} ${accentStyle.ring}`}
                onClick={onClose}
            >
                {content}
            </Link>
        );
    };

    return createPortal(
        <div
            ref={dialogRef}
            className="fixed inset-0 z-[900] flex items-end justify-center p-4 sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-channels-title"
            data-contact-channels-modal
        >
            <div
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-md"
                onClick={onClose}
                aria-hidden
            />

            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur-xl">
                <div className={`relative overflow-hidden bg-gradient-to-br px-6 pb-5 pt-6 ${accentStyle.header}`}>
                    <div className={`pointer-events-none absolute inset-0 ${accentStyle.glow}`} aria-hidden />
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/20 text-slate-300 transition hover:border-white/30 hover:bg-black/40 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                        aria-label="Cerrar"
                    >
                        <X className="h-4 w-4" aria-hidden />
                    </button>

                    <BrandLogo
                        variant="whiteMark"
                        className="relative mb-3 h-10 w-10 opacity-95"
                        decorative
                    />

                    <h3
                        id="contact-channels-title"
                        className="relative pr-10 text-xl font-extrabold tracking-tight text-white sm:text-2xl"
                    >
                        {title}
                    </h3>
                    {subtitle ? (
                        <p className="relative mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">
                            {subtitle}
                        </p>
                    ) : null}
                    {humanTouchLine ? (
                        <p className="relative mt-2 text-xs leading-relaxed text-cyan-100/75 sm:text-sm">
                            {humanTouchLine}
                        </p>
                    ) : null}
                </div>

                <div className="flex flex-col px-5 py-5 sm:px-6">
                    {whatsappHref ? (
                        <a
                            ref={whatsappRef}
                            href={whatsappHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex min-h-[4.5rem] w-full items-center gap-3.5 rounded-2xl border border-emerald-400/35 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-4 shadow-lg shadow-emerald-950/35 transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/60 sm:gap-4"
                        >
                            {teamPhotoUrl ? (
                                <span className="relative h-12 w-12 shrink-0 self-center">
                                    <img
                                        src={teamPhotoUrl}
                                        alt=""
                                        width={48}
                                        height={48}
                                        className="h-12 w-12 rounded-full object-cover object-center ring-2 ring-white/30"
                                        loading="lazy"
                                        decoding="async"
                                    />
                                    <span
                                        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-800 text-white ring-2 ring-emerald-500"
                                        aria-hidden
                                    >
                                        <WhatsAppIcon className="h-3 w-3" />
                                    </span>
                                </span>
                            ) : (
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-xl bg-white/15 text-white">
                                    <WhatsAppIcon className="h-6 w-6 -translate-y-px" />
                                </span>
                            )}
                            <span className="flex min-w-0 flex-1 flex-col justify-center text-left">
                                <span className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-bold leading-tight text-white sm:text-lg">
                                        Escríbenos por WhatsApp
                                    </span>
                                    <span className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-50">
                                        Recomendado
                                    </span>
                                </span>
                                <span className="mt-1 block truncate text-sm leading-snug text-emerald-50/90">
                                    {whatsappSub}
                                </span>
                                {teamPhotoUrl && teamPhotoLabel ? (
                                    <span className="mt-0.5 block truncate text-xs text-emerald-50/75">
                                        {teamPhotoLabel}
                                    </span>
                                ) : null}
                            </span>
                            <ExternalLink
                                className="h-4 w-4 shrink-0 self-center text-emerald-100/80 opacity-0 transition group-hover:opacity-100 sm:opacity-70"
                                aria-hidden
                            />
                        </a>
                    ) : null}

                    <div className={whatsappHref ? "mt-6" : undefined}>
                        <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Otros canales
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {secondaryChannels.map(renderSecondaryLink)}
                        </div>
                    </div>

                    <Link
                        href={route("contacto")}
                        className={`group mt-4 flex min-h-[3.25rem] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:border-white/20 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 ${accentStyle.ring}`}
                        onClick={onClose}
                    >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-slate-200">
                            <MessageSquare className="h-4 w-4" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-white">
                                Formulario de contacto
                            </span>
                            <span className="block text-xs text-slate-400">
                                Te respondemos en 24 h
                            </span>
                        </span>
                    </Link>
                </div>

                <div className="border-t border-white/10 px-5 py-3.5 sm:px-6">
                    {footerNote ? (
                        <p className="text-center text-xs leading-relaxed text-slate-400">
                            {footerNote}
                        </p>
                    ) : locationNote ? (
                        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-cyan-500/70" aria-hidden />
                            {locationNote}
                        </p>
                    ) : null}
                </div>
            </div>
        </div>,
        document.body,
    );
}
