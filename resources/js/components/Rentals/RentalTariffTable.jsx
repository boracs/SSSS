import { Clock, CalendarDays } from "lucide-react";
import { packLabel } from "../../lib/rentalPricing";
import { formatRentalEurFromCents } from "../../lib/surfboardPublicDisplay";

/**
 * Tabla pública de tarifas (RentalTariffTableService → prop `tariffTable`).
 * Precios en céntimos: aquí solo se formatean, nunca se calculan.
 */
function TariffBlock({ title, icon: Icon, columns, rows }) {
    if (!columns.length) return null;

    return (
        <div className="min-w-0">
            <h3 className="flex items-center gap-2 font-heading text-sm font-semibold uppercase tracking-wide text-cyan-300">
                <Icon className="h-4 w-4" aria-hidden="true" />
                {title}
            </h3>

            <div className="mt-2 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/60">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="bg-slate-800/70">
                            <th
                                scope="col"
                                className="sticky left-0 z-10 bg-slate-800/95 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-300 backdrop-blur"
                            >
                                Categoría
                            </th>
                            {columns.map((column) => (
                                <th
                                    key={column}
                                    scope="col"
                                    className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide text-slate-300"
                                >
                                    {packLabel(column)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                        {rows.map((row) => (
                            <tr key={row.category} className="transition-colors hover:bg-slate-800/40">
                                <th
                                    scope="row"
                                    className="sticky left-0 z-10 bg-slate-900/95 px-4 py-3 font-heading text-[15px] font-semibold text-slate-100 backdrop-blur"
                                >
                                    {row.label}
                                </th>
                                {columns.map((column) => {
                                    const price = formatRentalEurFromCents(row.prices?.[column]);
                                    return (
                                        <td
                                            key={column}
                                            className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${
                                                price ? "font-semibold text-slate-100" : "text-slate-500"
                                            }`}
                                        >
                                            {price ?? "—"}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function RentalTariffTable({ tariffTable }) {
    const rows = tariffTable?.rows ?? [];
    if (!rows.length) return null;

    const hourColumns = tariffTable?.hour_columns ?? [];
    const dayColumns = tariffTable?.day_columns ?? [];
    const notes = tariffTable?.notes ?? [];

    return (
        <section
            aria-labelledby="rental-tariffs-heading"
            className="mb-6 rounded-3xl border border-slate-700 bg-slate-900/95 p-5 shadow-sm backdrop-blur sm:p-6"
        >
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <h2
                        id="rental-tariffs-heading"
                        className="font-heading text-2xl font-extrabold tracking-tight text-slate-100 sm:text-[28px]"
                    >
                        Tarifas de alquiler
                    </h2>
                    <p className="mt-1 text-sm text-slate-300">
                        Precios por tabla y duración. Se aplican a todas las tablas de cada categoría.
                    </p>
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Desliza la tabla para ver todas las duraciones
                </p>
            </div>

            <div className="mt-4 space-y-5">
                <TariffBlock title="Por horas" icon={Clock} columns={hourColumns} rows={rows} />
                <TariffBlock title="Por días" icon={CalendarDays} columns={dayColumns} rows={rows} />
            </div>

            {notes.length ? (
                <ul className="mt-5 space-y-1.5 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-400">
                    {notes.map((note) => (
                        <li key={note} className="flex gap-2">
                            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-cyan-400" aria-hidden="true" />
                            <span>{note}</span>
                        </li>
                    ))}
                </ul>
            ) : null}
        </section>
    );
}
