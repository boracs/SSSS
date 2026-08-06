import React, { useEffect, useMemo, useState } from "react";
import DatePicker, { registerLocale } from "react-datepicker";
import { es } from "date-fns/locale";
import { Loader2 } from "lucide-react";
import "react-datepicker/dist/react-datepicker.css";
import { priceForDayRange } from "../lib/rentalPricing";

registerLocale("es", es);

// ─────────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────────

function toDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

/** Devuelve 'YYYY-MM-DD' sin dependencias externas. */
function isoDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function clampIntervals(blockedRanges) {
    return (blockedRanges || [])
        .map((r) => {
            const start = toDate(r.start);
            const end = toDate(r.end);
            if (!start || !end) return null;
            return { start, end };
        })
        .filter(Boolean);
}

function buildDateStatusMap(blockedRanges) {
    const map = {};
    for (const r of blockedRanges || []) {
        const start = toDate(r.start);
        const end = toDate(r.end);
        if (!start || !end) continue;

        // Endpoint público: solo start/end/display_status, sin id ni status interno.
        const displayStatus = r.display_status || "pendiente";

        const cur = new Date(start);
        cur.setHours(0, 0, 0, 0);
        const endNorm = new Date(end);
        endNorm.setHours(23, 59, 59, 999);

        while (cur <= endNorm) {
            const key = isoDate(cur);
            if (!map[key] || map[key] === "pendiente") {
                map[key] = displayStatus;
            }
            cur.setDate(cur.getDate() + 1);
        }
    }
    return map;
}

/** tonos: dark (catálogo embedded) | light (ficha Show) */
const STATUS_DAY_CLASSES = {
    dark: {
        pendiente: "!bg-rose-500/25 !text-rose-200",
        ocupado: "!bg-rose-500/25 !text-rose-200",
    },
    light: {
        pendiente: "!bg-rose-100 !text-rose-700",
        ocupado: "!bg-rose-100 !text-rose-700",
    },
};

const calendarShellClass = {
    dark: `
        w-full
        [&_.react-datepicker]:!flex
        [&_.react-datepicker]:!w-full
        [&_.react-datepicker]:!justify-center
        [&_.react-datepicker]:border-0
        [&_.react-datepicker]:bg-transparent
        [&_.react-datepicker]:font-[inherit]
        [&_.react-datepicker__header]:border-0
        [&_.react-datepicker__header]:bg-transparent
        [&_.react-datepicker__current-month]:font-heading
        [&_.react-datepicker__current-month]:text-sm
        [&_.react-datepicker__current-month]:font-bold
        [&_.react-datepicker__current-month]:capitalize
        [&_.react-datepicker__current-month]:!text-slate-100
        [&_.react-datepicker__day-name]:!text-slate-500
        [&_.react-datepicker__day-name]:!w-[14.28%]
        [&_.react-datepicker__day-name]:!m-0
        [&_.react-datepicker__day]:!text-slate-100
        [&_.react-datepicker__day]:!w-[14.28%]
        [&_.react-datepicker__day]:!m-0
        [&_.react-datepicker__day]:leading-9
        [&_.react-datepicker__day]:rounded-lg
        [&_.react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--excluded):hover]:!bg-cyan-500/15
        [&_.react-datepicker__day:not(.react-datepicker__day--disabled):not(.react-datepicker__day--excluded):hover]:!text-cyan-50
        [&_.react-datepicker__day--outside-month]:!text-slate-600
        [&_.react-datepicker__day--keyboard-selected]:!bg-transparent
        [&_.react-datepicker__day--keyboard-selected]:!text-slate-100
        [&_.react-datepicker__day--selected]:!bg-cyan-600
        [&_.react-datepicker__day--selected]:!text-white
        [&_.react-datepicker__day--in-range]:!bg-cyan-500/25
        [&_.react-datepicker__day--in-range]:!text-cyan-50
        [&_.react-datepicker__day--in-selecting-range]:!bg-cyan-500/20
        [&_.react-datepicker__day--range-start]:!bg-cyan-600
        [&_.react-datepicker__day--range-start]:!text-white
        [&_.react-datepicker__day--range-end]:!bg-cyan-600
        [&_.react-datepicker__day--range-end]:!text-white
        [&_.react-datepicker__day--disabled]:!text-slate-600
        [&_.react-datepicker__day--disabled]:!opacity-45
        [&_.react-datepicker__day--disabled]:!cursor-not-allowed
        [&_.react-datepicker__day--excluded]:!text-slate-600
        [&_.react-datepicker__day--excluded]:!opacity-45
        [&_.react-datepicker__navigation-icon::before]:!border-slate-400
        [&_.react-datepicker__month-container]:!float-none
        [&_.react-datepicker__month-container]:!w-full
        [&_.react-datepicker__month]:!m-0
        [&_.react-datepicker__month]:!w-full
        [&_.react-datepicker__week]:!flex
        [&_.react-datepicker__week]:!w-full
        [&_.react-datepicker__day-names]:!flex
        [&_.react-datepicker__day-names]:!w-full
        [&_.react-datepicker__day-names]:mb-1
    `,
    light: `
        w-full
        [&_.react-datepicker]:!flex
        [&_.react-datepicker]:!w-full
        [&_.react-datepicker]:!justify-center
        [&_.react-datepicker]:border-0
        [&_.react-datepicker]:bg-transparent
        [&_.react-datepicker]:font-[inherit]
        [&_.react-datepicker__header]:border-0
        [&_.react-datepicker__header]:bg-transparent
        [&_.react-datepicker__current-month]:font-heading
        [&_.react-datepicker__current-month]:text-sm
        [&_.react-datepicker__current-month]:font-bold
        [&_.react-datepicker__current-month]:capitalize
        [&_.react-datepicker__current-month]:!text-slate-900
        [&_.react-datepicker__day-name]:!text-slate-500
        [&_.react-datepicker__day-name]:!w-[14.28%]
        [&_.react-datepicker__day-name]:!m-0
        [&_.react-datepicker__day]:!text-slate-800
        [&_.react-datepicker__day]:!w-[14.28%]
        [&_.react-datepicker__day]:!m-0
        [&_.react-datepicker__day]:leading-9
        [&_.react-datepicker__day]:rounded-lg
        [&_.react-datepicker__day--keyboard-selected]:!bg-transparent
        [&_.react-datepicker__day--selected]:!bg-cyan-600
        [&_.react-datepicker__day--selected]:!text-white
        [&_.react-datepicker__day--in-range]:!bg-cyan-500/15
        [&_.react-datepicker__day--in-range]:!text-s4
        [&_.react-datepicker__day--in-selecting-range]:!bg-cyan-500/10
        [&_.react-datepicker__day--range-start]:!bg-cyan-600
        [&_.react-datepicker__day--range-end]:!bg-cyan-600
        [&_.react-datepicker__day--disabled]:!text-slate-400
        [&_.react-datepicker__day--excluded]:!text-slate-400
        [&_.react-datepicker__month-container]:!float-none
        [&_.react-datepicker__month-container]:!w-full
        [&_.react-datepicker__month]:!m-0
        [&_.react-datepicker__month]:!w-full
        [&_.react-datepicker__week]:!flex
        [&_.react-datepicker__week]:!w-full
        [&_.react-datepicker__day-names]:!flex
        [&_.react-datepicker__day-names]:!w-full
        [&_.react-datepicker__day-names]:mb-1
    `,
};

