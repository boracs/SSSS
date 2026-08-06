import { ArrowDown, Shirt } from "lucide-react";
import { formatTariffEurFromCents } from "../../lib/surfboardPublicDisplay";
import { boardCategoryAccent } from "../../lib/surfboardCategories";
import TariffMatrix, { resolveAnchorColumn } from "./TariffMatrix";
import WetsuitPriceTables from "./WetsuitPriceTables";

/**
 * En móvil: texto más pequeño + 2 líneas si el nombre tiene espacio.
 * Preferible a ellipsis: se lee Softboards / Hard boards completo.
 */
function CategoryCell({ row }) {
    const accent = boardCategoryAccent(row.category);
    const parts = String(row.label ?? "").trim().split(/\s+/);
    const wrapsOnMobile = parts.length >= 2;

    return (
        <span className="flex min-w-0 max-w-full items-start gap-1" title={row.label}>
            <span
                className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full sm:mt-1.5 sm:h-2 sm:w-2 ${accent.dot}`}
                aria-hidden="true"
            />
            <span className="min-w-0 flex-1 text-[11px] font-semibold leading-[1.15] tracking-tight text-slate-100 sm:text-sm sm:leading-snug sm:tracking-normal">
                {wrapsOnMobile ? (
                    <>
                        <span className="sm:hidden">
                            {parts[0]}
                            <br />
                            {parts.slice(1).join(" ")}
                        </span>
                        <span className="hidden sm:inline">{row.label}</span>
                    </>
                ) : (
                    row.label
                )}
            </span>
        </span>
    );
}

/** Ancla del catálogo de tablas en Rentals/Surfboards/Index.jsx. */
const CATALOG_ANCHOR_ID = "catalogo-tablas";

/**
 * Tabla pública de tarifas (RentalTariffTableService → prop `tariffTable`).
 * Precios en céntimos: aquí solo se formatean, nunca se calculan.
 */
export default function RentalTariffTable({ tariffTable }) {
    const rows = tariffTable?.rows ?? [];
    if (!rows.length) return null;

    const hourColumns = tariffTable?.hour_columns ?? [];
    const dayColumns = tariffTable?.day_columns ?? [];
    const notes = tariffTable?.notes ?? [];
    const anchorColumn = resolveAnchorColumn(hourColumns, dayColumns);
    const trustLine = notes[0] ?? null;

    const matrixRows = rows.map((row) => ({
        key: row.category,
        highlight: row.category === "hard_basic",
        prices: row.prices ?? {},
        labelCell: <CategoryCell row={row} />,
    }));

    const scrollToCatalog = (event) => {
        event.preventDefault();
        document.getElementById(CATALOG_ANCHOR_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <section
            aria-labelledby="rental-tariffs-heading"
            className="mb-6 rounded-3xl border border-slate-700 bg-slate-900/95 p-5 shadow-sm backdrop-blur sm:p-6"
        >
            <header>
                <h2
                    id="rental-tariffs-heading"
                    className="font-heading text-2xl font-extrabold tracking-tight text-slate-100 sm:text-[28px]"
                >
                    Tarifas de alquiler
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-400">
                    Compara Softboards, Hard boards y Premium boards. El total exacto se confirma al
                    elegir fechas en la reserva.
                </p>
            </header>

            <div className="mt-5">
                <TariffMatrix
                    hourColumns={hourColumns}
                    dayColumns={dayColumns}
                    rows={matrixRows}
                    formatPrice={formatTariffEurFromCents}
                    anchorColumn={anchorColumn}
                    firstColumnHeader="Categoría"
                    tablistLabel="Tipo de tarifa de tablas"
                    caption="Tarifas de alquiler de tablas Softboards, Hard boards y Premium boards"
                />
            </div>

            {trustLine ? (
                <p className="mt-2.5 text-xs text-slate-500">{trustLine}</p>
            ) : null}

            {/* Neopreno: bloque aparte — no es stock limitado ni requiere reserva. */}
            <div className="mt-6 border-t border-slate-800 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                    <Shirt className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <h3 className="font-heading text-base font-bold text-slate-100">Neopreno</h3>
                </div>
                <p className="mt-1 text-sm text-slate-400">
                    No hace falta reservarlo: se alquila al momento, al recoger la tabla en el local.
                </p>
                <WetsuitPriceTables className="mt-3" />
            </div>

            {notes.length > 1 ? (
                <ul className="mt-5 space-y-1.5 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-500">
                    {notes.slice(1).map((note) => (
                        <li key={note} className="flex gap-2">
                            <span
                                className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-slate-600"
                                aria-hidden="true"
                            />
                            <span>{note}</span>
                        </li>
                    ))}
                </ul>
            ) : null}

            <div className="mt-5 flex justify-center border-t border-slate-800 pt-5">
                <a
                    href={`#${CATALOG_ANCHOR_ID}`}
                    onClick={scrollToCatalog}
                    className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                >
                    Ver tablas disponibles
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </a>
            </div>
        </section>
    );
}
