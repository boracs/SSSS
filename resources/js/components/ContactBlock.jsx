import { ChevronDown, Mail, MessageCircle, Phone } from "lucide-react";

/**
 * Bloque «Contactar con X»: pill ámbar + panel tel/correo/WhatsApp.
 * Estado de apertura controlado por el padre (sin lógica de negocio).
 */
export default function ContactBlock({
    contact,
    open,
    onToggle,
    mailSubject,
    mailIconClassName,
    fallbackName,
}) {
    const displayName = contact?.name || fallbackName;

    return (
        <>
            <button
                type="button"
                onClick={onToggle}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-amber-400"
                aria-expanded={open}
            >
                Contactar con {displayName}
                <ChevronDown
                    className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>
            {open ? (
                <div className="mt-4 space-y-3 rounded-xl border border-amber-500/20 bg-slate-950/40 p-4">
                    {contact?.phone && contact?.phoneTel ? (
                        <a
                            href={`tel:${contact.phoneTel}`}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                        >
                            <Phone className="h-5 w-5 shrink-0 text-amber-300" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Teléfono
                                </p>
                                <p className="text-sm font-semibold text-white">{contact.phone}</p>
                            </div>
                        </a>
                    ) : null}
                    {contact?.email ? (
                        <a
                            href={`mailto:${contact.email}?subject=${encodeURIComponent(mailSubject)}`}
                            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
                        >
                            <Mail className={`h-5 w-5 shrink-0 ${mailIconClassName}`} />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Correo
                                </p>
                                <p className="text-sm font-semibold text-white">{contact.email}</p>
                            </div>
                        </a>
                    ) : null}
                    {contact?.whatsappUrl ? (
                        <a
                            href={contact.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 transition hover:bg-emerald-500/15"
                        >
                            <MessageCircle className="h-5 w-5 shrink-0 text-emerald-300" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    WhatsApp
                                </p>
                                <p className="text-sm font-semibold text-white">
                                    Escribir a {displayName}
                                </p>
                            </div>
                        </a>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
