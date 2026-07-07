import React, { useEffect, useMemo, useState } from "react";
import { ImagePlus, PackagePlus, X } from "lucide-react";
import ProductTagSelector from "./ProductTagSelector";

const inputClass =
    "mt-0.5 block w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20";

const emptyCreateForm = {
    nombre: "",
    precio: "",
    unidades: "",
    descuento: "",
    imagenes: [],
    tags: [],
    eliminado: false,
};

function snapshotCreate(data) {
    return JSON.stringify({
        nombre: data.nombre,
        precio: String(data.precio),
        unidades: String(data.unidades),
        descuento: String(data.descuento ?? ""),
        tags: [...(data.tags || [])].sort(),
        eliminado: Boolean(data.eliminado),
        imageCount: data.imagenes?.length ?? 0,
    });
}

const ProductoCreateModal = ({
    open,
    productTagOptions = [],
    onClose,
    onSubmit,
    submitting = false,
}) => {
    const [formData, setFormData] = useState(emptyCreateForm);
    const [initialSnapshot, setInitialSnapshot] = useState(snapshotCreate(emptyCreateForm));

    useEffect(() => {
        if (!open) return undefined;

        document.body.style.overflow = "hidden";

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onClose]);

    useEffect(() => {
        if (open) {
            setFormData(emptyCreateForm);
            setInitialSnapshot(snapshotCreate(emptyCreateForm));
        }
    }, [open]);

    const isDirty = useMemo(
        () => snapshotCreate(formData) !== initialSnapshot,
        [formData, initialSnapshot]
    );

    const handleClose = () => {
        if (isDirty && !window.confirm("¿Cerrar sin crear el producto?")) {
            return;
        }
        onClose();
    };

    const handleChange = (event) => {
        const { name, value, type, checked } = event.target;
        setFormData((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleImages = (event) => {
        const files = Array.from(event.target.files || []);
        setFormData((prev) => ({ ...prev, imagenes: files }));
    };

    const handleCreate = (event) => {
        event.preventDefault();
        if (!formData.nombre || formData.precio === "" || formData.unidades === "") {
            alert("Completa nombre, precio y unidades.");
            return;
        }
        onSubmit(formData);
    };

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="producto-create-modal-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
                aria-label="Cerrar"
                onClick={handleClose}
            />

            <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-cyan-500/20 bg-white shadow-2xl shadow-cyan-950/20 sm:max-h-[88vh] sm:rounded-2xl">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-gradient-to-r from-emerald-50/80 to-cyan-50/50 px-3 py-2.5 sm:px-4">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm">
                            <PackagePlus className="h-4 w-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                                Nuevo producto
                            </p>
                            <h2
                                id="producto-create-modal-title"
                                className="truncate text-base font-bold text-slate-900"
                            >
                                Crear en tienda S4
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        aria-label="Cerrar"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form
                    id="producto-create-form"
                    onSubmit={handleCreate}
                    className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-2 sm:space-y-2.5 sm:px-4 sm:py-3"
                >
                    <div>
                        <label htmlFor="create-nombre" className="block text-xs font-medium text-slate-700">
                            Nombre
                        </label>
                        <input
                            id="create-nombre"
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className={inputClass}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label htmlFor="create-precio" className="block text-xs font-medium text-slate-700">
                                Precio (€)
                            </label>
                            <input
                                id="create-precio"
                                type="number"
                                name="precio"
                                min="0"
                                step="0.01"
                                value={formData.precio}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="create-unidades" className="block text-xs font-medium text-slate-700">
                                Stock
                            </label>
                            <input
                                id="create-unidades"
                                type="number"
                                name="unidades"
                                min="0"
                                step="1"
                                value={formData.unidades}
                                onChange={handleChange}
                                className={inputClass}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="create-descuento" className="block text-xs font-medium text-slate-700">
                            Descuento (%)
                        </label>
                        <input
                            id="create-descuento"
                            type="number"
                            name="descuento"
                            min="0"
                            max="100"
                            step="0.01"
                            value={formData.descuento}
                            onChange={handleChange}
                            className={inputClass}
                        />
                    </div>

                    <ProductTagSelector
                        options={productTagOptions}
                        selected={formData.tags}
                        onChange={(tags) => setFormData((prev) => ({ ...prev, tags }))}
                        compact
                        twoColumns
                        idPrefix="create-modal-tag"
                    />

                    <div>
                        <label htmlFor="create-imagenes" className="block text-xs font-medium text-slate-700">
                            Imágenes
                        </label>
                        <label
                            htmlFor="create-imagenes"
                            className="mt-0.5 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5 text-center transition hover:border-cyan-400/50 hover:bg-cyan-50/50"
                        >
                            <ImagePlus className="h-4 w-4 text-slate-400" aria-hidden />
                            <span className="text-[11px] text-slate-600">
                                {formData.imagenes.length > 0
                                    ? `${formData.imagenes.length} imagen(es) seleccionada(s)`
                                    : "Subir imágenes (opcional)"}
                            </span>
                        </label>
                        <input
                            id="create-imagenes"
                            type="file"
                            name="imagenes"
                            multiple
                            accept="image/*"
                            onChange={handleImages}
                            className="sr-only"
                        />
                        {formData.imagenes.length > 0 ? (
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {formData.imagenes.map((file, index) => (
                                    <img
                                        key={`${file.name}-${index}`}
                                        src={URL.createObjectURL(file)}
                                        alt=""
                                        className="h-12 w-12 rounded-md object-cover ring-1 ring-slate-200"
                                    />
                                ))}
                            </div>
                        ) : null}
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
                        <input
                            type="checkbox"
                            name="eliminado"
                            checked={formData.eliminado}
                            onChange={handleChange}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                        />
                        <span className="text-xs text-slate-700">Crear como inactivo (no visible en tienda)</span>
                    </label>
                </form>

                <div className="flex shrink-0 flex-col gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5">
                    <button
                        type="button"
                        disabled={submitting}
                        onClick={handleClose}
                        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 sm:flex-1 sm:text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="producto-create-form"
                        disabled={submitting}
                        className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50 sm:flex-1 sm:text-sm"
                    >
                        {submitting ? "Creando…" : "Crear producto"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProductoCreateModal;
