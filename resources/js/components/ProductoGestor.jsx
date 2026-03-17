// ProductoGestor.jsx (REQUIERE: 'react-icons/fa' y 'react-icons/io')
import React from "react";
import { FaBoxes, FaTag } from "react-icons/fa"; // Iconos de stock y descuento
import { IoCloseCircle } from "react-icons/io5"; // Icono de inactivo/eliminado

const ProductoGestor = ({ producto, productoSeleccionadoId, onClick }) => {
    // Lógica Condicional
    const isSelected = productoSeleccionadoId === producto.id;
    const isLowStock = producto.unidades < 5;
    const isDeleted = producto.eliminado === 1;

    // Handler local
    const handleClick = () => {
        onClick(producto);
    };

    return (
        <div
            key={producto.id}
            onClick={handleClick}
            className={`group flex flex-col p-4 border-2 transition-all duration-300 ease-in-out cursor-pointer 
                rounded-xl shadow-lg hover:shadow-2xl hover:bg-gray-50 
                ${
                    isSelected
                        ? "border-blue-600 ring-4 ring-blue-200"
                        : "border-gray-100"
                }
                ${isLowStock && !isDeleted ? "bg-red-50" : "bg-white"}
                max-w-[200px] relative overflow-hidden transform group-hover:scale-[1.03]`} // <--- Animación principal
        >
            {/* Indicador de Producto Eliminado (Badge y Overlay) */}
            {isDeleted && (
                <>
                    {/* Overlay suave y claro */}
                    <div className="absolute inset-0 bg-gray-600 bg-opacity-30 rounded-xl z-10"></div>
                    {/* Badge destacado */}
                    <span className="absolute top-0 left-0 w-full bg-red-700 text-white text-xs font-bold py-1 text-center z-20 flex items-center justify-center gap-1">
                        <IoCloseCircle size={14} /> PRODUCTO INACTIVO
                    </span>
                </>
            )}

            {/* Indicador de Stock Bajo (Badge) */}
            {isLowStock && !isDeleted && (
                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg z-10 transition-opacity">
                    STOCK BAJO
                </span>
            )}

            {/* Imagen del Producto */}
            <div className="w-full h-32 mb-4 relative rounded-lg overflow-hidden">
                <img
                    src={producto.imagen_principal || "/img/placeholder.svg"}
                    alt={producto.nombre}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:rotate-1 group-hover:scale-110 ${
                        // <-- Efecto en la imagen
                        isDeleted ? "opacity-30" : "opacity-95"
                    }`}
                />
            </div>

            {/* Nombre y Precio */}
            <div className="w-full text-center mb-3">
                <p className="text-lg font-extrabold text-gray-900 leading-snug truncate">
                    {producto.nombre}
                </p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                    ${producto.precio}
                </p>
            </div>

            {/* Metadatos (Cantidad y Descuento) */}
            <div className="w-full space-y-1 text-sm text-gray-600 border-t pt-2">
                <p className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                        <FaBoxes size={12} /> Stock:
                    </span>
                    <span className="font-bold">{producto.unidades}</span>
                </p>

                {/* Descuento (Si aplica) */}
                {producto.descuento > 0 && (
                    <p className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                            <FaTag size={12} /> Descuento:
                        </span>
                        <span className="font-extrabold text-red-500">
                            {producto.descuento}%
                        </span>
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProductoGestor;
