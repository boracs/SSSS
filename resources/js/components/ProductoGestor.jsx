import React from "react";
import { FaTag } from "react-icons/fa";
import { IoCloseCircle } from "react-icons/io5";

const ProductoGestor = ({ producto, productoSeleccionadoId, onClick }) => {
    const isSelected = productoSeleccionadoId === producto.id;
    const isLowStock = producto.unidades < 5;
    const isDeleted = producto.eliminado === 1 || producto.eliminado === true;
    const descuento = Number(producto.descuento || 0);

    return (
        <button
            type="button"
            onClick={() => onClick(producto)}
            aria-expanded={isSelected}
            className={`group relative flex h-full w-full flex-col overflow-hidden rounded-lg border text-left shadow-sm transition-all duration-200 lg:rounded-xl lg:p-2.5 lg:shadow-md ${
                isSelected
                    ? "border-cyan-500 ring-2 ring-cyan-400/40"
                    : "border-slate-200/90 hover:border-slate-300"
            } ${isLowStock && !isDeleted ? "bg-red-50/90" : "bg-white"} p-1.5 sm:p-2`}
        >
            {isDeleted ? (
                <>
                    <div className="absolute inset-0 z-10 rounded-lg bg-slate-600/25" />
                    <span className="absolute left-0 top-0 z-20 flex w-full items-center justify-center gap-0.5 bg-red-700 py-0.5 text-[8px] font-bold text-white lg:text-[10px]">
                        <IoCloseCircle size={10} />
                        INACTIVO
                    </span>
                </>
            ) : null}

            {isLowStock && !isDeleted ? (
                <span className="absolute right-1 top-1 z-10 rounded bg-red-500 px-1 py-px text-[7px] font-bold text-white lg:text-[9px]">
                    BAJO
                </span>
            ) : null}

            <div className="relative mb-1 aspect-[4/3] w-full overflow-hidden rounded-md bg-slate-100 sm:mb-1.5 lg:mb-2 lg:aspect-auto lg:h-20 xl:h-24">
                <img
                    src={producto.imagen_principal || "/img/placeholder.svg"}
                    alt={producto.nombre}
                    className={`h-full w-full object-cover ${isDeleted ? "opacity-40" : "opacity-95"}`}
                    loading="lazy"
                />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-0.5">
                <p className="line-clamp-2 text-[10px] font-bold leading-tight text-slate-900 sm:text-xs lg:text-sm">
                    {producto.nombre}
                </p>

                <p className="text-xs font-bold tabular-nums text-emerald-600 sm:text-sm lg:text-lg">
                    {Number(producto.precio).toFixed(2)} €
                </p>

                {(producto.tag_labels || []).length > 0 ? (
                    <p className="mb-1 flex flex-wrap justify-center gap-0.5">
                        {producto.tag_labels.slice(0, 2).map((label) => (
                            <span
                                key={label}
                                className="rounded bg-slate-100 px-1 py-px text-[8px] font-semibold text-slate-600 sm:text-[9px]"
                            >
                                {label}
                            </span>
                        ))}
                    </p>
                ) : null}

                <div className="mt-auto flex items-center justify-between gap-1 border-t border-slate-100 pt-1 text-[9px] text-slate-600 sm:text-[10px]">
                    <span className="font-medium text-slate-500">
                        Stock <span className="font-bold text-slate-800">{producto.unidades}</span>
                    </span>
                    {descuento > 0 ? (
                        <span className="inline-flex items-center gap-0.5 font-bold text-rose-500">
                            <FaTag size={8} aria-hidden />
                            -{descuento}%
                        </span>
                    ) : null}
                </div>
            </div>
        </button>
    );
};

export default ProductoGestor;
