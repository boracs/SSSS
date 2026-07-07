import { formatDateTimeMadrid } from "./madridTime";

const WINDOW_FORMAT = {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
};

export function formatConflictWindow(start, end) {
    if (!start || !end) return "—";

    const startLabel = formatDateTimeMadrid(start, WINDOW_FORMAT);
    const endTime = formatDateTimeMadrid(end, { hour: "2-digit", minute: "2-digit", hour12: false });

    return `${startLabel} – ${endTime}`;
}

export function monitorsRequiredLabel(count) {
    const n = Number(count || 1);
    return n >= 2 ? "2 monitores" : "1 monitor";
}
