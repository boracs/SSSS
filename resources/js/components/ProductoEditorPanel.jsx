import React from "react";
import { ImagePlus, Star } from "lucide-react";
import ProductTagSelector from "./ProductTagSelector";

const inputClass =
    "mt-0.5 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const inputClassDense =
    "mt-0.5 block w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30";

const ProductoEditorPanel = ({
    producto,
    formData,
    productTagOptions,
    onChange,
    onTagsChange,
    onFileChange,
    onSubmit,
    onToggleActive,
    onSetMainImage,
    getImageUrl,
    embedded = false,
    formId,
    showSubmitButton = true,
    imageInputId = "product-image-input",
}) => {
    if (!producto) return null;

    const isDeleted = producto.eliminado === 1 || producto.eliminado === true;
    const fieldClass = embedded ? inputClassDense : inputClass;
    const gap = embedded ? "space-y-2" : "space-y-3";

    return (
        <div className={embedded ? "" : "rounded-xl border border-slate-200/80 bg-white p-4 shadow-lg"}>
            {!embedded ? (
                <div className="mb-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Editar producto
                    </p>
                    <h3 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                        {producto.nombre}
                    </h3>
                </div>
            ) : null}

            {Array.isArray(formData.imagenes) && formData.imagenes.length > 0 ? (
                <div className={embedded ? "mb-2" : "mb-4"}>
                    <div className={`flex gap-2 ${embedded ? "items-center" : "flex-col items-center"}`}>
                        <img
                            src={getImageUrl(formData.imagenes[0])}
                            alt={producto.nombre}
                            className={
                                embedded
                                    ? "h-16 w-16 shrink-0 rounded-lg object-cover"
                                    : "h-36 w-36 rounded-xl object-cover shadow-sm sm:h-44 sm:w-44"
                            }
                        />
                        {formData.imagenes.length > 1 ? (
                            <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto pb-0.5">
                                {formData.imagenes.map((img, index) => (
                                    <button
                                        key={`${index}-${getImageUrl(img)}`}
                                        type="button"
                                        onClick={() => onSetMainImage(img, index)}
                                        className={`relative shrink-0 overflow-hidden rounded-md border transition ${
                                            index === 0
                                                ? "border-cyan-500 ring-1 ring-cyan-400/40"
                                                : "border-slate-200 opacity-75 hover:opacity-100"
                                        }`}
                                        aria-label={`Imagen ${index + 1}${index === 0 ? ", principal" : ""}`}
                                    >
                                        <img
                                            src={getImageUrl(img)}
                                            alt=""
                                            className={embedded ? "h-10 w-10 object-cover" : "h-14 w-14 object-cover"}
                                        />
                                        {index === 0 && !embedded ? (
                                            <span className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-0.5 bg-cyan-600/90 py-0.5 text-[8px] font-bold text-white">
                                                <Star className="h-2.5 w-2.5" />
                                                Principal
                                            </span>
                                        ) : null}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                    </div>
                    {!embedded && formData.imagenes.length > 1 ? (
                        <p className="mt-2 text-center text-[10px] text-slate-500">
                            Toca una miniatura para marcarla como principal
                        </p>
                    ) : null}
                </div>
            ) : null}

            <form id={formId} className={gap} onSubmit={onSubmit}>
                <div>
                    <label htmlFor={`${imageInputId}-nombre`} className="block text-xs font-medium text-slate-700">
                        Nombre
                    </label>
                    <input
                        id={`${imageInputId}-nombre`}
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={onChange}
                        className={fieldClass}
                        required
                    />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label htmlFor={`${imageInputId}-precio`} className="block text-xs font-medium text-slate-700">
                            Precio (€)
                        </label>
                        <input
                            id={`${imageInputId}-precio`}
                            type="number"
                            name="precio"
                            min="0"
                            step="0.01"
                            value={formData.precio}
                            onChange={onChange}
                            className={fieldClass}
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor={`${imageInputId}-unidades`} className="block text-xs font-medium text-slate-700">
                            Stock
                        </label>
                        <input
                            id={`${imageInputId}-unidades`}
                            type="number"
                            name="unidades"
                            min="0"
                            step="1"
                            value={formData.unidades}
                            onChange={onChange}
                            className={fieldClass}
                            required
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor={`${imageInputId}-descuento`} className="block text-xs font-medium text-slate-700">
                        Descuento (%)
                    </label>
                    <input
                        id={`${imageInputId}-descuento`}
                        type="number"
                        name="descuento"
                        min="0"
                        max="100"
                        step="0.01"
                        value={formData.descuento}
                        onChange={onChange}
                        className={fieldClass}
                    />
                </div>

                <ProductTagSelector
                    options={productTagOptions}
                    selected={formData.tags || []}
                    onChange={onTagsChange}
                    compact={embedded}
                    twoColumns={embedded}
                    idPrefix={`${imageInputId}-tag`}
                />

                <div>
                    <label htmlFor={imageInputId} className="block text-xs font-medium text-slate-700">
                        Imágenes
                    </label>
                    <label
                        htmlFor={imageInputId}
                        className={`mt-0.5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 text-center transition hover:border-cyan-400/50 hover:bg-cyan-50/50 ${
                            embedded ? "px-3 py-2.5" : "flex-col gap-2 px-4 py-5"
                        }`}
                    >
                        <ImagePlus className={`text-slate-400 ${embedded ? "h-4 w-4" : "h-5 w-5"}`} />
                        <span className={embedded ? "text-[11px] text-slate-600" : "text-xs text-slate-600"}>
                            {embedded ? "Cambiar imágenes (opcional)" : "Sustituir imágenes (opcional)"}
                        </span>
                    </label>
                    <input
                        id={imageInputId}
                        type="file"
                        name="imagenes"
                        onChange={onFileChange}
                        accept="image/*"
                        multiple
                        className="sr-only"
                    />
                </div>

                <button
                    type="button"
                    className={`w-full rounded-lg text-sm font-semibold text-white transition ${
                        embedded ? "py-2 text-xs" : "py-2.5"
                    } ${isDeleted ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}`}
                    onClick={onToggleActive}
                >
                    {isDeleted ? "Activar producto" : "Desactivar producto"}
                </button>

                {showSubmitButton ? (
                    <button
                        type="submit"
                        className="w-full rounded-lg bg-cyan-700 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-cyan-800"
                    >
                        Guardar cambios
                    </button>
                ) : null}
            </form>
        </div>
    );
};

export default ProductoEditorPanel;
