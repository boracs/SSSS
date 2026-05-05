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
            className={`group flex h-full flex-col p-2.5 sm:p-3 border transition-all duration-300 ease-in-out cursor-pointer 
                rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 
                ${
                    isSelected
                        ? "border-blue-500 ring-2 ring-blue-200"
                        : "border-gray-100/90"
                }
                ${isLowStock && !isDeleted ? "bg-red-50" : "bg-white"}
                w-full relative overflow-hidden transform group-hover:scale-[1.02]`} // <--- Animación principal
        >
            {/* Indicador de Producto Eliminado (Badge y Overlay) */}
            {isDeleted && (
                <>
                    {/* Overlay suave y claro */}
                    <div className="absolute inset-0 bg-gray-600 bg-opacity-30 rounded-xl z-10"></div>
                    {/* Badge destacado */}
                    <span className="absolute top-0 left-0 w-full bg-red-700 text-white text-[10px] font-bold py-1 text-center z-20 flex items-center justify-center gap-1">
                        <IoCloseCircle size={14} /> PRODUCTO INACTIVO
                    </span>
                </>
            )}

            {/* Indicador de Stock Bajo (Badge) */}
            {isLowStock && !isDeleted && (
                <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow z-10 transition-opacity">
                    STOCK BAJO
                </span>
            )}

            {/* Imagen del Producto */}
            <div className="w-full h-20 sm:h-24 mb-2 relative rounded-md overflow-hidden">
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
            <div className="w-full text-center mb-1.5">
                <p className="text-sm sm:text-base font-bold text-gray-900 leading-snug truncate">
                    {producto.nombre}
                </p>
                <p className="text-xl sm:text-2xl font-semibold text-green-600 mt-0.5 leading-none">
                    ${producto.precio}
                </p>
            </div>

            {/* Metadatos (Cantidad y Descuento) */}
            <div className="w-full space-y-0.5 text-xs text-gray-600 border-t pt-1.5 mt-auto">
                <p className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-medium text-gray-700">
                        <FaBoxes size={10} /> Stock:
                    </span>
                    <span className="font-semibold">{producto.unidades}</span>
                </p>

                {/* Descuento (Si aplica) */}
                {producto.descuento > 0 && (
                    <p className="flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-gray-700">
                            <FaTag size={10} /> Descuento:
                        </span>
                        <span className="font-bold text-red-500">
                            {producto.descuento}%
                        </span>
                    </p>
                )}
            </div>
        </div>
    );
};

export default ProductoGestor;
