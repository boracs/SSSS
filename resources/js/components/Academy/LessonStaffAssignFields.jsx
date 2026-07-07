import StaffAvatar from "./StaffAvatar";
import { getStaffAssignConflict } from "../../lib/staffAssignValidation";

export default function LessonStaffAssignFields({
    staff = [],
    monitorId = "",
    monitor2Id = "",
    hasPhotographer = false,
    photographerId = "",
    onMonitorChange,
    onMonitor2Change,
    onHasPhotographerChange,
    onPhotographerChange,
    staffPool = null,
    className = "",
}) {
    const available = staffPool?.available?.length ? staffPool.available : staff;
    const occupied = staffPool?.occupied || [];

    const renderOptions = () => (
        <>
            <option value="">Sin asignar</option>
            {available.map((s) => (
                <option key={`avail-${s.id}`} value={s.id}>
                    {s.name}
                </option>
            ))}
            {occupied.map((s) => (
                <option key={`occ-${s.id}`} value={s.id} disabled>
                    {s.name} (ocupado)
                </option>
            ))}
        </>
    );

    const selectedStaff = (id) => staff.find((s) => Number(s.id) === Number(id));

    const staffConflict = getStaffAssignConflict({
        monitorId,
        monitor2Id,
        hasPhotographer,
        photographerId,
    });

    const monitorIds = new Set(
        [monitorId, monitor2Id].filter(Boolean).map((id) => Number(id)),
    );

    const renderPhotographerOptions = () => (
        <>
            <option value="">Sin asignar</option>
            {available.map((s) => {
                const isMonitor = monitorIds.has(Number(s.id));
                return (
                    <option key={`photo-avail-${s.id}`} value={s.id} disabled={isMonitor}>
                        {s.name}{isMonitor ? " (ya es monitor)" : ""}
                    </option>
                );
            })}
            {occupied.map((s) => {
                const isMonitor = monitorIds.has(Number(s.id));
                return (
                    <option key={`photo-occ-${s.id}`} value={s.id} disabled>
                        {s.name} (ocupado){isMonitor ? " · ya es monitor" : ""}
                    </option>
                );
            })}
        </>
    );

    return (
        <div className={`space-y-3 ${className}`}>
            <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    1º monitor
                </label>
                <div className="flex items-center gap-2">
                    {monitorId ? (
                        <StaffAvatar
                            initials={selectedStaff(monitorId)?.initials || "?"}
                            color={selectedStaff(monitorId)?.color}
                            textColor={selectedStaff(monitorId)?.text_color}
                            size="sm"
                        />
                    ) : null}
                    <select
                        value={monitorId}
                        onChange={(e) => onMonitorChange?.(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        {renderOptions()}
                    </select>
                </div>
            </div>

            <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">
                    2º monitor
                </label>
                <div className="flex items-center gap-2">
                    {monitor2Id ? (
                        <StaffAvatar
                            initials={selectedStaff(monitor2Id)?.initials || "?"}
                            color={selectedStaff(monitor2Id)?.color}
                            textColor={selectedStaff(monitor2Id)?.text_color}
                            size="sm"
                        />
                    ) : null}
                    <select
                        value={monitor2Id}
                        onChange={(e) => onMonitor2Change?.(e.target.value)}
                        className="min-w-0 flex-1 rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                        {renderOptions()}
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                    <input
                        type="checkbox"
                        checked={hasPhotographer}
                        onChange={(e) => onHasPhotographerChange?.(e.target.checked)}
                    />
                    ¿Fotógrafo?
                </label>
                {hasPhotographer ? (
                    <div className="flex items-center gap-2">
                        {photographerId ? (
                            <StaffAvatar
                                initials={selectedStaff(photographerId)?.initials || "?"}
                                color={selectedStaff(photographerId)?.color}
                                textColor={selectedStaff(photographerId)?.text_color}
                                size="sm"
                            />
                        ) : null}
                        <select
                            value={photographerId}
                            onChange={(e) => onPhotographerChange?.(e.target.value)}
                            className={`min-w-0 flex-1 rounded-xl border bg-gray-900 px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-2 ${
                                staffConflict
                                    ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/50"
                                    : "border-gray-600 focus:border-blue-500 focus:ring-blue-500/50"
                            }`}
                        >
                            {renderPhotographerOptions()}
                        </select>
                    </div>
                ) : null}
            </div>

            {staffConflict ? (
                <div
                    role="alert"
                    className="rounded-xl border border-rose-700 bg-rose-900/30 px-3 py-2 text-xs text-rose-200"
                >
                    {staffConflict}
                </div>
            ) : null}
        </div>
    );
}
