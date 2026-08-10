import React from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";

/**
 * Tabla oscura estándar para paneles admin.
 * columns: [{ key, label, align?, sortable? }]. rows: array de objetos.
 * renderCell(row, column) opcional para celdas custom; por defecto usa row[column.key].
 * rowKey(row) opcional para la key de React; por defecto usa row.id.
 * Ordenación opcional: pasa sortKey/sortDir + onSortChange(key) y marca sortable:true en la columna.
 */
export default function AdminTable({
    columns = [],
    rows = [],
    renderCell,
    rowKey,
    emptyMessage = "Sin registros.",
    className = "",
    sortKey = null,
    sortDir = "asc",
    onSortChange,
}) {
    const alignClass = (align) =>
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";

    return (
        <div className={`overflow-auto rounded-2xl border border-white/10 ${className}`}>
            <table className="min-w-full text-sm">
                <thead className="bg-slate-800/60 text-slate-300">
                    <tr>
                        {columns.map((col) => {
                            const active = col.sortable && sortKey === col.key;
                            return (
                                <th
                                    key={col.key}
                                    className={`px-3 py-2 font-semibold ${alignClass(col.align)}`}
                                >
                                    {col.sortable ? (
                                        <button
                                            type="button"
                                            onClick={() => onSortChange?.(col.key)}
                                            className={`inline-flex items-center gap-1 whitespace-nowrap transition hover:text-white ${
                                                active ? "text-white" : ""
                                            }`}
                                        >
                                            {col.label}
                                            {active ? (
                                                sortDir === "asc" ? (
                                                    <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                                                ) : (
                                                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                                                )
                                            ) : (
                                                <ChevronsUpDown
                                                    className="h-3.5 w-3.5 text-slate-500"
                                                    aria-hidden
                                                />
                                            )}
                                        </button>
                                    ) : (
                                        col.label
                                    )}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 ? (
                        <tr>
                            <td
                                colSpan={columns.length || 1}
                                className="px-3 py-6 text-center text-slate-500"
                            >
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        rows.map((row, rowIndex) => (
                            <tr
                                key={rowKey ? rowKey(row) : row.id ?? rowIndex}
                                className="border-t border-white/5 text-slate-200 transition hover:bg-white/5"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.key}
                                        className={`px-3 py-2 ${alignClass(col.align)}`}
                                    >
                                        {renderCell ? renderCell(row, col) : row[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
