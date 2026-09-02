import React, { useMemo, useState } from "react";
import { Combobox } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";

/** Rango físico del asignador (mismas 200 plazas). */
export const PHYSICAL_LOCKER_MAX = 200;

const inputClass =
    "w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2.5 pr-10 text-sm font-semibold tabular-nums text-slate-100 placeholder:text-slate-500 transition focus:border-s4-cyan/50 focus:outline-none focus:ring-2 focus:ring-s4-cyan/20";

const optionsClass = `
    !z-[900] w-[var(--input-width)] !max-h-64 overflow-auto rounded-xl
    border border-white/10 bg-slate-900 p-1.5
    shadow-[0_20px_50px_rgba(0,0,0,0.75)] ring-1 ring-white/10
    focus:outline-none empty:invisible
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-950
    [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600
`;

function optionItemClass({ active, selected }) {
    return `cursor-pointer rounded-lg px-3 py-2.5 text-sm transition-colors ${
        active ? "bg-s4-cyan/20 text-cyan-50" : "text-slate-200"
    } ${selected ? "ring-1 ring-s4-cyan/40" : ""}`;
}

/**
 * @param {number[]} occupiedNumbers  Casilleros físicos ocupados (sin 500/600).
 * @param {number[]} sharedNumbers
 */
export function listAssignableLockerOptions(occupiedNumbers, sharedNumbers = []) {
    const shared = new Set([...sharedNumbers].map(Number).filter((n) => Number.isFinite(n) && n > 0));
    const occupied = new Set();
    for (const raw of occupiedNumbers) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0 && !shared.has(n)) {
            occupied.add(n);
        }
    }

    const free = [];
    for (let i = 1; i <= PHYSICAL_LOCKER_MAX; i += 1) {
        if (!occupied.has(i)) {
            free.push({
                n: i,
                kind: "free",
                title: `Taquilla #${i}`,
                subtitle: "Libre",
            });
        }
    }

    const sharedOpts = [...shared]
        .sort((a, b) => a - b)
        .map((n) => ({
            n,
            kind: "shared",
            title: `Taquilla #${n}`,
            subtitle: "Compartida (varios usuarios)",
        }));

    return [...free, ...sharedOpts];
}

export default function LockerNumberCombobox({
    value,
    onChange,
    options,
    disabled = false,
    id,
}) {
    const [query, setQuery] = useState("");

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter(
            (o) =>
                String(o.n).includes(q) ||
                o.title.toLowerCase().includes(q) ||
                o.subtitle.toLowerCase().includes(q),
        );
    }, [options, query]);

    const selected = useMemo(() => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 1) return null;
        return options.find((o) => o.n === n) ?? null;
    }, [options, value]);

    return (
        <Combobox
            value={selected}
            onChange={(opt) => {
                onChange(opt ? String(opt.n) : "");
                setQuery("");
            }}
            by={(a, b) => Number(a?.n) === Number(b?.n)}
            nullable
            disabled={disabled}
        >
            <div className="relative">
                <Combobox.Input
                    id={id}
                    className={inputClass}
                    onChange={(e) => setQuery(e.target.value)}
                    displayValue={(opt) => (opt ? opt.title : "")}
                    placeholder="Buscar n.º libre…"
                    autoComplete="off"
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200">
                    <ChevronsUpDown className="h-5 w-5" aria-hidden />
                </Combobox.Button>
                <Combobox.Options anchor="bottom start" className={optionsClass}>
                    {filtered.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-slate-500">Sin resultados</div>
                    ) : (
                        <>
                            <div className="sticky top-0 z-[1] bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                Disponibles
                            </div>
                            {filtered.map((opt) => (
                                <Combobox.Option
                                    key={`${opt.kind}-${opt.n}`}
                                    value={opt}
                                    className={optionItemClass}
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0 truncate font-semibold leading-snug">
                                            {opt.title}
                                            {opt.kind === "shared" ? (
                                                <span className="ml-1.5 text-xs font-medium text-violet-300/90">
                                                    · compartida
                                                </span>
                                            ) : null}
                                        </div>
                                        <Check
                                            className="h-4 w-4 shrink-0 text-emerald-400"
                                            aria-label={opt.kind === "shared" ? "Compartida" : "Libre"}
                                        />
                                    </div>
                                </Combobox.Option>
                            ))}
                        </>
                    )}
                </Combobox.Options>
            </div>
        </Combobox>
    );
}
