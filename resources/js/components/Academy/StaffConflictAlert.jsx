import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { formatConflictWindow, monitorsRequiredLabel } from "../../lib/staffConflictFormat";

function WindowRow({ label, start, end }) {
    return (
        <div className="rounded-lg border border-white/5 bg-black/20 px-2.5 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300/90">{label}</p>
            <p className="mt-0.5 text-xs font-medium tabular-nums text-rose-50">
                {formatConflictWindow(start, end)}
            </p>
        </div>
    );
}

export default function StaffConflictAlert({
    checking = false,
    conflict = null,
    warningMessage = "",
    className = "",
}) {
    if (checking) {
        return (
            <div className={`rounded-xl border border-gray-700 bg-gray-900/80 px-3 py-2 text-xs text-gray-400 ${className}`}>
                Comprobando disponibilidad de monitores…
            </div>
        );
    }

    if (conflict?.title) {
        return (
            <div
                role="alert"
                className={`rounded-xl border border-rose-500/40 bg-gradient-to-b from-rose-950/50 to-rose-950/30 p-3 shadow-sm ${className}`}
            >
                <div className="flex items-start gap-2">
                    <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-rose-100">{conflict.title}</p>
                        {conflict.summary ? (
                            <p className="mt-1 text-xs leading-relaxed text-rose-200/90">{conflict.summary}</p>
                        ) : null}

                        <div className="mt-3 space-y-2">
                            <WindowRow
                                label="Franja que quieres reservar"
                                start={conflict.requested_window?.start}
                                end={conflict.requested_window?.end}
                            />

                            {Array.isArray(conflict.conflicts) && conflict.conflicts.length > 0 ? (
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-300/80">
                                        {conflict.conflicts.length === 1 ? "Clase en conflicto" : "Clases en conflicto"}
                                    </p>
                                    {conflict.conflicts.map((item) => (
                                        <div
                                            key={`conflict-${item.lesson_id || item.title}-${item.window_start}`}
                                            className="rounded-lg border border-rose-500/20 bg-rose-950/20 px-2.5 py-2"
                                        >
                                            <p className="text-xs font-semibold text-rose-50">{item.title || "Clase"}</p>
                                            <p className="mt-0.5 text-[11px] tabular-nums text-rose-200/80">
                                                {formatConflictWindow(item.window_start, item.window_end)}
                                            </p>
                                            <p className="mt-1 text-[10px] text-rose-300/70">
                                                Requiere {monitorsRequiredLabel(item.monitors_required)}
                                                {item.party_size ? ` · ${item.party_size} apuntados` : ""}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (warningMessage) {
        return (
            <div
                role="status"
                className={`rounded-xl border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-100 ${className}`}
            >
                {warningMessage}
            </div>
        );
    }

    return null;
}
