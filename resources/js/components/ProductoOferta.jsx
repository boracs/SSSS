import { usePage, router } from '@inertiajs/react';
import React from 'react';
import { toast } from 'react-toastify';

const ProductoOferta = ({ nombre, precio, imagen, unidades, descuento, producto }) => {
  const { auth } = usePage().props;
  const user = auth?.user;
  const numeroTaquilla = user?.numeroTaquilla || 0;

  const handleAgregarAlCarrito = (productoId, e) => {
    e.stopPropagation();
    router.post(route('carrito.agregar', productoId), {}, {
      onSuccess: () => toast.success('Producto agregado al carrito'),
      onError: () => toast.error('Hubo un problema al agregar el producto'),
      preserveState: true,
      preserveScroll: true,
    });
  };

 const handleVerProducto = (productoId) => {
        router.get(
            route('producto.ver', { productoId }),
            {},
            {
                preserveState: false,
                preserveScroll: true,
            }
        );
    };

  const placeholderImg = "/img/placeholder.svg";
  const imagenValida =
    typeof imagen === "string" && imagen.trim() !== "" && !imagen.includes("undefined");
  const imageSrc = imagenValida
    ? imagen.startsWith("http") || imagen.startsWith("/")
      ? imagen
      : `/storage/productos/${imagen.replace(/^productos\/?/, "")}`
    : placeholderImg;

  return (
    <div className="flex flex-col w-full max-w-sm mx-auto">
      {/* Header Oferta */}
      <div className="flex justify-center items-center bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 p-4 rounded-t-lg shadow-md">
        <h2 className="text-white text-lg md:text-xl font-bold uppercase tracking-wide">
          Mejores Ofertas
        </h2>
      </div>

      {/* Card Producto */}
      <div
        className="bg-white border border-gray-200 rounded-b-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 cursor-pointer flex flex-col"
         onClick={() => handleVerProducto(producto.id)}
      >
        <div className="w-full h-48 md:h-56 overflow-hidden rounded-t-md">
          <img
            src={imageSrc}
            alt={nombre}
            className="w-full h-full object-cover transform transition-transform duration-300 hover:scale-105"
          />
        </div>

        <div className="p-4 flex flex-col flex-grow">
          <h3 className="text-lg font-semibold text-gray-800 truncate">{nombre}</h3>

          <div className="flex items-center justify-between mt-2">
            <p className="text-sm font-medium text-gray-600">{precio} €</p>
            {descuento > 0 && (
              <div className="text-right">
                <p className="text-xs text-red-500 font-semibold">{parseInt(descuento)}% OFF</p>
                <p className="text-sm font-bold text-green-600">
                  {(precio - (descuento / 100) * precio).toFixed(2)} €
                </p>
              </div>
            )}
          </div>

          {/* Botón */}
          <div className="mt-4">
            {user && numeroTaquilla > 0 ? (
              <button
                onClick={(e) => handleAgregarAlCarrito(producto.id, e)}
                disabled={unidades === 0}
                className={`w-full py-2 px-4 rounded-md font-medium text-white transition-colors duration-300 ${
                  unidades === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {unidades === 0 ? 'Producto agotado' : 'Agregar al carrito'}
              </button>
            ) : (
              <button
                disabled
                className="w-full py-2 px-4 rounded-md font-medium text-white bg-gray-400 cursor-not-allowed relative group"
              >
                Agregar al carrito
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max px-2 py-1 text-xs text-gray-700 bg-gray-200 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  Debes poseer una taquilla para comprar ofertas
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductoOferta;
