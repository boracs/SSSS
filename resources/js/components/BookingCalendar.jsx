import React, { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function toDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
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

function calculateBestPriceJs(pricesByDuration, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalHours = Math.ceil((end.getTime() - start.getTime()) / 3600000);
    if (!Number.isFinite(totalHours) || totalHours <= 0) return 0;

    const durations = [1, 2, 4, 12, 24, 48, 72, 168];
    const minCost = new Array(totalHours + 1).fill(0);

    for (let h = 1; h <= totalHours; h++) {
        const p1 = Number(pricesByDuration?.[1] ?? pricesByDuration?.["1"] ?? 0);
        minCost[h] = h * (p1 || 0);
        for (const dur of durations) {
            const price = Number(pricesByDuration?.[dur] ?? pricesByDuration?.[String(dur)] ?? 0);
            if (dur <= h && price > 0) {
                const candidate = price + minCost[h - dur];
                if (candidate < minCost[h]) minCost[h] = candidate;
            }
        }
    }

    return Math.round(minCost[totalHours] * 100) / 100;
}

export default function BookingCalendar({
    blockedRanges = [],
    pricesByDuration = null,
    onRangeChange,
    initialStart = null,
    initialEnd = null,
    disabled = false,
    isChecking = false,
}) {
    const [range, setRange] = useState([toDate(initialStart), toDate(initialEnd)]);
    const [startDate, endDate] = range;

    const intervals = useMemo(() => clampIntervals(blockedRanges), [blockedRanges]);

    const totalPrice = useMemo(() => {
        if (!pricesByDuration || !startDate || !endDate) return null;
        return calculateBestPriceJs(pricesByDuration, startDate, endDate);
    }, [pricesByDuration, startDate, endDate]);

    useEffect(() => {
        onRangeChange?.({
            startDate,
            endDate,
            totalPrice,
        });
    }, [startDate, endDate, totalPrice, onRangeChange]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">
                    Selecciona fechas
                </div>
                {isChecking ? (
                    <div className="text-xs text-slate-600">Verificando disponibilidad…</div>
                ) : null}
            </div>

            <div className="relative">
                <DatePicker
                    selectsRange
                    startDate={startDate}
                    endDate={endDate}
                    onChange={(update) => setRange(update)}
                    minDate={new Date()}
                    excludeDateIntervals={intervals}
                    disabled={disabled}
                    inline
                />

                {disabled ? (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] rounded-md" />
                ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    Disponible
                </span>
                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                    Ocupado
                </span>
                <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                    Pendiente (bloquea)
                </span>
            </div>

            {totalPrice != null ? (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-700">Total estimado</span>
                        <span className="font-semibold text-slate-900">
                            {totalPrice.toFixed(2).replace(".", ",")} €
                        </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                        Cálculo cliente sincronizado con el esquema de precios del backend.
                    </div>
                </div>
            ) : null}
        </div>
    );
}

