import { resolveModality, modalityMeta } from "../../lib/classManagerModality";
import { formatTimeMadrid } from "../../lib/madridTime";
import { isEnrollmentFull, resolveStaffCapacity, staffCapacityBadgeClass } from "../../lib/monitorAvailability";
import { PAYMENT_STATUS_LABELS, paymentBadgeClass } from "../../lib/guestEnrollment";
import StaffAvatar, { staffVisualFromEntry } from "./StaffAvatar";

export function shouldShowMonitorBusyWarning(entry) {
    return resolveStaffCapacity(entry).showWarning;
}

function formatLevel(level) {
    const v = String(level || "").toLowerCase();
    if (v === "iniciacion") return "Iniciación";
    if (v === "intermedio") return "Intermedio";
    if (v === "avanzado") return "Avanzado";
    return level || "—";
}

export function canManageLesson(entry, isPastEntry = false) {
    if (!entry || isPastEntry) return false;
    if (entry.status && entry.status !== "scheduled") return false;
    return true;
}

function StaffRow({ visual, label, fallback = "Sin asignar" }) {
    return (
        <div className="mt-2 flex items-center gap-2">
            <StaffAvatar
                initials={visual.initials}
                color={visual.color}
                textColor={visual.textColor}
                size="md"
                title={visual.name ? `${label}: ${visual.name}` : fallback}
            />
            <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
                <p className="truncate text-[11px] font-semibold text-gray-100">
                    {visual.name || fallback}
                </p>
            </div>
        </div>
    );
}

