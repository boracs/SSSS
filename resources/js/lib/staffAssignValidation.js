export function getStaffAssignConflict({
    monitorId = "",
    monitor2Id = "",
    hasPhotographer = false,
    photographerId = "",
} = {}) {
    const m1 = monitorId ? Number(monitorId) : null;
    const m2 = monitor2Id ? Number(monitor2Id) : null;

    if (m1 !== null && m2 !== null && m1 === m2) {
        return "El 1º y el 2º monitor no pueden ser la misma persona.";
    }

    if (!hasPhotographer || !photographerId) {
        return null;
    }

    const photographer = Number(photographerId);

    if (m1 !== null && m1 === photographer) {
        return "El fotógrafo no puede ser el mismo que el 1º monitor.";
    }

    if (m2 !== null && m2 === photographer) {
        return "El fotógrafo no puede ser el mismo que el 2º monitor.";
    }

    return null;
}