/**
 * selectionMode="range": alquiler por días (12:00 → 12:00), con total estimado.
 * selectionMode="single": el cliente elige el día y la hora de recogida se
 * decide fuera (RentalHourPicker), así que aquí no se excluyen días completos.
 */
export default function BookingCalendar({
    blockedRanges = [],
    pricesByDuration = null,
    onRangeChange,
    initialStart = null,
    initialEnd = null,
    disabled = false,
    isChecking = false,
    tone = "light",
    selectionMode = "range",
    selectedDate = null,
    onDateChange,
    excludeBlockedDays = true,
    showTotal = true,
}) {
    const isRange = selectionMode !== "single";
    const [range, setRange] = useState([toDate(initialStart), toDate(initialEnd)]);
    const [startDate, endDate] = range;
    const palette = tone === "dark" ? "dark" : "light";
    const statusClasses = STATUS_DAY_CLASSES[palette];

    const intervals = useMemo(() => clampIntervals(blockedRanges), [blockedRanges]);

    const dateStatusMap = useMemo(() => buildDateStatusMap(blockedRanges), [blockedRanges]);

    /* El calendario selecciona días: ciclo 12:00 → 12:00, igual que el backend. */
    const totalPrice = useMemo(() => {
        if (!isRange || !pricesByDuration || !startDate || !endDate) return null;
        return priceForDayRange(pricesByDuration, startDate, endDate);
    }, [isRange, pricesByDuration, startDate, endDate]);

    useEffect(() => {
        if (!isRange) return;
        onRangeChange?.({ startDate, endDate, totalPrice });
    }, [isRange, startDate, endDate, totalPrice, onRangeChange]);

    return (
        <div className="space-y-3">
            {isChecking ? (
                <div
                    className={`flex items-center justify-center gap-2 text-xs ${
                        palette === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Verificando disponibilidad…
                </div>
            ) : null}

            <div className={`relative ${calendarShellClass[palette]}`}>
                <DatePicker
                    locale="es"
                    selectsRange={isRange}
                    selected={isRange ? undefined : toDate(selectedDate)}
                    startDate={isRange ? startDate : undefined}
                    endDate={isRange ? endDate : undefined}
                    onChange={(update) => (isRange ? setRange(update) : onDateChange?.(update))}
                    minDate={new Date()}
                    excludeDateIntervals={excludeBlockedDays ? intervals : undefined}
                    disabled={disabled}
                    inline
                    calendarStartDay={1}
                    dayClassName={(date) => {
                        if (!excludeBlockedDays) return "";
                        const s = dateStatusMap[isoDate(date)];
                        return statusClasses[s] ?? "";
                    }}
                />

                {disabled ? (
                    <div
                        className={`absolute inset-0 rounded-md backdrop-blur-[1px] ${
                            palette === "dark" ? "bg-slate-950/50" : "bg-white/60"
                        }`}
                    />
                ) : null}
            </div>

            {excludeBlockedDays ? (
                <div
                    className={`flex flex-wrap items-center justify-center gap-4 text-xs ${
                        palette === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Disponible
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        Ocupado
                    </span>
                </div>
            ) : null}

            {showTotal && totalPrice != null ? (
                <div
                    className={`rounded-xl p-3 text-sm ring-1 ring-inset ${
                        palette === "dark"
                            ? "border border-white/10 bg-slate-950/60 ring-white/5"
                            : "border border-slate-200 bg-white ring-slate-100"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={palette === "dark" ? "text-slate-400" : "text-slate-700"}>
                            Total estimado
                        </span>
                        <span
                            className={`font-heading font-semibold tabular-nums ${
                                palette === "dark" ? "text-cyan-300" : "text-s4"
                            }`}
                        >
                            {totalPrice.toFixed(2).replace(".", ",")} €
                        </span>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