export default function ClassLessonInfoPanel({
    entry,
    className = "",
    isPastEntry = false,
    onEdit,
    onDelete,
    onAddGuest,
    onEditGuest,
    onRequestPaymentChange,
    onRemoveGuest,
    onApproveQuota,
    onDenyQuota,
    showActions = true,
}) {
    if (!entry) return null;

    const modality = resolveModality(entry);
    const meta = modalityMeta(entry);
    const isVip = modality === "vip";
    const isAcademy = !isVip;
    const manageable = canManageLesson(entry, isPastEntry);
    const monitor = staffVisualFromEntry(entry, "monitor");
    const monitor2 = staffVisualFromEntry(entry, "monitor_2");
    const photographer = staffVisualFromEntry(entry, "photographer");
    const hasPhotographer = Boolean(entry.has_photographer || photographer.name);
    const enrollmentFull = isEnrollmentFull(entry);
    const staff = resolveStaffCapacity(entry);
    const enrollments = Array.isArray(entry.enrollments) ? entry.enrollments : [];

    const renderEnrollmentActions = (person) => {
        if (!manageable) return null;

        if (person.is_quota_pending) {
            return (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    <span className="w-full text-[9px] font-medium text-amber-200/90">
                        Solicitud de cupo extra (7.º o más)
                    </span>
                    {onApproveQuota ? (
                        <button
                            type="button"
                            onClick={() => onApproveQuota(entry, person)}
                            className="rounded border border-emerald-600/40 bg-emerald-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200"
                        >
                            Aceptar
                        </button>
                    ) : null}
                    {onDenyQuota ? (
                        <button
                            type="button"
                            onClick={() => onDenyQuota(entry, person)}
                            className="rounded border border-rose-600/40 bg-rose-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-rose-200"
                        >
                            Denegar
                        </button>
                    ) : null}
                </div>
            );
        }

        if (!person.is_admin_guest) return null;

        return (
            <div className="mt-1.5 flex flex-wrap gap-1">
                {onEditGuest ? (
                    <button
                        type="button"
                        onClick={() => onEditGuest(entry, person)}
                        className="rounded border border-indigo-600/40 bg-indigo-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-indigo-200"
                    >
                        Editar
                    </button>
                ) : null}
                {onRequestPaymentChange && person.payment_status !== "confirmed" ? (
                    <button
                        type="button"
                        onClick={() => onRequestPaymentChange(person, "confirmed")}
                        className="rounded border border-emerald-600/40 bg-emerald-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-200"
                    >
                        Marcar pagado
                    </button>
                ) : null}
                {onRequestPaymentChange && person.payment_status === "confirmed" ? (
                    <button
                        type="button"
                        onClick={() => onRequestPaymentChange(person, "pending")}
                        className="rounded border border-amber-600/40 bg-amber-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-200"
                    >
                        Marcar pendiente
                    </button>
                ) : null}
                {onRemoveGuest ? (
                    <button
                        type="button"
                        onClick={() => onRemoveGuest(entry, person)}
                        className="rounded border border-rose-600/40 bg-rose-900/20 px-1.5 py-0.5 text-[9px] font-semibold text-rose-200"
                    >
                        Quitar
                    </button>
                ) : null}
            </div>
        );
    };

    const enrollmentListTitle = isVip ? "Alumnos VIP" : "Apuntados";

    return (
        <div
            className={`w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-white/10 bg-gradient-to-b from-gray-800 to-gray-900 p-3 text-[11px] leading-relaxed text-gray-200 shadow-2xl ring-1 ring-white/10 ${className}`}
        >
            <div className="flex items-start justify-between gap-2 border-b border-white/5 pb-2">
                <div className="min-w-0">
                    <p className="text-sm font-bold text-white">
                        {entry.starts_at ? formatTimeMadrid(entry.starts_at) : "—"}
                        <span className="ml-1.5 font-normal text-gray-400">· {formatLevel(entry.level)}</span>
                    </p>
                    <span className={`mt-1 inline-flex rounded border px-1.5 py-0.5 text-[9px] font-semibold ${meta.pill}`}>
                        {meta.label}
                    </span>
                </div>
                <span className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold ${
                    enrollmentFull
                        ? "border border-rose-500/40 bg-rose-900/30 text-rose-200"
                        : "bg-gray-900/80 text-gray-300"
                }`}>
                    {entry.occupancy}/{entry.max_capacity}
                    {enrollmentFull ? " · Lleno" : ""}
                </span>
            </div>

            {entry.location ? (
                <p className="mt-1.5 text-gray-400">
                    <span className="font-bold text-gray-300">Lugar:</span> {entry.location}
                </p>
            ) : null}

            {isAcademy && entry.booker_name ? (
                <p className="mt-1.5 text-gray-400">
                    <span className="font-bold text-gray-300">Contacto:</span> {entry.booker_name}
                    {entry.booker_phone ? <span className="text-gray-500"> · {entry.booker_phone}</span> : null}
                </p>
            ) : null}

            <StaffRow visual={monitor} label="1º monitor" />
            {monitor2.name ? (
                <StaffRow visual={monitor2} label="2º monitor" />
            ) : null}
            {hasPhotographer ? (
                <StaffRow visual={photographer} label="Fotógrafo" fallback="Sin asignar" />
            ) : (
                <p className="mt-1.5 text-gray-500">
                    <span className="font-bold text-gray-400">Fotógrafo:</span> No
                </p>
            )}

            {isVip || isAcademy ? (
                <div className="mt-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{enrollmentListTitle}</span>
                        {isAcademy && manageable && onAddGuest ? (
                            <button
                                type="button"
                                onClick={() => onAddGuest(entry)}
                                className="rounded-md border border-cyan-600/40 bg-cyan-900/20 px-2 py-0.5 text-[9px] font-semibold text-cyan-200 hover:bg-cyan-900/40"
                            >
                                + Añadir
                            </button>
                        ) : null}
                    </div>
                    {enrollments.length > 0 ? (
                        <ul className="mt-1.5 max-h-36 space-y-1.5 overflow-auto pr-1">
                            {enrollments.map((person) => (
                                <li
                                    key={person.id}
                                    className={`rounded-lg border px-2 py-1.5 ${
                                        person.is_quota_pending
                                            ? "border-amber-500/30 bg-amber-950/30"
                                            : "border-white/5 bg-gray-900/60"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold text-gray-100">{person.name}</p>
                                            {person.phone ? (
                                                <p className="truncate text-[10px] text-gray-500">{person.phone}</p>
                                            ) : null}
                                        </div>
                                        {person.is_quota_pending ? (
                                            <span className="shrink-0 rounded border border-amber-500/40 bg-amber-900/30 px-1.5 py-0.5 text-[8px] font-bold uppercase text-amber-200">
                                                Pendiente
                                            </span>
                                        ) : (
                                            <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[8px] font-bold uppercase ${paymentBadgeClass(person.payment_status)}`}>
                                                {PAYMENT_STATUS_LABELS[person.payment_status] || person.payment_status}
                                            </span>
                                        )}
                                    </div>
                                    {renderEnrollmentActions(person)}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-1 text-gray-500">{isVip ? "Sin inscritos" : "Nadie apuntado aún."}</p>
                    )}
                </div>
            ) : null}

            {shouldShowMonitorBusyWarning(entry) ? (
                <span className={`mt-2 block rounded-md border px-2 py-1.5 ${staffCapacityBadgeClass(staff.status)}`}>
                    <span className="block text-[10px] font-bold uppercase tracking-wide">
                        {staff.status === "exhausted" ? "Sin monitores" : staff.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-snug">{staff.message}</span>
                </span>
            ) : null}

            {showActions && manageable && (onEdit || onDelete) ? (
                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-2">
                    {onEdit ? (
                        <button
                            type="button"
                            onClick={() => onEdit(entry)}
                            className="rounded-lg border border-indigo-600/50 bg-indigo-900/30 px-2.5 py-1 text-[10px] font-semibold text-indigo-200 hover:bg-indigo-900/50"
                        >
                            Editar clase
                        </button>
                    ) : null}
                    {onDelete ? (
                        <button
                            type="button"
                            onClick={() => onDelete(entry)}
                            className="rounded-lg border border-rose-600/50 bg-rose-900/30 px-2.5 py-1 text-[10px] font-semibold text-rose-200 hover:bg-rose-900/50"
                        >
                            {isVip ? "Eliminar" : "Cancelar clase"}
                        </button>
                    ) : null}
                </div>
            ) : null}

            {!manageable && entry.status && entry.status !== "scheduled" ? (
                <p className="mt-2 text-[10px] text-gray-500">Clase {entry.status} — no editable.</p>
            ) : null}
        </div>
    );
}
