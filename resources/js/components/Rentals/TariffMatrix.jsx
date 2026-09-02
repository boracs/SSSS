import { useId, useState } from "react";
import { packLabel } from "../../lib/rentalPricing";

/** Columna ancla: preferible 1 día → primera day → ~2h → media de horas. */
export function resolveAnchorColumn(hourColumns, dayColumns) {
    if (dayColumns.includes("price_1d")) return "price_1d";
    if (dayColumns.length) return dayColumns[0];
    if (hourColumns.includes("price_120m")) return "price_120m";
    if (!hourColumns.length) return null;
    return hourColumns[Math.floor(hourColumns.length / 2)];
}

/** Default turista: días si existen; si no, horas. */
export function defaultTariffTab(hourColumns, dayColumns) {
    if (dayColumns.length) return "days";
    return "hours";
}

/** Activo = cyan S4; inactivo según superficie. */
const TAB_BTN_BASE =
    "rounded-lg px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-s4-cyan/60 focus-visible:ring-offset-2";
const TAB_ACTIVE = "bg-cyan-600 text-white shadow-sm";

/**
 * Matriz de tarifas compartida (tablas multi-fila + neopreno 1 fila).
 * Un solo patrón en todos los breakpoints: tabs Horas | Días.
 *
 * @param {object} props
 * @param {string[]} props.hourColumns
 * @param {string[]} props.dayColumns
 * @param {Array<{ key: string, labelCell: import('react').ReactNode, prices: Record<string, unknown>, highlight?: boolean }>} props.rows
 * @param {(raw: unknown) => string|null} props.formatPrice
 * @param {string|null} [props.anchorColumn]
 * @param {string} [props.firstColumnHeader]
 * @param {string} [props.tablistLabel]
 * @param {string} [props.caption]
 */
