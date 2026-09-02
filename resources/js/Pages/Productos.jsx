import PageShell from "@/layouts/PageShell";
import { router } from "@inertiajs/react";
import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { ArrowDown, ArrowUpDown } from "lucide-react";
import { toast } from "react-toastify";
import ProductoGestor from "../components/ProductoGestor";
import ProductoEditModal from "../components/ProductoEditModal";
import ProductoCreateModal from "../components/ProductoCreateModal";
import { showInertiaErrors } from "../lib/inertiaErrors";

const SORT_OPTIONS = [
    { value: "nombre", label: "Nombre (A–Z)" },
    { value: "descuento_desc", label: "Mayor descuento" },
    { value: "descuento_asc", label: "Menor descuento" },
];

const emptyForm = {
    nombre: "",
    precio: "",
    unidades: "",
    descuento: "",
    imagenes: [],
    imagenes_ids: [],
    tags: [],
};

function snapshotForm(data) {
    return JSON.stringify({
        nombre: data.nombre,
        precio: String(data.precio),
        unidades: String(data.unidades),
        descuento: String(data.descuento ?? ""),
        tags: [...(data.tags || [])].sort(),
        hasNewImages: data.imagenes?.[0] instanceof File,
    });
}

export default function Productos({
    productos: productosIniciales,
    productTagOptions = [],
    openCreateModal = false,
}) {
    const [productos, setProductos] = useState(productosIniciales);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const [formData, setFormData] = useState(emptyForm);
    const [cargandoPanel, setCargandoPanel] = useState(false);
    const [formSnapshot, setFormSnapshot] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [createOpen, setCreateOpen] = useState(openCreateModal);
    const [creando, setCreando] = useState(false);
    const [tagActivo, setTagActivo] = useState("all");
    const [orden, setOrden] = useState("nombre");
    const closeAfterSaveRef = useRef(false);

    useEffect(() => {
        setProductos(productosIniciales);
    }, [productosIniciales]);

    useEffect(() => {
        if (openCreateModal) {
            setCreateOpen(true);
        }
    }, [openCreateModal]);

    const productosFiltrados = useMemo(() => {
        const base = [...productos].filter((producto) => {
            if (tagActivo === "all") return true;
            return (producto.tags || []).includes(tagActivo);
        });

        return base.sort((a, b) => {
            if (orden === "descuento_desc" || orden === "descuento_asc") {
                const descA = Number(a.descuento || 0);
                const descB = Number(b.descuento || 0);
                if (descA !== descB) {
                    return orden === "descuento_desc" ? descB - descA : descA - descB;
                }
            }

            const nameA = String(a.nombre || "").toLowerCase();
            const nameB = String(b.nombre || "").toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return Number(a.id) - Number(b.id);
        });
    }, [productos, tagActivo, orden]);

    const isDirty = formSnapshot !== null && snapshotForm(formData) !== formSnapshot;

    const cargarProductoEnPanel = async (producto) => {
        setCargandoPanel(true);

        try {
            const res = await fetch(`/productos/${producto.id}/imagenes`);
            const data = await res.json();

            const imagenPrincipal = data.imagenes[0]?.url || null;
            const imagenesSecundarias = data.imagenes.slice(1).map((i) => i.url);

            const nextForm = {
                nombre: producto.nombre,
                precio: producto.precio,
                unidades: producto.unidades,
                descuento: producto.descuento ?? "",
                imagenes: imagenPrincipal
                    ? [imagenPrincipal, ...imagenesSecundarias]
                    : imagenesSecundarias,
                imagenes_ids: data.imagenes.map((i) => i.id),
                tags: producto.tags || [],
            };

            setFormData(nextForm);
            setFormSnapshot(snapshotForm(nextForm));
        } catch (error) {
            console.error("Error cargando imágenes:", error);
            const fallback = {
                nombre: producto.nombre,
                precio: producto.precio,
                unidades: producto.unidades,
                descuento: producto.descuento ?? "",
                imagenes: [],
                imagenes_ids: [],
                tags: producto.tags || [],
            };
            setFormData(fallback);
            setFormSnapshot(snapshotForm(fallback));
        } finally {
            setCargandoPanel(false);
        }
    };

    const handleClosePanel = useCallback(() => {
        setProductoSeleccionado(null);
        setFormData(emptyForm);
        setFormSnapshot(null);
        closeAfterSaveRef.current = false;
    }, []);

    const handleRequestClose = useCallback(() => {
        if (isDirty && !window.confirm("¿Cerrar sin guardar los cambios?")) {
            return;
        }
        handleClosePanel();
    }, [isDirty, handleClosePanel]);

    const handleProductoOpen = async (producto) => {
        setProductoSeleccionado(producto);
        await cargarProductoEnPanel(producto);
    };

    const handleSetMainImage = async (img, idx) => {
        if (!productoSeleccionado || idx === 0) return;

        try {
            await fetch(`/productos/${productoSeleccionado.id}/imagen-principal`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
                },
                body: JSON.stringify({ imagen_id: formData.imagenes_ids[idx] }),
            });

            const nuevasImagenes = [img, ...formData.imagenes.filter((_, iIdx) => iIdx !== idx)];
            const nuevosIds = [
                formData.imagenes_ids[idx],
                ...formData.imagenes_ids.filter((_, iIdx) => iIdx !== idx),
            ];

            setFormData((prev) => ({
                ...prev,
                imagenes: nuevasImagenes,
                imagenes_ids: nuevosIds,
            }));

            setProductos((prev) =>
                prev.map((p) =>
                    p.id === productoSeleccionado.id
                        ? {
                              ...p,
                              imagen_principal:
                                  img instanceof File
                                      ? productoSeleccionado.imagen_principal
                                      : img,
                          }
                        : p
                )
            );
        } catch (error) {
            console.error("Error actualizando la imagen principal", error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleTagsChange = (tags) => {
        setFormData((prev) => ({ ...prev, tags }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        setFormData((prev) => ({ ...prev, imagenes: files, imagenes_ids: [] }));
    };

    const handleEliminar = () => {
        if (!productoSeleccionado) return;

        router.put(route("producto.eliminar", { id: productoSeleccionado.id }), {}, {
            onSuccess: () => {
                const nuevoEstado = productoSeleccionado.eliminado ? 0 : 1;

                setProductoSeleccionado((prev) => (prev ? { ...prev, eliminado: nuevoEstado } : prev));
                setProductos((prev) =>
                    prev.map((p) =>
                        p.id === productoSeleccionado.id ? { ...p, eliminado: nuevoEstado } : p
                    )
                );
            },
            onError: (errors) => showInertiaErrors(errors, toast, "No se pudo cambiar el estado del producto."),
        });
    };

    const persistProducto = () => {
        if (!productoSeleccionado) return;

        if (!formData.nombre || formData.precio === "" || formData.unidades === "") {
            toast.error("Por favor, rellena todos los campos requeridos.");
            return;
        }

        const formDataToSend = new FormData();
        formDataToSend.append("nombre", formData.nombre);
        formDataToSend.append("precio", formData.precio);
        formDataToSend.append("unidades", formData.unidades);
        formDataToSend.append("descuento", formData.descuento || 0);

        (formData.tags || []).forEach((tag) => {
            formDataToSend.append("tags[]", tag);
        });

        if (formData.imagenes?.length > 0 && formData.imagenes[0] instanceof File) {
            formData.imagenes.forEach((file) => {
                formDataToSend.append("imagenes[]", file);
            });
        }

        setGuardando(true);

        router.post(route("producto.edit", { id: productoSeleccionado.id }), formDataToSend, {
            forceFormData: true,
            preserveState: true,
            onSuccess: () => {
                const tagLabels = (formData.tags || [])
                    .map((slug) => productTagOptions.find((o) => o.value === slug)?.label)
                    .filter(Boolean);

                setProductos((prev) =>
                    prev.map((p) =>
                        p.id === productoSeleccionado.id
                            ? {
                                  ...p,
                                  nombre: formData.nombre,
                                  precio: formData.precio,
                                  unidades: formData.unidades,
                                  descuento: formData.descuento,
                                  tags: formData.tags || [],
                                  tag_labels: tagLabels,
                              }
                            : p
                    )
                );

                if (closeAfterSaveRef.current) {
                    handleClosePanel();
                } else {
                    setProductoSeleccionado((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  nombre: formData.nombre,
                                  tags: formData.tags || [],
                                  tag_labels: tagLabels,
                              }
                            : prev
                    );
                    setFormSnapshot(snapshotForm(formData));
                }
            },
            onError: (errors) => showInertiaErrors(errors, toast, "No se pudo actualizar el producto."),
            onFinish: () => {
                setGuardando(false);
                closeAfterSaveRef.current = false;
            },
        });
    };

    const handleModificar = (event) => {
        event.preventDefault();
        persistProducto();
    };

    const handleSaveAndClose = (event) => {
        event.preventDefault();
        closeAfterSaveRef.current = true;
        persistProducto();
    };

    const handleCloseCreate = useCallback(() => {
        setCreateOpen(false);

        if (window.location.search.includes("create")) {
            router.get(route("mostrar.productos"), {}, { preserveState: true, preserveScroll: true, replace: true });
        }
    }, []);

    const handleCreateSubmit = (data) => {
        const formDataToSend = new FormData();
        formDataToSend.append("nombre", data.nombre);
        formDataToSend.append("precio", data.precio);
        formDataToSend.append("unidades", data.unidades);
        formDataToSend.append("descuento", data.descuento || 0);
        formDataToSend.append("eliminado", data.eliminado ? "1" : "0");

        (data.tags || []).forEach((tag) => {
            formDataToSend.append("tags[]", tag);
        });

        data.imagenes.forEach((file) => {
            formDataToSend.append("imagenes[]", file);
        });

        setCreando(true);

        router.post(route("producto.create"), formDataToSend, {
            forceFormData: true,
            onSuccess: () => {
                setCreateOpen(false);
                toast.success("Producto creado correctamente.");
            },
            onError: (errors) => showInertiaErrors(errors, toast, "No se pudo crear el producto."),
            onFinish: () => setCreando(false),
        });
    };

    const getImageUrl = (img) => (img instanceof File ? URL.createObjectURL(img) : img);

    const editorProps = productoSeleccionado
        ? {
              producto: productoSeleccionado,
              formData,
              productTagOptions,
              onChange: handleChange,
              onTagsChange: handleTagsChange,
              onFileChange: handleFileChange,
              onSubmit: handleModificar,
              onToggleActive: handleEliminar,
              onSetMainImage: handleSetMainImage,
              getImageUrl,
          }
        : null;

    return (
        <PageShell variant="light">
            <div className="bg-[#111826] p-2 sm:p-4">
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2 lg:mb-3">
                    <div>
                        <h2 className="text-base font-semibold text-gray-100 sm:text-xl">Productos</h2>
                        <p className="text-[9px] text-slate-400 sm:text-xs">Toca para editar</p>
                    </div>
                    <label className="flex items-center gap-1.5 text-slate-400">
                        <span className="sr-only">Ordenar productos</span>
                        {orden.startsWith("descuento") ? (
                            <ArrowDown className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
                        ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        )}
                        <select
                            value={orden}
                            onChange={(e) => setOrden(e.target.value)}
                            aria-label="Ordenar productos"
                            className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-slate-200 outline-none transition focus:border-cyan-400/50 sm:text-xs"
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-slate-900 text-slate-100">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>

                {productTagOptions.length > 0 ? (
                    <div
                        className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mb-4 sm:flex-wrap sm:overflow-visible"
                        role="group"
                        aria-label="Filtrar por categoría"
                    >
                        <button
                            type="button"
                            onClick={() => setTagActivo("all")}
                            aria-pressed={tagActivo === "all"}
                            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition sm:text-xs ${
                                tagActivo === "all"
                                    ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                            }`}
                        >
                            Todos
                        </button>
                        {productTagOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setTagActivo(option.value)}
                                aria-pressed={tagActivo === option.value}
                                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition sm:text-xs ${
                                    tagActivo === option.value
                                        ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-200"
                                        : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(132px,1fr))] lg:gap-3 xl:grid-cols-[repeat(auto-fill,minmax(148px,1fr))]">
                    {productosFiltrados.map((producto) => (
                        <ProductoGestor
                            key={producto.id}
                            producto={producto}
                            productoSeleccionadoId={productoSeleccionado?.id}
                            onClick={handleProductoOpen}
                        />
                    ))}
                </div>

                {productosFiltrados.length === 0 ? (
                    <p className="mt-6 text-center text-sm text-slate-400">
                        No hay productos en esta categoría.
                    </p>
                ) : null}

                <div className="mt-5 flex justify-center py-3 lg:mt-8 lg:py-4">
                    <button
                        type="button"
                        className="rounded-lg bg-emerald-600 px-6 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:px-12 sm:py-2.5 sm:text-sm"
                        onClick={() => setCreateOpen(true)}
                    >
                        Crear producto
                    </button>
                </div>
            </div>

            <ProductoCreateModal
                open={createOpen}
                productTagOptions={productTagOptions}
                onClose={handleCloseCreate}
                onSubmit={handleCreateSubmit}
                submitting={creando}
            />

            <ProductoEditModal
                open={Boolean(productoSeleccionado)}
                producto={productoSeleccionado}
                formData={formData}
                cargando={cargandoPanel || guardando}
                editorProps={editorProps}
                onCloseWithoutSave={handleRequestClose}
                onSaveAndClose={handleSaveAndClose}
            />
        </PageShell>
    );
}
