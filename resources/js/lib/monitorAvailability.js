/** Estado del pool de monitores (Borja + Willy) para tarjetas y avisos del gestor. */

import { formatTimeMadrid } from "./madridTime";

export const STAFF_CAPACITY_FALLBACK = {
    exhausted: {
        status: "exhausted",
        monitorsFree: 0,
        label: "Sin monitores",
        message:
            "Borja y Willy están ocupados en esta franja (15 min antes y después de la clase). No se pueden reservar más sesiones.",
        showWarning: true,
    },
    limited: {
        status: "limited",
        monitorsFree: 1,
        label: "1 monitor libre",
        message:
            "Solo queda 1 monitor disponible (Borja o Willy). Capacidad máxima en esta franja: 6 alumnos.",
        showWarning: true,
    },
    full: {
        status: "full",
        monitorsFree: 2,
        label: "2 monitores libres",
        message: "Ambos monitores disponibles. Capacidad máxima en esta franja: 12 alumnos.",
        showWarning: false,
    },
};

export function isEnrollmentFull(entry) {
    if (entry?.is_enrollment_full === true) {
        return true;
    }

    const max = Number(entry?.max_capacity ?? 0);
    const occ = Number(entry?.occupancy ?? 0);

    return max > 0 && occ >= max;
}

export function resolveStaffCapacity(entry) {
    if (!entry) return STAFF_CAPACITY_FALLBACK.full;

    if (entry.staff_capacity_status) {
        return {
            status: entry.staff_capacity_status,
            monitorsFree: Number(entry.monitors_free ?? 0),
            label: entry.staff_capacity_label || "",
            message: entry.staff_capacity_message || "",
            showWarning: Boolean(entry.staff_capacity_show_warning),
        };
    }

    const poolMax = Number(entry.staff_pool_max_capacity ?? entry.max_capacity ?? 12);
    if (poolMax === 0) return STAFF_CAPACITY_FALLBACK.exhausted;
    if (poolMax === 6) return STAFF_CAPACITY_FALLBACK.limited;
    return STAFF_CAPACITY_FALLBACK.full;
}

export function resolvePillBorderClass(entry, staff) {
    if (isEnrollmentFull(entry)) {
        return "border-rose-500/60";
    }

    if (staff.status === "exhausted") {
        return "border-rose-500/50";
    }

    if (staff.showWarning) {
        return "border-amber-500/50";
    }

    return "border-white/10";
}

export function resolvePillTitle(entry, staff) {
    if (isEnrollmentFull(entry)) {
        return `Cupo lleno (${entry.occupancy}/${entry.max_capacity})`;
    }

    if (staff.showWarning) {
        return staff.message;
    }

    return `Ver detalle · ${entry.starts_at ? formatTimeMadrid(entry.starts_at) : ""}`;
}

export function staffCapacityBadgeClass(status) {
    if (status === "exhausted") {
        return "border-rose-700/40 bg-rose-900/25 text-rose-100";
    }
    if (status === "limited") {
        return "border-amber-700/40 bg-amber-900/20 text-amber-100";
    }
    return "border-emerald-700/30 bg-emerald-900/15 text-emerald-100";
}
