import { formatDateTimeMadrid, formatTimeMadrid } from "../../lib/madridTime";

function phoneDigits(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("34") ? digits : `34${digits}`;
}

function telHref(phone) {
    const digits = phoneDigits(phone);
    return digits ? `tel:+${digits}` : null;
}

function whatsAppHref(phone, text) {
    const digits = phoneDigits(phone);
    return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

function cancellationMessage(lesson, person) {
    const first = person.first_name || person.name?.split(" ")[0] || "alumno";
    const when = lesson?.starts_at
        ? `${formatDateTimeMadrid(lesson.starts_at, { day: "2-digit", month: "2-digit", year: "numeric" })} a las ${formatTimeMadrid(lesson.starts_at)}`
        : "la fecha programada";
    return `Hola ${first}, te contactamos de San Sebastian Surf School: la clase del ${when} ha sido cancelada. Disculpa las molestias.`;
}

function statusLabel(status) {
    if (status === "booker") return "Contacto";
    if (status === "pending_extra_monitor") return "Pend. cupo";
    if (status === "pending") return "Pendiente";
    if (status === "confirmed") return "Confirmado";
    if (status === "enrolled") return "Inscrito";
    return status || "—";
}

function ContactRow({ person, lesson }) {
    const phone = person.phone;
    const wa = phone ? whatsAppHref(phone, cancellationMessage(lesson, person)) : null;
    const tel = phone ? telHref(phone) : null;
    const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ") || person.name || "—";

    return (
        <div className="rounded-lg border border-white/10 bg-gray-950/50 px-3 py-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="font-semibold text-gray-100">{fullName}</p>
                    {(person.first_name || person.last_name) && person.name !== fullName ? (
                        <p className="text-[10px] text-gray-500">{person.name}</p>
                    ) : null}
                    {phone ? (
                        <p className="mt-0.5 text-xs tabular-nums text-cyan-200/90">{phone}</p>
                    ) : (
                        <p className="mt-0.5 text-xs text-gray-500">Sin teléfono registrado</p>
                    )}
                    {person.email ? (
                        <p className="truncate text-[10px] text-gray-500">{person.email}</p>
                    ) : null}
                </div>
                <span className="shrink-0 rounded border border-white/10 bg-gray-900 px-1.5 py-0.5 text-[8px] font-bold uppercase text-gray-400">
                    {statusLabel(person.status)}
                </span>
            </div>
            {phone ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {tel ? (
                        <a
                            href={tel}
                            className="inline-flex items-center rounded-md border border-emerald-600/40 bg-emerald-900/25 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-900/40"
                        >
                            Llamar
                        </a>
                    ) : null}
                    {wa ? (
                        <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-md border border-green-600/40 bg-green-900/25 px-2 py-1 text-[10px] font-semibold text-green-200 hover:bg-green-900/40"
                        >
                            WhatsApp
                        </a>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

export default function CancelLessonContactsPanel({ lesson, className = "" }) {
    if (!lesson) return null;

    const enrollments = Array.isArray(lesson.enrollments) ? lesson.enrollments : [];
    const bookerName = [lesson.booker_first_name, lesson.booker_last_name].filter(Boolean).join(" ")
        || lesson.booker_name
        || null;
    const bookerPhone = lesson.booker_phone || null;
    const showBooker = Boolean(bookerPhone && bookerName);

    return (
        <div className={`rounded-xl border border-amber-500/25 bg-amber-950/20 p-3 ${className}`}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-200/90">
                Avisar a los alumnos
            </p>
            <p className="mt-1 text-[11px] leading-snug text-amber-100/80">
                Contacta antes o después de confirmar la cancelación. Los enlaces abren llamada o WhatsApp con un mensaje preparado.
            </p>

            {showBooker ? (
                <div className="mt-3">
                    <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-gray-500">Contacto de la reserva</p>
                    <ContactRow
                        person={{
                            id: "booker",
                            first_name: lesson.booker_first_name || bookerName,
                            last_name: lesson.booker_last_name || "",
                            name: bookerName,
                            phone: bookerPhone,
                            status: "booker",
                        }}
                        lesson={lesson}
                    />
                </div>
            ) : null}

            {enrollments.length > 0 ? (
                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1">
                    {enrollments.map((person) => (
                        <ContactRow key={person.id} person={person} lesson={lesson} />
                    ))}
                </div>
            ) : (
                <p className="mt-3 text-xs text-gray-500">No hay alumnos apuntados en esta clase.</p>
            )}
        </div>
    );
}
