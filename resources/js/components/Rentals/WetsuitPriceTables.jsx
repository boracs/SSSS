import { formatTariffEur } from "../../lib/surfboardPublicDisplay";
import TariffMatrix from "./TariffMatrix";

/**
 * Precios orientativos de neopreno: no vienen de PriceSchema (no hay stock
 * limitado que gestionar, se alquila en el momento en el local). Referencia
 * ~25% más barata que Softboards. Si cambia la política de precios, ajustar
 * aquí a mano — es solo informativo, nunca se cobra a través de esta tabla.
 * Fuente única: reutilizado tanto en el popup (WetsuitTariffModal) como
 * inline en la página de tarifas (RentalTariffTable).
 */
export const WETSUIT_HOUR_PRICES = {
    price_60m: 7,
    price_90m: 10,
    price_120m: 12,
    price_180m: 15,
    price_240m: 18,
    price_360m: 22,
};

export const WETSUIT_DAY_PRICES = {
    price_1d: 25,
    price_2d: 45,
    price_3d: 60,
    price_4d: 70,
    price_5d: 80,
    price_week: 100,
};

/**
 * Bloque de precios de neopreno (Por horas + Por días), reutilizable inline
 * o dentro de un popup. El neopreno no se reserva: solo es información de
 * referencia, se alquila al momento en el local.
 */
export default function WetsuitPriceTables({ className = "" }) {
    const hourColumns = Object.keys(WETSUIT_HOUR_PRICES);
    const dayColumns = Object.keys(WETSUIT_DAY_PRICES);
    const prices = { ...WETSUIT_HOUR_PRICES, ...WETSUIT_DAY_PRICES };

    return (
        <div className={className}>
            <TariffMatrix
                hourColumns={hourColumns}
                dayColumns={dayColumns}
                formatPrice={formatTariffEur}
                firstColumnHeader="Artículo"
                tablistLabel="Tipo de tarifa de neopreno"
                caption="Tarifas orientativas de alquiler de neopreno"
                rows={[
                    {
                        key: "wetsuit",
                        prices,
                        labelCell: (
                            <span className="block min-w-0 text-[11px] font-semibold leading-tight tracking-tight text-slate-100 sm:text-sm sm:tracking-normal">
                                Neopreno
                            </span>
                        ),

                    },
                ]}
            />
        </div>
    );
}
