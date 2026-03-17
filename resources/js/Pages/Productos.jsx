import Layout1 from "../layouts/Layout1";
import { Link, router } from "@inertiajs/react";
import React, { useRef, useState, useEffect } from "react";
import ProductoGestor from "../components/ProductoGestor";

export default function Productos({ productos: productosIniciales }) {
    // Renombramos la prop 'productos' que viene del backend como 'productosIniciales' Esto evita conflictos de nombres con el estado interno que vamos a crear.
    const [productos, setProductos] = useState(productosIniciales);
    const [productoSeleccionado, setProductoSeleccionado] = useState(null);
    const contenedorDerechoRef = useRef(null);

    // ✅ Estado del formulario: 'imagenes' se usará para almacenar *URLs* (para mostrar) O *Archivos File* (para subir).
    const [formData, setFormData] = useState({
        nombre: "",
        precio: "",
        unidades: "",
        descuento: "",
        imagenes: [], // Contiene URLs (al cargar) o objetos File (al seleccionar nuevos archivos)
        imagenes_ids: [],
    });

    // Carga inicial y reset de estado
    useEffect(() => {
        if (productos.length > 0 && !productoSeleccionado) {
            const p = productos[0];
            // No cargamos las imágenes aquí, esperamos a handleProductoClick para cargar las URLs
            setProductoSeleccionado(p);
            setFormData({
                nombre: p.nombre,
                precio: p.precio,
                unidades: p.unidades,
                descuento: p.descuento,
                imagenes: [], // Inicialmente vacío
                imagenes_ids: [], // Inicialmente vacío
            });
            handleProductoClick(p); // Llama a la carga de imágenes para el primer producto
        }
    }, [productos, productoSeleccionado]);

    //cargo el modal de la derecha o lo acutalzioa al clicar en unn producto
    const handleProductoClick = async (producto) => {
        setProductoSeleccionado(producto);

        try {
            const res = await fetch(`/productos/${producto.id}/imagenes`);
            const data = await res.json();

            const imagenPrincipal = data.imagenes[0]?.url || null;
            const imagenesSecundarias = data.imagenes
                .slice(1)
                .map((i) => i.url);

            setFormData({
                nombre: producto.nombre,
                precio: producto.precio,
                unidades: producto.unidades,
                descuento: producto.descuento,
                // **IMPORTANTE:** Aquí cargamos las URLs (cadenas de texto)
                imagenes: imagenPrincipal
                    ? [imagenPrincipal, ...imagenesSecundarias]
                    : imagenesSecundarias,
                imagenes_ids: data.imagenes.map((i) => i.id), // para el doble click
            });
        } catch (error) {
            console.error("Error cargando imágenes:", error);
        }
    };

    const handleDoubleClick = async (img, idx) => {
        if (!productoSeleccionado) return;

        try {
            // ... (Tu lógica para enviar la petición POST a la base de datos)
            await fetch(
                `/productos/${productoSeleccionado.id}/imagen-principal`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "X-CSRF-TOKEN": document.querySelector(
                            'meta[name="csrf-token"]'
                        ).content,
                    },
                    body: JSON.stringify({
                        imagen_id: formData.imagenes_ids[idx],
                    }),
                }
            );

            // 1. Actualizamos el modal (reordenamos el array de URLs/Files)
            const nuevasImagenes = [
                img,
                ...formData.imagenes.filter((_, iIdx) => iIdx !== idx),
            ];

            // Reordenamos también los IDs
            const nuevosIds = [
                formData.imagenes_ids[idx],
                ...formData.imagenes_ids.filter((_, iIdx) => iIdx !== idx),
            ];

            setFormData((prev) => ({
                ...prev,
                imagenes: nuevasImagenes,
                imagenes_ids: nuevosIds, // Actualizamos los IDs
            }));

            // 2. Actualizamos el listado de productos (la izquierda)
            setProductos((prev) =>
                prev.map((p) =>
                    p.id === productoSeleccionado.id
                        ? {
                              ...p,
                              imagen_principal:
                                  // Si 'img' es un File, usamos la URL anterior (ya que no cambia en la DB, solo en la lista).
                                  // Si es URL (cadena), la usamos.
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

    // Maneja el cambio en los campos del formulario
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    // 🚩 FUNCIÓN MODIFICADA: Ahora reemplaza las URLs por los objetos File
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        // Al seleccionar archivos, sobrescribimos 'imagenes' con los objetos File.
        // Esto garantiza que solo se enviarán archivos nuevos al backend.
        setFormData((prev) => ({
            ...prev,
            imagenes: files,
        }));
    };

    const handleEliminar = () => {
        if (!productoSeleccionado) return;

        router.put(
            route("producto.eliminar", { id: productoSeleccionado.id }),
            {},
            {
                onSuccess: () => {
                    // Actualizamos el estado local de 'productoSeleccionado' y 'productos'
                    const nuevoEstado = productoSeleccionado.eliminado ? 0 : 1;

                    setProductoSeleccionado((prev) => ({
                        ...prev,
                        eliminado: nuevoEstado,
                    }));

                    setProductos((prev) =>
                        prev.map((p) =>
                            p.id === productoSeleccionado.id
                                ? { ...p, eliminado: nuevoEstado }
                                : p
                        )
                    );
                },
                onError: (errors) => {
                    console.error(
                        "Error al cambiar el estado del producto:",
                        errors
                    );
                },
            }
        );
    };

    // 🚀 FUNCIÓN MODIFICADA: Lógica para enviar solo los archivos si existen y son objetos File
    const handleModificar = async (event) => {
        event.preventDefault();

        if (!productoSeleccionado) {
            alert("Selecciona un producto para modificar.");
            return;
        }

        if (!formData.nombre || !formData.precio || !formData.unidades) {
            alert("Por favor, rellena todos los campos requeridos.");
            return;
        }

        const formDataToSend = new FormData();

        formDataToSend.append("nombre", formData.nombre);
        formDataToSend.append("precio", formData.precio);
        formDataToSend.append("unidades", formData.unidades);
        formDataToSend.append("descuento", formData.descuento || 0);

        // 🎯 LÓGICA CLAVE: Solo enviamos 'imagenes[]' si contienen objetos File.
        // Si no hay imágenes seleccionadas, 'formData.imagenes' contendrá URLs (cadenas),
        // por lo que no entrará en el 'if' y el campo no se enviará.
        if (formData.imagenes && formData.imagenes.length > 0) {
            // Comprobamos si el primer elemento es un objeto File (nuevo archivo subido).
            if (formData.imagenes[0] instanceof File) {
                console.log("Se enviarán nuevas imágenes (objetos File).");
                formData.imagenes.forEach((file) => {
                    formDataToSend.append("imagenes[]", file);
                });
            } else {
                // Si no es un File, asumimos que son URLs de las imágenes existentes.
                // En este caso, NO añadimos el campo 'imagenes[]' al FormData,
                // y el backend entenderá que debe mantener las imágenes existentes.
                console.log(
                    "No se seleccionaron archivos nuevos (solo URLs). Se mantendrán las imágenes existentes."
                );
            }
        } else {
            // Si el array está vacío, tampoco se envía nada.
            console.log(
                "No hay imágenes seleccionadas. Se mantendrán las existentes."
            );
        }

        // Depuración (opcional)
        for (let [key, value] of formDataToSend.entries()) {
            console.log(key, value);
        }

        // 6️⃣ Enviar los datos al backend usando Inertia
        router.post(
            route("producto.edit", { id: productoSeleccionado.id }),
            formDataToSend,
            {
                // Necesario para que Inertia envíe los archivos
                forceFormData: true,

                // 🔑 OPCIÓN CLAVE 1: Recarga Parcial (Partial Reload)
                // Especifica el/los props que deben recargarse desde el backend.
                // ASUME que el prop que alimenta la lista izquierda se llama 'productos_list'
                only: ["productos_list"], // <-- AÑADE ESTA LÍNEA

                // Opcional: mantiene el estado del formulario después de la recarga
                preserveState: true,

                onSuccess: () => {
                    console.log(
                        "Producto actualizado y lista recargada correctamente"
                    );

                    // Si el prop del producto actualizado también está en la lista de 'only' (productos_list),
                    // la lista de la izquierda se actualizará automáticamente.

                    // 🎯 Opcional: Si quieres deseleccionar el producto o resetear el formulario
                    // resetForm();

                    // 7️⃣ Scroll al contenedor derecho (mantienes tu lógica)
                    if (contenedorDerechoRef.current) {
                        contenedorDerechoRef.current.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                            inline: "nearest",
                        });
                    }
                },
                onError: (errors) => {
                    console.error("Error actualizando producto:", errors);
                },
            }
        );

        // 7️⃣ Scroll al contenedor derecho
        if (contenedorDerechoRef.current) {
            contenedorDerechoRef.current.scrollIntoView({
                behavior: "smooth",
                block: "start",
                inline: "nearest",
            });
        }
    };

    // 🖼️ Helper para obtener la URL de la imagen
    const getImageUrl = (img) => {
        return img instanceof File ? URL.createObjectURL(img) : img;
    };

    return (
        <Layout1>
            <div className=" bg-[#111826]   flex flex-col lg:flex-row p-4 space-y-4 lg:space-y-0 lg:space-x-4">
                <div className=" bg-[#111826] flex-1 lg:w-full overflow-auto p-6 ">
                    <h2 className="text-xl font-semibold mb-3">Productos</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-12">
                        {productos
                            .sort((a, b) => a.nombre.localeCompare(b.nombre))
                            .map((producto) => (
                                <ProductoGestor
                                    key={producto.id}
                                    producto={producto}
                                    // Pasamos el ID del seleccionado para que el hijo sepa si debe mostrar el overlay oscuro
                                    productoSeleccionadoId={
                                        productoSeleccionado?.id
                                    }
                                    // Pasamos el handler para que el hijo pueda notificar el clic
                                    onClick={handleProductoClick}
                                />
                            ))}
                    </div>

                    <div className="flex justify-center mt-12 bg-black bg-opacity-10 items-center py-6">
                        <button
                            type="button"
                            className="w-200 py-2 px-12 bg-green-600 text-white font-semibold rounded-lg shadow-sm hover:bg-green-700"
                            onClick={() =>
                                router.visit(route("producto.crear"))
                            }
                        >
                            Crear Producto
                        </button>
                    </div>
                </div>

                {productoSeleccionado && (
                    <div
                        className="sticky top-4 lg:w-[250px] max-h-[80vh] overflow-y-auto p-4 border rounded-lg shadow-sm bg-white"
                        ref={contenedorDerechoRef}
                    >
                        <h3 className="text-xl font-semibold mb-3">
                            Opciones para: {productoSeleccionado.nombre}
                        </h3>
                        <div className="mb-4">
                            {/* Imagen principal + miniaturas con scroll (usa formData.imagenes) */}
                            {Array.isArray(formData.imagenes) &&
                                formData.imagenes.length > 0 && (
                                    <div className="mb-4">
                                        {/* Imagen principal */}
                                        <div className="flex justify-center mb-2">
                                            <img
                                                // ✅ Usamos la función auxiliar para URLs de objetos File o cadenas
                                                src={getImageUrl(
                                                    formData.imagenes[0]
                                                )}
                                                alt={
                                                    productoSeleccionado.nombre
                                                }
                                                className="w-48 h-48 object-cover rounded-lg shadow-sm"
                                            />
                                        </div>

                                        {/* Miniaturas con scroll horizontal */}
                                        {formData.imagenes.length > 1 && (
                                            <div className="flex overflow-x-auto space-x-2 max-w-full p-1 rounded-lg scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
                                                {formData.imagenes
                                                    .slice(1)
                                                    .map((img, index) => (
                                                        <img
                                                            key={index}
                                                            // ✅ Usamos la función auxiliar para URLs de objetos File o cadenas
                                                            src={getImageUrl(
                                                                img
                                                            )}
                                                            alt={`${
                                                                productoSeleccionado.nombre
                                                            } ${index + 2}`}
                                                            className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 flex-shrink-0"
                                                            // Doble click: cambiar la imagen principal en la DB
                                                            onDoubleClick={() =>
                                                                handleDoubleClick(
                                                                    img,
                                                                    index + 1
                                                                )
                                                            }
                                                        />
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                        </div>

                        <div className="space-y-4">
                            <button
                                className={`w-full py-2 px-4 ${
                                    productoSeleccionado.eliminado
                                        ? "bg-green-600"
                                        : "bg-red-600"
                                } text-white font-semibold rounded-lg shadow-sm hover:${
                                    productoSeleccionado.eliminado
                                        ? "bg-green-700"
                                        : "bg-red-700"
                                } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                                    productoSeleccionado.eliminado
                                        ? "focus:ring-green-500"
                                        : "focus:ring-red-500"
                                }`}
                                onClick={handleEliminar}
                            >
                                {productoSeleccionado.eliminado
                                    ? "Activar Producto"
                                    : "Desactivar Producto"}
                            </button>

                            <div className="mt-4">
                                <h4 className="text-lg font-semibold mb-3">
                                    Modificar Producto
                                </h4>
                                <form
                                    className="space-y-3"
                                    method="POST"
                                    encType="multipart/form-data"
                                    onSubmit={handleModificar}
                                >
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">
                                            Imagen
                                        </label>
                                        <div
                                            className="mt-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        "image-input"
                                                    )
                                                    .click()
                                            }
                                        >
                                            <span className="text-sm text-gray-600">
                                                Haz clic para seleccionar
                                                imágenes
                                            </span>
                                            <input
                                                type="file"
                                                name="imagenes"
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                multiple
                                                className="hidden"
                                                id="image-input"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">
                                            Nombre
                                        </label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            value={formData.nombre}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">
                                            Precio
                                        </label>
                                        <input
                                            type="number"
                                            name="precio"
                                            value={formData.precio}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">
                                            Unidades
                                        </label>
                                        <input
                                            type="number"
                                            name="unidades"
                                            value={formData.unidades}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700">
                                            Descuento (%)
                                        </label>
                                        <input
                                            type="number"
                                            name="descuento"
                                            value={formData.descuento}
                                            onChange={handleChange}
                                            className="mt-1 block w-full px-3 py-1.5 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <button
                                            type="submit"
                                            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            Guardar Cambios
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout1>
    );
}
