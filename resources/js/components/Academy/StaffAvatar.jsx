import { CameraIcon } from "@heroicons/react/24/solid";

const SIZE_CLASS = {
    xs: "h-4 w-4 text-[7px] ring-1",
    sm: "h-5 w-5 text-[8px] ring-1",
    md: "h-6 w-6 text-[9px] ring-1",
    lg: "h-8 w-8 text-[10px] ring-2",
};

export default function StaffAvatar({
    initials = "?",
    color = "#475569",
    textColor = "#f8fafc",
    size = "sm",
    title,
    className = "",
}) {
    return (
        <span
            title={title}
            aria-hidden={title ? undefined : true}
            className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold tracking-tight ring-white/25 ${SIZE_CLASS[size] || SIZE_CLASS.sm} ${className}`}
            style={{ backgroundColor: color, color: textColor }}
        >
            {initials || "?"}
        </span>
    );
}

export function staffVisualFromEntry(entry, role = "monitor") {
    const prefix = role === "photographer" ? "photographer" : role === "monitor_2" ? "monitor_2" : "monitor";
    return {
        initials: entry?.[`${prefix}_initials`] || "?",
        color: entry?.[`${prefix}_color`] || "#475569",
        textColor: entry?.[`${prefix}_text_color`] || "#f8fafc",
        name: entry?.[`${prefix}_name`]?.trim() || "",
    };
}

export function monitorsFromEntry(entry) {
    if (Array.isArray(entry?.monitors) && entry.monitors.length > 0) {
        return entry.monitors;
    }

    const primary = staffVisualFromEntry(entry, "monitor");
    const secondary = staffVisualFromEntry(entry, "monitor_2");
    const list = [];

    if (primary.initials && primary.initials !== "?") {
        list.push(primary);
    }
    if (secondary.initials && secondary.initials !== "?" && secondary.name !== primary.name) {
        list.push(secondary);
    }

    return list;
}

export function PhotographerBadge({ title, size = "xs", className = "" }) {
    const boxClass = size === "xs" ? "h-4 w-4" : "h-5 w-5";
    const iconClass = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";

    return (
        <span
            title={title || "Fotógrafo asignado"}
            className={`inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-rose-500 to-fuchsia-600 text-white shadow-sm ring-1 ring-white/30 ${boxClass} ${className}`}
        >
            <CameraIcon className={iconClass} aria-hidden />
        </span>
    );
}
