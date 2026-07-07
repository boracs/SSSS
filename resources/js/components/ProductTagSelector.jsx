import React from "react";

const ProductTagSelector = ({
    options = [],
    selected = [],
    onChange,
    compact = false,
    twoColumns = false,
    idPrefix = "product-tag",
}) => {
    const toggle = (value) => {
        const next = selected.includes(value)
            ? selected.filter((tag) => tag !== value)
            : [...selected, value];
        onChange(next);
    };

    if (!options.length) {
        return (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-800">
                No hay categorías disponibles. Recarga la página.
            </p>
        );
    }

    return (
        <fieldset className={compact ? "space-y-1.5" : "space-y-2"}>
            <legend className={`font-semibold text-slate-800 ${compact ? "text-xs" : "text-sm"}`}>
                Categorías / tags
                {selected.length > 0 ? (
                    <span className="ml-1.5 font-normal text-cyan-700">({selected.length})</span>
                ) : null}
            </legend>
            <div
                className={`grid gap-1 ${
                    twoColumns || !compact
                        ? "grid-cols-2"
                        : "grid-cols-1"
                }`}
            >
                {options.map((option) => {
                    const inputId = `${idPrefix}-${option.value}`;
                    const checked = selected.includes(option.value);

                    return (
                        <label
                            key={option.value}
                            htmlFor={inputId}
                            className={`flex cursor-pointer items-center gap-1.5 rounded-md border transition ${
                                checked
                                    ? "border-cyan-500 bg-cyan-50"
                                    : "border-slate-200 bg-white hover:border-slate-300"
                            } ${compact ? "px-1.5 py-1" : "px-2 py-1.5"}`}
                        >
                            <input
                                id={inputId}
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggle(option.value)}
                                className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                            />
                            <span
                                className={`leading-tight font-medium text-slate-800 ${
                                    compact ? "text-[10px]" : "text-xs"
                                }`}
                            >
                                {option.label}
                            </span>
                        </label>
                    );
                })}
            </div>
        </fieldset>
    );
};

export default ProductTagSelector;
