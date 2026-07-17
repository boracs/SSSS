import Layout1 from "../layouts/Layout1";
import { router } from "@inertiajs/react";
import React, { useRef, useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "react-toastify";
import ProductoGestor from "../components/ProductoGestor";
import ProductoEditModal from "../components/ProductoEditModal";
import ProductoCreateModal from "../components/ProductoCreateModal";
import { showInertiaErrors } from "../lib/inertiaErrors";

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
    const closeAfterSaveRef = useRef(false);

    useEffect(() => {
        setProductos(productosIniciales);
    }, [productosIniciales]);

    useEffect(() => {
        if (openCreateModal) {
            setCreateOpen(true);
        }
    }, [openCreateModal]);

    const productosOrdenados = useMemo(
        () => [...productos].sort((a, b) => a.nombre.localeCompare(b.nombre)),
        [productos]
    );

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
        <Layout1>
            <div className="bg-[#111826] p-2 sm:p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5 lg:mb-3">
                    <h2 className="text-base font-semibold text-gray-100 sm:text-xl">Productos</h2>
                    <p className="text-[9px] text-slate-400 sm:text-xs">Toca para editar</p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(132px,1fr))] lg:gap-3 xl:grid-cols-[repeat(auto-fill,minmax(148px,1fr))]">
                    {productosOrdenados.map((producto) => (
                        <ProductoGestor
                            key={producto.id}
                            producto={producto}
                            productoSeleccionadoId={productoSeleccionado?.id}
                            onClick={handleProductoOpen}
                        />
                    ))}
                </div>

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
        </Layout1>
    );
}
