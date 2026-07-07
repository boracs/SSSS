import * as Popover from "@radix-ui/react-popover";
import { useState } from "react";
import { formatTimeMadrid } from "../../lib/madridTime";
import { modalityMeta } from "../../lib/classManagerModality";
import { isEnrollmentFull, resolvePillBorderClass, resolvePillTitle, resolveStaffCapacity } from "../../lib/monitorAvailability";
import ClassLessonInfoPanel from "./ClassLessonInfoPanel";
import StaffAvatar, { monitorsFromEntry, PhotographerBadge, staffVisualFromEntry } from "./StaffAvatar";

function formatLevelShort(level) {
    const v = String(level || "").toLowerCase();
    if (v === "iniciacion") return "Inic.";
    if (v === "intermedio") return "Inter.";
    if (v === "avanzado") return "Avanz.";
    return level || "—";
}

function levelBadgeClass(level) {
    const v = String(level || "").toLowerCase();
    if (v === "avanzado") return "bg-rose-500/10 text-rose-300 border-rose-500/25";
    if (v === "intermedio") return "bg-sky-500/10 text-sky-300 border-sky-500/25";
    return "bg-emerald-500/10 text-emerald-300 border-emerald-500/25";
}

function pillContainerClass(entry, isPastEntry, staff) {
    const meta = modalityMeta(entry);
    const historical = isPastEntry ? "opacity-55" : "";
    const borderAlert = resolvePillBorderClass(entry, staff);
    return [
        "relative flex w-full min-w-0 cursor-pointer items-center gap-1 rounded-lg border bg-gradient-to-r from-gray-800/95 to-gray-900/95 px-1.5 py-1 text-left ring-1 ring-white/5 transition hover:brightness-110",
        `border-l-[3px] ${meta.accent}`,
        borderAlert,
        historical,
    ].join(" ");
}

export default function ClassCalendarPill({
    entry,
    isPastEntry = false,
    onEdit,
    onDelete,
    onAddGuest,
    onEditGuest,
    onRequestPaymentChange,
    onRemoveGuest,
    onApproveQuota,
    onDenyQuota,
}) {
    const [infoOpen, setInfoOpen] = useState(false);
    const monitors = monitorsFromEntry(entry);
    const photographer = staffVisualFromEntry(entry, "photographer");
    const staff = resolveStaffCapacity(entry);
    const enrollmentFull = isEnrollmentFull(entry);

    const handleEdit = (lesson) => {
        setInfoOpen(false);
        onEdit?.(lesson);
    };

    const handleDelete = (lesson) => {
        setInfoOpen(false);
        onDelete?.(lesson);
    };

    return (
        <Popover.Root open={infoOpen} onOpenChange={setInfoOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    className={pillContainerClass(entry, isPastEntry, staff)}
                    title={resolvePillTitle(entry, staff)}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Clase ${formatTimeMadrid(entry.starts_at)} · ${entry.occupancy}/${entry.max_capacity}`}
                    aria-expanded={infoOpen}
                >
                    <span className="shrink-0 text-[10px] font-extrabold tabular-nums text-white">
                        {formatTimeMadrid(entry.starts_at)}
                    </span>

                    <span className="flex shrink-0 items-center gap-0.5">
                        {monitors.length > 0 ? (
                            monitors.map((monitor, idx) => (
                                <StaffAvatar
                                    key={`${monitor.name || "m"}-${idx}`}
                                    initials={monitor.initials}
                                    color={monitor.color}
                                    textColor={monitor.textColor}
                                    size="xs"
                                    title={monitor.name ? `Monitor: ${monitor.name}` : "Monitor"}
                                />
                            ))
                        ) : (
                            <StaffAvatar
                                initials="?"
                                size="xs"
                                title="Sin monitor asignado"
                            />
                        )}
                    </span>

                    <span
                        className={`shrink-0 rounded border px-1 py-px text-[8px] font-semibold ${levelBadgeClass(entry.level)}`}
                        title={entry.level}
                    >
                        {formatLevelShort(entry.level)}
                    </span>

                    {entry.has_photographer || photographer.name ? (
                        <PhotographerBadge
                            title={photographer.name ? `Fotógrafo: ${photographer.name}` : "Fotógrafo asignado"}
                            size="xs"
                        />
                    ) : null}

                    <span
                        className={`min-w-0 shrink text-[9px] font-bold tabular-nums ml-auto ${
                            enrollmentFull ? "text-rose-300" : "text-gray-300"
                        }`}
                        title={enrollmentFull ? "Cupo lleno" : "Apuntados"}
                    >
                        {entry.occupancy}/{entry.max_capacity}
                    </span>
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content
                    side="top"
                    align="center"
                    sideOffset={4}
                    collisionPadding={12}
                    avoidCollisions
                    className="z-[1300] outline-none"
                    onClick={(e) => e.stopPropagation()}
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <ClassLessonInfoPanel
                        entry={entry}
                        isPastEntry={isPastEntry}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddGuest={onAddGuest}
                        onEditGuest={onEditGuest}
                        onRequestPaymentChange={onRequestPaymentChange}
                        onRemoveGuest={onRemoveGuest}
                        onApproveQuota={onApproveQuota}
                        onDenyQuota={onDenyQuota}
                    />
                    <Popover.Arrow className="fill-gray-900" width={12} height={6} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
}
