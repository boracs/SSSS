import React, { useEffect } from "react";
import { X } from "lucide-react";
import ProductoEditorPanel from "./ProductoEditorPanel";

const ProductoEditModal = ({
    open,
    producto,
    formData,
    cargando,
    editorProps,
    onCloseWithoutSave,
    onSaveAndClose,
    formId = "producto-edit-form",
}) => {
    useEffect(() => {
        if (!open) return undefined;

        document.body.style.overflow = "hidden";

        const onKeyDown = (event) => {
            if (event.key === "Escape") {
                onCloseWithoutSave();
            }
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [open, onCloseWithoutSave]);

    if (!open || !producto) return null;

    return (
        <div
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="producto-edit-modal-title"
        >
            <button
                type="button"
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
                aria-label="Cerrar editor"
                onClick={onCloseWithoutSave}
            />

            <div className="relative flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-2xl">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-3 py-2 sm:px-4 sm:py-2.5">
                    <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                            Editar producto
                        </p>
                        <h2
                            id="producto-edit-modal-title"
                            className="truncate text-base font-bold text-slate-900"
                        >
                            {producto.nombre}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={onCloseWithoutSave}
                        aria-label="Cerrar sin guardar"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-4 sm:py-3">
                    {cargando || !editorProps ? (
                        <div className="py-12 text-center text-sm text-slate-500">
                            Cargando ficha…
                        </div>
                    ) : (
                        <ProductoEditorPanel
                            {...editorProps}
                            embedded
                            formId={formId}
                            showSubmitButton={false}
                            imageInputId={`modal-image-${producto.id}`}
                        />
                    )}
                </div>

                {!cargando && editorProps ? (
                    <div className="flex shrink-0 flex-col gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:gap-2 sm:px-4 sm:py-2.5">
                        <button
                            type="button"
                            disabled={cargando}
                            onClick={onCloseWithoutSave}
                            className="w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50 sm:flex-1 sm:text-sm"
                        >
                            Cerrar sin guardar
                        </button>
                        <button
                            type="button"
                            disabled={cargando}
                            onClick={onSaveAndClose}
                            className="w-full rounded-lg bg-cyan-700 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-cyan-800 disabled:opacity-50 sm:flex-1 sm:text-sm"
                        >
                            {cargando ? "Guardando…" : "Guardar y cerrar"}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ProductoEditModal;