export default function TariffMatrix({
    hourColumns,
    dayColumns,
    rows,
    formatPrice,
    anchorColumn = null,
    firstColumnHeader = "Categoría",
    tablistLabel = "Tipo de tarifa",
    caption = null,
    tone = "light",
}) {
    const isDark = tone === "dark";
    const tabBtn = `${TAB_BTN_BASE} ${isDark ? "focus-visible:ring-offset-slate-900" : "focus-visible:ring-offset-white"}`;
    const tabIdle = isDark
        ? "text-slate-400 hover:bg-slate-800/70 hover:text-slate-200"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
    const tabShell = isDark
        ? "mb-2.5 inline-flex rounded-xl border border-slate-700 bg-slate-950/50 p-0.5"
        : "mb-2.5 inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5";
    const tableShell = isDark
        ? "max-h-[min(70vh,36rem)] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900/60 sm:overflow-auto"
        : "max-h-[min(70vh,36rem)] overflow-x-auto overflow-y-auto rounded-2xl border border-slate-200 bg-white sm:overflow-auto";
    const headCell = isDark
        ? "sticky left-0 top-0 z-30 w-[4.5rem] overflow-hidden bg-slate-800/95 px-1 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400 backdrop-blur sm:w-auto sm:px-3 sm:py-2 sm:text-[10px]"
        : "sticky left-0 top-0 z-30 w-[4.5rem] overflow-hidden bg-slate-50 px-1 py-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 backdrop-blur sm:w-auto sm:px-3 sm:py-2 sm:text-[10px]";
    const colHead = isDark ? "text-slate-400" : "text-slate-500";
    const colHeadBg = (isAnchor) =>
        isDark
            ? isAnchor
                ? "bg-cyan-950/80"
                : "bg-slate-800/95"
            : isAnchor
              ? "bg-cyan-50"
              : "bg-slate-50";
    const rowHover = isDark ? "hover:bg-slate-800/70" : "hover:bg-slate-50";
    const rowSticky = isDark
        ? "sticky left-0 z-10 w-[4.5rem] max-w-[4.5rem] overflow-hidden bg-slate-900/95 px-1 py-1.5 font-heading backdrop-blur sm:w-auto sm:max-w-none sm:px-3 sm:py-2 sm:text-[15px]"
        : "sticky left-0 z-10 w-[4.5rem] max-w-[4.5rem] overflow-hidden bg-white px-1 py-1.5 font-heading backdrop-blur sm:w-auto sm:max-w-none sm:px-3 sm:py-2 sm:text-[15px]";
    const priceText = isDark ? "font-semibold text-slate-100" : "font-semibold text-slate-900";
    const emptyPrice = isDark ? "text-slate-500" : "text-slate-400";
    const divider = isDark ? "divide-slate-800" : "divide-slate-200";
    const hasHours = hourColumns.length > 0;
    const hasDays = dayColumns.length > 0;
    if (!hasHours && !hasDays) return null;
    if (!rows.length) return null;

    const tabsId = useId();
    const [tab, setTab] = useState(() => defaultTariffTab(hourColumns, dayColumns));

    const activeColumns = tab === "hours" ? hourColumns : dayColumns;
    if (!activeColumns.length) return null;

    const hoursPanelId = `${tabsId}-hours`;
    const daysPanelId = `${tabsId}-days`;

    return (
        <div>
            {hasHours && hasDays ? (
                <div
                    className={tabShell}
                    role="tablist"
                    aria-label={tablistLabel}
                >
                    <button
                        type="button"
                        role="tab"
                        id={`${tabsId}-tab-hours`}
                        aria-controls={hoursPanelId}
                        aria-selected={tab === "hours"}
                        tabIndex={tab === "hours" ? 0 : -1}
                        onClick={() => setTab("hours")}
                        className={`${tabBtn} ${tab === "hours" ? TAB_ACTIVE : tabIdle}`}
                    >
                        Por horas
                    </button>
                    <button
                        type="button"
                        role="tab"
                        id={`${tabsId}-tab-days`}
                        aria-controls={daysPanelId}
                        aria-selected={tab === "days"}
                        tabIndex={tab === "days" ? 0 : -1}
                        onClick={() => setTab("days")}
                        className={`${tabBtn} ${tab === "days" ? TAB_ACTIVE : tabIdle}`}
                    >
                        Por días
                    </button>
                </div>
            ) : (
                <p className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${colHead}`}>
                    {hasHours ? "Por horas" : "Por días"}
                </p>
            )}

            <div
                id={tab === "hours" ? hoursPanelId : daysPanelId}
                role="tabpanel"
                aria-labelledby={
                    hasHours && hasDays
                        ? `${tabsId}-tab-${tab === "hours" ? "hours" : "days"}`
                        : undefined
                }
                className={tableShell}
            >
                {/* En móvil: tabla al 100% + 1ª col estrecha (labels en 2 líneas) para caber packs sin scroll. */}
                <table className="w-full table-fixed border-collapse text-left text-sm sm:table-auto">
                    {caption ? (
                        <caption className="sr-only">{caption}</caption>
                    ) : null}
                    <thead>
                        <tr>
                            <th
                                scope="col"
                                className={headCell}
                            >
                                {firstColumnHeader}
                            </th>
                            {activeColumns.map((column) => {
                                const isAnchor = column === anchorColumn;
                                return (
                                    <th
                                        key={column}
                                        scope="col"
                                        className={`sticky top-0 z-20 px-1 py-1.5 text-right text-[9px] font-bold uppercase leading-tight tracking-wide backdrop-blur sm:whitespace-nowrap sm:px-3 sm:py-2 sm:text-[10px] ${colHead} ${colHeadBg(isAnchor)}`}
                                    >
                                        {packLabel(column)}
                                        {isAnchor ? (
                                            <span
                                                className={`mt-0.5 block text-[8px] font-semibold normal-case tracking-normal sm:text-[9px] ${
                                                    isDark ? "text-cyan-300/80" : "text-cyan-700"
                                                }`}
                                            >
                                                Habitual
                                            </span>
                                        ) : null}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${divider}`}>
                        {rows.map((row) => (
                            <tr
                                key={row.key}
                                className={`transition-colors ${rowHover} ${
                                    row.highlight ? "bg-amber-500/[0.05]" : ""
                                }`}
                            >
                                <th
                                    scope="row"
                                    className={`${rowSticky} ${row.highlight ? (isDark ? "bg-slate-900/98" : "bg-amber-50/40") : ""}`}
                                >
                                    {row.labelCell}
                                </th>
                                {activeColumns.map((column) => {
                                    const price = formatPrice(row.prices?.[column]);
                                    const isAnchor = column === anchorColumn;
                                    return (
                                        <td
                                            key={column}
                                            className={`px-1 py-1.5 text-right text-[13px] tabular-nums sm:whitespace-nowrap sm:px-3 sm:py-2 sm:text-sm ${
                                                isAnchor ? "bg-cyan-500/[0.06]" : ""
                                            } ${price ? priceText : emptyPrice}`}
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
