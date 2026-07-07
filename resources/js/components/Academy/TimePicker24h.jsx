import * as Popover from "@radix-ui/react-popover";
import { ClockIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { HOURS_24, QUARTER_MINUTES, parseTime24 } from "../../lib/quarterTime";

function scrollSelectedIntoView(container, selectedValue) {
    if (!container || !selectedValue) return;
    const el = container.querySelector(`[data-value="${selectedValue}"]`);
    el?.scrollIntoView({ block: "center" });
}

function Column({ items, value, onSelect, ariaLabel }) {
    const listRef = useRef(null);

    useEffect(() => {
        scrollSelectedIntoView(listRef.current, value);
    }, [value]);

    return (
        <div
            ref={listRef}
            role="listbox"
            aria-label={ariaLabel}
            className="max-h-44 w-12 overflow-y-auto overscroll-contain py-1 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600"
        >
            {items.map((item) => {
                const selected = item === value;
                return (
                    <button
                        key={item}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        data-value={item}
                        onClick={() => onSelect(item)}
                        className={`flex h-8 w-full items-center justify-center rounded-md text-sm font-semibold tabular-nums transition ${
                            selected
                                ? "bg-cyan-600 text-white shadow-sm"
                                : "text-gray-200 hover:bg-white/10"
                        }`}
                    >
                        {item}
                    </button>
                );
            })}
        </div>
    );
}

export default function TimePicker24h({
    value = "",
    onChange,
    className = "",
    required = false,
    disabled = false,
    id,
}) {
    const [open, setOpen] = useState(false);
    const parsed = parseTime24(value);
    const [hour, setHour] = useState(parsed.hour);
    const [minute, setMinute] = useState(parsed.minute);

    useEffect(() => {
        const next = parseTime24(value);
        setHour(next.hour);
        setMinute(next.minute);
    }, [value]);

    const emit = (h, m) => {
        const next = `${h}:${m}`;
        onChange?.(next);
    };

    const handleHour = (h) => {
        setHour(h);
        emit(h, minute);
    };

    const handleMinute = (m) => {
        setMinute(m);
        emit(hour, m);
        setOpen(false);
    };

    const display = value ? `${hour}:${minute}` : "—:—";

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button
                    type="button"
                    id={id}
                    disabled={disabled}
                    aria-required={required}
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className={`flex w-full items-center justify-between gap-2 rounded-xl border border-gray-600 bg-gray-900 px-3 py-2 text-left text-sm text-gray-100 transition focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
                >
                    <span className="font-semibold tabular-nums">{display}</span>
                    <ClockIcon className="h-5 w-5 shrink-0 text-gray-400" aria-hidden />
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content
                    side="bottom"
                    align="start"
                    sideOffset={4}
                    collisionPadding={12}
                    avoidCollisions
                    className="z-[1400] rounded-xl border border-white/10 bg-gray-800 p-2 shadow-2xl ring-1 ring-white/10 outline-none"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <p className="mb-2 px-1 text-center text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        24 h · intervalos 15 min
                    </p>
                    <div className="flex gap-1">
                        <Column
                            items={HOURS_24}
                            value={hour}
                            onSelect={handleHour}
                            ariaLabel="Hora"
                        />
                        <div className="flex items-center text-lg font-bold text-gray-500">:</div>
                        <Column
                            items={QUARTER_MINUTES}
                            value={minute}
                            onSelect={handleMinute}
                            ariaLabel="Minutos"
                        />
                    </div>
                    <Popover.Arrow className="fill-gray-800" width={12} height={6} />
                </Popover.Content>
            </Popover.Portal>
            {required && !value ? (
                <input type="text" required className="sr-only" tabIndex={-1} value="" readOnly onChange={() => {}} />
            ) : null}
        </Popover.Root>
    );
}
