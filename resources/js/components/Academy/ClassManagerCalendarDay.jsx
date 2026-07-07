import { PlusIcon } from "@heroicons/react/24/outline";
import ClassCalendarPill from "./ClassCalendarPill";

const WEEKDAY_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function weekdayLabel(iso) {
    const parts = String(iso || "").split("-").map((n) => Number(n));
    if (parts.length < 3) return "";
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 12, 0, 0));
    return WEEKDAY_SHORT[d.getUTCDay()] || "";
}

export function ClassManagerCalendarDay({
    cell,
    isPast,
    isTodayCell,
    isSelectedDay,
    canCreateHere,
    visibleEntries,
    isPastEntry,
    onSelectDay,
    onCreate,
    onEdit,
    onDelete,
    onAddGuest,
    onEditGuest,
    onRequestPaymentChange,
    onRemoveGuest,
    onApproveQuota,
    onDenyQuota,
    layout = "grid",
}) {
    const isList = layout === "list";

    const shellClass = isList
        ? [
            "relative flex min-h-[3.5rem] gap-1.5 rounded-xl border p-1.5 text-left transition-all sm:min-h-[3.75rem]",
            !cell.current
                ? "border-gray-800/60 bg-gray-900/50 opacity-40"
                : isPast
                    ? "cursor-pointer border-gray-800 bg-gray-900/85 opacity-50"
                    : "cursor-pointer border-gray-800 bg-gray-900 hover:border-white/10",
            isSelectedDay ? "ring-2 ring-cyan-400" : "",
            isTodayCell && cell.current ? "ring-2 ring-inset ring-blue-500/80" : "",
        ].join(" ")
        : [
            "group relative flex min-h-[5.25rem] flex-col rounded-xl border p-1 text-left transition-all duration-200",
            !cell.current
                ? "min-h-[5rem] border-gray-800 bg-gray-900/70 opacity-45"
                : isPast
                    ? "cursor-pointer border-gray-800 bg-gray-900/85 text-gray-500 opacity-40 bg-stripes-subtle"
                    : "cursor-pointer border-gray-800 bg-gray-900 hover:bg-white/[0.02] hover:border-white/10",
            isSelectedDay ? "ring-2 ring-cyan-400" : "",
            isTodayCell && cell.current ? "ring-2 ring-inset ring-blue-500" : "",
        ].join(" ");

    const handleClick = () => {
        if (cell.current) onSelectDay?.(cell.iso);
    };

    const pills = visibleEntries.map((entry) => (
        <ClassCalendarPill
            key={entry.id}
            entry={entry}
            isPastEntry={isPastEntry(entry)}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddGuest={onAddGuest}
            onEditGuest={onEditGuest}
            onRequestPaymentChange={onRequestPaymentChange}
            onRemoveGuest={onRemoveGuest}
            onApproveQuota={onApproveQuota}
            onDenyQuota={onDenyQuota}
        />
    ));

    if (isList) {
        return (
            <div
                onClick={handleClick}
                onKeyDown={(e) => {
                    if (!cell.current) return;
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    handleClick();
                }}
                role={cell.current ? "button" : "group"}
                tabIndex={cell.current ? 0 : -1}
                className={shellClass}
            >
                <div className="flex w-[3.25rem] shrink-0 flex-col items-center justify-start border-r border-white/5 pr-2 pt-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                        {weekdayLabel(cell.iso)}
                    </span>
                    <span
                        className={`mt-0.5 text-lg font-extrabold leading-none ${
                            isPast ? "text-gray-500" : "text-white"
                        }`}
                    >
                        {cell.dayNumber}
                    </span>
                    {isTodayCell && cell.current ? (
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
                    ) : null}
                    {canCreateHere ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectDay?.(cell.iso);
                                onCreate?.(cell.iso);
                            }}
                            className="mt-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/60 transition hover:bg-cyan-500"
                            title="Crear clase"
                            aria-label={`Crear clase el ${cell.iso}`}
                        >
                            <PlusIcon className="h-4 w-4 stroke-[2.5]" aria-hidden />
                        </button>
                    ) : null}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    {isPast && cell.current ? (
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">Pasado</span>
                    ) : null}
                    {pills.length > 0 ? pills : (
                        <span className="text-[11px] text-gray-600">Sin clases</span>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={handleClick}
            onKeyDown={(e) => {
                if (!cell.current) return;
                if (e.key !== "Enter" && e.key !== " ") return;
                e.preventDefault();
                handleClick();
            }}
            role={cell.current ? "button" : "group"}
            tabIndex={cell.current ? 0 : -1}
            title={isPast ? "Día pasado" : undefined}
            className={shellClass}
        >
            <div className="mb-1 flex shrink-0 items-start justify-between gap-1">
                <span
                    className={`rounded px-1 text-[11px] font-semibold ${
                        isPast ? "text-gray-500" : "text-gray-200"
                    }`}
                >
                    {cell.dayNumber}
                </span>
                <div className="flex items-center gap-1">
                    {isTodayCell && cell.current ? (
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />
                    ) : null}
                    {canCreateHere ? (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectDay?.(cell.iso);
                                onCreate?.(cell.iso);
                            }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-600 text-white shadow-md shadow-cyan-950/40 ring-1 ring-cyan-400/60 transition hover:scale-105 hover:bg-cyan-500"
                            title="Crear clase"
                            aria-label={`Crear clase el ${cell.iso}`}
                        >
                            <PlusIcon className="h-4 w-4 stroke-[2.5]" aria-hidden />
                        </button>
                    ) : null}
                </div>
            </div>
            {isPast && cell.current ? (
                <span className="pointer-events-none mb-1 text-[9px] font-semibold uppercase tracking-wide text-gray-500">
                    Pasado
                </span>
            ) : null}
            <div className="flex flex-1 flex-col gap-0.5">
                {pills}
            </div>
        </div>
    );
}

export default ClassManagerCalendarDay;
